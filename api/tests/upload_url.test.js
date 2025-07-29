const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
require('./setupEnv');

const uploadUrlFunc = require('../upload-url/index');

function mockContext() {
  return {
    log: console,
    res: {},
  };
}

describe('Upload URL Function', () => {
  it('returns a valid SAS URL and allows uploading an image', async () => {
    const context = mockContext();
    const req = {
      method: 'POST',
      headers: {},
      body: { mimeType: 'image/jpeg' },
    };

    context.req = req;

    await uploadUrlFunc(context, req);

    expect(context.res.status || 200).toBe(200);
    const { uploadUrl, blobUrl } = context.res.body;
    expect(uploadUrl).toMatch(/^https?:\/\//);
    expect(blobUrl).toMatch(/^https?:\/\//);

    console.log('Generated URLs:', { uploadUrl, blobUrl });

    // Scarica l'immagine reale e caricala sul blob
    const IMAGE_URL = 'https://s3-public-acnerevolution.hel1.your-objectstorage.com/acne-papulo-pustolosa-1.jpg';
    console.log('Downloading sample image from:', IMAGE_URL);
    
    const { data: sampleImage } = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
    console.log('Downloaded image size:', sampleImage.length, 'bytes');

    console.log('Uploading image to blob storage...');
    const uploadResponse = await axios.put(uploadUrl, sampleImage, {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-blob-content-type': 'image/jpeg',
        'Content-Type': 'image/jpeg',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response headers:', uploadResponse.headers);
    
    // Verifica che l'immagine sia accessibile
    console.log('Verifying image accessibility...');
    try {
      const verifyResponse = await axios.head(blobUrl);
      console.log('Image verification successful:', verifyResponse.status);
    } catch (error) {
      console.error('Image verification failed:', error.response?.status, error.message);
    }
  }, 60000);
}); 