/**
 * Redux Action Creators
 *
 * Pure functions that create action objects. These provide a clean API
 * for dispatching actions and ensure consistent action structure.
 *
 * @module actions
 */

import * as types from '../core/actionTypes';

// ===================================================================
// Board Action Creators
// ===================================================================

/**
 * Set the entire board object
 * @param {Object} board - Board object with Id, Name, etc.
 * @returns {Object} Action object
 */
export const setBoard = (board) => ({
    type: types.SET_BOARD,
    payload: board
});

/**
 * Set just the board ID
 * @param {string} boardId - Board ID
 * @returns {Object} Action object
 */
export const setBoardId = (boardId) => ({
    type: types.SET_BOARD_ID,
    payload: boardId
});

// ===================================================================
// Column Action Creators
// ===================================================================

/**
 * Set/replace all columns
 * @param {Array} columns - Array of column objects
 * @returns {Object} Action object
 */
export const setColumns = (columns) => ({
    type: types.SET_COLUMNS,
    payload: columns
});

/**
 * Update columns (alias for setColumns)
 * @param {Array} columns - Array of column objects
 * @returns {Object} Action object
 */
export const updateColumns = (columns) => ({
    type: types.UPDATE_COLUMNS,
    payload: columns
});

// ===================================================================
// Card Action Creators
// ===================================================================

/**
 * Add a new card to a column
 * @param {Object} card - Card object
 * @param {string} columnId - Target column ID
 * @returns {Object} Action object
 */
export const addCard = (card, columnId) => ({
    type: types.ADD_CARD,
    payload: { card, columnId }
});

/**
 * Update an existing card
 * @param {string} cardId - Card ID to update
 * @param {Object} updates - Partial card updates
 * @returns {Object} Action object
 */
export const updateCard = (cardId, updates) => ({
    type: types.UPDATE_CARD,
    payload: { cardId, updates }
});

/**
 * Delete a card
 * @param {string} cardId - Card ID to delete
 * @returns {Object} Action object
 */
export const deleteCard = (cardId) => ({
    type: types.DELETE_CARD,
    payload: { cardId }
});

/**
 * Move a card to a new position
 * @param {string} cardId - Card ID
 * @param {string} targetColumnId - Target column ID
 * @param {number} targetIndex - Target index in column
 * @returns {Object} Action object
 */
export const moveCard = (cardId, targetColumnId, targetIndex) => ({
    type: types.MOVE_CARD,
    payload: { cardId, targetColumnId, targetIndex }
});

// ===================================================================
// Drag & Drop Action Creators
// ===================================================================

/**
 * Start a drag operation
 * @param {Object} source - Drag source { cardId, columnId, cardIndex }
 * @returns {Object} Action object
 */
export const startDrag = (source) => ({
    type: types.START_DRAG,
    payload: { source }
});

/**
 * Update drag position (visual placeholder)
 * @param {string} targetColumnId - Target column ID
 * @param {number} targetIndex - Target index
 * @returns {Object} Action object
 */
export const updateDragPosition = (targetColumnId, targetIndex) => ({
    type: types.UPDATE_DRAG_POSITION,
    payload: { targetColumnId, targetIndex }
});

/**
 * Commit drag operation (apply changes)
 * @returns {Object} Action object
 */
export const commitDrag = () => ({
    type: types.COMMIT_DRAG
});

/**
 * Cancel drag operation (revert to original state)
 * @returns {Object} Action object
 */
export const cancelDrag = () => ({
    type: types.CANCEL_DRAG
});

// ===================================================================
// Store Action Creators
// ===================================================================

/**
 * Reset store to initial state
 * @returns {Object} Action object
 */
export const reset = () => ({
    type: types.RESET
});

// ===================================================================
// Loading & Error Action Creators
// ===================================================================

/**
 * Set loading state
 * @param {boolean} isLoading - Whether the board is loading
 * @returns {Object} Action object
 */
export const setLoading = (isLoading) => ({
    type: types.SET_LOADING,
    payload: isLoading
});

/**
 * Set error state
 * @param {Object|string|null} error - Error object or message
 * @returns {Object} Action object
 */
export const setError = (error) => ({
    type: types.SET_ERROR,
    payload: error
});

/**
 * Clear error state
 * @returns {Object} Action object
 */
export const clearError = () => ({
    type: types.CLEAR_ERROR
});

/**
 * Set subscription status
 * @param {string} status - 'connected' | 'connecting' | 'polling' | 'error' | 'disconnected'
 * @returns {Object} Action object
 */
export const setSubscriptionStatus = (status) => ({
    type: types.SET_SUBSCRIPTION_STATUS,
    payload: status
});

// ===================================================================
// Sync State Action Creators
// ===================================================================

