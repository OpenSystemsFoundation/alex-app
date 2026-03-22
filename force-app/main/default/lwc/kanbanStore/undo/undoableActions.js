/**
 * UndoableActions Registry
 *
 * Maps action types to their undo/redo metadata:
 * - captureContext(prevState, action, nextState) → { reverseContext, forwardContext }
 * - buildReverseThunk(reverseContext, store) → thunk function
 * - buildForwardThunk(forwardContext, store) → thunk function
 * - describe(action, reverseContext) → human-readable description
 *
 * v1 supports: MOVE_CARD, ADD_CARD, UPDATE_CARD
 * DELETE_CARD excluded per plan (re-created card gets new ID — too complex for v1).
 *
 * @module undoableActions
 */

import { MOVE_CARD, ADD_CARD, UPDATE_CARD } from '../core/actionTypes';
import {
    moveCardAsync,
    createCardAsync,
    deleteCardAsync,
    updateCardAsync
} from '../thunks/cardThunks';

/**
 * Find a card's column ID and index within that column.
 * @param {Object} state - Store state
 * @param {string} cardId
 * @returns {{ columnId: string, index: number } | null}
 */
function findCardLocation(state, cardId) {
    for (const column of state.columns || []) {
        const cards = column.cards || [];
        const idx = cards.findIndex((c) => c.Id === cardId);
        if (idx !== -1) {
            return { columnId: column.Id, index: idx };
        }
    }
    return null;
}

/** @type {Object<string, Object>} */
const registry = {
    [MOVE_CARD]: {
        captureContext(prevState, action) {
            const { cardId, targetColumnId, targetIndex } = action.payload;
            const prev = findCardLocation(prevState, cardId);
            if (!prev) return null;

            return {
                reverseContext: {
                    cardId,
                    columnId: prev.columnId,
                    index: prev.index
                },
                forwardContext: {
                    cardId,
                    columnId: targetColumnId,
                    index: targetIndex
                }
            };
        },

        buildReverseThunk(ctx) {
            return (dispatch) =>
                dispatch(moveCardAsync(ctx.cardId, ctx.columnId, ctx.index));
        },

        buildForwardThunk(ctx) {
            return (dispatch) =>
                dispatch(moveCardAsync(ctx.cardId, ctx.columnId, ctx.index));
        },

        describe(_action, reverseCtx) {
            return `Move card back`;
        }
    },

    [ADD_CARD]: {
        /**
         * After a card is created we know its ID from nextState.
         * Reverse = delete the card.  Forward = re-create (will get new ID).
         */
        captureContext(prevState, action, nextState) {
            const { columnId } = action.payload;
            const card = action.payload.card;
            if (!card || !card.Id) return null;

            return {
                reverseContext: {
                    cardId: card.Id,
                    columnId
                },
                forwardContext: {
                    columnId,
                    subject:
                        card.OpenSF__Subject__c ||
                        card.subject ||
                        card.Name ||
                        'Card'
                }
            };
        },

        buildReverseThunk(ctx) {
            return (dispatch) => dispatch(deleteCardAsync(ctx.cardId));
        },

        buildForwardThunk(ctx) {
            return (dispatch) =>
                dispatch(createCardAsync(ctx.columnId, ctx.subject));
        },

        describe() {
            return 'Create card';
        }
    },

    [UPDATE_CARD]: {
        captureContext(prevState, action) {
            const { cardId, updates } = action.payload;

            // Capture previous values for each updated field
            const card = findCardInState(prevState, cardId);
            if (!card) return null;

            const previousValues = {};
            for (const key of Object.keys(updates)) {
                previousValues[key] =
                    card[key] !== undefined ? card[key] : null;
            }

            return {
                reverseContext: {
                    cardId,
                    updates: previousValues
                },
                forwardContext: {
                    cardId,
                    updates: { ...updates }
                }
            };
        },

        buildReverseThunk(ctx) {
            return (dispatch) =>
                dispatch(updateCardAsync(ctx.cardId, ctx.updates));
        },

        buildForwardThunk(ctx) {
            return (dispatch) =>
                dispatch(updateCardAsync(ctx.cardId, ctx.updates));
        },

        describe() {
            return 'Update card';
        }
    }
};

/**
 * Find a card by ID across all columns.
 * @param {Object} state
 * @param {string} cardId
 * @returns {Object|null}
 */
function findCardInState(state, cardId) {
    for (const column of state.columns || []) {
        const card = (column.cards || []).find((c) => c.Id === cardId);
        if (card) return card;
    }
    return null;
}

/**
 * Get the undoable action definition for a given action type.
 * @param {string} actionType
 * @returns {Object|null}
 */
export function getUndoableAction(actionType) {
    return registry[actionType] || null;
}

/**
 * Check if an action type is undoable.
 * @param {string} actionType
 * @returns {boolean}
 */
export function isUndoable(actionType) {
    return actionType in registry;
}
