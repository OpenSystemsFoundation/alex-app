/* eslint-disable @lwc/lwc/no-inner-html */
/**
 * Tests for kanbanStore thunks (board, card, sprint) and selectors.
 *
 * All @salesforce/apex/* imports are mocked as virtual modules.
 */

// ===================================================================
// Apex Mocks — must be declared before any module that imports them
// ===================================================================
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
jest.mock(
    '@salesforce/apex/KanbanBoardController.moveCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.createCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.createBacklogCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.updateCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.deleteCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.reorderBacklogCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
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

// ===================================================================
// Imports
// ===================================================================
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import getBacklogCardsApex from '@salesforce/apex/KanbanBoardController.getBacklogCards';
import moveCardApex from '@salesforce/apex/KanbanBoardController.moveCard';
import createCardApex from '@salesforce/apex/KanbanBoardController.createCard';
import createBacklogCardApex from '@salesforce/apex/KanbanBoardController.createBacklogCard';
import updateCardApex from '@salesforce/apex/KanbanBoardController.updateCard';
import deleteCardApex from '@salesforce/apex/KanbanBoardController.deleteCard';
import reorderBacklogCardApex from '@salesforce/apex/KanbanBoardController.reorderBacklogCard';
import getSprintDataApex from '@salesforce/apex/KanbanBoardController.getSprintData';
import createSprintApex from '@salesforce/apex/KanbanBoardController.createSprint';
import startSprintApex from '@salesforce/apex/KanbanBoardController.startSprint';
import completeSprintApex from '@salesforce/apex/KanbanBoardController.completeSprint';
import addCardsToSprintApex from '@salesforce/apex/KanbanBoardController.addCardsToSprint';
import removeCardFromSprintApex from '@salesforce/apex/KanbanBoardController.removeCardFromSprint';
import getBurndownDataApex from '@salesforce/apex/KanbanBoardController.getBurndownData';
import getVelocityDataApex from '@salesforce/apex/KanbanBoardController.getVelocityData';

// Selectors — pure functions, imported directly
import {
    getColumns,
    getBoard,
    getBoardId,
    findCard,
    findColumn,
    getCardsByColumn,
    isDragging,
    getDragSource,
    getDragState,
    getTotalCardCount,
    getColumnCount,
    getCardsByColumnMap,
    getEnrichedColumns,
    getIsLoading,
    getError,
    getSubscriptionStatus,
    getSyncState,
    getPendingOperations,
    getPendingOperationsForCard,
    hasPendingOperations,
    cardHasPendingOperations,
    getLastSyncTime,
    getLastSyncError,
    getSyncStatusMessage,
    getActiveSprint,
    getSprints,
    getSprintCards,
    isSprintBoard,
    getSprintProgress,
    getSprintDaysRemaining,
    getBacklogCards,
    isBacklogVisible,
    getSelectedBacklogCards,
    getBacklogCardCount,
    getBacklogCardById,
    getUnrefinedBacklogCards,
    isBacklogSyncing
} from '../../kanbanStore/state/selectors';

// Action types — for asserting dispatched actions
import * as types from '../../kanbanStore/core/actionTypes';

// Thunks under test
import { loadBoardData } from '../../kanbanStore/thunks/boardThunks';
import {
    moveCardAsync,
    createCardAsync,
    updateCardAsync,
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    deleteCardAsync,
    reorderBacklogCardAsync
} from '../../kanbanStore/thunks/cardThunks';
import {
    loadSprintDataAsync,
    createSprintAsync,
    startSprintAsync,
    completeSprintAsync,
    addCardsToSprintAsync,
    removeCardFromSprintAsync,
    loadBurndownDataAsync,
    loadVelocityDataAsync,
    moveCardToBacklogAsync,
    moveCardsToSprintAsync
} from '../../kanbanStore/thunks/sprintThunks';

// ===================================================================
// Helpers
// ===================================================================

/** Build a minimal mock state object, merging overrides. */
const buildState = (overrides = {}) => ({
    board: null,
    boardId: null,
    columns: [],
    isDragging: false,
    dragSource: null,
    dragState: null,
    isLoading: false,
    error: null,
    subscriptionStatus: 'disconnected',
    syncState: 'idle',
    pendingOperations: [],
    lastSyncTime: null,
    lastSyncError: null,
    activeSprint: null,
    sprints: [],
    sprintCards: [],
    backlogCards: [],
    backlogVisible: false,
    selectedBacklogCards: [],
    backlogSyncing: false,
    ...overrides
});

/** Create dispatch spy and getState stub for thunk tests. */
const createThunkHelpers = (stateOverrides = {}) => {
    const state = buildState(stateOverrides);
    const getState = jest.fn(() => state);
    const dispatch = jest.fn((action) => {
        // If a thunk is dispatched (function), call it recursively
        if (typeof action === 'function') {
            return action(dispatch, getState);
        }
        return action;
    });
    return { dispatch, getState, state };
};

// ===================================================================
// SELECTORS
// ===================================================================

describe('Selectors', () => {
    // ----- getColumns -----
    describe('getColumns', () => {
        it('returns columns when not dragging', () => {
            const cols = [{ Id: 'c1' }];
            expect(getColumns({ columns: cols, isDragging: false })).toBe(cols);
        });

        it('returns dragState array when dragging', () => {
            const drag = [{ Id: 'dc1' }];
            expect(
                getColumns({ columns: [], isDragging: true, dragState: drag })
            ).toBe(drag);
        });

        it('returns columns when isDragging but dragState is not an array', () => {
            const cols = [{ Id: 'c1' }];
            expect(
                getColumns({
                    columns: cols,
                    isDragging: true,
                    dragState: 'not-array'
                })
            ).toBe(cols);
        });

        it('returns empty array when columns is undefined', () => {
            expect(getColumns({})).toEqual([]);
        });
    });

    // ----- getBoard / getBoardId -----
    describe('getBoard / getBoardId', () => {
        it('returns board', () => {
            const board = { Id: 'b1' };
            expect(getBoard({ board })).toBe(board);
        });
        it('returns null when no board', () => {
            expect(getBoard({})).toBeNull();
        });
        it('returns boardId', () => {
            expect(getBoardId({ boardId: 'b1' })).toBe('b1');
        });
        it('returns null when no boardId', () => {
            expect(getBoardId({})).toBeNull();
        });
    });

    // ----- findCard -----
    describe('findCard', () => {
        const state = {
            columns: [
                { Id: 'c1', cards: [{ Id: 'card1' }, { Id: 'card2' }] },
                { Id: 'c2', cards: [{ Id: 'card3' }] }
            ]
        };
        it('finds a card in the first column', () => {
            expect(findCard(state, 'card1')).toEqual({ Id: 'card1' });
        });
        it('finds a card in another column', () => {
            expect(findCard(state, 'card3')).toEqual({ Id: 'card3' });
        });
        it('returns null for non-existent card', () => {
            expect(findCard(state, 'missing')).toBeNull();
        });
        it('returns null when cardId is falsy', () => {
            expect(findCard(state, null)).toBeNull();
        });
        it('returns null when columns is undefined', () => {
            expect(findCard({}, 'card1')).toBeNull();
        });
    });

    // ----- findColumn -----
    describe('findColumn', () => {
        const state = {
            columns: [
                { Id: 'c1', Name: 'Todo' },
                { Id: 'c2', Name: 'Done' }
            ]
        };
        it('finds a column by id', () => {
            expect(findColumn(state, 'c1')).toEqual({
                Id: 'c1',
                Name: 'Todo'
            });
        });
        it('returns null for missing column', () => {
            expect(findColumn(state, 'cx')).toBeNull();
        });
        it('returns null when columnId is falsy', () => {
            expect(findColumn(state, null)).toBeNull();
        });
        it('returns null when columns undefined', () => {
            expect(findColumn({}, 'c1')).toBeNull();
        });
    });

    // ----- getCardsByColumn -----
    describe('getCardsByColumn', () => {
        it('returns cards for a column', () => {
            const cards = [{ Id: 'k1' }];
            const state = { columns: [{ Id: 'c1', cards }] };
            expect(getCardsByColumn(state, 'c1')).toBe(cards);
        });
        it('returns empty array for unknown column', () => {
            expect(getCardsByColumn({ columns: [] }, 'c1')).toEqual([]);
        });
    });

    // ----- isDragging / getDragSource / getDragState -----
    describe('drag selectors', () => {
        it('isDragging returns false by default', () => {
            expect(isDragging({})).toBe(false);
        });
        it('isDragging returns true when set', () => {
            expect(isDragging({ isDragging: true })).toBe(true);
        });
        it('getDragSource returns source', () => {
            const src = { cardId: 'x' };
            expect(getDragSource({ dragSource: src })).toBe(src);
        });
        it('getDragSource returns null by default', () => {
            expect(getDragSource({})).toBeNull();
        });
        it('getDragState returns state', () => {
            const ds = [{ Id: 'c1' }];
            expect(getDragState({ dragState: ds })).toBe(ds);
        });
        it('getDragState returns null by default', () => {
            expect(getDragState({})).toBeNull();
        });
    });

    // ----- getTotalCardCount / getColumnCount -----
    describe('count selectors', () => {
        it('getTotalCardCount sums cardCount', () => {
            const state = {
                columns: [{ cardCount: 3 }, { cardCount: 5 }]
            };
            expect(getTotalCardCount(state)).toBe(8);
        });
        it('getTotalCardCount returns 0 with no columns', () => {
            expect(getTotalCardCount({})).toBe(0);
        });
        it('getColumnCount returns length', () => {
            expect(
                getColumnCount({ columns: [{ Id: 'a' }, { Id: 'b' }] })
            ).toBe(2);
        });
        it('getColumnCount returns 0 with no columns', () => {
            expect(getColumnCount({})).toBe(0);
        });
    });

    // ----- getCardsByColumnMap -----
    describe('getCardsByColumnMap', () => {
        it('maps column IDs to their cards', () => {
            const state = {
                columns: [
                    { Id: 'c1', cards: [{ Id: 'k1' }] },
                    { Id: 'c2', cards: [] }
                ]
            };
            const map = getCardsByColumnMap(state);
            expect(map.c1).toEqual([{ Id: 'k1' }]);
            expect(map.c2).toEqual([]);
        });
        it('returns empty object for no columns', () => {
            expect(getCardsByColumnMap({ columns: [] })).toEqual({});
        });
    });

    // ----- getEnrichedColumns -----
    describe('getEnrichedColumns', () => {
        it('delegates to getColumns', () => {
            const cols = [{ Id: 'c1' }];
            expect(getEnrichedColumns({ columns: cols })).toBe(cols);
        });
    });

    // ----- loading / error / subscription -----
    describe('loading, error, subscription selectors', () => {
        it('getIsLoading', () => {
            expect(getIsLoading({})).toBe(false);
            expect(getIsLoading({ isLoading: true })).toBe(true);
        });
        it('getError', () => {
            expect(getError({})).toBeNull();
            expect(getError({ error: 'oops' })).toBe('oops');
        });
        it('getSubscriptionStatus', () => {
            expect(getSubscriptionStatus({})).toBe('disconnected');
            expect(
                getSubscriptionStatus({ subscriptionStatus: 'connected' })
            ).toBe('connected');
        });
    });

    // ----- sync selectors -----
    describe('sync selectors', () => {
        it('getSyncState defaults to idle', () => {
            expect(getSyncState({})).toBe('idle');
        });
        it('getPendingOperations defaults to []', () => {
            expect(getPendingOperations({})).toEqual([]);
        });
        it('getPendingOperationsForCard filters by cardId', () => {
            const ops = [
                { cardId: 'k1', type: 'move' },
                { cardId: 'k2', type: 'update' },
                { cardId: 'k1', type: 'update' }
            ];
            expect(
                getPendingOperationsForCard({ pendingOperations: ops }, 'k1')
            ).toEqual([
                { cardId: 'k1', type: 'move' },
                { cardId: 'k1', type: 'update' }
            ]);
        });
        it('hasPendingOperations', () => {
            expect(hasPendingOperations({})).toBe(false);
            expect(
                hasPendingOperations({
                    pendingOperations: [{ id: '1' }]
                })
            ).toBe(true);
        });
        it('cardHasPendingOperations', () => {
            expect(cardHasPendingOperations({}, 'k1')).toBe(false);
            expect(
                cardHasPendingOperations(
                    { pendingOperations: [{ cardId: 'k1' }] },
                    'k1'
                )
            ).toBe(true);
            expect(
                cardHasPendingOperations(
                    { pendingOperations: [{ cardId: 'k2' }] },
                    'k1'
                )
            ).toBe(false);
        });
        it('getLastSyncTime', () => {
            expect(getLastSyncTime({})).toBeNull();
            expect(getLastSyncTime({ lastSyncTime: 123 })).toBe(123);
        });
        it('getLastSyncError', () => {
            expect(getLastSyncError({})).toBeNull();
            expect(getLastSyncError({ lastSyncError: 'err' })).toBe('err');
        });
    });

    // ----- getSyncStatusMessage -----
    describe('getSyncStatusMessage', () => {
        it('returns saving message when syncing with 1 pending', () => {
            expect(
                getSyncStatusMessage({
                    syncState: 'syncing',
                    pendingOperations: [{ id: '1' }]
                })
            ).toBe('Saving changes...');
        });
        it('returns count message when syncing with many pending', () => {
            expect(
                getSyncStatusMessage({
                    syncState: 'syncing',
                    pendingOperations: [{ id: '1' }, { id: '2' }]
                })
            ).toBe('Saving 2 changes...');
        });
        it('returns failed message', () => {
            expect(getSyncStatusMessage({ syncState: 'failed' })).toBe(
                'Failed to save changes'
            );
        });
        it('returns saved message when idle with lastSyncTime', () => {
            expect(
                getSyncStatusMessage({ syncState: 'idle', lastSyncTime: 100 })
            ).toBe('All changes saved');
        });
        it('returns empty string when idle without lastSyncTime', () => {
            expect(getSyncStatusMessage({ syncState: 'idle' })).toBe('');
        });
        it('returns empty for unknown syncState', () => {
            expect(getSyncStatusMessage({ syncState: 'unknown' })).toBe('');
        });
    });

    // ----- sprint selectors -----
    describe('sprint selectors', () => {
        it('getActiveSprint', () => {
            expect(getActiveSprint({})).toBeNull();
            const sp = { Id: 's1' };
            expect(getActiveSprint({ activeSprint: sp })).toBe(sp);
        });
        it('getSprints', () => {
            expect(getSprints({})).toEqual([]);
            const list = [{ Id: 's1' }];
            expect(getSprints({ sprints: list })).toBe(list);
        });
        it('getSprintCards', () => {
            expect(getSprintCards({})).toEqual([]);
        });
        it('isSprintBoard', () => {
            expect(isSprintBoard({})).toBe(false);
            expect(isSprintBoard({ board: { type: 'Sprint' } })).toBe(true);
            expect(isSprintBoard({ board: { type: 'Kanban' } })).toBe(false);
        });
    });

    // ----- getSprintProgress -----
    describe('getSprintProgress', () => {
        it('returns 0 when no sprint', () => {
            expect(getSprintProgress({})).toBe(0);
        });
        it('returns 0 when totalStoryPoints is 0', () => {
            expect(
                getSprintProgress({
                    activeSprint: { totalStoryPoints: 0 }
                })
            ).toBe(0);
        });
        it('calculates percentage', () => {
            expect(
                getSprintProgress({
                    activeSprint: {
                        totalStoryPoints: 10,
                        completedStoryPoints: 3
                    }
                })
            ).toBe(30);
        });
        it('handles missing completedStoryPoints', () => {
            expect(
                getSprintProgress({
                    activeSprint: { totalStoryPoints: 10 }
                })
            ).toBe(0);
        });
    });

    // ----- getSprintDaysRemaining -----
    describe('getSprintDaysRemaining', () => {
        it('returns null when no sprint', () => {
            expect(getSprintDaysRemaining({})).toBeNull();
        });
        it('returns null when no endDate', () => {
            expect(getSprintDaysRemaining({ activeSprint: {} })).toBeNull();
        });
        it('calculates days remaining', () => {
            const future = new Date();
            future.setDate(future.getDate() + 5);
            const result = getSprintDaysRemaining({
                activeSprint: { endDate: future.toISOString() }
            });
            expect(result).toBe(5);
        });
        it('returns negative for past dates', () => {
            const past = new Date();
            past.setDate(past.getDate() - 3);
            const result = getSprintDaysRemaining({
                activeSprint: { endDate: past.toISOString() }
            });
            expect(result).toBe(-3);
        });
    });

    // ----- backlog selectors -----
    describe('backlog selectors', () => {
        it('getBacklogCards', () => {
            expect(getBacklogCards({})).toEqual([]);
            const cards = [{ Id: 'bk1' }];
            expect(getBacklogCards({ backlogCards: cards })).toBe(cards);
        });
        it('isBacklogVisible', () => {
            expect(isBacklogVisible({})).toBe(false);
            expect(isBacklogVisible({ backlogVisible: true })).toBe(true);
        });
        it('getSelectedBacklogCards', () => {
            expect(getSelectedBacklogCards({})).toEqual([]);
            expect(
                getSelectedBacklogCards({
                    selectedBacklogCards: ['a', 'b']
                })
            ).toEqual(['a', 'b']);
        });
        it('getBacklogCardCount', () => {
            expect(getBacklogCardCount({})).toBe(0);
            expect(
                getBacklogCardCount({
                    backlogCards: [{ Id: '1' }, { Id: '2' }]
                })
            ).toBe(2);
        });
        it('getBacklogCardById', () => {
            const cards = [{ Id: 'b1' }, { Id: 'b2' }];
            expect(getBacklogCardById({ backlogCards: cards }, 'b2')).toEqual({
                Id: 'b2'
            });
            expect(
                getBacklogCardById({ backlogCards: cards }, 'missing')
            ).toBeNull();
            expect(getBacklogCardById({}, 'b1')).toBeNull();
        });
        it('getUnrefinedBacklogCards', () => {
            const cards = [
                { Id: '1', needsRefinement: true },
                { Id: '2', needsRefinement: false },
                { Id: '3', needsRefinement: true }
            ];
            expect(getUnrefinedBacklogCards({ backlogCards: cards })).toEqual([
                { Id: '1', needsRefinement: true },
                { Id: '3', needsRefinement: true }
            ]);
            expect(getUnrefinedBacklogCards({})).toEqual([]);
        });
        it('isBacklogSyncing', () => {
            expect(isBacklogSyncing({})).toBe(false);
            expect(isBacklogSyncing({ backlogSyncing: true })).toBe(true);
        });
    });
});

// ===================================================================
// BOARD THUNKS
// ===================================================================

describe('boardThunks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loadBoardData', () => {
        it('throws when boardId is falsy', async () => {
            const { dispatch } = createThunkHelpers();
            await expect(loadBoardData(null)(dispatch)).rejects.toThrow(
                'Board ID is required'
            );
        });

        it('loads board data and dispatches setBoard + setColumns', async () => {
            const board = { Id: 'b1', Name: 'My Board', type: 'Kanban' };
            const columns = [{ Id: 'c1', Name: 'Todo' }];
            const cards = [{ Id: 'k1', columnId: 'c1', position: '1000' }];

            getBoardData.mockResolvedValue({ board, columns, cards });
            getBacklogCardsApex.mockResolvedValue([]);

            const { dispatch } = createThunkHelpers();

            const result = await loadBoardData('b1')(dispatch);

            expect(getBoardData).toHaveBeenCalledWith({ boardId: 'b1' });
            expect(result.success).toBe(true);
            expect(result.board).toBe(board);

            // Verify setBoard was dispatched
            const setBoardCall = dispatch.mock.calls.find(
                (c) => typeof c[0] === 'object' && c[0].type === types.SET_BOARD
            );
            expect(setBoardCall).toBeTruthy();
            expect(setBoardCall[0].payload).toBe(board);

            // Verify setColumns was dispatched
            const setColumnsCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.SET_COLUMNS
            );
            expect(setColumnsCall).toBeTruthy();
        });

        it('loads sprint data for Sprint board type', async () => {
            const board = { Id: 'b1', type: 'Sprint' };
            getBoardData.mockResolvedValue({
                board,
                columns: [],
                cards: []
            });
            getSprintDataApex.mockResolvedValue({
                activeSprint: { Id: 's1' },
                sprints: [],
                sprintCards: [],
                backlogCards: []
            });

            const { dispatch } = createThunkHelpers();

            await loadBoardData('b1')(dispatch);

            // loadSprintDataAsync is dispatched as a thunk
            const thunkCalls = dispatch.mock.calls.filter(
                (c) => typeof c[0] === 'function'
            );
            expect(thunkCalls.length).toBeGreaterThan(0);
        });

        it('loads backlog cards for non-Sprint board type', async () => {
            const board = { Id: 'b1', type: 'Kanban' };
            const backlog = [{ Id: 'bl1' }];
            getBoardData.mockResolvedValue({
                board,
                columns: [],
                cards: []
            });
            getBacklogCardsApex.mockResolvedValue(backlog);

            const { dispatch } = createThunkHelpers();

            await loadBoardData('b1')(dispatch);

            expect(getBacklogCardsApex).toHaveBeenCalledWith({
                boardId: 'b1'
            });
            const setBacklogCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_BACKLOG_CARDS
            );
            expect(setBacklogCall).toBeTruthy();
            expect(setBacklogCall[0].payload).toBe(backlog);
        });

        it('throws on apex error', async () => {
            getBoardData.mockRejectedValue(new Error('server down'));
            const { dispatch } = createThunkHelpers();
            await expect(loadBoardData('b1')(dispatch)).rejects.toThrow(
                'server down'
            );
        });

        it('handles sprint data load error gracefully', async () => {
            const board = { Id: 'b1', type: 'Sprint' };
            getBoardData.mockResolvedValue({
                board,
                columns: [],
                cards: []
            });
            getSprintDataApex.mockRejectedValue(new Error('sprint err'));

            const { dispatch } = createThunkHelpers();
            // Should not throw — sprint error is caught internally
            const result = await loadBoardData('b1')(dispatch);
            expect(result.success).toBe(true);
        });

        it('handles backlog load error gracefully', async () => {
            const board = { Id: 'b1', type: 'Kanban' };
            getBoardData.mockResolvedValue({
                board,
                columns: [],
                cards: []
            });
            getBacklogCardsApex.mockRejectedValue(new Error('backlog err'));

            const { dispatch } = createThunkHelpers();
            const result = await loadBoardData('b1')(dispatch);
            expect(result.success).toBe(true);
        });
    });
});

