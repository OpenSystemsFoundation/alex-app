/**
 * Branch-coverage tests for slice reducers: default/fallback payloads,
 * unknown actions, and less common code paths.
 */
import { appStateReducer } from '../../state/reducers/appStateReducer';
import { backlogReducer } from '../../state/reducers/backlogReducer';
import { boardReducer } from '../../state/reducers/boardReducer';
import { cardsReducer } from '../../state/reducers/cardsReducer';
import { columnsReducer } from '../../state/reducers/columnsReducer';
import { dragReducer } from '../../state/reducers/dragReducer';
import { sprintReducer } from '../../state/reducers/sprintReducer';
import { syncReducer } from '../../state/reducers/syncReducer';
import * as types from '../../core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

beforeEach(() => resetIds());

const run = (reducer, state, type, payload) =>
    reducer(state, { type, payload });

describe('unknown actions return the same state reference', () => {
    it.each([
        ['appStateReducer', appStateReducer],
        ['backlogReducer', backlogReducer],
        ['boardReducer', boardReducer],
        ['cardsReducer', cardsReducer],
        ['columnsReducer', columnsReducer],
        ['sprintReducer', sprintReducer],
        ['syncReducer', syncReducer]
    ])('%s', (_name, reducer) => {
        const state = buildInitialState();
        expect(run(reducer, state, 'UNKNOWN_ACTION', { x: 1 })).toBe(state);
    });

    it('dragReducer passes through state and lastDragPosition', () => {
        const state = buildInitialState();
        const result = dragReducer(state, { type: 'UNKNOWN' }, 'col1-0');
        expect(result.state).toBe(state);
        expect(result.lastDragPosition).toBe('col1-0');
    });
});

describe('appStateReducer', () => {
    it('SET_EPIC_SUMMARIES stores summaries', () => {
        const summaries = [{ id: 'e1' }];
        const next = run(
            appStateReducer,
            buildInitialState(),
            types.SET_EPIC_SUMMARIES,
            summaries
        );
        expect(next.epicSummaries).toBe(summaries);
    });

    it('SET_EPIC_SUMMARIES defaults null payload to []', () => {
        const next = run(
            appStateReducer,
            buildInitialState({ epicSummaries: [{ id: 'old' }] }),
            types.SET_EPIC_SUMMARIES,
            null
        );
        expect(next.epicSummaries).toEqual([]);
    });

    it('SET_ERROR clears loading flag', () => {
        const next = run(
            appStateReducer,
            buildInitialState({ isLoading: true }),
            types.SET_ERROR,
            'boom'
        );
        expect(next.error).toBe('boom');
        expect(next.isLoading).toBe(false);
    });
});

describe('boardReducer', () => {
    it('SET_BOARD with null payload sets boardId to null', () => {
        const next = run(
            boardReducer,
            buildInitialState({ board: { Id: 'old' }, boardId: 'old' }),
            types.SET_BOARD,
            null
        );
        expect(next.board).toBeNull();
        expect(next.boardId).toBeNull();
    });

    it('SET_BOARD with board lacking Id sets boardId to null', () => {
        const next = run(boardReducer, buildInitialState(), types.SET_BOARD, {
            Name: 'No id'
        });
        expect(next.board).toEqual({ Name: 'No id' });
        expect(next.boardId).toBeNull();
    });
});

describe('columnsReducer', () => {
    it('UPDATE_COLUMNS deep-clones payload', () => {
        const cols = [buildColumn({ Id: 'c1', cards: [buildCard()] })];
        const next = run(
            columnsReducer,
            buildInitialState(),
            types.UPDATE_COLUMNS,
            cols
        );
        expect(next.columns).toEqual(cols);
        expect(next.columns).not.toBe(cols);
        expect(next.columns[0].cards).not.toBe(cols[0].cards);
    });
});

describe('cardsReducer', () => {
    it('MOVE_CARD moves card between columns', () => {
        const state = buildInitialState({
            columns: [
                buildColumn({ Id: 'col1', cards: [buildCard({ Id: 'c1' })] }),
                buildColumn({ Id: 'col2' })
            ]
        });
        const next = run(cardsReducer, state, types.MOVE_CARD, {
            cardId: 'c1',
            targetColumnId: 'col2',
            targetIndex: 0
        });
        expect(next.columns[0].cards).toEqual([]);
        expect(next.columns[1].cards.map((c) => c.Id)).toEqual(['c1']);
        expect(next.columns[1].cards[0].columnId).toBe('col2');
    });
});

