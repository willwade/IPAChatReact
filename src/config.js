import axios from 'axios';
import notificationService from './services/NotificationService';

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

    // Enhanced logging for detailed error analysis
    if (error.response?.data) {
      console.error('📝 Server Response Data:', error.response.data);
      if (typeof error.response.data === 'object') {
        console.error('📝 Detailed Error Info:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Show user-friendly error notifications
    let userMessage = 'An error occurred. Please try again.';
    let notificationType = 'error';

    // Debug: Log which error path we're taking
    console.error('🔍 Error Response Status:', error.response?.status);
    console.error('🔍 Error Code:', error.code);

    if (error.code === 'ECONNABORTED') {
      console.error(`Request timed out after ${(error.config?.timeout || 30000) / 1000} seconds`);
      userMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - cannot reach server');
      userMessage = 'Cannot reach server. Please check your internet connection.';
    } else if (error.response?.status >= 500) {
      console.error(`Server error: ${error.response.status} - ${error.response.statusText}`);

      // Check if this is actually a TTS error with specific error info
      const responseData = error.response.data;
      if (error.config?.url?.includes('/api/tts') && responseData?.error === 'Speech synthesis failed') {
        console.error('🎙️ Detected TTS error in 500 path:', responseData);
        if (responseData.statusCode === 400 || responseData.details?.includes('400')) {
          userMessage = 'Invalid phonemes detected. Please check your IPA input.';
          notificationType = 'warning';
        } else {
          userMessage = 'Speech synthesis failed. Please check your phoneme input.';
        }
      } else {
        userMessage = 'Server error. Please try again later.';
      }
    } else if (error.response?.status === 401) {
      console.error('Authentication error - check Azure credentials');
      userMessage = 'Authentication failed. Please check your settings.';
      notificationType = 'warning';
    } else if (error.response?.status === 429) {
      console.error('Rate limit exceeded - too many requests');
      userMessage = 'Too many requests. Please wait a moment and try again.';
      notificationType = 'warning';
    } else if (error.response?.status === 403) {
      userMessage = 'Access denied. Please check your permissions.';
      notificationType = 'warning';
    } else if (error.response?.status === 400) {
      // Handle 400 errors more specifically, especially for TTS/IPA
      const responseData = error.response.data;

      if (error.config?.url?.includes('/api/tts')) {
        console.error('🎙️ TTS Bad Request Details:', responseData);

        // Check if it's an invalid IPA error
        if (typeof responseData === 'string') {
          if (responseData.toLowerCase().includes('invalid') && responseData.toLowerCase().includes('ipa')) {
            userMessage = 'Invalid IPA phonemes detected. Please check your input.';
          } else if (responseData.toLowerCase().includes('ssml') || responseData.toLowerCase().includes('phoneme')) {
            userMessage = 'Invalid phoneme format. Please use valid IPA symbols.';
          } else {
            userMessage = `TTS Error: ${responseData}`;
          }
        } else if (responseData?.error || responseData?.message || responseData?.details) {
          const errorMsg = responseData.error || responseData.message || responseData.details;
          console.error('🔍 Parsed Error Message:', errorMsg);

          if (errorMsg.toLowerCase().includes('ipa') || errorMsg.toLowerCase().includes('phoneme')) {
            userMessage = 'Invalid IPA phonemes. Please check your input.';
          } else if (errorMsg.toLowerCase().includes('speech synthesis failed')) {
            // Check if we have more details
            if (responseData.details && responseData.details.toLowerCase().includes('400')) {
              userMessage = 'Invalid phonemes detected. Please check your IPA input.';
            } else {
              userMessage = 'Speech synthesis failed. Please check your phoneme input.';
            }
          } else if (errorMsg.toLowerCase().includes('bad request') || errorMsg.toLowerCase().includes('400')) {
            userMessage = 'Invalid phonemes detected. Please check your IPA input.';
          } else {
            userMessage = `TTS Error: ${errorMsg}`;
          }
        } else {
          userMessage = 'Invalid TTS request. Please check your phoneme input.';
        }
        notificationType = 'warning';
      } else {
        // Generic 400 error
        if (typeof responseData === 'string' && responseData.length < 100) {
          userMessage = `Invalid request: ${responseData}`;
        } else {
          userMessage = 'Invalid request. Please check your input and try again.';
        }
        notificationType = 'warning';
      }
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      userMessage = 'Invalid request. Please check your input and try again.';
      notificationType = 'warning';
    } else {
      // Catch-all: Check if this is a TTS error regardless of status
      const responseData = error.response?.data;
      if (error.config?.url?.includes('/api/tts') && responseData?.error) {
        console.error('🎙️ Caught TTS error in catch-all:', responseData);

        if (responseData.error === 'Speech synthesis failed' &&
            (responseData.statusCode === 400 || responseData.details?.includes('400'))) {
          userMessage = 'Invalid phonemes detected. Please check your IPA input.';
          notificationType = 'warning';
        } else if (responseData.error.toLowerCase().includes('synthesis')) {
          userMessage = 'Speech synthesis failed. Please check your phoneme input.';
          notificationType = 'warning';
        } else {
          userMessage = `TTS Error: ${responseData.error}`;
          notificationType = 'warning';
        }
      }
    }

    // Show notification to user (but not for TTS endpoints - they handle their own notifications)
    if (!error.config?.url?.includes('/api/tts')) {
      notificationService.showNotification(userMessage, notificationType, 6000);
    } else {
      console.log('🔇 Skipping axios interceptor notification for TTS endpoint - TTSService will handle it');
    }

    // Enhanced logging for TTS endpoints
    if (error.config?.url?.includes('/api/tts')) {
      console.group('🎙️ TTS Request Failed - Full Debug Info');
      console.error('URL:', error.config.url);
      console.error('Method:', error.config.method?.toUpperCase());
      console.error('Request Headers:', error.config.headers);

      try {
        const requestData = error.config.data ? JSON.parse(error.config.data) : null;
        console.error('Request Body:', requestData);
        if (requestData?.text) {
          console.error('📝 IPA Text Attempted:', `"${requestData.text}"`);
        }
      } catch (e) {
        console.error('Request Body (raw):', error.config.data);
      }

      console.error('Response Status:', error.response?.status);
      console.error('Response Headers:', error.response?.headers);
      console.error('Response Body:', error.response?.data);
      console.error('Error Message:', error.message);
      console.error('Timeout:', error.config.timeout);
      console.groupEnd();
    }

    return Promise.reject(error);
  }
);

export const config = {
  apiUrl: getApiUrl(),
  api,
};