/**
 * Set overall sync state
 * @param {string} state - 'idle' | 'syncing' | 'failed'
 * @returns {Object} Action object
 */
export const setSyncState = (state) => ({
    type: types.SET_SYNC_STATE,
    payload: state
});

/**
 * Track start of an operation
 * @param {string} id - Operation ID
 * @param {string} type - Operation type (create/update/move/delete)
 * @param {string} cardId - Card ID being operated on
 * @returns {Object} Action object
 */
export const startOperation = (id, type, cardId) => ({
    type: types.START_OPERATION,
    payload: { id, type, cardId }
});

/**
 * Mark operation as completed
 * @param {string} id - Operation ID
 * @returns {Object} Action object
 */
export const completeOperation = (id) => ({
    type: types.COMPLETE_OPERATION,
    payload: { id }
});

/**
 * Mark operation as failed
 * @param {string} id - Operation ID
 * @param {Error} error - Error that occurred
 * @returns {Object} Action object
 */
export const failOperation = (id, error) => ({
    type: types.FAIL_OPERATION,
    payload: { id, error }
});

// ===================================================================
// Sprint Action Creators
// ===================================================================

export const setSprint = (sprint) => ({
    type: types.SET_SPRINT,
    payload: sprint
});

export const setSprints = (sprints) => ({
    type: types.SET_SPRINTS,
    payload: sprints
});

export const updateSprint = (sprintId, updates) => ({
    type: types.UPDATE_SPRINT,
    payload: { sprintId, updates }
});

export const deleteSprint = (sprintId) => ({
    type: types.DELETE_SPRINT,
    payload: { sprintId }
});

export const reorderSprints = (sprints) => ({
    type: types.REORDER_SPRINTS,
    payload: sprints
});

// ===================================================================
// Backlog Action Creators
// ===================================================================

export const setBacklogCards = (cards) => ({
    type: types.SET_BACKLOG_CARDS,
    payload: cards
});

export const addBacklogCard = (card) => ({
    type: types.ADD_BACKLOG_CARD,
    payload: card
});

export const removeBacklogCard = (cardId) => ({
    type: types.REMOVE_BACKLOG_CARD,
    payload: { cardId }
});

export const updateBacklogCard = (cardId, updates) => ({
    type: types.UPDATE_BACKLOG_CARD,
    payload: { cardId, updates }
});

export const reorderBacklog = (cardId, newIndex) => ({
    type: types.REORDER_BACKLOG,
    payload: { cardId, newIndex }
});

export const bulkReorderBacklog = (cardIds, position) => ({
    type: types.BULK_REORDER_BACKLOG,
    payload: { cardIds, position }
});

export const bulkReorderBacklogAtIndex = (cardIds, newIndex) => ({
    type: types.BULK_REORDER_BACKLOG_AT_INDEX,
    payload: { cardIds, newIndex }
});

export const setBacklogSyncing = (syncing) => ({
    type: types.SET_BACKLOG_SYNCING,
    payload: syncing
});

// ===================================================================
// Sprint Card Action Creators
// ===================================================================

export const setSprintCards = (sprintCards) => ({
    type: types.SET_SPRINT_CARDS,
    payload: sprintCards
});

export const moveCardToSprint = (cardId, sprintId) => ({
    type: types.MOVE_CARD_TO_SPRINT,
    payload: { cardId, sprintId }
});

export const moveCardToBacklog = (cardId) => ({
    type: types.MOVE_CARD_TO_BACKLOG,
    payload: { cardId }
});

// ===================================================================
// Planning Sprint Card Action Creators
// ===================================================================

export const setPlanningSprintCards = (cards) => ({
    type: types.SET_PLANNING_SPRINT_CARDS,
    payload: cards
});

export const addPlanningSprintCard = (sprintCard) => ({
    type: types.ADD_PLANNING_SPRINT_CARD,
    payload: sprintCard
});

export const removePlanningSprintCard = (cardId, sprintId) => ({
    type: types.REMOVE_PLANNING_SPRINT_CARD,
    payload: { cardId, sprintId }
});

// ===================================================================
// Backlog UI Action Creators
// ===================================================================

export const setBacklogVisible = (visible) => ({
    type: types.SET_BACKLOG_VISIBLE,
    payload: visible
});

export const setSelectedBacklogCards = (cardIds) => ({
    type: types.SET_SELECTED_BACKLOG_CARDS,
    payload: cardIds
});

export const toggleBacklogCardSelection = (cardId) => ({
    type: types.TOGGLE_BACKLOG_CARD_SELECTION,
    payload: { cardId }
});

// ===================================================================
// Epic Action Creators
// ===================================================================

export const setEpicSummaries = (epicSummaries) => ({
    type: types.SET_EPIC_SUMMARIES,
    payload: epicSummaries
});
