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
} from '../../../kanbanStore/thunks/cardThunks';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from '../../helpers/testDataFactory';

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
