/**
 * Monitors platform event health and detects when events stop flowing
 */
export default class EventHealthMonitor {
    lastEventReceived = null;
    healthCheckInterval = null;
    healthCheckAttempts = 0;
    eventCount = 0;
    startTime = null;
    onUnhealthy = null;

    static HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
    static EVENT_TIMEOUT = 10000; // 10 seconds
    static MAX_FAILED_CHECKS = 2;

    /**
     * Start monitoring event health
     * @param {Function} onUnhealthy - Callback when events are determined to be unhealthy
     */
    start(onUnhealthy) {
        this.stop(); // Clear any existing interval
        this.onUnhealthy = onUnhealthy;
        this.startTime = Date.now();

        this.healthCheckInterval = setInterval(() => {
            this._performHealthCheck();
        }, EventHealthMonitor.HEALTH_CHECK_INTERVAL);
    }

    /**
     * Stop health monitoring
     */
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.healthCheckAttempts = 0;
        }
    }

    /**
     * Record that an event was received
     */
    recordEvent() {
        this.lastEventReceived = Date.now();
        this.eventCount++;
        this.healthCheckAttempts = 0; // Reset failed checks on successful event
    }

    /**
     * Perform a health check
     */
    _performHealthCheck() {
        const now = Date.now();
        const timeSinceLastEvent = this.lastEventReceived
            ? now - this.lastEventReceived
            : now - this.startTime;

        // If no events received within timeout
        if (timeSinceLastEvent > EventHealthMonitor.EVENT_TIMEOUT) {
            this.healthCheckAttempts++;

            if (
                this.healthCheckAttempts >= EventHealthMonitor.MAX_FAILED_CHECKS
            ) {
                // Notify that events are unhealthy
                if (this.onUnhealthy) {
                    this.onUnhealthy('health_check_failed');
                }
            }
        } else {
            this.healthCheckAttempts = 0;
        }
    }

    /**
     * Get current health status
     * @returns {Object}
     */
    getStatus() {
        return {
            eventCount: this.eventCount,
            lastEventReceived: this.lastEventReceived,
            healthCheckAttempts: this.healthCheckAttempts,
            isHealthy:
                this.healthCheckAttempts < EventHealthMonitor.MAX_FAILED_CHECKS
        };
    }

    /**
     * Reset monitoring state
     */
    reset() {
        this.stop();
        this.lastEventReceived = null;
        this.eventCount = 0;
        this.healthCheckAttempts = 0;
        this.startTime = null;
    }
}
