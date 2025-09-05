const path = require('path');
const fs = require('fs');
const redis = require('../shared/rateLimit');

// Load Azure Functions local settings and merge into process.env
function loadLocalSettings() {
  const settingsPath = path.join(__dirname, '..', 'local.settings.json');
  if (!fs.existsSync(settingsPath)) return;
  const raw = fs.readFileSync(settingsPath, 'utf8');
  try {
    const json = JSON.parse(raw);
    const values = json.Values || {};
    console.log('Loading environment variables from local.settings.json:', Object.keys(values));
    
    for (const [key, value] of Object.entries(values)) {
      const currentValue = process.env[key];
      if (currentValue === undefined) {
        process.env[key] = value;
        console.log(`Set ${key} = ${value}`);
      } else {
        console.log(`Skipped ${key} (already set to: ${currentValue})`);
      }
    }
    
    // Verifica specifica per ROBOFLOW_MODEL
    console.log('ROBOFLOW_MODEL after loading:', process.env.ROBOFLOW_MODEL);
    console.log('ROBOFLOW_VERSION after loading:', process.env.ROBOFLOW_VERSION);
    console.log('ROBOFLOW_API_KEY after loading:', process.env.ROBOFLOW_API_KEY ? '***' + process.env.ROBOFLOW_API_KEY.slice(-4) : 'undefined');
    
    // Verifica variabili per le API di redness e wrinkles
    console.log('REDNESS_API_URL after loading:', process.env.REDNESS_API_URL);
    console.log('REDNESS_API_KEY after loading:', process.env.REDNESS_API_KEY ? '***' + process.env.REDNESS_API_KEY.slice(-4) : 'undefined');
    console.log('WRINKLES_API_URL after loading:', process.env.WRINKLES_API_URL);
    console.log('WRINKLES_API_KEY after loading:', process.env.WRINKLES_API_KEY ? '***' + process.env.WRINKLES_API_KEY.slice(-4) : 'undefined');
    console.log('WRINKLES_API_TIMEOUT after loading:', process.env.WRINKLES_API_TIMEOUT);
    
    // Verifica variabili Azure Storage
    console.log('AZURE_STORAGE_KEY after loading:', process.env.AZURE_STORAGE_KEY ? '***' + process.env.AZURE_STORAGE_KEY.slice(-4) : 'undefined');
    
    // Verifica variabili Redis
    console.log('REDIS_CONNECTION_STRING after loading:', process.env.REDIS_CONNECTION_STRING ? '***' + process.env.REDIS_CONNECTION_STRING.slice(-20) : 'undefined');
    
  } catch (err) {
    console.warn('Unable to parse local.settings.json', err.message);
  }
}

loadLocalSettings();

if (!process.env.AZURE_STORAGE_KEY) {
  // default key di Azurite
  process.env.AZURE_STORAGE_KEY =
    'Eby8vdM02xNOcqFlqUwJ...==';
}

process.env.APPLICATION_INSIGHTS_CONNECTION_STRING = '';
jest.mock('applicationinsights', () => ({ setup: () => ({ start: () => {} }) }));

// Funzione per resettare il rate limiter tra i test
async function resetRateLimiter() {
  const client = await redis.initRedis();
  if (client) {
    try {
      // Rimuovi tutte le chiavi di rate limiting per i test
      const keys = await client.keys('rate_limit:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.warn('Failed to reset rate limiter:', error.message);
    }
  }
}

// Funzione per pulire la cache di inferenza
async function clearInferenceCache() {
  const cache = require('../shared/cache');
  const testImageUrl = 'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg';
  
  try {
    // Pulisci cache di inferenza
    await cache.invalidate(`inference:${testImageUrl}`);
    
    // Pulisci cache delle singole API
    await cache.invalidate(`redness:${testImageUrl}`);
    await cache.invalidate(`wrinkles:${testImageUrl}`);
    
    console.log('Inference cache cleared for test image');
  } catch (error) {
    console.warn('Failed to clear inference cache:', error.message);
  }
}

// Reset rate limiter e cache prima di ogni test
beforeEach(async () => {
  await resetRateLimiter();
  await clearInferenceCache();
});

afterAll(async () => {
  const client = await redis.initRedis();
  if (client) {
    await client.quit();
  }
});

module.exports = { resetRateLimiter, clearInferenceCache }; 