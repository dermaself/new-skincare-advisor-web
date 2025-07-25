const axios = require('axios');
const Joi = require('joi');
const pRetry = require('p-retry');
const { ServiceBusClient } = require('@azure/service-bus');

const config = require('../shared/config');
const { createLogger } = require('../shared/logger');
const { rateLimitMiddleware } = require('../shared/rateLimit');
const cache = require('../shared/cache');

const logger = createLogger('infer');

// Schema di validazione robusto
const requestSchema = Joi.object({
  imageUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .required()
    .custom((value, helpers) => {
      // Valida che sia un URL Azure Blob Storage (check generico)
      if (!value.includes('.blob.core.windows.net/')) {
        return helpers.error('custom.invalidStorageUrl');
      }
      return value;
    })
    .messages({
      'custom.invalidStorageUrl': 'URL deve essere un Azure Blob Storage valido',
      'string.uri': 'URL non valido',
      'any.required': 'imageUrl è obbligatorio'
    }),
  sync: Joi.boolean().default(true), // Elaborazione sincrona o asincrona
  userId: Joi.string().optional(),
  webhookUrl: Joi.string().uri().optional() // Per notifiche asincrone
});

// Rate limiter per inferenze
const inferRateLimiter = rateLimitMiddleware({
  limit: 50, // 50 inferenze per ora
  window: '1h'
});

// Circuit breaker per Roboflow
const roboflowBreaker = cache.createCircuitBreaker(callRoboflowAPI, {
  timeout: config.roboflow.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'RoboflowAPI',
  fallback: async (imageUrl) => {
    logger.warn('Circuit breaker open, returning cached or default response');
    // Prova a ritornare risultato dalla cache
    const cached = await cache.get(`inference:${imageUrl}`);
    if (cached) return cached;
    
    // Altrimenti ritorna risposta di fallback
    return {
      predictions: [],
      image: { width: 0, height: 0 },
      fallback: true,
      message: 'Servizio temporaneamente non disponibile'
    };
  }
});

// Service Bus client per elaborazione asincrona
let serviceBusClient;
let queueSender;

async function initServiceBus() {
  if (!process.env.SERVICE_BUS_CONNECTION_STRING) return;
  
  try {
    serviceBusClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING);
    queueSender = serviceBusClient.createSender('inference-queue');
    logger.info('Service Bus initialized');
  } catch (error) {
    logger.error('Failed to initialize Service Bus', error);
  }
}

// Inizializza Service Bus all'avvio
initServiceBus();

module.exports = async function (context, req) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const rateLimitPassed = await inferRateLimiter(context);
    if (!rateLimitPassed) return;

    // Validazione
    const { error, value } = requestSchema.validate(req.body);
    if (error) {
      logger.warn('Validation failed', { error: error.message });
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Validation Error',
          message: error.details[0].message
        }
      };
      return;
    }

    const { imageUrl, sync, userId, webhookUrl } = value;

    // Verifica permessi SAS
    if (!validateSasPermissions(imageUrl)) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Invalid Permissions',
          message: 'URL immagine non ha permessi di lettura'
        }
      };
      return;
    }

    // Se elaborazione asincrona e Service Bus disponibile
    if (!sync && queueSender) {
      const messageId = await enqueueInference({
        imageUrl,
        userId,
        webhookUrl,
        timestamp: new Date().toISOString()
      });

      logger.info('Inference queued', { messageId, imageUrl });
      
      context.res = {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'Richiesta accettata per elaborazione',
          jobId: messageId,
          status: 'queued'
        }
      };
      return;
    }

    // Elaborazione sincrona
    const cacheKey = `inference:${imageUrl}`;
    
    // Controlla cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for inference', { imageUrl });
      context.res = {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        },
        body: cached
      };
      return;
    }

    // Chiama Roboflow con circuit breaker e retry
    const result = await pRetry(
      async () => {
        return await roboflowBreaker.fire(imageUrl);
      },
      {
        retries: config.roboflow.maxRetries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        onFailedAttempt: (error) => {
          logger.warn(`Roboflow attempt ${error.attemptNumber} failed`, {
            error: error.message,
            retriesLeft: error.retriesLeft
          });
        }
      }
    );

    // Salva in cache se non è fallback
    if (!result.fallback) {
      await cache.set(cacheKey, result, 300); // Cache per 5 minuti
    }

    // Log metriche
    const duration = Date.now() - startTime;
    logger.info('Inference completed', {
      imageUrl,
      duration,
      predictionsCount: result.predictions?.length || 0,
      cached: false
    });
    
    logger.trackEvent('InferenceCompleted', {
      userId,
      predictionsCount: result.predictions?.length || 0,
      cached: false
    }, { duration });

    context.res = {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      },
      body: result
    };

  } catch (error) {
    logger.error('Inference failed', error);
    
    context.res = {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Service Unavailable',
        message: 'Servizio temporaneamente non disponibile',
        retryAfter: 30
      }
    };
  }
};

/**
 * Chiama API Roboflow (funzione wrappata dal circuit breaker)
 */
async function callRoboflowAPI(imageUrl) {
  const apiKey = await config.roboflow.getApiKey();
  const endpoint = `https://detect.roboflow.com/${config.roboflow.model}/${config.roboflow.version}`;
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(endpoint, null, {
      timeout: config.roboflow.timeout,
      params: {
        api_key: apiKey,
        image: imageUrl,
        confidence: 20,
        overlap: 50
      },
      headers: {
        'User-Agent': 'Dermaself-Azure-Functions/1.0'
      }
    });

    const duration = Date.now() - startTime;
    
    logger.trackDependency(
      'Roboflow API',
      endpoint,
      duration,
      true,
      { imageUrl }
    );

    return response.data;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.trackDependency(
      'Roboflow API',
      endpoint,
      duration,
      false,
      { 
        imageUrl,
        error: error.message,
        status: error.response?.status
      }
    );

    // Rilancia errore con informazioni utili
    const enhancedError = new Error(
      error.response?.data?.message || 
      error.message || 
      'Roboflow API error'
    );
    enhancedError.status = error.response?.status;
    enhancedError.code = error.code;
    throw enhancedError;
  }
}

/**
 * Valida permessi SAS nell'URL
 */
function validateSasPermissions(url) {
  // Verifica presenza parametro sp con permesso 'r'
  const urlObj = new URL(url);
  const sp = urlObj.searchParams.get('sp');
  return !sp || sp.includes('r');
}

/**
 * Accoda inferenza per elaborazione asincrona
 */
async function enqueueInference(data) {
  const message = {
    body: data,
    contentType: 'application/json',
    messageId: `inf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  await queueSender.sendMessages(message);
  return message.messageId;
}
