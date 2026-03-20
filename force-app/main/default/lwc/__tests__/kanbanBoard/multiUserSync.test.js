// Polyfill structuredClone for jsdom/Node environments that lack it
if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

import { createStore } from '../../kanbanStore/kanbanStore';
import EventHandler from '../../kanbanBoard/handlers/eventHandler';
import RequestTracker from '../../kanbanBoard/helpers/requestTracker';

// --- Helpers ---

function createPlatformEvent(
    eventType,
    payload,
    clientRequestId = null,
    sequenceNumber = null,
    clientId = null
) {
    return {
        OpenSF__EventType__c: eventType,
        OpenSF__Payload__c: JSON.stringify(payload),
        OpenSF__ClientRequestId__c: clientRequestId,
        OpenSF__SequenceNumber__c: sequenceNumber,
        ClientId__c: clientId
    };
}

function broadcastEvent(event, handlers) {
    handlers.forEach(({ handler, store }) => {
        handler.handlePlatformEvent(event, store);
    });
}

const BOARD_ID = 'board1';

const INITIAL_COLUMNS = [
    {
        Id: 'col1',
        Name: 'To Do',
        cards: [
            {
                Id: 'card1',
                subject: 'Task 1',
                columnId: 'col1',
                position: '0|a:',
                priority: 'High',
                OpenSF__SequenceNumber__c: 1
            },
            {
                Id: 'card2',
                subject: 'Task 2',
                columnId: 'col1',
                position: '0|b:',
                priority: 'Medium',
                OpenSF__SequenceNumber__c: 1
            }
        ],
        cardCount: 2
    },
    {
        Id: 'col2',
        Name: 'In Progress',
        cards: [
            {
                Id: 'card3',
                subject: 'Task 3',
                columnId: 'col2',
                position: '0|a:',
                priority: 'Low',
                OpenSF__SequenceNumber__c: 1
            }
        ],
        cardCount: 1
    },
    { Id: 'col3', Name: 'Done', cards: [], cardCount: 0 }
];

/**
 * Creates a simulated "window" with its own store, EventHandler, and RequestTracker.
 */
function createWindow(clientId, boardId = BOARD_ID) {
    const store = createStore();
    store.dispatch({ type: 'SET_BOARD', payload: { Id: boardId } });
    store.dispatch({
        type: 'SET_COLUMNS',
        payload: JSON.parse(JSON.stringify(INITIAL_COLUMNS))
    });

    const requestTracker = new RequestTracker(clientId);
    const handler = new EventHandler(requestTracker, null, boardId, clientId);

    return { store, handler, requestTracker, clientId };
}

function findCardInStore(store, cardId) {
    const state = store.getState();
    for (const col of state.columns) {
        const card = col.cards.find((c) => c.Id === cardId);
        if (card) return { card, columnId: col.Id };
    }
    return null;
}

function getColumnCards(store, columnId) {
    const state = store.getState();
    const col = state.columns.find((c) => c.Id === columnId);
    return col ? col.cards : [];
}

function getColumn(store, columnId) {
    const state = store.getState();
    return state.columns.find((c) => c.Id === columnId);
}

// --- Tests ---

