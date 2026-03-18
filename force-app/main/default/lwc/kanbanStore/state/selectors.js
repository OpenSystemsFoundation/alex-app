/**
 * Redux Selectors
 *
 * Pure functions that extract and derive data from the store state.
 * Selectors provide a clean API for accessing state and can be memoized
 * for performance optimization.
 *
 * @module selectors
 */

/**
 * Get all columns (returns drag preview during drag operations)
 * @param {Object} state - Store state
 * @returns {Array} Columns array
 */
export const getColumns = (state) => {
    if (state.isDragging && state.dragState && Array.isArray(state.dragState)) {
        return state.dragState;
    }
    return state.columns || [];
};

/**
 * Get board object
 * @param {Object} state - Store state
 * @returns {Object|null} Board object or null
 */
export const getBoard = (state) => {
    return state.board || null;
};

/**
 * Get board ID
 * @param {Object} state - Store state
 * @returns {string|null} Board ID or null
 */
export const getBoardId = (state) => {
    return state.boardId || null;
};

/**
 * Find a card by ID across all columns
 * @param {Object} state - Store state
 * @param {string} cardId - Card ID to find
 * @returns {Object|null} Card object or null
 */
export const findCard = (state, cardId) => {
    if (!cardId || !state.columns) return null;

    for (const column of state.columns) {
        const card = column.cards?.find((c) => c.Id === cardId);
        if (card) return card;
    }
    return null;
};

/**
 * Find a column by ID
 * @param {Object} state - Store state
 * @param {string} columnId - Column ID to find
 * @returns {Object|null} Column object or null
 */
export const findColumn = (state, columnId) => {
    if (!columnId || !state.columns) return null;
    return state.columns.find((col) => col.Id === columnId) || null;
};

/**
 * Get all cards in a specific column
 * @param {Object} state - Store state
 * @param {string} columnId - Column ID
 * @returns {Array} Array of cards
 */
export const getCardsByColumn = (state, columnId) => {
    const column = findColumn(state, columnId);
    return column?.cards || [];
};

/**
 * Check if currently dragging
 * @param {Object} state - Store state
 * @returns {boolean} True if drag in progress
 */
export const isDragging = (state) => {
    return state.isDragging || false;
};

/**
 * Get drag source information
 * @param {Object} state - Store state
 * @returns {Object|null} Drag source or null
 */
export const getDragSource = (state) => {
    return state.dragSource || null;
};

/**
 * Get drag state (visual preview)
 * @param {Object} state - Store state
 * @returns {Array|null} Drag state or null
 */
export const getDragState = (state) => {
    return state.dragState || null;
};

/**
 * Get total card count across all columns
 * @param {Object} state - Store state
 * @returns {number} Total card count
 */
export const getTotalCardCount = (state) => {
    if (!state.columns) return 0;
    return state.columns.reduce((sum, col) => sum + (col.cardCount || 0), 0);
};

/**
 * Get column count
 * @param {Object} state - Store state
 * @returns {number} Number of columns
 */
export const getColumnCount = (state) => {
    return state.columns?.length || 0;
};

/**
 * Get cards organized by column ID
 * Returns an object with columnId as key and array of cards as value
 * @param {Object} state - Store state
 * @returns {Object} Cards grouped by column ID
 */
export const getCardsByColumnMap = (state) => {
    const columns = getColumns(state);
    const cardsByColumn = {};

    columns.forEach((column) => {
        cardsByColumn[column.Id] = column.cards || [];
    });

    return cardsByColumn;
};

/**
 * Get enriched columns for UI rendering
 * Includes all computed properties needed for display
 * @param {Object} state - Store state
 * @returns {Array} Enriched columns array
 */
export const getEnrichedColumns = (state) => {
    return getColumns(state);
};

// ===================================================================
// Loading & Error Selectors
// ===================================================================

/**
 * Get loading state
 * @param {Object} state - Store state
 * @returns {boolean} True if loading
 */
export const getIsLoading = (state) => {
    return state.isLoading || false;
};

/**
 * Get error state
 * @param {Object} state - Store state
 * @returns {Object|string|null} Error or null
 */
export const getError = (state) => {
    return state.error || null;
};

