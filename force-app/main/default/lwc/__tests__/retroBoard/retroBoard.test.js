import { createElement } from '@lwc/engine-dom';

// ─── Mock: Apex methods ─────────────────────────────────────────────
jest.mock(
    '@salesforce/apex/RetrospectiveController.getRetroData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.createRetroCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.toggleVote',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.revealAuthors',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.updateRetroStatus',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.deleteRetroCard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.createActionItem',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RetrospectiveController.getBoards',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.searchUsers',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// ─── Mock: @salesforce/user/Id ──────────────────────────────────────
jest.mock('@salesforce/user/Id', () => ({ default: 'mockUserId001' }), {
    virtual: true
});

// ─── Mock: lightning/platformShowToastEvent ──────────────────────────
jest.mock(
    'lightning/platformShowToastEvent',
    () => ({
        ShowToastEvent: jest.fn(function (params) {
            return new CustomEvent('lightning__showtoast', {
                detail: params
            });
        })
    }),
    { virtual: true }
);

// ─── Import component under test ────────────────────────────────────
import RetroBoard from 'c/retroBoard';

// ─── Import mocked Apex methods ─────────────────────────────────────
import getRetroData from '@salesforce/apex/RetrospectiveController.getRetroData';
import createRetroCard from '@salesforce/apex/RetrospectiveController.createRetroCard';
import toggleVote from '@salesforce/apex/RetrospectiveController.toggleVote';
import revealAuthors from '@salesforce/apex/RetrospectiveController.revealAuthors';
import updateRetroStatus from '@salesforce/apex/RetrospectiveController.updateRetroStatus';
import deleteRetroCard from '@salesforce/apex/RetrospectiveController.deleteRetroCard';
import createActionItem from '@salesforce/apex/RetrospectiveController.createActionItem';
import getBoards from '@salesforce/apex/RetrospectiveController.getBoards';
import searchUsers from '@salesforce/apex/KanbanBoardController.searchUsers';

// Access non-@api methods via prototype
const proto = RetroBoard.prototype;

// ─── Test Data ──────────────────────────────────────────────────────
const CURRENT_USER_ID = 'mockUserId001';

const MOCK_RETRO = {
    Name: 'Sprint 42 Retro',
    sprintName: 'Sprint 42',
    status: 'Active',
    template: 'Start_Stop_Continue',
    showAlways: false,
    revealed: false,
    maxVotesPerUser: 5,
    boardId: 'board001'
};

const MOCK_CARDS = [
    {
        Id: 'card001',
        text: 'Great teamwork',
        category: 'Start',
        authorId: CURRENT_USER_ID,
        authorName: 'Current User',
        voteCount: 2,
        hasVoted: false,
        actionItemCardId: null
    },
    {
        Id: 'card002',
        text: 'Too many meetings',
        category: 'Stop',
        authorId: 'otherUser',
        authorName: 'Other User',
        voteCount: 1,
        hasVoted: true,
        actionItemCardId: null
    },
    {
        Id: 'card003',
        text: 'Daily standups',
        category: 'Continue',
        authorId: 'otherUser',
        authorName: 'Other User',
        voteCount: 0,
        hasVoted: false,
        actionItemCardId: 'existingAction'
    }
];

const MOCK_CATEGORIES = ['Start', 'Stop', 'Continue'];

const MOCK_RETRO_DATA = {
    retro: MOCK_RETRO,
    cards: MOCK_CARDS,
    categories: MOCK_CATEGORIES,
    currentUserVoteCount: 1
};

const MOCK_BOARDS = [
    { Id: 'board001', Name: 'Main Board' },
    { Id: 'board002', Name: 'Side Board' }
];

// ─── Helpers ────────────────────────────────────────────────────────
function createComponent(recordId = 'retro001') {
    const element = createElement('c-retro-board', {
        is: RetroBoard
    });
    element.recordId = recordId;
    document.body.appendChild(element);
    return element;
}

function flushPromises() {
    return new Promise((resolve) => {
        Promise.resolve().then(resolve);
    });
}

// Helper to create a mock context object that mimics the component instance
// for calling prototype methods
function createMockInstance(overrides = {}) {
    const mockToastManager = {
        showError: jest.fn(),
        showSuccess: jest.fn(),
        showInfo: jest.fn()
    };
    return {
        recordId: 'retro001',
        _retro: MOCK_RETRO,
        _cards: [...MOCK_CARDS],
        _categories: [...MOCK_CATEGORIES],
        _currentUserVoteCount: 1,
        _isLoading: false,
        _error: null,
        _isRefreshing: false,
        _subscriptionStatus: 'disconnected',
        showActionItemModal: false,
        _actionItemCardId: null,
        _actionItemBoardId: null,
        _actionItemDestination: 'first_column',
        _actionItemAssigneeId: null,
        _availableBoards: [],
        assigneeSearchTerm: '',
        assigneeResults: [],
        selectedAssigneeName: '',
        _currentUserId: CURRENT_USER_ID,
        _searchDebounce: null,
        _toastManager: mockToastManager,
        template: {
            querySelector: jest.fn().mockReturnValue(null)
        },
        loadRetroData: jest.fn().mockResolvedValue(undefined),
        dispatchEvent: jest.fn(),
        ...overrides
    };
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-retro-board', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        getRetroData.mockResolvedValue(MOCK_RETRO_DATA);
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    // ================================================================
    // connectedCallback / Data Loading
    // ================================================================
    describe('connectedCallback', () => {
        it('loads retro data on init when recordId is set', async () => {
            createComponent();
            await flushPromises();
            expect(getRetroData).toHaveBeenCalledWith({
                retroId: 'retro001'
            });
        });

        it('does not load data when recordId is not set', async () => {
            const element = createElement('c-retro-board', {
                is: RetroBoard
            });
            document.body.appendChild(element);
            await flushPromises();
            expect(getRetroData).not.toHaveBeenCalled();
        });

        it('handles getRetroData error with body', async () => {
            getRetroData.mockRejectedValue({
                body: { message: 'Load failed' }
            });
            createComponent();
            await flushPromises();
        });

        it('handles getRetroData error without body', async () => {
            getRetroData.mockRejectedValue(new Error('Network error'));
            createComponent();
            await flushPromises();
        });
    });

    // ================================================================
    // Computed Properties (exercised through rendering)
    // ================================================================
    describe('Computed properties', () => {
        it('renders with loaded data', async () => {
            createComponent();
            await flushPromises();
        });

        it('renders with showAlways true', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, showAlways: true }
            });
            createComponent();
            await flushPromises();
        });

        it('renders with revealed true', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, revealed: true }
            });
            createComponent();
            await flushPromises();
        });

        it('renders with Completed status', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, status: 'Completed' }
            });
            createComponent();
            await flushPromises();
        });

        it('renders with maxVotesPerUser 0', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, maxVotesPerUser: 0 }
            });
            createComponent();
            await flushPromises();
        });

        it('renders with Four_Ls template', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, template: 'Four_Ls' },
                categories: ['Liked', 'Learned', 'Lacked', 'Longed For']
            });
            createComponent();
            await flushPromises();
        });

        it('renders with Mad_Sad_Glad template', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, template: 'Mad_Sad_Glad' },
                categories: ['Mad', 'Sad', 'Glad']
            });
            createComponent();
            await flushPromises();
        });

        it('renders with Went_Well_Improve template', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, template: 'Went_Well_Improve' },
                categories: ['Went Well', 'To Improve', 'Action Items']
            });
            createComponent();
            await flushPromises();
        });

        it('renders with unknown template (fallback)', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, template: 'Unknown_Template' }
            });
            createComponent();
            await flushPromises();
        });

        it('renders with Reviewing status', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, status: 'Reviewing' }
            });
            createComponent();
            await flushPromises();
        });

        it('renders error state', async () => {
            getRetroData.mockRejectedValue(new Error('fail'));
            createComponent();
            await flushPromises();
        });

        it('renders Voting status for vote indicator', async () => {
            getRetroData.mockResolvedValue({
                ...MOCK_RETRO_DATA,
                retro: { ...MOCK_RETRO, status: 'Voting' }
            });
            createComponent();
            await flushPromises();
        });
    });

    // ================================================================
    // Computed property getters via prototype descriptors
    // ================================================================
    describe('Getter logic via prototype', () => {
        // Helper to call getter on a mock context
        function callGetter(name, ctx) {
            const desc = Object.getOwnPropertyDescriptor(proto, name);
            return desc.get.call(ctx);
        }

        it('retroName returns Name or fallback', () => {
            const ctx = createMockInstance();
            expect(callGetter('retroName', ctx)).toBe('Sprint 42 Retro');
            ctx._retro = null;
            expect(callGetter('retroName', ctx)).toBe('Retrospective');
        });

        it('sprintName returns sprint name', () => {
            const ctx = createMockInstance();
            expect(callGetter('sprintName', ctx)).toBe('Sprint 42');
        });

        it('retroStatus returns status or Draft', () => {
            const ctx = createMockInstance();
            expect(callGetter('retroStatus', ctx)).toBe('Active');
            ctx._retro = null;
            expect(callGetter('retroStatus', ctx)).toBe('Draft');
        });

        it('statusBadgeClass includes status', () => {
            const ctx = createMockInstance();
            expect(callGetter('statusBadgeClass', ctx)).toContain('active');
        });

        it('showAuthors returns false when not revealed/showAlways', () => {
            const ctx = createMockInstance();
            expect(callGetter('showAuthors', ctx)).toBe(false);
        });

        it('showAuthors returns true when showAlways', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, showAlways: true }
            });
            expect(callGetter('showAuthors', ctx)).toBe(true);
        });

        it('showAuthors returns true when revealed', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, revealed: true }
            });
            expect(callGetter('showAuthors', ctx)).toBe(true);
        });

        it('canReveal returns true for unrevealed retro', () => {
            const ctx = createMockInstance();
            expect(callGetter('canReveal', ctx)).toBe(true);
        });

        it('canReveal returns false when revealed', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, revealed: true }
            });
            expect(callGetter('canReveal', ctx)).toBe(false);
        });

        it('canAdvanceStatus returns true for Active', () => {
            const ctx = createMockInstance();
            expect(callGetter('canAdvanceStatus', ctx)).toBe(true);
        });

        it('canAdvanceStatus returns false for Completed', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Completed' }
            });
            expect(callGetter('canAdvanceStatus', ctx)).toBe(false);
        });

        it('canAdvanceStatus returns false when no retro', () => {
            const ctx = createMockInstance({ _retro: null });
            expect(callGetter('canAdvanceStatus', ctx)).toBe(false);
        });

        it('nextStatusLabel returns "Move to Voting" for Active', () => {
            const ctx = createMockInstance();
            expect(callGetter('nextStatusLabel', ctx)).toBe('Move to Voting');
        });

        it('nextStatusLabel returns empty for Completed', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Completed' }
            });
            expect(callGetter('nextStatusLabel', ctx)).toBe('');
        });

        it('showVoteIndicator returns true for Active with votes', () => {
            const ctx = createMockInstance();
            expect(callGetter('showVoteIndicator', ctx)).toBe(true);
        });

        it('showVoteIndicator returns false when maxVotes is 0', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, maxVotesPerUser: 0 }
            });
            expect(callGetter('showVoteIndicator', ctx)).toBe(false);
        });

        it('votesRemainingLabel computes correctly', () => {
            const ctx = createMockInstance();
            expect(callGetter('votesRemainingLabel', ctx)).toBe(
                '4 / 5 votes left'
            );
        });

        it('templateConfig returns correct config', () => {
            const ctx = createMockInstance();
            const config = callGetter('templateConfig', ctx);
            expect(config.categories).toEqual(['Start', 'Stop', 'Continue']);
        });

        it('templateConfig falls back for unknown', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, template: 'UNKNOWN' }
            });
            const config = callGetter('templateConfig', ctx);
            expect(config.categories).toEqual(['Start', 'Stop', 'Continue']);
        });

        it('columnsWithCards builds enriched columns', () => {
            const ctx = createMockInstance();
            const cols = callGetter('columnsWithCards', ctx);
            expect(cols).toHaveLength(3);
            expect(cols[0].category).toBe('Start');
            expect(cols[0].cards).toHaveLength(1);
        });

        it('refreshButtonClass returns spinning when refreshing', () => {
            const ctx = createMockInstance({ _isRefreshing: true });
            expect(callGetter('refreshButtonClass', ctx)).toContain('spinning');
        });

        it('refreshButtonClass returns normal when not refreshing', () => {
            const ctx = createMockInstance({ _isRefreshing: false });
            expect(callGetter('refreshButtonClass', ctx)).not.toContain(
                'spinning'
            );
        });

        it('actionItemModalText returns card text', () => {
            const ctx = createMockInstance({
                _actionItemCardId: 'card001'
            });
            expect(callGetter('actionItemModalText', ctx)).toBe(
                'Great teamwork'
            );
        });

        it('actionItemModalText returns empty when no card', () => {
            const ctx = createMockInstance({ _actionItemCardId: null });
            expect(callGetter('actionItemModalText', ctx)).toBe('');
        });

        it('actionItemCreateDisabled returns true when no board', () => {
            const ctx = createMockInstance({ _actionItemBoardId: null });
            expect(callGetter('actionItemCreateDisabled', ctx)).toBe(true);
        });

        it('actionItemCreateDisabled returns false when board set', () => {
            const ctx = createMockInstance({
                _actionItemBoardId: 'board001'
            });
            expect(callGetter('actionItemCreateDisabled', ctx)).toBe(false);
        });

        it('availableBoards enriches with isSelected', () => {
            const ctx = createMockInstance({
                _availableBoards: MOCK_BOARDS,
                _actionItemBoardId: 'board001'
            });
            const boards = callGetter('availableBoards', ctx);
            expect(boards[0].isSelected).toBe(true);
            expect(boards[1].isSelected).toBe(false);
        });

        it('retroSubscriptionChannel returns correct channel', () => {
            const ctx = createMockInstance();
            expect(callGetter('retroSubscriptionChannel', ctx)).toBe(
                '/event/OpenSF__RetroUpdateEvent__e'
            );
        });

        it('connectionStatusConfig returns defaults', () => {
            const ctx = createMockInstance();
            const config = callGetter('connectionStatusConfig', ctx);
            expect(config.status).toBe('disconnected');
        });
    });

    // ================================================================
    // Card enrichment via prototype
    // ================================================================
    describe('_enrichCard', () => {
        it('marks own card with showAuthor and canDelete', () => {
            const ctx = createMockInstance();
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[0]);
            expect(enriched.showAuthor).toBe(true);
            expect(enriched.canDelete).toBe(true);
        });

        it('hides author for non-owned card when not revealed', () => {
            const ctx = createMockInstance();
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[1]);
            expect(enriched.showAuthor).toBe(false);
        });

        it('disables canDelete for Completed status', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Completed' }
            });
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[0]);
            expect(enriched.canDelete).toBe(false);
        });

        it('enables canCreateActionItem for Reviewing without existing action', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Reviewing' }
            });
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[0]);
            expect(enriched.canCreateActionItem).toBe(true);
        });

        it('disables canCreateActionItem when card already has action', () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Reviewing' }
            });
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[2]);
            expect(enriched.canCreateActionItem).toBe(false);
        });

        it('sets voted CSS classes', () => {
            const ctx = createMockInstance();
            const enriched = proto._enrichCard.call(ctx, MOCK_CARDS[1]);
            expect(enriched.cardClass).toContain('voted');
            expect(enriched.voteButtonClass).toContain('voted');
        });
    });

    // ================================================================
    // Event Handlers via prototype
    // ================================================================
    describe('handleAddCard', () => {
        it('creates a new retro card', async () => {
            const newCard = {
                Id: 'card004',
                text: 'New idea',
                category: 'Start',
                authorId: CURRENT_USER_ID
            };
            createRetroCard.mockResolvedValue(newCard);

            const mockTextarea = { value: 'New idea' };
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue(mockTextarea)
                }
            });

            await proto.handleAddCard.call(ctx, {
                currentTarget: { dataset: { category: 'Start' } }
            });
            await flushPromises();

            expect(createRetroCard).toHaveBeenCalledWith({
                retroId: 'retro001',
                category: 'Start',
                text: 'New idea'
            });
        });

        it('does nothing when textarea is empty', async () => {
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue({ value: '   ' })
                }
            });
            await proto.handleAddCard.call(ctx, {
                currentTarget: { dataset: { category: 'Start' } }
            });
            expect(createRetroCard).not.toHaveBeenCalled();
        });

        it('does nothing when textarea not found', async () => {
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue(null)
                }
            });
            await proto.handleAddCard.call(ctx, {
                currentTarget: { dataset: { category: 'Start' } }
            });
            expect(createRetroCard).not.toHaveBeenCalled();
        });

        it('shows error on failure', async () => {
            createRetroCard.mockRejectedValue({
                body: { message: 'Create failed' }
            });
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue({ value: 'New' })
                }
            });
            await proto.handleAddCard.call(ctx, {
                currentTarget: { dataset: { category: 'Start' } }
            });
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    describe('handleCardInputKeydown', () => {
        it('triggers add on Ctrl+Enter', () => {
            const mockBtn = { click: jest.fn() };
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue(mockBtn)
                }
            });
            proto.handleCardInputKeydown.call(ctx, {
                key: 'Enter',
                ctrlKey: true,
                metaKey: false,
                preventDefault: jest.fn(),
                target: { dataset: { category: 'Start' } }
            });
            expect(mockBtn.click).toHaveBeenCalled();
        });

        it('does nothing for regular Enter', () => {
            const mockBtn = { click: jest.fn() };
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue(mockBtn)
                }
            });
            proto.handleCardInputKeydown.call(ctx, {
                key: 'Enter',
                ctrlKey: false,
                metaKey: false,
                target: { dataset: { category: 'Start' } }
            });
            expect(mockBtn.click).not.toHaveBeenCalled();
        });

        it('handles missing button gracefully', () => {
            const ctx = createMockInstance({
                template: {
                    querySelector: jest.fn().mockReturnValue(null)
                }
            });
            proto.handleCardInputKeydown.call(ctx, {
                key: 'Enter',
                ctrlKey: true,
                metaKey: false,
                preventDefault: jest.fn(),
                target: { dataset: { category: 'Start' } }
            });
        });
    });

    describe('handleToggleVote', () => {
        it('toggles vote and updates card', async () => {
            const updatedCard = { ...MOCK_CARDS[0], hasVoted: true };
            toggleVote.mockResolvedValue(updatedCard);

            const ctx = createMockInstance();
            await proto.handleToggleVote.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();

            expect(toggleVote).toHaveBeenCalledWith({ cardId: 'card001' });
            expect(ctx._currentUserVoteCount).toBe(2);
        });

        it('decrements count on unvote', async () => {
            const updatedCard = { ...MOCK_CARDS[1], hasVoted: false };
            toggleVote.mockResolvedValue(updatedCard);

            const ctx = createMockInstance();
            await proto.handleToggleVote.call(ctx, {
                currentTarget: { dataset: { cardId: 'card002' } }
            });
            await flushPromises();

            expect(ctx._currentUserVoteCount).toBe(0);
        });

        it('shows error on failure', async () => {
            toggleVote.mockRejectedValue({
                body: { message: 'Vote failed' }
            });
            const ctx = createMockInstance();
            await proto.handleToggleVote.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    describe('handleRevealAuthors', () => {
        it('reveals authors', async () => {
            revealAuthors.mockResolvedValue(undefined);
            const ctx = createMockInstance();
            await proto.handleRevealAuthors.call(ctx);
            await flushPromises();
            expect(revealAuthors).toHaveBeenCalledWith({
                retroId: 'retro001'
            });
            expect(ctx._retro.revealed).toBe(true);
        });

        it('shows error on failure', async () => {
            revealAuthors.mockRejectedValue({
                body: { message: 'Fail' }
            });
            const ctx = createMockInstance();
            await proto.handleRevealAuthors.call(ctx);
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    describe('handleToggleShowAlways', () => {
        it('toggles showAlways', () => {
            const ctx = createMockInstance();
            proto.handleToggleShowAlways.call(ctx);
            expect(ctx._retro.showAlways).toBe(true);
            proto.handleToggleShowAlways.call(ctx);
            expect(ctx._retro.showAlways).toBe(false);
        });
    });

    describe('handleAdvanceStatus', () => {
        it('advances from Active to Voting', async () => {
            const updatedRetro = { ...MOCK_RETRO, status: 'Voting' };
            updateRetroStatus.mockResolvedValue(updatedRetro);

            const ctx = createMockInstance();
            await proto.handleAdvanceStatus.call(ctx);
            await flushPromises();

            expect(updateRetroStatus).toHaveBeenCalledWith({
                retroId: 'retro001',
                status: 'Voting'
            });
        });

        it('does nothing for Completed', async () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Completed' }
            });
            await proto.handleAdvanceStatus.call(ctx);
            expect(updateRetroStatus).not.toHaveBeenCalled();
        });

        it('does nothing for unknown status', async () => {
            const ctx = createMockInstance({
                _retro: { ...MOCK_RETRO, status: 'Unknown' }
            });
            await proto.handleAdvanceStatus.call(ctx);
            expect(updateRetroStatus).not.toHaveBeenCalled();
        });

        it('shows error on failure', async () => {
            updateRetroStatus.mockRejectedValue({
                body: { message: 'Fail' }
            });
            const ctx = createMockInstance();
            await proto.handleAdvanceStatus.call(ctx);
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    describe('handleDeleteCard', () => {
        it('deletes card', async () => {
            deleteRetroCard.mockResolvedValue(undefined);
            const ctx = createMockInstance();
            await proto.handleDeleteCard.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();
            expect(deleteRetroCard).toHaveBeenCalledWith({
                cardId: 'card001'
            });
            expect(ctx._cards.find((c) => c.Id === 'card001')).toBeUndefined();
        });

        it('shows error on failure', async () => {
            deleteRetroCard.mockRejectedValue({
                body: { message: 'Fail' }
            });
            const ctx = createMockInstance();
            await proto.handleDeleteCard.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    describe('handleRefresh', () => {
        it('reloads data and sets refreshing', async () => {
            const ctx = createMockInstance();
            await proto.handleRefresh.call(ctx);
            await flushPromises();
            expect(ctx.loadRetroData).toHaveBeenCalled();
            expect(ctx._isRefreshing).toBe(true);
            jest.advanceTimersByTime(700);
            expect(ctx._isRefreshing).toBe(false);
        });
    });

    // ================================================================
    // Action Item Modal
    // ================================================================
    describe('Action Item Modal', () => {
        it('opens modal and loads boards', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            const ctx = createMockInstance();
            await proto.handleOpenActionItemModal.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();
            expect(getBoards).toHaveBeenCalled();
            expect(ctx.showActionItemModal).toBe(true);
        });

        it('does not reload boards if already loaded', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            const ctx = createMockInstance({
                _availableBoards: MOCK_BOARDS
            });
            await proto.handleOpenActionItemModal.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            expect(getBoards).not.toHaveBeenCalled();
        });

        it('handles board load error', async () => {
            getBoards.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance();
            await proto.handleOpenActionItemModal.call(ctx, {
                currentTarget: { dataset: { cardId: 'card001' } }
            });
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });

        it('closes modal', () => {
            const ctx = createMockInstance({
                showActionItemModal: true,
                _actionItemCardId: 'card001'
            });
            proto.handleCloseActionItemModal.call(ctx);
            expect(ctx.showActionItemModal).toBe(false);
            expect(ctx._actionItemCardId).toBeNull();
        });

        it('updates board ID', () => {
            const ctx = createMockInstance();
            proto.handleActionItemBoardChange.call(ctx, {
                target: { value: 'board002' }
            });
            expect(ctx._actionItemBoardId).toBe('board002');
        });

        it('updates destination', () => {
            const ctx = createMockInstance();
            proto.handleActionItemDestinationChange.call(ctx, {
                target: { value: 'last_column' }
            });
            expect(ctx._actionItemDestination).toBe('last_column');
        });

        it('creates action item', async () => {
            const updatedCard = {
                ...MOCK_CARDS[0],
                actionItemCardId: 'newAction',
                actionItemCardName: 'AI-001'
            };
            createActionItem.mockResolvedValue(updatedCard);

            const ctx = createMockInstance({
                _actionItemCardId: 'card001',
                _actionItemBoardId: 'board001'
            });
            await proto.handleCreateActionItem.call(ctx);
            await flushPromises();

            expect(createActionItem).toHaveBeenCalledWith({
                retroCardId: 'card001',
                boardId: 'board001',
                assigneeId: null,
                destination: 'first_column'
            });
            expect(ctx._toastManager.showSuccess).toHaveBeenCalled();
            expect(ctx.showActionItemModal).toBe(false);
        });

        it('does nothing without board or card', async () => {
            const ctx = createMockInstance();
            await proto.handleCreateActionItem.call(ctx);
            expect(createActionItem).not.toHaveBeenCalled();
        });

        it('shows error on create failure', async () => {
            createActionItem.mockRejectedValue({
                body: { message: 'Fail' }
            });
            const ctx = createMockInstance({
                _actionItemCardId: 'card001',
                _actionItemBoardId: 'board001'
            });
            await proto.handleCreateActionItem.call(ctx);
            await flushPromises();
            expect(ctx._toastManager.showError).toHaveBeenCalled();
        });
    });

    // ================================================================
    // Assignee Search
    // ================================================================
    describe('Assignee search', () => {
        it('clears results for short input', () => {
            const ctx = createMockInstance();
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: 'a' }
            });
            expect(ctx.assigneeResults).toEqual([]);
        });

        it('clears results for empty input', () => {
            const ctx = createMockInstance();
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: '' }
            });
            expect(ctx.assigneeResults).toEqual([]);
        });

        it('debounces and calls searchUsers', async () => {
            searchUsers.mockResolvedValue([
                { Id: 'user001', Name: 'Alice Smith' }
            ]);
            const ctx = createMockInstance();
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: 'Ali' }
            });
            jest.advanceTimersByTime(400);
            await flushPromises();
            expect(searchUsers).toHaveBeenCalledWith({
                searchTerm: 'Ali'
            });
        });

        it('clears previous debounce on new search', async () => {
            searchUsers.mockResolvedValue([]);
            const ctx = createMockInstance();
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: 'Al' }
            });
            jest.advanceTimersByTime(100);
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: 'Ali' }
            });
            jest.advanceTimersByTime(400);
            await flushPromises();
            expect(searchUsers).toHaveBeenCalledTimes(1);
        });

        it('handles search error gracefully', async () => {
            searchUsers.mockRejectedValue(new Error('Search fail'));
            const ctx = createMockInstance();
            proto.handleAssigneeSearch.call(ctx, {
                target: { value: 'Alice' }
            });
            jest.advanceTimersByTime(400);
            await flushPromises();
        });

        it('selects an assignee', async () => {
            const ctx = createMockInstance({
                assigneeResults: [{ Id: 'user001', Name: 'Alice Smith' }]
            });
            proto.handleSelectAssignee.call(ctx, {
                currentTarget: { dataset: { userId: 'user001' } }
            });
            expect(ctx._actionItemAssigneeId).toBe('user001');
            expect(ctx.selectedAssigneeName).toBe('Alice Smith');
        });

        it('ignores unknown user in select', () => {
            const ctx = createMockInstance();
            proto.handleSelectAssignee.call(ctx, {
                currentTarget: { dataset: { userId: 'unknown' } }
            });
            expect(ctx._actionItemAssigneeId).toBeNull();
        });
    });

    // ================================================================
    // Real-time Event Handling
    // ================================================================
    describe('Real-time events', () => {
        it('reloads data for matching retro event', () => {
            const ctx = createMockInstance();
            proto.handleRetroEvent.call(ctx, {
                detail: {
                    payload: { OpenSF__RetroId__c: 'retro001' }
                }
            });
            expect(ctx.loadRetroData).toHaveBeenCalled();
        });

        it('ignores events for different retro', () => {
            const ctx = createMockInstance();
            proto.handleRetroEvent.call(ctx, {
                detail: {
                    payload: { OpenSF__RetroId__c: 'otherRetro' }
                }
            });
            expect(ctx.loadRetroData).not.toHaveBeenCalled();
        });

        it('does nothing with no payload', () => {
            const ctx = createMockInstance();
            proto.handleRetroEvent.call(ctx, { detail: {} });
            expect(ctx.loadRetroData).not.toHaveBeenCalled();
        });

        it('handles RetroId__c fallback', () => {
            const ctx = createMockInstance();
            proto.handleRetroEvent.call(ctx, {
                detail: {
                    payload: { RetroId__c: 'retro001' }
                }
            });
            expect(ctx.loadRetroData).toHaveBeenCalled();
        });

        it('updates subscription status', () => {
            const ctx = createMockInstance();
            proto.handleSubscriptionStatusChange.call(ctx, {
                detail: { status: 'connected' }
            });
            expect(ctx._subscriptionStatus).toBe('connected');
        });
    });

    // ================================================================
    // Toast Helper
    // ================================================================
    describe('_showToast', () => {
        it('calls showSuccess for success', () => {
            const ctx = createMockInstance();
            proto._showToast.call(ctx, 'T', 'M', 'success');
            expect(ctx._toastManager.showSuccess).toHaveBeenCalledWith(
                'T',
                'M'
            );
        });

        it('calls showError for error', () => {
            const ctx = createMockInstance();
            proto._showToast.call(ctx, 'T', 'M', 'error');
            expect(ctx._toastManager.showError).toHaveBeenCalledWith('T', 'M');
        });

        it('calls showInfo for default', () => {
            const ctx = createMockInstance();
            proto._showToast.call(ctx, 'T', 'M', 'info');
            expect(ctx._toastManager.showInfo).toHaveBeenCalledWith('T', 'M');
        });

        it('does nothing without toast manager', () => {
            const ctx = createMockInstance({ _toastManager: null });
            proto._showToast.call(ctx, 'T', 'M', 'success');
        });
    });
});
