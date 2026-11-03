/**
 * Unit tests for EventHandler — platform event processing, echo prevention, sequence numbers
 */

import EventHandler from '../../handlers/eventHandler';

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
        OpenSF__ClientId__c: overrides.clientId || null
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

describe('EventHandler — extended coverage', () => {
    let handler;
    let store;
    let tracker;
    let activityCb;

    beforeEach(() => {
        tracker = createMockRequestTracker();
        activityCb = jest.fn();
        store = createMockStore();
        handler = new EventHandler(tracker, activityCb, 'board-1', 'my-client');
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('constructs with null defaults', () => {
        const h = new EventHandler();
        expect(h.requestTracker).toBeNull();
        expect(h.activityCallback).toBeNull();
        expect(h.boardId).toBeNull();
        expect(h.clientId).toBeNull();
        expect(h.recentChanges.size).toBe(0);
    });

    describe('board filtering', () => {
        it('accepts every event when no board id is known', () => {
            const h = new EventHandler(tracker, activityCb, null, 'my-client');
            const s = createMockStore({ boardId: null });
            const event = buildEvent({
                payload: { Id: 'x', columnId: 'unknown-col' }
            });

            expect(h.handlePlatformEvent(event, s)).toBe(false);
            expect(s.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD',
                payload: { cardId: 'x', updates: expect.any(Object) }
            });
        });

        it('falls back to the handler board id when state has none', () => {
            const s = createMockStore({ boardId: undefined });
            const event = buildEvent({
                payload: { Id: 'x', columnId: undefined, boardId: 'board-1' }
            });
            handler.handlePlatformEvent(event, s);
            expect(s.dispatch).toHaveBeenCalled();
        });

        it('rejects events whose boardId differs and has no column', () => {
            const event = buildEvent({
                payload: { Id: 'c1', columnId: undefined, boardId: 'other' }
            });
            handler.handlePlatformEvent(event, store);
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('accepts events for a card already on the board without a column', () => {
            const event = buildEvent({
                eventType: 'delete',
                payload: { Id: 'c1', columnId: undefined }
            });
            handler.handlePlatformEvent(event, store);
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'DELETE_CARD',
                payload: { cardId: 'c1' }
            });
            expect(activityCb).toHaveBeenCalledWith('Card deleted');
        });

        it('rejects unknown cards without column or board info', () => {
            const s = createMockStore({
                columns: [{ Id: 'col1' }, { Id: 'col2', cards: [] }]
            });
            const event = buildEvent({
                payload: { Id: 'ghost', columnId: undefined }
            });
            handler.handlePlatformEvent(event, s);
            expect(s.dispatch).not.toHaveBeenCalled();
        });

        it('rejects payloads with no identifying fields', () => {
            const event = buildEvent({
                payload: { Id: undefined, columnId: undefined }
            });
            handler.handlePlatformEvent(event, store);
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('handles state without columns', () => {
            const s = createMockStore({ columns: undefined });
            handler.handlePlatformEvent(buildEvent(), s);
            expect(s.dispatch).not.toHaveBeenCalled();

            handler.handlePlatformEvent(
                buildEvent({ payload: { Id: 'c1', columnId: undefined } }),
                s
            );
            expect(s.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('sequence numbers', () => {
        it('skips the sequence check when the payload has no Id', () => {
            const h = new EventHandler(tracker, activityCb, null, null);
            const s = createMockStore({ boardId: null });
            const event = buildEvent({
                eventType: 'create',
                sequenceNumber: 1,
                payload: { Id: undefined, subject: 'Anon', columnId: 'col9' }
            });
            h.handlePlatformEvent(event, s);
            expect(s.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'ADD_CARD' })
            );
        });

        it('ignores events with an equal sequence number', () => {
            const logSpy = jest
                .spyOn(console, 'log')
                .mockImplementation(() => {});
            const event = buildEvent({ sequenceNumber: 5 });
            expect(handler.handlePlatformEvent(event, store)).toBe(false);
            expect(store.dispatch).not.toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith(
                'Ignoring stale event for card c1: seq 5'
            );
            logSpy.mockRestore();
        });

        it('_shouldApplyEvent applies when no sequence is given', () => {
            expect(handler._shouldApplyEvent('c1', null, store)).toBe(true);
            expect(handler._shouldApplyEvent('c1', undefined, store)).toBe(
                true
            );
            expect(store.getState).not.toHaveBeenCalled();
        });

        it('_shouldApplyEvent handles columns without cards and missing columns', () => {
            const s = createMockStore({
                columns: [
                    { Id: 'a' },
                    { Id: 'b', cards: [{ Id: 'c1', sequenceNumber: 2 }] }
                ]
            });
            expect(handler._shouldApplyEvent('c1', 3, s)).toBe(true);
            expect(handler._shouldApplyEvent('c1', 1, s)).toBe(false);

            const empty = createMockStore({ columns: undefined });
            expect(handler._shouldApplyEvent('c1', 1, empty)).toBe(true);
        });
    });

    describe('own requests', () => {
        it('re-keys a pending request to the server card id', () => {
            const request = { cardId: 'temp-1' };
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(true);
            tracker.getRequest.mockReturnValue(request);

            const result = handler.handlePlatformEvent(
                buildEvent({ eventType: 'update', clientRequestId: 'req-9' }),
                store
            );

            expect(result).toBe(false);
            expect(request.cardId).toBe('c1');
            expect(tracker.completeRequest).toHaveBeenCalledWith(
                'req-9',
                expect.objectContaining({ Id: 'c1' })
            );
            expect(store.dispatch).toHaveBeenCalledTimes(1);
            expect(activityCb).not.toHaveBeenCalled();
        });

        it('completes a pending request even when it cannot be looked up', () => {
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(true);
            tracker.getRequest.mockReturnValue(null);

            handler.handlePlatformEvent(
                buildEvent({ eventType: 'move', clientRequestId: 'req-3' }),
                store
            );
            expect(tracker.completeRequest).toHaveBeenCalledWith(
                'req-3',
                expect.any(Object)
            );
        });

        it('completes a pending request for a payload without Id', () => {
            const h = new EventHandler(tracker, activityCb, null, null);
            const s = createMockStore({ boardId: null });
            const request = { cardId: 'keep' };
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(true);
            tracker.getRequest.mockReturnValue(request);

            h.handlePlatformEvent(
                buildEvent({
                    eventType: 'update',
                    clientRequestId: 'req-4',
                    payload: { Id: undefined }
                }),
                s
            );
            expect(request.cardId).toBe('keep');
            expect(tracker.completeRequest).toHaveBeenCalled();
        });

        it('keeps the request card id when it already matches', () => {
            const request = { cardId: 'c1' };
            tracker.isOwnRequest.mockReturnValue(true);
            tracker.isPending.mockReturnValue(true);
            tracker.getRequest.mockReturnValue(request);
            handler.handlePlatformEvent(
                buildEvent({ clientRequestId: 'req-5' }),
                store
            );
            expect(request.cardId).toBe('c1');
        });

        it('treats unknown request ids as external and notifies', () => {
            tracker.isOwnRequest.mockReturnValue(false);
            handler.handlePlatformEvent(
                buildEvent({ eventType: 'update', clientRequestId: 'foreign' }),
                store
            );
            expect(activityCb).toHaveBeenCalledWith('Card updated: Card 1');
            expect(store.dispatch).toHaveBeenCalled();
        });

        it('works without a request tracker', () => {
            const h = new EventHandler(
                null,
                activityCb,
                'board-1',
                'my-client'
            );
            h.handlePlatformEvent(
                buildEvent({ clientRequestId: 'req-1', clientId: 'my-client' }),
                store
            );
            expect(store.dispatch).toHaveBeenCalled();
            expect(activityCb).toHaveBeenCalled();
        });
    });

    describe('same-window pending operations', () => {
        it('defers and then applies once pending operations clear', () => {
            jest.useFakeTimers();
            tracker.hasPendingOperations
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);

            const result = handler.handlePlatformEvent(
                buildEvent({ clientId: 'my-client' }),
                store
            );

            expect(result).toBe(false);
            expect(store.dispatch).not.toHaveBeenCalled();
            jest.advanceTimersByTime(500);
            expect(store.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'UPDATE_CARD' })
            );
            expect(activityCb).not.toHaveBeenCalled();
        });

        it('drops the deferred event if operations are still pending', () => {
            jest.useFakeTimers();
            tracker.hasPendingOperations.mockReturnValue(true);

            handler.handlePlatformEvent(
                buildEvent({ clientId: 'my-client' }),
                store
            );
            jest.advanceTimersByTime(500);

            expect(tracker.hasPendingOperations).toHaveBeenCalledTimes(2);
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('applies own-window events immediately without pending ops', () => {
            handler.handlePlatformEvent(
                buildEvent({ clientId: 'my-client' }),
                store
            );
            expect(tracker.hasPendingOperations).toHaveBeenCalledWith('c1');
            expect(store.dispatch).toHaveBeenCalled();
        });

        it('applies other-window events even with pending ops', () => {
            tracker.hasPendingOperations.mockReturnValue(true);
            handler.handlePlatformEvent(
                buildEvent({ clientId: 'other-client' }),
                store
            );
            expect(tracker.hasPendingOperations).not.toHaveBeenCalled();
            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('recent change tracking', () => {
        it('expires tracked changes after the window', () => {
            jest.useFakeTimers();
            handler.trackChange('c1');
            expect(handler.recentChanges.has('c1')).toBe(true);
            jest.advanceTimersByTime(2000);
            expect(handler.recentChanges.has('c1')).toBe(false);
        });

        it('applies events once a tracked change is older than the window', () => {
            handler.recentChanges.set('c1', Date.now() - 5000);
            expect(handler._isRecentChange('c1')).toBe(false);
            handler.handlePlatformEvent(buildEvent(), store);
            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('activity messages', () => {
        it.each([
            ['create', { subject: 'S' }, 'Card created: S'],
            [
                'update',
                { subject: undefined, Name: 'CARD-7' },
                'Card updated: CARD-7'
            ],
            ['move', { subject: undefined }, 'Card moved: Card'],
            ['delete', {}, 'Card deleted'],
            ['archive', { subject: 'Z' }, 'Card changed: Z']
        ])('builds the %s message', (eventType, payload, expected) => {
            handler._notifyActivity(eventType, payload);
            expect(activityCb).toHaveBeenCalledWith(expected);
        });

        it('does nothing without an activity callback', () => {
            handler.setActivityCallback(null);
            expect(() => handler._notifyActivity('create', {})).not.toThrow();
            expect(activityCb).not.toHaveBeenCalled();
        });
    });

    it('does not dispatch for unknown event types', () => {
        handler.handlePlatformEvent(
            buildEvent({ eventType: 'archive' }),
            store
        );
        expect(store.dispatch).not.toHaveBeenCalled();
        expect(activityCb).toHaveBeenCalledWith('Card changed: Card 1');
        expect(store.undoManager.markStale).toHaveBeenCalledWith('c1');
    });

    it('skips stale marking when the store has no undo manager', () => {
        store.undoManager = null;
        handler.handlePlatformEvent(buildEvent(), store);
        expect(store.dispatch).toHaveBeenCalled();
    });

    it('adds a created card to its column', () => {
        handler.handlePlatformEvent(
            buildEvent({
                eventType: 'create',
                payload: { Id: 'c2', columnId: 'col1', subject: 'New' }
            }),
            store
        );
        expect(store.dispatch).toHaveBeenCalledWith({
            type: 'ADD_CARD',
            payload: {
                card: expect.objectContaining({ Id: 'c2' }),
                columnId: 'col1'
            }
        });
    });
});
