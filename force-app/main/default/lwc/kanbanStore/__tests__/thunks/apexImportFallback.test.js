/**
 * Apex import fallback tests for the thunk modules.
 *
 * @lwc/jest-transformer rewrites every `@salesforce/apex/...` default import
 * into a try/catch: when the module cannot be resolved (no jest.mock), it
 * falls back to a shared `global.__lwcJestMock_<name>` stub that resolves to
 * undefined. The other thunk specs always mock Apex, so this spec deliberately
 * leaves Apex unmocked to verify the thunks still load and behave sensibly
 * against the default stubs.
 */

import { buildColumn, buildInitialState } from 'jest-helpers/testDataFactory';

function loadIsolated(modulePath) {
    let mod;
    jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        mod = require(modulePath);
    });
    return mod;
}

function createThunkEnv(stateOverrides = {}) {
    const dispatched = [];
    const state = buildInitialState(stateOverrides);
    const dispatch = jest.fn((action) => {
        dispatched.push(action);
        return action;
    });
    const getState = jest.fn(() => state);
    return { dispatch, getState, dispatched };
}

const stub = (name) => global[`__lwcJestMock_${name}`];

describe('thunks without Apex mocks', () => {
    it('analyticsThunks resolves with undefined data from the default stub', async () => {
        const { loadCycleTimeAnalyticsAsync, loadCumulativeFlowDataAsync } =
            loadIsolated('../../thunks/analyticsThunks');

        expect(typeof stub('getCycleTimeAnalyticsApex')).toBe('function');
        await expect(loadCycleTimeAnalyticsAsync('board1')()).resolves.toEqual({
            success: true,
            data: undefined
        });
        await expect(loadCumulativeFlowDataAsync('board1')()).resolves.toEqual({
            success: true,
            data: undefined
        });
    });

    it('epicThunks treats an empty stub response as no summaries', async () => {
        const { loadEpicSummariesAsync, loadEpicDetailAsync } = loadIsolated(
            '../../thunks/epicThunks'
        );
        const { dispatch, getState, dispatched } = createThunkEnv();

        expect(typeof stub('getEpicSummaries')).toBe('function');
        const result = await loadEpicSummariesAsync('board1')(
            dispatch,
            getState
        );

        expect(result).toBeUndefined();
        expect(dispatched).toEqual([
            { type: 'SET_EPIC_SUMMARIES', payload: [] }
        ]);
        await expect(loadEpicDetailAsync('epic1')()).resolves.toBeUndefined();
    });

    it('cardThunks moves a card against the default stub', async () => {
        const { moveCardAsync } = loadIsolated('../../thunks/cardThunks');
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [buildColumn({ Id: 'col1', cards: [] })]
        });

        expect(typeof stub('moveCardApex')).toBe('function');
        const result = await moveCardAsync('c1', 'col1', 0)(dispatch, getState);

        expect(result).toEqual({ success: true, result: undefined });
        expect(dispatched.map((a) => a.type)).toEqual(['MOVE_CARD']);
    });

    it('boardThunks rejects when the stub returns no board data', async () => {
        const { loadBoardData } = loadIsolated('../../thunks/boardThunks');
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const { dispatch } = createThunkEnv();

        expect(typeof stub('getBoardData')).toBe('function');
        await expect(loadBoardData('board1')(dispatch)).rejects.toThrow(
            TypeError
        );
        expect(errorSpy).toHaveBeenCalledWith(
            'Error loading board data:',
            expect.any(TypeError)
        );
        errorSpy.mockRestore();
    });

    it('sprintThunks rejects when the stub returns no sprint data', async () => {
        const { loadSprintDataAsync, startSprintAsync } = loadIsolated(
            '../../thunks/sprintThunks'
        );
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const { dispatch, dispatched } = createThunkEnv();

        expect(typeof stub('getSprintDataApex')).toBe('function');
        await expect(loadSprintDataAsync('board1')(dispatch)).rejects.toThrow(
            TypeError
        );
        await expect(startSprintAsync('s1')(dispatch)).resolves.toEqual({
            success: true,
            sprint: undefined
        });
        expect(dispatched).toEqual([
            { type: 'SET_SPRINT', payload: undefined }
        ]);
        errorSpy.mockRestore();
    });

    it('columnThunks deletes a column against the default stub', async () => {
        const { createColumnAsync, deleteColumnAsync } = loadIsolated(
            '../../thunks/columnThunks'
        );
        const col1 = buildColumn({ Id: 'col1' });
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [col1]
        });

        expect(typeof stub('createColumnApex')).toBe('function');
        // createColumn's stub returns undefined, which cannot be processed
        await expect(
            createColumnAsync(
                'X',
                'ToDo',
                null,
                'Active',
                null
            )(dispatch, getState)
        ).rejects.toThrow(TypeError);
        await expect(
            deleteColumnAsync('col1')(dispatch, getState)
        ).resolves.toEqual({ success: true });
        expect(dispatched).toEqual([{ type: 'SET_COLUMNS', payload: [] }]);
    });

    it('reuses the shared stub when a module is loaded again', () => {
        const before = stub('moveCardApex');
        loadIsolated('../../thunks/cardThunks');
        expect(stub('moveCardApex')).toBe(before);
    });
});