describe('dragReducer', () => {
    it('START_DRAG with undefined columns is a no-op', () => {
        const state = { isDragging: false };
        const result = dragReducer(
            state,
            { type: types.START_DRAG, payload: { source: {} } },
            'k'
        );
        expect(result.state).toBe(state);
        expect(result.lastDragPosition).toBe('k');
    });

    it('UPDATE_DRAG_POSITION with an unchanged position is a no-op', () => {
        const state = buildInitialState({ isDragging: true });
        const result = dragReducer(
            state,
            {
                type: types.UPDATE_DRAG_POSITION,
                payload: { targetColumnId: 'col1', targetIndex: 2 }
            },
            'col1-2'
        );
        expect(result.state).toBe(state);
        expect(result.lastDragPosition).toBe('col1-2');
    });

    it('UPDATE_DRAG_POSITION computes new preview and position key', () => {
        const state = buildInitialState({
            isDragging: true,
            columns: [
                buildColumn({ Id: 'col1', cards: [buildCard({ Id: 'c1' })] }),
                buildColumn({ Id: 'col2' })
            ],
            dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });
        const result = dragReducer(
            state,
            {
                type: types.UPDATE_DRAG_POSITION,
                payload: { targetColumnId: 'col2', targetIndex: 0 }
            },
            'col1-0'
        );
        expect(result.lastDragPosition).toBe('col2-0');
        expect(result.state.dragState[1].cards.map((c) => c.Id)).toEqual([
            'c1'
        ]);
        expect(result.state.columns[0].cards).toHaveLength(1);
    });
});

describe('syncReducer', () => {
    it('SET_SYNC_STATE sets syncState', () => {
        const next = run(
            syncReducer,
            buildInitialState(),
            types.SET_SYNC_STATE,
            'failed'
        );
        expect(next.syncState).toBe('failed');
    });

    it('COMPLETE_OPERATION stays syncing while other ops are pending', () => {
        jest.spyOn(Date, 'now').mockReturnValue(999);
        try {
            const state = buildInitialState({
                syncState: 'syncing',
                pendingOperations: [{ id: 'a' }, { id: 'b' }],
                lastSyncError: { operationId: 'x' }
            });
            const next = run(syncReducer, state, types.COMPLETE_OPERATION, {
                id: 'a'
            });
            expect(next.syncState).toBe('syncing');
            expect(next.pendingOperations).toEqual([{ id: 'b' }]);
            expect(next.lastSyncTime).toBe(999);
            expect(next.lastSyncError).toBeNull();
        } finally {
            Date.now.mockRestore();
        }
    });

    it('COMPLETE_OPERATION goes idle with zero pending ops', () => {
        const next = run(
            syncReducer,
            buildInitialState({ pendingOperations: [] }),
            types.COMPLETE_OPERATION,
            { id: 'ghost' }
        );
        expect(next.syncState).toBe('idle');
    });

    it('FAIL_OPERATION records error and removes op', () => {
        jest.spyOn(Date, 'now').mockReturnValue(555);
        try {
            const err = new Error('nope');
            const next = run(
                syncReducer,
                buildInitialState({
                    pendingOperations: [{ id: 'a' }, { id: 'b' }]
                }),
                types.FAIL_OPERATION,
                { id: 'b', error: err }
            );
            expect(next.syncState).toBe('failed');
            expect(next.pendingOperations).toEqual([{ id: 'a' }]);
            expect(next.lastSyncError).toEqual({
                operationId: 'b',
                error: err,
                timestamp: 555
            });
        } finally {
            Date.now.mockRestore();
        }
    });
});

