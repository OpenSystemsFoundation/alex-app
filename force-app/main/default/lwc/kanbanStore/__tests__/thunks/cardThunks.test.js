/**
 * Unit tests for cardThunks — async action creators for card operations.
 */

// Mock all Apex imports before importing the module under test
jest.mock(
    '@salesforce/apex/KanbanBoardController.moveCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.createCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.createBacklogCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.updateCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.deleteCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.reorderBacklogCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

import moveCardApex from '@salesforce/apex/KanbanBoardController.moveCard';
import createCardApex from '@salesforce/apex/KanbanBoardController.createCard';
import createBacklogCardApex from '@salesforce/apex/KanbanBoardController.createBacklogCard';
import updateCardApex from '@salesforce/apex/KanbanBoardController.updateCard';
import deleteCardApex from '@salesforce/apex/KanbanBoardController.deleteCard';
import reorderBacklogCardApex from '@salesforce/apex/KanbanBoardController.reorderBacklogCard';

import {
    moveCardAsync,
    createCardAsync,
    updateCardAsync,
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    deleteCardAsync,
    reorderBacklogCardAsync,
    bulkMoveBacklogCardsAsync,
    bulkReorderBacklogCardsAtIndexAsync
} from '../../thunks/cardThunks';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

// Helper: create a minimal dispatch/getState pair
function createThunkEnv(stateOverrides = {}) {
    const dispatched = [];
    const state = buildInitialState(stateOverrides);
    const dispatch = jest.fn((action) => {
        // If thunk (function), execute it
        if (typeof action === 'function') {
            return action(dispatch, () => state);
        }
        dispatched.push(action);
        return action;
    });
    const getState = jest.fn(() => state);
    return { dispatch, getState, dispatched, state };
}

beforeEach(() => {
    resetIds();
    jest.clearAllMocks();
});

describe('moveCardAsync', () => {
    it('calls moveCardApex and dispatches moveCard + commitDrag', async () => {
        const card = buildCard({ Id: 'c1', position: '1000' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const { dispatch, getState } = createThunkEnv({
            columns: [col],
            isDragging: true
        });
        moveCardApex.mockResolvedValue({ success: true });

        const thunk = moveCardAsync('c1', 'col1', 0, 'req1', 'client1');
        const result = await thunk(dispatch, getState);

        expect(result.success).toBe(true);
        expect(moveCardApex).toHaveBeenCalledWith(
            expect.objectContaining({
                cardId: 'c1',
                targetColumnId: 'col1',
                clientRequestId: 'req1',
                clientId: 'client1'
            })
        );
        // dispatch called for moveCard + commitDrag
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it('throws when target column not found', async () => {
        const { dispatch, getState } = createThunkEnv({ columns: [] });

        const thunk = moveCardAsync('c1', 'missing', 0);
        await expect(thunk(dispatch, getState)).rejects.toThrow(
            'Target column not found'
        );
    });

    it('throws on Apex error', async () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const { dispatch, getState } = createThunkEnv({ columns: [col] });
        moveCardApex.mockRejectedValue(new Error('Server error'));

        const thunk = moveCardAsync('c1', 'col1', 0);
        await expect(thunk(dispatch, getState)).rejects.toThrow('Server error');
    });

    it('skips commitDrag when not dragging', async () => {
        const card = buildCard({ Id: 'c1', position: '1000' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const { dispatch, getState } = createThunkEnv({
            columns: [col],
            isDragging: false
        });
        moveCardApex.mockResolvedValue({});

        const thunk = moveCardAsync('c1', 'col1', 0);
        await thunk(dispatch, getState);

        // Only moveCard dispatched, no commitDrag
        expect(dispatch).toHaveBeenCalledTimes(1);
    });
});

describe('createCardAsync', () => {
    it('calls createCardApex and dispatches addCard', async () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const { dispatch, getState } = createThunkEnv({ columns: [col] });
        const newCard = { Id: 'new1', subject: 'Test' };
        createCardApex.mockResolvedValue(newCard);

        const thunk = createCardAsync('col1', 'Test', 'req1', 'client1');
        const result = await thunk(dispatch, getState);

        expect(result.success).toBe(true);
        expect(result.card).toEqual(newCard);
        expect(createCardApex).toHaveBeenCalledWith(
            expect.objectContaining({
                columnId: 'col1',
                subject: 'Test',
                clientRequestId: 'req1',
                clientId: 'client1'
            })
        );
    });

    it('uses default subject when null', async () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const { dispatch, getState } = createThunkEnv({ columns: [col] });
        createCardApex.mockResolvedValue({ Id: 'new1' });

        const thunk = createCardAsync('col1', null);
        await thunk(dispatch, getState);

        expect(createCardApex).toHaveBeenCalledWith(
            expect.objectContaining({ subject: 'New Card' })
        );
    });

    it('throws when column not found', async () => {
        const { dispatch, getState } = createThunkEnv({ columns: [] });

        const thunk = createCardAsync('missing', 'Test');
        await expect(thunk(dispatch, getState)).rejects.toThrow(
            'Column not found'
        );
    });
});

describe('updateCardAsync', () => {
    it('dispatches optimistic update then server update', async () => {
        const { dispatch } = createThunkEnv();
        const serverCard = { Id: 'c1', subject: 'Updated' };
        updateCardApex.mockResolvedValue(serverCard);

        const thunk = updateCardAsync('c1', { subject: 'Updated' }, 'client1');
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        // First dispatch = optimistic, second = server response
        expect(dispatch).toHaveBeenCalledTimes(2);
        expect(updateCardApex).toHaveBeenCalledWith(
            expect.objectContaining({
                cardId: 'c1',
                updates: { subject: 'Updated' },
                clientId: 'client1'
            })
        );
    });

    it('throws on Apex error', async () => {
        const { dispatch } = createThunkEnv();
        updateCardApex.mockRejectedValue(new Error('fail'));

        const thunk = updateCardAsync('c1', { subject: 'x' });
        await expect(thunk(dispatch)).rejects.toThrow('fail');
    });
});

describe('createBacklogCardAsync', () => {
    it('dispatches addBacklogCard on success', async () => {
        const { dispatch } = createThunkEnv();
        const newCard = { Id: 'bg1', subject: 'Backlog Item' };
        createBacklogCardApex.mockResolvedValue(newCard);

        const thunk = createBacklogCardAsync('board1', {
            subject: 'Backlog Item',
            cardType: 'Bug'
        });
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(result.card).toEqual(newCard);
    });

    it('uses defaults for missing cardData fields', async () => {
        const { dispatch } = createThunkEnv();
        createBacklogCardApex.mockResolvedValue({ Id: 'bg2' });

        const thunk = createBacklogCardAsync('board1', {});
        await thunk(dispatch);

        expect(createBacklogCardApex).toHaveBeenCalledWith(
            expect.objectContaining({
                boardId: 'board1',
                subject: 'New Card',
                cardType: null,
                priority: null,
                storyPoints: null
            })
        );
    });
});

describe('updateBacklogCardAsync', () => {
    it('dispatches optimistic update and calls Apex', async () => {
        const { dispatch } = createThunkEnv();
        updateCardApex.mockResolvedValue(undefined);

        const thunk = updateBacklogCardAsync('c1', { priority: 'High' });
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(dispatch).toHaveBeenCalledTimes(1); // optimistic only
        expect(updateCardApex).toHaveBeenCalledWith({
            cardId: 'c1',
            updates: { priority: 'High' }
        });
    });
});

describe('deleteBacklogCardsAsync', () => {
    it('deletes multiple cards and dispatches removeBacklogCard for each', async () => {
        const { dispatch } = createThunkEnv();
        deleteCardApex.mockResolvedValue(undefined);

        const thunk = deleteBacklogCardsAsync(['c1', 'c2', 'c3']);
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(deleteCardApex).toHaveBeenCalledTimes(3);
        // 3 removeBacklogCard dispatches
        expect(dispatch).toHaveBeenCalledTimes(3);
    });

    it('throws when one delete fails', async () => {
        const { dispatch } = createThunkEnv();
        deleteCardApex
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('delete failed'));

        const thunk = deleteBacklogCardsAsync(['c1', 'c2']);
        await expect(thunk(dispatch)).rejects.toThrow('delete failed');
    });
});

describe('deleteCardAsync', () => {
    it('deletes card and dispatches deleteCard action', async () => {
        const { dispatch } = createThunkEnv();
        deleteCardApex.mockResolvedValue(undefined);

        const thunk = deleteCardAsync('c1');
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(deleteCardApex).toHaveBeenCalledWith({ cardId: 'c1' });
        expect(dispatch).toHaveBeenCalledTimes(1);
    });
});

describe('reorderBacklogCardAsync', () => {
    it('dispatches reorder + syncing, calls Apex, then decrements syncing', async () => {
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' }),
            buildCard({ Id: 'c3', position: '3000' })
        ];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex.mockResolvedValue('2500');

        const thunk = reorderBacklogCardAsync('c1', 2);
        await thunk(dispatch, getState);

        // Verify dispatches: reorderBacklog, setBacklogSyncing(true), updateBacklogCard, setBacklogSyncing(false)
        expect(reorderBacklogCardApex).toHaveBeenCalled();
        // syncing should be set true then false
        const syncActions = dispatched.filter(
            (a) => a.type && a.type.includes('BACKLOG_SYNCING')
        );
        expect(syncActions.length).toBe(2);
        expect(syncActions[0].payload).toBe(true);
        expect(syncActions[1].payload).toBe(false);
    });

    it('reverts backlog on Apex failure', async () => {
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' })
        ];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex.mockRejectedValue(new Error('Apex fail'));

        const thunk = reorderBacklogCardAsync('c1', 1);
        await expect(thunk(dispatch, getState)).rejects.toThrow('Apex fail');

        // Should have dispatched setBacklogCards with previous cards (revert)
        const revertAction = dispatched.find(
            (a) => a.type && a.type.includes('SET_BACKLOG_CARDS')
        );
        expect(revertAction).toBeDefined();
        expect(revertAction.payload).toEqual(cards);
    });

    it('returns early when card not found after reorder', async () => {
        const cards = [buildCard({ Id: 'c1', position: '1000' })];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            return undefined;
        });
        const getState = jest.fn(() => state);

        // After dispatch(reorderBacklog), the card 'missing' won't be in state
        const thunk = reorderBacklogCardAsync('missing', 0);
        const result = await thunk(dispatch, getState);

        expect(result).toEqual({ success: true });
        expect(reorderBacklogCardApex).not.toHaveBeenCalled();
    });
});

