/**
 * Branch coverage tests for store.js
 * Targets uncovered branches: selector methods, createStore with logging,
 * baseDispatch null check, performUndo/performRedo
 */
import { createStore, KanbanStore } from '../../kanbanStore/kanbanStore';
import { MOVE_CARD } from '../../kanbanStore/core/actionTypes';

// Mock thunks so performUndo/performRedo don't make real Apex calls
jest.mock('../../kanbanStore/thunks/cardThunks', () => ({
    moveCardAsync: jest.fn(
        (_cardId, _colId, _idx) => (dispatch) =>
            dispatch({ type: 'MOCK_MOVE', payload: {} })
    ),
    createCardAsync: jest.fn(
        (_colId, _subj) => (dispatch) =>
            dispatch({ type: 'MOCK_CREATE', payload: {} })
    ),
    deleteCardAsync: jest.fn(
        (_cardId) => (dispatch) =>
            dispatch({ type: 'MOCK_DELETE', payload: {} })
    ),
    updateCardAsync: jest.fn(
        (_cardId, _updates) => (dispatch) =>
            dispatch({ type: 'MOCK_UPDATE', payload: {} })
    )
}));

describe('KanbanStore - selector methods', () => {
    let store;

    beforeEach(() => {
        store = createStore();
        // Set up state with columns and cards
        store.dispatch({
            type: 'SET_COLUMNS',
            payload: [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [
                        { Id: 'card1', subject: 'Task 1' },
                        { Id: 'card2', subject: 'Task 2' }
                    ],
                    cardCount: 2
                },
                {
                    Id: 'col2',
                    Name: 'Done',
                    cards: [{ Id: 'card3', subject: 'Task 3' }],
                    cardCount: 1
                }
            ]
        });
    });

    describe('getBoard', () => {
        it('returns null when no board set', () => {
            expect(store.getBoard()).toBeNull();
        });

        it('returns board when set', () => {
            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'b1', Name: 'Board' }
            });
            expect(store.getBoard()).toEqual({ Id: 'b1', Name: 'Board' });
        });
    });

    describe('getBoardId', () => {
        it('returns null when no board', () => {
            expect(store.getBoardId()).toBeNull();
        });

        it('returns boardId when set', () => {
            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'b1', Name: 'Board' }
            });
            expect(store.getBoardId()).toBe('b1');
        });
    });

    describe('findCard', () => {
        it('finds card by ID', () => {
            const card = store.findCard('card1');
            expect(card).toBeTruthy();
            expect(card.Id).toBe('card1');
        });

        it('returns null for nonexistent card', () => {
            expect(store.findCard('nonexistent')).toBeNull();
        });
    });

    describe('findColumn', () => {
        it('finds column by ID', () => {
            const col = store.findColumn('col1');
            expect(col).toBeTruthy();
            expect(col.Name).toBe('To Do');
        });

        it('returns null for nonexistent column', () => {
            expect(store.findColumn('nonexistent')).toBeNull();
        });
    });

    describe('getCardsByColumn', () => {
        it('returns cards for existing column', () => {
            const cards = store.getCardsByColumn('col1');
            expect(cards).toHaveLength(2);
        });

        it('returns empty array for nonexistent column', () => {
            const cards = store.getCardsByColumn('nonexistent');
            expect(cards).toEqual([]);
        });
    });

    describe('isDragging', () => {
        it('returns false when not dragging', () => {
            expect(store.isDragging()).toBe(false);
        });

        it('returns true when dragging', () => {
            store.dispatch({
                type: 'START_DRAG',
                payload: { source: { columnId: 'col1', cardIndex: 0 } }
            });
            expect(store.isDragging()).toBe(true);
        });
    });

    describe('getDragSource', () => {
        it('returns null when not dragging', () => {
            expect(store.getDragSource()).toBeNull();
        });

        it('returns drag source when dragging', () => {
            store.dispatch({
                type: 'START_DRAG',
                payload: { source: { columnId: 'col1', cardIndex: 0 } }
            });
            expect(store.getDragSource()).toEqual({
                columnId: 'col1',
                cardIndex: 0
            });
        });
    });

    describe('getTotalCardCount', () => {
        it('returns total cards across all columns', () => {
            expect(store.getTotalCardCount()).toBe(3);
        });

        it('returns 0 when no columns', () => {
            const emptyStore = createStore();
            expect(emptyStore.getTotalCardCount()).toBe(0);
        });
    });

    describe('getColumnCount', () => {
        it('returns number of columns', () => {
            expect(store.getColumnCount()).toBe(2);
        });

        it('returns 0 when no columns', () => {
            const emptyStore = createStore();
            expect(emptyStore.getColumnCount()).toBe(0);
        });
    });
});

describe('KanbanStore - baseDispatch edge cases', () => {
    it('ignores null action', () => {
        const store = createStore();
        expect(() => store.dispatch(null)).not.toThrow();
    });

    it('ignores action without type', () => {
        const store = createStore();
        expect(() => store.dispatch({})).not.toThrow();
    });

    it('ignores undefined action', () => {
        const store = createStore();
        expect(() => store.dispatch(undefined)).not.toThrow();
    });
});

