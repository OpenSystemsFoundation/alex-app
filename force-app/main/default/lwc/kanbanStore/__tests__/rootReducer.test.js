/**
 * Unit tests for state/reducers — initialState shape and the rootReducer
 * that composes the domain reducers.
 */
import {
    rootReducer,
    initialState,
    boardReducer,
    columnsReducer,
    cardsReducer,
    dragReducer,
    appStateReducer,
    syncReducer,
    sprintReducer,
    backlogReducer
} from '../state/reducers';
import * as types from '../core/actionTypes';
import * as actions from '../state/actions';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

beforeEach(() => resetIds());

describe('initialState', () => {
    it('matches the documented store shape', () => {
        expect(initialState).toEqual(buildInitialState());
        expect(initialState.syncState).toBe('idle');
        expect(initialState.subscriptionStatus).toBe('disconnected');
        expect(initialState.backlogSyncing).toBe(0);
    });
});

describe('domain reducer re-exports', () => {
    it('re-exports every domain reducer as a function', () => {
        [
            boardReducer,
            columnsReducer,
            cardsReducer,
            dragReducer,
            appStateReducer,
            syncReducer,
            sprintReducer,
            backlogReducer
        ].forEach((reducer) => expect(typeof reducer).toBe('function'));
    });
});

describe('rootReducer', () => {
    it('returns initialState and clears drag position on RESET', () => {
        const state = buildInitialState({ boardId: 'b1', isLoading: true });
        const result = rootReducer(state, { type: types.RESET }, 'col-1-0');
        expect(result).toEqual({ state: initialState, lastDragPosition: null });
        expect(result.state).toBe(initialState);
    });

    it('returns the same state reference for unknown actions', () => {
        const state = buildInitialState();
        const result = rootReducer(state, { type: 'UNKNOWN' }, 'keep-me');
        expect(result.state).toBe(state);
        expect(result.lastDragPosition).toBe('keep-me');
    });

    it('routes board actions to the board reducer', () => {
        const { state } = rootReducer(
            buildInitialState(),
            actions.setBoard({ Id: 'b1', Name: 'Board' }),
            null
        );
        expect(state.board).toEqual({ Id: 'b1', Name: 'Board' });
        expect(state.boardId).toBe('b1');
    });

    it('routes column and card actions', () => {
        const columns = [
            buildColumn({ Id: 'col-1', cards: [buildCard({ Id: 'c1' })] }),
            buildColumn({ Id: 'col-2', cards: [] })
        ];
        let { state } = rootReducer(
            buildInitialState(),
            actions.setColumns(columns),
            null
        );
        expect(state.columns.map((c) => c.Id)).toEqual(['col-1', 'col-2']);

        ({ state } = rootReducer(
            state,
            actions.moveCard('c1', 'col-2', 0),
            null
        ));
        expect(state.columns[0].cards).toHaveLength(0);
        expect(state.columns[1].cards.map((c) => c.Id)).toEqual(['c1']);
    });

    it('routes app-state actions', () => {
        const { state } = rootReducer(
            buildInitialState(),
            actions.setLoading(true),
            null
        );
        expect(state.isLoading).toBe(true);
    });

    it('routes sync actions', () => {
        const { state } = rootReducer(
            buildInitialState(),
            { type: types.SET_SYNC_STATE, payload: 'syncing' },
            null
        );
        expect(state.syncState).toBe('syncing');
    });

    it('routes sprint and backlog actions', () => {
        const sprints = [{ Id: 's1', name: 'SP-1' }];
        let { state } = rootReducer(
            buildInitialState(),
            { type: types.SET_SPRINTS, payload: sprints },
            null
        );
        expect(state.sprints).toEqual(sprints);

        ({ state } = rootReducer(
            state,
            { type: types.SET_BACKLOG_VISIBLE, payload: true },
            null
        ));
        expect(state.backlogVisible).toBe(true);
    });

    it('threads lastDragPosition through drag actions', () => {
        const columns = [
            buildColumn({ Id: 'col-1', cards: [buildCard({ Id: 'c1' })] }),
            buildColumn({ Id: 'col-2', cards: [] })
        ];
        let result = rootReducer(
            buildInitialState({ columns }),
            actions.startDrag({ columnId: 'col-1', cardIndex: 0 }),
            null
        );
        expect(result.state.isDragging).toBe(true);
        expect(result.lastDragPosition).toBeNull();

        result = rootReducer(
            result.state,
            actions.updateDragPosition('col-2', 0),
            result.lastDragPosition
        );
        expect(result.lastDragPosition).toBe('col-2-0');
        expect(result.state.dragState[1].cards.map((c) => c.Id)).toEqual([
            'c1'
        ]);

        // same position again is a no-op
        const same = rootReducer(
            result.state,
            actions.updateDragPosition('col-2', 0),
            result.lastDragPosition
        );
        expect(same.state).toBe(result.state);

        result = rootReducer(
            result.state,
            { type: types.COMMIT_DRAG },
            result.lastDragPosition
        );
        expect(result.lastDragPosition).toBeNull();
        expect(result.state.isDragging).toBe(false);
        expect(result.state.columns[1].cards.map((c) => c.Id)).toEqual(['c1']);
    });
});

describe('rootReducer with CommonJS-style dependencies', () => {
    it('works when action types come from a non-ES module', () => {
        const actual = jest.requireActual('../core/actionTypes');
        // spreading drops the non-enumerable __esModule flag
        const cjsTypes = { ...actual };
        Object.defineProperty(cjsTypes, 'RESET', {
            enumerable: true,
            get: () => actual.RESET
        });
        let isolated;
        jest.isolateModules(() => {
            jest.doMock('../core/actionTypes', () => cjsTypes);
            isolated = require('../state/reducers');
        });

        const reset = isolated.rootReducer(
            buildInitialState({ boardId: 'b1' }),
            { type: 'RESET' },
            'x'
        );
        expect(reset.state).toBe(isolated.initialState);
        expect(reset.lastDragPosition).toBeNull();

        const loaded = isolated.rootReducer(
            isolated.initialState,
            { type: 'SET_LOADING', payload: true },
            null
        );
        expect(loaded.state.isLoading).toBe(true);
    });
});
