/**
 * Branch coverage tests for dragDropHandler.js
 * Targets uncovered branches: handleDragStart, handleDragEnd, handleDragOver,
 * handleDrop (board and backlog), moveCard, calculateDropPosition, updateDragPlaceholder
 */

// Mock kanbanStore
jest.mock('c/kanbanStore', () => ({
    moveCardAsync: jest.fn(() => () => Promise.resolve({ success: true })),
    addCardsToSprintAsync: jest.fn(
        () => () => Promise.resolve({ success: true })
    ),
    selectors: {
        getActiveSprint: jest.fn(() => ({ Id: 'sprint1' }))
    }
}));

import DragDropHandler from '../../../../force-app/main/default/lwc/kanbanBoard/handlers/dragDropHandler';
import { addCardsToSprintAsync, selectors } from 'c/kanbanStore';

function createMockComponent(overrides = {}) {
    return {
        dragData: null,
        dragPlaceholder: null,
        lastPlaceholderPosition: null,
        columns: [
            {
                Id: 'col1',
                cards: [
                    { Id: 'card1', subject: 'Task 1' },
                    { Id: 'card2', subject: 'Task 2' }
                ]
            },
            {
                Id: 'col2',
                cards: [{ Id: 'card3', subject: 'Task 3' }]
            }
        ],
        store: {
            dispatch: jest.fn(async (action) => {
                if (typeof action === 'function') {
                    return action(
                        () => {},
                        () => ({})
                    );
                }
                return action;
            }),
            getState: jest.fn(() => ({
                activeSprint: { Id: 'sprint1' }
            }))
        },
        requestTracker: {
            trackRequest: jest.fn(() => 'req-1'),
            completeRequest: jest.fn(),
            failRequest: jest.fn()
        },
        operationQueue: {
            enqueue: jest.fn(() => Promise.resolve())
        },
        _clientId: 'client-1',
        loadBoardData: jest.fn(() => Promise.resolve()),
        toastManager: {
            showError: jest.fn()
        },
        subscriptionManager: null,
        template: {
            querySelector: jest.fn()
        },
        ...overrides
    };
}

function createMockEvent(overrides = {}) {
    const dataMap = {};
    return {
        target: {
            dataset: { cardId: 'card1', columnId: 'col1' },
            offsetHeight: 80,
            offsetWidth: 200,
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            cloneNode: jest.fn(() => ({
                style: {},
                classList: { remove: jest.fn() }
            })),
            getBoundingClientRect: jest.fn(() => ({
                left: 10,
                top: 10,
                width: 200,
                height: 80
            }))
        },
        currentTarget: {
            dataset: { columnId: 'col1' },
            querySelectorAll: jest.fn(() => []),
            appendChild: jest.fn(),
            insertBefore: jest.fn()
        },
        dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: jest.fn((key, val) => {
                dataMap[key] = val;
            }),
            getData: jest.fn((key) => dataMap[key] || ''),
            setDragImage: jest.fn()
        },
        clientX: 100,
        clientY: 100,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        ...overrides
    };
}

