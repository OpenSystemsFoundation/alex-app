/**
 * Logging Middleware
 *
 * Logs all actions and state changes for debugging purposes.
 * Only active in development mode.
 *
 * @module loggingMiddleware
 */

/**
 * Create logging middleware
 * @param {boolean} enabled - Whether logging is enabled
 * @returns {Function} Middleware function
 */
export const createLoggingMiddleware = (enabled = false) => {
    return (store) => (next) => (action) => {
        if (!enabled) {
            return next(action);
        }

        console.group(`Action: ${action?.type || 'THUNK'}`);
        console.log('Previous State:', store.getState());
        console.log('Action:', action);

        const result = next(action);

        console.log('Next State:', store.getState());
        console.groupEnd();

        return result;
    };
};
