/**
 * DevTools Bridge
 *
 * Exposes the Kanban store and its DevTools recorder to the browser console
 * via window.__KANBAN_DEVTOOLS__. This works inside LockerService/LWS because
 * we attach to the component's own window reference rather than relying on
 * a browser extension crossing the security boundary.
 *
 * Usage in Chrome DevTools console:
 *
 *   const dt = window.__KANBAN_DEVTOOLS__;
 *
 *   // Inspect current state
 *   dt.getState();
 *
 *   // View action history (compact)
 *   dt.history();
 *
 *   // View full entry with state snapshots
 *   dt.inspect(actionId);
 *
 *   // Time-travel to any action
 *   dt.jumpTo(actionId);
 *
 *   // Undo / Redo
 *   dt.undo();
 *   dt.redo();
 *
 *   // Diff a specific action
 *   dt.diff(actionId);
 *
 *   // Export full history as JSON (copy-pasteable)
 *   copy(JSON.stringify(dt.export()));
 *
 *   // Search actions by type
 *   dt.search('MOVE_CARD');
 *
 *   // Live action log (prints every new action to console)
 *   dt.startLiveLog();
 *   dt.stopLiveLog();
 *
 *   // Pause/resume recording
 *   dt.pause();
 *   dt.resume();
 *
 * @module devToolsBridge
 */

/**
 * Install the DevTools bridge on the global window object.
 * Call this once from the store when DevTools are enabled.
 *
 * @param {Object} store - The KanbanStore instance
 * @param {Object} recorder - The DevTools recorder instance
 */