describe('bulkMoveBacklogCardsAsync', () => {
    it('reorders multiple cards and syncs each position', async () => {
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' }),
            buildCard({ Id: 'c3', position: '3000' })
        ];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex.mockResolvedValue('500');

        const thunk = bulkMoveBacklogCardsAsync(['c1', 'c2'], 'top');
        await thunk(dispatch, getState);

        expect(reorderBacklogCardApex).toHaveBeenCalledTimes(2);
    });

    it('reverts on failure during bulk move', async () => {
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' })
        ];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex
            .mockResolvedValueOnce('500')
            .mockRejectedValueOnce(new Error('fail'));

        const thunk = bulkMoveBacklogCardsAsync(['c1', 'c2'], 'top');
        await expect(thunk(dispatch, getState)).rejects.toThrow('fail');

        const revertAction = dispatched.find(
            (a) => a.type && a.type.includes('SET_BACKLOG_CARDS')
        );
        expect(revertAction).toBeDefined();
    });
});

describe('bulkReorderBacklogCardsAtIndexAsync', () => {
    it('reorders cards at a specific index', async () => {
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' }),
            buildCard({ Id: 'c3', position: '3000' })
        ];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex.mockResolvedValue('1500');

        const thunk = bulkReorderBacklogCardsAtIndexAsync(['c3'], 1);
        await thunk(dispatch, getState);

        expect(reorderBacklogCardApex).toHaveBeenCalled();
    });

    it('reverts on failure', async () => {
        const cards = [buildCard({ Id: 'c1', position: '1000' })];
        const dispatched = [];
        const state = buildInitialState({ backlogCards: cards });
        const dispatch = jest.fn((action) => {
            if (typeof action === 'function') {
                return action(dispatch, () => state);
            }
            dispatched.push(action);
            return undefined;
        });
        const getState = jest.fn(() => state);
        reorderBacklogCardApex.mockRejectedValue(new Error('fail'));

        const thunk = bulkReorderBacklogCardsAtIndexAsync(['c1'], 0);
        await expect(thunk(dispatch, getState)).rejects.toThrow('fail');

        const revertAction = dispatched.find(
            (a) => a.type && a.type.includes('SET_BACKLOG_CARDS')
        );
        expect(revertAction).toBeDefined();
    });
});

