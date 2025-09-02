/**
 * Notification Service for user-friendly error messages
 * Replaces browser TTS fallbacks with proper user feedback
 */
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
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

    // Categorize errors for user-friendly messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      message = 'Request timed out. Please check your internet connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Network connection issue. Please check your internet connection.';
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