describe('createStore with logging', () => {
    it('creates store with logging middleware when enableLogging is true', () => {
        const store = createStore({ enableLogging: true });
        expect(store).toBeInstanceOf(KanbanStore);

        // Should still work normally with logging enabled
        store.dispatch({
            type: 'SET_BOARD',
            payload: { Id: 'b1' }
        });
        expect(store.getBoard()).toEqual({ Id: 'b1' });
    });

    it('logging middleware logs actions', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const endSpy = jest
            .spyOn(console, 'groupEnd')
            .mockImplementation(() => {});

        const store = createStore({ enableLogging: true });
        store.dispatch({
            type: 'SET_BOARD',
            payload: { Id: 'b1' }
        });

        expect(groupSpy).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalled();

        groupSpy.mockRestore();
        logSpy.mockRestore();
        endSpy.mockRestore();
    });
});

describe('KanbanStore - thunk middleware', () => {
    it('handles thunk actions (functions)', async () => {
        const store = createStore();
        const thunkResult = await store.dispatch((dispatch, getState) => {
            getState();
            dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'thunk-board' }
            });
            return { success: true };
        });

        expect(thunkResult).toEqual({ success: true });
        expect(store.getBoard()).toEqual({ Id: 'thunk-board' });
    });
});

describe('KanbanStore - enableDevTools', () => {
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        delete window.__KANBAN_DEVTOOLS__;
    });

    it('devTools is null by default', () => {
        const store = createStore();
        expect(store.devTools).toBeNull();
    });

    it('enableDevTools installs recorder and bridge', () => {
        const store = createStore();
        store.enableDevTools();
        expect(store.devTools).not.toBeNull();
        expect(store.devTools.getHistory).toBeDefined();
    });

    it('enableDevTools is idempotent', () => {
        const store = createStore();
        store.enableDevTools();
        const firstRecorder = store.devTools;
        store.enableDevTools();
        expect(store.devTools).toBe(firstRecorder);
    });

    it('devTools records actions after enableDevTools', () => {
        const store = createStore();
        store.enableDevTools();
        store.dispatch({ type: 'SET_BOARD', payload: { Id: 'b1' } });
        expect(store.devTools.getHistory()).toHaveLength(1);
    });

    it('_applyState is no-op when devTools disabled', () => {
        const store = createStore();
        const subscriber = jest.fn();
        store.subscribe(subscriber);
        subscriber.mockClear();

        store._applyState({ columns: [] });
        // Should not have notified — _applyState is guarded
        expect(subscriber).not.toHaveBeenCalled();
    });

    it('_applyState works when devTools enabled', () => {
        const store = createStore();
        store.enableDevTools();
        const subscriber = jest.fn();
        store.subscribe(subscriber);
        subscriber.mockClear();

        store._applyState({ columns: [], isLoading: true });
        expect(subscriber).toHaveBeenCalledTimes(1);
        const state = store.getState();
        expect(state.isLoading).toBe(true);
    });
});

describe('KanbanStore - performUndo / performRedo', () => {
    let store;

    beforeEach(() => {
        store = createStore();
        // Set up state with columns and cards so MOVE_CARD can capture context
        store.dispatch({
            type: 'SET_COLUMNS',
            payload: [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [{ Id: 'card1', subject: 'Task 1' }],
                    cardCount: 1
                },
                {
                    Id: 'col2',
                    Name: 'Done',
                    cards: [],
                    cardCount: 0
                }
            ]
        });
    });

    it('performUndo returns false when undoManager has nothing to undo', async () => {
        const result = await store.performUndo();
        expect(result).toBe(false);
    });

    it('performRedo returns false when undoManager has nothing to redo', async () => {
        const result = await store.performRedo();
        expect(result).toBe(false);
    });

    it('performUndo dispatches reverse thunk and returns true', async () => {
        // Trigger a MOVE_CARD to populate the undo stack
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });
        expect(store.undoManager.canUndo()).toBe(true);

        const result = await store.performUndo();
        expect(result).toBe(true);
    });

    it('performRedo dispatches forward thunk and returns true', async () => {
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });
        await store.performUndo();
        expect(store.undoManager.canRedo()).toBe(true);

        const result = await store.performRedo();
        expect(result).toBe(true);
    });

    it('performUndo returns false for stale entry', async () => {
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });
        store.undoManager.markStale('card1');

        const result = await store.performUndo();
        expect(result).toBe(false);
    });

    it('performRedo returns false when popRedo returns null (all stale)', async () => {
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });
        // Undo to make entry available for redo
        store.undoManager.popUndo();
        // Mark it stale before redo — popRedo will skip it and return null
        store.undoManager.markStale('card1');

        const result = await store.performRedo();
        expect(result).toBe(false);
    });

    it('performUndo resumes undoManager even on dispatch error', async () => {
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });

        // Spy on dispatch to make it throw
        const origDispatch = store.dispatch.bind(store);
        let callCount = 0;
        jest.spyOn(store, 'dispatch').mockImplementation((action) => {
            callCount++;
            // Let the first few dispatches through (setup), throw on the undo thunk
            if (typeof action === 'function') {
                return Promise.reject(new Error('dispatch error'));
            }
            return origDispatch(action);
        });

        await expect(store.performUndo()).rejects.toThrow('dispatch error');
        expect(store.undoManager.isPaused()).toBe(false);
    });

    it('performUndo adds grace period for cardId', async () => {
        const graceSpy = jest.spyOn(store.undoManager, 'addGrace');
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });

        await store.performUndo();
        expect(graceSpy).toHaveBeenCalledWith('card1');
    });

    it('performRedo adds grace period for cardId', async () => {
        const graceSpy = jest.spyOn(store.undoManager, 'addGrace');
        store.dispatch({
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        });
        await store.performUndo();
        graceSpy.mockClear();

        await store.performRedo();
        expect(graceSpy).toHaveBeenCalledWith('card1');
    });
});
