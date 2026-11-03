/**
 * Unit tests for undoableActions registry
 */
import { getUndoableAction, isUndoable } from '../../undo/undoableActions';
import { MOVE_CARD, ADD_CARD, UPDATE_CARD } from '../../core/actionTypes';
import {
    moveCardAsync,
    createCardAsync,
    deleteCardAsync,
    updateCardAsync
} from '../../thunks/cardThunks';

jest.mock('../../thunks/cardThunks', () => ({
    moveCardAsync: jest.fn((...args) => ({ thunk: 'move', args })),
    createCardAsync: jest.fn((...args) => ({ thunk: 'create', args })),
    deleteCardAsync: jest.fn((...args) => ({ thunk: 'delete', args })),
    updateCardAsync: jest.fn((...args) => ({ thunk: 'update', args }))
}));

const buildState = () => ({
    columns: [
        {
            Id: 'colA',
            cards: [
                { Id: 'c1', subject: 'One', priority: 'High' },
                { Id: 'c2', subject: 'Two', storyPoints: 0 }
            ]
        },
        { Id: 'colEmpty' },
        { Id: 'colB', cards: [{ Id: 'c3', subject: 'Three' }] }
    ]
});

describe('undoableActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isUndoable / getUndoableAction', () => {
        it('recognises supported action types', () => {
            expect(isUndoable(MOVE_CARD)).toBe(true);
            expect(isUndoable(ADD_CARD)).toBe(true);
            expect(isUndoable(UPDATE_CARD)).toBe(true);
        });

        it('rejects unsupported action types', () => {
            expect(isUndoable('DELETE_CARD')).toBe(false);
            expect(isUndoable('UNKNOWN')).toBe(false);
            expect(getUndoableAction('DELETE_CARD')).toBeNull();
        });

        it('returns definitions with the full interface', () => {
            [MOVE_CARD, ADD_CARD, UPDATE_CARD].forEach((type) => {
                const def = getUndoableAction(type);
                expect(typeof def.captureContext).toBe('function');
                expect(typeof def.buildReverseThunk).toBe('function');
                expect(typeof def.buildForwardThunk).toBe('function');
                expect(typeof def.describe).toBe('function');
            });
        });
    });

    describe('MOVE_CARD', () => {
        const def = () => getUndoableAction(MOVE_CARD);

        it('captures previous and target location', () => {
            const ctx = def().captureContext(buildState(), {
                type: MOVE_CARD,
                payload: {
                    cardId: 'c3',
                    targetColumnId: 'colA',
                    targetIndex: 1
                }
            });
            expect(ctx).toEqual({
                reverseContext: { cardId: 'c3', columnId: 'colB', index: 0 },
                forwardContext: { cardId: 'c3', columnId: 'colA', index: 1 }
            });
        });

        it('captures index of a non-first card', () => {
            const ctx = def().captureContext(buildState(), {
                type: MOVE_CARD,
                payload: {
                    cardId: 'c2',
                    targetColumnId: 'colB',
                    targetIndex: 0
                }
            });
            expect(ctx.reverseContext).toEqual({
                cardId: 'c2',
                columnId: 'colA',
                index: 1
            });
        });

        it('returns null when card is not found', () => {
            expect(
                def().captureContext(buildState(), {
                    type: MOVE_CARD,
                    payload: {
                        cardId: 'missing',
                        targetColumnId: 'colA',
                        targetIndex: 0
                    }
                })
            ).toBeNull();
        });

        it('returns null when state has no columns', () => {
            expect(
                def().captureContext(
                    {},
                    {
                        type: MOVE_CARD,
                        payload: {
                            cardId: 'c1',
                            targetColumnId: 'colA',
                            targetIndex: 0
                        }
                    }
                )
            ).toBeNull();
        });

        it('builds reverse and forward thunks dispatching moveCardAsync', () => {
            const dispatch = jest.fn((x) => x);
            const reverse = def().buildReverseThunk({
                cardId: 'c1',
                columnId: 'colA',
                index: 0
            });
            expect(reverse(dispatch)).toEqual({
                thunk: 'move',
                args: ['c1', 'colA', 0]
            });
            expect(moveCardAsync).toHaveBeenCalledWith('c1', 'colA', 0);

            const forward = def().buildForwardThunk({
                cardId: 'c1',
                columnId: 'colB',
                index: 2
            });
            forward(dispatch);
            expect(moveCardAsync).toHaveBeenLastCalledWith('c1', 'colB', 2);
            expect(dispatch).toHaveBeenCalledTimes(2);
        });

        it('describes the action', () => {
            expect(def().describe({}, {})).toBe('Move card back');
        });
    });

    describe('ADD_CARD', () => {
        const def = () => getUndoableAction(ADD_CARD);
        const capture = (card) =>
            def().captureContext(
                buildState(),
                { type: ADD_CARD, payload: { card, columnId: 'colA' } },
                buildState()
            );

        it('uses OpenSF__Subject__c first', () => {
            expect(
                capture({
                    Id: 'new1',
                    OpenSF__Subject__c: 'Namespaced',
                    subject: 'plain',
                    Name: 'name'
                })
            ).toEqual({
                reverseContext: { cardId: 'new1', columnId: 'colA' },
                forwardContext: { columnId: 'colA', subject: 'Namespaced' }
            });
        });

        it('falls back to subject, then Name, then "Card"', () => {
            expect(
                capture({ Id: 'n', subject: 'plain', Name: 'name' })
                    .forwardContext.subject
            ).toBe('plain');
            expect(
                capture({ Id: 'n', Name: 'name' }).forwardContext.subject
            ).toBe('name');
            expect(capture({ Id: 'n' }).forwardContext.subject).toBe('Card');
        });

        it('returns null without a card or card Id', () => {
            expect(capture(undefined)).toBeNull();
            expect(capture({ subject: 'no id' })).toBeNull();
        });

        it('reverse thunk deletes, forward thunk re-creates', () => {
            const dispatch = jest.fn((x) => x);
            expect(
                def().buildReverseThunk({ cardId: 'new1' })(dispatch)
            ).toEqual({ thunk: 'delete', args: ['new1'] });
            expect(deleteCardAsync).toHaveBeenCalledWith('new1');

            expect(
                def().buildForwardThunk({ columnId: 'colA', subject: 'S' })(
                    dispatch
                )
            ).toEqual({ thunk: 'create', args: ['colA', 'S'] });
            expect(createCardAsync).toHaveBeenCalledWith('colA', 'S');
        });

        it('describes the action', () => {
            expect(def().describe()).toBe('Create card');
        });
    });

    describe('UPDATE_CARD', () => {
        const def = () => getUndoableAction(UPDATE_CARD);

        it('captures previous values, using null for undefined fields', () => {
            const updates = { priority: 'Low', storyPoints: 5, dueDate: 'x' };
            const ctx = def().captureContext(buildState(), {
                type: UPDATE_CARD,
                payload: { cardId: 'c1', updates }
            });
            expect(ctx).toEqual({
                reverseContext: {
                    cardId: 'c1',
                    updates: {
                        priority: 'High',
                        storyPoints: null,
                        dueDate: null
                    }
                },
                forwardContext: { cardId: 'c1', updates }
            });
            expect(ctx.forwardContext.updates).not.toBe(updates);
        });

        it('preserves falsy-but-defined previous values', () => {
            const ctx = def().captureContext(buildState(), {
                type: UPDATE_CARD,
                payload: { cardId: 'c2', updates: { storyPoints: 8 } }
            });
            expect(ctx.reverseContext.updates).toEqual({ storyPoints: 0 });
        });

        it('finds cards in later columns, skipping columns without cards', () => {
            const ctx = def().captureContext(buildState(), {
                type: UPDATE_CARD,
                payload: { cardId: 'c3', updates: { subject: 'New' } }
            });
            expect(ctx.reverseContext.updates).toEqual({ subject: 'Three' });
        });

        it('returns null when card is not found', () => {
            expect(
                def().captureContext(buildState(), {
                    type: UPDATE_CARD,
                    payload: { cardId: 'missing', updates: { a: 1 } }
                })
            ).toBeNull();
            expect(
                def().captureContext(
                    {},
                    {
                        type: UPDATE_CARD,
                        payload: { cardId: 'c1', updates: { a: 1 } }
                    }
                )
            ).toBeNull();
        });

        it('reverse and forward thunks dispatch updateCardAsync', () => {
            const dispatch = jest.fn((x) => x);
            expect(
                def().buildReverseThunk({
                    cardId: 'c1',
                    updates: { priority: 'High' }
                })(dispatch)
            ).toEqual({
                thunk: 'update',
                args: ['c1', { priority: 'High' }]
            });
            expect(
                def().buildForwardThunk({
                    cardId: 'c1',
                    updates: { priority: 'Low' }
                })(dispatch)
            ).toEqual({ thunk: 'update', args: ['c1', { priority: 'Low' }] });
            expect(updateCardAsync).toHaveBeenCalledTimes(2);
        });

        it('describes the action', () => {
            expect(def().describe()).toBe('Update card');
        });
    });
});
