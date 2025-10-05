import EventHandler from '../../../../force-app/main/default/lwc/kanbanBoard/handlers/eventHandler';

// Mock kanbanStore
jest.mock('c/kanbanStore', () => ({
    enrichCardData: jest.fn((card) => ({ ...card, enriched: true }))
}));

// Mock store
const createMockStore = () => ({
    getState: jest.fn(() => ({
        columns: [
            {
                Id: 'col1',
                cards: [{ Id: 'card1', subject: 'Existing Card' }]
            }
        ]
    })),
    dispatch: jest.fn()
});

describe('EventHandler', () => {
    let handler;
    let mockStore;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        handler = new EventHandler();
        mockStore = createMockStore();
        jest.useFakeTimers();

        // Suppress console output for expected error/warning scenarios
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();

        // Restore console methods
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    describe('Constructor', () => {
        it('should initialize with empty recentChanges map', () => {
            expect(handler.recentChanges).toBeInstanceOf(Map);
            expect(handler.recentChanges.size).toBe(0);
        });
    });

    describe('trackChange', () => {
        it('should track card change', () => {
            handler.trackChange('card123');

            expect(handler.recentChanges.has('card123')).toBe(true);
        });

        it('should store timestamp for tracked change', () => {
            const now = Date.now();
            handler.trackChange('card123');

            const timestamp = handler.recentChanges.get('card123');
            expect(timestamp).toBeGreaterThanOrEqual(now);
        });

        it('should remove change after tracking window', () => {
            handler.trackChange('card123');

            expect(handler.recentChanges.has('card123')).toBe(true);

            // Fast-forward past tracking window (2000ms)
            jest.advanceTimersByTime(2100);

            expect(handler.recentChanges.has('card123')).toBe(false);
        });

        it('should track multiple changes independently', () => {
            handler.trackChange('card1');
            handler.trackChange('card2');

            expect(handler.recentChanges.has('card1')).toBe(true);
            expect(handler.recentChanges.has('card2')).toBe(true);
        });
    });

    describe('handlePlatformEvent - Update Event', () => {
        it('should update card on update event', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated Subject',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'UPDATE_CARD'
                })
            );
        });

        it('should handle move event', () => {
            const event = {
                OpenSF__EventType__c: 'move',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Task',
                    columnId: 'col2'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'UPDATE_CARD'
                })
            );
        });

        it('should enrich card before updating', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Task'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            const dispatchCall = mockStore.dispatch.mock.calls[0][0];
            expect(dispatchCall.payload.card.enriched).toBe(true);
        });
    });

    describe('handlePlatformEvent - Create Event', () => {
        it('should add card on create event', () => {
            const event = {
                OpenSF__EventType__c: 'create',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card2',
                    subject: 'New Card',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_CARD',
                    payload: expect.objectContaining({
                        columnId: 'col1'
                    })
                })
            );
        });

        it('should not add card if it already exists', () => {
            const event = {
                OpenSF__EventType__c: 'create',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1', // Already exists in mock store
                    subject: 'Existing Card',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).not.toHaveBeenCalled();
        });

        it('should enrich card before adding', () => {
            const event = {
                OpenSF__EventType__c: 'create',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card2',
                    subject: 'New Card',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            const dispatchCall = mockStore.dispatch.mock.calls[0][0];
            expect(dispatchCall.payload.card.enriched).toBe(true);
        });
    });

    describe('handlePlatformEvent - Delete Event', () => {
        it('should remove card on delete event', () => {
            const event = {
                OpenSF__EventType__c: 'delete',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'REMOVE_CARD',
                    payload: { cardId: 'card1' }
                })
            );
        });
    });

    describe('handlePlatformEvent - Recent Changes', () => {
        it('should ignore recent changes from this window', () => {
            handler.trackChange('card1');

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).not.toHaveBeenCalled();
        });

        it('should process events after tracking window expires', () => {
            handler.trackChange('card1');

            // Advance past tracking window
            jest.advanceTimersByTime(2100);

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalled();
        });
    });

    describe('handlePlatformEvent - Error Handling', () => {
        it('should handle invalid JSON in payload', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: 'invalid json'
            };

            const result = handler.handlePlatformEvent(event, mockStore);

            expect(result).toBe(true); // Signals need for refresh
            expect(mockStore.dispatch).not.toHaveBeenCalled();
        });

        it('should handle unknown event type', () => {
            const event = {
                OpenSF__EventType__c: 'unknown',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    columnId: 'col1'
                })
            };

            // Should not throw and should process silently
            expect(() =>
                handler.handlePlatformEvent(event, mockStore)
            ).not.toThrow();

            // Unknown event types are silently ignored (no dispatch)
            expect(mockStore.dispatch).not.toHaveBeenCalled();
        });

        it('should return false on successful processing', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated',
                    columnId: 'col1'
                })
            };

            const result = handler.handlePlatformEvent(event, mockStore);

            expect(result).toBe(false);
        });

        it('should return true on error', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: 'invalid'
            };

            const result = handler.handlePlatformEvent(event, mockStore);

            expect(result).toBe(true);
        });

        it('should handle missing payload', () => {
            const event = {
                OpenSF__EventType__c: 'update'
                // No payload
            };

            const result = handler.handlePlatformEvent(event, mockStore);

            expect(result).toBe(true);
        });
    });

    describe('Event Type Handling', () => {
        it('should handle case-sensitive event types', () => {
            const event = {
                OpenSF__EventType__c: 'UPDATE', // Wrong case
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            // Should not process due to case mismatch
            expect(mockStore.dispatch).not.toHaveBeenCalled();
        });

        it('should process all valid event types', () => {
            const eventTypes = ['update', 'move', 'create', 'delete'];

            eventTypes.forEach((type) => {
                mockStore.dispatch.mockClear();

                const event = {
                    OpenSF__EventType__c: type,
                    OpenSF__Payload__c: JSON.stringify({
                        Id: 'card2',
                        subject: 'Test',
                        columnId: 'col1'
                    })
                };

                handler.handlePlatformEvent(event, mockStore);

                expect(mockStore.dispatch).toHaveBeenCalled();
            });
        });
    });

    describe('Change Tracking Window', () => {
        it('should use 2 second tracking window', () => {
            handler.trackChange('card1');

            // Just before window expires
            jest.advanceTimersByTime(1999);
            expect(handler.recentChanges.has('card1')).toBe(true);

            // After window expires
            jest.advanceTimersByTime(2);
            expect(handler.recentChanges.has('card1')).toBe(false);
        });

        it('should handle overlapping tracking windows', () => {
            handler.trackChange('card1');
            jest.advanceTimersByTime(1000);
            handler.trackChange('card2');

            // First should be gone
            jest.advanceTimersByTime(1100);
            expect(handler.recentChanges.has('card1')).toBe(false);
            expect(handler.recentChanges.has('card2')).toBe(true);

            // Second should be gone
            jest.advanceTimersByTime(1000);
            expect(handler.recentChanges.has('card2')).toBe(false);
        });
    });

    describe('Sequence Number Validation', () => {
        it('should apply event with higher sequence number', () => {
            const mockStoreWithSeq = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Old Card',
                                    OpenSF__SequenceNumber__c: 5
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 6,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Newer Update',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStoreWithSeq);

            expect(mockStoreWithSeq.dispatch).toHaveBeenCalled();
        });

        it('should ignore event with lower sequence number', () => {
            const consoleLogSpy = jest
                .spyOn(console, 'log')
                .mockImplementation();

            const mockStoreWithSeq = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Current Card',
                                    OpenSF__SequenceNumber__c: 10
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 8,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Stale Update',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStoreWithSeq);

            expect(mockStoreWithSeq.dispatch).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Ignoring stale event')
            );

            consoleLogSpy.mockRestore();
        });

        it('should ignore event with equal sequence number', () => {
            const consoleLogSpy = jest
                .spyOn(console, 'log')
                .mockImplementation();

            const mockStoreWithSeq = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Current Card',
                                    OpenSF__SequenceNumber__c: 7
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 7,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Same Sequence',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStoreWithSeq);

            expect(mockStoreWithSeq.dispatch).not.toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        it('should apply event when card has no sequence number', () => {
            const mockStoreWithoutSeq = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Old Card'
                                    // No OpenSF__SequenceNumber__c
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 5,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Update',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStoreWithoutSeq);

            expect(mockStoreWithoutSeq.dispatch).toHaveBeenCalled();
        });

        it('should apply event when event has no sequence number (backward compatibility)', () => {
            const mockStore = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Card',
                                    sequenceNumber: 5
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'update',
                // No OpenSF__SequenceNumber__c
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Update',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalled();
        });

        it('should apply event for new card (not in state)', () => {
            const mockStore = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: []
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            const event = {
                OpenSF__EventType__c: 'create',
                OpenSF__SequenceNumber__c: 1,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card2',
                    subject: 'New Card',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalled();
        });

        it('should handle out-of-order events correctly', () => {
            const mockStore = {
                getState: jest.fn(() => ({
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Version 2',
                                    OpenSF__SequenceNumber__c: 2
                                }
                            ]
                        }
                    ],
                    boardId: 'board1'
                })),
                dispatch: jest.fn()
            };

            // Event arrives out of order (seq 1, but state is already at seq 2)
            const staleEvent = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 1,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Version 1',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(staleEvent, mockStore);

            // Should be ignored
            expect(mockStore.dispatch).not.toHaveBeenCalled();

            // Now event with seq 3 arrives
            const newerEvent = {
                OpenSF__EventType__c: 'update',
                OpenSF__SequenceNumber__c: 3,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Version 3',
                    columnId: 'col1'
                })
            };

            handler.handlePlatformEvent(newerEvent, mockStore);

            // Should be applied
            expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Multi-Window Coordination with ClientId', () => {
        let mockRequestTracker;
        let windowAHandler;
        let windowBHandler;
        let mockStoreWithBoard;

        beforeEach(() => {
            mockRequestTracker = {
                hasPendingOperations: jest.fn(() => false),
                isOwnRequest: jest.fn(() => false),
                getRequest: jest.fn(() => null),
                isPending: jest.fn(() => false),
                completeRequest: jest.fn()
            };

            // Create mock store with board for multi-window tests
            mockStoreWithBoard = {
                getState: jest.fn(() => ({
                    board: { Id: 'board1' },
                    columns: [
                        {
                            Id: 'col1',
                            cards: [
                                {
                                    Id: 'card1',
                                    subject: 'Existing Card',
                                    sequenceNumber: 1
                                }
                            ]
                        }
                    ]
                })),
                dispatch: jest.fn()
            };

            // Simulate two different browser windows
            windowAHandler = new EventHandler(
                mockRequestTracker,
                null,
                'board1',
                'client-window-A'
            );
            windowBHandler = new EventHandler(
                mockRequestTracker,
                null,
                'board1',
                'client-window-B'
            );
        });

        it('should apply events from other windows without rollback', () => {
            // Window A has no pending operations
            mockRequestTracker.hasPendingOperations.mockReturnValue(false);

            const eventFromWindowB = {
                OpenSF__EventType__c: 'update',
                ClientId__c: 'client-window-B',
                OpenSF__ClientRequestId__c: 'req-123',
                OpenSF__SequenceNumber__c: 2,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated by Window B',
                    columnId: 'col1' // Must match mock store column
                })
            };

            // Window A receives event from Window B
            const result = windowAHandler.handlePlatformEvent(
                eventFromWindowB,
                mockStoreWithBoard
            );

            // Should apply the event normally
            expect(mockStoreWithBoard.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'UPDATE_CARD',
                    payload: expect.objectContaining({
                        cardId: 'card1'
                    })
                })
            );
            // Return value should be false (successfully processed)
            expect(result).toBe(false);
        });

        it('should NOT rollback optimistic updates when event is from different window', () => {
            // Window A has pending operation on card1
            mockRequestTracker.hasPendingOperations.mockReturnValue(true);

            const eventFromWindowB = {
                OpenSF__EventType__c: 'update',
                ClientId__c: 'client-window-B', // Different window
                OpenSF__ClientRequestId__c: 'req-456',
                OpenSF__SequenceNumber__c: 2,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated by Window B',
                    columnId: 'col1'
                })
            };

            // Window A receives event from Window B
            windowAHandler.handlePlatformEvent(
                eventFromWindowB,
                mockStoreWithBoard
            );

            // Should NOT rollback (because clientId doesn't match)
            // Event should still be applied
            expect(mockStoreWithBoard.dispatch).toHaveBeenCalled();
        });

        it('should rollback optimistic updates ONLY when event is from same window', () => {
            // Window A has pending operation on card1
            mockRequestTracker.hasPendingOperations.mockReturnValue(true);

            const eventFromWindowA = {
                OpenSF__EventType__c: 'update',
                ClientId__c: 'client-window-A', // Same window
                OpenSF__ClientRequestId__c: 'req-789',
                OpenSF__SequenceNumber__c: 2,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated by Window A (server confirmed)',
                    columnId: 'col1'
                })
            };

            // Window A receives its own event back (but not tracked as own request)
            const result = windowAHandler.handlePlatformEvent(
                eventFromWindowA,
                mockStoreWithBoard
            );

            // Should trigger rollback logic and apply event
            // Return false means it was processed successfully
            expect(result).toBe(false);
        });

        it('should handle events with null clientId as external changes', () => {
            // Simulate event from record-edit-form or external source (no clientId)
            const externalEvent = {
                OpenSF__EventType__c: 'update',
                ClientId__c: null,
                OpenSF__ClientRequestId__c: null,
                OpenSF__SequenceNumber__c: 2,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Updated externally',
                    columnId: 'col1'
                })
            };

            // Window A has no pending operations
            mockRequestTracker.hasPendingOperations.mockReturnValue(false);

            windowAHandler.handlePlatformEvent(
                externalEvent,
                mockStoreWithBoard
            );

            // Should apply normally
            expect(mockStoreWithBoard.dispatch).toHaveBeenCalled();
        });

        it('should complete own requests regardless of clientId match', () => {
            const requestId = 'req-own-123';
            mockRequestTracker.isOwnRequest.mockReturnValue(true);
            mockRequestTracker.isPending.mockReturnValue(true);
            mockRequestTracker.getRequest.mockReturnValue({
                requestId,
                cardId: 'card1'
            });

            const ownEvent = {
                OpenSF__EventType__c: 'update',
                ClientId__c: 'client-window-A',
                OpenSF__ClientRequestId__c: requestId,
                OpenSF__SequenceNumber__c: 2,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    subject: 'Own update confirmed',
                    columnId: 'col1'
                })
            };

            windowAHandler.handlePlatformEvent(ownEvent, mockStoreWithBoard);

            // Should complete the request
            expect(mockRequestTracker.completeRequest).toHaveBeenCalledWith(
                requestId,
                expect.objectContaining({
                    Id: 'card1'
                })
            );
        });

        it('should allow multiple windows to operate independently', () => {
            // Window A creates card
            mockRequestTracker.isOwnRequest.mockReturnValue(false);
            mockRequestTracker.hasPendingOperations.mockReturnValue(false);

            const createEventFromA = {
                OpenSF__EventType__c: 'create',
                ClientId__c: 'client-window-A',
                OpenSF__ClientRequestId__c: 'create-A',
                OpenSF__SequenceNumber__c: 1,
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card-new-A',
                    subject: 'Created by Window A',
                    columnId: 'col1'
                })
            };

            // Both windows receive the event
            windowAHandler.handlePlatformEvent(
                createEventFromA,
                mockStoreWithBoard
            );
            windowBHandler.handlePlatformEvent(
                createEventFromA,
                mockStoreWithBoard
            );

            // Both should apply it
            expect(mockStoreWithBoard.dispatch).toHaveBeenCalledTimes(2);
        });
    });
});
