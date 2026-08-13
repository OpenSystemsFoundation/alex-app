/**
 * Unit tests for Redux selectors
 */
import * as selectors from '../../kanbanStore/state/selectors';
import {
    buildCard,
    buildColumn,
    buildSprint,
    buildInitialState,
    resetIds
} from '../helpers/testDataFactory';

beforeEach(() => resetIds());

describe('selectors', () => {
    // ─── Board / Column selectors ─────────────────────────

    describe('getBoard / getBoardId', () => {
        it('returns board and id', () => {
            const state = buildInitialState({
                board: { Id: 'b1', Name: 'Test' },
                boardId: 'b1'
            });
            expect(selectors.getBoard(state)).toEqual({
                Id: 'b1',
                Name: 'Test'
            });
            expect(selectors.getBoardId(state)).toBe('b1');
        });

        it('returns null when not set', () => {
            const state = buildInitialState();
            expect(selectors.getBoard(state)).toBeNull();
            expect(selectors.getBoardId(state)).toBeNull();
        });
    });

    describe('getColumns', () => {
        it('returns columns normally', () => {
            const cols = [buildColumn({ Id: 'c1' })];
            const state = buildInitialState({ columns: cols });
            expect(selectors.getColumns(state)).toBe(cols);
        });

        it('returns dragState during drag', () => {
            const dragCols = [buildColumn({ Id: 'drag1' })];
            const state = buildInitialState({
                isDragging: true,
                dragState: dragCols
            });
            expect(selectors.getColumns(state)).toBe(dragCols);
        });
    });

    describe('findCard', () => {
        it('finds card across columns', () => {
            const card = buildCard({ Id: 'target' });
            const state = buildInitialState({
                columns: [
                    buildColumn({ cards: [buildCard()] }),
                    buildColumn({ cards: [card] })
                ]
            });
            expect(selectors.findCard(state, 'target')).toBe(card);
        });

        it('returns null for missing card', () => {
            const state = buildInitialState({ columns: [] });
            expect(selectors.findCard(state, 'missing')).toBeNull();
        });

        it('returns null for null cardId', () => {
            const state = buildInitialState();
            expect(selectors.findCard(state, null)).toBeNull();
        });
    });

    describe('findColumn', () => {
        it('finds column by ID', () => {
            const col = buildColumn({ Id: 'col1' });
            const state = buildInitialState({ columns: [col] });
            expect(selectors.findColumn(state, 'col1')).toBe(col);
        });

        it('returns null for missing column', () => {
            const state = buildInitialState({ columns: [] });
            expect(selectors.findColumn(state, 'x')).toBeNull();
        });
    });

    describe('getCardsByColumn', () => {
        it('returns cards for column', () => {
            const cards = [buildCard(), buildCard()];
            const col = buildColumn({ Id: 'col1', cards });
            const state = buildInitialState({ columns: [col] });
            expect(selectors.getCardsByColumn(state, 'col1')).toBe(cards);
        });

        it('returns empty array for unknown column', () => {
            const state = buildInitialState();
            expect(selectors.getCardsByColumn(state, 'nope')).toEqual([]);
        });
    });

    describe('getTotalCardCount', () => {
        it('sums cardCount across columns', () => {
            const state = buildInitialState({
                columns: [
                    buildColumn({ cardCount: 3 }),
                    buildColumn({ cardCount: 5 })
                ]
            });
            expect(selectors.getTotalCardCount(state)).toBe(8);
        });
    });

    // ─── Loading / Error / Sync selectors ─────────────────

    describe('loading and error selectors', () => {
        it('getIsLoading defaults false', () => {
            expect(selectors.getIsLoading(buildInitialState())).toBe(false);
        });

        it('getError defaults null', () => {
            expect(selectors.getError(buildInitialState())).toBeNull();
        });

        it('getSubscriptionStatus defaults disconnected', () => {
            expect(selectors.getSubscriptionStatus(buildInitialState())).toBe(
                'disconnected'
            );
        });
    });

    describe('sync selectors', () => {
        it('getSyncState defaults idle', () => {
            expect(selectors.getSyncState(buildInitialState())).toBe('idle');
        });

        it('hasPendingOperations returns false when empty', () => {
            expect(selectors.hasPendingOperations(buildInitialState())).toBe(
                false
            );
        });

        it('getSyncStatusMessage shows count for multiple ops', () => {
            const state = buildInitialState({
                syncState: 'syncing',
                pendingOperations: [{ id: '1' }, { id: '2' }]
            });
            expect(selectors.getSyncStatusMessage(state)).toBe(
                'Saving 2 changes...'
            );
        });

        it('getSyncStatusMessage shows generic for single op', () => {
            const state = buildInitialState({
                syncState: 'syncing',
                pendingOperations: [{ id: '1' }]
            });
            expect(selectors.getSyncStatusMessage(state)).toBe(
                'Saving changes...'
            );
        });

        it('getSyncStatusMessage shows failed', () => {
            const state = buildInitialState({ syncState: 'failed' });
            expect(selectors.getSyncStatusMessage(state)).toBe(
                'Failed to save changes'
            );
        });

        it('getSyncStatusMessage shows saved when idle with lastSyncTime', () => {
            const state = buildInitialState({
                syncState: 'idle',
                lastSyncTime: Date.now()
            });
            expect(selectors.getSyncStatusMessage(state)).toBe(
                'All changes saved'
            );
        });
    });

    // ─── Sprint selectors ─────────────────────────────────

    describe('sprint selectors', () => {
        it('getActiveSprint', () => {
            const sprint = buildSprint({ Id: 's1' });
            const state = buildInitialState({ activeSprint: sprint });
            expect(selectors.getActiveSprint(state)).toBe(sprint);
        });

        it('isSprintBoard checks board type', () => {
            const state = buildInitialState({
                board: { type: 'Sprint' }
            });
            expect(selectors.isSprintBoard(state)).toBe(true);
        });

        it('isSprintBoard false for Kanban type', () => {
            const state = buildInitialState({
                board: { type: 'Kanban' }
            });
            expect(selectors.isSprintBoard(state)).toBe(false);
        });

        it('getSprintProgress calculates percentage', () => {
            const state = buildInitialState({
                activeSprint: {
                    totalStoryPoints: 20,
                    completedStoryPoints: 10
                }
            });
            expect(selectors.getSprintProgress(state)).toBe(50);
        });

        it('getSprintProgress returns 0 when no points', () => {
            const state = buildInitialState({
                activeSprint: { totalStoryPoints: 0 }
            });
            expect(selectors.getSprintProgress(state)).toBe(0);
        });

        it('getSprintDaysRemaining calculates correctly', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 3);
            const state = buildInitialState({
                activeSprint: { endDate: tomorrow.toISOString() }
            });
            expect(selectors.getSprintDaysRemaining(state)).toBe(3);
        });
    });

    // ─── Backlog selectors ────────────────────────────────

    describe('backlog selectors', () => {
        it('getBacklogCards', () => {
            const cards = [buildCard()];
            const state = buildInitialState({ backlogCards: cards });
            expect(selectors.getBacklogCards(state)).toBe(cards);
        });

        it('getBacklogCardCount', () => {
            const state = buildInitialState({
                backlogCards: [buildCard(), buildCard()]
            });
            expect(selectors.getBacklogCardCount(state)).toBe(2);
        });

        it('getBacklogCardById finds by id', () => {
            const card = buildCard({ Id: 'target' });
            const state = buildInitialState({ backlogCards: [card] });
            expect(selectors.getBacklogCardById(state, 'target')).toBe(card);
        });

        it('isBacklogSyncing checks counter > 0', () => {
            expect(
                selectors.isBacklogSyncing(
                    buildInitialState({ backlogSyncing: 0 })
                )
            ).toBe(false);
            expect(
                selectors.isBacklogSyncing(
                    buildInitialState({ backlogSyncing: 1 })
                )
            ).toBe(true);
            expect(
                selectors.isBacklogSyncing(
                    buildInitialState({ backlogSyncing: 3 })
                )
            ).toBe(true);
        });

        it('getSelectedBacklogCards', () => {
            const state = buildInitialState({
                selectedBacklogCards: ['c1', 'c2']
            });
            expect(selectors.getSelectedBacklogCards(state)).toEqual([
                'c1',
                'c2'
            ]);
        });
    });

    // ─── Planning Sprint / Epic selectors ─────────────────

    describe('planning sprint selectors', () => {
        it('getPlanningSprints filters by Planning status', () => {
            const state = buildInitialState({
                sprints: [
                    buildSprint({ Id: 's1', status: 'Planning' }),
                    buildSprint({ Id: 's2', status: 'Active' }),
                    buildSprint({ Id: 's3', status: 'Planning' })
                ]
            });
            const result = selectors.getPlanningSprints(state);
            expect(result).toHaveLength(2);
            expect(result.every((s) => s.status === 'Planning')).toBe(true);
        });

        it('getCardSprintId returns sprintId for planning card', () => {
            const state = buildInitialState({
                planningSprintCards: [{ cardId: 'c1', sprintId: 's1' }]
            });
            expect(selectors.getCardSprintId(state, 'c1')).toBe('s1');
        });

        it('getCardSprintId returns null for unassigned card', () => {
            const state = buildInitialState({ planningSprintCards: [] });
            expect(selectors.getCardSprintId(state, 'c1')).toBeNull();
        });
    });

    describe('epic selectors', () => {
        it('getEpicFilterOptions builds options list', () => {
            const state = buildInitialState({
                epicSummaries: [
                    { id: 'e1', subject: 'Epic One' },
                    { id: 'e2', subject: 'Epic Two' }
                ]
            });
            const options = selectors.getEpicFilterOptions(state);
            expect(options).toHaveLength(4); // All + 2 epics + No Epic
            expect(options[0].label).toBe('All Epics');
            expect(options[3].label).toBe('No Epic');
        });
    });
});
