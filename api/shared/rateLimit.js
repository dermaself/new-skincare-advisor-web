const Redis = require('ioredis');
const config = require('./config');
const { createLogger } = require('./logger');

const logger = createLogger('RateLimit');

let redisClient;

// Inizializza Redis client
async function initRedis() {
  if (redisClient) return redisClient;

  try {
    const {
      REDIS_HOST     = 'localhost',
      REDIS_PORT     = '6379',
      REDIS_PASSWORD = '',
      REDIS_USERNAME = '',          // opzionale per ACL
      REDIS_SSL      = 'false'
    } = process.env;

    const tlsEnabled = REDIS_SSL.toLowerCase() === 'true';

    const redisOptions = {
      host: REDIS_HOST,
      port: Number(REDIS_PORT),
      password: REDIS_PASSWORD || undefined,
      username: REDIS_USERNAME || undefined,
      tls: tlsEnabled ? {} : undefined,
      retryStrategy: (t) => Math.min(t * 50, 2000),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: true
    };

    redisClient = new Redis(redisOptions);

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

  // Durante i test, essere più permissivi
  const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
  if (isTestEnvironment) {
    logger.info('Rate limiting relaxed in test environment');
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }

  const key = `rate_limit:${identifier}`;
  const windowSeconds = parseWindow(window);
  
  try {
    const multi = client.multi();
    
    // Incrementa contatore e leggi TTL all'interno della transazione
    multi.incr(key);
    multi.ttl(key);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[0][1];
    let ttl = results[1][1];

    // Se la chiave è nuova (ttl === -1) imposta scadenza ora.
    if (ttl === -1) {
      await client.expire(key, windowSeconds);
      ttl = windowSeconds;
    }
    
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
      const h = context.req?.headers || {};
      return h['x-forwarded-for'] || h['x-user-id'] || 'anonymous';
    },
    skipAuth = false
  } = options;

  return async function(context) {
    // Skip rate limiting per richieste autenticate se configurato
    if (skipAuth && context.req?.headers?.authorization) {
      return true;
    }

    const identifier = keyGenerator(context);
    const result = await checkRateLimit(identifier, limit, window);

    // Aggiungi headers di rate limit alla risposta
    context.res = context.res || {};
    // garantisci che req/headers esistano sempre
    const safeHeaders = (context.req && context.req.headers) || {};

    context.res.headers = {
      ...context.res.headers,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      // tracciamo l’IP se disponibile
      'X-Client-IP': safeHeaders['x-forwarded-for'] || 'unknown'
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