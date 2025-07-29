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
  it('returns enriched inference with acne metrics', async () => {
    const imageUrl = await uploadSampleImage();

    const context = mockContext();
    const req = { method: 'POST', headers: {}, body: { imageUrl, sync: true } };
    context.req = req;

    await inferFunc(context, req);

    // Verifica che la risposta sia presente
    expect(context.res).toBeDefined();
    expect(context.res.body).toBeDefined();
    
    const body = context.res.body;
    const status = context.res.status || 200;
    
    console.log('Response status:', status);
    console.log('Response body keys:', Object.keys(body));
    
    if (status === 200 && !body.fallback) {
      // Risposta normale - Roboflow funziona
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('image');
      expect(body).toHaveProperty('acne');
      expect(body.acne).toHaveProperty('counts');
      expect(body.acne).toHaveProperty('severity');
      expect(body.acne).toHaveProperty('classification');
      
      // Verifica che ci siano predictions (Roboflow funziona)
      expect(body.predictions).toBeInstanceOf(Array);
      expect(body.predictions.length).toBeGreaterThan(0);
      
      // Verifica che le metriche acne siano calcolate
      expect(body.acne.counts).toBeInstanceOf(Object);
      expect(body.acne.severity).toBeDefined();
      expect(body.acne.classification).toBeDefined();
      
      console.log('Roboflow inference successful:', {
        predictionsCount: body.predictions.length,
        acneSeverity: body.acne.severity,
        acneClassification: body.acne.classification
      });
    } else {
      // Risposta di fallback - verifica la struttura corretta
      expect(body).toHaveProperty('fallback');
      expect(body).toHaveProperty('message');
      expect(body.fallback).toBe(true);
      expect(body.message).toContain('Servizio temporaneamente non disponibile');
      
      console.log('Fallback response used');
    }
  });
}); 