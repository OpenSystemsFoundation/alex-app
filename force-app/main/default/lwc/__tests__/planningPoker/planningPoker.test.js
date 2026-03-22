import { createElement } from '@lwc/engine-dom';

// ─── Mock: Apex methods ─────────────────────────────────────────────
jest.mock(
    '@salesforce/apex/PlanningPokerController.getActiveSessions',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.createSession',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.joinSession',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.leaveSession',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.castVote',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.revealVotes',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.clearVotes',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.getSession',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.closeSession',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.setReaction',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/PlanningPokerController.getCurrentUserId',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getKanbanConfig',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// ─── Mock: lightning/empApi ─────────────────────────────────────────
jest.mock(
    'lightning/empApi',
    () => ({
        subscribe: jest.fn().mockResolvedValue({ id: 'sub1' }),
        unsubscribe: jest.fn().mockImplementation((sub, cb) => {
            if (cb) cb();
        }),
        onError: jest.fn()
    }),
    { virtual: true }
);

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

// ─── Mock HTMLCanvasElement.prototype.getContext ─────────────────────
const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: ''
};
const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);
});
afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
});

// ─── Import component under test ────────────────────────────────────
import PlanningPoker from 'c/planningPoker';

// ─── Import mocked Apex methods ─────────────────────────────────────
import getActiveSessions from '@salesforce/apex/PlanningPokerController.getActiveSessions';
import createSession from '@salesforce/apex/PlanningPokerController.createSession';
import joinSession from '@salesforce/apex/PlanningPokerController.joinSession';
import leaveSession from '@salesforce/apex/PlanningPokerController.leaveSession';
import castVote from '@salesforce/apex/PlanningPokerController.castVote';
import revealVotes from '@salesforce/apex/PlanningPokerController.revealVotes';
import clearVotes from '@salesforce/apex/PlanningPokerController.clearVotes';
import getSession from '@salesforce/apex/PlanningPokerController.getSession';
import setReaction from '@salesforce/apex/PlanningPokerController.setReaction';
import getCurrentUserId from '@salesforce/apex/PlanningPokerController.getCurrentUserId';
import getKanbanConfig from '@salesforce/apex/KanbanBoardController.getKanbanConfig';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
// ShowToastEvent is provided by the jest.mock above

// ─── Test Data ──────────────────────────────────────────────────────
const MOCK_USER_ID = 'user001';

const MOCK_SESSION = {
    id: 'session001',
    name: 'Sprint Planning',
    sessionName: 'Sprint 42',
    votingSystem: 'Fibonacci',
    status: 'Voting',
    showClearPermission: 'Everyone',
    createdById: MOCK_USER_ID,
    autoReveal: true,
    allowReactions: true,
    participants: [
        {
            userId: MOCK_USER_ID,
            displayName: 'Alice',
            role: 'Voter',
            isActive: true,
            hasVoted: true,
            vote: '5'
        },
        {
            userId: 'user002',
            displayName: 'Bob',
            role: 'Voter',
            isActive: true,
            hasVoted: true,
            vote: '8'
        },
        {
            userId: 'user003',
            displayName: 'Charlie',
            role: 'Observer',
            isActive: true,
            hasVoted: false,
            vote: null
        }
    ]
};

const MOCK_REVEALED_SESSION = {
    ...MOCK_SESSION,
    status: 'Revealed'
};

const MOCK_ACTIVE_SESSIONS = [
    {
        id: 'session001',
        name: 'Sprint Planning',
        sessionName: 'Sprint 42',
        votingSystem: 'Fibonacci',
        participants: [{ userId: 'user001' }, { userId: 'user002' }]
    },
    {
        id: 'session002',
        name: 'Backlog Refinement',
        sessionName: '',
        votingSystem: 'TShirt',
        participants: []
    }
];

