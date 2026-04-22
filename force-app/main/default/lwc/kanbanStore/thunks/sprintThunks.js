/**
 * Sprint Thunks
 *
 * Async action creators for sprint operations.
 *
 * @module sprintThunks
 */

import getSprintDataApex from '@salesforce/apex/KanbanBoardController.getSprintData';
import createSprintApex from '@salesforce/apex/KanbanBoardController.createSprint';
import startSprintApex from '@salesforce/apex/KanbanBoardController.startSprint';
import completeSprintApex from '@salesforce/apex/KanbanBoardController.completeSprint';
import deleteSprintApex from '@salesforce/apex/KanbanBoardController.deleteSprint';
import reorderSprintApex from '@salesforce/apex/KanbanBoardController.reorderSprint';
import addCardsToSprintApex from '@salesforce/apex/KanbanBoardController.addCardsToSprint';
import removeCardFromSprintApex from '@salesforce/apex/KanbanBoardController.removeCardFromSprint';
import getBurndownDataApex from '@salesforce/apex/KanbanBoardController.getBurndownData';
import getVelocityDataApex from '@salesforce/apex/KanbanBoardController.getVelocityData';
import updateCardApex from '@salesforce/apex/KanbanBoardController.updateCard';
import moveCardApex from '@salesforce/apex/KanbanBoardController.moveCard';
import {
    setSprint,
    setSprints,
    setSprintCards,
    setBacklogCards,
    removeBacklogCard,
    moveCardToBacklog,
    deleteCard,
    addCard,
    setPlanningSprintCards,
    addPlanningSprintCard,
    removePlanningSprintCard,
    deleteSprint,
    reorderSprints
} from '../state/actions';
import { findColumn } from '../state/selectors';
import { calculateCardPosition } from '../utils/positionCalculator';

/**
 * Load sprint data for a board
 */
