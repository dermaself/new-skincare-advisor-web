import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api';

// Axios instance pre-configured for our API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 413:
          throw new Error('Image file too large. Please use a smaller image.');
        case 400:
          throw new Error(data?.message || 'Invalid request. Please check your image.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data?.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('An unexpected error occurred.');
    }
  }
);

export interface UploadUrlResponse {
  uploadUrl: string;
  blobName: string;
  blobUrl?: string; // Public URL for the uploaded blob
}

export interface AnalysisResponse {
  // Roboflow inference data
  predictions: Array<any>;
  image: {
    width: number;
    height: number;
  };
  
  // Acne analysis
  acne: {
    counts: Record<string, number>;
    severity: 'None' | 'Mild' | 'Moderate' | 'Severe';
    classification: string;
  };
  
  // Redness analysis
  redness?: {
    num_polygons: number;
    polygons: Array<Array<[number, number]>>;
    analysis_width: number;
    analysis_height: number;
    erythema: boolean;
    redness_perc: number;
  };
  
  // Product recommendations
  recommendations?: {
    user: {
      first_name: string;
      last_name: string;
      age: string;
      gender: string;
    };
    skincare_routine: Array<{
      category: string;
      modules: Array<{
        module: string;
        main_product: any;
        alternative_products: Array<any>;
      }>;
    }>;
  };
  
  // Metadata
  recommendations_meta?: {
    success: boolean;
    duration: number;
    error?: string;
  };
  
  // Legacy compatibility
  concerns?: Array<{
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overallHealth?: number;
  imageUrl?: string;
}

export interface ImageMetadata {
  source: 'camera' | 'file';
  facingMode?: 'user' | 'environment';
  fileName?: string;
  fileSize?: number;
  timestamp: number;
}

export interface UserData {
  first_name?: string;
  last_name?: string;
  birthdate?: string;
  gender?: 'male' | 'female' | 'other';
  erythema?: boolean;
  budget_level?: 'Low' | 'Medium' | 'High';
  shop_domain?: string;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  checks: {
    storage: { status: string; latency: number };
    redis: { status: string; latency: number };
    roboflow: { status: string };
    memory: { status: string; percentage: number };
  };
}

/**
 * Get upload URL for image
 */
export async function getUploadUrl(mimeType: string = 'image/jpeg'): Promise<UploadUrlResponse> {
  // OWASP: Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Invalid image type. Only JPEG, PNG, and WebP are allowed.');
  }

  const response = await api.post('/upload-url', { mimeType });
  return response.data;
}

/**
 * Upload image file to blob storage
 */
export async function uploadImageFile(file: File): Promise<string> {
  // Log the original file size
  console.log('Uploading file - original size:', file.size, 'bytes');
  console.log('File type:', file.type);
  
  // OWASP: Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }
  
  if (file.size < minSize) {
    throw new Error('File is too small. Minimum size is 1KB.');
  }

  try {
    // Get upload URL with correct MIME type
    const { uploadUrl, blobUrl, blobName } = await getUploadUrl(file.type);
    
    // Upload file to Azure Blob Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    // Return public URL or construct from blobName
    return blobUrl || blobName;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Upload base64 image to blob storage
 */
export async function uploadBase64Image(imageDataUrl: string): Promise<string> {
  try {
    // Log the input data URL size
    console.log('Uploading base64 image - data URL length:', imageDataUrl.length);
    console.log('Estimated input size in KB:', Math.round(imageDataUrl.length * 0.75 / 1024));
    
    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    // Log the blob size
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    // Validate blob size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (blob.size > maxSize) {
      throw new Error('Image is too large. Maximum size is 10MB.');
    }
    
    // Get upload URL
    const { uploadUrl, blobUrl, blobName } = await getUploadUrl(blob.type);
    
    // Upload to Azure Blob Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type,
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    // Return public URL or construct from blobName
    return blobUrl || blobName;
  } catch (error) {
    console.error('Base64 upload failed:', error);
    throw error;
  }
}

/**
 * Analyze skin image with user data and recommendations
 */
export async function analyzeSkinWithRecommendations(
  imageSource: string | File,
  userData?: UserData,
  metadata?: ImageMetadata
): Promise<AnalysisResponse> {
  try {
    let imageUrl: string;
    
    // Upload image based on source type
    if (typeof imageSource === 'string') {
      // Base64 data URL from camera
      imageUrl = await uploadBase64Image(imageSource);
    } else {
      // File from upload
      imageUrl = await uploadImageFile(imageSource);
    }
    
    // Prepare inference request
    const requestBody = {
      imageUrl,
      userData: userData || {},
      includeRecommendations: true,
      metadata: {
        ...metadata,
        apiVersion: '1.0',
        clientTimestamp: Date.now()
      }
    };
    
    // Call inference API
    const response = await api.post('/infer', requestBody);
    
    return response.data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function analyzeSkin(imageDataUrl: string): Promise<AnalysisResponse> {
  return analyzeSkinWithRecommendations(imageDataUrl);
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  const response = await api.get('/health');
  return response.data;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export default api; 