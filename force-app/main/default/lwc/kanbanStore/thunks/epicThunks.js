/**
 * Epic Thunks - Async action creators for Epic management
 *
 * @module epicThunks
 */

import { setEpicSummaries } from '../state/actions';
import { setEpicSummaryMap } from '../utils/dataProcessors';
import getEpicSummaries from '@salesforce/apex/KanbanBoardController.getEpicSummaries';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';

/**
 * Load epic summaries for a board
 * @param {string} boardId - Board ID
 * @returns {Function} Thunk function
 */
export const loadEpicSummariesAsync = (boardId) => {
    return async (dispatch) => {
        try {
            const summaries = await getEpicSummaries({ boardId });
            setEpicSummaryMap(summaries || []);
            dispatch(setEpicSummaries(summaries || []));
            return summaries;
        } catch (error) {
            // Non-critical — log but don't propagate
            // eslint-disable-next-line no-console
            console.warn('Failed to load epic summaries:', error);
            return [];
        }
    };
};

/**
 * Load detailed epic data with child cards
 * @param {string} epicId - Epic card ID
 * @returns {Function} Thunk function returning the EpicSummaryDTO
 */
export const loadEpicDetailAsync = (epicId) => {
    return async () => {
        const detail = await getEpicDetail({ epicId });
        return detail;
    };
};
