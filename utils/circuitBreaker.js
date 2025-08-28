class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    // Track recent calls for monitoring
    this.recentCalls = [];
    
    console.log('Circuit breaker initialized:', {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      monitoringPeriod: this.monitoringPeriod
    });
  }

  async call(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        error.nextAttempt = this.nextAttempt;
        throw error;
      } else {
        // Transition to HALF_OPEN
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker transitioning to HALF_OPEN - testing service');
      }
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.recordCall(true);
    
    if (this.state === 'HALF_OPEN') {
      console.log('Circuit breaker test successful - transitioning to CLOSED');
      this.reset();
    } else if (this.state === 'CLOSED') {
      // Reset failure count on successful call
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  onFailure(error) {
    this.recordCall(false);
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.log('Circuit breaker failure recorded:', {
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message,
      state: this.state
    });

    if (this.state === 'HALF_OPEN') {
      // If we fail in HALF_OPEN, go back to OPEN
      this.trip();
    } else if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    console.log('Circuit breaker TRIPPED - service calls blocked until:', new Date(this.nextAttempt).toISOString());
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    console.log('Circuit breaker RESET - service calls allowed');
  }

  recordCall(success) {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success });
    
    // Clean up old calls outside monitoring period
    this.recentCalls = this.recentCalls.filter(
      call => now - call.timestamp < this.monitoringPeriod
    );
  }

  getStats() {
    const now = Date.now();
    const recentCalls = this.recentCalls.filter(
      call => now - call.timestamp < this.monitoringPeriod
    );
    
    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate: Math.round(successRate * 100) / 100,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      timeUntilNextAttempt: this.nextAttempt ? Math.max(0, this.nextAttempt - now) : null
    };
  }

  // Force circuit breaker state for testing
  forceOpen() {
    this.trip();
  }

  forceReset() {
    this.reset();
  }
}

module.exports = { CircuitBreaker };