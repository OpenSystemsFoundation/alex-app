/**
 * Unit tests for sprintThunks — async action creators for sprint operations.
 */

jest.mock(
    '@salesforce/apex/KanbanBoardController.getSprintData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.createSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.startSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.completeSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.deleteSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.reorderSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.addCardsToSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.removeCardFromSprint',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getBurndownData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getVelocityData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.updateCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.moveCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

import getSprintDataApex from '@salesforce/apex/KanbanBoardController.getSprintData';
import createSprintApex from '@salesforce/apex/KanbanBoardController.createSprint';
import startSprintApex from '@salesforce/apex/KanbanBoardController.startSprint';
import completeSprintApex from '@salesforce/apex/KanbanBoardController.completeSprint';
import deleteSprintApex from '@salesforce/apex/KanbanBoardController.deleteSprint';
import reorderSprintApex from '@salesforce/apex/KanbanBoardController.reorderSprint';
import addCardsToSprintApex from '@salesforce/apex/KanbanBoardController.addCardsToSprint';
import removeCardFromSprintApex from '@salesforce/apex/KanbanBoardController.removeCardFromSprint';
import getBurndownDataApex from '@salesforce/apex/KanbanBoardController.getBurndownData';
import getVelocityDataApex from '@salesforce/apex/KanbanBoardController.getVelocityData';
import updateCardApex from '@salesforce/apex/KanbanBoardController.updateCard';
import moveCardApex from '@salesforce/apex/KanbanBoardController.moveCard';

import {
    loadSprintDataAsync,
    createSprintAsync,
    startSprintAsync,
    completeSprintAsync,
    deleteSprintAsync,
    reorderSprintAsync,
    addCardsToSprintAsync,
    removeCardFromSprintAsync,
    loadBurndownDataAsync,
    loadVelocityDataAsync,
    moveCardToBacklogAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync,
    moveCardsToSprintAsync
} from '../../thunks/sprintThunks';
import * as types from '../../core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildSprint,
    buildSprintCard,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

/**
 * Thunk environment with a fixed state snapshot.
 */
function createThunkEnv(stateOverrides = {}) {
    const dispatched = [];
    const state = buildInitialState(stateOverrides);
    const dispatch = jest.fn((action) => {
        dispatched.push(action);
        return action;
    });
    const getState = jest.fn(() => state);
    return { dispatch, getState, dispatched, state };
}

/**
 * Thunk environment whose state evolves for the actions that
 * moveCardsToSprintAsync relies on (REMOVE_BACKLOG_CARD, ADD_CARD).
 */
function createLiveThunkEnv(stateOverrides = {}) {
    const dispatched = [];
    let state = buildInitialState(stateOverrides);
    const dispatch = jest.fn((action) => {
        dispatched.push(action);
        if (action.type === types.REMOVE_BACKLOG_CARD) {
            state = {
                ...state,
                backlogCards: (state.backlogCards || []).filter(
                    (c) => c.Id !== action.payload.cardId
                )
            };
        } else if (action.type === types.ADD_CARD) {
            const { card, columnId } = action.payload;
            state = {
                ...state,
                columns: state.columns.map((col) => {
                    if (col.Id !== columnId) return col;
                    return { ...col, cards: [...(col.cards || []), card] };
                })
            };
        }
        return action;
    });
    const getState = jest.fn(() => state);
    return { dispatch, getState, dispatched, current: () => state };
}

const typesOf = (dispatched) => dispatched.map((a) => a.type);

let consoleErrorSpy;

beforeEach(() => {
    resetIds();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
});

describe('loadSprintDataAsync', () => {
    it('throws when boardId is missing', async () => {
        const { dispatch } = createThunkEnv();
        await expect(loadSprintDataAsync(undefined)(dispatch)).rejects.toThrow(
            'Board ID is required'
        );
        expect(getSprintDataApex).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('dispatches every section present in the response', async () => {
        const activeSprint = buildSprint({ Id: 's1', status: 'Active' });
        const data = {
            activeSprint,
            sprints: [activeSprint],
            sprintCards: [buildSprintCard({ sprintId: 's1', cardId: 'c1' })],
            backlogCards: [buildCard({ Id: 'b1' })],
            planningSprintCards: [
                buildSprintCard({ sprintId: 's2', cardId: 'b1' })
            ]
        };
        getSprintDataApex.mockResolvedValue(data);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await loadSprintDataAsync('board1')(dispatch);

        expect(getSprintDataApex).toHaveBeenCalledWith({ boardId: 'board1' });
        expect(result).toEqual({ success: true, data });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINT, payload: activeSprint },
            { type: types.SET_SPRINTS, payload: data.sprints },
            { type: types.SET_SPRINT_CARDS, payload: data.sprintCards },
            { type: types.SET_BACKLOG_CARDS, payload: data.backlogCards },
            {
                type: types.SET_PLANNING_SPRINT_CARDS,
                payload: data.planningSprintCards
            }
        ]);
    });

    it('skips sections that are absent from the response', async () => {
        getSprintDataApex.mockResolvedValue({});
        const { dispatch } = createThunkEnv();

        const result = await loadSprintDataAsync('board1')(dispatch);

        expect(result).toEqual({ success: true, data: {} });
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('logs and rethrows Apex errors', async () => {
        const error = new Error('load failed');
        getSprintDataApex.mockRejectedValue(error);
        const { dispatch } = createThunkEnv();

        await expect(loadSprintDataAsync('board1')(dispatch)).rejects.toBe(
            error
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error loading sprint data:',
            error
        );
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('createSprintAsync', () => {
    it('creates a sprint and appends it to the existing list', async () => {
        const existing = buildSprint({ Id: 's1' });
        const created = buildSprint({ Id: 's2', name: 'SP-0002' });
        createSprintApex.mockResolvedValue(created);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprints: [existing]
        });

        const result = await createSprintAsync(
            'board1',
            'Ship it',
            '2026-01-01',
            '2026-01-14'
        )(dispatch, getState);

        expect(createSprintApex).toHaveBeenCalledWith({
            boardId: 'board1',
            goal: 'Ship it',
            startDate: '2026-01-01',
            endDate: '2026-01-14'
        });
        expect(result).toEqual({ success: true, sprint: created });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINTS, payload: [existing, created] }
        ]);
    });

    it('handles a state with no sprints array', async () => {
        const created = buildSprint({ Id: 's1' });
        createSprintApex.mockResolvedValue(created);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprints: undefined
        });

        await createSprintAsync('board1', null, null, null)(dispatch, getState);

        expect(dispatched).toEqual([
            { type: types.SET_SPRINTS, payload: [created] }
        ]);
    });

    it('rethrows on Apex failure without dispatching', async () => {
        createSprintApex.mockRejectedValue(new Error('create failed'));
        const { dispatch, getState } = createThunkEnv();

        await expect(
            createSprintAsync('board1', 'g', null, null)(dispatch, getState)
        ).rejects.toThrow('create failed');
        expect(dispatch).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error creating sprint:',
            expect.any(Error)
        );
    });
});

