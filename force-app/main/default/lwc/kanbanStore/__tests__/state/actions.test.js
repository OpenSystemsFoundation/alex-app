/**
 * Unit tests for action creators
 */
import * as actions from '../../state/actions';
import * as types from '../../core/actionTypes';

// Plain-object copy so creators can be looked up by name
const creators = { ...actions };

describe('action creators', () => {
    const card = { Id: 'c1', subject: 'Card' };
    const sprint = { Id: 's1', name: 'Sprint 1' };
    const err = new Error('fail');

    // [name, args, expected action]
    const cases = [
        [
            'setBoard',
            [{ Id: 'b1' }],
            { type: types.SET_BOARD, payload: { Id: 'b1' } }
        ],
        ['setBoardId', ['b1'], { type: types.SET_BOARD_ID, payload: 'b1' }],
        [
            'setColumns',
            [[{ Id: 'col1' }]],
            { type: types.SET_COLUMNS, payload: [{ Id: 'col1' }] }
        ],
        [
            'updateColumns',
            [[{ Id: 'col2' }]],
            { type: types.UPDATE_COLUMNS, payload: [{ Id: 'col2' }] }
        ],
        [
            'addCard',
            [card, 'col1'],
            { type: types.ADD_CARD, payload: { card, columnId: 'col1' } }
        ],
        [
            'updateCard',
            ['c1', { subject: 'X' }],
            {
                type: types.UPDATE_CARD,
                payload: { cardId: 'c1', updates: { subject: 'X' } }
            }
        ],
        [
            'deleteCard',
            ['c1'],
            { type: types.DELETE_CARD, payload: { cardId: 'c1' } }
        ],
        [
            'moveCard',
            ['c1', 'col2', 3],
            {
                type: types.MOVE_CARD,
                payload: {
                    cardId: 'c1',
                    targetColumnId: 'col2',
                    targetIndex: 3
                }
            }
        ],
        [
            'startDrag',
            [{ cardId: 'c1', columnId: 'col1', cardIndex: 0 }],
            {
                type: types.START_DRAG,
                payload: {
                    source: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
                }
            }
        ],
        [
            'updateDragPosition',
            ['col2', 1],
            {
                type: types.UPDATE_DRAG_POSITION,
                payload: { targetColumnId: 'col2', targetIndex: 1 }
            }
        ],
        ['commitDrag', [], { type: types.COMMIT_DRAG }],
        ['cancelDrag', [], { type: types.CANCEL_DRAG }],
        ['reset', [], { type: types.RESET }],
        ['setLoading', [true], { type: types.SET_LOADING, payload: true }],
        ['setError', [err], { type: types.SET_ERROR, payload: err }],
        ['clearError', [], { type: types.CLEAR_ERROR }],
        [
            'setSubscriptionStatus',
            ['polling'],
            { type: types.SET_SUBSCRIPTION_STATUS, payload: 'polling' }
        ],
        [
            'setSyncState',
            ['syncing'],
            { type: types.SET_SYNC_STATE, payload: 'syncing' }
        ],
        [
            'startOperation',
            ['op1', 'move', 'c1'],
            {
                type: types.START_OPERATION,
                payload: { id: 'op1', type: 'move', cardId: 'c1' }
            }
        ],
        [
            'completeOperation',
            ['op1'],
            { type: types.COMPLETE_OPERATION, payload: { id: 'op1' } }
        ],
        [
            'failOperation',
            ['op1', err],
            { type: types.FAIL_OPERATION, payload: { id: 'op1', error: err } }
        ],
        ['setSprint', [sprint], { type: types.SET_SPRINT, payload: sprint }],
        [
            'setSprints',
            [[sprint]],
            { type: types.SET_SPRINTS, payload: [sprint] }
        ],
        [
            'updateSprint',
            ['s1', { name: 'New' }],
            {
                type: types.UPDATE_SPRINT,
                payload: { sprintId: 's1', updates: { name: 'New' } }
            }
        ],
        [
            'deleteSprint',
            ['s1'],
            { type: types.DELETE_SPRINT, payload: { sprintId: 's1' } }
        ],
        [
            'reorderSprints',
            [[sprint]],
            { type: types.REORDER_SPRINTS, payload: [sprint] }
        ],
        [
            'setBacklogCards',
            [[card]],
            { type: types.SET_BACKLOG_CARDS, payload: [card] }
        ],
        [
            'addBacklogCard',
            [card],
            { type: types.ADD_BACKLOG_CARD, payload: card }
        ],
        [
            'removeBacklogCard',
            ['c1'],
            { type: types.REMOVE_BACKLOG_CARD, payload: { cardId: 'c1' } }
        ],
        [
            'updateBacklogCard',
            ['c1', { priority: 'High' }],
            {
                type: types.UPDATE_BACKLOG_CARD,
                payload: { cardId: 'c1', updates: { priority: 'High' } }
            }
        ],
        [
            'reorderBacklog',
            ['c1', 2],
            {
                type: types.REORDER_BACKLOG,
                payload: { cardId: 'c1', newIndex: 2 }
            }
        ],
        [
            'bulkReorderBacklog',
            [['c1', 'c2'], 'top'],
            {
                type: types.BULK_REORDER_BACKLOG,
                payload: { cardIds: ['c1', 'c2'], position: 'top' }
            }
        ],
        [
            'bulkReorderBacklogAtIndex',
            [['c1'], 4],
            {
                type: types.BULK_REORDER_BACKLOG_AT_INDEX,
                payload: { cardIds: ['c1'], newIndex: 4 }
            }
        ],
        [
            'setBacklogSyncing',
            [false],
            { type: types.SET_BACKLOG_SYNCING, payload: false }
        ],
        [
            'setSprintCards',
            [[{ cardId: 'c1' }]],
            { type: types.SET_SPRINT_CARDS, payload: [{ cardId: 'c1' }] }
        ],
        [
            'moveCardToSprint',
            ['c1', 's1'],
            {
                type: types.MOVE_CARD_TO_SPRINT,
                payload: { cardId: 'c1', sprintId: 's1' }
            }
        ],
        [
            'moveCardToBacklog',
            ['c1'],
            { type: types.MOVE_CARD_TO_BACKLOG, payload: { cardId: 'c1' } }
        ],
        [
            'setPlanningSprintCards',
            [[{ cardId: 'c1', sprintId: 's1' }]],
            {
                type: types.SET_PLANNING_SPRINT_CARDS,
                payload: [{ cardId: 'c1', sprintId: 's1' }]
            }
        ],
        [
            'addPlanningSprintCard',
            [{ cardId: 'c1', sprintId: 's1' }],
            {
                type: types.ADD_PLANNING_SPRINT_CARD,
                payload: { cardId: 'c1', sprintId: 's1' }
            }
        ],
        [
            'removePlanningSprintCard',
            ['c1', 's1'],
            {
                type: types.REMOVE_PLANNING_SPRINT_CARD,
                payload: { cardId: 'c1', sprintId: 's1' }
            }
        ],
        [
            'setBacklogVisible',
            [true],
            { type: types.SET_BACKLOG_VISIBLE, payload: true }
        ],
        [
            'setSelectedBacklogCards',
            [['c1', 'c2']],
            { type: types.SET_SELECTED_BACKLOG_CARDS, payload: ['c1', 'c2'] }
        ],
        [
            'toggleBacklogCardSelection',
            ['c1'],
            {
                type: types.TOGGLE_BACKLOG_CARD_SELECTION,
                payload: { cardId: 'c1' }
            }
        ],
        [
            'setEpicSummaries',
            [[{ id: 'e1' }]],
            { type: types.SET_EPIC_SUMMARIES, payload: [{ id: 'e1' }] }
        ]
    ];

    it.each(cases)('%s creates the expected action', (name, args, expected) => {
        expect(typeof creators[name]).toBe('function');
        expect(creators[name](...args)).toEqual(expected);
    });

    it('every exported action creator is covered by a case', () => {
        const covered = cases.map(([name]) => name).sort();
        expect(Object.keys(creators).sort()).toEqual(covered);
    });

    it('every action type is a defined string', () => {
        cases.forEach(([, , expected]) => {
            expect(typeof expected.type).toBe('string');
            expect(expected.type.length).toBeGreaterThan(0);
        });
    });
});
