/**
 * Unit tests for epicThunks — async action creators for Epic management.
 */

jest.mock(
    '@salesforce/apex/KanbanBoardController.getEpicSummaries',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getEpicDetail',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock('../../utils/dataProcessors', () => ({
    setEpicSummaryMap: jest.fn(),
    enrichCardData: jest.fn((card) => ({ ...card, enriched: true }))
}));

import getEpicSummaries from '@salesforce/apex/KanbanBoardController.getEpicSummaries';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';
import {
    loadEpicSummariesAsync,
    loadEpicDetailAsync
} from '../../thunks/epicThunks';
import { setEpicSummaryMap, enrichCardData } from '../../utils/dataProcessors';
import { SET_EPIC_SUMMARIES, SET_COLUMNS } from '../../core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

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

let consoleWarnSpy;

beforeEach(() => {
    resetIds();
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    consoleWarnSpy.mockRestore();
});

describe('loadEpicSummariesAsync', () => {
    it('stores summaries and re-enriches cards in every column', async () => {
        const summaries = [{ id: 'epic1', totalCards: 4, progressPercent: 50 }];
        const epic = buildCard({ Id: 'epic1', cardType: 'Epic' });
        const story = buildCard({ Id: 's1' });
        const columns = [
            buildColumn({ Id: 'col1', cards: [epic, story] }),
            { Id: 'col2' }
        ];
        getEpicSummaries.mockResolvedValue(summaries);
        const { dispatch, getState, dispatched } = createThunkEnv({ columns });

        const result = await loadEpicSummariesAsync('board1')(
            dispatch,
            getState
        );

        expect(result).toBe(summaries);
        expect(getEpicSummaries).toHaveBeenCalledWith({ boardId: 'board1' });
        expect(setEpicSummaryMap).toHaveBeenCalledWith(summaries);
        expect(enrichCardData).toHaveBeenCalledTimes(2);
        expect(enrichCardData).toHaveBeenCalledWith(epic);
        expect(enrichCardData).toHaveBeenCalledWith(story);

        expect(dispatched).toHaveLength(2);
        expect(dispatched[0]).toEqual({
            type: SET_EPIC_SUMMARIES,
            payload: summaries
        });
        expect(dispatched[1].type).toBe(SET_COLUMNS);
        const [col1, col2] = dispatched[1].payload;
        expect(col1.Id).toBe('col1');
        expect(col1.cards).toEqual([
            { ...epic, enriched: true },
            { ...story, enriched: true }
        ]);
        // Column without a cards array gets an empty one
        expect(col2).toEqual({ Id: 'col2', cards: [] });
    });

    it('skips re-enrichment when there are no columns', async () => {
        getEpicSummaries.mockResolvedValue([{ id: 'epic1' }]);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: []
        });

        await loadEpicSummariesAsync('board1')(dispatch, getState);

        expect(enrichCardData).not.toHaveBeenCalled();
        expect(dispatched.map((a) => a.type)).toEqual([SET_EPIC_SUMMARIES]);
    });

    it('skips re-enrichment when the columns array is missing', async () => {
        getEpicSummaries.mockResolvedValue([]);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: undefined
        });

        await loadEpicSummariesAsync('board1')(dispatch, getState);

        expect(dispatched.map((a) => a.type)).toEqual([SET_EPIC_SUMMARIES]);
    });

    it('normalizes a null Apex response to an empty list', async () => {
        getEpicSummaries.mockResolvedValue(null);
        const { dispatch, getState, dispatched } = createThunkEnv();

        const result = await loadEpicSummariesAsync('board1')(
            dispatch,
            getState
        );

        expect(result).toBeNull();
        expect(setEpicSummaryMap).toHaveBeenCalledWith([]);
        expect(dispatched).toEqual([{ type: SET_EPIC_SUMMARIES, payload: [] }]);
    });

    it('swallows Apex errors, warns and returns an empty list', async () => {
        const error = new Error('epic failed');
        getEpicSummaries.mockRejectedValue(error);
        const { dispatch, getState } = createThunkEnv();

        const result = await loadEpicSummariesAsync('board1')(
            dispatch,
            getState
        );

        expect(result).toEqual([]);
        expect(dispatch).not.toHaveBeenCalled();
        expect(setEpicSummaryMap).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Failed to load epic summaries:',
            error
        );
    });
});

describe('loadEpicDetailAsync', () => {
    it('returns the epic detail DTO from Apex', async () => {
        const detail = { id: 'epic1', childCards: [{ Id: 'c1' }] };
        getEpicDetail.mockResolvedValue(detail);

        const result = await loadEpicDetailAsync('epic1')();

        expect(getEpicDetail).toHaveBeenCalledWith({ epicId: 'epic1' });
        expect(result).toBe(detail);
    });

    it('propagates Apex errors', async () => {
        getEpicDetail.mockRejectedValue(new Error('detail failed'));

        await expect(loadEpicDetailAsync('epic1')()).rejects.toThrow(
            'detail failed'
        );
    });
});
