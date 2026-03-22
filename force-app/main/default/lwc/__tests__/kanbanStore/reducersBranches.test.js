/**
 * Branch coverage tests for reducers.js
 * Targets uncovered branches in: boardReducer, appStateReducer, sprintReducer, backlogReducer, rootReducer
 */
import {
    boardReducer,
    columnsReducer,
    cardsReducer,
    dragReducer,
    appStateReducer,
    syncReducer,
    sprintReducer,
    backlogReducer,
    rootReducer,
    initialState
} from '../../kanbanStore/state/reducers';

describe('boardReducer', () => {
    it('handles SET_BOARD_ID', () => {
        const state = { ...initialState };
        const result = boardReducer(state, {
            type: 'SET_BOARD_ID',
            payload: 'board123'
        });
        expect(result.boardId).toBe('board123');
    });

    it('handles SET_BOARD with null payload', () => {
        const state = { ...initialState };
        const result = boardReducer(state, {
            type: 'SET_BOARD',
            payload: null
        });
        expect(result.board).toBeNull();
        expect(result.boardId).toBeNull();
    });

    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = boardReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('appStateReducer', () => {
    it('handles SET_LOADING true', () => {
        const state = { ...initialState };
        const result = appStateReducer(state, {
            type: 'SET_LOADING',
            payload: true
        });
        expect(result.isLoading).toBe(true);
    });

    it('handles SET_LOADING false', () => {
        const state = { ...initialState, isLoading: true };
        const result = appStateReducer(state, {
            type: 'SET_LOADING',
            payload: false
        });
        expect(result.isLoading).toBe(false);
    });

    it('handles SET_ERROR', () => {
        const state = { ...initialState, isLoading: true };
        const result = appStateReducer(state, {
            type: 'SET_ERROR',
            payload: 'Something went wrong'
        });
        expect(result.error).toBe('Something went wrong');
        expect(result.isLoading).toBe(false);
    });

    it('handles CLEAR_ERROR', () => {
        const state = { ...initialState, error: 'Some error' };
        const result = appStateReducer(state, { type: 'CLEAR_ERROR' });
        expect(result.error).toBeNull();
    });

    it('handles SET_SUBSCRIPTION_STATUS', () => {
        const state = { ...initialState };
        const result = appStateReducer(state, {
            type: 'SET_SUBSCRIPTION_STATUS',
            payload: 'connected'
        });
        expect(result.subscriptionStatus).toBe('connected');
    });

    it('handles SET_EPIC_SUMMARIES', () => {
        const state = { ...initialState };
        const summaries = [{ id: 'e1', subject: 'Epic One', totalCards: 5 }];
        const result = appStateReducer(state, {
            type: 'SET_EPIC_SUMMARIES',
            payload: summaries
        });
        expect(result.epicSummaries).toEqual(summaries);
    });

    it('handles SET_EPIC_SUMMARIES with null payload', () => {
        const state = { ...initialState, epicSummaries: [{ id: 'e1' }] };
        const result = appStateReducer(state, {
            type: 'SET_EPIC_SUMMARIES',
            payload: null
        });
        expect(result.epicSummaries).toEqual([]);
    });

    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = appStateReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('sprintReducer', () => {
    it('handles SET_SPRINT', () => {
        const state = { ...initialState };
        const sprint = { Id: 's1', Name: 'Sprint 1' };
        const result = sprintReducer(state, {
            type: 'SET_SPRINT',
            payload: sprint
        });
        expect(result.activeSprint).toEqual(sprint);
    });

    it('handles SET_SPRINTS', () => {
        const state = { ...initialState };
        const sprints = [
            { Id: 's1', Name: 'Sprint 1' },
            { Id: 's2', Name: 'Sprint 2' }
        ];
        const result = sprintReducer(state, {
            type: 'SET_SPRINTS',
            payload: sprints
        });
        expect(result.sprints).toEqual(sprints);
    });

    it('handles SET_SPRINTS with null payload', () => {
        const state = { ...initialState };
        const result = sprintReducer(state, {
            type: 'SET_SPRINTS',
            payload: null
        });
        expect(result.sprints).toEqual([]);
    });

    it('handles UPDATE_SPRINT for active sprint', () => {
        const state = {
            ...initialState,
            activeSprint: { Id: 's1', Name: 'Sprint 1', status: 'Planning' },
            sprints: [
                { Id: 's1', Name: 'Sprint 1', status: 'Planning' },
                { Id: 's2', Name: 'Sprint 2', status: 'Active' }
            ]
        };
        const result = sprintReducer(state, {
            type: 'UPDATE_SPRINT',
            payload: { sprintId: 's1', updates: { status: 'Active' } }
        });
        expect(result.activeSprint.status).toBe('Active');
        expect(result.sprints[0].status).toBe('Active');
        expect(result.sprints[1].status).toBe('Active');
    });

    it('handles UPDATE_SPRINT for non-active sprint', () => {
        const state = {
            ...initialState,
            activeSprint: { Id: 's1', Name: 'Sprint 1' },
            sprints: [
                { Id: 's1', Name: 'Sprint 1' },
                { Id: 's2', Name: 'Sprint 2', status: 'Planning' }
            ]
        };
        const result = sprintReducer(state, {
            type: 'UPDATE_SPRINT',
            payload: { sprintId: 's2', updates: { status: 'Active' } }
        });
        expect(result.activeSprint).toEqual({ Id: 's1', Name: 'Sprint 1' });
        expect(result.sprints[1].status).toBe('Active');
    });

    it('handles SET_SPRINT_CARDS', () => {
        const state = { ...initialState };
        const cards = [{ Id: 'sc1' }, { Id: 'sc2' }];
        const result = sprintReducer(state, {
            type: 'SET_SPRINT_CARDS',
            payload: cards
        });
        expect(result.sprintCards).toEqual(cards);
    });

    it('handles SET_SPRINT_CARDS with null payload', () => {
        const state = { ...initialState };
        const result = sprintReducer(state, {
            type: 'SET_SPRINT_CARDS',
            payload: null
        });
        expect(result.sprintCards).toEqual([]);
    });

    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = sprintReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('backlogReducer', () => {
    const stateWithBacklog = {
        ...initialState,
        backlogCards: [
            { Id: 'c1', Name: 'Card 1' },
            { Id: 'c2', Name: 'Card 2' },
            { Id: 'c3', Name: 'Card 3' }
        ],
        selectedBacklogCards: ['c1', 'c2'],
        columns: [
            {
                Id: 'col1',
                cards: [{ Id: 'c4', Name: 'Card 4' }]
            }
        ]
    };

    it('handles SET_BACKLOG_CARDS', () => {
        const state = { ...initialState };
        const cards = [{ Id: 'c1' }, { Id: 'c2' }];
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_CARDS',
            payload: cards
        });
        expect(result.backlogCards).toEqual(cards);
    });

    it('handles SET_BACKLOG_CARDS with null payload', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_CARDS',
            payload: null
        });
        expect(result.backlogCards).toEqual([]);
    });

    it('skips SET_BACKLOG_CARDS when backlogSyncing is true', () => {
        const state = {
            ...initialState,
            backlogSyncing: true,
            backlogCards: [{ Id: 'existing' }]
        };
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_CARDS',
            payload: [{ Id: 'new' }]
        });
        expect(result.backlogCards).toEqual([{ Id: 'existing' }]);
    });

    it('handles SET_BACKLOG_SYNCING true', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_SYNCING',
            payload: true
        });
        expect(result.backlogSyncing).toBe(true);
    });

    it('handles SET_BACKLOG_SYNCING false', () => {
        const state = { ...initialState, backlogSyncing: true };
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_SYNCING',
            payload: false
        });
        expect(result.backlogSyncing).toBe(false);
    });

    it('handles ADD_BACKLOG_CARD', () => {
        const state = {
            ...initialState,
            backlogCards: [{ Id: 'c1' }]
        };
        const newCard = { Id: 'c2', Name: 'New Card' };
        const result = backlogReducer(state, {
            type: 'ADD_BACKLOG_CARD',
            payload: newCard
        });
        expect(result.backlogCards).toHaveLength(2);
        expect(result.backlogCards[0]).toEqual(newCard);
    });

    it('handles REMOVE_BACKLOG_CARD', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'REMOVE_BACKLOG_CARD',
            payload: { cardId: 'c1' }
        });
        expect(result.backlogCards).toHaveLength(2);
        expect(result.backlogCards.find((c) => c.Id === 'c1')).toBeUndefined();
        expect(result.selectedBacklogCards).toEqual(['c2']);
    });

    it('handles MOVE_CARD_TO_SPRINT', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'MOVE_CARD_TO_SPRINT',
            payload: { cardId: 'c2' }
        });
        expect(result.backlogCards).toHaveLength(2);
        expect(result.backlogCards.find((c) => c.Id === 'c2')).toBeUndefined();
        expect(result.selectedBacklogCards).toEqual(['c1']);
    });

    it('handles MOVE_CARD_TO_BACKLOG - card found in columns', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'MOVE_CARD_TO_BACKLOG',
            payload: { cardId: 'c4' }
        });
        expect(result.backlogCards).toHaveLength(4);
        expect(result.backlogCards[3].Id).toBe('c4');
    });

    it('handles MOVE_CARD_TO_BACKLOG - card not found in columns', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'MOVE_CARD_TO_BACKLOG',
            payload: { cardId: 'nonexistent' }
        });
        expect(result.backlogCards).toHaveLength(3);
    });

    it('handles MOVE_CARD_TO_BACKLOG - card already in backlog', () => {
        const state = {
            ...stateWithBacklog,
            columns: [
                {
                    Id: 'col1',
                    cards: [{ Id: 'c1', Name: 'Card 1' }]
                }
            ]
        };
        const result = backlogReducer(state, {
            type: 'MOVE_CARD_TO_BACKLOG',
            payload: { cardId: 'c1' }
        });
        // Should not duplicate
        expect(result.backlogCards).toHaveLength(3);
    });

    it('handles UPDATE_BACKLOG_CARD', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'UPDATE_BACKLOG_CARD',
            payload: { cardId: 'c1', updates: { Name: 'Updated Card 1' } }
        });
        expect(result.backlogCards[0].Name).toBe('Updated Card 1');
        expect(result.backlogCards[1].Name).toBe('Card 2');
    });

    it('handles REORDER_BACKLOG', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'REORDER_BACKLOG',
            payload: { cardId: 'c1', newIndex: 2 }
        });
        expect(result.backlogCards[0].Id).toBe('c2');
        expect(result.backlogCards[1].Id).toBe('c3');
        expect(result.backlogCards[2].Id).toBe('c1');
    });

    it('handles REORDER_BACKLOG - card not found', () => {
        const state = { ...stateWithBacklog };
        const result = backlogReducer(state, {
            type: 'REORDER_BACKLOG',
            payload: { cardId: 'nonexistent', newIndex: 0 }
        });
        expect(result).toBe(state);
    });

    it('handles SET_BACKLOG_VISIBLE', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, {
            type: 'SET_BACKLOG_VISIBLE',
            payload: true
        });
        expect(result.backlogVisible).toBe(true);
    });

    it('handles SET_SELECTED_BACKLOG_CARDS', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, {
            type: 'SET_SELECTED_BACKLOG_CARDS',
            payload: ['c1', 'c2']
        });
        expect(result.selectedBacklogCards).toEqual(['c1', 'c2']);
    });

    it('handles SET_SELECTED_BACKLOG_CARDS with null', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, {
            type: 'SET_SELECTED_BACKLOG_CARDS',
            payload: null
        });
        expect(result.selectedBacklogCards).toEqual([]);
    });

    it('handles TOGGLE_BACKLOG_CARD_SELECTION - select', () => {
        const state = { ...initialState, selectedBacklogCards: ['c1'] };
        const result = backlogReducer(state, {
            type: 'TOGGLE_BACKLOG_CARD_SELECTION',
            payload: { cardId: 'c2' }
        });
        expect(result.selectedBacklogCards).toEqual(['c1', 'c2']);
    });

    it('handles TOGGLE_BACKLOG_CARD_SELECTION - deselect', () => {
        const state = { ...initialState, selectedBacklogCards: ['c1', 'c2'] };
        const result = backlogReducer(state, {
            type: 'TOGGLE_BACKLOG_CARD_SELECTION',
            payload: { cardId: 'c1' }
        });
        expect(result.selectedBacklogCards).toEqual(['c2']);
    });

    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = backlogReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('columnsReducer', () => {
    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = columnsReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('cardsReducer', () => {
    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = cardsReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('syncReducer', () => {
    it('returns state for unknown action', () => {
        const state = { ...initialState };
        const result = syncReducer(state, { type: 'UNKNOWN' });
        expect(result).toBe(state);
    });
});

describe('dragReducer', () => {
    it('returns state and lastDragPosition for unknown action', () => {
        const state = { ...initialState };
        const result = dragReducer(state, { type: 'UNKNOWN' }, 'col1-0');
        expect(result.state).toBe(state);
        expect(result.lastDragPosition).toBe('col1-0');
    });
});

describe('rootReducer', () => {
    it('handles RESET action', () => {
        const state = {
            ...initialState,
            board: { Id: 'b1' },
            columns: [{ Id: 'c1', cards: [] }]
        };
        const result = rootReducer(state, { type: 'RESET' }, 'col1-0');
        expect(result.state).toEqual(initialState);
        expect(result.lastDragPosition).toBeNull();
    });

    it('passes through all reducers for non-RESET actions', () => {
        const state = { ...initialState };
        const result = rootReducer(
            state,
            { type: 'SET_LOADING', payload: true },
            null
        );
        expect(result.state.isLoading).toBe(true);
    });
});
