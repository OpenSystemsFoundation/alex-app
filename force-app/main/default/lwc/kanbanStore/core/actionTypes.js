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
