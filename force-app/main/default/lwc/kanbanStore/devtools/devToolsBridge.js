/**
 * DevTools Bridge
 *
 * Exposes the Kanban store and its DevTools recorder to the browser
 * console for debugging. Uses multiple strategies to cross the
 * LockerService / LWS security boundary:
 *
 * 1. window.__KANBAN_DEVTOOLS__  (works in LWS — the default for new orgs)
 * 2. DOM command queue           (works in LockerService AND LWS)
 *    → Write a command to sessionStorage, the bridge polls and executes it,
 *      printing results to the real browser console.
 *
 * === Quick-start (LWS — most scratch orgs & new orgs) ===
 *
 *   const dt = __KANBAN_DEVTOOLS__;
 *   dt.help();
 *
 * === Quick-start (LockerService fallback) ===
 *
 *   // Paste this one-liner in Chrome console to send commands:
 *   sessionStorage.setItem('__kdt_cmd__', 'history');
 *   // Result prints to console within ~500ms.
 *   //
 *   // Supported commands: state, history, stats, undo, redo,
 *   //   inspect:ID, diff:ID, jumpTo:ID, search:QUERY, export, clear, help
 *
 * === Programmatic access (always works) ===
 *
 *   // From any LWC that has the store reference:
 *   store.devTools.undo();
 *   store.devTools.getHistory();
 *
 * @module devToolsBridge
 */

const CMD_STORAGE_KEY = '__kdt_cmd__';

/**
 * Install the DevTools bridge.
 * Call this once from the store when DevTools are enabled.
 *
 * @param {Object} store - The KanbanStore instance
 * @param {Object} recorder - The DevTools recorder instance
 * @returns {Object} The bridge API
 */
export const installDevToolsBridge = (store, recorder) => {
    let liveLogUnsub = null;
    let cmdRecorderUnsub = null;
    let storageHandler = null;

    const bridge = {
        // ── State inspection ───────────────────────────────────────
        getState() {
            return store.getState();
        },

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

        diff(actionId) {
            const entry = recorder.getFullEntry(actionId);
            if (!entry) {
                console.warn(`No action with id ${actionId}`);
                return null;
            }
            console.group(`Diff for #${entry.id}: ${entry.action.type}`);
            Object.entries(entry.diff).forEach(([key, val]) => {
                console.log(`  ${key}:`);
                console.log('    prev:', val.prev);
                console.log('    next:', val.next);
            });
            console.groupEnd();
            return entry.diff;
        },

        // ── Search ─────────────────────────────────────────────────
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
        export() {
            return recorder.exportHistory();
        },

        replay(fromId = null) {
            return recorder.getReplaySequence(fromId);
        },

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
            console.log(
                '\nLockerService fallback — paste in console:\n' +
                    "  sessionStorage.setItem('__kdt_cmd__', 'history');\n" +
                    '  // Commands: state, history, stats, undo, redo,\n' +
                    '  //   inspect:ID, diff:ID, jumpTo:ID, search:QUERY, export, clear, help'
            );
        },

        /**
         * Destroy the bridge (stop polling, remove global reference).
         */
        destroy() {
            if (cmdRecorderUnsub) {
                cmdRecorderUnsub();
                cmdRecorderUnsub = null;
            }
            if (storageHandler && typeof window !== 'undefined') {
                try {
                    window.removeEventListener('storage', storageHandler);
                } catch (_e) {
                    /* ignore */
                }
                storageHandler = null;
            }
            bridge.stopLiveLog();
            try {
                if (typeof window !== 'undefined') {
                    delete window.__KANBAN_DEVTOOLS__;
                }
            } catch (_e) {
                /* LockerService may block delete on SecureWindow */
            }
        }
    };

    // ── Strategy 1: Direct window assignment (works in LWS) ─────────
    try {
        if (typeof window !== 'undefined') {
            window.__KANBAN_DEVTOOLS__ = bridge;
        }
    } catch (_e) {
        /* LockerService SecureWindow may reject the assignment */
    }

    // ── Strategy 2: sessionStorage command queue (LockerService safe) ─
    // The browser console and LWC code share the same sessionStorage
    // origin, so this crosses the LockerService boundary reliably.
    // We check for pending commands on two triggers:
    //   a) Every store dispatch (via recorder subscription)
    //   b) The 'storage' event (fires when sessionStorage is written
    //      from another browsing context — in LockerService the console
    //      qualifies as a separate context for this event)
    const drainCommandQueue = () => {
        try {
            if (typeof sessionStorage === 'undefined') return;
            const raw = sessionStorage.getItem(CMD_STORAGE_KEY);
            if (!raw) return;
            sessionStorage.removeItem(CMD_STORAGE_KEY);
            executeCommand(bridge, raw);
        } catch (_e) {
            /* silently ignore */
        }
    };

    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(CMD_STORAGE_KEY);

            // Check on every dispatched action
            cmdRecorderUnsub = recorder.subscribe(drainCommandQueue);

            // Check when sessionStorage changes (covers idle state)
            if (typeof window !== 'undefined' && window.addEventListener) {
                storageHandler = (event) => {
                    if (event.key === CMD_STORAGE_KEY && event.newValue) {
                        drainCommandQueue();
                    }
                };
                window.addEventListener('storage', storageHandler);
            }
        }
    } catch (_e) {
        /* sessionStorage unavailable — skip command queue */
    }

    // ── Announce ─────────────────────────────────────────────────────
    console.log(
        '%c Kanban DevTools enabled ',
        'background: #1a1a2e; color: #e94560; font-size: 14px; padding: 6px 12px; border-radius: 4px;'
    );
    console.log(
        'Try: __KANBAN_DEVTOOLS__.help()  |  ' +
            "LockerService fallback: sessionStorage.setItem('__kdt_cmd__', 'help')"
    );

    return bridge;
};

/**
 * Parse and execute a command string from the sessionStorage queue.
 * Commands are simple strings like "history", "undo", "inspect:42",
 * "search:MOVE_CARD".
 */
function executeCommand(bridge, raw) {
    const trimmed = raw.trim();
    const colonIdx = trimmed.indexOf(':');
    const cmd = colonIdx > -1 ? trimmed.slice(0, colonIdx) : trimmed;
    const arg = colonIdx > -1 ? trimmed.slice(colonIdx + 1).trim() : null;

    console.group(`DevTools command: ${trimmed}`);

    try {
        switch (cmd.toLowerCase()) {
            case 'state':
                bridge.state();
                break;
            case 'history':
                bridge.history();
                break;
            case 'stats':
                bridge.stats();
                break;
            case 'undo':
                bridge.undo();
                break;
            case 'redo':
                bridge.redo();
                break;
            case 'inspect':
                bridge.inspect(Number(arg));
                break;
            case 'diff':
                bridge.diff(Number(arg));
                break;
            case 'jumpto':
                bridge.jumpTo(Number(arg));
                break;
            case 'search':
                bridge.search(arg || '');
                break;
            case 'export':
                console.log(JSON.stringify(bridge.export(), null, 2));
                break;
            case 'clear':
                bridge.clear();
                break;
            case 'livelog':
                bridge.startLiveLog();
                break;
            case 'stoplive':
                bridge.stopLiveLog();
                break;
            case 'pause':
                bridge.pause();
                break;
            case 'resume':
                bridge.resume();
                break;
            case 'help':
                bridge.help();
                break;
            default:
                console.warn(`Unknown command: ${cmd}`);
        }
    } catch (err) {
        console.error(`Command "${trimmed}" failed:`, err);
    }

    console.groupEnd();
}