describe('startSprintAsync', () => {
    it('starts the sprint and sets it as active', async () => {
        const sprint = buildSprint({ Id: 's1', status: 'Active' });
        startSprintApex.mockResolvedValue(sprint);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await startSprintAsync('s1')(dispatch);

        expect(startSprintApex).toHaveBeenCalledWith({ sprintId: 's1' });
        expect(result).toEqual({ success: true, sprint });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINT, payload: sprint }
        ]);
    });

    it('rethrows on Apex failure', async () => {
        startSprintApex.mockRejectedValue(new Error('start failed'));
        const { dispatch } = createThunkEnv();

        await expect(startSprintAsync('s1')(dispatch)).rejects.toThrow(
            'start failed'
        );
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('completeSprintAsync', () => {
    it('completes the sprint, clears the active sprint and the list', async () => {
        const sprint = buildSprint({ Id: 's1', status: 'Completed' });
        const dispositions = { c1: 'backlog', c2: 's2' };
        completeSprintApex.mockResolvedValue(sprint);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await completeSprintAsync('s1', dispositions)(dispatch);

        expect(completeSprintApex).toHaveBeenCalledWith({
            sprintId: 's1',
            dispositions
        });
        expect(result).toEqual({ success: true, sprint });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINT, payload: null },
            { type: types.SET_SPRINTS, payload: [] }
        ]);
    });

    it('rethrows on Apex failure', async () => {
        completeSprintApex.mockRejectedValue(new Error('complete failed'));
        const { dispatch } = createThunkEnv();

        await expect(completeSprintAsync('s1', {})(dispatch)).rejects.toThrow(
            'complete failed'
        );
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('deleteSprintAsync', () => {
    it('deletes the sprint on the server then in the store', async () => {
        deleteSprintApex.mockResolvedValue(undefined);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await deleteSprintAsync('s1')(dispatch);

        expect(deleteSprintApex).toHaveBeenCalledWith({ sprintId: 's1' });
        expect(result).toEqual({ success: true });
        expect(dispatched).toEqual([
            { type: types.DELETE_SPRINT, payload: { sprintId: 's1' } }
        ]);
    });

    it('rethrows on Apex failure without touching the store', async () => {
        deleteSprintApex.mockRejectedValue(new Error('delete failed'));
        const { dispatch } = createThunkEnv();

        await expect(deleteSprintAsync('s1')(dispatch)).rejects.toThrow(
            'delete failed'
        );
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('reorderSprintAsync', () => {
    const s1 = buildSprint({ Id: 's1' });
    const s2 = buildSprint({ Id: 's2' });
    const s3 = buildSprint({ Id: 's3' });

    it('optimistically swaps up, then applies the server order', async () => {
        const serverOrder = [s2, s1, s3];
        reorderSprintApex.mockResolvedValue(serverOrder);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprints: [s1, s2, s3]
        });

        const result = await reorderSprintAsync('s2', 'up')(dispatch, getState);

        expect(result).toEqual({ success: true });
        expect(reorderSprintApex).toHaveBeenCalledWith({
            sprintId: 's2',
            direction: 'up'
        });
        expect(dispatched).toHaveLength(2);
        expect(dispatched[0]).toEqual({
            type: types.REORDER_SPRINTS,
            payload: [s2, s1, s3]
        });
        expect(dispatched[1]).toEqual({
            type: types.REORDER_SPRINTS,
            payload: serverOrder
        });
    });

    it('optimistically swaps down', async () => {
        reorderSprintApex.mockResolvedValue([s1, s3, s2]);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprints: [s1, s2, s3]
        });

        await reorderSprintAsync('s2', 'down')(dispatch, getState);

        expect(dispatched[0].payload.map((s) => s.Id)).toEqual([
            's1',
            's3',
            's2'
        ]);
    });

    it('does not mutate the original sprints array', async () => {
        reorderSprintApex.mockResolvedValue([s2, s1]);
        const original = [s1, s2];
        const { dispatch, getState } = createThunkEnv({ sprints: original });

        await reorderSprintAsync('s2', 'up')(dispatch, getState);

        expect(original.map((s) => s.Id)).toEqual(['s1', 's2']);
    });

    it('returns failure when the sprint is not found', async () => {
        const { dispatch, getState } = createThunkEnv({ sprints: [s1, s2] });

        const result = await reorderSprintAsync('missing', 'up')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: false });
        expect(dispatch).not.toHaveBeenCalled();
        expect(reorderSprintApex).not.toHaveBeenCalled();
    });

    it('returns failure when the state has no sprints', async () => {
        const { dispatch, getState } = createThunkEnv({ sprints: undefined });

        const result = await reorderSprintAsync('s1', 'down')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: false });
        expect(reorderSprintApex).not.toHaveBeenCalled();
    });

    it('returns failure when moving the first sprint up', async () => {
        const { dispatch, getState } = createThunkEnv({ sprints: [s1, s2] });

        const result = await reorderSprintAsync('s1', 'up')(dispatch, getState);

        expect(result).toEqual({ success: false });
        expect(dispatch).not.toHaveBeenCalled();
        expect(reorderSprintApex).not.toHaveBeenCalled();
    });

    it('returns failure when moving the last sprint down', async () => {
        const { dispatch, getState } = createThunkEnv({ sprints: [s1, s2] });

        const result = await reorderSprintAsync('s2', 'down')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: false });
        expect(dispatch).not.toHaveBeenCalled();
        expect(reorderSprintApex).not.toHaveBeenCalled();
    });

    it('rolls back to the original order on Apex failure', async () => {
        const original = [s1, s2, s3];
        reorderSprintApex.mockRejectedValue(new Error('reorder failed'));
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprints: original
        });

        await expect(
            reorderSprintAsync('s3', 'up')(dispatch, getState)
        ).rejects.toThrow('reorder failed');

        expect(dispatched).toHaveLength(2);
        expect(dispatched[0].payload.map((s) => s.Id)).toEqual([
            's1',
            's3',
            's2'
        ]);
        expect(dispatched[1]).toEqual({
            type: types.REORDER_SPRINTS,
            payload: original
        });
    });
});

