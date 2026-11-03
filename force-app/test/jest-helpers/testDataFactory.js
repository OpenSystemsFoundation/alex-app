/**
 * Shared test data factories for kanbanStore unit tests.
 * Provides builders for cards, columns, sprints, and initial state.
 */

let _idCounter = 0;
const nextId = (prefix = 'test') => `${prefix}-${++_idCounter}`;

export const resetIds = () => {
    _idCounter = 0;
};

// ─── Card Factory ──────────────────────────────────────────

export const buildCard = (overrides = {}) => ({
    Id: nextId('card'),
    subject: 'Test Card',
    position: '1000',
    cardType: 'Story',
    priority: 'Medium',
    storyPoints: 3,
    assigneeId: null,
    assignee: null,
    epicId: null,
    epic: null,
    columnId: null,
    ...overrides
});

// ─── Column Factory ────────────────────────────────────────

export const buildColumn = (overrides = {}) => {
    const cards = overrides.cards || [];
    return {
        Id: nextId('col'),
        name: 'Test Column',
        position: '1000',
        category: 'InProgress',
        hasWipLimit: false,
        wipLimit: null,
        cardCount: cards.length,
        cards,
        ...overrides
    };
};

// ─── Sprint Factory ────────────────────────────────────────

export const buildSprint = (overrides = {}) => ({
    Id: nextId('sprint'),
    name: 'SP-0001',
    status: 'Planning',
    startDate: null,
    endDate: null,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    ...overrides
});

// ─── Sprint Card Junction Factory ──────────────────────────

export const buildSprintCard = (overrides = {}) => ({
    Id: nextId('sc'),
    sprintId: nextId('sprint'),
    cardId: nextId('card'),
    position: null,
    ...overrides
});

// ─── State Factory ─────────────────────────────────────────

export const buildInitialState = (overrides = {}) => ({
    columns: [],
    board: null,
    boardId: null,
    dragState: null,
    isDragging: false,
    dragSource: null,
    isLoading: false,
    error: null,
    subscriptionStatus: 'disconnected',
    syncState: 'idle',
    pendingOperations: [],
    lastSyncTime: null,
    lastSyncError: null,
    pollingUpdateDetected: null,
    activeSprint: null,
    sprints: [],
    backlogCards: [],
    backlogSyncing: 0,
    sprintCards: [],
    planningSprintCards: [],
    backlogVisible: false,
    selectedBacklogCards: [],
    epicSummaries: [],
    ...overrides
});
