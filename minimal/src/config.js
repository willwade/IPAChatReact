import axios from 'axios';

const getApiUrl = () => {
  const hostname = window.location.hostname;
  const port = '3001';

  let apiUrl;

  if (process.env.NODE_ENV === 'production') {
    apiUrl = `${window.location.protocol}//${window.location.host}`;
  } else {
    apiUrl = `${window.location.protocol}//${hostname}:${port}`;
  }

  return apiUrl;
};

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