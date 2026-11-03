/**
 * Branch-focused tests for selectors: empty/undefined state defaults and
 * the remaining derived selectors not covered by ../selectors.test.js.
 */
import * as selectors from '../../state/selectors';

// Plain-object copy so selectors can be looked up by name
const byName = { ...selectors };

describe('selectors on an empty state object', () => {
    const empty = {};

    it.each([
        ['getColumns', []],
        ['getBoard', null],
        ['getBoardId', null],
        ['isDragging', false],
        ['getDragSource', null],
        ['getDragState', null],
        ['getTotalCardCount', 0],
        ['getColumnCount', 0],
        ['getCardsByColumnMap', {}],
        ['getEnrichedColumns', []],
        ['getIsLoading', false],
        ['getError', null],
        ['getSubscriptionStatus', 'disconnected'],
        ['getSyncState', 'idle'],
        ['getPendingOperations', []],
        ['hasPendingOperations', false],
        ['getLastSyncTime', null],
        ['getLastSyncError', null],
        ['getSyncStatusMessage', ''],
        ['getActiveSprint', null],
        ['getSprints', []],
        ['getSprintCards', []],
        ['isSprintBoard', false],
        ['getSprintProgress', 0],
        ['getSprintDaysRemaining', null],
        ['getBacklogCards', []],
        ['isBacklogVisible', false],
        ['getSelectedBacklogCards', []],
        ['getBacklogCardCount', 0],
        ['getUnrefinedBacklogCards', []],
        ['isBacklogSyncing', false],
        ['getEpicSummaries', []],
        [
            'getEpicFilterOptions',
            [
                { label: 'All Epics', value: 'All' },
                { label: 'No Epic', value: '__none__' }
            ]
        ],
        ['getPlanningSprintCards', []],
        ['getPlanningSprints', []]
    ])('%s returns its default', (name, expected) => {
        expect(byName[name](empty)).toEqual(expected);
    });

    it.each([
        ['findCard', null],
        ['findColumn', null],
        ['getCardsByColumn', []],
        ['getPendingOperationsForCard', []],
        ['cardHasPendingOperations', false],
        ['getBacklogCardById', null],
        ['getCardSprintId', null]
    ])('%s(state, id) returns its default', (name, expected) => {
        expect(byName[name](empty, 'x')).toEqual(expected);
    });
});

describe('selectors on a populated state', () => {
    const state = {
        columns: [
            {
                Id: 'col1',
                cardCount: 2,
                cards: [{ Id: 'c1' }, { Id: 'c2' }]
            },
            { Id: 'col2' }
        ],
        isDragging: true,
        dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 },
        dragState: [{ Id: 'preview', cards: [{ Id: 'c1' }] }],
        isLoading: true,
        error: 'bad',
        subscriptionStatus: 'connected'
    };

    it('getColumns returns drag preview while dragging', () => {
        expect(selectors.getColumns(state)).toBe(state.dragState);
        expect(selectors.getEnrichedColumns(state)).toBe(state.dragState);
    });

    it('getColumns ignores non-array dragState and when not dragging', () => {
        expect(
            selectors.getColumns({ ...state, dragState: { not: 'array' } })
        ).toBe(state.columns);
        expect(selectors.getColumns({ ...state, dragState: null })).toBe(
            state.columns
        );
        expect(selectors.getColumns({ ...state, isDragging: false })).toBe(
            state.columns
        );
    });

    it('drag selectors return state values', () => {
        expect(selectors.isDragging(state)).toBe(true);
        expect(selectors.getDragSource(state)).toBe(state.dragSource);
        expect(selectors.getDragState(state)).toBe(state.dragState);
    });

    it('findCard skips columns without cards and handles missing id', () => {
        expect(selectors.findCard(state, 'c2')).toEqual({ Id: 'c2' });
        expect(selectors.findCard(state, 'zzz')).toBeNull();
        expect(selectors.findCard(state, '')).toBeNull();
        expect(selectors.findCard({ columns: [{ Id: 'x' }] }, 'c1')).toBeNull();
    });

    it('findColumn / getCardsByColumn handle missing columns and cards', () => {
        expect(selectors.findColumn(state, 'col2')).toEqual({ Id: 'col2' });
        expect(selectors.findColumn(state, 'nope')).toBeNull();
        expect(selectors.findColumn(state, null)).toBeNull();
        expect(selectors.getCardsByColumn(state, 'col2')).toEqual([]);
        expect(selectors.getCardsByColumn(state, 'col1')).toHaveLength(2);
    });

    it('getTotalCardCount treats missing cardCount as 0', () => {
        expect(selectors.getTotalCardCount(state)).toBe(2);
    });

    it('getColumnCount counts columns', () => {
        expect(selectors.getColumnCount(state)).toBe(2);
    });

    it('getCardsByColumnMap uses drag preview and defaults missing cards', () => {
        expect(selectors.getCardsByColumnMap(state)).toEqual({
            preview: [{ Id: 'c1' }]
        });
        expect(
            selectors.getCardsByColumnMap({ ...state, isDragging: false })
        ).toEqual({
            col1: [{ Id: 'c1' }, { Id: 'c2' }],
            col2: []
        });
    });

    it('loading / error / subscription selectors return state values', () => {
        expect(selectors.getIsLoading(state)).toBe(true);
        expect(selectors.getError(state)).toBe('bad');
        expect(selectors.getSubscriptionStatus(state)).toBe('connected');
    });
});

