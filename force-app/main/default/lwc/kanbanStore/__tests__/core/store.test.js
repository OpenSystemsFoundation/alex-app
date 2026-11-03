/**
 * Unit tests for core/store — KanbanStore class and createStore factory.
 *
 * undoableActions is mocked so performUndo/performRedo can be driven with
 * fake definitions (the real ones dispatch Apex-backed thunks).
 */
jest.mock('../../undo/undoableActions', () => ({
    getUndoableAction: jest.fn(),
    isUndoable: jest.fn(() => false)
}));

import { createStore, KanbanStore } from '../../core/store';
import { initialState } from '../../state/reducers';
import { getUndoableAction } from '../../undo/undoableActions';
import * as actions from '../../state/actions';
import { buildCard, buildColumn, resetIds } from 'jest-helpers/testDataFactory';

const seedColumns = () => [
    buildColumn({
        Id: 'col-1',
        cards: [buildCard({ Id: 'card-1' }), buildCard({ Id: 'card-2' })]
    }),
    buildColumn({ Id: 'col-2', cards: [buildCard({ Id: 'card-3' })] })
];

function createFakeUndoManager(overrides = {}) {
    return {
        canUndo: jest.fn(() => true),
        canRedo: jest.fn(() => true),
        popUndo: jest.fn(() => null),
        popRedo: jest.fn(() => null),
        addGrace: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        clear: jest.fn(),
        ...overrides
    };
}

beforeEach(() => {
    resetIds();
    getUndoableAction.mockReset();
});

