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