// ===================================================================
// CARD THUNKS
// ===================================================================

describe('cardThunks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----- moveCardAsync -----
    describe('moveCardAsync', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [
                    { Id: 'k1', position: '1000' },
                    { Id: 'k2', position: '2000' }
                ]
            },
            { Id: 'col2', cards: [] }
        ];

        it('moves card and dispatches moveCardAction', async () => {
            moveCardApex.mockResolvedValue({ success: true });
            const { dispatch, getState } = createThunkHelpers({ columns });

            const result = await moveCardAsync(
                'k1',
                'col2',
                0
            )(dispatch, getState);

            expect(moveCardApex).toHaveBeenCalledWith(
                expect.objectContaining({
                    cardId: 'k1',
                    targetColumnId: 'col2'
                })
            );
            expect(result.success).toBe(true);

            const moveCall = dispatch.mock.calls.find(
                (c) => typeof c[0] === 'object' && c[0].type === types.MOVE_CARD
            );
            expect(moveCall).toBeTruthy();
        });

        it('commits drag when isDragging', async () => {
            moveCardApex.mockResolvedValue({});
            const { dispatch, getState } = createThunkHelpers({
                columns,
                isDragging: true
            });

            await moveCardAsync('k1', 'col1', 1)(dispatch, getState);

            const commitCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.COMMIT_DRAG
            );
            expect(commitCall).toBeTruthy();
        });

        it('throws when target column not found', async () => {
            const { dispatch, getState } = createThunkHelpers({ columns });
            await expect(
                moveCardAsync('k1', 'nonexistent', 0)(dispatch, getState)
            ).rejects.toThrow('Target column not found');
        });

        it('throws on apex error', async () => {
            moveCardApex.mockRejectedValue(new Error('move failed'));
            const { dispatch, getState } = createThunkHelpers({ columns });
            await expect(
                moveCardAsync('k1', 'col2', 0)(dispatch, getState)
            ).rejects.toThrow('move failed');
        });

        it('passes requestId and clientId when provided', async () => {
            moveCardApex.mockResolvedValue({});
            const { dispatch, getState } = createThunkHelpers({ columns });

            await moveCardAsync(
                'k1',
                'col2',
                0,
                'req1',
                'client1'
            )(dispatch, getState);

            expect(moveCardApex).toHaveBeenCalledWith(
                expect.objectContaining({
                    clientRequestId: 'req1',
                    clientId: 'client1'
                })
            );
        });
    });

    // ----- createCardAsync -----
    describe('createCardAsync', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'k1', position: '1000' }]
            }
        ];

        it('creates card and dispatches addCard', async () => {
            const newCard = { Id: 'k2', subject: 'Test' };
            createCardApex.mockResolvedValue(newCard);
            const { dispatch, getState } = createThunkHelpers({ columns });

            const result = await createCardAsync('col1', 'Test')(
                dispatch,
                getState
            );

            expect(createCardApex).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnId: 'col1',
                    subject: 'Test'
                })
            );
            expect(result.success).toBe(true);
            expect(result.card).toBe(newCard);

            const addCall = dispatch.mock.calls.find(
                (c) => typeof c[0] === 'object' && c[0].type === types.ADD_CARD
            );
            expect(addCall).toBeTruthy();
            expect(addCall[0].payload.card).toBe(newCard);
            expect(addCall[0].payload.columnId).toBe('col1');
        });

        it('defaults subject to "New Card" when empty', async () => {
            createCardApex.mockResolvedValue({ Id: 'k99' });
            const { dispatch, getState } = createThunkHelpers({ columns });

            await createCardAsync('col1', '')(dispatch, getState);

            expect(createCardApex).toHaveBeenCalledWith(
                expect.objectContaining({ subject: 'New Card' })
            );
        });

        it('throws when column not found', async () => {
            const { dispatch, getState } = createThunkHelpers({ columns });
            await expect(
                createCardAsync('bad', 'x')(dispatch, getState)
            ).rejects.toThrow('Column not found');
        });

        it('throws on apex error', async () => {
            createCardApex.mockRejectedValue(new Error('create failed'));
            const { dispatch, getState } = createThunkHelpers({ columns });
            await expect(
                createCardAsync('col1', 'x')(dispatch, getState)
            ).rejects.toThrow('create failed');
        });

        it('passes requestId and clientId when provided', async () => {
            createCardApex.mockResolvedValue({ Id: 'k99' });
            const { dispatch, getState } = createThunkHelpers({ columns });

            await createCardAsync(
                'col1',
                'Test',
                'req1',
                'client1'
            )(dispatch, getState);

            expect(createCardApex).toHaveBeenCalledWith(
                expect.objectContaining({
                    clientRequestId: 'req1',
                    clientId: 'client1'
                })
            );
        });
    });

    // ----- updateCardAsync -----
    describe('updateCardAsync', () => {
        it('dispatches optimistic update then calls apex', async () => {
            const updated = { Id: 'k1', subject: 'Updated' };
            updateCardApex.mockResolvedValue(updated);
            const { dispatch } = createThunkHelpers();

            const result = await updateCardAsync('k1', { subject: 'Updated' })(
                dispatch
            );

            // First dispatch should be optimistic updateCard
            const firstAction = dispatch.mock.calls[0][0];
            expect(firstAction.type).toBe(types.UPDATE_CARD);
            expect(firstAction.payload.cardId).toBe('k1');

            expect(updateCardApex).toHaveBeenCalledWith({
                cardId: 'k1',
                updates: { subject: 'Updated' }
            });
            expect(result.success).toBe(true);
        });

        it('passes clientId when provided', async () => {
            updateCardApex.mockResolvedValue({});
            const { dispatch } = createThunkHelpers();

            await updateCardAsync('k1', { subject: 'x' }, 'client1')(dispatch);

            expect(updateCardApex).toHaveBeenCalledWith(
                expect.objectContaining({ clientId: 'client1' })
            );
        });

        it('throws on apex error', async () => {
            updateCardApex.mockRejectedValue(new Error('update failed'));
            const { dispatch } = createThunkHelpers();
            await expect(updateCardAsync('k1', {})(dispatch)).rejects.toThrow(
                'update failed'
            );
        });
    });

    // ----- createBacklogCardAsync -----
    describe('createBacklogCardAsync', () => {
        it('creates card and dispatches addBacklogCard', async () => {
            const newCard = { Id: 'bk1', subject: 'Backlog Item' };
            createBacklogCardApex.mockResolvedValue(newCard);
            const { dispatch } = createThunkHelpers();

            const result = await createBacklogCardAsync('b1', {
                subject: 'Backlog Item',
                cardType: 'Bug',
                priority: 'High',
                storyPoints: 3
            })(dispatch);

            expect(createBacklogCardApex).toHaveBeenCalledWith({
                boardId: 'b1',
                subject: 'Backlog Item',
                cardType: 'Bug',
                priority: 'High',
                storyPoints: 3
            });
            expect(result.success).toBe(true);
            expect(result.card).toBe(newCard);

            const addCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.ADD_BACKLOG_CARD
            );
            expect(addCall).toBeTruthy();
            expect(addCall[0].payload).toBe(newCard);
        });

        it('defaults optional fields to null', async () => {
            createBacklogCardApex.mockResolvedValue({ Id: 'bk2' });
            const { dispatch } = createThunkHelpers();

            await createBacklogCardAsync('b1', {})(dispatch);

            expect(createBacklogCardApex).toHaveBeenCalledWith({
                boardId: 'b1',
                subject: 'New Card',
                cardType: null,
                priority: null,
                storyPoints: null
            });
        });

        it('throws on apex error', async () => {
            createBacklogCardApex.mockRejectedValue(new Error('fail'));
            const { dispatch } = createThunkHelpers();
            await expect(
                createBacklogCardAsync('b1', { subject: 'x' })(dispatch)
            ).rejects.toThrow('fail');
        });
    });

    // ----- updateBacklogCardAsync -----
    describe('updateBacklogCardAsync', () => {
        it('dispatches optimistic update then calls apex', async () => {
            updateCardApex.mockResolvedValue({});
            const { dispatch } = createThunkHelpers();

            const result = await updateBacklogCardAsync('k1', {
                subject: 'Changed'
            })(dispatch);

            const first = dispatch.mock.calls[0][0];
            expect(first.type).toBe(types.UPDATE_BACKLOG_CARD);
            expect(first.payload.cardId).toBe('k1');

            expect(updateCardApex).toHaveBeenCalledWith({
                cardId: 'k1',
                updates: { subject: 'Changed' }
            });
            expect(result.success).toBe(true);
        });

        it('throws on apex error', async () => {
            updateCardApex.mockRejectedValue(new Error('fail'));
            const { dispatch } = createThunkHelpers();
            await expect(
                updateBacklogCardAsync('k1', {})(dispatch)
            ).rejects.toThrow('fail');
        });
    });

    // ----- deleteBacklogCardsAsync -----
    describe('deleteBacklogCardsAsync', () => {
        it('deletes multiple cards and dispatches removeBacklogCard for each', async () => {
            deleteCardApex.mockResolvedValue({});
            const { dispatch } = createThunkHelpers();

            const result = await deleteBacklogCardsAsync(['k1', 'k2', 'k3'])(
                dispatch
            );

            expect(deleteCardApex).toHaveBeenCalledTimes(3);
            expect(result.success).toBe(true);

            const removeCalls = dispatch.mock.calls.filter(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.REMOVE_BACKLOG_CARD
            );
            expect(removeCalls).toHaveLength(3);
        });

        it('throws if any delete fails', async () => {
            deleteCardApex
                .mockResolvedValueOnce({})
                .mockRejectedValueOnce(new Error('fail'));
            const { dispatch } = createThunkHelpers();
            await expect(
                deleteBacklogCardsAsync(['k1', 'k2'])(dispatch)
            ).rejects.toThrow('fail');
        });
    });

    // ----- deleteCardAsync -----
    describe('deleteCardAsync', () => {
        it('deletes card on server then dispatches deleteCardAction', async () => {
            deleteCardApex.mockResolvedValue({});
            const { dispatch } = createThunkHelpers();

            const result = await deleteCardAsync('k1')(dispatch);

            expect(deleteCardApex).toHaveBeenCalledWith({ cardId: 'k1' });
            expect(result.success).toBe(true);

            const delCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.DELETE_CARD
            );
            expect(delCall).toBeTruthy();
            expect(delCall[0].payload.cardId).toBe('k1');
        });

        it('throws on apex error', async () => {
            deleteCardApex.mockRejectedValue(new Error('del err'));
            const { dispatch } = createThunkHelpers();
            await expect(deleteCardAsync('k1')(dispatch)).rejects.toThrow(
                'del err'
            );
        });
    });

    // ----- reorderBacklogCardAsync -----
    describe('reorderBacklogCardAsync', () => {
        const backlogCards = [
            { Id: 'b1', position: '1000' },
            { Id: 'b2', position: '2000' },
            { Id: 'b3', position: '3000' }
        ];

        it('optimistically reorders, sets syncing, calls apex, then updates position', async () => {
            reorderBacklogCardApex.mockResolvedValue('1500');
            const { dispatch, getState } = createThunkHelpers({
                backlogCards
            });

            const result = await reorderBacklogCardAsync('b3', 1)(
                dispatch,
                getState
            );

            expect(result.success).toBe(true);

            // reorderBacklog dispatched
            const reorderCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.REORDER_BACKLOG
            );
            expect(reorderCall).toBeTruthy();

            // setBacklogSyncing(true) dispatched
            const syncTrueCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_BACKLOG_SYNCING &&
                    c[0].payload === true
            );
            expect(syncTrueCall).toBeTruthy();

            // setBacklogSyncing(false) dispatched in finally
            const syncFalseCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_BACKLOG_SYNCING &&
                    c[0].payload === false
            );
            expect(syncFalseCall).toBeTruthy();
        });

        it('reverts backlog on apex error', async () => {
            reorderBacklogCardApex.mockRejectedValue(new Error('reorder err'));
            const { dispatch, getState } = createThunkHelpers({
                backlogCards
            });

            await expect(
                reorderBacklogCardAsync('b3', 1)(dispatch, getState)
            ).rejects.toThrow('reorder err');

            // setBacklogCards called to revert
            const revertCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_BACKLOG_CARDS
            );
            expect(revertCall).toBeTruthy();
            expect(revertCall[0].payload).toBe(backlogCards);
        });

        it('returns early if card not found after reorder', async () => {
            // getState returns backlogCards without the target card after reorder
            const dispatch = jest.fn();
            const getState = jest.fn(() => ({
                backlogCards: [
                    { Id: 'b1', position: '1000' },
                    { Id: 'b2', position: '2000' }
                ],
                backlogSyncing: false
            }));

            const result = await reorderBacklogCardAsync('missing', 0)(
                dispatch,
                getState
            );

            expect(result.success).toBe(true);
            expect(reorderBacklogCardApex).not.toHaveBeenCalled();
        });
    });
});