describe('sprintReducer', () => {
    it('SET_SPRINTS / SET_SPRINT_CARDS / REORDER_SPRINTS default null to []', () => {
        const state = buildInitialState({
            sprints: [{ Id: 's1' }],
            sprintCards: [{ cardId: 'c1' }]
        });
        expect(
            run(sprintReducer, state, types.SET_SPRINTS, null).sprints
        ).toEqual([]);
        expect(
            run(sprintReducer, state, types.SET_SPRINT_CARDS, undefined)
                .sprintCards
        ).toEqual([]);
        expect(
            run(sprintReducer, state, types.REORDER_SPRINTS, null).sprints
        ).toEqual([]);
    });

    it('SET_PLANNING_SPRINT_CARDS stores payload and defaults null to []', () => {
        const psc = [{ cardId: 'c1', sprintId: 's1' }];
        const state = buildInitialState();
        expect(
            run(sprintReducer, state, types.SET_PLANNING_SPRINT_CARDS, psc)
                .planningSprintCards
        ).toBe(psc);
        expect(
            run(sprintReducer, state, types.SET_PLANNING_SPRINT_CARDS, null)
                .planningSprintCards
        ).toEqual([]);
    });

    it('UPDATE_SPRINT with no active sprint leaves activeSprint null', () => {
        const state = buildInitialState({
            sprints: [
                { Id: 's1', name: 'A' },
                { Id: 's2', name: 'B' }
            ],
            activeSprint: null
        });
        const next = run(sprintReducer, state, types.UPDATE_SPRINT, {
            sprintId: 's2',
            updates: { name: 'B2' }
        });
        expect(next.sprints).toEqual([
            { Id: 's1', name: 'A' },
            { Id: 's2', name: 'B2' }
        ]);
        expect(next.activeSprint).toBeNull();
    });

    it('DELETE_SPRINT without planning cards keeps backlog reference', () => {
        const backlogCards = [{ Id: 'b1' }];
        const state = buildInitialState({
            sprints: [{ Id: 's1' }, { Id: 's2' }],
            planningSprintCards: [{ cardId: 'b1', sprintId: 's2' }],
            backlogCards
        });
        const next = run(sprintReducer, state, types.DELETE_SPRINT, {
            sprintId: 's1'
        });
        expect(next.sprints).toEqual([{ Id: 's2' }]);
        expect(next.backlogCards).toBe(backlogCards);
        expect(next.planningSprintCards).toEqual([
            { cardId: 'b1', sprintId: 's2' }
        ]);
    });
});

describe('backlogReducer', () => {
    it('SET_SELECTED_BACKLOG_CARDS stores ids and defaults null to []', () => {
        const state = buildInitialState({ selectedBacklogCards: ['old'] });
        expect(
            run(backlogReducer, state, types.SET_SELECTED_BACKLOG_CARDS, [
                'a',
                'b'
            ]).selectedBacklogCards
        ).toEqual(['a', 'b']);
        expect(
            run(backlogReducer, state, types.SET_SELECTED_BACKLOG_CARDS, null)
                .selectedBacklogCards
        ).toEqual([]);
    });

    it('SET_BACKLOG_CARDS defaults null payload to []', () => {
        const next = run(
            backlogReducer,
            buildInitialState({ backlogCards: [{ Id: 'x' }] }),
            types.SET_BACKLOG_CARDS,
            null
        );
        expect(next.backlogCards).toEqual([]);
    });

    it('SET_BACKLOG_SYNCING treats missing counter as 0', () => {
        const state = { backlogCards: [] };
        expect(
            run(backlogReducer, state, types.SET_BACKLOG_SYNCING, true)
                .backlogSyncing
        ).toBe(1);
        expect(
            run(backlogReducer, state, types.SET_BACKLOG_SYNCING, false)
                .backlogSyncing
        ).toBe(0);
    });

    it('MOVE_CARD_TO_BACKLOG skips columns without cards and ignores missing cards', () => {
        const card = buildCard({ Id: 'c1' });
        const state = buildInitialState({
            columns: [
                { Id: 'empty' },
                buildColumn({ Id: 'col', cards: [card] })
            ]
        });
        const next = run(backlogReducer, state, types.MOVE_CARD_TO_BACKLOG, {
            cardId: 'c1'
        });
        expect(next.backlogCards).toEqual([card]);

        const unchanged = run(
            backlogReducer,
            state,
            types.MOVE_CARD_TO_BACKLOG,
            { cardId: 'missing' }
        );
        expect(unchanged).toBe(state);
    });

    it('BULK_REORDER_BACKLOG_AT_INDEX clamps index beyond remaining length', () => {
        const state = buildInitialState({
            backlogCards: [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }]
        });
        const next = run(
            backlogReducer,
            state,
            types.BULK_REORDER_BACKLOG_AT_INDEX,
            { cardIds: ['a'], newIndex: 99 }
        );
        expect(next.backlogCards.map((c) => c.Id)).toEqual(['b', 'c', 'a']);
    });
});