describe('addCardsToSprintAsync', () => {
    it('sets sprint cards and removes each card from the backlog', async () => {
        const sprintCards = [
            buildSprintCard({ sprintId: 's1', cardId: 'c1' }),
            buildSprintCard({ sprintId: 's1', cardId: 'c2' })
        ];
        addCardsToSprintApex.mockResolvedValue(sprintCards);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await addCardsToSprintAsync('s1', ['c1', 'c2'])(
            dispatch
        );

        expect(addCardsToSprintApex).toHaveBeenCalledWith({
            sprintId: 's1',
            cardIds: ['c1', 'c2']
        });
        expect(result).toEqual({ success: true, sprintCards });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINT_CARDS, payload: sprintCards },
            { type: types.REMOVE_BACKLOG_CARD, payload: { cardId: 'c1' } },
            { type: types.REMOVE_BACKLOG_CARD, payload: { cardId: 'c2' } }
        ]);
    });

    it('rethrows on Apex failure without touching the backlog', async () => {
        addCardsToSprintApex.mockRejectedValue(new Error('add failed'));
        const { dispatch } = createThunkEnv();

        await expect(
            addCardsToSprintAsync('s1', ['c1'])(dispatch)
        ).rejects.toThrow('add failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('removeCardFromSprintAsync', () => {
    it('removes the junction from the sprint cards in state', async () => {
        const keep = buildSprintCard({ sprintId: 's1', cardId: 'c2' });
        const drop = buildSprintCard({ sprintId: 's1', cardId: 'c1' });
        removeCardFromSprintApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprintCards: [drop, keep]
        });

        const result = await removeCardFromSprintAsync('s1', 'c1')(
            dispatch,
            getState
        );

        expect(removeCardFromSprintApex).toHaveBeenCalledWith({
            sprintId: 's1',
            cardId: 'c1'
        });
        expect(result).toEqual({ success: true });
        expect(dispatched).toEqual([
            { type: types.SET_SPRINT_CARDS, payload: [keep] }
        ]);
    });

    it('handles a state with no sprint cards', async () => {
        removeCardFromSprintApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprintCards: undefined
        });

        await removeCardFromSprintAsync('s1', 'c1')(dispatch, getState);

        expect(dispatched).toEqual([
            { type: types.SET_SPRINT_CARDS, payload: [] }
        ]);
    });

    it('rethrows on Apex failure', async () => {
        removeCardFromSprintApex.mockRejectedValue(new Error('remove failed'));
        const { dispatch, getState } = createThunkEnv();

        await expect(
            removeCardFromSprintAsync('s1', 'c1')(dispatch, getState)
        ).rejects.toThrow('remove failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('loadBurndownDataAsync', () => {
    it('returns burndown data from Apex', async () => {
        const data = { days: [{ day: 1, remaining: 10 }] };
        getBurndownDataApex.mockResolvedValue(data);

        const result = await loadBurndownDataAsync('s1')();

        expect(getBurndownDataApex).toHaveBeenCalledWith({ sprintId: 's1' });
        expect(result).toEqual({ success: true, data });
    });

    it('rethrows on Apex failure', async () => {
        getBurndownDataApex.mockRejectedValue(new Error('burndown failed'));

        await expect(loadBurndownDataAsync('s1')()).rejects.toThrow(
            'burndown failed'
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error loading burndown data:',
            expect.any(Error)
        );
    });
});

describe('loadVelocityDataAsync', () => {
    it('defaults the sprint count to 10', async () => {
        const data = [{ sprint: 'SP-1', points: 20 }];
        getVelocityDataApex.mockResolvedValue(data);

        const result = await loadVelocityDataAsync('board1')();

        expect(getVelocityDataApex).toHaveBeenCalledWith({
            boardId: 'board1',
            count: 10
        });
        expect(result).toEqual({ success: true, data });
    });

    it('passes an explicit sprint count', async () => {
        getVelocityDataApex.mockResolvedValue([]);

        await loadVelocityDataAsync('board1', 3)();

        expect(getVelocityDataApex).toHaveBeenCalledWith({
            boardId: 'board1',
            count: 3
        });
    });

    it('rethrows on Apex failure', async () => {
        getVelocityDataApex.mockRejectedValue(new Error('velocity failed'));

        await expect(loadVelocityDataAsync('board1')()).rejects.toThrow(
            'velocity failed'
        );
    });
});

describe('moveCardToBacklogAsync', () => {
    it('optimistically moves the card, clears its column and removes the sprint junction', async () => {
        const keep = buildSprintCard({ sprintId: 's1', cardId: 'c2' });
        const drop = buildSprintCard({ sprintId: 's1', cardId: 'c1' });
        updateCardApex.mockResolvedValue({});
        removeCardFromSprintApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprintCards: [drop, keep]
        });

        const result = await moveCardToBacklogAsync('s1', 'c1')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(updateCardApex).toHaveBeenCalledWith({
            cardId: 'c1',
            updates: { columnId: null }
        });
        expect(removeCardFromSprintApex).toHaveBeenCalledWith({
            sprintId: 's1',
            cardId: 'c1'
        });
        expect(dispatched).toEqual([
            { type: types.MOVE_CARD_TO_BACKLOG, payload: { cardId: 'c1' } },
            { type: types.DELETE_CARD, payload: { cardId: 'c1' } },
            { type: types.SET_SPRINT_CARDS, payload: [keep] }
        ]);
    });

    it('handles a state with no sprint cards', async () => {
        updateCardApex.mockResolvedValue({});
        removeCardFromSprintApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            sprintCards: undefined
        });

        await moveCardToBacklogAsync('s1', 'c1')(dispatch, getState);

        expect(dispatched[2]).toEqual({
            type: types.SET_SPRINT_CARDS,
            payload: []
        });
    });

    it('skips sprint removal when there is no sprint', async () => {
        updateCardApex.mockResolvedValue({});
        const { dispatch, getState, dispatched } = createThunkEnv();

        const result = await moveCardToBacklogAsync(null, 'c1')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(removeCardFromSprintApex).not.toHaveBeenCalled();
        expect(typesOf(dispatched)).toEqual([
            types.MOVE_CARD_TO_BACKLOG,
            types.DELETE_CARD
        ]);
    });

    it('rethrows when clearing the column fails (optimistic update kept)', async () => {
        updateCardApex.mockRejectedValue(new Error('update failed'));
        const { dispatch, getState, dispatched } = createThunkEnv();

        await expect(
            moveCardToBacklogAsync('s1', 'c1')(dispatch, getState)
        ).rejects.toThrow('update failed');

        expect(removeCardFromSprintApex).not.toHaveBeenCalled();
        expect(typesOf(dispatched)).toEqual([
            types.MOVE_CARD_TO_BACKLOG,
            types.DELETE_CARD
        ]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error moving card to backlog:',
            expect.any(Error)
        );
    });

    it('rethrows when removing the sprint junction fails', async () => {
        updateCardApex.mockResolvedValue({});
        removeCardFromSprintApex.mockRejectedValue(new Error('remove failed'));
        const { dispatch, getState, dispatched } = createThunkEnv();

        await expect(
            moveCardToBacklogAsync('s1', 'c1')(dispatch, getState)
        ).rejects.toThrow('remove failed');
        expect(typesOf(dispatched)).not.toContain(types.SET_SPRINT_CARDS);
    });
});