describe('sync selectors', () => {
    it('getSyncStatusMessage covers each sync state', () => {
        expect(
            selectors.getSyncStatusMessage({
                syncState: 'syncing',
                pendingOperations: [{ id: 1 }, { id: 2 }, { id: 3 }]
            })
        ).toBe('Saving 3 changes...');
        expect(
            selectors.getSyncStatusMessage({
                syncState: 'syncing',
                pendingOperations: [{ id: 1 }]
            })
        ).toBe('Saving changes...');
        expect(selectors.getSyncStatusMessage({ syncState: 'syncing' })).toBe(
            'Saving changes...'
        );
        expect(selectors.getSyncStatusMessage({ syncState: 'failed' })).toBe(
            'Failed to save changes'
        );
        expect(
            selectors.getSyncStatusMessage({
                syncState: 'idle',
                lastSyncTime: 1000
            })
        ).toBe('All changes saved');
        expect(selectors.getSyncStatusMessage({ syncState: 'idle' })).toBe('');
        expect(selectors.getSyncStatusMessage({ syncState: 'weird' })).toBe('');
    });

    it('pending operation selectors filter by card', () => {
        const state = {
            pendingOperations: [
                { id: 'o1', cardId: 'c1' },
                { id: 'o2', cardId: 'c2' },
                { id: 'o3', cardId: 'c1' }
            ],
            lastSyncTime: 42,
            lastSyncError: { operationId: 'o0' }
        };
        expect(
            selectors.getPendingOperationsForCard(state, 'c1').map((o) => o.id)
        ).toEqual(['o1', 'o3']);
        expect(selectors.cardHasPendingOperations(state, 'c2')).toBe(true);
        expect(selectors.cardHasPendingOperations(state, 'c9')).toBe(false);
        expect(selectors.hasPendingOperations(state)).toBe(true);
        expect(selectors.getPendingOperations(state)).toBe(
            state.pendingOperations
        );
        expect(selectors.getLastSyncTime(state)).toBe(42);
        expect(selectors.getLastSyncError(state)).toEqual({
            operationId: 'o0'
        });
    });
});