describe('cardThunks — error paths and edge branches', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // Env whose backlogCards change in response to UPDATE_BACKLOG_CARD,
    // so sequential loops see the persisted positions.
    function createBacklogEnv(backlogCards) {
        const dispatched = [];
        let state = buildInitialState({ backlogCards });
        const dispatch = jest.fn((action) => {
            dispatched.push(action);
            if (action.type === 'UPDATE_BACKLOG_CARD') {
                state = {
                    ...state,
                    backlogCards: state.backlogCards.map((c) => {
                        if (c.Id !== action.payload.cardId) return c;
                        return { ...c, ...action.payload.updates };
                    })
                };
            }
            return action;
        });
        const getState = jest.fn(() => state);
        return { dispatch, getState, dispatched };
    }

    it('moveCardAsync handles a target column without a cards array', async () => {
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [{ Id: 'col1' }]
        });
        moveCardApex.mockResolvedValue({ ok: true });

        const result = await moveCardAsync('c1', 'col1', 0)(dispatch, getState);

        expect(result).toEqual({ success: true, result: { ok: true } });
        expect(moveCardApex).toHaveBeenCalledWith({
            cardId: 'c1',
            targetColumnId: 'col1',
            previousCardPosition: null,
            nextCardPosition: null
        });
        expect(dispatched.map((a) => a.type)).toEqual(['MOVE_CARD']);
    });

    it('createCardAsync places the card after the last card and omits optional ids', async () => {
        const col = buildColumn({
            Id: 'col1',
            cards: [
                buildCard({ Id: 'c1', position: '1000' }),
                buildCard({ Id: 'c2', position: '2000' })
            ]
        });
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [col]
        });
        const newCard = { Id: 'new1', subject: 'Hello' };
        createCardApex.mockResolvedValue(newCard);

        await createCardAsync('col1', 'Hello')(dispatch, getState);

        expect(createCardApex).toHaveBeenCalledWith({
            columnId: 'col1',
            subject: 'Hello',
            previousCardPosition: '2000',
            nextCardPosition: null
        });
        expect(dispatched).toEqual([
            { type: 'ADD_CARD', payload: { card: newCard, columnId: 'col1' } }
        ]);
    });

    it('createCardAsync handles a column without a cards array', async () => {
        const { dispatch, getState } = createThunkEnv({
            columns: [{ Id: 'col1' }]
        });
        createCardApex.mockResolvedValue({ Id: 'new1' });

        await createCardAsync('col1', 'X')(dispatch, getState);

        expect(createCardApex).toHaveBeenCalledWith(
            expect.objectContaining({ previousCardPosition: null })
        );
    });

    it('createCardAsync rethrows Apex errors without dispatching', async () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const { dispatch, getState } = createThunkEnv({ columns: [col] });
        const error = new Error('create failed');
        createCardApex.mockRejectedValue(error);

        await expect(
            createCardAsync('col1', 'X')(dispatch, getState)
        ).rejects.toBe(error);
        expect(dispatch).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error creating card:',
            error
        );
    });

    it('updateCardAsync skips the server re-apply when Apex returns nothing', async () => {
        const { dispatch, dispatched } = createThunkEnv();
        updateCardApex.mockResolvedValue(null);

        const result = await updateCardAsync('c1', { subject: 'S' })(dispatch);

        expect(result).toEqual({ success: true, card: null });
        expect(updateCardApex).toHaveBeenCalledWith({
            cardId: 'c1',
            updates: { subject: 'S' }
        });
        expect(dispatched).toEqual([
            {
                type: 'UPDATE_CARD',
                payload: { cardId: 'c1', updates: { subject: 'S' } }
            }
        ]);
    });

    it('createBacklogCardAsync forwards all card fields and dispatches the new card', async () => {
        const { dispatch, dispatched } = createThunkEnv();
        const newCard = { Id: 'bg1' };
        createBacklogCardApex.mockResolvedValue(newCard);

        await createBacklogCardAsync('board1', {
            subject: 'Item',
            cardType: 'Bug',
            priority: 'High',
            storyPoints: 5
        })(dispatch);

        expect(createBacklogCardApex).toHaveBeenCalledWith({
            boardId: 'board1',
            subject: 'Item',
            cardType: 'Bug',
            priority: 'High',
            storyPoints: 5
        });
        expect(dispatched).toEqual([
            { type: 'ADD_BACKLOG_CARD', payload: newCard }
        ]);
    });

    it('createBacklogCardAsync rethrows Apex errors without dispatching', async () => {
        const { dispatch } = createThunkEnv();
        createBacklogCardApex.mockRejectedValue(new Error('backlog failed'));

        await expect(
            createBacklogCardAsync('board1', { subject: 'X' })(dispatch)
        ).rejects.toThrow('backlog failed');
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('updateBacklogCardAsync rethrows Apex errors after the optimistic update', async () => {
        const { dispatch, dispatched } = createThunkEnv();
        updateCardApex.mockRejectedValue(new Error('update failed'));

        await expect(
            updateBacklogCardAsync('c1', { priority: 'Low' })(dispatch)
        ).rejects.toThrow('update failed');
        expect(dispatched).toEqual([
            {
                type: 'UPDATE_BACKLOG_CARD',
                payload: { cardId: 'c1', updates: { priority: 'Low' } }
            }
        ]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error updating backlog card:',
            expect.any(Error)
        );
    });

    it('deleteCardAsync rethrows Apex errors without removing the card', async () => {
        const { dispatch } = createThunkEnv();
        deleteCardApex.mockRejectedValue(new Error('delete failed'));

        await expect(deleteCardAsync('c1')(dispatch)).rejects.toThrow(
            'delete failed'
        );
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('reorderBacklogCardAsync sends both neighbor positions for a middle card', async () => {
        // The reducer is not applied, so c2 stays at index 1 of 3
        const cards = [
            buildCard({ Id: 'c1', position: '1000' }),
            buildCard({ Id: 'c2', position: '2000' }),
            buildCard({ Id: 'c3', position: '3000' })
        ];
        const { dispatch, getState, dispatched } = createBacklogEnv(cards);
        reorderBacklogCardApex.mockResolvedValue('2500');

        const result = await reorderBacklogCardAsync('c2', 1)(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(reorderBacklogCardApex).toHaveBeenCalledWith({
            cardId: 'c2',
            previousCardPosition: '1000',
            nextCardPosition: '3000'
        });
        expect(dispatched.map((a) => a.type)).toEqual([
            'REORDER_BACKLOG',
            'SET_BACKLOG_SYNCING',
            'UPDATE_BACKLOG_CARD',
            'SET_BACKLOG_SYNCING'
        ]);
        expect(dispatched[2].payload).toEqual({
            cardId: 'c2',
            updates: { position: '2500' }
        });
    });

    it('reorderBacklogCardAsync skips the position update when Apex returns nothing', async () => {
        const cards = [buildCard({ Id: 'c1', position: '1000' })];
        const { dispatch, getState, dispatched } = createBacklogEnv(cards);
        reorderBacklogCardApex.mockResolvedValue(null);

        await reorderBacklogCardAsync('c1', 0)(dispatch, getState);

        expect(reorderBacklogCardApex).toHaveBeenCalledWith({
            cardId: 'c1',
            previousCardPosition: null,
            nextCardPosition: null
        });
        expect(dispatched.map((a) => a.type)).not.toContain(
            'UPDATE_BACKLOG_CARD'
        );
        expect(dispatched.map((a) => a.type)).not.toContain(
            'SET_BACKLOG_CARDS'
        );
    });

    it('reorderBacklogCardAsync tolerates a missing backlog array', async () => {
        const { dispatch, getState, dispatched } = createThunkEnv({
            backlogCards: undefined
        });

        const result = await reorderBacklogCardAsync('c1', 0)(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(reorderBacklogCardApex).not.toHaveBeenCalled();
        expect(dispatched[dispatched.length - 1]).toEqual({
            type: 'SET_BACKLOG_SYNCING',
            payload: false
        });
    });

    it.each([
        ['bulkMoveBacklogCardsAsync', bulkMoveBacklogCardsAsync, 'top'],
        [
            'bulkReorderBacklogCardsAtIndexAsync',
            bulkReorderBacklogCardsAtIndexAsync,
            1
        ]
    ])(
        '%s persists positions sequentially using updated neighbors',
        async (_name, thunkCreator, target) => {
            const cards = [
                buildCard({ Id: 'c1', position: '1000' }),
                buildCard({ Id: 'c2', position: '2000' }),
                buildCard({ Id: 'c3', position: '3000' })
            ];
            const { dispatch, getState, dispatched } = createBacklogEnv(cards);
            reorderBacklogCardApex
                .mockResolvedValueOnce('1500')
                .mockResolvedValueOnce(null);

            await thunkCreator(['c2', 'missing', 'c3'], target)(
                dispatch,
                getState
            );

            // 'missing' is skipped; c3 sees c2's persisted position
            expect(reorderBacklogCardApex).toHaveBeenCalledTimes(2);
            expect(reorderBacklogCardApex).toHaveBeenNthCalledWith(1, {
                cardId: 'c2',
                previousCardPosition: '1000',
                nextCardPosition: '3000'
            });
            expect(reorderBacklogCardApex).toHaveBeenNthCalledWith(2, {
                cardId: 'c3',
                previousCardPosition: '1500',
                nextCardPosition: null
            });
            const updates = dispatched.filter(
                (a) => a.type === 'UPDATE_BACKLOG_CARD'
            );
            expect(updates).toEqual([
                {
                    type: 'UPDATE_BACKLOG_CARD',
                    payload: { cardId: 'c2', updates: { position: '1500' } }
                }
            ]);
            const syncing = dispatched.filter(
                (a) => a.type === 'SET_BACKLOG_SYNCING'
            );
            expect(syncing.map((a) => a.payload)).toEqual([true, false]);
            expect(dispatched.map((a) => a.type)).not.toContain(
                'SET_BACKLOG_CARDS'
            );
        }
    );

    it.each([
        ['bulkMoveBacklogCardsAsync', bulkMoveBacklogCardsAsync, 'bottom'],
        [
            'bulkReorderBacklogCardsAtIndexAsync',
            bulkReorderBacklogCardsAtIndexAsync,
            0
        ]
    ])(
        '%s tolerates a missing backlog array',
        async (_name, thunkCreator, target) => {
            const { dispatch, getState, dispatched } = createThunkEnv({
                backlogCards: undefined
            });

            await thunkCreator(['c1'], target)(dispatch, getState);

            expect(reorderBacklogCardApex).not.toHaveBeenCalled();
            expect(dispatched[dispatched.length - 1]).toEqual({
                type: 'SET_BACKLOG_SYNCING',
                payload: false
            });
        }
    );

    it.each([
        ['bulkMoveBacklogCardsAsync', bulkMoveBacklogCardsAsync, 'top'],
        [
            'bulkReorderBacklogCardsAtIndexAsync',
            bulkReorderBacklogCardsAtIndexAsync,
            0
        ]
    ])(
        '%s restores the original backlog after a failure',
        async (_name, thunkCreator, target) => {
            const cards = [
                buildCard({ Id: 'c1', position: '1000' }),
                buildCard({ Id: 'c2', position: '2000' })
            ];
            const { dispatch, getState, dispatched } = createBacklogEnv(cards);
            reorderBacklogCardApex.mockRejectedValue(new Error('boom'));

            await expect(
                thunkCreator(['c2'], target)(dispatch, getState)
            ).rejects.toThrow('boom');

            expect(dispatched.slice(-2)).toEqual([
                { type: 'SET_BACKLOG_SYNCING', payload: false },
                { type: 'SET_BACKLOG_CARDS', payload: cards }
            ]);
        }
    );
});
