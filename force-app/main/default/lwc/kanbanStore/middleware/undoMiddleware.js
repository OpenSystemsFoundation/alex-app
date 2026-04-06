/**
 * Undo Middleware
 *
 * Intercepts dispatched actions and, for undoable types, captures context
 * and pushes an entry to the undoManager. Placed after thunk middleware
 * so only plain action objects reach here.
 *
 * Independent of devToolsMiddleware.
 *
 * @module undoMiddleware
 */

import { getUndoableAction, isUndoable } from '../undo/undoableActions';

/**
 * Create undo middleware for the store.
 * @param {Object} undoManager - UndoManager instance
 * @returns {Function} Middleware function (store => next => action)
 */
export function createUndoMiddleware(undoManager) {
    return (store) => (next) => (action) => {
        if (!action || !action.type || undoManager.isPaused()) {
            return next(action);
        }

        if (!isUndoable(action.type)) {
            return next(action);
        }

        const def = getUndoableAction(action.type);
        const prevState = store.getState();

        // Dispatch the action first so nextState is available
        const result = next(action);

        const nextState = store.getState();
        const captured = def.captureContext(prevState, action, nextState);

        if (captured) {
            undoManager.push({
                actionType: action.type,
                description: def.describe(action, captured.reverseContext),
                reverseContext: captured.reverseContext,
                forwardContext: captured.forwardContext
            });
        }

        return result;
    };
}
