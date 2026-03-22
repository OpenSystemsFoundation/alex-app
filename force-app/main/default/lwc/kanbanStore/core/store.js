/**
 * Redux Store Implementation
 *
 * The store holds the application state and provides methods to:
 * - Get the current state
 * - Dispatch actions to update state
 * - Subscribe to state changes
 * - Apply middleware for extensibility
 *
 * @module store
 */

import { rootReducer, initialState } from '../state/reducers';
import * as selectors from '../state/selectors';
import { createThunkMiddleware } from '../middleware/thunkMiddleware';
import { createLoggingMiddleware } from '../middleware/loggingMiddleware';
import { createUndoMiddleware } from '../middleware/undoMiddleware';
import {
    createDevToolsRecorder,
    createDevToolsMiddleware
} from '../middleware/devToolsMiddleware';
import { installDevToolsBridge } from '../devtools/devToolsBridge';
import { createUndoManager } from '../undo/undoManager';
import { getUndoableAction } from '../undo/undoableActions';

/**
 * KanbanStore class - Redux-style store implementation with middleware
 */
class KanbanStore {
    constructor(middlewares = []) {
        this._state = { ...initialState };
        this._subscribers = new Set();
        this._lastDragPosition = null;
        this._middlewares = middlewares;
        this._dispatchChain = this._buildDispatchChain();
    }

