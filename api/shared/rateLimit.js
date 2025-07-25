const Redis = require('ioredis');
const config = require('./config');
const { createLogger } = require('./logger');

const logger = createLogger('RateLimit');

let redisClient;

// Inizializza Redis client
async function initRedis() {
  if (redisClient) return redisClient;

  try {
    const connectionString = await config.redis.getConnectionString();
    if (!connectionString) {
      logger.warn('Redis connection string not configured, rate limiting disabled');
      return null;
    }

    // Supporta connection string di Azure ("host:6380,password=...,ssl=True,abortConnect=False")
    let redisUrl = connectionString;
    if (!connectionString.startsWith('redis://') && !connectionString.startsWith('rediss://')) {
      const parts = connectionString.split(',');
      const hostPart = parts.find(p=>p.includes(':')) || 'localhost:6379';
      const passwordPart = parts.find(p=>p.toLowerCase().startsWith('password='));
      const sslPart = parts.find(p=>p.toLowerCase().startsWith('ssl='));
      const [host,port] = hostPart.split(':');
      const ssl = sslPart && sslPart.split('=')[1].toLowerCase()==='true';
      const pw  = passwordPart ? passwordPart.split('=')[1] : undefined;
      redisUrl = `${ssl? 'rediss':'redis'}://:${pw??''}@${host}:${port}`;
    }

    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: true
    });

    await redisClient.connect();
    
    redisClient.on('error', (err) => {
      logger.error('Redis error', err);
    });

    logger.info('Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    return null;
  }
}

/**
 * Controlla e incrementa il rate limit per un utente
 * @param {string} identifier - Identificatore utente (IP, user ID, etc.)
 * @param {number} limit - Limite di richieste
 * @param {string} window - Finestra temporale (es. '1h', '1m')
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
async function checkRateLimit(identifier, limit = 100, window = '1h') {
  const client = await initRedis();
  
  // Se Redis non è disponibile, permetti la richiesta ma logga warning
  if (!client) {
    logger.warn('Rate limiting skipped - Redis not available');
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }

  const key = `rate_limit:${identifier}`;
  const windowSeconds = parseWindow(window);
  
  try {
    const multi = client.multi();
    
    // Incrementa il contatore
    multi.incr(key);
    
    // Imposta TTL se è la prima richiesta
    multi.expire(key, windowSeconds, 'NX');
    
    // Ottieni TTL rimanente
    multi.ttl(key);
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[0][1];
    const ttl = results[2][1];
    
    const remaining = Math.max(0, limit - count);
    const resetAt = new Date(Date.now() + ttl * 1000);
    
    // Log metriche
    logger.trackMetric('RateLimitCheck', count, {
      identifier,
      limit,
      allowed: count <= limit
    });

    return {
      allowed: count <= limit,
      remaining,
      resetAt,
      limit
    };
  } catch (error) {
    logger.error('Rate limit check failed', error, { identifier });
    // In caso di errore, permetti la richiesta
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }
}

/**
 * Middleware per Azure Functions
 */
function rateLimitMiddleware(options = {}) {
  const {
    limit = config.limits.rateLimitPerHour,
    window = '1h',
    keyGenerator = (context) => {
      // Usa IP address o header custom
      return context.req.headers['x-forwarded-for'] || 
             context.req.headers['x-user-id'] ||
             'anonymous';
    },
    skipAuth = false
  } = options;

  return async function(context) {
    // Skip rate limiting per richieste autenticate se configurato
    if (skipAuth && context.req.headers['authorization']) {
      return true;
    }

    const identifier = keyGenerator(context);
    const result = await checkRateLimit(identifier, limit, window);

    // Aggiungi headers di rate limit alla risposta
    context.res = context.res || {};
    context.res.headers = {
      ...context.res.headers,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString()
    };

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', { identifier, limit });
      
      context.res.status = 429;
      context.res.body = {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.resetAt
      };
      
      return false;
    }

    return true;
  };
}

/**
 * Parse window string to seconds
 */
function parseWindow(window) {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('Invalid window format');
  
  const [, num, unit] = match;
  const multipliers = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
  };
  
  return parseInt(num) * multipliers[unit];
}

module.exports = {
  checkRateLimit,
  rateLimitMiddleware,
  initRedis
}; 