/**
 * Card Thunks
 *
 * Async action creators for card operations.
 * Handles server communication for card CRUD and movement.
 *
 * @module cardThunks
 */

import moveCardApex from '@salesforce/apex/KanbanBoardController.moveCard';
import createCardApex from '@salesforce/apex/KanbanBoardController.createCard';
import createBacklogCardApex from '@salesforce/apex/KanbanBoardController.createBacklogCard';
import updateCardApex from '@salesforce/apex/KanbanBoardController.updateCard';
import deleteCardApex from '@salesforce/apex/KanbanBoardController.deleteCard';
import reorderBacklogCardApex from '@salesforce/apex/KanbanBoardController.reorderBacklogCard';
import {
    addCard,
    moveCard as moveCardAction,
    commitDrag,
    updateCard as updateCardAction,
    deleteCard as deleteCardAction,
    addBacklogCard,
    updateBacklogCard,
    removeBacklogCard,
    reorderBacklog,
    setBacklogSyncing,
    setBacklogCards
} from '../state/actions';
import { findColumn } from '../state/selectors';
import { calculateCardPosition } from '../utils/positionCalculator';

/**
 * Move a card to a new column/position
 * @param {string} cardId - Card ID
 * @param {string} targetColumnId - Target column ID
 * @param {number} targetIndex - Target index in column
 * @param {string} requestId - Optional client request ID
 * @param {string} clientId - Optional client window ID
 * @returns {Function} Thunk function
 */
export const moveCardAsync = (
    cardId,
    targetColumnId,
    targetIndex,
    requestId = null,
    clientId = null
) => {
    return async (dispatch, getState) => {
        const state = getState();
        const targetColumn = findColumn(state, targetColumnId);

        if (!targetColumn) {
            throw new Error('Target column not found');
        }

        // Calculate position based on surrounding cards
        const { previousPosition, nextPosition } = calculateCardPosition(
            targetColumn.cards || [],
            cardId,
            targetIndex
        );

        // Build request params
        const params = {
            cardId,
            targetColumnId,
            previousCardPosition: previousPosition,
            nextCardPosition: nextPosition
        };

        if (requestId) {
            params.clientRequestId = requestId;
        }

        if (clientId) {
            params.clientId = clientId;
        }

        try {
            // Call server
            const result = await moveCardApex(params);

            // Update local state
            dispatch(moveCardAction(cardId, targetColumnId, targetIndex));

            // If there's an active drag, commit it
            if (state.isDragging) {
                dispatch(commitDrag());
            }

            return {
                success: true,
                result
            };
        } catch (error) {
            console.error('Error moving card:', error);
            throw error;
        }
    };
};

/**
 * Create a new card in a column
 * @param {string} columnId - Column ID
 * @param {string} subject - Card subject/title
 * @param {string} requestId - Optional client request ID
 * @param {string} clientId - Optional client window ID
 * @returns {Function} Thunk function
 */
export const createCardAsync = (
    columnId,
    subject,
    requestId = null,
    clientId = null
) => {
    return async (dispatch, getState) => {
        const state = getState();
        const column = findColumn(state, columnId);

        if (!column) {
            throw new Error('Column not found');
        }

        const cards = column.cards || [];

        // Calculate position at end of column
        const { previousPosition } = calculateCardPosition(
            cards,
            null,
            cards.length
        );

        // Build request params
        const params = {
            columnId,
            subject: subject || 'New Card',
            previousCardPosition: previousPosition,
            nextCardPosition: null
        };

        if (requestId) {
            params.clientRequestId = requestId;
        }

        if (clientId) {
            params.clientId = clientId;
        }

        try {
            // Call server
            const newCard = await createCardApex(params);

            // Add to local state
            dispatch(addCard(newCard, columnId));

            return {
                success: true,
                card: newCard
            };
        } catch (error) {
            console.error('Error creating card:', error);
            throw error;
        }
    };
};

/**
 * Update a card with optimistic updates
 * @param {string} cardId - Card ID to update
 * @param {Object} updates - Field updates to apply
 * @param {string} clientId - Optional client window ID
 * @returns {Function} Thunk function
 */
export const updateCardAsync = (cardId, updates, clientId = null) => {
    return async (dispatch) => {
        // Optimistically update local state immediately
        dispatch(updateCardAction(cardId, updates));

        // Build request params
        const params = {
            cardId,
            updates
        };

        if (clientId) {
            params.clientId = clientId;
        }

        try {
            // Call server to persist changes
            const updatedCard = await updateCardApex(params);

            // Server returns the full card, we could dispatch another update
            // if we want to ensure server state matches, but optimistic update
            // should be sufficient for now

            return {
                success: true,
                card: updatedCard
            };
        } catch (error) {
            console.error('Error updating card:', error);
            // TODO: Consider reverting optimistic update on error
            throw error;
        }
    };
};