// ===================================================================
// SPRINT THUNKS
// ===================================================================

describe('sprintThunks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----- loadSprintDataAsync -----
    describe('loadSprintDataAsync', () => {
        it('throws when boardId is falsy', async () => {
            const { dispatch } = createThunkHelpers();
            await expect(loadSprintDataAsync(null)(dispatch)).rejects.toThrow(
                'Board ID is required'
            );
        });

        it('dispatches sprint data when all fields present', async () => {
            const data = {
                activeSprint: { Id: 's1' },
                sprints: [{ Id: 's1' }],
                sprintCards: [{ cardId: 'k1' }],
                backlogCards: [{ Id: 'bk1' }]
            };
            getSprintDataApex.mockResolvedValue(data);
            const { dispatch } = createThunkHelpers();

            const result = await loadSprintDataAsync('b1')(dispatch);

            expect(result.success).toBe(true);

            const dispatched = dispatch.mock.calls.map((c) => c[0]);
            expect(
                dispatched.find((a) => a.type === types.SET_SPRINT)
            ).toBeTruthy();
            expect(
                dispatched.find((a) => a.type === types.SET_SPRINTS)
            ).toBeTruthy();
            expect(
                dispatched.find((a) => a.type === types.SET_SPRINT_CARDS)
            ).toBeTruthy();
            expect(
                dispatched.find((a) => a.type === types.SET_BACKLOG_CARDS)
            ).toBeTruthy();
        });

        it('skips dispatches for missing fields', async () => {
            getSprintDataApex.mockResolvedValue({});
            const { dispatch } = createThunkHelpers();

            await loadSprintDataAsync('b1')(dispatch);

            expect(dispatch).not.toHaveBeenCalled();
        });

        it('throws on apex error', async () => {
            getSprintDataApex.mockRejectedValue(new Error('sprint err'));
            const { dispatch } = createThunkHelpers();
            await expect(loadSprintDataAsync('b1')(dispatch)).rejects.toThrow(
                'sprint err'
            );
        });
    });

    // ----- createSprintAsync -----
    describe('createSprintAsync', () => {
        it('creates sprint and adds to sprints list', async () => {
            const sprint = { Id: 's2', goal: 'Ship it' };
            createSprintApex.mockResolvedValue(sprint);
            const { dispatch, getState } = createThunkHelpers({
                sprints: [{ Id: 's1' }]
            });

            const result = await createSprintAsync(
                'b1',
                'Ship it',
                '2026-01-01',
                '2026-01-14'
            )(dispatch, getState);

            expect(createSprintApex).toHaveBeenCalledWith({
                boardId: 'b1',
                goal: 'Ship it',
                startDate: '2026-01-01',
                endDate: '2026-01-14'
            });
            expect(result.success).toBe(true);

            const sprintsCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.SET_SPRINTS
            );
            expect(sprintsCall).toBeTruthy();
            expect(sprintsCall[0].payload).toHaveLength(2);
        });

        it('throws on apex error', async () => {
            createSprintApex.mockRejectedValue(new Error('fail'));
            const { dispatch, getState } = createThunkHelpers();
            await expect(
                createSprintAsync('b1', 'x', 'y', 'z')(dispatch, getState)
            ).rejects.toThrow('fail');
        });
    });

    // ----- startSprintAsync -----
    describe('startSprintAsync', () => {
        it('starts sprint and dispatches setSprint', async () => {
            const sprint = { Id: 's1', status: 'Active' };
            startSprintApex.mockResolvedValue(sprint);
            const { dispatch } = createThunkHelpers();

            const result = await startSprintAsync('s1')(dispatch);

            expect(startSprintApex).toHaveBeenCalledWith({ sprintId: 's1' });
            expect(result.success).toBe(true);

            const call = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.SET_SPRINT
            );
            expect(call).toBeTruthy();
            expect(call[0].payload).toBe(sprint);
        });

        it('throws on error', async () => {
            startSprintApex.mockRejectedValue(new Error('start err'));
            const { dispatch } = createThunkHelpers();
            await expect(startSprintAsync('s1')(dispatch)).rejects.toThrow(
                'start err'
            );
        });
    });

    // ----- completeSprintAsync -----
    describe('completeSprintAsync', () => {
        it('completes sprint and dispatches setSprint(null)', async () => {
            const sprint = { Id: 's1', status: 'Completed' };
            completeSprintApex.mockResolvedValue(sprint);
            const { dispatch } = createThunkHelpers();

            const result = await completeSprintAsync('s1', {
                k1: 'backlog'
            })(dispatch);

            expect(completeSprintApex).toHaveBeenCalledWith({
                sprintId: 's1',
                dispositions: { k1: 'backlog' }
            });
            expect(result.success).toBe(true);

            const setSprintCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_SPRINT &&
                    c[0].payload === null
            );
            expect(setSprintCall).toBeTruthy();

            const setSprintsCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.SET_SPRINTS
            );
            expect(setSprintsCall).toBeTruthy();
            expect(setSprintsCall[0].payload).toEqual([]);
        });

        it('throws on error', async () => {
            completeSprintApex.mockRejectedValue(new Error('complete err'));
            const { dispatch } = createThunkHelpers();
            await expect(
                completeSprintAsync('s1', {})(dispatch)
            ).rejects.toThrow('complete err');
        });
    });

    // ----- addCardsToSprintAsync -----
    describe('addCardsToSprintAsync', () => {
        it('adds cards to sprint and removes from backlog', async () => {
            const sprintCards = [
                { cardId: 'k1', sprintId: 's1' },
                { cardId: 'k2', sprintId: 's1' }
            ];
            addCardsToSprintApex.mockResolvedValue(sprintCards);
            const { dispatch } = createThunkHelpers();

            const result = await addCardsToSprintAsync('s1', ['k1', 'k2'])(
                dispatch
            );

            expect(addCardsToSprintApex).toHaveBeenCalledWith({
                sprintId: 's1',
                cardIds: ['k1', 'k2']
            });
            expect(result.success).toBe(true);

            // setSprintCards dispatched
            const sprintCardsCall = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_SPRINT_CARDS
            );
            expect(sprintCardsCall).toBeTruthy();

            // removeBacklogCard for each card
            const removeCalls = dispatch.mock.calls.filter(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.REMOVE_BACKLOG_CARD
            );
            expect(removeCalls).toHaveLength(2);
        });

        it('throws on error', async () => {
            addCardsToSprintApex.mockRejectedValue(new Error('add err'));
            const { dispatch } = createThunkHelpers();
            await expect(
                addCardsToSprintAsync('s1', ['k1'])(dispatch)
            ).rejects.toThrow('add err');
        });
    });

    // ----- removeCardFromSprintAsync -----
    describe('removeCardFromSprintAsync', () => {
        it('removes card from sprint and filters sprintCards', async () => {
            removeCardFromSprintApex.mockResolvedValue({});
            const { dispatch, getState } = createThunkHelpers({
                sprintCards: [
                    { cardId: 'k1', sprintId: 's1' },
                    { cardId: 'k2', sprintId: 's1' }
                ]
            });

            const result = await removeCardFromSprintAsync('s1', 'k1')(
                dispatch,
                getState
            );

            expect(removeCardFromSprintApex).toHaveBeenCalledWith({
                sprintId: 's1',
                cardId: 'k1'
            });
            expect(result.success).toBe(true);

            const call = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.SET_SPRINT_CARDS
            );
            expect(call).toBeTruthy();
            // Only k2 should remain
            expect(call[0].payload).toEqual([{ cardId: 'k2', sprintId: 's1' }]);
        });

        it('throws on error', async () => {
            removeCardFromSprintApex.mockRejectedValue(new Error('rm err'));
            const { dispatch, getState } = createThunkHelpers();
            await expect(
                removeCardFromSprintAsync('s1', 'k1')(dispatch, getState)
            ).rejects.toThrow('rm err');
        });
    });

    // ----- loadBurndownDataAsync -----
    describe('loadBurndownDataAsync', () => {
        it('loads burndown data', async () => {
            const data = [{ day: 1, remaining: 10 }];
            getBurndownDataApex.mockResolvedValue(data);

            const thunk = loadBurndownDataAsync('s1');
            const result = await thunk(
                () => {},
                () => ({})
            );

            expect(getBurndownDataApex).toHaveBeenCalledWith({
                sprintId: 's1'
            });
            expect(result.success).toBe(true);
            expect(result.data).toBe(data);
        });

        it('throws on error', async () => {
            getBurndownDataApex.mockRejectedValue(new Error('burn err'));
            await expect(
                loadBurndownDataAsync('s1')(
                    () => {},
                    () => ({})
                )
            ).rejects.toThrow('burn err');
        });
    });

    // ----- loadVelocityDataAsync -----
    describe('loadVelocityDataAsync', () => {
        it('loads velocity data with default count', async () => {
            const data = [{ sprint: 's1', velocity: 20 }];
            getVelocityDataApex.mockResolvedValue(data);

            const thunk = loadVelocityDataAsync('b1');
            const result = await thunk(
                () => {},
                () => ({})
            );

            expect(getVelocityDataApex).toHaveBeenCalledWith({
                boardId: 'b1',
                count: 10
            });
            expect(result.success).toBe(true);
            expect(result.data).toBe(data);
        });

        it('accepts custom count', async () => {
            getVelocityDataApex.mockResolvedValue([]);

            await loadVelocityDataAsync('b1', 5)(
                () => {},
                () => ({})
            );

            expect(getVelocityDataApex).toHaveBeenCalledWith({
                boardId: 'b1',
                count: 5
            });
        });

        it('throws on error', async () => {
            getVelocityDataApex.mockRejectedValue(new Error('vel err'));
            await expect(
                loadVelocityDataAsync('b1')(
                    () => {},
                    () => ({})
                )
            ).rejects.toThrow('vel err');
        });
    });

    // ----- moveCardToBacklogAsync -----
    describe('moveCardToBacklogAsync', () => {
        it('dispatches moveCardToBacklog and deleteCard, then calls apex', async () => {
            updateCardApex.mockResolvedValue({});
            removeCardFromSprintApex.mockResolvedValue({});
            const { dispatch, getState } = createThunkHelpers({
                sprintCards: [{ cardId: 'k1' }, { cardId: 'k2' }]
            });

            const result = await moveCardToBacklogAsync('s1', 'k1')(
                dispatch,
                getState
            );

            expect(result.success).toBe(true);

            // Optimistic dispatches
            const moveToBacklog = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.MOVE_CARD_TO_BACKLOG
            );
            expect(moveToBacklog).toBeTruthy();

            const delCard = dispatch.mock.calls.find(
                (c) =>
                    typeof c[0] === 'object' && c[0].type === types.DELETE_CARD
            );
            expect(delCard).toBeTruthy();

            // Server calls
            expect(updateCardApex).toHaveBeenCalledWith({
                cardId: 'k1',
                updates: { columnId: null }
            });
            expect(removeCardFromSprintApex).toHaveBeenCalledWith({
                sprintId: 's1',
                cardId: 'k1'
            });
        });

        it('skips removeCardFromSprint when no sprintId', async () => {
            updateCardApex.mockResolvedValue({});
            const { dispatch, getState } = createThunkHelpers();

            await moveCardToBacklogAsync(null, 'k1')(dispatch, getState);

            expect(removeCardFromSprintApex).not.toHaveBeenCalled();
        });

        it('throws on error', async () => {
            updateCardApex.mockRejectedValue(new Error('move err'));
            const { dispatch, getState } = createThunkHelpers();
            await expect(
                moveCardToBacklogAsync('s1', 'k1')(dispatch, getState)
            ).rejects.toThrow('move err');
        });
    });

    // ----- moveCardsToSprintAsync -----
    describe('moveCardsToSprintAsync', () => {
        it('adds cards to sprint, removes from backlog, assigns to first column', async () => {
            const sprintCards = [{ cardId: 'k1', sprintId: 's1' }];
            addCardsToSprintApex.mockResolvedValue(sprintCards);
            moveCardApex.mockResolvedValue({});

            const columns = [
                { Id: 'col1', cards: [] },
                { Id: 'col2', cards: [] }
            ];
            const backlogCards = [
                { Id: 'k1', subject: 'Story A' },
                { Id: 'k2', subject: 'Story B' }
            ];

            const { dispatch, getState } = createThunkHelpers({
                columns,
                backlogCards
            });

            const result = await moveCardsToSprintAsync('s1', ['k1'])(
                dispatch,
                getState
            );

            expect(result.success).toBe(true);
            expect(addCardsToSprintApex).toHaveBeenCalledWith({
                sprintId: 's1',
                cardIds: ['k1']
            });

            // setSprintCards dispatched
            expect(
                dispatch.mock.calls.some(
                    (c) =>
                        typeof c[0] === 'object' &&
                        c[0].type === types.SET_SPRINT_CARDS
                )
            ).toBe(true);

            // removeBacklogCard dispatched
            expect(
                dispatch.mock.calls.some(
                    (c) =>
                        typeof c[0] === 'object' &&
                        c[0].type === types.REMOVE_BACKLOG_CARD
                )
            ).toBe(true);

            // moveCard apex called to assign to first column
            expect(moveCardApex).toHaveBeenCalledWith(
                expect.objectContaining({
                    cardId: 'k1',
                    targetColumnId: 'col1'
                })
            );

            // addCard dispatched for the card
            expect(
                dispatch.mock.calls.some(
                    (c) =>
                        typeof c[0] === 'object' && c[0].type === types.ADD_CARD
                )
            ).toBe(true);
        });

        it('skips column assignment when no columns', async () => {
            addCardsToSprintApex.mockResolvedValue([]);
            const { dispatch, getState } = createThunkHelpers({
                columns: [],
                backlogCards: [{ Id: 'k1' }]
            });

            await moveCardsToSprintAsync('s1', ['k1'])(dispatch, getState);

            expect(moveCardApex).not.toHaveBeenCalled();
        });

        it('throws on error', async () => {
            addCardsToSprintApex.mockRejectedValue(new Error('move err'));
            const { dispatch, getState } = createThunkHelpers({
                backlogCards: [{ Id: 'k1' }]
            });
            await expect(
                moveCardsToSprintAsync('s1', ['k1'])(dispatch, getState)
            ).rejects.toThrow('move err');
        });

        it('handles multiple cards', async () => {
            addCardsToSprintApex.mockResolvedValue([
                { cardId: 'k1' },
                { cardId: 'k2' }
            ]);
            moveCardApex.mockResolvedValue({});

            const columns = [{ Id: 'col1', cards: [] }];
            const backlogCards = [
                { Id: 'k1', subject: 'A' },
                { Id: 'k2', subject: 'B' }
            ];
            const { dispatch, getState } = createThunkHelpers({
                columns,
                backlogCards
            });

            await moveCardsToSprintAsync('s1', ['k1', 'k2'])(
                dispatch,
                getState
            );

            // moveCard called for each card
            expect(moveCardApex).toHaveBeenCalledTimes(2);

            // removeBacklogCard for each
            const removeCalls = dispatch.mock.calls.filter(
                (c) =>
                    typeof c[0] === 'object' &&
                    c[0].type === types.REMOVE_BACKLOG_CARD
            );
            expect(removeCalls).toHaveLength(2);
        });
    });
});
