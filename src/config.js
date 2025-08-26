import axios from 'axios';

const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same origin
    return `${window.location.protocol}//${window.location.host}`;
  } else {
    // In development, use the proxy on the same origin
    // The proxy should route API calls to the backend
    return `${window.location.protocol}//${window.location.host}`;
  }
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
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
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      timeout: error.code === 'ECONNABORTED',
      networkError: error.code === 'ERR_NETWORK',
      data: error.response?.data
    };

    console.error('API Error:', errorDetails);

    // Log specific error types
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out after 10 seconds');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - cannot reach server');
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status);
    }

    return Promise.reject(error);
  }
);

export const config = {
  apiUrl: getApiUrl(),
  api,
};
