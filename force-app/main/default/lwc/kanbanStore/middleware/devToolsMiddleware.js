/**
 * DevTools Middleware
 *
 * Records every dispatched action with before/after state snapshots.
 * Provides time-travel debugging, undo/redo, action replay, and
 * state diff computation — all inside the Salesforce LockerService sandbox.
 *
 * @module devToolsMiddleware
 */

const MAX_HISTORY = 200;

/**
 * Compute a shallow diff between two state objects.
 * Returns an object whose keys map to { prev, next } for every changed path.
 */
const computeStateDiff = (prev, next) => {
    const diff = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    allKeys.forEach((key) => {
        const prevVal = prev[key];
        const nextVal = next[key];

        if (prevVal === nextVal) return;

        // For arrays, compare by length + JSON equality (fast enough for debugging)
        if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
            if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) return;
        }

        diff[key] = { prev: prevVal, next: nextVal };
    });

    return diff;
};

/**
 * Action types that are too noisy for undo/redo (drag positions, loading flags).
 * They are still recorded in history for inspection but skipped by undo.
 */
const TRANSIENT_ACTIONS = new Set([
    'UPDATE_DRAG_POSITION',
    'SET_LOADING',
    'START_OPERATION',
    'COMPLETE_OPERATION',
    'FAIL_OPERATION',
    'SET_SYNC_STATE',
    'SET_SUBSCRIPTION_STATUS',
    'POLLING_UPDATE_DETECTED'
]);

/**
 * Create the DevTools recorder.
 * This is NOT a middleware itself — it is a standalone object that the
 * devtools middleware writes to. This separation lets the Chrome bridge
 * access the recorder without coupling to the middleware chain.
 */
export const createDevToolsRecorder = () => {
    const history = []; // Array<{ id, action, prevState, nextState, diff, timestamp }>
    let cursor = -1; // points to current position (for time-travel)
    let idCounter = 0;
    let paused = false;
    const listeners = new Set();

    const notify = () => {
        listeners.forEach((fn) => {
            try {
                fn();
            } catch (_e) {
                /* subscriber errors must not break the store */
            }
        });
    };

    const recorder = {
        // ── Recording ──────────────────────────────────────────────
        record(action, prevState, nextState) {
            if (paused) return;

            // If we time-travelled backwards and then dispatch a new action,
            // discard the "future" entries (fork the timeline).
            if (cursor < history.length - 1) {
                history.splice(cursor + 1);
            }

            const entry = {
                id: ++idCounter,
                action: { type: action.type, payload: action.payload },
                prevState,
                nextState,
                diff: computeStateDiff(prevState, nextState),
                timestamp: Date.now(),
                undoable: !TRANSIENT_ACTIONS.has(action.type)
            };

            history.push(entry);

            // Trim oldest entries when limit is reached
            if (history.length > MAX_HISTORY) {
                history.shift();
            }

            cursor = history.length - 1;
            notify();
        },

        // ── History access ─────────────────────────────────────────
        getHistory() {
            return history.map((e) => ({
                id: e.id,
                type: e.action.type,
                payload: e.action.payload,
                diff: e.diff,
                timestamp: e.timestamp,
                undoable: e.undoable
            }));
        },

        getFullEntry(id) {
            return history.find((e) => e.id === id) || null;
        },

        getEntryCount() {
            return history.length;
        },

        getCursor() {
            return cursor;
        },

        // ── Time-travel ────────────────────────────────────────────
        /**
         * Jump to a specific history entry. Returns the state at that point.
         * The store must apply this state externally.
         */
        jumpTo(id) {
            const idx = history.findIndex((e) => e.id === id);
            if (idx === -1) return null;
            cursor = idx;
            notify();
            return history[idx].nextState;
        },

        jumpToIndex(idx) {
            if (idx < 0 || idx >= history.length) return null;
            cursor = idx;
            notify();
            return history[idx].nextState;
        },

        // ── Undo / Redo ────────────────────────────────────────────
        canUndo() {
            // Walk backwards from cursor to find an undoable entry
            for (let i = cursor; i >= 0; i--) {
                if (history[i].undoable) return true;
            }
            return false;
        },

        canRedo() {
            for (let i = cursor + 1; i < history.length; i++) {
                if (history[i].undoable) return true;
            }
            return false;
        },

        /**
         * Undo: returns the prevState of the last undoable action at or
         * before the cursor, and moves cursor backwards.
         */
        undo() {
            for (let i = cursor; i >= 0; i--) {
                if (history[i].undoable) {
                    cursor = i - 1;
                    notify();
                    return history[i].prevState;
                }
            }
            return null;
        },

        /**
         * Redo: returns the nextState of the first undoable action after cursor.
         */
        redo() {
            for (let i = cursor + 1; i < history.length; i++) {
                if (history[i].undoable) {
                    cursor = i;
                    notify();
                    return history[i].nextState;
                }
            }
            return null;
        },

        // ── Utilities ──────────────────────────────────────────────
        clear() {
            history.length = 0;
            cursor = -1;
            idCounter = 0;
            notify();
        },

        pause() {
            paused = true;
        },
        resume() {
            paused = false;
        },
        isPaused() {
            return paused;
        },

        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        /**
         * Export history as a JSON-serializable array (for copy/paste debugging).
         */
        exportHistory() {
            return history.map((e) => ({
                id: e.id,
                action: e.action,
                diff: e.diff,
                timestamp: e.timestamp,
                undoable: e.undoable
            }));
        },

        /**
         * Replay: returns an array of { action, state } pairs from the start
         * (or from a given entry id) so you can step through them.
         */
        getReplaySequence(fromId = null) {
            let startIdx = 0;
            if (fromId !== null) {
                startIdx = history.findIndex((e) => e.id === fromId);
                if (startIdx === -1) startIdx = 0;
            }
            return history.slice(startIdx).map((e) => ({
                action: e.action,
                state: e.nextState
            }));
        }
    };

    return recorder;
};

/**
 * Create devtools middleware (plugs into the store middleware chain).
 * Requires a recorder instance created via createDevToolsRecorder().
 */
export const createDevToolsMiddleware = (recorder) => {
    return (store) => (next) => (action) => {
        // Only record plain action objects (thunks are functions)
        if (typeof action === 'function' || !action?.type) {
            return next(action);
        }

        const prevState = store.getState();
        const result = next(action);
        const nextState = store.getState();

        recorder.record(action, prevState, nextState);

        return result;
    };
};
