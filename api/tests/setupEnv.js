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

// Reset rate limiter prima di ogni test
beforeEach(async () => {
  await resetRateLimiter();
});

afterAll(async () => {
  const client = await redis.initRedis();
  if (client) {
    await client.quit();
  }
});

module.exports = { resetRateLimiter }; 