describe('addCardsToBacklogSprintAsync', () => {
    it('adds a planning sprint association for each card', async () => {
        addCardsToSprintApex.mockResolvedValue([]);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await addCardsToBacklogSprintAsync('s2', ['c1', 'c2'])(
            dispatch
        );

        expect(addCardsToSprintApex).toHaveBeenCalledWith({
            sprintId: 's2',
            cardIds: ['c1', 'c2']
        });
        expect(result).toEqual({ success: true });
        expect(dispatched).toEqual([
            {
                type: types.ADD_PLANNING_SPRINT_CARD,
                payload: { sprintId: 's2', cardId: 'c1', position: null }
            },
            {
                type: types.ADD_PLANNING_SPRINT_CARD,
                payload: { sprintId: 's2', cardId: 'c2', position: null }
            }
        ]);
    });

    it('rethrows on Apex failure', async () => {
        addCardsToSprintApex.mockRejectedValue(new Error('add failed'));
        const { dispatch } = createThunkEnv();

        await expect(
            addCardsToBacklogSprintAsync('s2', ['c1'])(dispatch)
        ).rejects.toThrow('add failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('removeCardFromBacklogSprintAsync', () => {
    it('removes the planning sprint association', async () => {
        removeCardFromSprintApex.mockResolvedValue(undefined);
        const { dispatch, dispatched } = createThunkEnv();

        const result = await removeCardFromBacklogSprintAsync(
            's2',
            'c1'
        )(dispatch);

        expect(removeCardFromSprintApex).toHaveBeenCalledWith({
            sprintId: 's2',
            cardId: 'c1'
        });
        expect(result).toEqual({ success: true });
        expect(dispatched).toEqual([
            {
                type: types.REMOVE_PLANNING_SPRINT_CARD,
                payload: { cardId: 'c1', sprintId: 's2' }
            }
        ]);
    });

    it('rethrows on Apex failure', async () => {
        removeCardFromSprintApex.mockRejectedValue(new Error('remove failed'));
        const { dispatch } = createThunkEnv();

        await expect(
            removeCardFromBacklogSprintAsync('s2', 'c1')(dispatch)
        ).rejects.toThrow('remove failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('moveCardsToSprintAsync', () => {
    it('adds cards to the sprint and appends them to the first column', async () => {
        const existing = buildCard({ Id: 'e1', position: '1000' });
        const b1 = buildCard({ Id: 'b1', subject: 'Backlog 1' });
        const b2 = buildCard({ Id: 'b2', subject: 'Backlog 2' });
        const first = buildColumn({ Id: 'col1', cards: [existing] });
        const second = buildColumn({ Id: 'col2', cards: [] });
        const sprintCards = [
            buildSprintCard({ sprintId: 's1', cardId: 'b1' }),
            buildSprintCard({ sprintId: 's1', cardId: 'b2' })
        ];
        addCardsToSprintApex.mockResolvedValue(sprintCards);
        moveCardApex.mockResolvedValue({});
        const { dispatch, getState, dispatched, current } = createLiveThunkEnv({
            backlogCards: [b1, b2],
            columns: [first, second]
        });

        const result = await moveCardsToSprintAsync('s1', ['b1', 'b2'])(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true, sprintCards });
        expect(addCardsToSprintApex).toHaveBeenCalledWith({
            sprintId: 's1',
            cardIds: ['b1', 'b2']
        });
        // Each card is placed after the current last card of the column
        expect(moveCardApex).toHaveBeenNthCalledWith(1, {
            cardId: 'b1',
            targetColumnId: 'col1',
            previousCardPosition: '1000',
            nextCardPosition: null
        });
        expect(moveCardApex).toHaveBeenNthCalledWith(2, {
            cardId: 'b2',
            targetColumnId: 'col1',
            previousCardPosition: b1.position,
            nextCardPosition: null
        });
        expect(typesOf(dispatched)).toEqual([
            types.SET_SPRINT_CARDS,
            types.REMOVE_BACKLOG_CARD,
            types.REMOVE_BACKLOG_CARD,
            types.ADD_CARD,
            types.ADD_CARD
        ]);
        // Full backlog card data is carried over to the column
        expect(dispatched[3].payload).toEqual({ card: b1, columnId: 'col1' });
        expect(dispatched[4].payload).toEqual({ card: b2, columnId: 'col1' });
        expect(current().backlogCards).toEqual([]);
        expect(current().columns[0].cards.map((c) => c.Id)).toEqual([
            'e1',
            'b1',
            'b2'
        ]);
    });

    it('falls back to a stub card when the card is not in the backlog', async () => {
        const first = buildColumn({ Id: 'col1', cards: [] });
        addCardsToSprintApex.mockResolvedValue([]);
        moveCardApex.mockResolvedValue({});
        const { dispatch, getState, dispatched } = createLiveThunkEnv({
            backlogCards: undefined,
            columns: [first]
        });

        await moveCardsToSprintAsync('s1', ['ghost'])(dispatch, getState);

        expect(moveCardApex).toHaveBeenCalledWith({
            cardId: 'ghost',
            targetColumnId: 'col1',
            previousCardPosition: null,
            nextCardPosition: null
        });
        const addAction = dispatched.find((a) => a.type === types.ADD_CARD);
        expect(addAction.payload).toEqual({
            card: { Id: 'ghost' },
            columnId: 'col1'
        });
    });

    it('handles a first column without a cards array', async () => {
        const first = { Id: 'col1', position: '1000' };
        addCardsToSprintApex.mockResolvedValue([]);
        moveCardApex.mockResolvedValue({});
        // Static state: column never gains a cards array
        const { dispatch, getState } = createThunkEnv({
            backlogCards: [buildCard({ Id: 'b1' })],
            columns: [first]
        });

        await moveCardsToSprintAsync('s1', ['b1'])(dispatch, getState);

        expect(moveCardApex).toHaveBeenCalledWith(
            expect.objectContaining({
                cardId: 'b1',
                previousCardPosition: null,
                nextCardPosition: null
            })
        );
    });

    it('does not assign columns when the board has none', async () => {
        const b1 = buildCard({ Id: 'b1' });
        addCardsToSprintApex.mockResolvedValue([]);
        const { dispatch, getState, dispatched } = createLiveThunkEnv({
            backlogCards: [b1],
            columns: []
        });

        const result = await moveCardsToSprintAsync('s1', ['b1'])(
            dispatch,
            getState
        );

        expect(result.success).toBe(true);
        expect(moveCardApex).not.toHaveBeenCalled();
        expect(typesOf(dispatched)).toEqual([
            types.SET_SPRINT_CARDS,
            types.REMOVE_BACKLOG_CARD
        ]);
    });

    it('treats a missing columns array as no columns', async () => {
        addCardsToSprintApex.mockResolvedValue([]);
        const { dispatch, getState } = createThunkEnv({ columns: undefined });

        await moveCardsToSprintAsync('s1', ['b1'])(dispatch, getState);

        expect(moveCardApex).not.toHaveBeenCalled();
    });

    it('rethrows when adding to the sprint fails', async () => {
        addCardsToSprintApex.mockRejectedValue(new Error('add failed'));
        const { dispatch, getState } = createLiveThunkEnv({
            backlogCards: [buildCard({ Id: 'b1' })],
            columns: [buildColumn({ Id: 'col1' })]
        });

        await expect(
            moveCardsToSprintAsync('s1', ['b1'])(dispatch, getState)
        ).rejects.toThrow('add failed');
        expect(dispatch).not.toHaveBeenCalled();
        expect(moveCardApex).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error moving cards to sprint:',
            expect.any(Error)
        );
    });

    it('stops at the first failed column move', async () => {
        addCardsToSprintApex.mockResolvedValue([]);
        moveCardApex
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('move failed'));
        const { dispatch, getState, dispatched } = createLiveThunkEnv({
            backlogCards: [
                buildCard({ Id: 'b1' }),
                buildCard({ Id: 'b2' }),
                buildCard({ Id: 'b3' })
            ],
            columns: [buildColumn({ Id: 'col1' })]
        });

        await expect(
            moveCardsToSprintAsync('s1', ['b1', 'b2', 'b3'])(dispatch, getState)
        ).rejects.toThrow('move failed');

        expect(moveCardApex).toHaveBeenCalledTimes(2);
        const added = dispatched.filter((a) => a.type === types.ADD_CARD);
        expect(added.map((a) => a.payload.card.Id)).toEqual(['b1']);
    });
});
