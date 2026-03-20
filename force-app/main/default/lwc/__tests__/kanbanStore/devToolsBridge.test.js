import { createDevToolsRecorder } from '../../kanbanStore/middleware/devToolsMiddleware';
import { installDevToolsBridge } from '../../kanbanStore/devtools/devToolsBridge';

describe('devToolsBridge', () => {
    let store;
    let recorder;
    let bridge;

    beforeEach(() => {
        recorder = createDevToolsRecorder();

        // Mock store
        let currentState = {
            columns: [
                {
                    Id: 'col1',
                    cards: [
                        { Id: 'card1', name: 'Test' },
                        { Id: 'card2', name: 'Test2' }
                    ]
                }
            ],
            isDragging: false,
            syncState: 'idle',
            pendingOperations: [],
            activeSprint: null,
            backlogCards: [],
            subscriptionStatus: 'connected',
            error: null
        };

        store = {
            getState: () => Object.freeze({ ...currentState }),
            _applyState: jest.fn((s) => {
                currentState = s;
            }),
            devTools: recorder
        };

        // Seed some history
        recorder.record(
            { type: 'SET_BOARD', payload: { Id: 'b1' } },
            { board: null },
            { board: { Id: 'b1' } }
        );
        recorder.record(
            { type: 'MOVE_CARD', payload: { cardId: 'c1' } },
            { columns: [] },
            { columns: [{ Id: 'col1' }] }
        );
        recorder.record(
            { type: 'SET_LOADING', payload: true },
            { isLoading: false },
            { isLoading: true }
        );

        // Suppress console output during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'table').mockImplementation(() => {});
        jest.spyOn(console, 'group').mockImplementation(() => {});
        jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        bridge = installDevToolsBridge(store, recorder);
    });

    afterEach(() => {
        if (bridge && bridge.destroy) {
            bridge.destroy();
        }
        jest.restoreAllMocks();
        delete window.__KANBAN_DEVTOOLS__;
        sessionStorage.removeItem('__kdt_cmd__');
    });

    describe('installation', () => {
        it('installs on window.__KANBAN_DEVTOOLS__', () => {
            expect(window.__KANBAN_DEVTOOLS__).toBe(bridge);
        });

        it('logs banner to console', () => {
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Kanban DevTools enabled'),
                expect.any(String)
            );
        });
    });

    describe('state inspection', () => {
        it('getState returns current store state', () => {
            const state = bridge.getState();
            expect(state.columns).toHaveLength(1);
        });

        it('state() prints summary table and returns state', () => {
            const state = bridge.state();
            expect(console.table).toHaveBeenCalled();
            expect(state).toHaveProperty('columns');
        });
    });

    describe('history', () => {
        it('history() prints table and returns entries', () => {
            const h = bridge.history();
            expect(h).toHaveLength(3);
            expect(console.table).toHaveBeenCalled();
        });

        it('inspect() shows full entry details', () => {
            const h = recorder.getHistory();
            const entry = bridge.inspect(h[0].id);
            expect(entry).not.toBeNull();
            expect(entry.action.type).toBe('SET_BOARD');
            expect(console.group).toHaveBeenCalled();
        });

        it('inspect() warns for non-existent id', () => {
            const result = bridge.inspect(999);
            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalled();
        });

        it('diff() shows state changes', () => {
            const h = recorder.getHistory();
            const diff = bridge.diff(h[0].id);
            expect(diff).toHaveProperty('board');
        });

        it('diff() warns for non-existent id', () => {
            const result = bridge.diff(999);
            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe('search', () => {
        it('filters actions by type', () => {
            const results = bridge.search('MOVE');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('MOVE_CARD');
        });

        it('returns empty for no matches', () => {
            const results = bridge.search('NONEXISTENT');
            expect(results).toHaveLength(0);
        });
    });

    describe('time-travel', () => {
        it('jumpTo applies state to store', () => {
            const h = recorder.getHistory();
            bridge.jumpTo(h[0].id);
            expect(store._applyState).toHaveBeenCalledWith(
                expect.objectContaining({ board: { Id: 'b1' } })
            );
        });

        it('jumpTo warns for invalid id', () => {
            bridge.jumpTo(999);
            expect(console.warn).toHaveBeenCalled();
            expect(store._applyState).not.toHaveBeenCalled();
        });

        it('jumpToIndex applies state to store', () => {
            bridge.jumpToIndex(1);
            expect(store._applyState).toHaveBeenCalled();
        });
    });

    describe('undo / redo', () => {
        it('undo applies previous state', () => {
            const state = bridge.undo();
            expect(state).not.toBeNull();
            expect(store._applyState).toHaveBeenCalled();
        });

        it('undo logs when nothing to undo', () => {
            // Undo all undoable actions first
            bridge.undo(); // MOVE_CARD
            bridge.undo(); // SET_BOARD
            store._applyState.mockClear();
            console.log.mockClear();

            bridge.undo();
            expect(console.log).toHaveBeenCalledWith('Nothing to undo');
        });

        it('redo applies next state after undo', () => {
            bridge.undo();
            store._applyState.mockClear();
            const state = bridge.redo();
            expect(state).not.toBeNull();
            expect(store._applyState).toHaveBeenCalled();
        });

        it('redo logs when nothing to redo', () => {
            console.log.mockClear();
            bridge.redo();
            expect(console.log).toHaveBeenCalledWith('Nothing to redo');
        });

        it('canUndo / canRedo reflect state', () => {
            expect(bridge.canUndo()).toBe(true);
            expect(bridge.canRedo()).toBe(false);
        });
    });

    describe('live logging', () => {
        it('startLiveLog logs new actions', () => {
            bridge.startLiveLog();
            console.log.mockClear();

            recorder.record(
                { type: 'NEW_ACTION', payload: null },
                { v: 0 },
                { v: 1 }
            );

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[NEW_ACTION]'),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('startLiveLog is idempotent', () => {
            bridge.startLiveLog();
            bridge.startLiveLog(); // should not double-subscribe
            console.log.mockClear();

            recorder.record({ type: 'X' }, {}, {});
            // Should only log once (not twice)
            const actionLogs = console.log.mock.calls.filter(
                (c) => typeof c[0] === 'string' && c[0].includes('[X]')
            );
            expect(actionLogs).toHaveLength(1);
        });

        it('stopLiveLog stops logging', () => {
            bridge.startLiveLog();
            bridge.stopLiveLog();
            console.log.mockClear();

            recorder.record({ type: 'X' }, {}, {});
            const actionLogs = console.log.mock.calls.filter(
                (c) => typeof c[0] === 'string' && c[0].includes('[X]')
            );
            expect(actionLogs).toHaveLength(0);
        });

        it('stopLiveLog is safe when not started', () => {
            expect(() => bridge.stopLiveLog()).not.toThrow();
        });
    });

    describe('pause / resume', () => {
        it('pause stops recording', () => {
            bridge.pause();
            expect(console.log).toHaveBeenCalledWith(
                'DevTools recording paused'
            );
        });

        it('resume restarts recording', () => {
            bridge.resume();
            expect(console.log).toHaveBeenCalledWith(
                'DevTools recording resumed'
            );
        });
    });

    describe('export / replay', () => {
        it('export returns serializable data', () => {
            const data = bridge.export();
            expect(data).toHaveLength(3);
            expect(JSON.stringify(data)).toBeTruthy();
        });

        it('replay returns action/state pairs', () => {
            const seq = bridge.replay();
            expect(seq).toHaveLength(3);
            expect(seq[0]).toHaveProperty('action');
            expect(seq[0]).toHaveProperty('state');
        });

        it('replay from specific id', () => {
            const h = recorder.getHistory();
            const seq = bridge.replay(h[1].id);
            expect(seq).toHaveLength(2);
        });
    });

    describe('clear', () => {
        it('clears all history', () => {
            bridge.clear();
            expect(recorder.getHistory()).toHaveLength(0);
        });
    });

    describe('stats', () => {
        it('prints action breakdown', () => {
            const result = bridge.stats();
            expect(result.total).toBe(3);
            expect(result.typeCounts).toHaveProperty('SET_BOARD');
            expect(console.table).toHaveBeenCalled();
        });
    });

    describe('help', () => {
        it('prints command list', () => {
            bridge.help();
            expect(console.group).toHaveBeenCalledWith(
                'Kanban DevTools Commands'
            );
        });
    });

    describe('destroy', () => {
        it('cleans up window reference', () => {
            bridge.destroy();
            expect(window.__KANBAN_DEVTOOLS__).toBeUndefined();
        });

        it('stops live log on destroy', () => {
            bridge.startLiveLog();
            bridge.destroy();
            console.log.mockClear();
            recorder.record({ type: 'X' }, {}, {});
            const actionLogs = console.log.mock.calls.filter(
                (c) => typeof c[0] === 'string' && c[0].includes('[X]')
            );
            expect(actionLogs).toHaveLength(0);
        });
    });

    describe('sessionStorage command queue', () => {
        it('executes command from sessionStorage on recorder event', () => {
            sessionStorage.setItem('__kdt_cmd__', 'stats');
            // Trigger by recording a new action
            recorder.record({ type: 'TRIGGER' }, {}, {});
            // stats should have been called
            expect(console.group).toHaveBeenCalledWith(
                expect.stringContaining('DevTools command: stats')
            );
        });

        it('executes inspect command with argument', () => {
            const h = recorder.getHistory();
            sessionStorage.setItem('__kdt_cmd__', `inspect:${h[0].id}`);
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.group).toHaveBeenCalledWith(
                expect.stringContaining('inspect')
            );
        });

        it('executes undo command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'undo');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(store._applyState).toHaveBeenCalled();
        });

        it('executes redo command via storage event', () => {
            bridge.undo(); // undo something first
            store._applyState.mockClear();
            // Use the storage event handler to trigger drain without recording
            // (recording would fork the timeline and destroy redo history)
            sessionStorage.setItem('__kdt_cmd__', 'redo');
            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: '__kdt_cmd__',
                    newValue: 'redo'
                })
            );
            expect(store._applyState).toHaveBeenCalled();
        });

        it('executes search command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'search:MOVE');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.group).toHaveBeenCalledWith(
                expect.stringContaining('search:MOVE')
            );
        });

        it('executes export command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'export');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('"type"')
            );
        });

        it('executes clear command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'clear');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            // History should be cleared (only TRIGGER remains if recorded after clear)
            expect(console.log).toHaveBeenCalledWith(
                'DevTools history cleared'
            );
        });

        it('executes help command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'help');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.group).toHaveBeenCalledWith(
                'Kanban DevTools Commands'
            );
        });

        it('executes diff command', () => {
            const h = recorder.getHistory();
            sessionStorage.setItem('__kdt_cmd__', `diff:${h[0].id}`);
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.group).toHaveBeenCalledWith(
                expect.stringContaining('Diff')
            );
        });

        it('executes jumpto command', () => {
            const h = recorder.getHistory();
            sessionStorage.setItem('__kdt_cmd__', `jumpto:${h[0].id}`);
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(store._applyState).toHaveBeenCalled();
        });

        it('executes state command', () => {
            console.table.mockClear();
            sessionStorage.setItem('__kdt_cmd__', 'state');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.table).toHaveBeenCalled();
        });

        it('executes history command', () => {
            console.table.mockClear();
            sessionStorage.setItem('__kdt_cmd__', 'history');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.table).toHaveBeenCalled();
        });

        it('executes livelog command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'livelog');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.log).toHaveBeenCalledWith('Live action log started');
        });

        it('executes stoplive command', () => {
            bridge.startLiveLog();
            sessionStorage.setItem('__kdt_cmd__', 'stoplive');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.log).toHaveBeenCalledWith('Live action log stopped');
        });

        it('executes pause command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'pause');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.log).toHaveBeenCalledWith(
                'DevTools recording paused'
            );
        });

        it('executes resume command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'resume');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.log).toHaveBeenCalledWith(
                'DevTools recording resumed'
            );
        });

        it('warns for unknown command', () => {
            sessionStorage.setItem('__kdt_cmd__', 'bogus');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Unknown command')
            );
        });

        it('removes command from sessionStorage after execution', () => {
            sessionStorage.setItem('__kdt_cmd__', 'stats');
            recorder.record({ type: 'TRIGGER' }, {}, {});
            expect(sessionStorage.getItem('__kdt_cmd__')).toBeNull();
        });

        it('ignores empty sessionStorage', () => {
            // No command set — should not throw
            expect(() => {
                recorder.record({ type: 'TRIGGER' }, {}, {});
            }).not.toThrow();
        });
    });
});
