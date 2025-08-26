import axios from 'axios';

const getApiUrl = () => {
  // Get the current hostname (will be IP address when testing on mobile)
  const hostname = window.location.hostname;
  const port = '3001'; // Backend port

  let apiUrl; // Declare apiUrl variable

  if (process.env.NODE_ENV === 'production') {
    apiUrl = `${window.location.protocol}//${window.location.host}`;
  }
  
  // In development, use the same hostname (IP address) but different port
  else {
    apiUrl = `${window.location.protocol}//${hostname}:${port}`;
  }

  return apiUrl;
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