/**
 * Create a new backlog card (not assigned to any column)
 * @param {string} boardId - Board ID
 * @param {Object} cardData - Card data { subject, cardType, priority, storyPoints }
 * @returns {Function} Thunk function
 */
export const createBacklogCardAsync = (boardId, cardData) => {
    return async (dispatch) => {
        try {
            const newCard = await createBacklogCardApex({
                boardId,
                subject: cardData.subject || 'New Card',
                cardType: cardData.cardType || null,
                priority: cardData.priority || null,
                storyPoints: cardData.storyPoints || null
            });

            dispatch(addBacklogCard(newCard));

            return {
                success: true,
                card: newCard
            };
        } catch (error) {
            console.error('Error creating backlog card:', error);
            throw error;
        }
    };
};

/**
 * Update a backlog card
 * @param {string} cardId - Card ID to update
 * @param {Object} updates - Field updates
 * @returns {Function} Thunk function
 */
export const updateBacklogCardAsync = (cardId, updates) => {
    return async (dispatch) => {
        // Optimistic update
        dispatch(updateBacklogCard(cardId, updates));

        try {
            await updateCardApex({ cardId, updates });
            return { success: true };
        } catch (error) {
            console.error('Error updating backlog card:', error);
            throw error;
        }
    };
};

/**
 * Delete multiple backlog cards
 * @param {Array<string>} cardIds - Card IDs to delete
 * @returns {Function} Thunk function
 */
export const deleteBacklogCardsAsync = (cardIds) => {
    return async (dispatch) => {
        try {
            const promises = cardIds.map((cardId) =>
                deleteCardApex({ cardId }).then(() => {
                    dispatch(removeBacklogCard(cardId));
                })
            );
            await Promise.all(promises);
            return { success: true };
        } catch (error) {
            console.error('Error deleting backlog cards:', error);
            throw error;
        }
    };
};

/**
 * Delete a card
 * @param {string} cardId - Card ID to delete
 * @returns {Function} Thunk function
 */
export const deleteCardAsync = (cardId) => {
    return async (dispatch) => {
        try {
            // Call server first for delete (not optimistic)
            await deleteCardApex({ cardId });

            // Update local state after successful delete
            dispatch(deleteCardAction(cardId));

            return {
                success: true
            };
        } catch (error) {
            console.error('Error deleting card:', error);
            throw error;
        }
    };
};

/**
 * Reorder a backlog card and persist the new position to the server.
 * Guards against concurrent data reloads overwriting the optimistic state.
 * On failure, reverts the backlog to its pre-reorder order.
 *
 * @param {string} cardId - Card ID to reorder
 * @param {number} newIndex - New index in the backlog list
 * @returns {Function} Thunk function
 */
export const reorderBacklogCardAsync = (cardId, newIndex) => {
    return async (dispatch, getState) => {
        // Snapshot the current backlog so we can revert on error
        const previousCards = getState().backlogCards || [];

        // Optimistic local reorder + mark as syncing to guard against reloads
        dispatch(reorderBacklog(cardId, newIndex));
        dispatch(setBacklogSyncing(true));

        try {
            // Get the reordered backlog to find neighboring positions
            const state = getState();
            const cards = state.backlogCards || [];
            const idx = cards.findIndex((c) => c.Id === cardId);
            if (idx === -1) {
                dispatch(setBacklogSyncing(false));
                return { success: true };
            }

            const previousCardPosition =
                idx > 0 ? cards[idx - 1].position : null;
            const nextCardPosition =
                idx < cards.length - 1 ? cards[idx + 1].position : null;

            const newPosition = await reorderBacklogCardApex({
                cardId,
                previousCardPosition,
                nextCardPosition
            });

            // Update the card's local position to reflect server state so
            // subsequent reorders use the correct neighbor positions
            if (newPosition) {
                dispatch(updateBacklogCard(cardId, { position: newPosition }));
            }

            return { success: true };
        } catch (error) {
            console.error('Error reordering backlog card:', error);
            // Clear syncing FIRST so the setBacklogCards dispatch isn't blocked
            dispatch(setBacklogSyncing(false));
            // Revert to the pre-reorder order so UI matches server
            dispatch(setBacklogCards(previousCards));
            throw error;
        } finally {
            dispatch(setBacklogSyncing(false));
        }
    };
};
