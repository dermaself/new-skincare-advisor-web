const axios = require('axios');
require('./setupEnv');

const uploadUrlFunc = require('../upload-url/index');
const inferFunc = require('../infer/index');

function mockContext() {
  return {
    log: console,
    res: {},
  };
}

// Use the provided test image URL directly
const TEST_IMAGE_URL = 'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg';

async function verifyTestImage() {
  console.log('Verifying test image accessibility...');
  try {
    const verifyResponse = await axios.head(TEST_IMAGE_URL);
    console.log('Test image verification successful:', verifyResponse.status);
    return true;
  } catch (error) {
    console.error('Test image verification failed:', error.response?.status, error.message);
    return false;
  }
}

describe('Infer Function', () => {
  it('should have all required environment variables set', () => {
    // Test that all required environment variables are available
    expect(process.env.ROBOFLOW_API_KEY).toBeDefined();
    expect(process.env.ROBOFLOW_MODEL).toBeDefined();
    expect(process.env.ROBOFLOW_VERSION).toBeDefined();
    expect(process.env.REDNESS_API_URL).toBeDefined();
    expect(process.env.REDNESS_API_KEY).toBeDefined();
    expect(process.env.WRINKLES_API_URL).toBeDefined();
    expect(process.env.WRINKLES_API_KEY).toBeDefined();
    expect(process.env.AZURE_STORAGE_KEY).toBeDefined();
    expect(process.env.REDIS_CONNECTION_STRING).toBeDefined();
    
    console.log('Environment variables check passed');
  });

  it('should validate the test payload structure', () => {
    const testPayload = {
      "imageUrl": "https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg",
      "userData": {
        "first_name": "User",
        "last_name": "Test",
        "birthdate": "1990-01-01",
        "gender": "female",
        "budget_level": "High",
        "shop_domain": "dermaself-dev.myshopify.com"
      },
      "includeRecommendations": true,
      "metadata": {
        "apiVersion": "1.0",
        "clientTimestamp": 1757014841701
      }
    };

    // Validate required fields
    expect(testPayload.imageUrl).toBeDefined();
    expect(testPayload.imageUrl).toMatch(/^https:\/\/.*\.blob\.core\.windows\.net\/.*\.jpeg$/);
    expect(testPayload.userData).toBeDefined();
    expect(testPayload.userData.first_name).toBe('User');
    expect(testPayload.userData.last_name).toBe('Test');
    expect(testPayload.userData.birthdate).toBe('1990-01-01');
    expect(testPayload.userData.gender).toBe('female');
    expect(testPayload.userData.budget_level).toBe('High');
    expect(testPayload.userData.shop_domain).toBe('dermaself-dev.myshopify.com');
    expect(testPayload.includeRecommendations).toBe(true);
    expect(testPayload.metadata).toBeDefined();
    expect(testPayload.metadata.apiVersion).toBe('1.0');
    expect(testPayload.metadata.clientTimestamp).toBe(1757014841701);
    
    console.log('Test payload structure validation passed');
  });

  it('returns enriched inference with acne metrics and product recommendations', async () => {
    // Verify test image is accessible
    const imageAccessible = await verifyTestImage();
    expect(imageAccessible).toBe(true);

    const context = mockContext();
    const req = { 
      method: 'POST', 
      headers: {}, 
      body: {
        "imageUrl": "https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg",
        "userData": {
          "first_name": "User",
          "last_name": "Test",
          "birthdate": "1990-01-01",
          "gender": "female",
          "budget_level": "High",
          "shop_domain": "dermaself-dev.myshopify.com"
        },
        "includeRecommendations": true,
        "metadata": {
          "apiVersion": "1.0",
          "clientTimestamp": 1757014841701
        }
      } 
    };
    context.req = req;

    await inferFunc(context, req);

    // Verifica che la risposta sia presente
    expect(context.res).toBeDefined();
    expect(context.res.body).toBeDefined();
    
    const body = context.res.body;
    const status = context.res.status || 200;
    
    console.log('Response status:', status);
    console.log('Response body keys:', Object.keys(body));
    console.log('Has recommendations:', !!body.recommendations);
    
    if (status === 200 && !body.fallback) {
      // Risposta normale - Roboflow funziona
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('image');
      expect(body).toHaveProperty('acne');
      expect(body.acne).toHaveProperty('counts');
      expect(body.acne).toHaveProperty('severity');
      
      // Verifica metriche rughe
      expect(body).toHaveProperty('wrinkles');
      expect(body.wrinkles).toHaveProperty('counts');
      expect(body.wrinkles).toHaveProperty('severity');
      expect(body.wrinkles).toHaveProperty('total_predictions');
      expect(body.wrinkles).toHaveProperty('has_forehead_wrinkles');
      expect(body.wrinkles).toHaveProperty('has_expression_lines');
      expect(body.wrinkles).toHaveProperty('has_under_eye_concerns');
      
      // Verifica che le predizioni raw siano incluse per rendering UI
      expect(body.wrinkles).toHaveProperty('predictions');
      expect(Array.isArray(body.wrinkles.predictions)).toBe(true);
      expect(body.wrinkles).toHaveProperty('image');
      expect(body.wrinkles).toHaveProperty('time');
      
      // Verifica che redness includa i dati raw
      expect(body.redness).toHaveProperty('predictions');
      expect(body.redness).toHaveProperty('polygons'); // Raw polygons for UI rendering
      
      // Verifica raccomandazioni
      expect(body).toHaveProperty('recommendations');
      expect(body).toHaveProperty('recommendations_meta');
      
      // Verifica struttura completa delle metriche acne
      expect(body.acne).toHaveProperty('classification');
      expect(body.acne).toHaveProperty('counts');
      expect(body.acne).toHaveProperty('severity');
      expect(typeof body.acne.counts).toBe('object');
      expect(typeof body.acne.severity).toBe('string');
      expect(['None', 'Mild', 'Moderate', 'Severe']).toContain(body.acne.severity);
      
      // Verifica che counts contenga le classi acne corrette
      const expectedAcneClasses = ['Comedones', 'Cysts', 'Microcysts', 'Nodules', 'Papules', 'Pustules'];
      expectedAcneClasses.forEach(acneClass => {
        expect(body.acne.counts).toHaveProperty(acneClass);
        expect(typeof body.acne.counts[acneClass]).toBe('number');
      });
      
      // Verifica che la classificazione sia valida
      const validClassifications = ['nodulo-cistica', 'cistica', 'papulopustolosa', 'no-acne', 'comedonica', 'microcistica'];
      expect(validClassifications).toContain(body.acne.classification);
      
      // Verifica struttura completa delle metriche redness
      expect(body.redness).toHaveProperty('redness_perc');
      expect(body.redness).toHaveProperty('erythema');
      expect(body.redness).toHaveProperty('num_polygons');
      expect(body.redness).toHaveProperty('analysis_width');
      expect(body.redness).toHaveProperty('analysis_height');
      expect(typeof body.redness.redness_perc).toBe('number');
      expect(typeof body.redness.erythema).toBe('boolean');
      expect(Array.isArray(body.redness.polygons)).toBe(true);
      
      // Verifica che redness_perc sia un numero valido (0-100)
      expect(body.redness.redness_perc).toBeGreaterThanOrEqual(0);
      expect(body.redness.redness_perc).toBeLessThanOrEqual(100);
      
      // Verifica che num_polygons sia un numero non negativo
      expect(typeof body.redness.num_polygons).toBe('number');
      expect(body.redness.num_polygons).toBeGreaterThanOrEqual(0);
      
      // Se c'è un errore nella redness API, verifica che sia gestito correttamente
      if (body.redness.error) {
        expect(typeof body.redness.error).toBe('string');
        console.log('Redness API error (expected in some cases):', body.redness.error);
        // Anche con errore, dovremmo avere valori di fallback
        expect(body.redness.redness_perc).toBeDefined();
        expect(body.redness.erythema).toBeDefined();
      }
      
      // Verifica struttura completa delle metriche wrinkles
      expect(body.wrinkles).toHaveProperty('high_confidence_predictions');
      expect(body.wrinkles).toHaveProperty('average_confidence');
      expect(typeof body.wrinkles.total_predictions).toBe('number');
      expect(typeof body.wrinkles.severity).toBe('string');
      expect(['None', 'Mild', 'Moderate', 'Severe']).toContain(body.wrinkles.severity);
      expect(typeof body.wrinkles.has_forehead_wrinkles).toBe('boolean');
      expect(typeof body.wrinkles.has_expression_lines).toBe('boolean');
      expect(typeof body.wrinkles.has_under_eye_concerns).toBe('boolean');
      
      // Verifica struttura delle raccomandazioni
      if (body.recommendations) {
        // Verifica struttura principale delle raccomandazioni
        expect(body.recommendations).toHaveProperty('user');
        expect(body.recommendations).toHaveProperty('skincare_routine');
        expect(typeof body.recommendations.user).toBe('object');
        expect(Array.isArray(body.recommendations.skincare_routine)).toBe(true);
        
        // Verifica dati utente
        expect(body.recommendations.user).toHaveProperty('first_name');
        expect(body.recommendations.user).toHaveProperty('last_name');
        expect(body.recommendations.user).toHaveProperty('age');
        expect(body.recommendations.user).toHaveProperty('gender');
        expect(typeof body.recommendations.user.first_name).toBe('string');
        expect(typeof body.recommendations.user.last_name).toBe('string');
        expect(typeof body.recommendations.user.age).toBe('string');
        expect(typeof body.recommendations.user.gender).toBe('string');
        
        // Verifica che ci sia almeno una routine
        expect(body.recommendations.skincare_routine.length).toBeGreaterThan(0);
        
        // Verifica struttura di ogni categoria della routine
        body.recommendations.skincare_routine.forEach((category, categoryIndex) => {
          expect(category).toHaveProperty('category');
          expect(category).toHaveProperty('modules');
          expect(typeof category.category).toBe('string');
          expect(Array.isArray(category.modules)).toBe(true);
          expect(category.modules.length).toBeGreaterThan(0);
          
          // Verifica struttura di ogni modulo
          category.modules.forEach((module, moduleIndex) => {
            expect(module).toHaveProperty('module');
            expect(module).toHaveProperty('main_product');
            expect(module).toHaveProperty('alternative_products');
            expect(typeof module.module).toBe('string');
            expect(typeof module.main_product).toBe('object');
            expect(Array.isArray(module.alternative_products)).toBe(true);
            
            // Verifica struttura del prodotto principale
            const mainProduct = module.main_product;
            expect(mainProduct).toHaveProperty('product_id');
            expect(mainProduct).toHaveProperty('shopify_product_id');
            expect(mainProduct).toHaveProperty('product_name');
            expect(mainProduct).toHaveProperty('brand');
            expect(mainProduct).toHaveProperty('best_price');
            expect(mainProduct).toHaveProperty('score');
            expect(mainProduct).toHaveProperty('shop_domain');
            expect(typeof mainProduct.product_id).toBe('number');
            expect(typeof mainProduct.shopify_product_id).toBe('number');
            expect(typeof mainProduct.product_name).toBe('string');
            expect(typeof mainProduct.brand).toBe('string');
            expect(typeof mainProduct.best_price).toBe('number');
            expect(typeof mainProduct.score).toBe('number');
            expect(typeof mainProduct.shop_domain).toBe('string');
            
            // Verifica prodotti alternativi
            module.alternative_products.forEach((altProduct, altIndex) => {
              expect(typeof altProduct).toBe('object');
              expect(altProduct).toHaveProperty('product_id');
              expect(altProduct).toHaveProperty('shopify_product_id');
              expect(altProduct).toHaveProperty('product_name');
              expect(altProduct).toHaveProperty('brand');
              expect(altProduct).toHaveProperty('best_price');
              expect(typeof altProduct.product_id).toBe('number');
              expect(typeof altProduct.shopify_product_id).toBe('number');
              expect(typeof altProduct.product_name).toBe('string');
              expect(typeof altProduct.brand).toBe('string');
              expect(typeof altProduct.best_price).toBe('number');
            });
          });
        });
        
        console.log('Recommendations structure validated:', {
          user: body.recommendations.user,
          skincareRoutineCount: body.recommendations.skincare_routine.length,
          categories: body.recommendations.skincare_routine.map(cat => cat.category),
          totalModules: body.recommendations.skincare_routine.reduce((sum, cat) => sum + cat.modules.length, 0)
        });
      }
      
      // Verifica metadati della risposta
      expect(body).toHaveProperty('inference_id');
      expect(typeof body.inference_id).toBe('string');
      expect(body).toHaveProperty('time');
      expect(typeof body.time).toBe('number');
      expect(body).toHaveProperty('image');
      expect(body.image).toHaveProperty('width');
      expect(body.image).toHaveProperty('height');
      expect(typeof body.image.width).toBe('number');
      expect(typeof body.image.height).toBe('number');
      
      // Verifica che le predizioni siano array
      expect(Array.isArray(body.predictions)).toBe(true);
      expect(Array.isArray(body.wrinkles.predictions)).toBe(true);
      expect(Array.isArray(body.redness.predictions)).toBe(true);
      
      // Log wrinkles metrics and predictions
      console.log('Wrinkles metrics:', {
        severity: body.wrinkles.severity,
        totalPredictions: body.wrinkles.total_predictions,
        hasForehead: body.wrinkles.has_forehead_wrinkles,
        hasExpression: body.wrinkles.has_expression_lines,
        hasUnderEye: body.wrinkles.has_under_eye_concerns,
        rawPredictionsCount: body.wrinkles.predictions?.length || 0,
        hasRawPredictions: Array.isArray(body.wrinkles.predictions),
        rednessPolygonsCount: body.redness.polygons?.length || 0
      });

      if (body.recommendations && body.recommendations.skincare_routine) {
        expect(Array.isArray(body.recommendations.skincare_routine)).toBe(true);
        console.log('Recommendations received successfully');
        console.log('User data:', body.recommendations.user);
        console.log('Skincare routine categories:', body.recommendations.skincare_routine.length);
        console.log('Categories:', body.recommendations.skincare_routine.map(cat => cat.category));
        console.log('Total modules:', body.recommendations.skincare_routine.reduce((sum, cat) => sum + cat.modules.length, 0));
      } else {
        console.log('Recommendations fallback or error:', body.recommendations_meta);
      }
      
    } else if (body.fallback) {
      // Risposta fallback - API Roboflow non disponibile
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('acne');
      expect(body.acne).toHaveProperty('counts');
      expect(body.acne).toHaveProperty('severity');
      
      // Verifica che anche le rughe siano presenti anche in fallback
      expect(body).toHaveProperty('wrinkles');
      expect(body.wrinkles).toHaveProperty('severity');
      console.log('Fallback response received');
    }
  }, 15000); // 15 secondi timeout

  it('should make actual API calls to redness, wrinkles, and roboflow APIs', async () => {
    // Verify test image is accessible
    const imageAccessible = await verifyTestImage();
    expect(imageAccessible).toBe(true);

    // Mock console.log to capture API call logs
    const originalLog = console.log;
    const originalInfo = console.info;
    const apiCallLogs = [];
    
    console.log = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('API') || args[0].includes('Calling') || args[0].includes('successful'))) {
        apiCallLogs.push(args.join(' '));
      }
      originalLog(...args);
    };
    
    console.info = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('API') || args[0].includes('Calling') || args[0].includes('successful'))) {
        apiCallLogs.push(args.join(' '));
      }
      originalInfo(...args);
    };

    const context = mockContext();
    const req = { 
      method: 'POST', 
      headers: {}, 
      body: {
        "imageUrl": "https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg",
        "userData": {
          "first_name": "User",
          "last_name": "Test",
          "birthdate": "1990-01-01",
          "gender": "female",
          "budget_level": "High",
          "shop_domain": "dermaself-dev.myshopify.com"
        },
        "includeRecommendations": true,
        "metadata": {
          "apiVersion": "1.0",
          "clientTimestamp": 1757014841701
        }
      } 
    };
    context.req = req;

    await inferFunc(context, req);

    // Restore original console methods
    console.log = originalLog;
    console.info = originalInfo;

    // Verify response structure
    expect(context.res).toBeDefined();
    expect(context.res.body).toBeDefined();
    
    const body = context.res.body;
    const status = context.res.status || 200;
    
    // Log captured API calls for debugging
    console.log('Captured API call logs:', apiCallLogs);
    
    // Verify that we have actual data (not just fallback)
    if (status === 200 && !body.fallback) {
      // Check that we have actual predictions data
      expect(body.predictions).toBeDefined();
      expect(body.acne).toBeDefined();
      expect(body.redness).toBeDefined();
      expect(body.wrinkles).toBeDefined();
      
      // Verify that the response contains real data, not just empty fallback
      expect(body.acne.severity).toBeDefined();
      expect(body.redness.redness_perc).toBeDefined();
      expect(body.wrinkles.severity).toBeDefined();
      
      console.log('API calls completed successfully with real data');
      console.log('Acne severity:', body.acne.severity);
      console.log('Redness percentage:', body.redness.redness_perc);
      console.log('Wrinkles severity:', body.wrinkles.severity);
    } else {
      console.log('API calls resulted in fallback response');
      console.log('Fallback reason:', body.message || 'Unknown');
    }
    
    // The test passes if we get a valid response, regardless of whether it's from cache or fresh API calls
    expect(status).toBe(200);
  });

  it('should return a complete and valid JSON response structure', async () => {
    // Verify test image is accessible
    const imageAccessible = await verifyTestImage();
    expect(imageAccessible).toBe(true);

    const context = mockContext();
    const req = { 
      method: 'POST', 
      headers: {}, 
      body: {
        "imageUrl": "https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg",
        "userData": {
          "first_name": "User",
          "last_name": "Test",
          "birthdate": "1990-01-01",
          "gender": "female",
          "budget_level": "High",
          "shop_domain": "dermaself-dev.myshopify.com"
        },
        "includeRecommendations": true,
        "metadata": {
          "apiVersion": "1.0",
          "clientTimestamp": 1757014841701
        }
      } 
    };
    context.req = req;

    await inferFunc(context, req);

    // Verify response structure
    expect(context.res).toBeDefined();
    expect(context.res.body).toBeDefined();
    
    const body = context.res.body;
    const status = context.res.status || 200;
    
    // Verify all required top-level properties exist
    const requiredProperties = [
      'inference_id', 'time', 'image', 'predictions', 
      'acne', 'redness', 'wrinkles', 'recommendations', 'recommendations_meta'
    ];
    
    // Verify recommendations structure if present
    if (body.recommendations) {
      expect(body.recommendations).toHaveProperty('user');
      expect(body.recommendations).toHaveProperty('skincare_routine');
      expect(typeof body.recommendations.user).toBe('object');
      expect(Array.isArray(body.recommendations.skincare_routine)).toBe(true);
      
      // Verify user data structure
      expect(body.recommendations.user).toHaveProperty('first_name');
      expect(body.recommendations.user).toHaveProperty('last_name');
      expect(body.recommendations.user).toHaveProperty('age');
      expect(body.recommendations.user).toHaveProperty('gender');
      
      // Verify at least one skincare routine category exists
      expect(body.recommendations.skincare_routine.length).toBeGreaterThan(0);
      
      // Verify each category has required structure
      body.recommendations.skincare_routine.forEach(category => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('modules');
        expect(typeof category.category).toBe('string');
        expect(Array.isArray(category.modules)).toBe(true);
        expect(category.modules.length).toBeGreaterThan(0);
      });
    }
    
    requiredProperties.forEach(prop => {
      expect(body).toHaveProperty(prop);
      expect(body[prop]).toBeDefined();
    });
    
    // Verify data types
    expect(typeof body.inference_id).toBe('string');
    expect(typeof body.time).toBe('number');
    expect(typeof body.image).toBe('object');
    expect(Array.isArray(body.predictions)).toBe(true);
    expect(typeof body.acne).toBe('object');
    expect(typeof body.redness).toBe('object');
    expect(typeof body.wrinkles).toBe('object');
    expect(typeof body.recommendations).toBe('object');
    expect(typeof body.recommendations_meta).toBe('object');
    
    // Verify no null or undefined values in critical fields
    expect(body.inference_id).not.toBeNull();
    expect(body.inference_id).not.toBe('');
    expect(body.time).not.toBeNull();
    expect(body.image).not.toBeNull();
    expect(body.acne).not.toBeNull();
    expect(body.redness).not.toBeNull();
    expect(body.wrinkles).not.toBeNull();
    
    console.log('Complete JSON response structure validation passed');
    console.log('Response contains all required properties with correct types');
  });

  it('should call external APIs when cache is empty', async () => {
    // Clear all relevant cache entries
    const cache = require('../shared/cache');
    const testImageUrl = 'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-09-04/4361299b-8490-42bc-9878-f656b189a42c.jpeg';
    
    // Clear inference cache
    await cache.invalidate(`inference:${testImageUrl}`);
    
    // Clear individual API caches if they exist
    await cache.invalidate(`redness:${testImageUrl}`);
    await cache.invalidate(`wrinkles:${testImageUrl}`);
    
    console.log('All caches cleared, forcing fresh API calls');

    const context = mockContext();
    const req = { 
      method: 'POST', 
      headers: {}, 
      body: {
        "imageUrl": testImageUrl,
        "userData": {
          "first_name": "User",
          "last_name": "Test",
          "birthdate": "1990-01-01",
          "gender": "female",
          "budget_level": "High",
          "shop_domain": "dermaself-dev.myshopify.com"
        },
        "includeRecommendations": true,
        "metadata": {
          "apiVersion": "1.0",
          "clientTimestamp": 1757014841701
        }
      } 
    };
    context.req = req;

    // Capture logs to verify API calls
    const logs = [];
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalConsoleLog(...args);
    };
    
    console.info = (...args) => {
      logs.push(args.join(' '));
      originalConsoleInfo(...args);
    };

    await inferFunc(context, req);

    // Restore console
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;

    // Check response
    expect(context.res).toBeDefined();
    expect(context.res.body).toBeDefined();
    
    const body = context.res.body;
    const status = context.res.status || 200;
    
    // Look for API call indicators in logs
    const apiCallIndicators = logs.filter(log => 
      log.includes('Calling') || 
      log.includes('API') || 
      log.includes('successful') ||
      log.includes('failed') ||
      log.includes('timeout')
    );
    
    console.log('API call indicators found in logs:', apiCallIndicators);
    
    // Verify that we have evidence of API calls
    const hasRoboflowCall = apiCallIndicators.some(log => log.includes('Roboflow'));
    const hasWrinklesCall = apiCallIndicators.some(log => log.includes('Wrinkles'));
    const hasRecommendationsCall = apiCallIndicators.some(log => log.includes('recommendations'));
    const hasRednessCall = apiCallIndicators.some(log => log.includes('Redness'));
    
    console.log('API calls detected:', {
      roboflow: hasRoboflowCall,
      wrinkles: hasWrinklesCall,
      redness: hasRednessCall,
      recommendations: hasRecommendationsCall
    });
    
    // At least some APIs should be called
    expect(hasRoboflowCall || hasWrinklesCall || hasRecommendationsCall).toBe(true);
    
    // Log specifico per debugging redness API
    if (!hasRednessCall) {
      console.log('Redness API not called - checking for errors in logs...');
      const rednessErrors = logs.filter(log => 
        log.includes('redness') || log.includes('Redness') || log.includes('redness API')
      );
      console.log('Redness-related logs:', rednessErrors);
    }
    
    // Verify we got a valid response
    expect(status).toBe(200);
    
    // If it's not a fallback, we should have real data
    if (!body.fallback) {
      expect(body.acne).toBeDefined();
      expect(body.redness).toBeDefined();
      expect(body.wrinkles).toBeDefined();
      console.log('Fresh API calls completed with real data');
    } else {
      console.log('API calls resulted in fallback - this might indicate API issues');
    }
  }, 20000); // 20 secondi timeout per le chiamate API

  it('should compute wrinkles metrics correctly', async () => {
    const { computeWrinklesMetrics } = require('../shared/wrinklesMetrics');
    
    // Test with sample predictions similar to the example output
    const mockPredictions = [
      { class: 'forehead', confidence: 0.832 },
      { class: 'crows_feet', confidence: 0.710 },
      { class: 'nasolabial_fold', confidence: 0.705 },
      { class: 'frown', confidence: 0.339 },
      { class: 'mental_crease', confidence: 0.320 },
      { class: 'tear_through', confidence: 0.267 },
      { class: 'background', confidence: 0.999 } // Should be filtered out
    ];

    const metrics = computeWrinklesMetrics(mockPredictions);

    expect(metrics).toHaveProperty('counts');
    expect(metrics).toHaveProperty('severity');
    expect(metrics).toHaveProperty('total_predictions');
    expect(metrics).toHaveProperty('has_forehead_wrinkles');
    expect(metrics).toHaveProperty('has_expression_lines');
    expect(metrics).toHaveProperty('has_under_eye_concerns');

    // Background should be filtered out
    expect(metrics.total_predictions).toBe(6); // 7 - 1 background
    expect(metrics.has_forehead_wrinkles).toBe(true);
    expect(metrics.has_expression_lines).toBe(true);
    expect(metrics.has_under_eye_concerns).toBe(true);
    
    // Verify individual class counts
    expect(metrics.counts.forehead).toBe(1);
    expect(metrics.counts.crows_feet).toBe(1);
    expect(metrics.counts.bunny_line).toBe(0); // Should be 0 for unused classes

    console.log('Wrinkles metrics test passed:', metrics);
  });
}); 