describe('DragDropHandler', () => {
    let handler;
    let component;

    beforeEach(() => {
        component = createMockComponent();
        handler = new DragDropHandler(component);
        // Mock document.body.appendChild for drag image
        jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('handleDragStart', () => {
        it('sets drag data and creates drag image', () => {
            const event = createMockEvent();
            handler.handleDragStart(event);

            expect(component.dragData).toEqual({
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 80
            });
            expect(event.dataTransfer.effectAllowed).toBe('move');
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'card1'
            );
            expect(document.body.appendChild).toHaveBeenCalled();
        });

        it('calls requestAnimationFrame to add dragging class', () => {
            const rafSpy = jest
                .spyOn(window, 'requestAnimationFrame')
                .mockImplementation((cb) => cb());
            const event = createMockEvent();
            handler.handleDragStart(event);

            expect(event.target.classList.add).toHaveBeenCalledWith('dragging');
            rafSpy.mockRestore();
        });
    });

    describe('handleDragEnd', () => {
        it('cleans up drag state', () => {
            const event = createMockEvent();
            handler.handleDragStart(event);

            component.dragData = { cardId: 'card1', columnId: 'col1' };
            handler.handleDragEnd(event);

            expect(event.target.classList.remove).toHaveBeenCalledWith(
                'dragging'
            );
            expect(component.dragData).toBeNull();
            expect(component.dragPlaceholder).toBeNull();
            expect(component.lastPlaceholderPosition).toBeNull();
        });

        it('removes drag image element if it exists', () => {
            const mockParent = { removeChild: jest.fn() };
            handler._dragImageElement = {
                parentNode: mockParent
            };
            const event = createMockEvent();
            handler.handleDragEnd(event);

            expect(mockParent.removeChild).toHaveBeenCalled();
            expect(handler._dragImageElement).toBeNull();
        });

        it('handles drag image without parent', () => {
            handler._dragImageElement = { parentNode: null };
            const event = createMockEvent();
            handler.handleDragEnd(event);
            expect(handler._dragImageElement).toBeNull();
        });

        it('removes placeholder if it exists', () => {
            const mockParent = { removeChild: jest.fn() };
            component.dragPlaceholder = { parentNode: mockParent };
            const event = createMockEvent();
            handler.handleDragEnd(event);

            expect(mockParent.removeChild).toHaveBeenCalled();
        });

        it('handles placeholder without parent', () => {
            component.dragPlaceholder = { parentNode: null };
            const event = createMockEvent();
            handler.handleDragEnd(event);
            expect(component.dragPlaceholder).toBeNull();
        });
    });

    describe('handleDragOver', () => {
        it('returns early when no dragData', () => {
            component.dragData = null;
            const event = createMockEvent();
            handler.handleDragOver(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('removes placeholder when dragging back to original position', () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 80
            };

            const mockCard = {
                getBoundingClientRect: () => ({
                    top: 0,
                    height: 80
                })
            };
            const mockParent = { removeChild: jest.fn() };
            component.dragPlaceholder = { parentNode: mockParent };

            const event = createMockEvent({
                clientY: 30, // Will be < threshold (0 + 80*0.75 = 60), so position = 0
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [mockCard]),
                    appendChild: jest.fn()
                }
            });

            // card1 is at index 0 in col1, and target position will be 0
            handler.handleDragOver(event);
            // Since sourceIndex (0) === targetPosition (0) and same column,
            // placeholder should be removed
            expect(mockParent.removeChild).toHaveBeenCalled();
        });

        it('updates placeholder when position changes', () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 80
            };
            component.lastPlaceholderPosition = null;

            const event = createMockEvent({
                clientY: 200,
                currentTarget: {
                    dataset: { columnId: 'col2' }, // different column
                    querySelectorAll: jest.fn(() => []),
                    appendChild: jest.fn()
                }
            });

            handler.handleDragOver(event);
            expect(component.lastPlaceholderPosition).toBe('col2-0');
        });

        it('skips update when placeholder position is same', () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 80
            };
            component.lastPlaceholderPosition = 'col2-0';

            const event = createMockEvent({
                clientY: 200,
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => []),
                    appendChild: jest.fn()
                }
            });

            handler.handleDragOver(event);
            // No placeholder update should happen
        });

        it('handles same column drag where source column not found', () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'colX', // not in columns
                cardHeight: 80
            };
            component.columns = [{ Id: 'col1', cards: [{ Id: 'card1' }] }];

            const event = createMockEvent({
                clientY: 200,
                currentTarget: {
                    dataset: { columnId: 'colX' },
                    querySelectorAll: jest.fn(() => []),
                    appendChild: jest.fn()
                }
            });

            handler.handleDragOver(event);
        });
    });

    describe('handleDrop', () => {
        it('handles backlog-to-board drop', async () => {
            const dataMap = {
                source: 'backlog',
                'text/plain': 'bc1'
            };
            const event = createMockEvent({
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn((key) => dataMap[key] || ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(addCardsToSprintAsync).toHaveBeenCalledWith('sprint1', [
                'bc1'
            ]);
        });

        it('handles backlog drop with no active sprint', async () => {
            selectors.getActiveSprint.mockReturnValueOnce(null);
            const dataMap = {
                source: 'backlog',
                'text/plain': 'bc1'
            };
            const event = createMockEvent({
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn((key) => dataMap[key] || ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
            // Should return early, no dispatch
        });

        it('handles backlog drop error', async () => {
            component.store.dispatch.mockRejectedValueOnce(new Error('fail'));
            const consoleSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            const dataMap = {
                source: 'backlog',
                'text/plain': 'bc1'
            };
            const event = createMockEvent({
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn((key) => dataMap[key] || ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
            expect(consoleSpy).toHaveBeenCalled();
            expect(component.toastManager.showError).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('returns early when no dragData for board drop', async () => {
            component.dragData = null;
            const event = createMockEvent({
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn(() => ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
        });

        it('returns early when source column not found', async () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'nonexistent'
            };
            const event = createMockEvent({
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn(() => ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
        });

        it('returns early when dropping at same position', async () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'col1'
            };
            // card1 is at index 0, dropping at position 0 in same column
            const event = createMockEvent({
                clientY: 10,
                currentTarget: {
                    dataset: { columnId: 'col1' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn(() => ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
        });

        it('moves card on valid drop to different column', async () => {
            component.dragData = {
                cardId: 'card1',
                columnId: 'col1'
            };
            const event = createMockEvent({
                clientY: 200,
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => [])
                },
                dataTransfer: {
                    getData: jest.fn(() => ''),
                    setData: jest.fn()
                }
            });

            await handler.handleDrop(event);
            expect(component.requestTracker.trackRequest).toHaveBeenCalled();
            expect(component.operationQueue.enqueue).toHaveBeenCalled();
        });
    });

    describe('moveCard', () => {
        it('enqueues operation and handles success', async () => {
            let executeCallback;
            component.operationQueue.enqueue.mockImplementation((op) => {
                executeCallback = op.execute;
                return Promise.resolve();
            });

            await handler.moveCard('card1', 'col1', 'col2', 0);

            expect(component.operationQueue.enqueue).toHaveBeenCalled();
            expect(executeCallback).toBeDefined();

            // Execute the callback
            await executeCallback();
            expect(component.requestTracker.completeRequest).toHaveBeenCalled();
        });

        it('handles move error with subscription not connected', async () => {
            let executeCallback;
            component.operationQueue.enqueue.mockImplementation((op) => {
                executeCallback = op.execute;
                return Promise.resolve();
            });
            component.subscriptionManager = { isConnected: () => false };
            component.store.dispatch.mockRejectedValueOnce(
                new Error('Move failed')
            );

            await handler.moveCard('card1', 'col1', 'col2', 0);

            expect(executeCallback).toBeDefined();
            await expect(executeCallback()).rejects.toThrow('Move failed');
            expect(component.requestTracker.failRequest).toHaveBeenCalled();
            expect(component.loadBoardData).toHaveBeenCalled();
        });

        it('handles move error with subscription connected', async () => {
            let executeCallback;
            component.operationQueue.enqueue.mockImplementation((op) => {
                executeCallback = op.execute;
                return Promise.resolve();
            });
            component.subscriptionManager = { isConnected: () => true };
            component.store.dispatch.mockRejectedValueOnce(
                new Error('Move failed')
            );

            await handler.moveCard('card1', 'col1', 'col2', 0);

            expect(executeCallback).toBeDefined();
            await expect(executeCallback()).rejects.toThrow('Move failed');
            expect(component.requestTracker.failRequest).toHaveBeenCalled();
            // Should NOT reload board data when subscription is connected
            expect(component.loadBoardData).not.toHaveBeenCalled();
        });

        it('handles enqueue rejection with toast', async () => {
            component.operationQueue.enqueue.mockReturnValue(
                Promise.reject(new Error('Queue error'))
            );

            await handler.moveCard('card1', 'col1', 'col2', 0);
            // The .then(null, errorHandler) should call toastManager
            await Promise.resolve();
            expect(component.toastManager.showError).toHaveBeenCalled();
        });

        it('handles enqueue rejection without toastManager', async () => {
            component.toastManager = null;
            component.operationQueue.enqueue.mockReturnValue(
                Promise.reject(new Error('Queue error'))
            );

            // Should not throw
            await handler.moveCard('card1', 'col1', 'col2', 0);
            await Promise.resolve();
        });
    });

    describe('calculateDropPosition', () => {
        it('returns 0 when no card elements', () => {
            const container = { querySelectorAll: jest.fn(() => []) };
            const event = { clientY: 100 };
            const pos = handler.calculateDropPosition(event, container);
            expect(pos).toBe(0);
        });

        it('returns index when mouse is above threshold', () => {
            const cards = [
                {
                    getBoundingClientRect: () => ({
                        top: 0,
                        height: 80
                    })
                },
                {
                    getBoundingClientRect: () => ({
                        top: 100,
                        height: 80
                    })
                }
            ];
            const container = { querySelectorAll: jest.fn(() => cards) };
            const event = { clientY: 50 }; // Below first card threshold (0 + 60 = 60)

            const pos = handler.calculateDropPosition(event, container);
            expect(pos).toBe(0);
        });

        it('returns length when mouse is below all cards', () => {
            const cards = [
                {
                    getBoundingClientRect: () => ({
                        top: 0,
                        height: 80
                    })
                }
            ];
            const container = { querySelectorAll: jest.fn(() => cards) };
            const event = { clientY: 200 }; // Way below all cards

            const pos = handler.calculateDropPosition(event, container);
            expect(pos).toBe(1);
        });
    });

    describe('updateDragPlaceholder', () => {
        it('creates placeholder when none exists', () => {
            component.dragData = { cardHeight: 80 };
            component.dragPlaceholder = null;
            const container = {
                querySelectorAll: jest.fn(() => []),
                appendChild: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(component.dragPlaceholder).not.toBeNull();
            expect(container.appendChild).toHaveBeenCalled();
        });

        it('reuses existing placeholder', () => {
            const mockParent = { removeChild: jest.fn() };
            component.dragPlaceholder = {
                parentNode: mockParent,
                style: {},
                className: ''
            };
            component.dragData = { cardHeight: 80 };
            const container = {
                querySelectorAll: jest.fn(() => []),
                appendChild: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(mockParent.removeChild).toHaveBeenCalled();
            expect(container.appendChild).toHaveBeenCalled();
        });

        it('inserts before target card when position < length', () => {
            component.dragPlaceholder = null;
            component.dragData = { cardHeight: 80 };
            const mockCard = document.createElement('div');
            const container = {
                querySelectorAll: jest.fn(() => [mockCard]),
                appendChild: jest.fn(),
                insertBefore: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(container.insertBefore).toHaveBeenCalled();
        });

        it('appends at end when position >= length', () => {
            component.dragPlaceholder = null;
            component.dragData = { cardHeight: 80 };
            const container = {
                querySelectorAll: jest.fn(() => []),
                appendChild: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(container.appendChild).toHaveBeenCalled();
        });

        it('uses default height when cardHeight not set', () => {
            component.dragPlaceholder = null;
            component.dragData = {};
            const container = {
                querySelectorAll: jest.fn(() => []),
                appendChild: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(component.dragPlaceholder.style.height).toBe('80px');
        });

        it('handles placeholder without parentNode', () => {
            component.dragPlaceholder = {
                parentNode: null,
                style: {},
                className: ''
            };
            component.dragData = { cardHeight: 100 };
            const container = {
                querySelectorAll: jest.fn(() => []),
                appendChild: jest.fn()
            };

            handler.updateDragPlaceholder(container, 0);
            expect(container.appendChild).toHaveBeenCalled();
        });
    });
});
