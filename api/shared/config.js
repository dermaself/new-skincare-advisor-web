const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// Cache per i segreti
const secretsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

// Inizializza Key Vault client se in produzione
let secretClient;
if (process.env.AZURE_KEYVAULT_URI) {
  const credential = new DefaultAzureCredential();
  secretClient = new SecretClient(process.env.AZURE_KEYVAULT_URI, credential);
}

/**
 * Recupera un segreto da Key Vault o dalle variabili d'ambiente
 * @param {string} secretName - Nome del segreto
 * @param {string} envVarName - Nome della variabile d'ambiente di fallback
 */
async function getSecret(secretName, envVarName) {
  // In sviluppo, usa variabili d'ambiente
  if (!secretClient) {
    return process.env[envVarName];
  }

  // Controlla cache
  const cached = secretsCache.get(secretName);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  try {
    // Recupera da Key Vault
    const secret = await secretClient.getSecret(secretName);
    
    // Salva in cache
    secretsCache.set(secretName, {
      value: secret.value,
      expiry: Date.now() + CACHE_TTL
    });
    
    return secret.value;
  } catch (error) {
    console.error(`Failed to get secret ${secretName} from Key Vault:`, error);
    // Fallback a variabile d'ambiente
    return process.env[envVarName];
  }
}

// Configurazione centralizzata
const config = {
  azure: {
    storage: {
      getAccount: () => getSecret('StorageAccount', 'AZURE_STORAGE_ACCOUNT'),
      getKey: () => getSecret('StorageKey', 'AZURE_STORAGE_KEY'),
      container: process.env.AZURE_STORAGE_CONTAINER || 'selfies'
    }
  },
  roboflow: {
    getApiKey: () => getSecret('RoboflowApiKey', 'ROBOFLOW_API_KEY'),
    getModel: () => process.env.ROBOFLOW_MODEL,
    getVersion: () => process.env.ROBOFLOW_VERSION || '1',
    timeout: parseInt(process.env.ROBOFLOW_TIMEOUT || '10000'),
    maxRetries: parseInt(process.env.ROBOFLOW_MAX_RETRIES || '3')
  },
  redness: {
    getApiUrl: () => getSecret('RednessApiUrl', 'REDNESS_API_URL'),
    getApiKey: () => getSecret('RednessApiKey', 'REDNESS_API_KEY'),
    timeout: parseInt(process.env.REDNESS_API_TIMEOUT || '15000')
  },
  redis: {
    getConnectionString: () => getSecret('RedisConnection', 'REDIS_CONNECTION_STRING')
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    apiKeyHeader: 'x-api-key',
    enableAuth: process.env.ENABLE_AUTH === 'true'
  },
  limits: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    maxImageDimension: parseInt(process.env.MAX_IMAGE_DIMENSION || '1024'),
    uploadUrlTTL: parseInt(process.env.UPLOAD_URL_TTL || '600'), // 10 min
    rateLimitPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '100')
  },
  monitoring: {
    appInsightsConnectionString: process.env.APPLICATION_INSIGHTS_CONNECTION_STRING
  }
};

module.exports = config; 