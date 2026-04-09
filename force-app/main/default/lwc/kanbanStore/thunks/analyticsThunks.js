/**
 * Analytics Thunks (stub)
 *
 * Analytics features (cycle time, cumulative flow) are available in Alexandra (paid).
 *
 * @module analyticsThunks
 */

/**
 * Load cycle time analytics for a board (not available in OSS)
 */
export const loadCycleTimeAnalyticsAsync = () => {
    return async () => {
        return { success: false, data: null };
    };
};

/**
 * Load cumulative flow data for a board (not available in OSS)
 */
export const loadCumulativeFlowDataAsync = () => {
    return async () => {
        return { success: false, data: null };
    };
};
