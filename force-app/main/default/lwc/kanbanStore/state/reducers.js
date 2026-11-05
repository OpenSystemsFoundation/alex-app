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
    backlogSyncing: 0, // counter: >0 while backlog reorder(s) are in-flight
    backlogVersion: 0, // bumped on every local backlog change (see rootReducer)
    sprintCards: [],
    planningSprintCards: [], // SprintCard junctions for Planning sprints
    backlogVisible: false,
    selectedBacklogCards: [],
    // Epic state
    epicSummaries: []
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
    backlogReducer
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

    // Any local change to the backlog list makes in-flight server loads of
    // the backlog stale; SET_BACKLOG_CARDS compares against this version
    if (
        action.type !== types.SET_BACKLOG_CARDS &&
        newState.backlogCards !== state.backlogCards
    ) {
        newState = {
            ...newState,
            backlogVersion: (state.backlogVersion || 0) + 1
        };
    }

    // Drag actions (special handling for lastDragPosition)
    const dragResult = dragReducer(newState, action, lastDragPosition);
    newState = dragResult.state;
    const newLastDragPosition = dragResult.lastDragPosition;

    return { state: newState, lastDragPosition: newLastDragPosition };
};
