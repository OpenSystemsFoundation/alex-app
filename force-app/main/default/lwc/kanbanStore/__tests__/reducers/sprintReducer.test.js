/**
 * Unit tests for sprintReducer
 *
 * Covers: SET_SPRINT, SET_SPRINTS, UPDATE_SPRINT, DELETE_SPRINT,
 * SET_SPRINT_CARDS, SET_PLANNING_SPRINT_CARDS, ADD/REMOVE_PLANNING_SPRINT_CARD,
 * REORDER_SPRINTS
 */
import { sprintReducer } from '../../state/reducers/sprintReducer';
import * as types from '../../core/actionTypes';
import {
    buildSprint,
    buildCard,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

beforeEach(() => resetIds());

const run = (state, type, payload) => sprintReducer(state, { type, payload });

describe('sprintReducer', () => {
    describe('SET_SPRINT', () => {
        it('sets the active sprint', () => {
            const sprint = buildSprint({ Id: 's1', status: 'Active' });
            const state = buildInitialState();
            const next = run(state, types.SET_SPRINT, sprint);
            expect(next.activeSprint).toEqual(sprint);
        });
    });

    describe('SET_SPRINTS', () => {
        it('sets all sprints', () => {
            const sprints = [buildSprint(), buildSprint()];
            const state = buildInitialState();
            const next = run(state, types.SET_SPRINTS, sprints);
            expect(next.sprints).toHaveLength(2);
        });

        it('handles null payload', () => {
            const state = buildInitialState();
            const next = run(state, types.SET_SPRINTS, null);
            expect(next.sprints).toEqual([]);
        });
    });

    describe('UPDATE_SPRINT', () => {
        it('updates sprint in list', () => {
            const sprint = buildSprint({ Id: 's1', status: 'Planning' });
            const state = buildInitialState({ sprints: [sprint] });
            const next = run(state, types.UPDATE_SPRINT, {
                sprintId: 's1',
                updates: { status: 'Active' }
            });
            expect(next.sprints[0].status).toBe('Active');
        });

        it('also updates activeSprint if matching', () => {
            const sprint = buildSprint({ Id: 's1', status: 'Active' });
            const state = buildInitialState({
                sprints: [sprint],
                activeSprint: sprint
            });
            const next = run(state, types.UPDATE_SPRINT, {
                sprintId: 's1',
                updates: { totalStoryPoints: 21 }
            });
            expect(next.activeSprint.totalStoryPoints).toBe(21);
        });

        it('does not touch activeSprint if different sprint', () => {
            const active = buildSprint({ Id: 'active' });
            const other = buildSprint({ Id: 'other' });
            const state = buildInitialState({
                sprints: [active, other],
                activeSprint: active
            });
            const next = run(state, types.UPDATE_SPRINT, {
                sprintId: 'other',
                updates: { status: 'Completed' }
            });
            expect(next.activeSprint).toBe(active);
        });
    });

    describe('DELETE_SPRINT', () => {
        it('removes sprint and its planning sprint cards', () => {
            const state = buildInitialState({
                sprints: [buildSprint({ Id: 's1' }), buildSprint({ Id: 's2' })],
                planningSprintCards: [
                    { sprintId: 's1', cardId: 'c1' },
                    { sprintId: 's2', cardId: 'c2' }
                ],
                backlogCards: [buildCard({ Id: 'c1' }), buildCard({ Id: 'c2' })]
            });
            const next = run(state, types.DELETE_SPRINT, { sprintId: 's1' });
            expect(next.sprints).toHaveLength(1);
            expect(next.sprints[0].Id).toBe('s2');
            expect(next.planningSprintCards).toHaveLength(1);
            expect(next.planningSprintCards[0].sprintId).toBe('s2');
        });

        it('moves orphaned cards to bottom of backlog', () => {
            const state = buildInitialState({
                sprints: [buildSprint({ Id: 's1' })],
                planningSprintCards: [{ sprintId: 's1', cardId: 'c2' }],
                backlogCards: [
                    buildCard({ Id: 'c1' }),
                    buildCard({ Id: 'c2' }),
                    buildCard({ Id: 'c3' })
                ]
            });
            const next = run(state, types.DELETE_SPRINT, { sprintId: 's1' });
            // c2 should be moved to bottom: [c1, c3, c2]
            expect(next.backlogCards.map((c) => c.Id)).toEqual([
                'c1',
                'c3',
                'c2'
            ]);
        });
    });

    describe('SET_SPRINT_CARDS', () => {
        it('replaces sprint cards', () => {
            const state = buildInitialState({ sprintCards: [] });
            const cards = [{ Id: 'sc1' }, { Id: 'sc2' }];
            const next = run(state, types.SET_SPRINT_CARDS, cards);
            expect(next.sprintCards).toEqual(cards);
        });
    });

    describe('ADD_PLANNING_SPRINT_CARD', () => {
        it('appends planning sprint card', () => {
            const state = buildInitialState({ planningSprintCards: [] });
            const psc = { sprintId: 's1', cardId: 'c1', position: null };
            const next = run(state, types.ADD_PLANNING_SPRINT_CARD, psc);
            expect(next.planningSprintCards).toHaveLength(1);
            expect(next.planningSprintCards[0]).toEqual(psc);
        });
    });

    describe('REMOVE_PLANNING_SPRINT_CARD', () => {
        it('removes by cardId + sprintId pair', () => {
            const state = buildInitialState({
                planningSprintCards: [
                    { sprintId: 's1', cardId: 'c1' },
                    { sprintId: 's1', cardId: 'c2' },
                    { sprintId: 's2', cardId: 'c1' }
                ]
            });
            const next = run(state, types.REMOVE_PLANNING_SPRINT_CARD, {
                cardId: 'c1',
                sprintId: 's1'
            });
            expect(next.planningSprintCards).toHaveLength(2);
            expect(
                next.planningSprintCards.some(
                    (sc) => sc.cardId === 'c1' && sc.sprintId === 's1'
                )
            ).toBe(false);
        });
    });

    describe('REORDER_SPRINTS', () => {
        it('replaces sprints array', () => {
            const reordered = [
                buildSprint({ Id: 's2' }),
                buildSprint({ Id: 's1' })
            ];
            const state = buildInitialState();
            const next = run(state, types.REORDER_SPRINTS, reordered);
            expect(next.sprints).toEqual(reordered);
        });
    });

    describe('unknown actions', () => {
        it('returns state unchanged', () => {
            const state = buildInitialState();
            const next = run(state, 'UNKNOWN', {});
            expect(next).toBe(state);
        });
    });
});
