/**
 * Notification Service for user-friendly error messages
 * Replaces browser TTS fallbacks with proper user feedback
 */
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.recentMessages = new Map(); // Track recent messages to prevent duplicates
  }

  /**
   * Add a listener for notification updates
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of notification changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  /**
   * Show a notification to the user
   */
  showNotification(message, type = 'info', duration = 5000) {
    // Prevent duplicate messages within 2 seconds
    const messageKey = `${message}-${type}`;
    const now = Date.now();
    const lastShown = this.recentMessages.get(messageKey);

    if (lastShown && (now - lastShown) < 2000) {
      console.log('🔇 Skipping duplicate notification:', message);
      return null; // Don't show duplicate
    }

    // Track this message
    this.recentMessages.set(messageKey, now);

    // Clean up old entries (older than 5 seconds)
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > 5000) {
        this.recentMessages.delete(key);
      }
    }

    const notification = {
      id: Date.now() + Math.random(),
      message,
      type, // 'info', 'success', 'warning', 'error'
      timestamp: Date.now(),
      duration
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  /**
   * Remove a notification
   */
  removeNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Show TTS-specific error messages
   */
  showTTSError(error, context = 'speech synthesis') {
    let message = 'Speech synthesis failed. Please try again.';
    let type = 'error';

    // Debug logging to see the actual error format
    console.group('🔍 TTSService Error Debug');
    console.error('Error code:', error.code);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    console.error('Full error object:', error);
    console.groupEnd();

    // Check for invalid phoneme errors - can be ERR_BAD_REQUEST or ERR_BAD_RESPONSE
    const errorData = error.response?.data;

    // Check if response data indicates invalid phonemes (even if HTTP status is 500)
    if (errorData?.error === 'Speech synthesis failed' &&
        (errorData?.statusCode === 400 || errorData?.details?.includes('400'))) {
      console.log('✅ Detected invalid phoneme error via response data');
      message = 'Invalid phonemes detected. Please check your IPA input.';
      type = 'warning';
      return this.showNotification(message, type, 6000);
    }

    // Also check for direct ERR_BAD_REQUEST
    if (error.code === 'ERR_BAD_REQUEST') {
      console.log('✅ Detected ERR_BAD_REQUEST - treating as invalid phonemes');
      message = 'Invalid phonemes detected. Please check your IPA input.';
      type = 'warning';
      return this.showNotification(message, type, 6000);
    }

    // Categorize other errors for user-friendly messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      message = 'Request timed out. Please check your internet connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Network connection issue. Please check your internet connection.';
    } else if (error.response?.status === 400) {
      message = 'Invalid phonemes detected. Please check your IPA input.';
      type = 'warning';
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      message = 'TTS service authentication failed. Please contact support.';
      type = 'warning';
    } else if (error.response?.status === 429) {
      message = 'Too many requests. Please wait a moment and try again.';
      type = 'warning';
    } else if (error.response?.status >= 500) {
      message = 'TTS service is temporarily unavailable. Please try again later.';
    }

    return this.showNotification(message, type, 8000); // Longer duration for errors
  }

  /**
   * Show success message for TTS operations
   */
  showTTSSuccess(message = 'Speech synthesis completed successfully') {
    return this.showNotification(message, 'success', 3000);
  }

  /**
   * Show info message for TTS operations
   */
  showTTSInfo(message) {
    return this.showNotification(message, 'info', 4000);
  }

  /**
   * Get current notifications
   */
  getNotifications() {
    return [...this.notifications];
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
