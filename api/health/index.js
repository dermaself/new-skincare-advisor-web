const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const config = require('../shared/config');
const { createLogger } = require('../shared/logger');
const { initRedis } = require('../shared/rateLimit');

const logger = createLogger('health');

module.exports = async function (context, req) {
  const startTime = Date.now();
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development',
    checks: {}
  };

  try {
    // Check 1: Azure Blob Storage
    checks.checks.storage = await checkBlobStorage();
    
    // Check 2: Redis
    checks.checks.redis = await checkRedis();
    
    // Check 3: Roboflow API
    checks.checks.roboflow = await checkRoboflow();
    
    // Check 4: Service Bus (se configurato)
    if (process.env.SERVICE_BUS_CONNECTION_STRING) {
      checks.checks.serviceBus = await checkServiceBus();
    }
    
    // Check 5: Memory usage
    checks.checks.memory = checkMemoryUsage();
    
    // Determina stato complessivo
    const allHealthy = Object.values(checks.checks).every(check => check.status === 'healthy');
    checks.status = allHealthy ? 'healthy' : 'degraded';
    
    // Log metriche
    const duration = Date.now() - startTime;
    logger.info('Health check completed', { 
      status: checks.status, 
      duration,
      checks: Object.entries(checks.checks).map(([name, check]) => ({
        name,
        status: check.status
      }))
    });
    
    context.res = {
      status: allHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: checks
    };
    
  } catch (error) {
    logger.error('Health check failed', error);
    
    checks.status = 'unhealthy';
    checks.error = error.message;
    
    context.res = {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: checks
    };
  }
};

/**
 * Verifica connettività Azure Blob Storage
 */
async function checkBlobStorage() {
  const startTime = Date.now();
  
  try {
    const accountName = await config.azure.storage.getAccount();
    const accountKey = await config.azure.storage.getKey();
    
    let credential;
    if (accountKey) {
      credential = new StorageSharedKeyCredential(accountName, accountKey);
    } else {
      credential = new DefaultAzureCredential();
    }
    
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
    
    // Test listing containers
    const containers = blobServiceClient.listContainers();
    await containers.next();
    
    return {
      status: 'healthy',
      latency: Date.now() - startTime,
      accountName
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Verifica connettività Redis
 */
async function checkRedis() {
  const startTime = Date.now();
  
  try {
    const redis = await initRedis();
    
    if (!redis) {
      return {
        status: 'not_configured',
        message: 'Redis not configured'
      };
    }
    
    // Test PING
    await redis.ping();
    
    // Test write/read
    const testKey = 'health:check';
    await redis.setex(testKey, 10, 'ok');
    const value = await redis.get(testKey);
    
    if (value !== 'ok') {
      throw new Error('Redis read/write test failed');
    }
    
    return {
      status: 'healthy',
      latency: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Verifica disponibilità API Roboflow
 */
async function checkRoboflow() {
  const startTime = Date.now();
  
  try {
    const apiKey = await config.roboflow.getApiKey();
    
    if (!apiKey || !config.roboflow.model) {
      return {
        status: 'not_configured',
        message: 'Roboflow not configured'
      };
    }
    
    // Non facciamo una vera chiamata per non consumare crediti
    // Verifichiamo solo che le configurazioni siano valide
    return {
      status: 'healthy',
      model: config.roboflow.model,
      version: config.roboflow.version
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Verifica connettività Service Bus
 */
async function checkServiceBus() {
  const { ServiceBusClient } = require('@azure/service-bus');
  const startTime = Date.now();
  
  try {
    const client = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING);
    
    // Test creazione sender
    const sender = client.createSender('inference-queue');
    
    // Cleanup
    await sender.close();
    await client.close();
    
    return {
      status: 'healthy',
      latency: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Controlla utilizzo memoria
 */
function checkMemoryUsage() {
  const used = process.memoryUsage();
  const totalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usedMB = Math.round(used.heapUsed / 1024 / 1024);
  const percentage = Math.round((used.heapUsed / used.heapTotal) * 100);
  
  return {
    status: percentage > 90 ? 'warning' : 'healthy',
    heapUsedMB: usedMB,
    heapTotalMB: totalMB,
    percentage
  };
} 