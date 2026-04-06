/**
 * UndoManager — Command-based undo/redo stack for production use.
 *
 * Each entry stores minimal context needed to construct a reverse thunk
 * that persists the undo to the server (as opposed to DevTools snapshot replay).
 *
 * @module undoManager
 */

const MAX_UNDO_ENTRIES = 10;

let _nextId = 1;

/**
 * @typedef {Object} UndoEntry
 * @property {number} id
 * @property {number} timestamp
 * @property {string} description - Human-readable: "Moved card to Done"
 * @property {string} actionType - Original action type
 * @property {Object} reverseContext - Data needed to build the reverse operation
 * @property {Object} forwardContext - Data needed to redo the operation
 * @property {boolean} stale - Whether a platform event invalidated this entry
 */

/**
 * Create a new UndoManager instance.
 * @returns {Object} UndoManager API
 */
export function createUndoManager() {
    /** @type {UndoEntry[]} */
    let _stack = [];
    /** Cursor points to the next undo-able index (top of undo portion) */
    let _cursor = 0;
    let _paused = false;
    /** @type {Set<Function>} */
    const _subscribers = new Set();
    /** Card IDs temporarily exempt from stale-marking after undo/redo */
    const _graceCardIds = new Set();

    function _notify() {
        const snapshot = { canUndo: canUndo(), canRedo: canRedo() };
        _subscribers.forEach((fn) => {
            try {
                fn(snapshot);
            } catch (e) {
                // swallow subscriber errors
            }
        });
    }

    /**
     * Push a new undo entry. Truncates redo future and enforces max limit.
     * @param {UndoEntry} entry
     */
    function push(entry) {
        if (_paused) return;

        // Truncate redo future
        _stack = _stack.slice(0, _cursor);

        const fullEntry = {
            ...entry,
            id: _nextId++,
            timestamp: Date.now(),
            stale: false
        };

        _stack.push(fullEntry);

        // Enforce max limit — discard oldest
        if (_stack.length > MAX_UNDO_ENTRIES) {
            _stack = _stack.slice(_stack.length - MAX_UNDO_ENTRIES);
        }

        _cursor = _stack.length;
        _notify();
    }

    function canUndo() {
        // Find a non-stale entry to undo
        for (let i = _cursor - 1; i >= 0; i--) {
            if (!_stack[i].stale) return true;
        }
        return false;
    }

    function canRedo() {
        for (let i = _cursor; i < _stack.length; i++) {
            if (!_stack[i].stale) return true;
        }
        return false;
    }

    /**
     * Peek at the next undo entry without popping.
     * @returns {UndoEntry|null}
     */
    function peekUndo() {
        for (let i = _cursor - 1; i >= 0; i--) {
            if (!_stack[i].stale) return _stack[i];
        }
        return null;
    }

    /**
     * Peek at the next redo entry without popping.
     * @returns {UndoEntry|null}
     */
    function peekRedo() {
        for (let i = _cursor; i < _stack.length; i++) {
            if (!_stack[i].stale) return _stack[i];
        }
        return null;
    }

    /**
     * Pop the next undo entry and shift cursor backward.
     * @returns {UndoEntry|null}
     */
    function popUndo() {
        // Walk backward to find non-stale entry
        while (_cursor > 0) {
            _cursor--;
            if (!_stack[_cursor].stale) {
                const entry = _stack[_cursor];
                _notify();
                return entry;
            }
        }
        _notify();
        return null;
    }

    /**
     * Pop the next redo entry and shift cursor forward.
     * @returns {UndoEntry|null}
     */
    function popRedo() {
        while (_cursor < _stack.length) {
            const entry = _stack[_cursor];
            _cursor++;
            if (!entry.stale) {
                _notify();
                return entry;
            }
        }
        _notify();
        return null;
    }

    /**
     * Clear the entire stack (e.g. on board reload).
     */
    function clear() {
        _stack = [];
        _cursor = 0;
        _notify();
    }

    /**
     * Subscribe to canUndo/canRedo changes.
     * @param {Function} fn - Callback receiving { canUndo, canRedo }
     * @returns {Function} Unsubscribe function
     */
    function subscribe(fn) {
        _subscribers.add(fn);
        return () => _subscribers.delete(fn);
    }

    /**
     * Suppress recording (used while executing undo/redo thunks).
     */
    function pause() {
        _paused = true;
    }

    function resume() {
        _paused = false;
    }

    /**
     * Mark entries referencing a given cardId as stale.
     * Called when a platform event from another client modifies the card.
     * Skips marking while paused (undo/redo in flight) or during the
     * grace period after an undo/redo (our own platform event echo).
     * @param {string} cardId
     */
    function markStale(cardId) {
        if (_paused) return; // Our own undo/redo in flight
        if (_graceCardIds.has(cardId)) return; // Our own echo still arriving
        let changed = false;
        _stack.forEach((entry) => {
            const rc = entry.reverseContext || {};
            const fc = entry.forwardContext || {};
            if (rc.cardId === cardId || fc.cardId === cardId) {
                entry.stale = true;
                changed = true;
            }
        });
        if (changed) _notify();
    }

    /**
     * Temporarily exempt a cardId from stale-marking (grace period for
     * platform event echoes after undo/redo). Expires after 5 seconds.
     * @param {string} cardId
     */
    function addGrace(cardId) {
        _graceCardIds.add(cardId);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => _graceCardIds.delete(cardId), 5000);
    }

    /** @returns {boolean} */
    function isPaused() {
        return _paused;
    }

    return {
        push,
        canUndo,
        canRedo,
        peekUndo,
        peekRedo,
        popUndo,
        popRedo,
        clear,
        subscribe,
        pause,
        resume,
        isPaused,
        markStale,
        addGrace
    };
}
