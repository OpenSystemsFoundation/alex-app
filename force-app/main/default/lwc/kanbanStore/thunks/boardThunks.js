/**
 * Board Thunks
 *
 * Async action creators for board operations.
 * Thunks handle server communication and complex state updates.
 *
 * @module boardThunks
 */

import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import getBacklogCardsApex from '@salesforce/apex/KanbanBoardController.getBacklogCards';
import { setBoard, setColumns, setBacklogCards } from '../state/actions';
import { processColumnsData, processCardsData } from '../utils/dataProcessors';
import { loadSprintDataAsync } from './sprintThunks';

/**
 * Load board data from server
 * @param {string} boardId - Board ID to load
 * @returns {Function} Thunk function
 */
export const loadBoardData = (boardId) => {
    return async (dispatch) => {
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        try {
            const data = await getBoardData({ boardId });

            // Dispatch board update
            dispatch(setBoard(data.board));

            // Process and dispatch columns with cards
            const columns = processColumnsData(data.columns || []);
            const processedColumns = processCardsData(
                data.cards || [],
                columns
            );

            dispatch(setColumns(processedColumns));

            // Load sprint data or backlog cards depending on board type
            if (data.board && data.board.type === 'Sprint') {
                try {
                    await dispatch(loadSprintDataAsync(boardId));
                } catch (sprintError) {
                    console.error('Error loading sprint data:', sprintError);
                }
            } else {
                // Non-sprint boards: load backlog cards (unassigned cards)
                try {
                    const backlogCards = await getBacklogCardsApex({ boardId });
                    dispatch(setBacklogCards(backlogCards));
                } catch (backlogError) {
                    console.error(
                        'Error loading backlog cards:',
                        backlogError
                    );
                }
            }

            return {
                success: true,
                board: data.board,
                columns: processedColumns
            };
        } catch (error) {
            console.error('Error loading board data:', error);
            throw error;
        }
    };
};