export const loadSprintDataAsync = (boardId) => {
    return async (dispatch) => {
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        try {
            const data = await getSprintDataApex({ boardId });

            if (data.activeSprint) {
                dispatch(setSprint(data.activeSprint));
            }
            if (data.sprints) {
                dispatch(setSprints(data.sprints));
            }
            if (data.sprintCards) {
                dispatch(setSprintCards(data.sprintCards));
            }
            if (data.backlogCards) {
                dispatch(setBacklogCards(data.backlogCards));
            }
            if (data.planningSprintCards) {
                dispatch(setPlanningSprintCards(data.planningSprintCards));
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error loading sprint data:', error);
            throw error;
        }
    };
};

/**
 * Create a new sprint
 */
export const createSprintAsync = (boardId, goal, startDate, endDate) => {
    return async (dispatch, getState) => {
        try {
            const sprint = await createSprintApex({
                boardId,
                goal,
                startDate,
                endDate
            });

            // Add to sprints list
            const state = getState();
            const sprints = [...(state.sprints || []), sprint];
            dispatch(setSprints(sprints));

            return { success: true, sprint };
        } catch (error) {
            console.error('Error creating sprint:', error);
            throw error;
        }
    };
};

/**
 * Start a sprint
 */
export const startSprintAsync = (sprintId) => {
    return async (dispatch) => {
        try {
            const sprint = await startSprintApex({ sprintId });
            dispatch(setSprint(sprint));

            return { success: true, sprint };
        } catch (error) {
            console.error('Error starting sprint:', error);
            throw error;
        }
    };
};

/**
 * Complete a sprint
 */
export const completeSprintAsync = (sprintId, dispositions) => {
    return async (dispatch) => {
        try {
            const sprint = await completeSprintApex({
                sprintId,
                dispositions
            });

            dispatch(setSprint(null));
            // Update sprint in list
            dispatch(setSprints([])); // Will be reloaded

            return { success: true, sprint };
        } catch (error) {
            console.error('Error completing sprint:', error);
            throw error;
        }
    };
};

/**
 * Delete a sprint (Planning status only)
 */
export const deleteSprintAsync = (sprintId) => {
    return async (dispatch) => {
        try {
            await deleteSprintApex({ sprintId });
            dispatch(deleteSprint(sprintId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting sprint:', error);
            throw error;
        }
    };
};

/**
 * Reorder a sprint (move up or down)
 * @param {string} sprintId - Sprint ID
 * @param {string} direction - 'up' or 'down'
 */
export const reorderSprintAsync = (sprintId, direction) => {
    return async (dispatch, getState) => {
        // Optimistic: swap in local state
        const state = getState();
        const sprints = [...(state.sprints || [])];
        const currentIndex = sprints.findIndex((s) => s.Id === sprintId);
        if (currentIndex < 0) return { success: false };

        const targetIndex =
            direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sprints.length) {
            return { success: false };
        }

        // Swap
        const temp = sprints[currentIndex];
        sprints[currentIndex] = sprints[targetIndex];
        sprints[targetIndex] = temp;
        dispatch(reorderSprints(sprints));

        try {
            const updatedSprints = await reorderSprintApex({
                sprintId,
                direction
            });
            dispatch(reorderSprints(updatedSprints));
            return { success: true };
        } catch (error) {
            console.error('Error reordering sprint:', error);
            // Rollback
            dispatch(reorderSprints(state.sprints));
            throw error;
        }
    };
};

/**
 * Add cards to sprint
 */
export const addCardsToSprintAsync = (sprintId, cardIds) => {
    return async (dispatch) => {
        try {
            const sprintCards = await addCardsToSprintApex({
                sprintId,
                cardIds
            });

            dispatch(setSprintCards(sprintCards));

            // Remove added cards from backlog
            for (const cardId of cardIds) {
                dispatch(removeBacklogCard(cardId));
            }

            return { success: true, sprintCards };
        } catch (error) {
            console.error('Error adding cards to sprint:', error);
            throw error;
        }
    };
};

/**
 * Remove a card from sprint
 */
export const removeCardFromSprintAsync = (sprintId, cardId) => {
    return async (dispatch, getState) => {
        try {
            await removeCardFromSprintApex({ sprintId, cardId });

            // Remove from sprint cards
            const state = getState();
            const updatedCards = (state.sprintCards || []).filter(
                (sc) => sc.cardId !== cardId
            );
            dispatch(setSprintCards(updatedCards));

            return { success: true };
        } catch (error) {
            console.error('Error removing card from sprint:', error);
            throw error;
        }
    };
};

/**
 * Load burndown data
 */
export const loadBurndownDataAsync = (sprintId) => {
    return async () => {
        try {
            const data = await getBurndownDataApex({ sprintId });
            return { success: true, data };
        } catch (error) {
            console.error('Error loading burndown data:', error);
            throw error;
        }
    };
};

/**
 * Load velocity data
 */
export const loadVelocityDataAsync = (boardId, count = 10) => {
    return async () => {
        try {
            const data = await getVelocityDataApex({ boardId, count });
            return { success: true, data };
        } catch (error) {
            console.error('Error loading velocity data:', error);
            throw error;
        }
    };
};

/**
 * Move a card from the board back to the backlog.
 * Clears the card's column assignment on the server and removes the sprint junction.
 * @param {string} sprintId - Active sprint ID (or null if no sprint)
 * @param {string} cardId - Card ID to move
 * @returns {Function} Thunk function
 */
export const moveCardToBacklogAsync = (sprintId, cardId) => {
    return async (dispatch, getState) => {
        // Optimistic: move card to backlog state and remove from columns
        dispatch(moveCardToBacklog(cardId));
        dispatch(deleteCard(cardId));

        try {
            // Clear column assignment on server
            await updateCardApex({
                cardId,
                updates: { columnId: null }
            });

            // Remove from sprint if applicable
            if (sprintId) {
                await removeCardFromSprintApex({ sprintId, cardId });

                const state = getState();
                const updatedCards = (state.sprintCards || []).filter(
                    (sc) => sc.cardId !== cardId
                );
                dispatch(setSprintCards(updatedCards));
            }

            return { success: true };
        } catch (error) {
            console.error('Error moving card to backlog:', error);
            throw error;
        }
    };
};

/**
 * Add cards to a planning sprint in the backlog.
 * Creates sprint junctions but keeps cards in the backlog (no column assignment).
 * @param {string} sprintId - Planning Sprint ID
 * @param {Array<string>} cardIds - Card IDs to add
 * @returns {Function} Thunk function
 */
export const addCardsToBacklogSprintAsync = (sprintId, cardIds) => {
    return async (dispatch) => {
        try {
            await addCardsToSprintApex({ sprintId, cardIds });

            // Add planning sprint card associations to local state
            for (const cardId of cardIds) {
                dispatch(
                    addPlanningSprintCard({
                        sprintId,
                        cardId,
                        position: null
                    })
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error adding cards to backlog sprint:', error);
            throw error;
        }
    };
};

/**
 * Remove a card from a planning sprint in the backlog.
 * Removes the sprint junction but keeps the card in the backlog.
 * @param {string} sprintId - Planning Sprint ID
 * @param {string} cardId - Card ID to remove
 * @returns {Function} Thunk function
 */
export const removeCardFromBacklogSprintAsync = (sprintId, cardId) => {
    return async (dispatch) => {
        try {
            await removeCardFromSprintApex({ sprintId, cardId });
            dispatch(removePlanningSprintCard(cardId, sprintId));

            return { success: true };
        } catch (error) {
            console.error('Error removing card from backlog sprint:', error);
            throw error;
        }
    };
};

/**
 * Move cards from the backlog to the sprint board.
 * Creates sprint junctions AND assigns cards to the first column.
 * @param {string} sprintId - Sprint ID
 * @param {Array<string>} cardIds - Card IDs to add
 * @returns {Function} Thunk function
 */
export const moveCardsToSprintAsync = (sprintId, cardIds) => {
    return async (dispatch, getState) => {
        try {
            // Capture card data from backlog before removing
            let state = getState();
            const backlogCards = state.backlogCards || [];
            const cardDataMap = {};
            for (const cardId of cardIds) {
                const card = backlogCards.find((c) => c.Id === cardId);
                if (card) {
                    cardDataMap[cardId] = card;
                }
            }

            // Add to sprint (creates junction records)
            const sprintCards = await addCardsToSprintApex({
                sprintId,
                cardIds
            });
            dispatch(setSprintCards(sprintCards));

            // Remove from backlog state
            for (const cardId of cardIds) {
                dispatch(removeBacklogCard(cardId));
            }

            // Assign each card to the first column so it appears on the board
            state = getState();
            const columns = state.columns || [];
            if (columns.length > 0) {
                const firstColumnId = columns[0].Id;

                for (const cardId of cardIds) {
                    const targetColumn = findColumn(getState(), firstColumnId);
                    const cards = targetColumn?.cards || [];
                    const targetIndex = cards.length;
                    const { previousPosition, nextPosition } =
                        calculateCardPosition(cards, cardId, targetIndex);

                    const params = {
                        cardId,
                        targetColumnId: firstColumnId,
                        previousCardPosition: previousPosition,
                        nextCardPosition: nextPosition
                    };

                    // eslint-disable-next-line no-await-in-loop
                    await moveCardApex(params);

                    // Add card to column in local state
                    const cardData = cardDataMap[cardId] || { Id: cardId };
                    dispatch(addCard(cardData, firstColumnId));
                }
            }

            return { success: true, sprintCards };
        } catch (error) {
            console.error('Error moving cards to sprint:', error);
            throw error;
        }
    };
};