describe('sprint selectors', () => {
    it('isSprintBoard checks board type', () => {
        expect(selectors.isSprintBoard({ board: { type: 'Sprint' } })).toBe(
            true
        );
        expect(selectors.isSprintBoard({ board: { type: 'Kanban' } })).toBe(
            false
        );
        expect(selectors.isSprintBoard({ board: null })).toBe(false);
    });

    it('getSprintProgress handles zero/missing totals and completed points', () => {
        expect(
            selectors.getSprintProgress({
                activeSprint: { totalStoryPoints: 0, completedStoryPoints: 5 }
            })
        ).toBe(0);
        expect(
            selectors.getSprintProgress({ activeSprint: { Id: 's1' } })
        ).toBe(0);
        expect(
            selectors.getSprintProgress({
                activeSprint: { totalStoryPoints: 3 }
            })
        ).toBe(0);
        expect(
            selectors.getSprintProgress({
                activeSprint: { totalStoryPoints: 3, completedStoryPoints: 2 }
            })
        ).toBe(67);
    });

    it('getSprintDaysRemaining computes whole days from today', () => {
        jest.useFakeTimers();
        try {
            jest.setSystemTime(new Date(2026, 0, 10, 15, 30));
            expect(
                selectors.getSprintDaysRemaining({
                    activeSprint: { endDate: new Date(2026, 0, 15, 8, 0) }
                })
            ).toBe(5);
            expect(
                selectors.getSprintDaysRemaining({
                    activeSprint: { endDate: new Date(2026, 0, 8) }
                })
            ).toBe(-2);
            expect(
                selectors.getSprintDaysRemaining({ activeSprint: {} })
            ).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });

    it('getSprints / getSprintCards / getActiveSprint return state values', () => {
        const state = {
            sprints: [{ Id: 's1' }],
            sprintCards: [{ cardId: 'c1' }],
            activeSprint: { Id: 's1' }
        };
        expect(selectors.getSprints(state)).toBe(state.sprints);
        expect(selectors.getSprintCards(state)).toBe(state.sprintCards);
        expect(selectors.getActiveSprint(state)).toBe(state.activeSprint);
    });
});

describe('backlog and planning selectors', () => {
    const state = {
        backlogCards: [
            { Id: 'b1', needsRefinement: true },
            { Id: 'b2', needsRefinement: false },
            { Id: 'b3' }
        ],
        backlogVisible: true,
        selectedBacklogCards: ['b1'],
        backlogSyncing: 2,
        sprints: [
            { Id: 's1', status: 'Planning' },
            { Id: 's2', status: 'Active' },
            { Id: 's3', status: 'Planning' }
        ],
        planningSprintCards: [
            { cardId: 'b1', sprintId: 's1' },
            { cardId: 'b2', sprintId: 's3' }
        ],
        epicSummaries: [{ id: 'e1', subject: 'Payments' }, { id: 'e2' }]
    };

    it('returns backlog values', () => {
        expect(selectors.getBacklogCards(state)).toBe(state.backlogCards);
        expect(selectors.isBacklogVisible(state)).toBe(true);
        expect(selectors.getSelectedBacklogCards(state)).toEqual(['b1']);
        expect(selectors.getBacklogCardCount(state)).toBe(3);
        expect(selectors.getBacklogCardById(state, 'b2')).toEqual({
            Id: 'b2',
            needsRefinement: false
        });
        expect(selectors.getBacklogCardById(state, 'zz')).toBeNull();
        expect(
            selectors.getUnrefinedBacklogCards(state).map((c) => c.Id)
        ).toEqual(['b1']);
        expect(selectors.isBacklogSyncing(state)).toBe(true);
        expect(selectors.isBacklogSyncing({ backlogSyncing: 0 })).toBe(false);
    });

    it('returns planning sprint values', () => {
        expect(selectors.getPlanningSprints(state).map((s) => s.Id)).toEqual([
            's1',
            's3'
        ]);
        expect(selectors.getPlanningSprintCards(state)).toBe(
            state.planningSprintCards
        );
        expect(selectors.getCardSprintId(state, 'b2')).toBe('s3');
        expect(selectors.getCardSprintId(state, 'b3')).toBeNull();
    });

    it('getEpicFilterOptions labels untitled epics', () => {
        expect(selectors.getEpicSummaries(state)).toBe(state.epicSummaries);
        expect(selectors.getEpicFilterOptions(state)).toEqual([
            { label: 'All Epics', value: 'All' },
            { label: 'Payments', value: 'e1' },
            { label: 'Untitled Epic', value: 'e2' },
            { label: 'No Epic', value: '__none__' }
        ]);
    });
});
