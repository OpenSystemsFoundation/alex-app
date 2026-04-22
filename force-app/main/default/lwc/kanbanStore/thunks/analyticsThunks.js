/**
 * Analytics Thunks
 *
 * Async action creators for analytics operations (cycle time, cumulative flow).
 *
 * @module analyticsThunks
 */

import getCycleTimeAnalyticsApex from '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics';
import getCumulativeFlowDataApex from '@salesforce/apex/KanbanBoardController.getCumulativeFlowData';

/**
 * Load cycle time analytics for a board
 * @param {string} boardId - Board ID
 * @param {number} daysBack - Number of days to look back
 * @returns {Function} Thunk function
 */
export const loadCycleTimeAnalyticsAsync = (boardId, daysBack = 30) => {
    return async () => {
        try {
            const data = await getCycleTimeAnalyticsApex({ boardId, daysBack });
            return { success: true, data };
        } catch (error) {
            console.error('Error loading cycle time analytics:', error);
            throw error;
        }
    };
};

/**
 * Load cumulative flow data for a board
 * @param {string} boardId - Board ID
 * @param {number} daysBack - Number of days to look back
 * @returns {Function} Thunk function
 */
export const loadCumulativeFlowDataAsync = (boardId, daysBack = 30) => {
    return async () => {
        try {
            const data = await getCumulativeFlowDataApex({ boardId, daysBack });
            return { success: true, data };
        } catch (error) {
            console.error('Error loading cumulative flow data:', error);
            throw error;
        }
    };
};
