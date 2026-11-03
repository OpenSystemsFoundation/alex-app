/**
 * Unit tests for devToolsBridge — console API, window global, and the
 * DOM custom-event command bridge (`__kdt_exec__`).
 */
import { installDevToolsBridge } from '../../devtools/devToolsBridge';
import { createDevToolsRecorder } from '../../middleware/devToolsMiddleware';

const CMD_EVENT = '__kdt_exec__';

const sendCommand = (detail) =>
    document.dispatchEvent(new CustomEvent(CMD_EVENT, { detail }));

function createFakeStore(state = {}) {
    return {
        state,
        getState: jest.fn(function getState() {
            return this.state;
        }),
        _applyState: jest.fn()
    };
}

describe('devToolsBridge', () => {
    let logSpy;
    let warnSpy;
    let errorSpy;
    let tableSpy;
    let groupSpy;
    let groupEndSpy;
    let bridge;
    let store;
    let recorder;

    beforeEach(() => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
        groupSpy = jest.spyOn(console, 'group').mockImplementation(() => {});
        groupEndSpy = jest
            .spyOn(console, 'groupEnd')
            .mockImplementation(() => {});

        store = createFakeStore({
            columns: [
                { Id: 'c1', cards: [{ Id: 'a' }, { Id: 'b' }] },
                { Id: 'c2' }
            ],
            isDragging: false,
            syncState: 'idle',
            pendingOperations: [{ id: 1 }],
            activeSprint: { name: 'SP-1' },
            backlogCards: [{ Id: 'x' }],
            subscriptionStatus: 'connected',
            error: null
        });
        recorder = createDevToolsRecorder();
        bridge = installDevToolsBridge(store, recorder);
    });

    afterEach(() => {
        if (bridge) bridge.destroy();
        bridge = null;
        jest.restoreAllMocks();
    });

    const recordSample = () => {
        recorder.record(
            { type: 'SET_BOARD', payload: { Id: 'b1' } },
            { board: null },
            { board: { Id: 'b1' } }
        );
        const unchanged = { board: { Id: 'b1' } };
        recorder.record(
            { type: 'SET_LOADING', payload: true },
            unchanged,
            unchanged
        );
        recorder.record(
            { type: 'MOVE_CARD', payload: { cardId: 'a' } },
            { v: 1 },
            { v: 2 }
        );
    };

    describe('installation', () => {
        it('exposes the bridge on window and announces itself', () => {
            expect(window.__KANBAN_DEVTOOLS__).toBe(bridge);
            expect(logSpy).toHaveBeenCalledWith(
                '%c Kanban DevTools enabled ',
                expect.any(String)
            );
            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining('__kdt_exec__')
            );
        });

        it('destroy removes the window global and the DOM listener', () => {
            const removeSpy = jest.spyOn(document, 'removeEventListener');
            bridge.destroy();

            expect(window.__KANBAN_DEVTOOLS__).toBeUndefined();
            expect(removeSpy).toHaveBeenCalledWith(
                CMD_EVENT,
                expect.any(Function)
            );

            tableSpy.mockClear();
            sendCommand('history');
            expect(tableSpy).not.toHaveBeenCalled();

            // second destroy is a safe no-op for the listener
            removeSpy.mockClear();
            bridge.destroy();
            expect(removeSpy).not.toHaveBeenCalled();
            bridge = null;
        });

        it('skips the DOM bridge when addEventListener throws', () => {
            bridge.destroy();
            jest.spyOn(document, 'addEventListener').mockImplementation(() => {
                throw new Error('no DOM');
            });

            bridge = installDevToolsBridge(store, recorder);

            expect(bridge.getState()).toBe(store.state);
            const removeSpy = jest.spyOn(document, 'removeEventListener');
            bridge.destroy();
            // handler was assigned before addEventListener threw
            expect(removeSpy).toHaveBeenCalled();
            bridge = null;
        });

        it('ignores removeEventListener failures on destroy', () => {
            bridge.destroy();
            const addSpy = jest.spyOn(document, 'addEventListener');
            bridge = installDevToolsBridge(store, recorder);
            const handler = addSpy.mock.calls.find(
                ([type]) => type === CMD_EVENT
            )[1];
            const removeSpy = jest
                .spyOn(document, 'removeEventListener')
                .mockImplementation(() => {
                    throw new Error('blocked');
                });

            expect(() => bridge.destroy()).not.toThrow();
            expect(window.__KANBAN_DEVTOOLS__).toBeUndefined();
            bridge = null;

            // clean up the listener that could not be removed
            removeSpy.mockRestore();
            document.removeEventListener(CMD_EVENT, handler);
        });
    });

    describe('state inspection', () => {
        it('getState returns the raw store state', () => {
            expect(bridge.getState()).toBe(store.state);
        });

        it('state prints a summary table and returns state', () => {
            const result = bridge.state();
            expect(result).toBe(store.state);
            expect(tableSpy).toHaveBeenCalledWith({
                columns: 2,
                cards: 2,
                isDragging: false,
                syncState: 'idle',
                pendingOps: 1,
                activeSprint: 'SP-1',
                backlogCards: 1,
                subscriptionStatus: 'connected',
                error: null
            });
        });

        it('state tolerates missing collections', () => {
            store.state = { error: 'oops' };
            bridge.state();
            expect(tableSpy).toHaveBeenCalledWith({
                columns: 0,
                cards: 0,
                isDragging: undefined,
                syncState: undefined,
                pendingOps: 0,
                activeSprint: null,
                backlogCards: 0,
                subscriptionStatus: undefined,
                error: 'oops'
            });
        });
    });

    describe('history / inspect / diff / search', () => {
        it('history prints formatted entries and returns raw history', () => {
            recordSample();
            const h = bridge.history();
            expect(h).toHaveLength(3);
            const rows = tableSpy.mock.calls[0][0];
            expect(rows[0]).toEqual(
                expect.objectContaining({
                    '#': 0,
                    id: 1,
                    type: 'SET_BOARD',
                    undoable: 'Y',
                    changed: 'board'
                })
            );
            expect(rows[1]).toEqual(
                expect.objectContaining({
                    type: 'SET_LOADING',
                    undoable: '-',
                    changed: '(none)'
                })
            );
            expect(typeof rows[0].time).toBe('string');
        });

        it('inspect logs the full entry', () => {
            recordSample();
            const entry = bridge.inspect(1);
            expect(entry.action.type).toBe('SET_BOARD');
            expect(groupSpy).toHaveBeenCalledWith('Action #1: SET_BOARD');
            expect(logSpy).toHaveBeenCalledWith('Payload:', { Id: 'b1' });
            expect(logSpy).toHaveBeenCalledWith('Previous state:', {
                board: null
            });
            expect(logSpy).toHaveBeenCalledWith('Next state:', {
                board: { Id: 'b1' }
            });
            expect(groupEndSpy).toHaveBeenCalled();
        });

        it('inspect warns and returns null for unknown id', () => {
            expect(bridge.inspect(77)).toBeNull();
            expect(warnSpy).toHaveBeenCalledWith('No action with id 77');
        });

        it('diff logs each changed key and returns the diff', () => {
            recordSample();
            const diff = bridge.diff(3);
            expect(diff).toEqual({ v: { prev: 1, next: 2 } });
            expect(groupSpy).toHaveBeenCalledWith('Diff for #3: MOVE_CARD');
            expect(logSpy).toHaveBeenCalledWith('  v:');
            expect(logSpy).toHaveBeenCalledWith('    prev:', 1);
            expect(logSpy).toHaveBeenCalledWith('    next:', 2);
        });

        it('diff warns and returns null for unknown id', () => {
            expect(bridge.diff(5)).toBeNull();
            expect(warnSpy).toHaveBeenCalledWith('No action with id 5');
        });

        it('search matches action types case-insensitively', () => {
            recordSample();
            const results = bridge.search('move');
            expect(results.map((r) => r.type)).toEqual(['MOVE_CARD']);
            expect(tableSpy).toHaveBeenCalledWith([
                expect.objectContaining({
                    '#': 0,
                    id: 3,
                    type: 'MOVE_CARD',
                    changed: 'v'
                })
            ]);
        });
    });

    describe('time-travel and undo/redo', () => {
        it('jumpTo applies the recorded state', () => {
            recordSample();
            const state = bridge.jumpTo(1);
            expect(state).toEqual({ board: { Id: 'b1' } });
            expect(store._applyState).toHaveBeenCalledWith(state);
            expect(logSpy).toHaveBeenCalledWith('Jumped to action #1');
        });

        it('jumpTo warns when the id is unknown', () => {
            expect(bridge.jumpTo(99)).toBeNull();
            expect(store._applyState).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith('Cannot jump to action #99');
        });

        it('jumpToIndex applies state for a valid index only', () => {
            recordSample();
            expect(bridge.jumpToIndex(2)).toEqual({ v: 2 });
            expect(store._applyState).toHaveBeenCalledWith({ v: 2 });
            expect(logSpy).toHaveBeenCalledWith('Jumped to index 2');

            store._applyState.mockClear();
            expect(bridge.jumpToIndex(10)).toBeNull();
            expect(store._applyState).not.toHaveBeenCalled();
        });

        it('undo and redo apply states and report success', () => {
            recordSample();
            expect(bridge.canUndo()).toBe(true);
            expect(bridge.canRedo()).toBe(false);

            expect(bridge.undo()).toEqual({ v: 1 });
            expect(store._applyState).toHaveBeenLastCalledWith({ v: 1 });
            expect(logSpy).toHaveBeenCalledWith('Undo successful');
            expect(bridge.canRedo()).toBe(true);

            expect(bridge.redo()).toEqual({ v: 2 });
            expect(store._applyState).toHaveBeenLastCalledWith({ v: 2 });
            expect(logSpy).toHaveBeenCalledWith('Redo successful');
        });

        it('undo and redo report when there is nothing to do', () => {
            expect(bridge.undo()).toBeNull();
            expect(bridge.redo()).toBeNull();
            expect(store._applyState).not.toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith('Nothing to undo');
            expect(logSpy).toHaveBeenCalledWith('Nothing to redo');
        });
    });

    describe('live log', () => {
        it('logs newly recorded actions until stopped', () => {
            bridge.startLiveLog();
            expect(logSpy).toHaveBeenCalledWith('Live action log started');

            recorder.record({ type: 'SET_BOARD' }, { a: 1 }, { a: 2 });
            expect(logSpy).toHaveBeenCalledWith(
                '%c[SET_BOARD]',
                expect.any(String),
                { a: { prev: 1, next: 2 } }
            );

            // notify without a new entry (jump) does not log again
            logSpy.mockClear();
            recorder.jumpToIndex(0);
            expect(logSpy).not.toHaveBeenCalled();

            bridge.stopLiveLog();
            expect(logSpy).toHaveBeenCalledWith('Live action log stopped');

            logSpy.mockClear();
            recorder.record({ type: 'MOVE_CARD' }, {}, {});
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('startLiveLog is idempotent and stopLiveLog is a no-op when idle', () => {
            bridge.stopLiveLog();
            expect(logSpy).not.toHaveBeenCalledWith('Live action log stopped');

            bridge.startLiveLog();
            bridge.startLiveLog();
            const starts = logSpy.mock.calls.filter(
                ([msg]) => msg === 'Live action log started'
            );
            expect(starts).toHaveLength(1);

            logSpy.mockClear();
            recorder.record({ type: 'X' }, {}, {});
            const liveLogs = logSpy.mock.calls.filter(([msg]) =>
                String(msg).startsWith('%c[')
            );
            expect(liveLogs).toHaveLength(1);
        });
    });

    describe('pause / resume / export / replay / clear / stats / help', () => {
        it('pause and resume toggle recording', () => {
            bridge.pause();
            expect(recorder.isPaused()).toBe(true);
            expect(logSpy).toHaveBeenCalledWith('DevTools recording paused');
            bridge.resume();
            expect(recorder.isPaused()).toBe(false);
            expect(logSpy).toHaveBeenCalledWith('DevTools recording resumed');
        });

        it('export and replay delegate to the recorder', () => {
            recordSample();
            expect(bridge.export()).toEqual(recorder.exportHistory());
            expect(bridge.replay()).toHaveLength(3);
            expect(bridge.replay(3)).toEqual([
                {
                    action: { type: 'MOVE_CARD', payload: { cardId: 'a' } },
                    state: { v: 2 }
                }
            ]);
        });

        it('clear empties history', () => {
            recordSample();
            bridge.clear();
            expect(recorder.getEntryCount()).toBe(0);
            expect(logSpy).toHaveBeenCalledWith('DevTools history cleared');
        });

        it('stats returns per-type counts', () => {
            recordSample();
            recorder.record({ type: 'MOVE_CARD' }, {}, {});
            const stats = bridge.stats();
            expect(stats).toEqual({
                total: 4,
                typeCounts: { SET_BOARD: 1, SET_LOADING: 1, MOVE_CARD: 2 }
            });
            expect(groupSpy).toHaveBeenCalledWith('DevTools Stats');
            expect(logSpy).toHaveBeenCalledWith('Total actions:', 4);
            expect(logSpy).toHaveBeenCalledWith('Cursor:', 3);
            expect(logSpy).toHaveBeenCalledWith('Can undo:', true);
            expect(logSpy).toHaveBeenCalledWith('Can redo:', false);
            expect(tableSpy).toHaveBeenCalledWith(stats.typeCounts);
        });

        it('help prints the command table', () => {
            bridge.help();
            expect(groupSpy).toHaveBeenCalledWith('Kanban DevTools Commands');
            const rows = tableSpy.mock.calls[0][0];
            expect(rows).toHaveLength(19);
            expect(rows[0]).toEqual({
                command: 'dt.state()',
                description: 'Show current state summary as table'
            });
            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining('Console shortcut')
            );
        });
    });

    describe('DOM command bridge', () => {
        beforeEach(() => {
            recordSample();
        });

        it.each([
            ['state', 'state'],
            ['history', 'history'],
            ['stats', 'stats'],
            ['undo', 'undo'],
            ['redo', 'redo'],
            ['clear', 'clear'],
            ['livelog', 'startLiveLog'],
            ['stoplive', 'stopLiveLog'],
            ['pause', 'pause'],
            ['resume', 'resume'],
            ['help', 'help']
        ])('routes "%s" to bridge.%s()', (command, method) => {
            const spy = jest.spyOn(bridge, method);
            sendCommand(command);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(groupSpy).toHaveBeenCalledWith(
                `DevTools command: ${command}`
            );
            expect(groupEndSpy).toHaveBeenCalled();
        });

        it.each([
            ['inspect:2', 'inspect', 2],
            ['diff:3', 'diff', 3],
            ['jumpTo: 1', 'jumpTo', 1]
        ])('parses numeric argument for "%s"', (command, method, arg) => {
            const spy = jest.spyOn(bridge, method);
            sendCommand(command);
            expect(spy).toHaveBeenCalledWith(arg);
        });

        it('passes the search query and defaults to empty string', () => {
            const spy = jest.spyOn(bridge, 'search');
            sendCommand('search:MOVE');
            expect(spy).toHaveBeenLastCalledWith('MOVE');
            sendCommand('search');
            expect(spy).toHaveBeenLastCalledWith('');
        });

        it('trims whitespace and is case-insensitive', () => {
            const spy = jest.spyOn(bridge, 'stats');
            sendCommand('  STATS  ');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(groupSpy).toHaveBeenCalledWith('DevTools command: STATS');
        });

        it('export prints JSON of the history', () => {
            sendCommand('export');
            const jsonCall = logSpy.mock.calls.find(
                ([msg]) => typeof msg === 'string' && msg.startsWith('[')
            );
            expect(JSON.parse(jsonCall[0])).toHaveLength(3);
        });

        it('warns on unknown commands', () => {
            sendCommand('bogus:1');
            expect(warnSpy).toHaveBeenCalledWith('Unknown command: bogus');
            expect(groupEndSpy).toHaveBeenCalled();
        });

        it('reports command failures via console.error', () => {
            store.getState.mockImplementation(() => {
                throw new Error('state exploded');
            });
            sendCommand('state');
            expect(errorSpy).toHaveBeenCalledWith(
                'Command "state" failed:',
                expect.any(Error)
            );
            expect(groupEndSpy).toHaveBeenCalled();
        });

        it('ignores events without a string detail', () => {
            groupSpy.mockClear();
            sendCommand(null);
            sendCommand({ cmd: 'state' });
            sendCommand('');
            document.dispatchEvent(new CustomEvent(CMD_EVENT));
            expect(groupSpy).not.toHaveBeenCalled();
        });
    });
});
