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

async function uploadSampleImage() {
  const context = mockContext();
  const req = { method: 'POST', headers: {}, body: { mimeType: 'image/jpeg' } };
  context.req = req;
  await uploadUrlFunc(context, req);
  const { uploadUrl, blobUrl } = context.res.body;
  
  console.log('Upload URLs for inference test:', { uploadUrl, blobUrl });
  
  const IMAGE_URL = 'https://s3-public-acnerevolution.hel1.your-objectstorage.com/acne-papulo-pustolosa-1.jpg';
  console.log('Downloading sample image for inference test...');
  const { data: sampleImage } = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
  console.log('Downloaded image size for inference:', sampleImage.length, 'bytes');
  
  console.log('Uploading image for inference test...');
  const uploadResponse = await axios.put(uploadUrl, sampleImage, {
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-blob-content-type': 'image/jpeg',
      'Content-Type': 'image/jpeg',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  
  console.log('Upload response for inference test:', uploadResponse.status);
  
  // Verifica che l'immagine sia accessibile
  console.log('Verifying image accessibility for inference test...');
  try {
    const verifyResponse = await axios.head(blobUrl);
    console.log('Image verification for inference successful:', verifyResponse.status);
  } catch (error) {
    console.error('Image verification for inference failed:', error.response?.status, error.message);
  }
  
  // Per container pubblico, usa l'URL base senza SAS token
  const publicUrl = blobUrl.split('?')[0]; // Rimuove il SAS token
  console.log('Using public URL for Roboflow:', publicUrl);
  
  return publicUrl;
}

describe('Infer Function', () => {
  it('returns enriched inference with acne metrics and product recommendations', async () => {
    const imageUrl = await uploadSampleImage();

    const context = mockContext();
    const req = { 
      method: 'POST', 
      headers: {}, 
      body: { 
        imageUrl, 
        sync: true,
        userData: {
          first_name: 'Lorenzo',
          last_name: 'Test', 
          birthdate: '1998-01-01',
          gender: 'female',
          budget_level: 'High',
          shop_domain: 'dermaself'
        },
        includeRecommendations: true
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
        console.log('Routine modules:', body.recommendations.skincare_routine.length);
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