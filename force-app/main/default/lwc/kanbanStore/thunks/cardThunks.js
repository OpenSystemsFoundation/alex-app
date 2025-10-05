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
import {
    addCard,
    moveCard as moveCardAction,
    commitDrag
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
export const createCardAsync = (columnId, subject, requestId = null, clientId = null) => {
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
