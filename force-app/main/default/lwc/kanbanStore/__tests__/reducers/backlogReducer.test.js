/**
 * Unit tests for backlogReducer
 *
 * Covers: SET_BACKLOG_CARDS, SET_BACKLOG_SYNCING (counter),
 * ADD/REMOVE/UPDATE backlog cards, REORDER, BULK_REORDER,
 * BULK_REORDER_AT_INDEX, MOVE_CARD_TO_SPRINT, MOVE_CARD_TO_BACKLOG,
 * SET_BACKLOG_VISIBLE, SET_SELECTED_BACKLOG_CARDS, TOGGLE_BACKLOG_CARD_SELECTION
 */
import { backlogReducer } from '../../state/reducers/backlogReducer';
import * as types from '../../core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

beforeEach(() => resetIds());

const run = (state, type, payload) => backlogReducer(state, { type, payload });

describe('backlogReducer', () => {
    // ─── SET_BACKLOG_CARDS ────────────────────────────────

    describe('SET_BACKLOG_CARDS', () => {
        it('replaces backlog cards when not syncing', () => {
            const cards = [buildCard(), buildCard()];
            const state = buildInitialState({ backlogSyncing: 0 });
            const next = run(state, types.SET_BACKLOG_CARDS, cards);
            expect(next.backlogCards).toEqual(cards);
        });

        it('is blocked when syncing counter > 0', () => {
            const existing = [buildCard()];
            const state = buildInitialState({
                backlogCards: existing,
                backlogSyncing: 1
            });
            const next = run(state, types.SET_BACKLOG_CARDS, [
                buildCard(),
                buildCard()
            ]);
            expect(next.backlogCards).toBe(existing);
        });

        it('applies when syncing counter returns to 0', () => {
            let state = buildInitialState({ backlogSyncing: 1 });
            // Decrement to 0
            state = run(state, types.SET_BACKLOG_SYNCING, false);
            expect(state.backlogSyncing).toBe(0);
            // Now SET_BACKLOG_CARDS should work
            const cards = [buildCard()];
            state = run(state, types.SET_BACKLOG_CARDS, cards);
            expect(state.backlogCards).toEqual(cards);
        });

        it('handles null payload gracefully', () => {
            const state = buildInitialState();
            const next = run(state, types.SET_BACKLOG_CARDS, null);
            expect(next.backlogCards).toEqual([]);
        });
    });

    // ─── SET_BACKLOG_SYNCING (counter) ────────────────────

    describe('SET_BACKLOG_SYNCING', () => {
        it('increments counter on true', () => {
            const state = buildInitialState({ backlogSyncing: 0 });
            const next = run(state, types.SET_BACKLOG_SYNCING, true);
            expect(next.backlogSyncing).toBe(1);
        });

        it('increments for concurrent reorders', () => {
            let state = buildInitialState({ backlogSyncing: 0 });
            state = run(state, types.SET_BACKLOG_SYNCING, true);
            state = run(state, types.SET_BACKLOG_SYNCING, true);
            expect(state.backlogSyncing).toBe(2);
        });

        it('decrements counter on false', () => {
            const state = buildInitialState({ backlogSyncing: 2 });
            const next = run(state, types.SET_BACKLOG_SYNCING, false);
            expect(next.backlogSyncing).toBe(1);
        });

        it('never decrements below 0', () => {
            const state = buildInitialState({ backlogSyncing: 0 });
            const next = run(state, types.SET_BACKLOG_SYNCING, false);
            expect(next.backlogSyncing).toBe(0);
        });

        it('handles undefined initial backlogSyncing', () => {
            const state = { ...buildInitialState(), backlogSyncing: undefined };
            const next = run(state, types.SET_BACKLOG_SYNCING, true);
            expect(next.backlogSyncing).toBe(1);
        });
    });

    // ─── ADD_BACKLOG_CARD ─────────────────────────────────

    describe('ADD_BACKLOG_CARD', () => {
        it('prepends card to backlog', () => {
            const existing = buildCard({ Id: 'existing' });
            const newCard = buildCard({ Id: 'new' });
            const state = buildInitialState({ backlogCards: [existing] });
            const next = run(state, types.ADD_BACKLOG_CARD, newCard);
            expect(next.backlogCards).toHaveLength(2);
            expect(next.backlogCards[0].Id).toBe('new');
        });
    });

    // ─── REMOVE_BACKLOG_CARD ──────────────────────────────

    describe('REMOVE_BACKLOG_CARD', () => {
        it('removes card from backlog and selection', () => {
            const card = buildCard({ Id: 'c1' });
            const state = buildInitialState({
                backlogCards: [card, buildCard({ Id: 'c2' })],
                selectedBacklogCards: ['c1', 'c2']
            });
            const next = run(state, types.REMOVE_BACKLOG_CARD, {
                cardId: 'c1'
            });
            expect(next.backlogCards).toHaveLength(1);
            expect(next.backlogCards[0].Id).toBe('c2');
            expect(next.selectedBacklogCards).toEqual(['c2']);
        });
    });

    // ─── MOVE_CARD_TO_SPRINT ──────────────────────────────

    describe('MOVE_CARD_TO_SPRINT', () => {
        it('removes card from backlog and selection', () => {
            const state = buildInitialState({
                backlogCards: [
                    buildCard({ Id: 'c1' }),
                    buildCard({ Id: 'c2' })
                ],
                selectedBacklogCards: ['c1']
            });
            const next = run(state, types.MOVE_CARD_TO_SPRINT, {
                cardId: 'c1',
                sprintId: 'sprint1'
            });
            expect(next.backlogCards).toHaveLength(1);
            expect(next.selectedBacklogCards).toEqual([]);
        });
    });

    // ─── MOVE_CARD_TO_BACKLOG ─────────────────────────────

    describe('MOVE_CARD_TO_BACKLOG', () => {
        it('finds card in columns and adds to backlog', () => {
            const card = buildCard({ Id: 'c1' });
            const col = buildColumn({ cards: [card] });
            const state = buildInitialState({
                columns: [col],
                backlogCards: []
            });
            const next = run(state, types.MOVE_CARD_TO_BACKLOG, {
                cardId: 'c1'
            });
            expect(next.backlogCards).toHaveLength(1);
            expect(next.backlogCards[0].Id).toBe('c1');
        });

        it('does not duplicate existing backlog card', () => {
            const card = buildCard({ Id: 'c1' });
            const col = buildColumn({ cards: [card] });
            const state = buildInitialState({
                columns: [col],
                backlogCards: [card]
            });
            const next = run(state, types.MOVE_CARD_TO_BACKLOG, {
                cardId: 'c1'
            });
            expect(next.backlogCards).toHaveLength(1);
        });

        it('returns state unchanged if card not found', () => {
            const state = buildInitialState({ columns: [], backlogCards: [] });
            const next = run(state, types.MOVE_CARD_TO_BACKLOG, {
                cardId: 'missing'
            });
            expect(next).toBe(state);
        });
    });

    // ─── UPDATE_BACKLOG_CARD ──────────────────────────────

    describe('UPDATE_BACKLOG_CARD', () => {
        it('merges updates into the target card', () => {
            const card = buildCard({ Id: 'c1', subject: 'Old' });
            const state = buildInitialState({ backlogCards: [card] });
            const next = run(state, types.UPDATE_BACKLOG_CARD, {
                cardId: 'c1',
                updates: { subject: 'New', storyPoints: 5 }
            });
            expect(next.backlogCards[0].subject).toBe('New');
            expect(next.backlogCards[0].storyPoints).toBe(5);
        });

        it('leaves other cards untouched', () => {
            const c1 = buildCard({ Id: 'c1', subject: 'One' });
            const c2 = buildCard({ Id: 'c2', subject: 'Two' });
            const state = buildInitialState({ backlogCards: [c1, c2] });
            const next = run(state, types.UPDATE_BACKLOG_CARD, {
                cardId: 'c1',
                updates: { subject: 'Updated' }
            });
            expect(next.backlogCards[1].subject).toBe('Two');
        });
    });

    // ─── REORDER_BACKLOG ──────────────────────────────────

    describe('REORDER_BACKLOG', () => {
        it('moves card from old index to new index', () => {
            const cards = [
                buildCard({ Id: 'a' }),
                buildCard({ Id: 'b' }),
                buildCard({ Id: 'c' })
            ];
            const state = buildInitialState({ backlogCards: cards });
            const next = run(state, types.REORDER_BACKLOG, {
                cardId: 'a',
                newIndex: 2
            });
            expect(next.backlogCards.map((c) => c.Id)).toEqual(['b', 'c', 'a']);
        });

        it('returns state if card not found', () => {
            const state = buildInitialState({
                backlogCards: [buildCard({ Id: 'a' })]
            });
            const next = run(state, types.REORDER_BACKLOG, {
                cardId: 'missing',
                newIndex: 0
            });
            expect(next).toBe(state);
        });
    });

    // ─── BULK_REORDER_BACKLOG ─────────────────────────────

    describe('BULK_REORDER_BACKLOG', () => {
        it('moves selected cards to top', () => {
            const cards = [
                buildCard({ Id: 'a' }),
                buildCard({ Id: 'b' }),
                buildCard({ Id: 'c' })
            ];
            const state = buildInitialState({ backlogCards: cards });
            const next = run(state, types.BULK_REORDER_BACKLOG, {
                cardIds: ['c'],
                position: 'top'
            });
            expect(next.backlogCards.map((c) => c.Id)).toEqual(['c', 'a', 'b']);
        });

        it('moves selected cards to bottom', () => {
            const cards = [
                buildCard({ Id: 'a' }),
                buildCard({ Id: 'b' }),
                buildCard({ Id: 'c' })
            ];
            const state = buildInitialState({ backlogCards: cards });
            const next = run(state, types.BULK_REORDER_BACKLOG, {
                cardIds: ['a'],
                position: 'bottom'
            });
            expect(next.backlogCards.map((c) => c.Id)).toEqual(['b', 'c', 'a']);
        });
    });

    // ─── BULK_REORDER_BACKLOG_AT_INDEX ────────────────────

    describe('BULK_REORDER_BACKLOG_AT_INDEX', () => {
        it('moves cards to specific index', () => {
            const cards = [
                buildCard({ Id: 'a' }),
                buildCard({ Id: 'b' }),
                buildCard({ Id: 'c' }),
                buildCard({ Id: 'd' })
            ];
            const state = buildInitialState({ backlogCards: cards });
            const next = run(state, types.BULK_REORDER_BACKLOG_AT_INDEX, {
                cardIds: ['a', 'b'],
                newIndex: 2
            });
            // remaining after removing a,b: [c, d]
            // insert at 2 → [c, d, a, b]
            expect(next.backlogCards.map((c) => c.Id)).toEqual([
                'c',
                'd',
                'a',
                'b'
            ]);
        });

        it('clamps index to remaining length', () => {
            const cards = [buildCard({ Id: 'a' }), buildCard({ Id: 'b' })];
            const state = buildInitialState({ backlogCards: cards });
            const next = run(state, types.BULK_REORDER_BACKLOG_AT_INDEX, {
                cardIds: ['a'],
                newIndex: 999
            });
            // remaining: [b], insert at min(999,1)=1 → [b, a]
            expect(next.backlogCards.map((c) => c.Id)).toEqual(['b', 'a']);
        });
    });

    // ─── SET_BACKLOG_VISIBLE ──────────────────────────────

    describe('SET_BACKLOG_VISIBLE', () => {
        it('sets backlog visibility', () => {
            const state = buildInitialState({ backlogVisible: false });
            const next = run(state, types.SET_BACKLOG_VISIBLE, true);
            expect(next.backlogVisible).toBe(true);
        });
    });

    // ─── TOGGLE_BACKLOG_CARD_SELECTION ────────────────────

    describe('TOGGLE_BACKLOG_CARD_SELECTION', () => {
        it('adds card to selection', () => {
            const state = buildInitialState({ selectedBacklogCards: [] });
            const next = run(state, types.TOGGLE_BACKLOG_CARD_SELECTION, {
                cardId: 'c1'
            });
            expect(next.selectedBacklogCards).toEqual(['c1']);
        });

        it('removes card from selection if already selected', () => {
            const state = buildInitialState({
                selectedBacklogCards: ['c1', 'c2']
            });
            const next = run(state, types.TOGGLE_BACKLOG_CARD_SELECTION, {
                cardId: 'c1'
            });
            expect(next.selectedBacklogCards).toEqual(['c2']);
        });
    });

    // ─── Passthrough ──────────────────────────────────────

    describe('unknown actions', () => {
        it('returns state unchanged', () => {
            const state = buildInitialState();
            const next = run(state, 'UNKNOWN_ACTION', {});
            expect(next).toBe(state);
        });
    });
});
