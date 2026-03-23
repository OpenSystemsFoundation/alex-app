/**
 * Redux Reducers
 *
 * Pure functions that handle state transitions. Each reducer takes
 * the current state and an action, and returns a new state.
 *
 * Domain reducers are split into individual files under ./reducers/
 * and composed here via rootReducer.
 *
 * @module reducers
 */

import * as types from '../core/actionTypes';
import { boardReducer } from './reducers/boardReducer';
import { columnsReducer } from './reducers/columnsReducer';
import { cardsReducer } from './reducers/cardsReducer';
import { dragReducer } from './reducers/dragReducer';
import { appStateReducer } from './reducers/appStateReducer';
import { syncReducer } from './reducers/syncReducer';
import { sprintReducer } from './reducers/sprintReducer';
import { backlogReducer } from './reducers/backlogReducer';
import {
    designReducer,
    initialDesignState
} from './reducers/designReducer';

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
    pollingUpdateDetected: null,
    // Sprint state
    activeSprint: null,
    sprints: [],
    backlogCards: [],
    backlogSyncing: false, // true while a backlog reorder is in-flight
    sprintCards: [],
    planningSprintCards: [], // SprintCard junctions for Planning sprints
    backlogVisible: false,
    selectedBacklogCards: [],
    // Epic state
    epicSummaries: [],
    // Design Thinking state
    design: { ...initialDesignState }
};

// Re-export all domain reducers for direct import (used by tests)
export {
    boardReducer,
    columnsReducer,
    cardsReducer,
    dragReducer,
    appStateReducer,
    syncReducer,
    sprintReducer,
    backlogReducer,
    designReducer
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

    // Sprint actions
    newState = sprintReducer(newState, action);

    // Backlog actions
    newState = backlogReducer(newState, action);

    // Design Thinking actions (nested state slice)
    if (action.type?.startsWith('design/')) {
        newState = {
            ...newState,
            design: designReducer(newState.design, action)
        };
    }

    // Drag actions (special handling for lastDragPosition)
    const dragResult = dragReducer(newState, action, lastDragPosition);
    newState = dragResult.state;
    const newLastDragPosition = dragResult.lastDragPosition;

    return { state: newState, lastDragPosition: newLastDragPosition };
};
