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
  response => response,
  error => {
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
    });
    return Promise.reject(error);
  }
);

export const config = {
  apiUrl: getApiUrl(),
  api,
};
