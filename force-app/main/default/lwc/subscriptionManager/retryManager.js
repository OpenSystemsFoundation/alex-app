/**
 * Manages retry logic for platform event subscription failures
 */
export default class RetryManager {
    retryCount = 0;
    retryTimeout = null;
    onRetry = null;
    onMaxRetriesExceeded = null;

    static MAX_RETRY_ATTEMPTS = 3;
    static BASE_RETRY_DELAY = 2000; // 2 seconds

    /**
     * Initialize retry manager
     * @param {Function} onRetry - Callback to execute retry attempt
     * @param {Function} onMaxRetriesExceeded - Callback when max retries exceeded
     */
    constructor(onRetry, onMaxRetriesExceeded) {
        this.onRetry = onRetry;
        this.onMaxRetriesExceeded = onMaxRetriesExceeded;
    }

    /**
     * Schedule a retry attempt
     * @param {Error} error - The error that triggered the retry
     * @returns {boolean} True if retry was scheduled, false if max attempts exceeded
     */
    scheduleRetry(error) {
        this.retryCount++;

        if (this.retryCount < RetryManager.MAX_RETRY_ATTEMPTS) {
            const retryDelay = RetryManager.BASE_RETRY_DELAY * this.retryCount;

            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this.retryTimeout = setTimeout(() => {
                if (this.onRetry) {
                    this.onRetry();
                }
            }, retryDelay);

            return true;
        }
        // Max retries exceeded
        if (this.onMaxRetriesExceeded) {
            this.onMaxRetriesExceeded(error);
        }
        return false;
    }

    /**
     * Reset retry count (call on successful connection)
     */
    reset() {
        this.retryCount = 0;
        this.clearTimeout();
    }

    /**
     * Clear any pending retry timeout
     */
    clearTimeout() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
    }

    /**
     * Get current retry count
     * @returns {number}
     */
    getRetryCount() {
        return this.retryCount;
    }

    /**
     * Check if retry is in progress
     * @returns {boolean}
     */
    isRetrying() {
        return this.retryTimeout !== null;
    }
}
