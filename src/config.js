import axios from 'axios';

const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same domain as the frontend
    return '';
  }
  // In development, use the proxy setting
  return 'http://localhost:3001';
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const config = {
  apiUrl: getApiUrl(),
  api,
};
