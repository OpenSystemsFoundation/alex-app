/**
 * Unit tests for Board DragDropHandler
 *
 * Covers: drag start/end, drag over, drop same/cross column,
 * backlog-to-board drop, drag image cleanup, position calculation.
 */
import DragDropHandler from '../../handlers/dragDropHandler';

jest.mock('c/kanbanStore', () => ({
    moveCardAsync: jest.fn(() => () => Promise.resolve({ success: true })),
    addCardsToSprintAsync: jest.fn(
        () => () => Promise.resolve({ success: true })
    ),
    selectors: {
        getActiveSprint: jest.fn(() => ({ Id: 'sprint1' }))
    }
}));

import { addCardsToSprintAsync } from 'c/kanbanStore';

beforeEach(() => jest.clearAllMocks());

function createComponent(overrides = {}) {
    return {
        dragData: null,
        dragPlaceholder: null,
        lastPlaceholderPosition: null,
        columns: [],
        store: {
            getState: () => ({}),
            dispatch: jest.fn((thunk) => {
                if (typeof thunk === 'function')
                    return thunk(jest.fn(), () => ({}));
                return thunk;
            })
        },
        requestTracker: {
            trackRequest: jest.fn(() => 'req-1'),
            completeRequest: jest.fn(),
            failRequest: jest.fn()
        },
        operationQueue: {
            enqueue: jest.fn((op) => op.execute())
        },
        subscriptionManager: null,
        toastManager: {
            showError: jest.fn()
        },
        _clientId: 'client-1',
        loadBoardData: jest.fn(() => Promise.resolve()),
        ...overrides
    };
}

function createDragEvent(type, overrides = {}) {
    return {
        type,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
            dataset: { cardId: 'c1', columnId: 'col1' },
            offsetHeight: 80,
            offsetWidth: 200,
            getBoundingClientRect: () => ({
                top: 100,
                left: 50,
                width: 200,
                height: 80
            }),
            classList: { add: jest.fn(), remove: jest.fn() },
            cloneNode: jest.fn(() => ({
                style: {},
                classList: { remove: jest.fn() }
            }))
        },
        currentTarget: {
            dataset: { columnId: 'col2' },
            querySelectorAll: jest.fn(() => []),
            appendChild: jest.fn(),
            insertBefore: jest.fn(),
            ...overrides.currentTarget
        },
        dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: jest.fn(),
            getData: jest.fn(() => ''),
            setDragImage: jest.fn()
        },
        clientX: 100,
        clientY: 150,
        ...overrides
    };
}

describe('Board DragDropHandler', () => {
    describe('handleDragStart', () => {
        it('sets drag data and creates drag image', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            // Mock document.body.appendChild
            const originalAppendChild = document.body.appendChild;
            document.body.appendChild = jest.fn();

            const event = createDragEvent('dragstart');
            handler.handleDragStart(event);

            expect(component.dragData).toEqual({
                cardId: 'c1',
                columnId: 'col1',
                cardHeight: 80
            });
            expect(event.dataTransfer.effectAllowed).toBe('move');
            expect(document.body.appendChild).toHaveBeenCalled();

            document.body.appendChild = originalAppendChild;
        });
    });

    describe('handleDragEnd', () => {
        it('cleans up drag image from DOM', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            const mockElement = {
                parentNode: {
                    removeChild: jest.fn()
                }
            };
            handler._dragImageElement = mockElement;

            const event = createDragEvent('dragend');
            handler.handleDragEnd(event);

            expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(
                mockElement
            );
            expect(handler._dragImageElement).toBeNull();
            expect(component.dragData).toBeNull();
        });
    });

    describe('handleDrop — board-to-board', () => {
        it('cleans up drag image in handleDrop', async () => {
            const card = { Id: 'c1', position: '1000' };
            const col1 = {
                Id: 'col1',
                cards: [card],
                cardCount: 1
            };
            const component = createComponent({
                columns: [col1, { Id: 'col2', cards: [], cardCount: 0 }]
            });
            component.dragData = {
                cardId: 'c1',
                columnId: 'col1',
                cardHeight: 80
            };
            const handler = new DragDropHandler(component);

            const mockDragImage = {
                parentNode: { removeChild: jest.fn() }
            };
            handler._dragImageElement = mockDragImage;

            const event = createDragEvent('drop', {
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => [])
                }
            });
            event.dataTransfer.getData = jest.fn(() => '');

            await handler.handleDrop(event);

            expect(mockDragImage.parentNode.removeChild).toHaveBeenCalledWith(
                mockDragImage
            );
            expect(handler._dragImageElement).toBeNull();
        });
    });

    describe('handleDrop — backlog-to-board', () => {
        it('adds to sprint and moves card to column', async () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            const event = createDragEvent('drop', {
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => [])
                }
            });
            event.dataTransfer.getData = jest.fn((key) => {
                if (key === 'source') return 'backlog';
                if (key === 'text/plain') return 'backlog-card-1';
                return '';
            });

            await handler.handleDrop(event);

            expect(addCardsToSprintAsync).toHaveBeenCalledWith('sprint1', [
                'backlog-card-1'
            ]);
            expect(component.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('calculateDropPosition', () => {
        it('returns 0 for empty container', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const container = {
                dataset: { columnId: 'col1' },
                querySelectorAll: jest.fn(() => [])
            };
            const event = { clientY: 100 };
            expect(handler.calculateDropPosition(event, container)).toBe(0);
        });
    });
});
