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
import addCardsToSprintApex from '@salesforce/apex/KanbanBoardController.addCardsToSprint';
import removeCardFromSprintApex from '@salesforce/apex/KanbanBoardController.removeCardFromSprint';
import getBurndownDataApex from '@salesforce/apex/KanbanBoardController.getBurndownData';
import getVelocityDataApex from '@salesforce/apex/KanbanBoardController.getVelocityData';
import {
    setSprint,
    setSprints,
    setSprintCards,
    setBacklogCards,
    removeBacklogCard
} from '../state/actions';

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
