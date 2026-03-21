/**
 * Thunk Middleware
 *
 * Enables dispatching functions (thunks) instead of action objects.
 * Thunks receive dispatch and getState, allowing async operations
 * and conditional dispatching.
 *
 * @module thunkMiddleware
 */

/**
 * Create thunk middleware for the store
 * @param {Object} store - Store instance
 * @returns {Function} Middleware function
 */
export const createThunkMiddleware = (store) => {
    return (next) => (action) => {
        // If action is a function, call it with dispatch and getState
        if (typeof action === 'function') {
            return action(
                store.dispatch.bind(store),
                store.getState.bind(store)
            );
        }

        // Otherwise, pass the action to the next middleware/reducer
        return next(action);
    };
};