    /**
     * Get current state (immutable)
     * @returns {Object} Frozen state object
     */
    getState() {
        return Object.freeze({ ...this._state });
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Called when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    /**
     * Notify all subscribers of state change
     * @private
     */
    _notifySubscribers() {
        const state = this.getState();
        this._subscribers.forEach((callback) => {
            try {
                callback(state);
            } catch (error) {
                console.error('Store subscriber error:', error);
            }
        });
    }

    /**
     * Build middleware dispatch chain
     * @private
     */
    _buildDispatchChain() {
        const baseDispatch = this._baseDispatch.bind(this);

        // Build chain from right to left
        return this._middlewares.reduceRight(
            (next, middleware) => middleware(this)(next),
            baseDispatch
        );
    }

    /**
     * Base dispatch (no middleware)
     * @private
     */
    _baseDispatch(action) {
        if (!action || !action.type) {
            return;
        }

        const result = rootReducer(this._state, action, this._lastDragPosition);
        this._state = result.state;
        this._lastDragPosition = result.lastDragPosition;

        this._notifySubscribers();
    }

    /**
     * Dispatch action to update state (with middleware support)
     * @param {Object|Function} action - Action object or thunk function
     */
    dispatch(action) {
        return this._dispatchChain(action);
    }

    // ===================================================================
    // Selector Methods - Convenient accessors using selectors
    // ===================================================================

    /**
     * Get columns (returns drag preview during drag operations)
     * @returns {Array} Columns array
     */
    getColumns() {
        return selectors.getColumns(this._state);
    }

    /**
     * Get board object
     * @returns {Object|null} Board object or null
     */
    getBoard() {
        return selectors.getBoard(this._state);
    }

    /**
     * Get board ID
     * @returns {string|null} Board ID or null
     */
    getBoardId() {
        return selectors.getBoardId(this._state);
    }

    /**
     * Find a card by ID
     * @param {string} cardId - Card ID
     * @returns {Object|null} Card object or null
     */
    findCard(cardId) {
        return selectors.findCard(this._state, cardId);
    }

    /**
     * Find a column by ID
     * @param {string} columnId - Column ID
     * @returns {Object|null} Column object or null
     */
    findColumn(columnId) {
        return selectors.findColumn(this._state, columnId);
    }

    /**
     * Get all cards in a column
     * @param {string} columnId - Column ID
     * @returns {Array} Array of cards
     */
    getCardsByColumn(columnId) {
        return selectors.getCardsByColumn(this._state, columnId);
    }

    /**
     * Check if currently dragging
     * @returns {boolean} True if drag in progress
     */
    isDragging() {
        return selectors.isDragging(this._state);
    }

    /**
     * Get drag source
     * @returns {Object|null} Drag source or null
     */
    getDragSource() {
        return selectors.getDragSource(this._state);
    }

    /**
     * Get total card count
     * @returns {number} Total cards across all columns
     */
    getTotalCardCount() {
        return selectors.getTotalCardCount(this._state);
    }

    /**
     * Get column count
     * @returns {number} Number of columns
     */
    getColumnCount() {
        return selectors.getColumnCount(this._state);
    }

    /**
     * Reset store to initial state
     */
    reset() {
        this._state = { ...initialState };
        this._lastDragPosition = null;
        if (this.undoManager) {
            this.undoManager.clear();
        }
        this._notifySubscribers();
    }

    /**
     * Execute an undo operation — pops the undo stack, builds a reverse thunk,
     * and dispatches it through the store (with undo recording paused).
     * @returns {Promise<boolean>} true if undo succeeded
     */
    async performUndo() {
        if (!this.undoManager || !this.undoManager.canUndo()) return false;

        const entry = this.undoManager.popUndo();
        if (!entry) return false;

        if (entry.stale) return false;

        const def = getUndoableAction(entry.actionType);
        if (!def) return false;

        const thunk = def.buildReverseThunk(entry.reverseContext, this);

        this.undoManager.pause();
        try {
            await this.dispatch(thunk);
            return true;
        } finally {
            this.undoManager.resume();
        }
    }

    /**
     * Execute a redo operation — pops the redo stack, builds a forward thunk,
     * and dispatches it through the store (with undo recording paused).
     * @returns {Promise<boolean>} true if redo succeeded
     */
    async performRedo() {
        if (!this.undoManager || !this.undoManager.canRedo()) return false;

        const entry = this.undoManager.popRedo();
        if (!entry) return false;

        if (entry.stale) return false;

        const def = getUndoableAction(entry.actionType);
        if (!def) return false;

        const thunk = def.buildForwardThunk(entry.forwardContext, this);

        this.undoManager.pause();
        try {
            await this.dispatch(thunk);
            return true;
        } finally {
            this.undoManager.resume();
        }
    }

    /**
     * Hot-plug DevTools into an already-running store.
     * Called when the EnableDevTools__c custom setting is true.
     * Rebuilds the middleware chain to include the recorder,
     * installs the Chrome console bridge, and exposes _applyState
     * for time-travel. Safe to call multiple times (no-ops after first).
     */
    enableDevTools() {
        if (this.devTools) return; // already enabled

        const recorder = createDevToolsRecorder();
        this.devTools = recorder;

        // Rebuild middleware chain with devtools inserted
        this._middlewares.push(createDevToolsMiddleware(recorder));
        this._dispatchChain = this._buildDispatchChain();

        // Install Chrome console bridge
        installDevToolsBridge(this, recorder);
    }

    /**
     * Apply a state snapshot directly (used by time-travel / undo / redo).
     * Only functional when DevTools are enabled.
     * @param {Object} state - State snapshot to apply
     */
    _applyState(state) {
        if (!this.devTools) return; // no-op when devtools disabled
        this._state = {
            ...state,
            // Reset transient sync state so UI doesn't show stale
            // "saving" indicators after time-travel / undo / redo.
            pendingOperations: [],
            syncState: 'idle',
            isDragging: false,
            dragState: null,
            dragSource: null
        };
        this._lastDragPosition = null;
        this._notifySubscribers();
    }
}

/**
 * Create a new store instance with middleware.
 * DevTools are OFF by default — call store.enableDevTools() when
 * the EnableDevTools__c custom setting is true.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableLogging - Enable action logging
 * @returns {KanbanStore} New store instance
 */
export const createStore = (options = {}) => {
    const undoManager = createUndoManager();
    const middlewares = [];

    // Add thunk middleware (always enabled — must be first to intercept functions)
    middlewares.push(createThunkMiddleware);

    // Add undo middleware (always enabled — after thunk so only plain actions reach it)
    middlewares.push(createUndoMiddleware(undoManager));

    // Add logging middleware (optional)
    if (options.enableLogging) {
        middlewares.push(createLoggingMiddleware(true));
    }

    const store = new KanbanStore(middlewares);

    // Attach undoManager to the store for public access
    store.undoManager = undoManager;

    // devTools starts as null — enabled later via store.enableDevTools()
    store.devTools = null;

    return store;
};

export { KanbanStore };
