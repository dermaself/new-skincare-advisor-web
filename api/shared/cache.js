const CircuitBreaker = require('opossum');
const { createLogger } = require('./logger');
const { initRedis } = require('./rateLimit');

const logger = createLogger('Cache');

// Cache in memoria per fallback
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 1000;
const MEMORY_CACHE_TTL = 60 * 1000; // 1 minuto

/**
 * Get da cache (Redis con fallback a memoria)
 */
async function get(key) {
  const redisClient = await initRedis();
  
  // Prova Redis
  if (redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        logger.info('Cache hit (Redis)', { key });
        return JSON.parse(value);
      }
    } catch (error) {
      logger.error('Redis get error', error, { key });
    }
  }
  
  // Fallback a memoria
  const memEntry = memoryCache.get(key);
  if (memEntry && memEntry.expiry > Date.now()) {
    logger.info('Cache hit (memory)', { key });
    return memEntry.value;
  }
  
  logger.info('Cache miss', { key });
  return null;
}

/**
 * Set in cache (Redis + memoria)
 */
async function set(key, value, ttlSeconds = 300) {
  const redisClient = await initRedis();
  
  // Salva in Redis
  if (redisClient) {
    try {
      await redisClient.setex(
        key,
        ttlSeconds,
        JSON.stringify(value)
      );
      logger.info('Cache set (Redis)', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Redis set error', error, { key });
    }
  }
  
  // Salva anche in memoria come backup
  cleanMemoryCache();
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

/**
 * Invalida cache
 */
async function invalidate(pattern) {
  const redisClient = await initRedis();
  
  if (redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info('Cache invalidated', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', error, { pattern });
    }
  }
  
  // Pulisci anche memoria
  for (const [key] of memoryCache) {
    if (key.includes(pattern.replace('*', ''))) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Pulisci cache in memoria se troppo grande
 */
function cleanMemoryCache() {
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    const entriesToDelete = memoryCache.size - MEMORY_CACHE_MAX_SIZE + 100;
    const keys = Array.from(memoryCache.keys()).slice(0, entriesToDelete);
    keys.forEach(key => memoryCache.delete(key));
  }
  
  // Rimuovi entries scadute
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Decorator per caching di funzioni
 */
function cacheable(keyGenerator, ttl = 300) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = keyGenerator(...args);
      
      // Controlla cache
      const cached = await get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Esegui funzione
      const result = await originalMethod.apply(this, args);
      
      // Salva in cache
      if (result !== null && result !== undefined) {
        await set(key, result, ttl);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Circuit Breaker wrapper per chiamate esterne
 */
function createCircuitBreaker(asyncFunction, options = {}) {
  const defaultOptions = {
    timeout: 10000, // 10 secondi
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 secondi
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    name: asyncFunction.name || 'anonymous',
    fallback: null
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  const breaker = new CircuitBreaker(asyncFunction, finalOptions);
  
  // Aggiungi il fallback come proprietà del breaker per accesso esterno
  breaker.fallback = finalOptions.fallback;
  
  // Logging eventi
  breaker.on('open', () => {
    logger.warn('Circuit breaker opened', { name: finalOptions.name });
  });
  
  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open', { name: finalOptions.name });
  });
  
  breaker.on('close', () => {
    logger.info('Circuit breaker closed', { name: finalOptions.name });
  });
  
  breaker.on('failure', (error) => {
    logger.error('Circuit breaker failure', error, { name: finalOptions.name });
  });
  
  breaker.on('timeout', () => {
    logger.warn('Circuit breaker timeout', { name: finalOptions.name });
  });
  
  breaker.on('reject', () => {
    logger.warn('Circuit breaker rejected request', { name: finalOptions.name });
  });
  
  // Metriche
  breaker.on('success', (result, latency) => {
    logger.trackMetric(`CircuitBreaker.${finalOptions.name}.Latency`, latency);
    logger.trackEvent(`CircuitBreaker.${finalOptions.name}.Success`, {}, { latency });
  });
  
  breaker.on('failure', (error, latency) => {
    logger.trackMetric(`CircuitBreaker.${finalOptions.name}.Failure`, 1);
    logger.trackEvent(`CircuitBreaker.${finalOptions.name}.Failure`, { error: error.message }, { latency });
  });
  
  return breaker;
}

module.exports = {
  get,
  set,
  invalidate,
  cacheable,
  createCircuitBreaker
}; 