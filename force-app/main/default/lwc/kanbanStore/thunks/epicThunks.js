/**
 * Epic Thunks - Async action creators for Epic management
 *
 * @module epicThunks
 */

import { setEpicSummaries, setColumns } from '../state/actions';
import { setEpicSummaryMap, enrichCardData } from '../utils/dataProcessors';
import getEpicSummaries from '@salesforce/apex/KanbanBoardController.getEpicSummaries';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';

/**
 * Load epic summaries for a board
 * @param {string} boardId - Board ID
 * @returns {Function} Thunk function
 */
export const loadEpicSummariesAsync = (boardId) => {
    return async (dispatch, getState) => {
        try {
            const summaries = await getEpicSummaries({ boardId });
            setEpicSummaryMap(summaries || []);
            dispatch(setEpicSummaries(summaries || []));

            // Re-enrich cards so epic progress bars render on initial load
            const state = getState();
            if (state.columns && state.columns.length > 0) {
                const reEnriched = state.columns.map((col) => ({
                    ...col,
                    cards: (col.cards || []).map((card) => enrichCardData(card))
                }));
                dispatch(setColumns(reEnriched));
            }

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
