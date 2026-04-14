/**
 * Unit tests for EventHandler — platform event processing, echo prevention, sequence numbers
 */

import EventHandler from '../../../kanbanBoard/handlers/eventHandler';

function createMockStore(stateOverrides = {}) {
    const state = {
        boardId: 'board-1',
        columns: [
            {
                Id: 'col1',
                cards: [
                    {
                        Id: 'c1',
                        subject: 'Card 1',
                        columnId: 'col1',
                        sequenceNumber: 5
                    }
                ]
            }
        ],
        ...stateOverrides
    };
    return {
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
        undoManager: { markStale: jest.fn() }
    };
}

function createMockRequestTracker(overrides = {}) {
    return {
        isOwnRequest: jest.fn(() => false),
        isPending: jest.fn(() => false),
        getRequest: jest.fn(() => null),
        completeRequest: jest.fn(),
        hasPendingOperations: jest.fn(() => false),
        ...overrides
    };
}

function buildEvent(overrides = {}) {
    const payload = {
        Id: 'c1',
        subject: 'Card 1',
        columnId: 'col1',
        ...overrides.payload
    };
    return {
        OpenSF__Payload__c: JSON.stringify(payload),
        OpenSF__EventType__c: overrides.eventType || 'update',
        OpenSF__ClientRequestId__c: overrides.clientRequestId || null,
        OpenSF__SequenceNumber__c: overrides.sequenceNumber ?? null,
        ClientId__c: overrides.clientId || null
    };
}

