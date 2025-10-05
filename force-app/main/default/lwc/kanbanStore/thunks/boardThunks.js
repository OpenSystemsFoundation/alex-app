/**
 * Board Thunks
 *
 * Async action creators for board operations.
 * Thunks handle server communication and complex state updates.
 *
 * @module boardThunks
 */

import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import { setBoard, setColumns } from '../state/actions';
import { processColumnsData, processCardsData } from '../utils/dataProcessors';

/**
 * Load board data from server
 * @param {string} boardId - Board ID to load
 * @returns {Function} Thunk function
 */
export const loadBoardData = (boardId) => {
    return async (dispatch, getState) => {
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
