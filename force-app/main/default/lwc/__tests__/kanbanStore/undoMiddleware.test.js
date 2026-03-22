import { createUndoMiddleware } from '../../kanbanStore/middleware/undoMiddleware';
import { createUndoManager } from '../../kanbanStore/undo/undoManager';
import { MOVE_CARD } from '../../kanbanStore/core/actionTypes';

// Mock undoableActions
jest.mock('../../kanbanStore/thunks/cardThunks', () => ({
    moveCardAsync: jest.fn(),
    createCardAsync: jest.fn(),
    deleteCardAsync: jest.fn(),
    updateCardAsync: jest.fn()
}));

describe('undoMiddleware', () => {
    let undoManager;
    let middleware;
    let store;
    let next;

    beforeEach(() => {
        undoManager = createUndoManager();
        middleware = createUndoMiddleware(undoManager);

        const state = {
            columns: [
                {
                    Id: 'col1',
                    cards: [{ Id: 'card1' }]
                },
                { Id: 'col2', cards: [] }
            ]
        };

        store = {
            getState: jest.fn(() => state)
        };
        next = jest.fn((action) => action);
    });

    it('passes non-undoable actions through without recording', () => {
        const action = { type: 'SOME_OTHER_ACTION' };
        const chain = middleware(store)(next);
        chain(action);
        expect(next).toHaveBeenCalledWith(action);
        expect(undoManager.canUndo()).toBe(false);
    });

    it('passes null actions through', () => {
        const chain = middleware(store)(next);
        chain(null);
        expect(next).toHaveBeenCalledWith(null);
    });

    it('records undoable actions to the undo manager', () => {
        const action = {
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        };
        const chain = middleware(store)(next);
        chain(action);
        expect(next).toHaveBeenCalledWith(action);
        expect(undoManager.canUndo()).toBe(true);
    });

    it('does not record when undo manager is paused', () => {
        undoManager.pause();
        const action = {
            type: MOVE_CARD,
            payload: {
                cardId: 'card1',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        };
        const chain = middleware(store)(next);
        chain(action);
        expect(next).toHaveBeenCalledWith(action);
        expect(undoManager.canUndo()).toBe(false);
    });

    it('does not record when captureContext returns null', () => {
        const action = {
            type: MOVE_CARD,
            payload: {
                cardId: 'missing',
                targetColumnId: 'col2',
                targetIndex: 0
            }
        };
        const chain = middleware(store)(next);
        chain(action);
        expect(next).toHaveBeenCalledWith(action);
        expect(undoManager.canUndo()).toBe(false);
    });

    it('returns the result from next', () => {
        next = jest.fn(() => 'result');
        const action = { type: 'OTHER' };
        const chain = middleware(store)(next);
        const result = chain(action);
        expect(result).toBe('result');
    });
});