describe('EventHandler', () => {
    let handler;
    let store;
    let tracker;
    let activityCb;

    beforeEach(() => {
        jest.clearAllMocks();
        tracker = createMockRequestTracker();
        activityCb = jest.fn();
        store = createMockStore();
        handler = new EventHandler(tracker, activityCb, 'board-1', 'my-client');
    });

    describe('handlePlatformEvent — basic dispatching', () => {
        it('dispatches UPDATE_CARD for update events', () => {
            const event = buildEvent({
                eventType: 'update',
                payload: { Id: 'c1', subject: 'Updated' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD',
                payload: {
                    cardId: 'c1',
                    updates: expect.objectContaining({ subject: 'Updated' })
                }
            });
        });

        it('dispatches ADD_CARD for create events', () => {
            const event = buildEvent({
                eventType: 'create',
                payload: { Id: 'c-new', columnId: 'col1', subject: 'New' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'ADD_CARD',
                payload: {
                    card: expect.objectContaining({ Id: 'c-new' }),
                    columnId: 'col1'
                }
            });
        });

        it('dispatches DELETE_CARD for delete events', () => {
            const event = buildEvent({
                eventType: 'delete',
                payload: { Id: 'c1' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'DELETE_CARD',
                payload: { cardId: 'c1' }
            });
        });
    });

    describe('echo prevention — clientRequestId', () => {
        it('skips create events from own requests (optimistic)', () => {
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(true);
            tracker.getRequest.mockReturnValue({ cardId: 'c1' });

            const event = buildEvent({
                eventType: 'create',
                clientRequestId: 'req-1',
                payload: { Id: 'c1', subject: 'New' }
            });

            handler.handlePlatformEvent(event, store);

            // Should NOT dispatch ADD_CARD (already added optimistically)
            expect(store.dispatch).not.toHaveBeenCalled();
            expect(tracker.completeRequest).toHaveBeenCalledWith(
                'req-1',
                expect.objectContaining({ Id: 'c1' })
            );
        });

        it('applies update events from own requests', () => {
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(false);

            const event = buildEvent({
                eventType: 'update',
                clientRequestId: 'req-2',
                payload: { Id: 'c1', subject: 'Updated' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'UPDATE_CARD' })
            );
        });
    });

    describe('sequence number filtering', () => {
        it('ignores stale events with lower sequence number', () => {
            // Card has sequenceNumber: 5
            const event = buildEvent({
                eventType: 'update',
                sequenceNumber: 3,
                payload: { Id: 'c1', subject: 'Stale' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('applies events with higher sequence number', () => {
            const event = buildEvent({
                eventType: 'update',
                sequenceNumber: 10,
                payload: { Id: 'c1', subject: 'Fresh' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('applies events when card has no sequence number', () => {
            store = createMockStore({
                columns: [
                    {
                        Id: 'col1',
                        cards: [{ Id: 'c1', sequenceNumber: null }]
                    }
                ]
            });

            const event = buildEvent({
                eventType: 'update',
                sequenceNumber: 1,
                payload: { Id: 'c1', subject: 'First' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('applies events for cards not in state (new cards)', () => {
            const event = buildEvent({
                eventType: 'create',
                sequenceNumber: 1,
                payload: { Id: 'c-new', columnId: 'col1' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('board filtering', () => {
        it('ignores events for other boards', () => {
            const event = buildEvent({
                payload: {
                    Id: 'c-other',
                    boardId: 'other-board',
                    columnId: 'other-col'
                }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('applies events for cards in board columns', () => {
            const event = buildEvent({
                payload: { Id: 'c1', columnId: 'col1' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('applies events matching boardId', () => {
            const event = buildEvent({
                payload: { Id: 'c-new', boardId: 'board-1', columnId: 'col1' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('activity notification', () => {
        it('notifies activity callback for external events', () => {
            const event = buildEvent({
                eventType: 'move',
                payload: { Id: 'c1', subject: 'Moved Card', columnId: 'col1' }
            });

            handler.handlePlatformEvent(event, store);

            expect(activityCb).toHaveBeenCalledWith('Card moved: Moved Card');
        });

        it('does not notify for own requests', () => {
            tracker.isOwnRequest.mockReturnValue(true);

            const event = buildEvent({
                eventType: 'update',
                clientRequestId: 'req-1',
                payload: { Id: 'c1', subject: 'Own' }
            });

            handler.handlePlatformEvent(event, store);

            expect(activityCb).not.toHaveBeenCalled();
        });
    });

    describe('undo stale marking', () => {
        it('marks undo entries stale for external events', () => {
            const event = buildEvent({
                eventType: 'update',
                payload: { Id: 'c1', subject: 'External' }
            });

            handler.handlePlatformEvent(event, store);

            expect(store.undoManager.markStale).toHaveBeenCalledWith('c1');
        });
    });

    describe('duplicate card prevention', () => {
        it('does not add card that already exists in state', () => {
            const event = buildEvent({
                eventType: 'create',
                payload: { Id: 'c1', columnId: 'col1' }
            });

            handler.handlePlatformEvent(event, store);

            // c1 already in col1, so no ADD_CARD dispatch
            expect(store.dispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({ type: 'ADD_CARD' })
            );
        });
    });

    describe('trackChange and deduplication', () => {
        it('tracks change and deduplicates within window', () => {
            handler.trackChange('c1');

            const event = buildEvent({
                eventType: 'update',
                payload: { Id: 'c1', subject: 'Dup' }
            });

            handler.handlePlatformEvent(event, store);

            // Should be ignored as recent change
            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('setters', () => {
        it('setRequestTracker updates tracker', () => {
            const newTracker = createMockRequestTracker();
            handler.setRequestTracker(newTracker);

            expect(handler.requestTracker).toBe(newTracker);
        });

        it('setActivityCallback updates callback', () => {
            const cb = jest.fn();
            handler.setActivityCallback(cb);
            expect(handler.activityCallback).toBe(cb);
        });

        it('setBoardId updates boardId', () => {
            handler.setBoardId('new-board');
            expect(handler.boardId).toBe('new-board');
        });

        it('setClientId updates clientId', () => {
            handler.setClientId('new-client');
            expect(handler.clientId).toBe('new-client');
        });
    });

    describe('error handling', () => {
        it('returns true on parse error (signals refresh needed)', () => {
            const badEvent = {
                OpenSF__Payload__c: 'not-json',
                OpenSF__EventType__c: 'update'
            };

            const result = handler.handlePlatformEvent(badEvent, store);

            expect(result).toBe(true);
        });
    });
});