describe('Multi-User Realtime Sync', () => {
    let windowA, windowB;
    let allHandlers;
    let consoleLogSpy;

    beforeEach(() => {
        jest.useFakeTimers();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        windowA = createWindow('client-A');
        windowB = createWindow('client-B');
        allHandlers = [
            { handler: windowA.handler, store: windowA.store },
            { handler: windowB.handler, store: windowB.store }
        ];
    });

    afterEach(() => {
        jest.useRealTimers();
        consoleLogSpy.mockRestore();
        windowA.requestTracker.destroy();
        windowB.requestTracker.destroy();
    });

    // ================================================================
    // 1. Basic Multi-User Operations
    // ================================================================
    describe('Basic Multi-User Operations', () => {
        test('User A creates card, User B sees it', () => {
            const newCard = {
                Id: 'card-new',
                subject: 'New Task',
                columnId: 'col1',
                position: '0|c:',
                priority: 'Low',
                OpenSF__SequenceNumber__c: 1
            };

            // User A adds card to their store optimistically
            windowA.store.dispatch({
                type: 'ADD_CARD',
                payload: { card: newCard, columnId: 'col1' }
            });

            // Broadcast create event
            const event = createPlatformEvent('create', newCard, null, 1);
            broadcastEvent(event, allHandlers);

            // User B should now have the card
            const resultB = findCardInStore(windowB.store, 'card-new');
            expect(resultB).not.toBeNull();
            expect(resultB.card.subject).toBe('New Task');
            expect(resultB.columnId).toBe('col1');
        });

        test('User A updates card subject, User B sees it', () => {
            const updatePayload = {
                Id: 'card1',
                subject: 'Updated Task 1',
                columnId: 'col1',
                OpenSF__SequenceNumber__c: 2
            };

            const event = createPlatformEvent('update', updatePayload, null, 2);
            broadcastEvent(event, allHandlers);

            const resultA = findCardInStore(windowA.store, 'card1');
            const resultB = findCardInStore(windowB.store, 'card1');
            expect(resultA.card.subject).toBe('Updated Task 1');
            expect(resultB.card.subject).toBe('Updated Task 1');
        });

        test('User A deletes card, User B sees it removed', () => {
            const deletePayload = { Id: 'card2', columnId: 'col1' };
            const event = createPlatformEvent('delete', deletePayload, null, 2);
            broadcastEvent(event, allHandlers);

            expect(findCardInStore(windowA.store, 'card2')).toBeNull();
            expect(findCardInStore(windowB.store, 'card2')).toBeNull();
        });

        test('User A moves card to different column, User B sees it', () => {
            const movePayload = {
                Id: 'card1',
                columnId: 'col2',
                position: '0|b:',
                OpenSF__SequenceNumber__c: 2
            };

            const event = createPlatformEvent('move', movePayload, null, 2);
            broadcastEvent(event, allHandlers);

            const resultA = findCardInStore(windowA.store, 'card1');
            const resultB = findCardInStore(windowB.store, 'card1');
            expect(resultA.columnId).toBe('col2');
            expect(resultB.columnId).toBe('col2');
        });

        test('User A moves card, column card counts update for User B', () => {
            const movePayload = {
                Id: 'card1',
                columnId: 'col2',
                position: '0|b:',
                OpenSF__SequenceNumber__c: 2
            };

            const event = createPlatformEvent('move', movePayload, null, 2);
            broadcastEvent(event, allHandlers);

            // col1 should have 1 card (card2), col2 should have 2 cards (card3 + card1)
            expect(getColumn(windowB.store, 'col1').cardCount).toBe(1);
            expect(getColumn(windowB.store, 'col2').cardCount).toBe(2);
        });
    });

    // ================================================================
    // 2. Concurrent Operations
    // ================================================================
    describe('Concurrent Operations', () => {
        test('Both users create cards simultaneously, both stores have both cards', () => {
            const cardA = {
                Id: 'card-A',
                subject: 'Card from A',
                columnId: 'col1',
                position: '0|c:',
                priority: 'High',
                OpenSF__SequenceNumber__c: 1
            };
            const cardB = {
                Id: 'card-B',
                subject: 'Card from B',
                columnId: 'col2',
                position: '0|b:',
                priority: 'Medium',
                OpenSF__SequenceNumber__c: 1
            };

            // Both events broadcast
            const eventA = createPlatformEvent('create', cardA, null, 1);
            const eventB = createPlatformEvent('create', cardB, null, 1);
            broadcastEvent(eventA, allHandlers);
            broadcastEvent(eventB, allHandlers);

            // Both stores should have both cards
            expect(findCardInStore(windowA.store, 'card-A')).not.toBeNull();
            expect(findCardInStore(windowA.store, 'card-B')).not.toBeNull();
            expect(findCardInStore(windowB.store, 'card-A')).not.toBeNull();
            expect(findCardInStore(windowB.store, 'card-B')).not.toBeNull();
        });

        test('Both users update same card simultaneously, higher sequence wins', () => {
            // User A updates subject with seq 2
            const updateA = {
                Id: 'card1',
                subject: 'Updated by A',
                columnId: 'col1',
                OpenSF__SequenceNumber__c: 2
            };
            const eventA = createPlatformEvent('update', updateA, null, 2);
            broadcastEvent(eventA, allHandlers);

            // User B updates priority with seq 3 (higher, should win)
            const updateB = {
                Id: 'card1',
                priority: 'Critical',
                columnId: 'col1',
                OpenSF__SequenceNumber__c: 3
            };
            const eventB = createPlatformEvent('update', updateB, null, 3);
            broadcastEvent(eventB, allHandlers);

            const resultA = findCardInStore(windowA.store, 'card1');
            const resultB = findCardInStore(windowB.store, 'card1');
            // seq 3 was applied last, so priority should be Critical
            expect(resultA.card.priority).toBe('Critical');
            expect(resultB.card.priority).toBe('Critical');
        });

        test('User A moves card while User B updates it, both changes apply', () => {
            // User A moves card1 to col2 (seq 2)
            const movePayload = {
                Id: 'card1',
                columnId: 'col2',
                position: '0|b:',
                OpenSF__SequenceNumber__c: 2
            };
            const moveEvent = createPlatformEvent('move', movePayload, null, 2);
            broadcastEvent(moveEvent, allHandlers);

            // User B updates description on card1 (seq 3)
            const updatePayload = {
                Id: 'card1',
                description: 'Updated description',
                columnId: 'col2', // now in col2
                OpenSF__SequenceNumber__c: 3
            };
            const updateEvent = createPlatformEvent(
                'update',
                updatePayload,
                null,
                3
            );
            broadcastEvent(updateEvent, allHandlers);

            // Card should be in col2 with updated description
            const resultA = findCardInStore(windowA.store, 'card1');
            const resultB = findCardInStore(windowB.store, 'card1');
            expect(resultA.columnId).toBe('col2');
            expect(resultA.card.description).toBe('Updated description');
            expect(resultB.columnId).toBe('col2');
            expect(resultB.card.description).toBe('Updated description');
        });

        test('Rapid create and delete of same card converges across stores', () => {
            const newCard = {
                Id: 'card-rapid',
                subject: 'Rapid Card',
                columnId: 'col1',
                position: '0|d:',
                OpenSF__SequenceNumber__c: 1
            };

            // Create then delete
            const createEvent = createPlatformEvent('create', newCard, null, 1);
            broadcastEvent(createEvent, allHandlers);

            expect(findCardInStore(windowA.store, 'card-rapid')).not.toBeNull();
            expect(findCardInStore(windowB.store, 'card-rapid')).not.toBeNull();

            const deleteEvent = createPlatformEvent(
                'delete',
                { Id: 'card-rapid', columnId: 'col1' },
                null,
                2
            );
            broadcastEvent(deleteEvent, allHandlers);

            expect(findCardInStore(windowA.store, 'card-rapid')).toBeNull();
            expect(findCardInStore(windowB.store, 'card-rapid')).toBeNull();
        });
    });

    // ================================================================
    // 3. Echo Prevention
    // ================================================================
    describe('Echo Prevention', () => {
        test('Own events are completed via request tracker and do not duplicate card', () => {
            // Optimistically added card has no sequence number (not yet confirmed by server)
            const optimisticCard = {
                Id: 'card-own',
                subject: 'My Own Card',
                columnId: 'col1',
                position: '0|c:',
                priority: 'Medium'
            };

            // Server-confirmed card comes back with a sequence number
            const confirmedCard = {
                ...optimisticCard,
                OpenSF__SequenceNumber__c: 1
            };

            // User A tracks a create request
            const requestId = windowA.requestTracker.trackRequest(
                'create',
                'card-own'
            );

            // User A adds card optimistically (no seq number)
            windowA.store.dispatch({
                type: 'ADD_CARD',
                payload: { card: optimisticCard, columnId: 'col1' }
            });

            // Platform event returns with the same requestId and a sequence number
            const event = createPlatformEvent(
                'create',
                confirmedCard,
                requestId,
                1,
                'client-A'
            );

            // Only send to User A (the originator)
            windowA.handler.handlePlatformEvent(event, windowA.store);

            // Request should be completed
            expect(windowA.requestTracker.isPending(requestId)).toBe(false);
            const request = windowA.requestTracker.getRequest(requestId);
            expect(request.status).toBe('completed');

            // Card should NOT be duplicated -- still just one instance
            const col1Cards = getColumnCards(windowA.store, 'col1');
            const matchingCards = col1Cards.filter((c) => c.Id === 'card-own');
            expect(matchingCards).toHaveLength(1);
        });

        test('Recent change tracking prevents echo within 2s window', () => {
            // User A tracks a change on card1
            windowA.handler.trackChange('card1');

            // Platform event for card1 arrives (from another user, no requestId)
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Should be ignored by A',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            // User A should NOT have processed this event (echo prevention)
            const result = findCardInStore(windowA.store, 'card1');
            expect(result.card.subject).toBe('Task 1'); // unchanged
        });

        test('Recent change tracking expires after 2s, events are processed', () => {
            windowA.handler.trackChange('card1');

            // Advance past the 2s window
            jest.advanceTimersByTime(2100);

            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Updated after window',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            const result = findCardInStore(windowA.store, 'card1');
            expect(result.card.subject).toBe('Updated after window');
        });

        test('Events from other users are NOT blocked by echo prevention on different cards', () => {
            // User A tracks change on card1
            windowA.handler.trackChange('card1');

            // Event for card2 arrives (different card)
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card2',
                    subject: 'Updated card2',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            // card2 should be updated (not blocked)
            const result = findCardInStore(windowA.store, 'card2');
            expect(result.card.subject).toBe('Updated card2');
        });

        test('Own create request prevents duplicate even if event arrives twice', () => {
            const newCard = {
                Id: 'card-dup',
                subject: 'Duplicate Test',
                columnId: 'col1',
                position: '0|d:',
                OpenSF__SequenceNumber__c: 1
            };

            const requestId = windowA.requestTracker.trackRequest(
                'create',
                'card-dup'
            );

            // Optimistic add
            windowA.store.dispatch({
                type: 'ADD_CARD',
                payload: { card: newCard, columnId: 'col1' }
            });

            // First event arrival (own request)
            const event1 = createPlatformEvent(
                'create',
                newCard,
                requestId,
                1,
                'client-A'
            );
            windowA.handler.handlePlatformEvent(event1, windowA.store);

            // Second event arrival (e.g., redelivery) -- no requestId this time
            const event2 = createPlatformEvent('create', newCard, null, 1);
            windowA.handler.handlePlatformEvent(event2, windowA.store);

            const col1Cards = getColumnCards(windowA.store, 'col1');
            const matchingCards = col1Cards.filter((c) => c.Id === 'card-dup');
            expect(matchingCards).toHaveLength(1);
        });
    });

    // ================================================================
    // 4. Sequence Number Ordering
    // ================================================================
    describe('Sequence Number Ordering', () => {
        test('Stale events are rejected (lower sequence number)', () => {
            // card1 starts at seq 1. First apply a seq 5 update.
            const event5 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 5 Update',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 5
                },
                null,
                5
            );
            windowA.handler.handlePlatformEvent(event5, windowA.store);

            // Now a stale event with seq 3 arrives
            const event3 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Stale Seq 3',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 3
                },
                null,
                3
            );
            windowA.handler.handlePlatformEvent(event3, windowA.store);

            const result = findCardInStore(windowA.store, 'card1');
            expect(result.card.subject).toBe('Seq 5 Update'); // seq 3 was rejected
        });

        test('Events applied in order: seq 3, seq 1, seq 5 -- seq 1 rejected', () => {
            // card1 starts at seq 1
            const event3 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 3',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 3
                },
                null,
                3
            );
            windowA.handler.handlePlatformEvent(event3, windowA.store);
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Seq 3'
            );

            // seq 1 arrives -- should be rejected (card is now at seq 3)
            const event1 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 1 Late',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1
            );
            windowA.handler.handlePlatformEvent(event1, windowA.store);
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Seq 3'
            ); // unchanged

            // seq 5 arrives -- should be applied
            const event5 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 5',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 5
                },
                null,
                5
            );
            windowA.handler.handlePlatformEvent(event5, windowA.store);
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Seq 5'
            );
        });

        test('Events without sequence numbers are always applied (backward compat)', () => {
            // First apply a high-seq update
            const event10 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 10',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 10
                },
                null,
                10
            );
            windowA.handler.handlePlatformEvent(event10, windowA.store);

            // Now an event without sequence number
            const eventNoSeq = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'No Seq Update',
                    columnId: 'col1'
                },
                null,
                null
            );
            windowA.handler.handlePlatformEvent(eventNoSeq, windowA.store);

            const result = findCardInStore(windowA.store, 'card1');
            expect(result.card.subject).toBe('No Seq Update');
        });

        test('Sequence numbers work correctly across both windows', () => {
            const event2 = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Seq 2 Both',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );
            broadcastEvent(event2, allHandlers);

            // Stale event broadcast
            const eventStale = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Stale for Both',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1
            );
            broadcastEvent(eventStale, allHandlers);

            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Seq 2 Both'
            );
            expect(findCardInStore(windowB.store, 'card1').card.subject).toBe(
                'Seq 2 Both'
            );
        });
    });

    // ================================================================
    // 5. Board Isolation
    // ================================================================
    describe('Board Isolation', () => {
        test('Events for columns not in this board are ignored', () => {
            const event = createPlatformEvent(
                'create',
                {
                    Id: 'card-other',
                    subject: 'Other Board Card',
                    columnId: 'other-col',
                    position: '0|a:',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);
            windowB.handler.handlePlatformEvent(event, windowB.store);

            expect(findCardInStore(windowA.store, 'card-other')).toBeNull();
            expect(findCardInStore(windowB.store, 'card-other')).toBeNull();
        });

        test('Events with matching boardId are accepted', () => {
            const event = createPlatformEvent(
                'create',
                {
                    Id: 'card-board-match',
                    subject: 'Board Match',
                    columnId: 'col1',
                    boardId: BOARD_ID,
                    position: '0|d:',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1
            );

            broadcastEvent(event, allHandlers);

            expect(
                findCardInStore(windowA.store, 'card-board-match')
            ).not.toBeNull();
            expect(
                findCardInStore(windowB.store, 'card-board-match')
            ).not.toBeNull();
        });

        test('Events with non-matching boardId are ignored', () => {
            const event = createPlatformEvent(
                'create',
                {
                    Id: 'card-wrong-board',
                    subject: 'Wrong Board',
                    boardId: 'other-board-id',
                    position: '0|a:',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1
            );

            broadcastEvent(event, allHandlers);

            expect(
                findCardInStore(windowA.store, 'card-wrong-board')
            ).toBeNull();
            expect(
                findCardInStore(windowB.store, 'card-wrong-board')
            ).toBeNull();
        });

        test('Update events for cards existing in this board are accepted without columnId', () => {
            // card1 already exists in both stores, update without specifying columnId
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Updated Without ColumnId',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );

            broadcastEvent(event, allHandlers);

            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Updated Without ColumnId'
            );
            expect(findCardInStore(windowB.store, 'card1').card.subject).toBe(
                'Updated Without ColumnId'
            );
        });
    });

    // ================================================================
    // 6. Multi-Window Same User
    // ================================================================
    describe('Multi-Window Same User', () => {
        test("Two windows of same user see each other's changes", () => {
            // Both windows belong to "user1" but have different clientIds
            const win1 = createWindow('user1-window1');
            const win2 = createWindow('user1-window2');

            const bothHandlers = [
                { handler: win1.handler, store: win1.store },
                { handler: win2.handler, store: win2.store }
            ];

            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Changed in Window 1',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2,
                'user1-window1'
            );

            broadcastEvent(event, bothHandlers);

            expect(findCardInStore(win1.store, 'card1').card.subject).toBe(
                'Changed in Window 1'
            );
            expect(findCardInStore(win2.store, 'card1').card.subject).toBe(
                'Changed in Window 1'
            );

            win1.requestTracker.destroy();
            win2.requestTracker.destroy();
        });

        test('Own window events are deferred when pending operations exist', () => {
            // User A has a pending operation on card1
            windowA.requestTracker.trackRequest('update', 'card1');

            // Event from same window (matching clientId) arrives
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Deferred Update',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2,
                'client-A'
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            // Should NOT be applied immediately (deferred via setTimeout)
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Task 1'
            );
        });

        test('Events from other windows are applied immediately even with pending ops', () => {
            // User A has a pending operation on card1
            windowA.requestTracker.trackRequest('update', 'card1');

            // Event from a DIFFERENT window (client-B) for card1
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'From Other Window',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2,
                'client-B'
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            // Should be applied immediately (different clientId)
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'From Other Window'
            );
        });

        test('Deferred event is applied after pending operation completes', () => {
            const requestId = windowA.requestTracker.trackRequest(
                'update',
                'card1'
            );

            // Event from same window arrives while pending
            const event = createPlatformEvent(
                'update',
                {
                    Id: 'card1',
                    subject: 'Deferred Then Applied',
                    columnId: 'col1',
                    OpenSF__SequenceNumber__c: 3
                },
                null,
                3,
                'client-A'
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            // Not applied yet
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Task 1'
            );

            // Complete the pending operation
            windowA.requestTracker.completeRequest(requestId);

            // Advance timer past the 500ms deferral
            jest.advanceTimersByTime(600);

            // Now it should be applied
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Deferred Then Applied'
            );
        });
    });

    // ================================================================
    // 7. Store State Consistency
    // ================================================================
    describe('Store State Consistency', () => {
        test('Card counts stay accurate after creates', () => {
            const newCards = ['card-x1', 'card-x2', 'card-x3'];
            newCards.forEach((id, i) => {
                const event = createPlatformEvent(
                    'create',
                    {
                        Id: id,
                        subject: `Card ${id}`,
                        columnId: 'col1',
                        position: `0|${String.fromCharCode(100 + i)}:`,
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                );
                broadcastEvent(event, allHandlers);
            });

            const col1A = getColumn(windowA.store, 'col1');
            const col1B = getColumn(windowB.store, 'col1');
            expect(col1A.cardCount).toBe(col1A.cards.length);
            expect(col1B.cardCount).toBe(col1B.cards.length);
            expect(col1A.cardCount).toBe(5); // 2 original + 3 new
        });

        test('Card counts stay accurate after deletes', () => {
            // Delete card1 and card2 from col1
            ['card1', 'card2'].forEach((id) => {
                const event = createPlatformEvent(
                    'delete',
                    { Id: id, columnId: 'col1' },
                    null,
                    2
                );
                broadcastEvent(event, allHandlers);
            });

            const col1A = getColumn(windowA.store, 'col1');
            expect(col1A.cardCount).toBe(0);
            expect(col1A.cards).toHaveLength(0);
        });

        test('Card counts stay accurate after moves', () => {
            // Move card1 from col1 to col3
            const moveEvent = createPlatformEvent(
                'move',
                {
                    Id: 'card1',
                    columnId: 'col3',
                    position: '0|a:',
                    OpenSF__SequenceNumber__c: 2
                },
                null,
                2
            );
            broadcastEvent(moveEvent, allHandlers);

            const col1 = getColumn(windowA.store, 'col1');
            const col3 = getColumn(windowA.store, 'col3');
            expect(col1.cardCount).toBe(col1.cards.length);
            expect(col3.cardCount).toBe(col3.cards.length);
            expect(col1.cardCount).toBe(1); // card2 remains
            expect(col3.cardCount).toBe(1); // card1 moved here
        });

        test('Multiple rapid operations converge to consistent state', () => {
            // 1. Create card-r1 in col1
            broadcastEvent(
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-r1',
                        subject: 'Rapid 1',
                        columnId: 'col1',
                        position: '0|d:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                allHandlers
            );

            // 2. Create card-r2 in col2
            broadcastEvent(
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-r2',
                        subject: 'Rapid 2',
                        columnId: 'col2',
                        position: '0|b:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                allHandlers
            );

            // 3. Update card1 subject
            broadcastEvent(
                createPlatformEvent(
                    'update',
                    {
                        Id: 'card1',
                        subject: 'Rapid Update',
                        columnId: 'col1',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 4. Move card2 to col2
            broadcastEvent(
                createPlatformEvent(
                    'move',
                    {
                        Id: 'card2',
                        columnId: 'col2',
                        position: '0|c:',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 5. Delete card3
            broadcastEvent(
                createPlatformEvent(
                    'delete',
                    {
                        Id: 'card3',
                        columnId: 'col2'
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 6. Create card-r3 in col3
            broadcastEvent(
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-r3',
                        subject: 'Rapid 3',
                        columnId: 'col3',
                        position: '0|a:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                allHandlers
            );

            // 7. Update card-r1 priority
            broadcastEvent(
                createPlatformEvent(
                    'update',
                    {
                        Id: 'card-r1',
                        priority: 'Critical',
                        columnId: 'col1',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 8. Move card-r2 to col3
            broadcastEvent(
                createPlatformEvent(
                    'move',
                    {
                        Id: 'card-r2',
                        columnId: 'col3',
                        position: '0|b:',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 9. Update card-r3 subject
            broadcastEvent(
                createPlatformEvent(
                    'update',
                    {
                        Id: 'card-r3',
                        subject: 'Rapid 3 Updated',
                        columnId: 'col3',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // 10. Delete card-r1
            broadcastEvent(
                createPlatformEvent(
                    'delete',
                    {
                        Id: 'card-r1',
                        columnId: 'col1'
                    },
                    null,
                    3
                ),
                allHandlers
            );

            // Verify final state is consistent between both stores
            const verifyStore = (store) => {
                const state = store.getState();
                state.columns.forEach((col) => {
                    expect(col.cardCount).toBe(col.cards.length);
                });

                // col1: card1 (updated subject)
                const col1 = getColumn(store, 'col1');
                expect(col1.cards).toHaveLength(1);
                expect(col1.cards[0].Id).toBe('card1');
                expect(col1.cards[0].subject).toBe('Rapid Update');

                // col2: card2 (moved here)
                const col2 = getColumn(store, 'col2');
                expect(col2.cards).toHaveLength(1);
                expect(col2.cards[0].Id).toBe('card2');

                // col3: card-r2 (moved), card-r3 (created + updated)
                const col3 = getColumn(store, 'col3');
                expect(col3.cards).toHaveLength(2);
                const cardR3 = col3.cards.find((c) => c.Id === 'card-r3');
                expect(cardR3.subject).toBe('Rapid 3 Updated');

                // Deleted cards should not exist
                expect(findCardInStore(store, 'card3')).toBeNull();
                expect(findCardInStore(store, 'card-r1')).toBeNull();
            };

            verifyStore(windowA.store, 'Window A');
            verifyStore(windowB.store, 'Window B');
        });

        test('Total card count is consistent after mixed operations', () => {
            // Start: 3 cards total (card1, card2, card3)
            // Create 2
            broadcastEvent(
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-n1',
                        subject: 'New 1',
                        columnId: 'col1',
                        position: '0|c:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                allHandlers
            );
            broadcastEvent(
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-n2',
                        subject: 'New 2',
                        columnId: 'col2',
                        position: '0|b:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                allHandlers
            );

            // Delete 1
            broadcastEvent(
                createPlatformEvent(
                    'delete',
                    {
                        Id: 'card2',
                        columnId: 'col1'
                    },
                    null,
                    2
                ),
                allHandlers
            );

            // Final: 4 cards (card1, card3, card-n1, card-n2)
            const totalA = windowA.store.getTotalCardCount();
            const totalB = windowB.store.getTotalCardCount();
            expect(totalA).toBe(4);
            expect(totalB).toBe(4);
        });

        test('Both stores converge to identical state after same sequence of events', () => {
            const events = [
                createPlatformEvent(
                    'update',
                    {
                        Id: 'card1',
                        subject: 'Final 1',
                        columnId: 'col1',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                createPlatformEvent(
                    'move',
                    {
                        Id: 'card2',
                        columnId: 'col3',
                        position: '0|a:',
                        OpenSF__SequenceNumber__c: 2
                    },
                    null,
                    2
                ),
                createPlatformEvent(
                    'create',
                    {
                        Id: 'card-conv',
                        subject: 'Convergence',
                        columnId: 'col2',
                        position: '0|b:',
                        OpenSF__SequenceNumber__c: 1
                    },
                    null,
                    1
                ),
                createPlatformEvent(
                    'delete',
                    { Id: 'card3', columnId: 'col2' },
                    null,
                    2
                )
            ];

            events.forEach((event) => broadcastEvent(event, allHandlers));

            const stateA = windowA.store.getState();
            const stateB = windowB.store.getState();

            // Compare column-by-column
            stateA.columns.forEach((colA, i) => {
                const colB = stateB.columns[i];
                expect(colA.Id).toBe(colB.Id);
                expect(colA.cardCount).toBe(colB.cardCount);
                expect(colA.cards.length).toBe(colB.cards.length);
                colA.cards.forEach((cardA, j) => {
                    expect(cardA.Id).toBe(colB.cards[j].Id);
                    expect(cardA.subject).toBe(colB.cards[j].subject);
                });
            });
        });
    });

    // ================================================================
    // Additional Edge Cases
    // ================================================================
    describe('Edge Cases', () => {
        test('Activity callback is called for events from other users', () => {
            const activityMessages = [];
            windowA.handler.setActivityCallback((msg) =>
                activityMessages.push(msg)
            );

            const event = createPlatformEvent(
                'create',
                {
                    Id: 'card-activity',
                    OpenSF__Subject__c: 'Activity Card',
                    columnId: 'col1',
                    position: '0|d:',
                    OpenSF__SequenceNumber__c: 1
                },
                null,
                1,
                'client-B'
            );

            windowA.handler.handlePlatformEvent(event, windowA.store);

            expect(activityMessages).toHaveLength(1);
            expect(activityMessages[0]).toContain('Activity Card');
        });

        test('Malformed event payload does not crash handler', () => {
            const badEvent = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: 'not valid json',
                OpenSF__ClientRequestId__c: null,
                OpenSF__SequenceNumber__c: null,
                ClientId__c: null
            };

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation();

            // Should not throw
            expect(() => {
                windowA.handler.handlePlatformEvent(badEvent, windowA.store);
            }).not.toThrow();

            // Store should be unchanged
            expect(findCardInStore(windowA.store, 'card1').card.subject).toBe(
                'Task 1'
            );
            consoleErrorSpy.mockRestore();
        });

        test('Delete of non-existent card is handled gracefully', () => {
            const event = createPlatformEvent(
                'delete',
                {
                    Id: 'card-nonexistent',
                    columnId: 'col1'
                },
                null,
                1
            );

            expect(() => {
                broadcastEvent(event, allHandlers);
            }).not.toThrow();

            // All cards still present
            expect(findCardInStore(windowA.store, 'card1')).not.toBeNull();
            expect(findCardInStore(windowA.store, 'card2')).not.toBeNull();
            expect(findCardInStore(windowA.store, 'card3')).not.toBeNull();
        });

        test('Creating the same card twice does not duplicate', () => {
            const card = {
                Id: 'card-once',
                subject: 'Once Only',
                columnId: 'col1',
                position: '0|e:',
                OpenSF__SequenceNumber__c: 1
            };

            const event = createPlatformEvent('create', card, null, 1);
            broadcastEvent(event, allHandlers);
            broadcastEvent(event, allHandlers); // Second broadcast

            const col1Cards = getColumnCards(windowA.store, 'col1');
            const matches = col1Cards.filter((c) => c.Id === 'card-once');
            expect(matches).toHaveLength(1);
        });
    });
});
