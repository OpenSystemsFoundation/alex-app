/**
 * Branch coverage tests for store.js
 * Targets uncovered branches: selector methods, createStore with logging,
 * baseDispatch null check
 */
import { createStore, KanbanStore } from '../../kanbanStore/kanbanStore';

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