describe('KanbanStore', () => {
    describe('construction and getState', () => {
        it('starts from a copy of initialState with no middleware', () => {
            const store = new KanbanStore();
            expect(store.getState()).toEqual(initialState);
            expect(store._middlewares).toEqual([]);
            expect(store._lastDragPosition).toBeNull();
        });

        it('returns a frozen shallow copy of state', () => {
            const store = new KanbanStore();
            const s1 = store.getState();
            expect(Object.isFrozen(s1)).toBe(true);
            expect(s1).not.toBe(store._state);
            // ES modules run in strict mode, so writes to frozen objects throw
            expect(() => {
                s1.board = 'x';
            }).toThrow(TypeError);
        });
    });

    describe('dispatch and subscribe', () => {
        it('updates state through the root reducer and notifies subscribers', () => {
            const store = new KanbanStore();
            const listener = jest.fn();
            store.subscribe(listener);

            store.dispatch(actions.setBoard({ Id: 'b1', Name: 'Board' }));

            expect(store.getBoardId()).toBe('b1');
            expect(listener).toHaveBeenCalledTimes(1);
            const notified = listener.mock.calls[0][0];
            expect(notified.board).toEqual({ Id: 'b1', Name: 'Board' });
            expect(Object.isFrozen(notified)).toBe(true);
        });

        it('stops notifying after unsubscribe', () => {
            const store = new KanbanStore();
            const listener = jest.fn();
            const unsubscribe = store.subscribe(listener);

            store.dispatch(actions.setLoading(true));
            expect(unsubscribe()).toBe(true);
            store.dispatch(actions.setLoading(false));

            expect(listener).toHaveBeenCalledTimes(1);
            expect(store.getState().isLoading).toBe(false);
        });

        it('isolates subscriber errors and keeps notifying others', () => {
            const errorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const store = new KanbanStore();
            const err = new Error('subscriber boom');
            const bad = jest.fn(() => {
                throw err;
            });
            const good = jest.fn();
            store.subscribe(bad);
            store.subscribe(good);

            expect(() =>
                store.dispatch(actions.setLoading(true))
            ).not.toThrow();

            expect(good).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledWith(
                'Store subscriber error:',
                err
            );
            errorSpy.mockRestore();
        });

        it('ignores null or typeless actions without notifying', () => {
            const store = new KanbanStore();
            const listener = jest.fn();
            store.subscribe(listener);
            const before = store._state;

            expect(store.dispatch(null)).toBeUndefined();
            store.dispatch(undefined);
            store.dispatch({ payload: 1 });

            expect(listener).not.toHaveBeenCalled();
            expect(store._state).toBe(before);
        });

        it('tracks lastDragPosition across drag actions', () => {
            const store = new KanbanStore();
            store.dispatch(actions.setColumns(seedColumns()));
            store.dispatch(
                actions.startDrag({ columnId: 'col-1', cardIndex: 0 })
            );
            expect(store.isDragging()).toBe(true);
            expect(store.getDragSource()).toEqual({
                columnId: 'col-1',
                cardIndex: 0
            });

            store.dispatch(actions.updateDragPosition('col-2', 0));
            expect(store._lastDragPosition).toBe('col-2-0');

            // drag preview is returned by getColumns while dragging
            const preview = store.getColumns();
            expect(preview.find((c) => c.Id === 'col-2').cards[0].Id).toBe(
                'card-1'
            );

            store.dispatch({ type: 'CANCEL_DRAG' });
            expect(store._lastDragPosition).toBeNull();
            expect(store.isDragging()).toBe(false);
        });
    });

    describe('middleware chain', () => {
        it('runs middleware left-to-right around the base dispatch', () => {
            const calls = [];
            const make = (name) => (_store) => (next) => (action) => {
                calls.push(`${name}:before`);
                const result = next(action);
                calls.push(`${name}:after`);
                return `${name}(${result})`;
            };
            const store = new KanbanStore([make('a'), make('b')]);

            const result = store.dispatch(actions.setLoading(true));

            expect(calls).toEqual([
                'a:before',
                'b:before',
                'b:after',
                'a:after'
            ]);
            expect(result).toBe('a(b(undefined))');
            expect(store.getState().isLoading).toBe(true);
        });

        it('passes the store instance to each middleware', () => {
            const seen = [];
            const mw = (store) => {
                seen.push(store);
                return (next) => next;
            };
            const store = new KanbanStore([mw]);
            expect(seen).toEqual([store]);
        });

        it('lets middleware short-circuit an action', () => {
            const blocker = () => () => (action) => {
                return action.type === 'SET_LOADING' ? 'blocked' : undefined;
            };
            const store = new KanbanStore([blocker]);
            const listener = jest.fn();
            store.subscribe(listener);

            expect(store.dispatch(actions.setLoading(true))).toBe('blocked');
            expect(store.getState().isLoading).toBe(false);
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('selector methods', () => {
        it('delegate to selectors over current state', () => {
            const store = new KanbanStore();
            store.dispatch(actions.setBoard({ Id: 'b9' }));
            store.dispatch(actions.setColumns(seedColumns()));

            expect(store.getBoard()).toEqual({ Id: 'b9' });
            expect(store.getBoardId()).toBe('b9');
            expect(store.getColumns().map((c) => c.Id)).toEqual([
                'col-1',
                'col-2'
            ]);
            expect(store.findCard('card-3').Id).toBe('card-3');
            expect(store.findColumn('col-2').Id).toBe('col-2');
            expect(store.getCardsByColumn('col-1').map((c) => c.Id)).toEqual([
                'card-1',
                'card-2'
            ]);
            expect(store.isDragging()).toBe(false);
            expect(store.getDragSource()).toBeNull();
            expect(store.getTotalCardCount()).toBe(3);
            expect(store.getColumnCount()).toBe(2);
        });
    });

    describe('reset', () => {
        it('restores initial state, clears drag position and notifies', () => {
            const store = new KanbanStore();
            store.dispatch(actions.setBoard({ Id: 'b1' }));
            store._lastDragPosition = 'x-1';
            const listener = jest.fn();
            store.subscribe(listener);

            store.reset();

            expect(store.getState()).toEqual(initialState);
            expect(store._lastDragPosition).toBeNull();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('clears the undo manager when one is attached', () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager();
            store.reset();
            expect(store.undoManager.clear).toHaveBeenCalledTimes(1);
        });
    });

    describe('performUndo', () => {
        it('returns false without an undo manager', async () => {
            const store = new KanbanStore();
            await expect(store.performUndo()).resolves.toBe(false);
        });

        it('returns false when nothing can be undone', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                canUndo: jest.fn(() => false)
            });
            await expect(store.performUndo()).resolves.toBe(false);
            expect(store.undoManager.popUndo).not.toHaveBeenCalled();
        });

        it('returns false when popUndo yields no entry', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager();
            await expect(store.performUndo()).resolves.toBe(false);
            expect(store.undoManager.popUndo).toHaveBeenCalled();
        });

        it('returns false for stale entries', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                popUndo: jest.fn(() => ({
                    stale: true,
                    actionType: 'MOVE_CARD'
                }))
            });
            await expect(store.performUndo()).resolves.toBe(false);
            expect(getUndoableAction).not.toHaveBeenCalled();
        });

        it('returns false for unknown action types', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                popUndo: jest.fn(() => ({ stale: false, actionType: 'NOPE' }))
            });
            getUndoableAction.mockReturnValue(null);
            await expect(store.performUndo()).resolves.toBe(false);
            expect(getUndoableAction).toHaveBeenCalledWith('NOPE');
        });

        it('dispatches the reverse thunk with recording paused', async () => {
            const store = new KanbanStore([
                (s) => (next) => (action) => {
                    if (typeof action === 'function') {
                        return action(s.dispatch.bind(s), s.getState.bind(s));
                    }
                    return next(action);
                }
            ]);
            const undoManager = createFakeUndoManager({
                popUndo: jest.fn(() => ({
                    stale: false,
                    actionType: 'UPDATE_CARD',
                    reverseContext: { cardId: 'card-r' },
                    forwardContext: { cardId: 'card-f' }
                }))
            });
            store.undoManager = undoManager;
            const order = [];
            const thunk = jest.fn(async () => {
                order.push(`paused:${undoManager.pause.mock.calls.length}`);
            });
            const def = {
                buildReverseThunk: jest.fn(() => thunk),
                buildForwardThunk: jest.fn()
            };
            getUndoableAction.mockReturnValue(def);

            await expect(store.performUndo()).resolves.toBe(true);

            expect(def.buildReverseThunk).toHaveBeenCalledWith(
                { cardId: 'card-r' },
                store
            );
            expect(def.buildForwardThunk).not.toHaveBeenCalled();
            expect(undoManager.addGrace).toHaveBeenCalledWith('card-r');
            expect(thunk).toHaveBeenCalled();
            expect(order).toEqual(['paused:1']);
            expect(undoManager.resume).toHaveBeenCalledTimes(1);
        });

        it('falls back to the forward cardId and skips grace without any cardId', async () => {
            const store = new KanbanStore();
            store.dispatch = jest.fn(() => Promise.resolve());
            const entries = [
                {
                    stale: false,
                    actionType: 'A',
                    forwardContext: { cardId: 'card-f' }
                },
                { stale: false, actionType: 'A' }
            ];
            store.undoManager = createFakeUndoManager({
                popUndo: jest.fn(() => entries.shift())
            });
            getUndoableAction.mockReturnValue({
                buildReverseThunk: () => 'thunk'
            });

            await expect(store.performUndo()).resolves.toBe(true);
            expect(store.undoManager.addGrace).toHaveBeenCalledWith('card-f');

            store.undoManager.addGrace.mockClear();
            await expect(store.performUndo()).resolves.toBe(true);
            expect(store.undoManager.addGrace).not.toHaveBeenCalled();
            expect(store.dispatch).toHaveBeenCalledWith('thunk');
        });

        it('resumes recording even if the thunk rejects', async () => {
            const store = new KanbanStore();
            const err = new Error('apex failed');
            store.dispatch = jest.fn(() => Promise.reject(err));
            store.undoManager = createFakeUndoManager({
                popUndo: jest.fn(() => ({
                    stale: false,
                    actionType: 'A',
                    reverseContext: { cardId: 'c' }
                }))
            });
            getUndoableAction.mockReturnValue({
                buildReverseThunk: () => 'thunk'
            });

            await expect(store.performUndo()).rejects.toBe(err);
            expect(store.undoManager.pause).toHaveBeenCalled();
            expect(store.undoManager.resume).toHaveBeenCalledTimes(1);
        });
    });

    describe('performRedo', () => {
        it('returns false without an undo manager', async () => {
            const store = new KanbanStore();
            await expect(store.performRedo()).resolves.toBe(false);
        });

        it('returns false when nothing can be redone', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                canRedo: jest.fn(() => false)
            });
            await expect(store.performRedo()).resolves.toBe(false);
            expect(store.undoManager.popRedo).not.toHaveBeenCalled();
        });

        it('returns false when popRedo yields no entry', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager();
            await expect(store.performRedo()).resolves.toBe(false);
            expect(store.undoManager.popRedo).toHaveBeenCalled();
        });

        it('returns false for stale entries', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                popRedo: jest.fn(() => ({ stale: true, actionType: 'A' }))
            });
            await expect(store.performRedo()).resolves.toBe(false);
            expect(getUndoableAction).not.toHaveBeenCalled();
        });

        it('returns false for unknown action types', async () => {
            const store = new KanbanStore();
            store.undoManager = createFakeUndoManager({
                popRedo: jest.fn(() => ({ stale: false, actionType: 'NOPE' }))
            });
            getUndoableAction.mockReturnValue(null);
            await expect(store.performRedo()).resolves.toBe(false);
        });

        it('dispatches the forward thunk using the forward cardId for grace', async () => {
            const store = new KanbanStore();
            store.dispatch = jest.fn(() => Promise.resolve());
            store.undoManager = createFakeUndoManager({
                popRedo: jest.fn(() => ({
                    stale: false,
                    actionType: 'MOVE_CARD',
                    forwardContext: { cardId: 'card-f' },
                    reverseContext: { cardId: 'card-r' }
                }))
            });
            const def = { buildForwardThunk: jest.fn(() => 'fwd-thunk') };
            getUndoableAction.mockReturnValue(def);

            await expect(store.performRedo()).resolves.toBe(true);

            expect(def.buildForwardThunk).toHaveBeenCalledWith(
                { cardId: 'card-f' },
                store
            );
            expect(store.dispatch).toHaveBeenCalledWith('fwd-thunk');
            expect(store.undoManager.addGrace).toHaveBeenCalledWith('card-f');
            expect(store.undoManager.pause).toHaveBeenCalledTimes(1);
            expect(store.undoManager.resume).toHaveBeenCalledTimes(1);
        });

        it('falls back to reverse cardId and skips grace without any cardId', async () => {
            const store = new KanbanStore();
            store.dispatch = jest.fn(() => Promise.resolve());
            const entries = [
                {
                    stale: false,
                    actionType: 'A',
                    reverseContext: { cardId: 'card-r' }
                },
                { stale: false, actionType: 'A' }
            ];
            store.undoManager = createFakeUndoManager({
                popRedo: jest.fn(() => entries.shift())
            });
            getUndoableAction.mockReturnValue({
                buildForwardThunk: () => 'thunk'
            });

            await expect(store.performRedo()).resolves.toBe(true);
            expect(store.undoManager.addGrace).toHaveBeenCalledWith('card-r');

            store.undoManager.addGrace.mockClear();
            await expect(store.performRedo()).resolves.toBe(true);
            expect(store.undoManager.addGrace).not.toHaveBeenCalled();
        });

        it('resumes recording even if the thunk rejects', async () => {
            const store = new KanbanStore();
            const err = new Error('redo failed');
            store.dispatch = jest.fn(() => Promise.reject(err));
            store.undoManager = createFakeUndoManager({
                popRedo: jest.fn(() => ({ stale: false, actionType: 'A' }))
            });
            getUndoableAction.mockReturnValue({
                buildForwardThunk: () => 'thunk'
            });

            await expect(store.performRedo()).rejects.toBe(err);
            expect(store.undoManager.resume).toHaveBeenCalledTimes(1);
        });
    });

    describe('devtools', () => {
        let logSpy;

        beforeEach(() => {
            logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            if (window.__KANBAN_DEVTOOLS__) {
                window.__KANBAN_DEVTOOLS__.destroy();
            }
            logSpy.mockRestore();
        });

        it('_applyState is a no-op while devtools are disabled', () => {
            const store = createStore();
            const listener = jest.fn();
            store.subscribe(listener);

            store._applyState({ ...initialState, boardId: 'hacked' });

            expect(store.getBoardId()).toBeNull();
            expect(listener).not.toHaveBeenCalled();
        });

        it('enableDevTools installs recorder, middleware and window bridge', () => {
            const store = createStore();
            const middlewareCount = store._middlewares.length;

            store.enableDevTools();

            expect(store.devTools).not.toBeNull();
            expect(store._middlewares).toHaveLength(middlewareCount + 1);
            expect(window.__KANBAN_DEVTOOLS__).toBeDefined();
            expect(window.__KANBAN_DEVTOOLS__.getState()).toEqual(
                store.getState()
            );
            expect(logSpy).toHaveBeenCalledWith(
                '%c Kanban DevTools enabled ',
                expect.any(String)
            );

            store.dispatch(actions.setBoard({ Id: 'b1' }));
            const history = store.devTools.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('SET_BOARD');
            expect(history[0].diff.boardId).toEqual({ prev: null, next: 'b1' });
        });

        it('enableDevTools is idempotent', () => {
            const store = createStore();
            store.enableDevTools();
            const recorder = store.devTools;
            const count = store._middlewares.length;

            store.enableDevTools();

            expect(store.devTools).toBe(recorder);
            expect(store._middlewares).toHaveLength(count);
        });

        it('_applyState applies snapshots and resets transient sync/drag state', () => {
            const store = createStore();
            store.enableDevTools();
            store._lastDragPosition = 'col-1';
            const listener = jest.fn();
            store.subscribe(listener);

            store._applyState({
                ...initialState,
                boardId: 'b2',
                pendingOperations: [{ id: 1 }],
                syncState: 'syncing',
                isDragging: true,
                dragState: [],
                dragSource: { columnId: 'c' }
            });

            const s = store.getState();
            expect(s.boardId).toBe('b2');
            expect(s.pendingOperations).toEqual([]);
            expect(s.syncState).toBe('idle');
            expect(s.isDragging).toBe(false);
            expect(s.dragState).toBeNull();
            expect(s.dragSource).toBeNull();
            expect(store._lastDragPosition).toBeNull();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('supports time-travel undo through the bridge', () => {
            const store = createStore();
            store.enableDevTools();
            store.dispatch(actions.setBoard({ Id: 'b1' }));
            store.dispatch(actions.setBoard({ Id: 'b2' }));

            window.__KANBAN_DEVTOOLS__.undo();

            expect(store.getBoardId()).toBe('b1');
        });
    });
});

