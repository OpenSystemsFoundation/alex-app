/**
 * Unit tests for the kanbanStore module entry point (public API surface).
 */
import * as kanbanStore from '../kanbanStore';
import * as storeModule from '../core/store';
import * as actionsModule from '../state/actions';
import * as typesModule from '../core/actionTypes';
import * as selectorsModule from '../state/selectors';
import * as boardThunks from '../thunks/boardThunks';
import * as cardThunks from '../thunks/cardThunks';
import * as sprintThunks from '../thunks/sprintThunks';
import * as analyticsThunks from '../thunks/analyticsThunks';
import * as epicThunks from '../thunks/epicThunks';
import * as columnThunks from '../thunks/columnThunks';
import * as dataProcessors from '../utils/dataProcessors';
import * as undoManagerModule from '../undo/undoManager';
import * as undoableActions from '../undo/undoableActions';
import * as undoMiddleware from '../middleware/undoMiddleware';

// Plain-object copies allow computed lookups by export name.
const publicApi = { ...kanbanStore };
const actionCreators = { ...actionsModule };

describe('kanbanStore entry module', () => {
    it('re-exports the store factory and class', () => {
        expect(kanbanStore.createStore).toBe(storeModule.createStore);
        expect(kanbanStore.KanbanStore).toBe(storeModule.KanbanStore);
    });

    it('re-exports every action creator at the top level', () => {
        const names = Object.keys(actionCreators);
        expect(names.length).toBeGreaterThan(30);
        names.forEach((name) => {
            expect(publicApi[name]).toBe(actionCreators[name]);
        });
        expect(kanbanStore.setBoard({ Id: 'b1' })).toEqual({
            type: typesModule.SET_BOARD,
            payload: { Id: 'b1' }
        });
    });

    it('re-exports data processors', () => {
        expect(kanbanStore.enrichCardData).toBe(dataProcessors.enrichCardData);
        expect(kanbanStore.setCardTypeIconMap).toBe(
            dataProcessors.setCardTypeIconMap
        );
        expect(kanbanStore.setEpicSummaryMap).toBe(
            dataProcessors.setEpicSummaryMap
        );
    });

    it.each([
        ['boardThunks', boardThunks, ['loadBoardData']],
        [
            'cardThunks',
            cardThunks,
            [
                'moveCardAsync',
                'createCardAsync',
                'updateCardAsync',
                'deleteCardAsync',
                'createBacklogCardAsync',
                'updateBacklogCardAsync',
                'deleteBacklogCardsAsync',
                'reorderBacklogCardAsync',
                'bulkMoveBacklogCardsAsync',
                'bulkReorderBacklogCardsAtIndexAsync'
            ]
        ],
        [
            'sprintThunks',
            sprintThunks,
            [
                'loadSprintDataAsync',
                'createSprintAsync',
                'startSprintAsync',
                'completeSprintAsync',
                'deleteSprintAsync',
                'reorderSprintAsync',
                'addCardsToSprintAsync',
                'removeCardFromSprintAsync',
                'moveCardToBacklogAsync',
                'moveCardsToSprintAsync',
                'addCardsToBacklogSprintAsync',
                'removeCardFromBacklogSprintAsync',
                'loadBurndownDataAsync',
                'loadVelocityDataAsync'
            ]
        ],
        [
            'analyticsThunks',
            analyticsThunks,
            ['loadCycleTimeAnalyticsAsync', 'loadCumulativeFlowDataAsync']
        ],
        [
            'epicThunks',
            epicThunks,
            ['loadEpicSummariesAsync', 'loadEpicDetailAsync']
        ],
        [
            'columnThunks',
            columnThunks,
            [
                'createColumnAsync',
                'updateColumnAsync',
                'deleteColumnAsync',
                'reorderColumnAsync',
                'createColumnsFromTemplateAsync'
            ]
        ]
    ])('re-exports %s thunks directly', (_label, source, names) => {
        names.forEach((name) => {
            expect(typeof publicApi[name]).toBe('function');
            expect(publicApi[name]).toBe({ ...source }[name]);
        });
    });

    it('re-exports undo/redo building blocks', () => {
        expect(kanbanStore.createUndoManager).toBe(
            undoManagerModule.createUndoManager
        );
        expect(kanbanStore.getUndoableAction).toBe(
            undoableActions.getUndoableAction
        );
        expect(kanbanStore.isUndoable).toBe(undoableActions.isUndoable);
        expect(kanbanStore.createUndoMiddleware).toBe(
            undoMiddleware.createUndoMiddleware
        );
        expect(kanbanStore.isUndoable('MOVE_CARD')).toBe(true);
        expect(kanbanStore.isUndoable('SET_LOADING')).toBe(false);
    });

    it('exposes organized namespace objects', () => {
        expect(kanbanStore.actions).toEqual(actionsModule);
        expect(kanbanStore.types).toEqual(typesModule);
        expect(kanbanStore.selectors).toEqual(selectorsModule);
        expect(kanbanStore.thunks).toEqual(boardThunks);
        expect(kanbanStore.cardThunks).toEqual(cardThunks);
        expect(kanbanStore.sprintThunks).toEqual(sprintThunks);
        expect(kanbanStore.analyticsThunks).toEqual(analyticsThunks);
        expect(kanbanStore.epicThunks).toEqual(epicThunks);
        expect(kanbanStore.columnThunks).toEqual(columnThunks);
        expect(kanbanStore.types.MOVE_CARD).toBe('MOVE_CARD');
    });

    it('creates a working store through the public API', () => {
        const store = kanbanStore.createStore();
        const listener = jest.fn();
        const unsubscribe = store.subscribe(listener);

        store.dispatch(kanbanStore.setBoard({ Id: 'b1' }));
        unsubscribe();
        store.dispatch(kanbanStore.setBoardId('b2'));

        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getBoardId()).toBe('b2');
        expect(kanbanStore.selectors.getBoardId(store.getState())).toBe('b2');
    });

    it('tolerates CommonJS-style dependency modules', () => {
        const actualActions = jest.requireActual('../state/actions');
        const actualStore = jest.requireActual('../core/store');
        const actualSelectors = jest.requireActual('../state/selectors');
        // Non-ES modules: no __esModule flag, an enumerable default key,
        // a key that duplicates an existing export, and an accessor prop.
        const cjsActions = {
            ...actualActions,
            default: 'ignored-default',
            createStore: actualStore.createStore
        };
        const cjsSelectors = { ...actualSelectors };
        Object.defineProperty(cjsSelectors, 'getBoardId', {
            enumerable: true,
            get: () => actualSelectors.getBoardId
        });

        let isolated;
        jest.isolateModules(() => {
            jest.doMock('../core/store', () => actualStore);
            jest.doMock('../state/actions', () => cjsActions);
            jest.doMock('../state/selectors', () => cjsSelectors);
            isolated = require('../kanbanStore');
        });

        expect(isolated.default).toBeUndefined();
        expect(isolated.createStore).toBe(actualStore.createStore);
        expect(isolated.setBoard).toBe(actualActions.setBoard);
        expect(isolated.selectors.getBoardId({ boardId: 'b7' })).toBe('b7');
        // a namespace import of a CommonJS module exposes it as `default`
        expect(isolated.actions.default).toBe(cjsActions);
        expect(isolated.actions.setBoard).toBe(actualActions.setBoard);
    });
});
