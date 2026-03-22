/**
 * Redux Action Types
 *
 * Centralized action type constants to prevent typos and enable
 * better IDE autocomplete and refactoring support.
 *
 * @module actionTypes
 */

// Board Actions
export const SET_BOARD = 'SET_BOARD';
export const SET_BOARD_ID = 'SET_BOARD_ID';

// Column Actions
export const SET_COLUMNS = 'SET_COLUMNS';
export const UPDATE_COLUMNS = 'UPDATE_COLUMNS';

// Card Actions
export const ADD_CARD = 'ADD_CARD';
export const UPDATE_CARD = 'UPDATE_CARD';
export const DELETE_CARD = 'DELETE_CARD';
export const MOVE_CARD = 'MOVE_CARD';

// Drag & Drop Actions
export const START_DRAG = 'START_DRAG';
export const UPDATE_DRAG_POSITION = 'UPDATE_DRAG_POSITION';
export const COMMIT_DRAG = 'COMMIT_DRAG';
export const CANCEL_DRAG = 'CANCEL_DRAG';

// Store Actions
export const RESET = 'RESET';

// Loading & Error Actions
export const SET_LOADING = 'SET_LOADING';
export const SET_ERROR = 'SET_ERROR';
export const CLEAR_ERROR = 'CLEAR_ERROR';

// Subscription Status Actions
export const SET_SUBSCRIPTION_STATUS = 'SET_SUBSCRIPTION_STATUS';

// Sync State Actions
export const SET_SYNC_STATE = 'SET_SYNC_STATE';
export const START_OPERATION = 'START_OPERATION';
export const COMPLETE_OPERATION = 'COMPLETE_OPERATION';
export const FAIL_OPERATION = 'FAIL_OPERATION';
export const POLLING_UPDATE_DETECTED = 'POLLING_UPDATE_DETECTED';

// Sprint Actions
export const SET_SPRINT = 'SET_SPRINT';
export const SET_SPRINTS = 'SET_SPRINTS';
export const UPDATE_SPRINT = 'UPDATE_SPRINT';

// Backlog Actions
export const SET_BACKLOG_CARDS = 'SET_BACKLOG_CARDS';
export const ADD_BACKLOG_CARD = 'ADD_BACKLOG_CARD';
export const REMOVE_BACKLOG_CARD = 'REMOVE_BACKLOG_CARD';
export const UPDATE_BACKLOG_CARD = 'UPDATE_BACKLOG_CARD';
export const REORDER_BACKLOG = 'REORDER_BACKLOG';
export const SET_BACKLOG_SYNCING = 'SET_BACKLOG_SYNCING';

// Sprint Card Actions
export const SET_SPRINT_CARDS = 'SET_SPRINT_CARDS';
export const MOVE_CARD_TO_SPRINT = 'MOVE_CARD_TO_SPRINT';
export const MOVE_CARD_TO_BACKLOG = 'MOVE_CARD_TO_BACKLOG';

// Planning Sprint Cards (backlog sprint management)
export const SET_PLANNING_SPRINT_CARDS = 'SET_PLANNING_SPRINT_CARDS';
export const ADD_PLANNING_SPRINT_CARD = 'ADD_PLANNING_SPRINT_CARD';
export const REMOVE_PLANNING_SPRINT_CARD = 'REMOVE_PLANNING_SPRINT_CARD';

// Backlog UI Actions
export const SET_BACKLOG_VISIBLE = 'SET_BACKLOG_VISIBLE';
export const SET_SELECTED_BACKLOG_CARDS = 'SET_SELECTED_BACKLOG_CARDS';
export const TOGGLE_BACKLOG_CARD_SELECTION = 'TOGGLE_BACKLOG_CARD_SELECTION';