describe('createStore', () => {
    it('creates a store with thunk + undo middleware and an undo manager', () => {
        const store = createStore();

        expect(store).toBeInstanceOf(KanbanStore);
        expect(store._middlewares).toHaveLength(2);
        expect(store.devTools).toBeNull();
        expect(typeof store.undoManager.canUndo).toBe('function');
        expect(store.undoManager.canUndo()).toBe(false);
    });

    it('defaults options when called without arguments', () => {
        expect(createStore(undefined)._middlewares).toHaveLength(2);
        expect(createStore({ enableLogging: false })._middlewares).toHaveLength(
            2
        );
    });

    it('executes thunks with dispatch and getState', async () => {
        const store = createStore();
        const result = await store.dispatch(async (dispatch, getState) => {
            dispatch(actions.setBoard({ Id: 'thunk-board' }));
            return getState().boardId;
        });
        expect(result).toBe('thunk-board');
        expect(store.getBoardId()).toBe('thunk-board');
    });

    it('adds logging middleware when enableLogging is true', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const groupEndSpy = jest
            .spyOn(console, 'groupEnd')
            .mockImplementation(() => {});

        const store = createStore({ enableLogging: true });
        expect(store._middlewares).toHaveLength(3);

        store.dispatch(actions.setLoading(true));

        expect(groupSpy).toHaveBeenCalledWith('Action: SET_LOADING');
        expect(logSpy).toHaveBeenCalledWith(
            'Next State:',
            expect.objectContaining({ isLoading: true })
        );
        expect(groupEndSpy).toHaveBeenCalled();
        jest.restoreAllMocks();
    });

    it('reset clears the attached undo manager', () => {
        const store = createStore();
        const clearSpy = jest.spyOn(store.undoManager, 'clear');
        store.reset();
        expect(clearSpy).toHaveBeenCalledTimes(1);
    });
});

describe('KanbanStore with CommonJS-style selectors', () => {
    it('reads through selectors exposed as accessors on a non-ES module', () => {
        const actual = jest.requireActual('../../state/selectors');
        const cjsSelectors = { ...actual };
        Object.defineProperty(cjsSelectors, 'getBoardId', {
            enumerable: true,
            get: () => actual.getBoardId
        });
        let isolated;
        jest.isolateModules(() => {
            jest.doMock('../../state/selectors', () => cjsSelectors);
            isolated = require('../../core/store');
        });

        const store = isolated.createStore();
        store.dispatch({ type: 'SET_BOARD', payload: { Id: 'cjs-board' } });

        expect(store.getBoardId()).toBe('cjs-board');
        expect(store.getColumnCount()).toBe(0);
    });
});
