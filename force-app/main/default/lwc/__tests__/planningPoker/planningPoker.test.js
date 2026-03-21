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
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

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
        it('isFormValid returns false when displayName is empty', async () => {
            const element = createComponent();
            await flushPromises();
            // displayName empty -> cannot create session
            await element.handleCreateSession();
            await flushPromises();
            expect(createSession).not.toHaveBeenCalled();
        });

        it('isFormValid allows creation when displayName has content', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();
            expect(createSession).toHaveBeenCalled();
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
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'TestUser' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ displayName: 'TestUser' })
            );
        });

        it('handleRoleChange with Voter sets role', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleRoleChange({ target: { value: 'Voter' } });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'Voter' })
            );
        });

        it('handleRoleChange with Observer sets Observer role', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleRoleChange({ target: { value: 'Observer' } });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'Observer' })
            );
        });

        it('handleVotingSystemChange updates voting system', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleVotingSystemChange({
                detail: { value: 'TShirt' }
            });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ votingSystem: 'TShirt' })
            );
        });

        it('handleShowClearChange updates permission', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleShowClearChange({
                detail: { value: 'CreatorOnly' }
            });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    showClearPermission: 'CreatorOnly'
                })
            );
        });

        it('handleSessionNameChange updates session name', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleSessionNameChange({
                target: { value: 'My Session' }
            });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ sessionName: 'My Session' })
            );
        });

        it('handleAutoRevealChange toggles autoReveal', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleAutoRevealChange({ target: { checked: false } });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ autoReveal: false })
            );
        });

        it('handleAllowReactionsChange toggles reactions', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleAllowReactionsChange({
                target: { checked: false }
            });
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            expect(createSession).toHaveBeenCalledWith(
                expect.objectContaining({ allowReactions: false })
            );
        });

        it('toggleAdvancedSettings flips the flag', async () => {
            const element = createComponent();
            await flushPromises();
            element.toggleAdvancedSettings();
            element.toggleAdvancedSettings();
        });

        it('toggleHelp flips the flag', async () => {
            const element = createComponent();
            await flushPromises();
            element.toggleHelp();
            element.toggleHelp();
        });

        it('handleRefreshSessions reloads sessions', async () => {
            const element = createComponent();
            await flushPromises();
            getActiveSessions.mockClear();
            getActiveSessions.mockResolvedValue(MOCK_ACTIVE_SESSIONS);
            element.handleRefreshSessions();
            await flushPromises();
            expect(getActiveSessions).toHaveBeenCalled();
        });

        it('handleShowCreateForm sets isCreatingNew', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleShowCreateForm();
        });

        it('handleSelectSession sets selectedSessionId', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleSelectSession({
                currentTarget: { dataset: { id: 'session001' } }
            });
        });
    });

    // ================================================================
    // Create / Join Session
    // ================================================================
    describe('Session creation and joining', () => {
        it('handleCreateSession creates session and subscribes', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);

            await element.handleCreateSession();
            await flushPromises();

            expect(createSession).toHaveBeenCalled();
            expect(subscribe).toHaveBeenCalled();
        });

        it('handleCreateSession shows error on failure', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockRejectedValue({
                body: { message: 'Create failed' }
            });

            await element.handleCreateSession();
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
        });

        it('handleCreateSession does nothing when form invalid', async () => {
            const element = createComponent();
            await flushPromises();
            await element.handleCreateSession();
            expect(createSession).not.toHaveBeenCalled();
        });

        it('handleJoinSession joins existing session', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Bob' } });
            element.handleSelectSession({
                currentTarget: { dataset: { id: 'session001' } }
            });
            joinSession.mockResolvedValue(MOCK_SESSION);

            await element.handleJoinSession();
            await flushPromises();

            expect(joinSession).toHaveBeenCalledWith(
                expect.objectContaining({ sessionId: 'session001' })
            );
        });

        it('handleJoinSession shows error on failure', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Bob' } });
            element.handleSelectSession({
                currentTarget: { dataset: { id: 'session001' } }
            });
            joinSession.mockRejectedValue({
                body: { message: 'Join failed' }
            });

            await element.handleJoinSession();
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
        });

        it('handleJoinSession does nothing when no session selected', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Bob' } });
            await element.handleJoinSession();
            expect(joinSession).not.toHaveBeenCalled();
        });

        it('handleJoinSession does nothing when form invalid', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleSelectSession({
                currentTarget: { dataset: { id: 'session001' } }
            });
            await element.handleJoinSession();
            expect(joinSession).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // Back to Lobby
    // ================================================================
    describe('handleBackToLobby', () => {
        it('leaves session and returns to lobby', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();

            leaveSession.mockResolvedValue(undefined);
            getActiveSessions.mockClear();
            getActiveSessions.mockResolvedValue([]);

            element.handleBackToLobby();
            await flushPromises();

            expect(leaveSession).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
        });

        it('handles leaveSession error gracefully', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();

            leaveSession.mockRejectedValue(new Error('fail'));
            element.handleBackToLobby();
            await flushPromises();
        });
    });

    // ================================================================
    // Voting Handlers
    // ================================================================
    describe('Voting handlers', () => {
        async function enterVotingSession(element) {
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();
        }

        it('handleCardClick casts a vote', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            castVote.mockResolvedValue(undefined);
            element.handleCardClick({
                currentTarget: { dataset: { value: '5' } }
            });
            await flushPromises();

            expect(castVote).toHaveBeenCalledWith(
                expect.objectContaining({ vote: '5' })
            );
        });

        it('handleCardClick deselects when clicking same card', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            castVote.mockResolvedValue(undefined);
            element.handleCardClick({
                currentTarget: { dataset: { value: '5' } }
            });
            await flushPromises();

            castVote.mockClear();
            element.handleCardClick({
                currentTarget: { dataset: { value: '5' } }
            });
            expect(castVote).not.toHaveBeenCalled();
        });

        it('handleCardClick does nothing when revealed', async () => {
            const element = createComponent();
            await flushPromises();

            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_REVEALED_SESSION);
            await element.handleCreateSession();
            await flushPromises();

            castVote.mockClear();
            element.handleCardClick({
                currentTarget: { dataset: { value: '5' } }
            });
            expect(castVote).not.toHaveBeenCalled();
        });

        it('handleCardClick shows error on castVote failure', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            castVote.mockRejectedValue({
                body: { message: 'Vote error' }
            });
            element.handleCardClick({
                currentTarget: { dataset: { value: '3' } }
            });
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
        });

        it('handleRevealVotes reveals votes', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            revealVotes.mockResolvedValue(MOCK_REVEALED_SESSION);
            await element.handleRevealVotes();
            await flushPromises();

            expect(revealVotes).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
        });

        it('handleRevealVotes shows error on failure', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            revealVotes.mockRejectedValue({
                body: { message: 'Reveal failed' }
            });
            await element.handleRevealVotes();
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
        });

        it('handleRevealVotes does nothing when canShowClear is false', async () => {
            const element = createComponent();
            await flushPromises();
            // No session yet
            await element.handleRevealVotes();
            expect(revealVotes).not.toHaveBeenCalled();
        });

        it('handleClearVotes clears votes', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            const clearedSession = {
                ...MOCK_SESSION,
                participants: MOCK_SESSION.participants.map((p) => ({
                    ...p,
                    hasVoted: false,
                    vote: null
                }))
            };
            clearVotes.mockResolvedValue(clearedSession);

            await element.handleClearVotes();
            await flushPromises();

            expect(clearVotes).toHaveBeenCalledWith({
                sessionId: MOCK_SESSION.id
            });
        });

        it('handleClearVotes shows error on failure', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            clearVotes.mockRejectedValue({
                body: { message: 'Clear failed' }
            });
            await element.handleClearVotes();
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
        });

        it('handleClearVotes does nothing without permission', async () => {
            const element = createComponent();
            await flushPromises();

            const restrictedSession = {
                ...MOCK_SESSION,
                showClearPermission: 'CreatorOnly',
                createdById: 'someoneElse'
            };
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(restrictedSession);
            await element.handleCreateSession();
            await flushPromises();

            await element.handleClearVotes();
            expect(clearVotes).not.toHaveBeenCalled();
        });

        it('handleReaction sends reaction', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            setReaction.mockResolvedValue(undefined);
            getSession.mockResolvedValue(MOCK_SESSION);

            await element.handleReaction({
                currentTarget: { dataset: { value: '\uD83D\uDC4D' } }
            });
            await flushPromises();

            expect(setReaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    reaction: '\uD83D\uDC4D'
                })
            );
        });

        it('handleReaction shows error on failure', async () => {
            const element = createComponent();
            await flushPromises();
            await enterVotingSession(element);

            setReaction.mockRejectedValue({
                body: { message: 'Reaction failed' }
            });

            await element.handleReaction({
                currentTarget: { dataset: { value: '\uD83D\uDC4D' } }
            });
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'error' })
            );
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
            const element = createComponent();
            element.handleSetTimer();
        });

        it('handleTimerInputChange updates value', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: '120' } });
        });

        it('handleTimerInputChange defaults to 60 for invalid', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: 'abc' } });
        });

        it('handleStartTimer starts countdown', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: '5' } });
            element.handleStartTimer();
            jest.advanceTimersByTime(2000);
        });

        it('handleCancelTimerModal closes modal', () => {
            const element = createComponent();
            element.handleSetTimer();
            element.handleCancelTimerModal();
        });

        it('handleStopTimer stops timer', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: '5' } });
            element.handleStartTimer();
            jest.advanceTimersByTime(2000);
            element.handleStopTimer();
        });

        it('timer fires toast when time is up', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: '2' } });
            element.handleStartTimer();
            jest.advanceTimersByTime(3000);

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Timer',
                    variant: 'info'
                })
            );
        });

        it('handleStartTimer clears existing interval', () => {
            const element = createComponent();
            element.handleTimerInputChange({ target: { value: '10' } });
            element.handleStartTimer();
            jest.advanceTimersByTime(2000);
            element.handleTimerInputChange({ target: { value: '5' } });
            element.handleStartTimer();
            jest.advanceTimersByTime(2000);
        });
    });

    // ================================================================
    // Platform Event Handling
    // ================================================================
    describe('Platform event handling', () => {
        async function enterSession(element) {
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();
        }

        it('ignores events for different sessions', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getSession.mockClear();
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: 'other_session',
                        OpenSF__EventType__c: 'VOTE_CAST',
                        OpenSF__SenderId__c: 'user002'
                    }
                }
            });
            expect(getSession).not.toHaveBeenCalled();
        });

        it('ignores own non-reveal/clear events', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getSession.mockClear();
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: MOCK_SESSION.id,
                        OpenSF__EventType__c: 'VOTE_CAST',
                        OpenSF__SenderId__c: MOCK_USER_ID
                    }
                }
            });
            expect(getSession).not.toHaveBeenCalled();
        });

        it('refreshes for own VOTES_REVEALED events', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getSession.mockResolvedValue(MOCK_REVEALED_SESSION);
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: MOCK_SESSION.id,
                        OpenSF__EventType__c: 'VOTES_REVEALED',
                        OpenSF__SenderId__c: MOCK_USER_ID
                    }
                }
            });
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('refreshes for own VOTES_CLEARED events', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getSession.mockResolvedValue(MOCK_SESSION);
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: MOCK_SESSION.id,
                        OpenSF__EventType__c: 'VOTES_CLEARED',
                        OpenSF__SenderId__c: MOCK_USER_ID
                    }
                }
            });
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('refreshes for other users events', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getSession.mockResolvedValue(MOCK_SESSION);
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: MOCK_SESSION.id,
                        OpenSF__EventType__c: 'VOTE_CAST',
                        OpenSF__SenderId__c: 'user002'
                    }
                }
            });
            await flushPromises();
            expect(getSession).toHaveBeenCalled();
        });

        it('handles SESSION_CLOSED by returning to lobby', async () => {
            const element = createComponent();
            await flushPromises();
            await enterSession(element);

            getActiveSessions.mockClear();
            getActiveSessions.mockResolvedValue([]);

            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: MOCK_SESSION.id,
                        OpenSF__EventType__c: 'SESSION_CLOSED',
                        OpenSF__SenderId__c: 'user002'
                    }
                }
            });
            await flushPromises();

            expect(ShowToastEvent).toHaveBeenCalledWith(
                expect.objectContaining({ variant: 'info' })
            );
        });

        it('does nothing when no session', async () => {
            const element = createComponent();
            await flushPromises();

            getSession.mockClear();
            await element._handleEvent({
                data: {
                    payload: {
                        OpenSF__SessionId__c: 'session001',
                        OpenSF__EventType__c: 'VOTE_CAST',
                        OpenSF__SenderId__c: 'user002'
                    }
                }
            });
            expect(getSession).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // _refreshSession
    // ================================================================
    describe('_refreshSession', () => {
        it('is skipped when no session', async () => {
            const element = createComponent();
            await flushPromises();
            getSession.mockClear();
            await element._refreshSession();
            expect(getSession).not.toHaveBeenCalled();
        });

        it('handles refresh errors gracefully', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();

            getSession.mockRejectedValue(new Error('refresh fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            await element._refreshSession();
            await flushPromises();
            spy.mockRestore();
        });
    });

    // ================================================================
    // EMP API subscription
    // ================================================================
    describe('Subscription', () => {
        it('unsubscribe calls empApi unsubscribe when sub exists', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_SESSION);
            await element.handleCreateSession();
            await flushPromises();

            element._unsubscribe();
            expect(unsubscribe).toHaveBeenCalled();
        });

        it('unsubscribe does nothing without subscription', async () => {
            const element = createComponent();
            await flushPromises();
            unsubscribe.mockClear();
            element._unsubscribe();
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
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockRejectedValue({ message: 'plain error' });
            await element.handleCreateSession();
            await flushPromises();
            expect(ShowToastEvent).toHaveBeenCalled();
        });

        it('handles unknown error format', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockRejectedValue({});
            await element.handleCreateSession();
            await flushPromises();
            expect(ShowToastEvent).toHaveBeenCalled();
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
            const sessions = [
                {
                    id: 'sess1',
                    name: 'Test',
                    sessionName: '',
                    votingSystem: 'CustomSystem',
                    participants: []
                }
            ];
            getActiveSessions.mockResolvedValue(sessions);
            createComponent();
            await flushPromises();
        });
    });

    // ================================================================
    // Vote results
    // ================================================================
    describe('Vote results computation', () => {
        it('renders with revealed session', async () => {
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(MOCK_REVEALED_SESSION);
            await element.handleCreateSession();
            await flushPromises();
        });

        it('renders with consensus session', async () => {
            const consensusSession = {
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
            };
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(consensusSession);
            await element.handleCreateSession();
            await flushPromises();
        });

        it('renders with non-numeric votes', async () => {
            const nonNumSession = {
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
            };
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(nonNumSession);
            await element.handleCreateSession();
            await flushPromises();
        });

        it('renders with observers only (no voters)', async () => {
            const noVoterSession = {
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
            };
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(noVoterSession);
            await element.handleCreateSession();
            await flushPromises();
        });
    });

    // ================================================================
    // Voting cards with unknown system
    // ================================================================
    describe('votingCards fallback', () => {
        it('falls back to Fibonacci for unknown system', async () => {
            const unknownVSSession = {
                ...MOCK_SESSION,
                votingSystem: 'UnknownSystem'
            };
            const element = createComponent();
            await flushPromises();
            element.handleDisplayNameChange({ target: { value: 'Alice' } });
            createSession.mockResolvedValue(unknownVSSession);
            await element.handleCreateSession();
            await flushPromises();
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
