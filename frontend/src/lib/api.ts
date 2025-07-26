import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:7071/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
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
}

export interface AnalysisResponse {
  concerns: Array<{
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
  overallHealth: number;
  imageUrl: string;
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
export async function getUploadUrl(): Promise<UploadUrlResponse> {
  const response = await api.get('/upload-url');
  return response.data;
}

/**
 * Analyze skin image
 */
export async function analyzeSkin(imageDataUrl: string): Promise<AnalysisResponse> {
  try {
    // First, get upload URL
    const { uploadUrl, blobName } = await getUploadUrl();
    
    // Convert data URL to blob
    const base64Data = imageDataUrl.split(',')[1];
    const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
    
    // Upload image to Azure Storage
    await axios.put(uploadUrl, blob, {
      headers: {
        'Content-Type': 'image/jpeg',
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    
    // Analyze the uploaded image
    const response = await api.post('/infer', {
      imageUrl: blobName,
    });
    
    return response.data;
  } catch (error) {
    console.error('Skin analysis error:', error);
    throw error;
  }
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