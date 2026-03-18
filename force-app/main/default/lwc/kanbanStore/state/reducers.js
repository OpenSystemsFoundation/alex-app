/**
 * Redux Reducers
 *
 * Pure functions that handle state transitions. Each reducer takes
 * the current state and an action, and returns a new state.
 *
 * @module reducers
 */

import * as types from '../core/actionTypes';
import {
    calculateDragState,
    moveCardInState,
    addCardToState,
    updateCardInState,
    deleteCardFromState
} from '../utils/stateHelpers';

/**
 * Initial state structure
 */
export const initialState = {
    columns: [],
    board: null,
    boardId: null,
    dragState: null,
    isDragging: false,
    dragSource: null,
    // Loading & error state
    isLoading: false,
    error: null,
    subscriptionStatus: 'disconnected',
    // Sync state tracking
    syncState: 'idle', // 'idle' | 'syncing' | 'failed'
    pendingOperations: [],
    lastSyncTime: null,
    lastSyncError: null,
    pollingUpdateDetected: null
};

/**
 * Board reducer - handles board-related actions
 */
export const boardReducer = (state, action) => {
    switch (action.type) {
        case types.SET_BOARD:
            return {
                ...state,
                board: action.payload,
                boardId: action.payload?.Id || null
            };

        case types.SET_BOARD_ID:
            return {
                ...state,
                boardId: action.payload
            };

        default:
            return state;
    }
};

/**
 * Columns reducer - handles column-related actions
 */
export const columnsReducer = (state, action) => {
    switch (action.type) {
        case types.SET_COLUMNS:
        case types.UPDATE_COLUMNS:
            return {
                ...state,
                columns: JSON.parse(JSON.stringify(action.payload))
            };

        default:
            return state;
    }
};

/**
 * Cards reducer - handles card-related actions
 */
export const cardsReducer = (state, action) => {
    switch (action.type) {
        case types.ADD_CARD:
            return {
                ...state,
                columns: addCardToState(
                    state.columns,
                    action.payload.card,
                    action.payload.columnId
                )
            };

        case types.UPDATE_CARD:
            return {
                ...state,
                columns: updateCardInState(
                    state.columns,
                    action.payload.cardId,
                    action.payload.updates
                )
            };

        case types.DELETE_CARD:
            return {
                ...state,
                columns: deleteCardFromState(
                    state.columns,
                    action.payload.cardId
                )
            };

        case types.MOVE_CARD:
            return {
                ...state,
                columns: moveCardInState(
                    state.columns,
                    action.payload.cardId,
                    action.payload.targetColumnId,
                    action.payload.targetIndex
                )
            };

        default:
            return state;
    }
};

/**
 * Drag reducer - handles drag & drop actions
 */
export const dragReducer = (state, action, lastDragPosition) => {
    switch (action.type) {
        case types.START_DRAG:
            if (!state.columns || state.columns.length === 0) {
                return { state, lastDragPosition };
            }
            return {
                state: {
                    ...state,
                    isDragging: true,
                    dragSource: action.payload.source,
                    dragState: JSON.parse(JSON.stringify(state.columns))
                },
                lastDragPosition
            };

        case types.UPDATE_DRAG_POSITION: {
            const newPosKey = `${action.payload.targetColumnId}-${action.payload.targetIndex}`;
            if (lastDragPosition === newPosKey) {
                return { state, lastDragPosition };
            }

            return {
                state: {
                    ...state,
                    dragState: calculateDragState(
                        state,
                        action.payload.targetColumnId,
                        action.payload.targetIndex
                    )
                },
                lastDragPosition: newPosKey
            };
        }

        case types.COMMIT_DRAG:
            return {
                state: {
                    ...state,
                    columns: JSON.parse(JSON.stringify(state.dragState)),
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                },
                lastDragPosition: null
            };

        case types.CANCEL_DRAG:
            return {
                state: {
                    ...state,
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                },
                lastDragPosition: null
            };

        default:
            return { state, lastDragPosition };
    }
};

/**
 * App state reducer - handles loading, error, and subscription status
 */
export const appStateReducer = (state, action) => {
    switch (action.type) {
        case types.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload
            };

        case types.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                isLoading: false
            };

        case types.CLEAR_ERROR:
            return {
                ...state,
                error: null
            };

        case types.SET_SUBSCRIPTION_STATUS:
            return {
                ...state,
                subscriptionStatus: action.payload
            };

        default:
            return state;
    }
};

/**
 * Sync state reducer - handles operation tracking and sync state
 */
export const syncReducer = (state, action) => {
    switch (action.type) {
        case types.SET_SYNC_STATE:
            return {
                ...state,
                syncState: action.payload
            };

        case types.START_OPERATION:
            return {
                ...state,
                syncState: 'syncing',
                pendingOperations: [
                    ...state.pendingOperations,
                    {
                        id: action.payload.id,
                        type: action.payload.type,
                        cardId: action.payload.cardId,
                        startedAt: Date.now()
                    }
                ]
            };

        case types.COMPLETE_OPERATION:
            return {
                ...state,
                syncState:
                    state.pendingOperations.length <= 1 ? 'idle' : 'syncing',
                pendingOperations: state.pendingOperations.filter(
                    (op) => op.id !== action.payload.id
                ),
                lastSyncTime: Date.now(),
                lastSyncError: null
            };

        case types.FAIL_OPERATION:
            return {
                ...state,
                syncState: 'failed',
                pendingOperations: state.pendingOperations.filter(
                    (op) => op.id !== action.payload.id
                ),
                lastSyncError: {
                    operationId: action.payload.id,
                    error: action.payload.error,
                    timestamp: Date.now()
                }
            };

        default:
            return state;
    }
};

/**
 * Root reducer - combines all reducers
 * This is the main reducer that handles all actions
 */
export const rootReducer = (state, action, lastDragPosition) => {
    // Handle reset specially
    if (action.type === types.RESET) {
        return { state: initialState, lastDragPosition: null };
    }

    // Try each reducer in sequence
    let newState = state;

    // Board actions
    newState = boardReducer(newState, action);

    // Column actions
    newState = columnsReducer(newState, action);

    // Card actions
    newState = cardsReducer(newState, action);

    // App state actions (loading, error, subscription)
    newState = appStateReducer(newState, action);

    // Sync state actions
    newState = syncReducer(newState, action);

    // Drag actions (special handling for lastDragPosition)
    const dragResult = dragReducer(newState, action, lastDragPosition);
    newState = dragResult.state;
    const newLastDragPosition = dragResult.lastDragPosition;

    return { state: newState, lastDragPosition: newLastDragPosition };
};
