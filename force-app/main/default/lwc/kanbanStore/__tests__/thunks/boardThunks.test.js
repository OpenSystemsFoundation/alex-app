/**
 * Unit tests for boardThunks — async action creators for board operations.
 */

jest.mock(
    '@salesforce/apex/KanbanBoardController.getBoardData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getBacklogCards',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
// Mock sprintThunks — loadSprintDataAsync returns a thunk
jest.mock('../../thunks/sprintThunks', () => ({
    loadSprintDataAsync: jest.fn(() => jest.fn(() => Promise.resolve()))
}));
// Mock dataProcessors
jest.mock('../../utils/dataProcessors', () => ({
    processColumnsData: jest.fn((cols) => cols),
    processCardsData: jest.fn((_cards, cols) => cols),
    setCardTypeIconMap: jest.fn()
}));

import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import getBacklogCardsApex from '@salesforce/apex/KanbanBoardController.getBacklogCards';
import { loadBoardData } from '../../thunks/boardThunks';
import { loadSprintDataAsync } from '../../thunks/sprintThunks';
import {
    processColumnsData,
    processCardsData,
    setCardTypeIconMap
} from '../../utils/dataProcessors';

beforeEach(() => {
    jest.clearAllMocks();
});

function createDispatch() {
    const dispatched = [];
    const dispatch = jest.fn((action) => {
        if (typeof action === 'function') return action(dispatch);
        dispatched.push(action);
        return action;
    });
    return { dispatch, dispatched };
}

describe('loadBoardData', () => {
    it('throws when boardId is falsy', async () => {
        const { dispatch } = createDispatch();
        const thunk = loadBoardData(null);
        await expect(thunk(dispatch)).rejects.toThrow('Board ID is required');
    });

    it('loads Kanban board with backlog cards', async () => {
        const boardData = {
            board: { Id: 'b1', type: 'Kanban' },
            columns: [{ Id: 'col1' }],
            cards: [{ Id: 'c1' }],
            customFieldConfigs: [{ Id: 'cfg1' }],
            cardTypeIcons: { Bug: 'bug-icon' }
        };
        const backlogCards = [{ Id: 'bg1' }];
        getBoardData.mockResolvedValue(boardData);
        getBacklogCardsApex.mockResolvedValue(backlogCards);

        const { dispatch, dispatched } = createDispatch();
        const thunk = loadBoardData('b1');
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(getBoardData).toHaveBeenCalledWith({ boardId: 'b1' });
        expect(setCardTypeIconMap).toHaveBeenCalledWith({ Bug: 'bug-icon' });
        expect(processColumnsData).toHaveBeenCalledWith([{ Id: 'col1' }]);
        expect(processCardsData).toHaveBeenCalledWith(
            [{ Id: 'c1' }],
            [{ Id: 'col1' }]
        );

        // setBoard dispatched with customFieldConfigs attached
        const boardAction = dispatched.find(
            (a) => a.type && a.type.includes('SET_BOARD')
        );
        expect(boardAction).toBeDefined();
        expect(boardAction.payload.customFieldConfigs).toEqual([
            { Id: 'cfg1' }
        ]);

        // Backlog cards loaded for non-Sprint boards
        expect(getBacklogCardsApex).toHaveBeenCalledWith({ boardId: 'b1' });
        expect(loadSprintDataAsync).not.toHaveBeenCalled();
    });

    it('loads Sprint board with sprint data instead of backlog', async () => {
        const boardData = {
            board: { Id: 'b2', type: 'Sprint' },
            columns: [],
            cards: [],
            customFieldConfigs: [],
            cardTypeIcons: null
        };
        getBoardData.mockResolvedValue(boardData);

        const { dispatch } = createDispatch();
        const thunk = loadBoardData('b2');
        await thunk(dispatch);

        expect(loadSprintDataAsync).toHaveBeenCalledWith('b2');
        expect(getBacklogCardsApex).not.toHaveBeenCalled();
    });

    it('handles sprint data loading error gracefully', async () => {
        const boardData = {
            board: { Id: 'b3', type: 'Sprint' },
            columns: [],
            cards: []
        };
        getBoardData.mockResolvedValue(boardData);
        loadSprintDataAsync.mockReturnValue(
            jest.fn(() => Promise.reject(new Error('sprint fail')))
        );

        const { dispatch } = createDispatch();
        const thunk = loadBoardData('b3');
        // Should NOT throw — sprint error is caught internally
        const result = await thunk(dispatch);
        expect(result.success).toBe(true);
    });

    it('handles backlog loading error gracefully', async () => {
        const boardData = {
            board: { Id: 'b4', type: 'Kanban' },
            columns: [],
            cards: []
        };
        getBoardData.mockResolvedValue(boardData);
        getBacklogCardsApex.mockRejectedValue(new Error('backlog fail'));

        const { dispatch } = createDispatch();
        const thunk = loadBoardData('b4');
        // Should NOT throw — backlog error is caught internally
        const result = await thunk(dispatch);
        expect(result.success).toBe(true);
    });

    it('re-throws when getBoardData fails', async () => {
        getBoardData.mockRejectedValue(new Error('network error'));

        const { dispatch } = createDispatch();
        const thunk = loadBoardData('b5');
        await expect(thunk(dispatch)).rejects.toThrow('network error');
    });

    it('handles missing optional fields in data', async () => {
        const boardData = {
            board: { Id: 'b6', type: 'Kanban' }
            // No columns, cards, customFieldConfigs, or cardTypeIcons
        };
        getBoardData.mockResolvedValue(boardData);
        getBacklogCardsApex.mockResolvedValue([]);

        const { dispatch } = createDispatch();
        const thunk = loadBoardData('b6');
        const result = await thunk(dispatch);

        expect(result.success).toBe(true);
        expect(processColumnsData).toHaveBeenCalledWith([]);
        expect(processCardsData).toHaveBeenCalledWith([], []);
        expect(setCardTypeIconMap).toHaveBeenCalledWith(null);
    });
});

describe('loadBoardData — edge branches', () => {
    it('treats a response without a board as a non-sprint board', async () => {
        getBoardData.mockResolvedValue({ columns: [], cards: [] });
        getBacklogCardsApex.mockResolvedValue([{ Id: 'bg1' }]);

        const { dispatch, dispatched } = createDispatch();
        const result = await loadBoardData('b7')(dispatch);

        expect(result).toEqual({
            success: true,
            board: undefined,
            columns: []
        });
        expect(loadSprintDataAsync).not.toHaveBeenCalled();
        expect(getBacklogCardsApex).toHaveBeenCalledWith({ boardId: 'b7' });
        expect(dispatched).toEqual([
            {
                type: 'SET_BOARD',
                payload: expect.objectContaining({ customFieldConfigs: [] })
            },
            { type: 'SET_COLUMNS', payload: [] },
            { type: 'SET_BACKLOG_CARDS', payload: [{ Id: 'bg1' }] }
        ]);
    });
});