/**
 * Get subscription status
 * @param {Object} state - Store state
 * @returns {string} 'connected' | 'connecting' | 'polling' | 'error' | 'disconnected'
 */
export const getSubscriptionStatus = (state) => {
    return state.subscriptionStatus || 'disconnected';
};

// ===================================================================
// Sync State Selectors
// ===================================================================

/**
 * Get current sync state
 * @param {Object} state - Store state
 * @returns {string} 'idle' | 'syncing' | 'failed'
 */
export const getSyncState = (state) => {
    return state.syncState || 'idle';
};

/**
 * Get pending operations
 * @param {Object} state - Store state
 * @returns {Array} Array of pending operations
 */
export const getPendingOperations = (state) => {
    return state.pendingOperations || [];
};

/**
 * Get pending operations for a specific card
 * @param {Object} state - Store state
 * @param {string} cardId - Card ID
 * @returns {Array} Array of pending operations for the card
 */
export const getPendingOperationsForCard = (state, cardId) => {
    return (state.pendingOperations || []).filter((op) => op.cardId === cardId);
};

/**
 * Check if there are any pending operations
 * @param {Object} state - Store state
 * @returns {boolean} True if operations are pending
 */
export const hasPendingOperations = (state) => {
    return (state.pendingOperations || []).length > 0;
};

/**
 * Check if a specific card has pending operations
 * @param {Object} state - Store state
 * @param {string} cardId - Card ID
 * @returns {boolean} True if card has pending operations
 */
export const cardHasPendingOperations = (state, cardId) => {
    return (state.pendingOperations || []).some((op) => op.cardId === cardId);
};

/**
 * Get last sync time
 * @param {Object} state - Store state
 * @returns {number|null} Timestamp of last successful sync or null
 */
export const getLastSyncTime = (state) => {
    return state.lastSyncTime || null;
};

/**
 * Get last sync error
 * @param {Object} state - Store state
 * @returns {Object|null} Error object or null
 */
export const getLastSyncError = (state) => {
    return state.lastSyncError || null;
};

/**
 * Get sync status message for UI display
 * @param {Object} state - Store state
 * @returns {string} Human-readable status message
 */
export const getSyncStatusMessage = (state) => {
    const syncState = getSyncState(state);
    const pendingCount = (state.pendingOperations || []).length;

    switch (syncState) {
        case 'syncing':
            return pendingCount > 1
                ? `Saving ${pendingCount} changes...`
                : 'Saving changes...';
        case 'failed':
            return 'Failed to save changes';
        case 'idle':
            return state.lastSyncTime ? 'All changes saved' : '';
        default:
            return '';
    }
};

// ===================================================================
// Sprint Selectors
// ===================================================================

/**
 * Get the active sprint
 */
export const getActiveSprint = (state) => {
    return state.activeSprint || null;
};

/**
 * Get all sprints
 */
export const getSprints = (state) => {
    return state.sprints || [];
};

/**
 * Get sprint cards
 */
export const getSprintCards = (state) => {
    return state.sprintCards || [];
};

/**
 * Check if this is a sprint board
 */
export const isSprintBoard = (state) => {
    return state.board?.type === 'Sprint';
};

/**
 * Get sprint progress (percentage)
 */
export const getSprintProgress = (state) => {
    const sprint = state.activeSprint;
    if (!sprint || !sprint.totalStoryPoints || sprint.totalStoryPoints === 0) {
        return 0;
    }
    return Math.round(
        ((sprint.completedStoryPoints || 0) / sprint.totalStoryPoints) * 100
    );
};

/**
 * Get days remaining in sprint
 */
export const getSprintDaysRemaining = (state) => {
    const sprint = state.activeSprint;
    if (!sprint?.endDate) return null;

    const endDate = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// ===================================================================
// Backlog Selectors
// ===================================================================

/**
 * Get backlog cards
 */
export const getBacklogCards = (state) => {
    return state.backlogCards || [];
};

/**
 * Check if backlog panel is visible
 */
export const isBacklogVisible = (state) => {
    return state.backlogVisible || false;
};

/**
 * Get selected backlog card IDs
 */
export const getSelectedBacklogCards = (state) => {
    return state.selectedBacklogCards || [];
};

/**
 * Get backlog card count
 */
export const getBacklogCardCount = (state) => {
    return (state.backlogCards || []).length;
};