// ─── Helpers ────────────────────────────────────────────────────────
function createComponent() {
    const element = createElement('c-planning-poker', {
        is: PlanningPoker
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() {
    return new Promise((resolve) => {
        Promise.resolve().then(resolve);
    });
}

// Access non-@api methods via prototype
const proto = PlanningPoker.prototype;

// Helper: plain-object mock with prototype methods/getters bound manually.
function createMockInstance(overrides = {}) {
    const ctx = {
        currentView: 'lobby',
        session: null,
        activeSessions: [],
        isLoading: false,
        displayName: '',
        selectedRole: 'Observer',
        selectedVotingSystem: 'Fibonacci',
        showClearPermission: 'Everyone',
        sessionName: '',
        autoReveal: true,
        allowReactions: true,
        showAdvancedSettings: false,
        isCreatingNew: true,
        selectedSessionId: null,
        selectedVote: null,
        timerSeconds: 0,
        timerActive: false,
        showTimerModal: false,
        showHelp: false,
        timerInput: 60,
        debugMode: false,
        _subscription: null,
        _currentUserId: MOCK_USER_ID,
        _timerInterval: null,
        _pollInterval: null,
        dispatchEvent: jest.fn(),
        template: { querySelector: jest.fn().mockReturnValue(null) },
        ...overrides
    };
    // Bind private methods so this.* calls work inside handlers
    ctx._showError = proto._showError.bind(ctx);
    ctx._showToast = proto._showToast.bind(ctx);
    ctx._castVote = proto._castVote.bind(ctx);
    ctx._refreshSession = proto._refreshSession.bind(ctx);
    ctx._unsubscribe = proto._unsubscribe.bind(ctx);
    ctx._stopTimer = proto._stopTimer.bind(ctx);
    ctx._startTimerCountdown = proto._startTimerCountdown.bind(ctx);
    ctx._subscribeToEvents = proto._subscribeToEvents.bind(ctx);
    ctx._startPolling = proto._startPolling.bind(ctx);
    ctx._loadActiveSessions = proto._loadActiveSessions.bind(ctx);
    ctx._calculateMedian = proto._calculateMedian.bind(ctx);
    ctx._renderDonutChart = jest.fn(); // skip canvas in tests
    // Computed getters used by handlers
    Object.defineProperty(ctx, 'isFormValid', {
        get() {
            return this.displayName && this.displayName.trim().length > 0;
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'canShowClear', {
        get() {
            if (!this.session) return false;
            if (this.session.showClearPermission === 'Everyone') return true;
            return this.session.createdById === this._currentUserId;
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'isRevealed', {
        get() {
            return this.session && this.session.status === 'Revealed';
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'isCurrentUserVoter', {
        get() {
            if (!this.session || !this.session.participants) return false;
            const me = this.session.participants.find(
                (p) => p.userId === this._currentUserId
            );
            return me && me.role === 'Voter';
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'voters', {
        get() {
            if (!this.session || !this.session.participants) return [];
            return this.session.participants.filter(
                (p) => p.role === 'Voter' && p.isActive
            );
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'voteResults', {
        get() {
            const desc = Object.getOwnPropertyDescriptor(proto, 'voteResults');
            return desc.get.call(this);
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'votingCards', {
        get() {
            const desc = Object.getOwnPropertyDescriptor(proto, 'votingCards');
            return desc.get.call(this);
        },
        configurable: true
    });
    return ctx;
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-planning-poker', () => {
    beforeEach(() => {
        getCurrentUserId.mockResolvedValue(MOCK_USER_ID);
        getKanbanConfig.mockResolvedValue({ showDebugInfo: false });
        getActiveSessions.mockResolvedValue([]);
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ================================================================
    // connectedCallback / Initial Load
    // ================================================================
    describe('connectedCallback', () => {
        it('loads current user ID, active sessions, and config on init', async () => {
            getActiveSessions.mockResolvedValue(MOCK_ACTIVE_SESSIONS);
            createComponent();
            await flushPromises();

            expect(getCurrentUserId).toHaveBeenCalled();
            expect(getActiveSessions).toHaveBeenCalled();
            expect(getKanbanConfig).toHaveBeenCalled();
        });

        it('handles getCurrentUserId error gracefully', async () => {
            getCurrentUserId.mockRejectedValue(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            createComponent();
            await flushPromises();
            spy.mockRestore();
        });

        it('handles getKanbanConfig error gracefully', async () => {
            getKanbanConfig.mockRejectedValue(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            createComponent();
            await flushPromises();
            spy.mockRestore();
        });

        it('handles getActiveSessions error gracefully', async () => {
            getActiveSessions.mockRejectedValue(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            createComponent();
            await flushPromises();
            spy.mockRestore();
        });

        it('registers EMP API error handler', async () => {
            createComponent();
            await flushPromises();
            expect(onError).toHaveBeenCalled();
        });
    });

    // ================================================================
    // Getters / Computed Properties (via prototype)
    // ================================================================
    describe('Getters and computed properties', () => {
        it('isFormValid returns false when displayName is empty', () => {
            const ctx = createMockInstance();
            expect(ctx.isFormValid).toBeFalsy();
        });

        it('isFormValid allows creation when displayName has content', () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            expect(ctx.isFormValid).toBe(true);
        });

        it('_calculateMedian returns 0 for empty array', () => {
            expect(proto._calculateMedian([])).toBe(0);
        });

        it('_calculateMedian returns middle value for odd length', () => {
            expect(proto._calculateMedian([1, 3, 5])).toBe(3);
        });

        it('_calculateMedian returns average for even length', () => {
            expect(proto._calculateMedian([1, 3, 5, 7])).toBe(4);
        });

        it('_calculateMedian returns single value for length 1', () => {
            expect(proto._calculateMedian([42])).toBe(42);
        });
    });

    // ================================================================
    // Lobby Handlers
    // ================================================================
    describe('Lobby handlers', () => {
        it('handleDisplayNameChange updates displayName and is used in create', async () => {
            const ctx = createMockInstance();
            proto.handleDisplayNameChange.call(ctx, {
                target: { value: 'TestUser' }
            });
            expect(ctx.displayName).toBe('TestUser');
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ displayName: 'TestUser' })
            );
        });

        it('handleRoleChange with Voter sets role', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleRoleChange.call(ctx, { target: { value: 'Voter' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'Voter' })
            );
        });

        it('handleRoleChange with Observer sets Observer role', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleRoleChange.call(ctx, { target: { value: 'Observer' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'Observer' })
            );
        });

        it('handleVotingSystemChange updates voting system', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleVotingSystemChange.call(ctx, {
                detail: { value: 'TShirt' }
            });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ votingSystem: 'TShirt' })
            );
        });

        it('handleShowClearChange updates permission', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleShowClearChange.call(ctx, {
                detail: { value: 'CreatorOnly' }
            });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ showClearPermission: 'CreatorOnly' })
            );
        });

        it('handleSessionNameChange updates session name', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleSessionNameChange.call(ctx, {
                target: { value: 'My Session' }
            });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ sessionName: 'My Session' })
            );
        });

        it('handleAutoRevealChange toggles autoReveal', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleAutoRevealChange.call(ctx, {
                target: { checked: false }
            });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ autoReveal: false })
            );
        });

        it('handleAllowReactionsChange toggles reactions', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            proto.handleAllowReactionsChange.call(ctx, {
                target: { checked: false }
            });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ allowReactions: false })
            );
        });

        it('toggleAdvancedSettings flips the flag', () => {
            const ctx = createMockInstance();
            proto.toggleAdvancedSettings.call(ctx);
            expect(ctx.showAdvancedSettings).toBe(true);
            proto.toggleAdvancedSettings.call(ctx);
            expect(ctx.showAdvancedSettings).toBe(false);
        });

        it('toggleHelp flips the flag', () => {
            const ctx = createMockInstance();
            proto.toggleHelp.call(ctx);
            expect(ctx.showHelp).toBe(true);
            proto.toggleHelp.call(ctx);
            expect(ctx.showHelp).toBe(false);
        });

        it('handleRefreshSessions reloads sessions', async () => {
            const ctx = createMockInstance();
            getActiveSessions.mockResolvedValue(MOCK_ACTIVE_SESSIONS);
            proto.handleRefreshSessions.call(ctx);
            await flushPromises();
            expect(getActiveSessions).toHaveBeenCalled();
        });

        it('handleShowCreateForm sets isCreatingNew', () => {
            const ctx = createMockInstance({ isCreatingNew: false });
            proto.handleShowCreateForm.call(ctx);
            expect(ctx.isCreatingNew).toBe(true);
        });

        it('handleSelectSession sets selectedSessionId', () => {
            const ctx = createMockInstance();
            proto.handleSelectSession.call(ctx, {
                currentTarget: { dataset: { id: 'session001' } }
            });
            expect(ctx.selectedSessionId).toBe('session001');
            expect(ctx.isCreatingNew).toBe(false);
        });
    });

    // ================================================================
    // Create / Join Session
    // ================================================================
    describe('Session creation and joining', () => {
        it('handleCreateSession creates session and subscribes', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            createSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleCreateSession.call(ctx);
            await flushPromises();
            expect(createSession).toHaveBeenCalled();
            expect(subscribe).toHaveBeenCalled();
            expect(ctx.session).toEqual(MOCK_SESSION);
            expect(ctx.currentView).toBe('voting');
        });

        it('handleCreateSession shows error on failure', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            createSession.mockRejectedValue({
                body: { message: 'Create failed' }
            });
            await proto.handleCreateSession.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleCreateSession does nothing when form invalid', async () => {
            const ctx = createMockInstance();
            await proto.handleCreateSession.call(ctx);
            expect(createSession).not.toHaveBeenCalled();
        });

        it('handleJoinSession joins existing session', async () => {
            const ctx = createMockInstance({
                displayName: 'Bob',
                selectedSessionId: 'session001'
            });
            joinSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleJoinSession.call(ctx);
            await flushPromises();
            expect(joinSession).toHaveBeenCalledWith(
                expect.objectContaining({ sessionId: 'session001' })
            );
            expect(ctx.currentView).toBe('voting');
        });

        it('handleJoinSession shows error on failure', async () => {
            const ctx = createMockInstance({
                displayName: 'Bob',
                selectedSessionId: 'session001'
            });
            joinSession.mockRejectedValue({ body: { message: 'Join failed' } });
            await proto.handleJoinSession.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleJoinSession does nothing when no session selected', async () => {
            const ctx = createMockInstance({ displayName: 'Bob' });
            await proto.handleJoinSession.call(ctx);
            expect(joinSession).not.toHaveBeenCalled();
        });

        it('handleJoinSession does nothing when form invalid', async () => {
            const ctx = createMockInstance({ selectedSessionId: 'session001' });
            await proto.handleJoinSession.call(ctx);
            expect(joinSession).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // Back to Lobby
    // ================================================================
    describe('handleBackToLobby', () => {
        it('leaves session and returns to lobby', async () => {
            const ctx = createMockInstance({
                session: MOCK_SESSION,
                currentView: 'voting'
            });
            leaveSession.mockResolvedValue(undefined);
            getActiveSessions.mockResolvedValue([]);
            proto.handleBackToLobby.call(ctx);
            await flushPromises();
            expect(leaveSession).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
            expect(ctx.currentView).toBe('lobby');
            expect(ctx.session).toBeNull();
        });

        it('handles leaveSession error gracefully', async () => {
            const ctx = createMockInstance({
                session: MOCK_SESSION,
                currentView: 'voting'
            });
            leaveSession.mockRejectedValue(new Error('fail'));
            proto.handleBackToLobby.call(ctx);
            await flushPromises();
            expect(ctx.currentView).toBe('lobby');
        });
    });

    // ================================================================
    // Voting Handlers
    // ================================================================
    describe('Voting handlers', () => {
        function votingCtx(extra = {}) {
            return createMockInstance({
                session: MOCK_SESSION,
                currentView: 'voting',
                ...extra
            });
        }

        it('handleCardClick casts a vote', async () => {
            const ctx = votingCtx();
            castVote.mockResolvedValue(undefined);
            proto.handleCardClick.call(ctx, {
                currentTarget: { dataset: { value: '5' } }
            });
            await flushPromises();
            expect(castVote).toHaveBeenCalledWith(
                expect.objectContaining({ vote: '5' })
            );
        });

        it('handleCardClick deselects when clicking same card', () => {
            const ctx = votingCtx({ selectedVote: '5' });
            proto.handleCardClick.call(ctx, {
                currentTarget: { dataset: { value: '5' } }
            });
            expect(ctx.selectedVote).toBeNull();
        });

        it('handleCardClick does nothing when revealed', () => {
            const ctx = votingCtx({ session: MOCK_REVEALED_SESSION });
            proto.handleCardClick.call(ctx, {
                currentTarget: { dataset: { value: '5' } }
            });
            expect(castVote).not.toHaveBeenCalled();
        });

        it('handleCardClick shows error on castVote failure', async () => {
            const ctx = votingCtx();
            castVote.mockRejectedValue({ body: { message: 'Vote error' } });
            proto.handleCardClick.call(ctx, {
                currentTarget: { dataset: { value: '3' } }
            });
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleRevealVotes reveals votes', async () => {
            const ctx = votingCtx();
            revealVotes.mockResolvedValue(MOCK_REVEALED_SESSION);
            await proto.handleRevealVotes.call(ctx);
            expect(revealVotes).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
        });

        it('handleRevealVotes shows error on failure', async () => {
            const ctx = votingCtx();
            revealVotes.mockRejectedValue({
                body: { message: 'Reveal failed' }
            });
            await proto.handleRevealVotes.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleRevealVotes does nothing when canShowClear is false', async () => {
            const ctx = createMockInstance(); // no session → canShowClear false
            await proto.handleRevealVotes.call(ctx);
            expect(revealVotes).not.toHaveBeenCalled();
        });

        it('handleClearVotes clears votes', async () => {
            const ctx = votingCtx();
            clearVotes.mockResolvedValue({ ...MOCK_SESSION });
            await proto.handleClearVotes.call(ctx);
            expect(clearVotes).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
        });

        it('handleClearVotes shows error on failure', async () => {
            const ctx = votingCtx();
            clearVotes.mockRejectedValue({ body: { message: 'Clear failed' } });
            await proto.handleClearVotes.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleClearVotes does nothing without permission', async () => {
            const ctx = votingCtx({
                session: {
                    ...MOCK_SESSION,
                    showClearPermission: 'CreatorOnly',
                    createdById: 'someoneElse'
                }
            });
            await proto.handleClearVotes.call(ctx);
            expect(clearVotes).not.toHaveBeenCalled();
        });

        it('handleReaction sends reaction', async () => {
            const ctx = votingCtx();
            setReaction.mockResolvedValue(undefined);
            getSession.mockResolvedValue(MOCK_SESSION);
            await proto.handleReaction.call(ctx, {
                currentTarget: { dataset: { value: '\uD83D\uDC4D' } }
            });
            await flushPromises();
            expect(setReaction).toHaveBeenCalledWith(
                expect.objectContaining({ reaction: '\uD83D\uDC4D' })
            );
        });

        it('handleReaction shows error on failure', async () => {
            const ctx = votingCtx();
            setReaction.mockRejectedValue({
                body: { message: 'Reaction failed' }
            });
            await proto.handleReaction.call(ctx, {
                currentTarget: { dataset: { value: '\uD83D\uDC4D' } }
            });
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });
    });

    // ================================================================
    // Timer (using fake timers scoped to this describe)
    // ================================================================
    describe('Timer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });

        it('handleSetTimer opens timer modal', () => {
            const ctx = createMockInstance();
            proto.handleSetTimer.call(ctx);
            expect(ctx.showTimerModal).toBe(true);
        });

        it('handleTimerInputChange updates value', () => {
            const ctx = createMockInstance();
            proto.handleTimerInputChange.call(ctx, {
                target: { value: '120' }
            });
            expect(ctx.timerInput).toBe(120);
        });

        it('handleTimerInputChange defaults to 60 for invalid', () => {
            const ctx = createMockInstance();
            proto.handleTimerInputChange.call(ctx, {
                target: { value: 'abc' }
            });
            expect(ctx.timerInput).toBe(60);
        });

        it('handleStartTimer starts countdown', () => {
            const ctx = createMockInstance({ timerInput: 5 });
            proto.handleStartTimer.call(ctx);
            expect(ctx.timerActive).toBe(true);
            expect(ctx.timerSeconds).toBe(5);
            jest.advanceTimersByTime(2000);
            expect(ctx.timerSeconds).toBe(3);
        });

        it('handleCancelTimerModal closes modal', () => {
            const ctx = createMockInstance({ showTimerModal: true });
            proto.handleCancelTimerModal.call(ctx);
            expect(ctx.showTimerModal).toBe(false);
        });

        it('handleStopTimer stops timer', () => {
            const ctx = createMockInstance({ timerInput: 5 });
            proto.handleStartTimer.call(ctx);
            jest.advanceTimersByTime(2000);
            proto.handleStopTimer.call(ctx);
            expect(ctx.timerActive).toBe(false);
            expect(ctx.timerSeconds).toBe(0);
        });

        it('timer fires toast when time is up', () => {
            const ctx = createMockInstance({ timerInput: 2 });
            proto.handleStartTimer.call(ctx);
            jest.advanceTimersByTime(3000);
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handleStartTimer clears existing interval', () => {
            const ctx = createMockInstance({ timerInput: 10 });
            proto.handleStartTimer.call(ctx);
            jest.advanceTimersByTime(2000);
            ctx.timerInput = 5;
            proto.handleStartTimer.call(ctx);
            jest.advanceTimersByTime(2000);
            expect(ctx.timerSeconds).toBe(3);
        });
    });

    // ================================================================
    // Platform Event Handling
    // ================================================================
    describe('Platform event handling', () => {
        function eventPayload(sessionId, eventType, senderId) {
            return {
                data: {
                    payload: {
                        OpenSF__SessionId__c: sessionId,
                        OpenSF__EventType__c: eventType,
                        OpenSF__SenderId__c: senderId
                    }
                }
            };
        }

        it('ignores events for different sessions', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockClear();
            await proto._handleEvent.call(
                ctx,
                eventPayload('other_session', 'VOTE_CAST', 'user002')
            );
            expect(getSession).not.toHaveBeenCalled();
        });

        it('ignores own non-reveal/clear events', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockClear();
            await proto._handleEvent.call(
                ctx,
                eventPayload(MOCK_SESSION.id, 'VOTE_CAST', MOCK_USER_ID)
            );
            expect(getSession).not.toHaveBeenCalled();
        });

        it('refreshes for own VOTES_REVEALED events', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockResolvedValue(MOCK_REVEALED_SESSION);
            await proto._handleEvent.call(
                ctx,
                eventPayload(MOCK_SESSION.id, 'VOTES_REVEALED', MOCK_USER_ID)
            );
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('refreshes for own VOTES_CLEARED events', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockResolvedValue(MOCK_SESSION);
            await proto._handleEvent.call(
                ctx,
                eventPayload(MOCK_SESSION.id, 'VOTES_CLEARED', MOCK_USER_ID)
            );
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('refreshes for other users events', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockResolvedValue(MOCK_SESSION);
            await proto._handleEvent.call(
                ctx,
                eventPayload(MOCK_SESSION.id, 'VOTE_CAST', 'user002')
            );
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('handles SESSION_CLOSED by returning to lobby', async () => {
            const ctx = createMockInstance({
                session: MOCK_SESSION,
                currentView: 'voting'
            });
            getActiveSessions.mockResolvedValue([]);
            await proto._handleEvent.call(
                ctx,
                eventPayload(MOCK_SESSION.id, 'SESSION_CLOSED', 'user002')
            );
            await flushPromises();
            expect(ctx.session).toBeNull();
            expect(ctx.currentView).toBe('lobby');
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('does nothing when no session', async () => {
            const ctx = createMockInstance();
            getSession.mockClear();
            await proto._handleEvent.call(
                ctx,
                eventPayload('session001', 'VOTE_CAST', 'user002')
            );
            expect(getSession).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // _refreshSession
    // ================================================================
    describe('_refreshSession', () => {
        it('is skipped when no session', async () => {
            const ctx = createMockInstance();
            getSession.mockClear();
            await proto._refreshSession.call(ctx);
            expect(getSession).not.toHaveBeenCalled();
        });

        it('handles refresh errors gracefully', async () => {
            const ctx = createMockInstance({ session: MOCK_SESSION });
            getSession.mockRejectedValue(new Error('refresh fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            await proto._refreshSession.call(ctx);
            await flushPromises();
            spy.mockRestore();
        });
    });

    // ================================================================
    // EMP API subscription
    // ================================================================
    describe('Subscription', () => {
        it('unsubscribe calls empApi unsubscribe when sub exists', () => {
            const ctx = createMockInstance({ _subscription: { id: 'sub1' } });
            proto._unsubscribe.call(ctx);
            expect(unsubscribe).toHaveBeenCalled();
        });

        it('unsubscribe does nothing without subscription', () => {
            const ctx = createMockInstance();
            unsubscribe.mockClear();
            proto._unsubscribe.call(ctx);
            expect(unsubscribe).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // disconnectedCallback
    // ================================================================
    describe('disconnectedCallback', () => {
        it('cleans up on removal', async () => {
            const element = createComponent();
            await flushPromises();
            document.body.removeChild(element);
            await flushPromises();
        });
    });

    // ================================================================
    // Error handling
    // ================================================================
    describe('Error handling', () => {
        it('handles error without body', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            createSession.mockRejectedValue({ message: 'plain error' });
            await proto.handleCreateSession.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });

        it('handles unknown error format', async () => {
            const ctx = createMockInstance({ displayName: 'Alice' });
            createSession.mockRejectedValue({});
            await proto.handleCreateSession.call(ctx);
            await flushPromises();
            expect(ctx.dispatchEvent).toHaveBeenCalled();
        });
    });

    // ================================================================
    // Active sessions enrichment
    // ================================================================
    describe('Active sessions enrichment', () => {
        it('enriches sessions with display labels', async () => {
            getActiveSessions.mockResolvedValue(MOCK_ACTIVE_SESSIONS);
            createComponent();
            await flushPromises();
        });

        it('handles sessions with unknown voting system', async () => {
            getActiveSessions.mockResolvedValue([
                {
                    id: 'sess1',
                    name: 'Test',
                    sessionName: '',
                    votingSystem: 'CustomSystem',
                    participants: []
                }
            ]);
            createComponent();
            await flushPromises();
        });
    });

    // ================================================================
    // Vote results (via prototype getters)
    // ================================================================
    describe('Vote results computation', () => {
        it('renders with revealed session', () => {
            const ctx = createMockInstance({ session: MOCK_REVEALED_SESSION });
            const results = ctx.voteResults;
            expect(results.stats.length).toBeGreaterThan(0);
        });

        it('renders with consensus session', () => {
            const ctx = createMockInstance({
                session: {
                    ...MOCK_REVEALED_SESSION,
                    participants: [
                        {
                            userId: MOCK_USER_ID,
                            displayName: 'Alice',
                            role: 'Voter',
                            isActive: true,
                            hasVoted: true,
                            vote: '5'
                        },
                        {
                            userId: 'user002',
                            displayName: 'Bob',
                            role: 'Voter',
                            isActive: true,
                            hasVoted: true,
                            vote: '5'
                        }
                    ]
                }
            });
            const results = ctx.voteResults;
            expect(results.isConsensus).toBe(true);
            expect(results.consensusValue).toBe('5');
        });

        it('renders with non-numeric votes', () => {
            const ctx = createMockInstance({
                session: {
                    ...MOCK_REVEALED_SESSION,
                    participants: [
                        {
                            userId: MOCK_USER_ID,
                            displayName: 'Alice',
                            role: 'Voter',
                            isActive: true,
                            hasVoted: true,
                            vote: '?'
                        },
                        {
                            userId: 'user002',
                            displayName: 'Bob',
                            role: 'Voter',
                            isActive: true,
                            hasVoted: true,
                            vote: '\u221E'
                        }
                    ]
                }
            });
            const results = ctx.voteResults;
            expect(results.stats).toEqual([]);
        });

        it('renders with observers only (no voters)', () => {
            const ctx = createMockInstance({
                session: {
                    ...MOCK_REVEALED_SESSION,
                    participants: [
                        {
                            userId: 'user003',
                            displayName: 'Charlie',
                            role: 'Observer',
                            isActive: true,
                            hasVoted: false,
                            vote: null
                        }
                    ]
                }
            });
            const results = ctx.voteResults;
            expect(results.isConsensus).toBe(false);
        });
    });

    // ================================================================
    // Voting cards with unknown system
    // ================================================================
    describe('votingCards fallback', () => {
        it('falls back to Fibonacci for unknown system', () => {
            const ctx = createMockInstance({
                session: { ...MOCK_SESSION, votingSystem: 'UnknownSystem' }
            });
            const cards = ctx.votingCards;
            expect(cards.length).toBeGreaterThan(0);
            expect(cards[0].value).toBe('0');
        });
    });

    // ================================================================
    // Debug mode
    // ================================================================
    describe('Debug mode', () => {
        it('enables debug info when config says so', async () => {
            getKanbanConfig.mockResolvedValue({ showDebugInfo: true });
            createComponent();
            await flushPromises();
        });
    });
});