export const installDevToolsBridge = (store, recorder) => {
    let liveLogUnsub = null;

    const bridge = {
        // ── State inspection ───────────────────────────────────────
        getState() {
            return store.getState();
        },

        /**
         * Pretty-print current state to console as a table.
         */
        state() {
            const s = store.getState();
            const summary = {
                columns: (s.columns || []).length,
                cards: (s.columns || []).reduce(
                    (n, c) => n + (c.cards?.length || 0),
                    0
                ),
                isDragging: s.isDragging,
                syncState: s.syncState,
                pendingOps: (s.pendingOperations || []).length,
                activeSprint: s.activeSprint?.name || null,
                backlogCards: (s.backlogCards || []).length,
                subscriptionStatus: s.subscriptionStatus,
                error: s.error
            };
            console.table(summary);
            return s;
        },

        // ── Action history ─────────────────────────────────────────
        /**
         * List all recorded actions (compact view).
         */
        history() {
            const h = recorder.getHistory();
            const formatted = h.map((e, i) => ({
                '#': i,
                id: e.id,
                type: e.type,
                undoable: e.undoable ? 'Y' : '-',
                changed: Object.keys(e.diff).join(', ') || '(none)',
                time: new Date(e.timestamp).toLocaleTimeString()
            }));
            console.table(formatted);
            return h;
        },

        /**
         * Inspect a specific action entry with full state snapshots.
         */
        inspect(actionId) {
            const entry = recorder.getFullEntry(actionId);
            if (!entry) {
                console.warn(`No action with id ${actionId}`);
                return null;
            }
            console.group(`Action #${entry.id}: ${entry.action.type}`);
            console.log('Payload:', entry.action.payload);
            console.log('State diff:', entry.diff);
            console.log('Previous state:', entry.prevState);
            console.log('Next state:', entry.nextState);
            console.log(
                'Time:',
                new Date(entry.timestamp).toLocaleTimeString()
            );
            console.groupEnd();
            return entry;
        },

        /**
         * Show only the diff for a given action.
         */
        diff(actionId) {
            const entry = recorder.getFullEntry(actionId);
            if (!entry) {
                console.warn(`No action with id ${actionId}`);
                return null;
            }
            console.group(`Diff for #${entry.id}: ${entry.action.type}`);
            Object.entries(entry.diff).forEach(([key, { prev, next }]) => {
                console.log(`  ${key}:`);
                console.log('    prev:', prev);
                console.log('    next:', next);
            });
            console.groupEnd();
            return entry.diff;
        },

        // ── Search ─────────────────────────────────────────────────
        /**
         * Search actions by type (substring match, case-insensitive).
         */
        search(query) {
            const q = query.toUpperCase();
            const results = recorder
                .getHistory()
                .filter((e) => e.type.includes(q));
            const formatted = results.map((e, i) => ({
                '#': i,
                id: e.id,
                type: e.type,
                changed: Object.keys(e.diff).join(', '),
                time: new Date(e.timestamp).toLocaleTimeString()
            }));
            console.table(formatted);
            return results;
        },

        // ── Time-travel ────────────────────────────────────────────
        /**
         * Jump to the state after a specific action was applied.
         */
        jumpTo(actionId) {
            const state = recorder.jumpTo(actionId);
            if (state) {
                store._applyState(state);
                console.log(`Jumped to action #${actionId}`);
            } else {
                console.warn(`Cannot jump to action #${actionId}`);
            }
            return state;
        },

        /**
         * Jump to a history index.
         */
        jumpToIndex(idx) {
            const state = recorder.jumpToIndex(idx);
            if (state) {
                store._applyState(state);
                console.log(`Jumped to index ${idx}`);
            }
            return state;
        },

        // ── Undo / Redo ────────────────────────────────────────────
        undo() {
            const state = recorder.undo();
            if (state) {
                store._applyState(state);
                console.log('Undo successful');
            } else {
                console.log('Nothing to undo');
            }
            return state;
        },

        redo() {
            const state = recorder.redo();
            if (state) {
                store._applyState(state);
                console.log('Redo successful');
            } else {
                console.log('Nothing to redo');
            }
            return state;
        },

        canUndo: () => recorder.canUndo(),
        canRedo: () => recorder.canRedo(),

        // ── Live logging ───────────────────────────────────────────
        startLiveLog() {
            if (liveLogUnsub) return;
            let lastCount = recorder.getEntryCount();

            liveLogUnsub = recorder.subscribe(() => {
                const count = recorder.getEntryCount();
                if (count > lastCount) {
                    const h = recorder.getHistory();
                    const latest = h[h.length - 1];
                    console.log(
                        `%c[${latest.type}]`,
                        'color: #4CAF50; font-weight: bold',
                        latest.diff
                    );
                    lastCount = count;
                }
            });
            console.log('Live action log started');
        },

        stopLiveLog() {
            if (liveLogUnsub) {
                liveLogUnsub();
                liveLogUnsub = null;
                console.log('Live action log stopped');
            }
        },

        // ── Pause/resume ───────────────────────────────────────────
        pause() {
            recorder.pause();
            console.log('DevTools recording paused');
        },
        resume() {
            recorder.resume();
            console.log('DevTools recording resumed');
        },

        // ── Export / replay ────────────────────────────────────────
        /**
         * Export history as JSON-serializable data.
         */
        export() {
            return recorder.exportHistory();
        },

        /**
         * Get replay sequence (for step-through debugging).
         */
        replay(fromId = null) {
            return recorder.getReplaySequence(fromId);
        },

        /**
         * Clear all recorded history.
         */
        clear() {
            recorder.clear();
            console.log('DevTools history cleared');
        },

        // ── Stats ──────────────────────────────────────────────────
        stats() {
            const h = recorder.getHistory();
            const typeCounts = {};
            h.forEach((e) => {
                typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
            });
            console.group('DevTools Stats');
            console.log('Total actions:', h.length);
            console.log('Cursor:', recorder.getCursor());
            console.log('Can undo:', recorder.canUndo());
            console.log('Can redo:', recorder.canRedo());
            console.log('Action breakdown:');
            console.table(typeCounts);
            console.groupEnd();
            return { total: h.length, typeCounts };
        },

        // ── Help ───────────────────────────────────────────────────
        help() {
            const cmds = [
                ['dt.state()', 'Show current state summary as table'],
                ['dt.getState()', 'Get raw state object'],
                ['dt.history()', 'List all recorded actions'],
                ['dt.inspect(id)', 'Inspect action with full state snapshots'],
                ['dt.diff(id)', 'Show state diff for an action'],
                ['dt.search("MOVE")', 'Search actions by type'],
                ['dt.jumpTo(id)', 'Time-travel to a specific action'],
                ['dt.jumpToIndex(n)', 'Time-travel to history index'],
                ['dt.undo()', 'Undo last undoable action'],
                ['dt.redo()', 'Redo next undoable action'],
                ['dt.startLiveLog()', 'Print actions as they happen'],
                ['dt.stopLiveLog()', 'Stop live logging'],
                ['dt.pause()', 'Pause recording'],
                ['dt.resume()', 'Resume recording'],
                ['dt.export()', 'Export history as JSON'],
                ['dt.replay()', 'Get replay sequence for step-through'],
                ['dt.stats()', 'Show action type breakdown'],
                ['dt.clear()', 'Clear all history'],
                ['dt.help()', 'Show this help']
            ];
            console.group('Kanban DevTools Commands');
            console.table(
                cmds.map(([cmd, desc]) => ({ command: cmd, description: desc }))
            );
            console.groupEnd();
        }
    };

    // Attach to window — this works inside LWS because we're in the
    // component's own JavaScript context (same-origin sandbox).
    // eslint-disable-next-line no-restricted-globals
    if (typeof window !== 'undefined') {
        window.__KANBAN_DEVTOOLS__ = bridge;
        console.log(
            '%c Kanban DevTools enabled — type __KANBAN_DEVTOOLS__.help() for commands',
            'background: #1a1a2e; color: #e94560; font-size: 14px; padding: 6px 12px; border-radius: 4px;'
        );
    }

    return bridge;
};
