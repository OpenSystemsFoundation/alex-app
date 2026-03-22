import {
    getUndoableAction,
    isUndoable
} from '../../kanbanStore/undo/undoableActions';
import {
    MOVE_CARD,
    ADD_CARD,
    UPDATE_CARD
} from '../../kanbanStore/core/actionTypes';

// Mock thunks
jest.mock('../../kanbanStore/thunks/cardThunks', () => ({
    moveCardAsync: jest.fn((cardId, colId, idx) => ({
        type: 'MOVE_CARD_THUNK',
        cardId,
        colId,
        idx
    })),
    createCardAsync: jest.fn((colId, subject) => ({
        type: 'CREATE_CARD_THUNK',
        colId,
        subject
    })),
    deleteCardAsync: jest.fn((cardId) => ({
        type: 'DELETE_CARD_THUNK',
        cardId
    })),
    updateCardAsync: jest.fn((cardId, updates) => ({
        type: 'UPDATE_CARD_THUNK',
        cardId,
        updates
    }))
}));

describe('undoableActions', () => {
    describe('isUndoable', () => {
        it('returns true for MOVE_CARD', () => {
            expect(isUndoable(MOVE_CARD)).toBe(true);
        });

        it('returns true for ADD_CARD', () => {
            expect(isUndoable(ADD_CARD)).toBe(true);
        });

        it('returns true for UPDATE_CARD', () => {
            expect(isUndoable(UPDATE_CARD)).toBe(true);
        });

        it('returns false for unknown action', () => {
            expect(isUndoable('UNKNOWN')).toBe(false);
        });
    });

    describe('getUndoableAction', () => {
        it('returns definition for MOVE_CARD', () => {
            expect(getUndoableAction(MOVE_CARD)).not.toBeNull();
        });

        it('returns null for unknown type', () => {
            expect(getUndoableAction('UNKNOWN')).toBeNull();
        });
    });

    describe('MOVE_CARD', () => {
        const def = getUndoableAction(MOVE_CARD);
        const prevState = {
            columns: [
                {
                    Id: 'col1',
                    cards: [{ Id: 'card1' }, { Id: 'card2' }]
                },
                { Id: 'col2', cards: [] }
            ]
        };

        it('captureContext returns reverse and forward context', () => {
            const action = {
                type: MOVE_CARD,
                payload: {
                    cardId: 'card1',
                    targetColumnId: 'col2',
                    targetIndex: 0
                }
            };
            const result = def.captureContext(prevState, action);
            expect(result.reverseContext).toEqual({
                cardId: 'card1',
                columnId: 'col1',
                index: 0
            });
            expect(result.forwardContext).toEqual({
                cardId: 'card1',
                columnId: 'col2',
                index: 0
            });
        });

        it('captureContext returns null if card not found', () => {
            const action = {
                type: MOVE_CARD,
                payload: {
                    cardId: 'missing',
                    targetColumnId: 'col2',
                    targetIndex: 0
                }
            };
            expect(def.captureContext(prevState, action)).toBeNull();
        });

        it('buildReverseThunk dispatches moveCardAsync', () => {
            const ctx = { cardId: 'c1', columnId: 'col1', index: 0 };
            const thunk = def.buildReverseThunk(ctx);
            const dispatch = jest.fn((v) => v);
            thunk(dispatch);
            expect(dispatch).toHaveBeenCalled();
        });

        it('buildForwardThunk dispatches moveCardAsync', () => {
            const ctx = { cardId: 'c1', columnId: 'col2', index: 1 };
            const thunk = def.buildForwardThunk(ctx);
            const dispatch = jest.fn((v) => v);
            thunk(dispatch);
            expect(dispatch).toHaveBeenCalled();
        });

        it('describe returns a string', () => {
            expect(typeof def.describe({}, {})).toBe('string');
        });
    });

    describe('ADD_CARD', () => {
        const def = getUndoableAction(ADD_CARD);

        it('captureContext returns context with card ID', () => {
            const action = {
                type: ADD_CARD,
                payload: {
                    columnId: 'col1',
                    card: { Id: 'newCard', OpenSF__Subject__c: 'Test' }
                }
            };
            const result = def.captureContext({}, action, {});
            expect(result.reverseContext.cardId).toBe('newCard');
            expect(result.forwardContext.subject).toBe('Test');
        });

        it('captureContext returns null if no card', () => {
            const action = {
                type: ADD_CARD,
                payload: { columnId: 'col1', card: null }
            };
            expect(def.captureContext({}, action, {})).toBeNull();
        });

        it('captureContext returns null if card has no Id', () => {
            const action = {
                type: ADD_CARD,
                payload: { columnId: 'col1', card: { Name: 'test' } }
            };
            expect(def.captureContext({}, action, {})).toBeNull();
        });

        it('captureContext falls back subject to Name', () => {
            const action = {
                type: ADD_CARD,
                payload: {
                    columnId: 'col1',
                    card: { Id: 'c1', Name: 'Fallback' }
                }
            };
            const result = def.captureContext({}, action, {});
            expect(result.forwardContext.subject).toBe('Fallback');
        });

        it('buildReverseThunk dispatches deleteCardAsync', () => {
            const thunk = def.buildReverseThunk({ cardId: 'c1' });
            const dispatch = jest.fn((v) => v);
            thunk(dispatch);
            expect(dispatch).toHaveBeenCalled();
        });

        it('buildForwardThunk dispatches createCardAsync', () => {
            const thunk = def.buildForwardThunk({
                columnId: 'col1',
                subject: 'Test'
            });
            const dispatch = jest.fn((v) => v);
            thunk(dispatch);
            expect(dispatch).toHaveBeenCalled();
        });

        it('describe returns a string', () => {
            expect(typeof def.describe()).toBe('string');
        });
    });

    describe('UPDATE_CARD', () => {
        const def = getUndoableAction(UPDATE_CARD);
        const prevState = {
            columns: [
                {
                    Id: 'col1',
                    cards: [
                        {
                            Id: 'card1',
                            OpenSF__Subject__c: 'Old Subject',
                            OpenSF__Priority__c: 'Low'
                        }
                    ]
                }
            ]
        };

        it('captureContext captures previous values', () => {
            const action = {
                type: UPDATE_CARD,
                payload: {
                    cardId: 'card1',
                    updates: { OpenSF__Subject__c: 'New Subject' }
                }
            };
            const result = def.captureContext(prevState, action);
            expect(result.reverseContext.updates.OpenSF__Subject__c).toBe(
                'Old Subject'
            );
            expect(result.forwardContext.updates.OpenSF__Subject__c).toBe(
                'New Subject'
            );
        });

        it('captureContext returns null if card not found', () => {
            const action = {
                type: UPDATE_CARD,
                payload: { cardId: 'missing', updates: {} }
            };
            expect(def.captureContext(prevState, action)).toBeNull();
        });

        it('captureContext handles undefined previous values', () => {
            const action = {
                type: UPDATE_CARD,
                payload: {
                    cardId: 'card1',
                    updates: { newField: 'value' }
                }
            };
            const result = def.captureContext(prevState, action);
            expect(result.reverseContext.updates.newField).toBeNull();
        });

        it('buildReverseThunk dispatches updateCardAsync', () => {
            const thunk = def.buildReverseThunk({
                cardId: 'c1',
                updates: { x: 'old' }
            });
            const dispatch = jest.fn((v) => v);
            thunk(dispatch);
            expect(dispatch).toHaveBeenCalled();
        });

        it('describe returns a string', () => {
            expect(typeof def.describe()).toBe('string');
        });
    });
});
