import axios from 'axios';

const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same origin
    return `${window.location.protocol}//${window.location.host}`;
  } else {
    // In development, use relative URLs that will be proxied to backend
    return '';
  }
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout for TTS requests
  validateStatus: (status) => {
    return status >= 200 && status < 500;
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => {
    console.log('API Success:', {
      url: response.config?.url,
      status: response.status,
      method: response.config?.method,
    });
    return response;
  },
  error => {
    const errorDetails = {
      message: error.message,
      code: error.code,
      name: error.name,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      timeout: error.config?.timeout,
      status: error.response?.status,
      statusText: error.response?.statusText,
      isTimeout: error.code === 'ECONNABORTED',
      isNetworkError: error.code === 'ERR_NETWORK',
      data: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : null
    };

    console.error('API Error Details:', errorDetails);

    // Log specific error types with more detail
    if (error.code === 'ECONNABORTED') {
      console.error(`Request timed out after ${(error.config?.timeout || 30000) / 1000} seconds`);
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - cannot reach server');
    } else if (error.response?.status >= 500) {
      console.error(`Server error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.response?.status === 401) {
      console.error('Authentication error - check Azure credentials');
    } else if (error.response?.status === 429) {
      console.error('Rate limit exceeded - too many requests');
    }

    // Log the full error for debugging if it's a TTS endpoint
    if (error.config?.url?.includes('/api/tts')) {
      console.error('TTS Request Failed:', {
        url: error.config.url,
        requestData: error.config.data ? JSON.parse(error.config.data) : null,
        timeout: error.config.timeout,
        error: error.response?.data || error.message
      });
    }

    return Promise.reject(error);
  }
);

export const config = {
  apiUrl: getApiUrl(),
  api,
};
