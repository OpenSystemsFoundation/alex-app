/**
 * Kanban Store - Redux-Style State Management
 *
 * A modular, Redux-inspired state management solution for Kanban boards.
 * Organized into separate concerns following Redux best practices:
 *
 * Architecture:
 * - core/store.js: Store implementation (dispatch, subscribe, getState)
 * - core/actionTypes.js: Action type constants (centralized type definitions)
 * - state/actions.js: Action creators (pure functions that create action objects)
 * - state/reducers.js: Reducers (pure functions that calculate new state)
 * - state/selectors.js: Selectors (pure functions that extract/derive data from state)
 * - utils/stateHelpers.js: Helper functions for state transformations
 * - middleware/: Middleware for extending dispatch behavior
 * - middleware/devToolsMiddleware.js: Action history, time-travel, undo/redo
 * - devtools/devToolsBridge.js: Chrome DevTools console integration
 * - thunks/: Async action creators for server operations
 *
 * Usage:
 *   import { createStore } from 'c/kanbanStore';
 *   import * as actions from 'c/kanbanStore';
 *   import * as thunks from 'c/kanbanStore';
 *
 *   const store = createStore(); // DevTools enabled by default
 *   store.dispatch(actions.setBoard(boardData));
 *   store.dispatch(thunks.loadBoardData(boardId));
 *   const unsubscribe = store.subscribe((state) => { ... });
 *
 *   // Chrome DevTools (open console):
 *   //   __KANBAN_DEVTOOLS__.help()   — list all commands
 *   //   __KANBAN_DEVTOOLS__.undo()   — undo last action
 *   //   __KANBAN_DEVTOOLS__.history() — view action log
 *
 * @module kanbanStore
 */

// Re-export everything from the modular structure
export { createStore, KanbanStore } from './core/store';
export * from './state/actions';
export { enrichCardData, setCardTypeIconMap } from './utils/dataProcessors';

// Direct exports for convenience
export { loadBoardData } from './thunks/boardThunks';
export {
    moveCardAsync,
    createCardAsync,
    updateCardAsync,
    deleteCardAsync,
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    reorderBacklogCardAsync
} from './thunks/cardThunks';
export {
    loadSprintDataAsync,
    createSprintAsync,
    startSprintAsync,
    completeSprintAsync,
    addCardsToSprintAsync,
    removeCardFromSprintAsync,
    moveCardToBacklogAsync,
    moveCardsToSprintAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync,
    loadBurndownDataAsync,
    loadVelocityDataAsync
} from './thunks/sprintThunks';
export {
    loadCycleTimeAnalyticsAsync,
    loadCumulativeFlowDataAsync
} from './thunks/analyticsThunks';

// Undo/Redo exports
export { createUndoManager } from './undo/undoManager';
export { getUndoableAction, isUndoable } from './undo/undoableActions';
export { createUndoMiddleware } from './middleware/undoMiddleware';

// Re-export modules for consumers who want organized imports
import * as actions from './state/actions';
import * as types from './core/actionTypes';
import * as selectors from './state/selectors';
import * as thunks from './thunks/boardThunks';
import * as cardThunks from './thunks/cardThunks';
import * as sprintThunks from './thunks/sprintThunks';
import * as analyticsThunks from './thunks/analyticsThunks';

export {
    actions,
    types,
    selectors,
    thunks,
    cardThunks,
    sprintThunks,
    analyticsThunks
};
