import DragDropHandler from '../../kanbanBoard/handlers/dragDropHandler';

// Mock kanbanStore
jest.mock('c/kanbanStore', () => ({
    moveCardAsync: jest.fn((cardId, targetColumnId, position) => {
        return async (dispatch) => {
            dispatch({
                type: 'card/moved',
                payload: { cardId, targetColumnId, position }
            });
        };
    })
}));

// Mock component
const createMockComponent = () => ({
    dragData: null,
    dragPlaceholder: null,
    lastPlaceholderPosition: null,
    columns: [
        {
            Id: 'col1',
            cards: [
                { Id: 'card1', OpenSF__Position__c: 'a' },
                { Id: 'card2', OpenSF__Position__c: 'b' }
            ]
        },
        {
            Id: 'col2',
            cards: [{ Id: 'card3', OpenSF__Position__c: 'a' }]
        }
    ],
    store: {
        dispatch: jest.fn()
    },
    requestTracker: {
        trackRequest: jest.fn(),
        isRequestInProgress: jest.fn(() => false)
    },
    operationQueue: {
        enqueue: jest.fn(async (operation) => {
            if (typeof operation === 'function') {
                return operation();
            }
            return undefined;
        })
    },
    eventHandler: {
        trackChange: jest.fn()
    }
});

// Mock event
const createMockDragEvent = (overrides = {}) => ({
    target: {
        dataset: { cardId: 'card1', columnId: 'col1' },
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 200,
            height: 100
        }),
        cloneNode: () => ({
            style: {},
            classList: { remove: jest.fn() }
        }),
        offsetHeight: 100,
        ...overrides.target
    },
    currentTarget: {
        dataset: { columnId: 'col1' },
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        querySelectorAll: jest.fn(() => []),
        children: [],
        ...overrides.currentTarget
    },
    dataTransfer: {
        effectAllowed: '',
        dropEffect: '',
        setData: jest.fn(),
        getData: jest.fn((key) => {
            if (key === 'text/plain') return 'card1';
            if (key === 'columnId') return 'col1';
            return '';
        }),
        setDragImage: jest.fn()
    },
    clientX: 100,
    clientY: 50,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides
});

describe('DragDropHandler', () => {
    let handler;
    let mockComponent;

    beforeEach(() => {
        mockComponent = createMockComponent();
        handler = new DragDropHandler(mockComponent);

        // Mock document.body for drag image
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
        document.body.contains = jest.fn(() => true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with component', () => {
            expect(handler.component).toBe(mockComponent);
        });
    });

    describe('handleDragStart', () => {
        it('should initialize drag state', () => {
            const event = createMockDragEvent();
            handler.handleDragStart(event);

            expect(event.dataTransfer.effectAllowed).toBe('move');
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'card1'
            );
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'columnId',
                'col1'
            );
            expect(event.dataTransfer.setDragImage).toHaveBeenCalled();
            expect(mockComponent.dragData).toEqual({
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 100
            });

            // dragging class is added via requestAnimationFrame
            if (jest.runAllTimers) {
                jest.runAllTimers();
            } else {
                jest.advanceTimersByTime(0);
            }
        });

        it('should create a custom drag image element', () => {
            const event = createMockDragEvent();
            handler.handleDragStart(event);

            expect(document.body.appendChild).toHaveBeenCalled();
            expect(event.dataTransfer.setDragImage).toHaveBeenCalled();
        });
    });

    describe('handleDragEnd', () => {
        it('should remove dragging class', () => {
            const event = createMockDragEvent();
            handler.handleDragEnd(event);

            expect(event.target.classList.remove).toHaveBeenCalledWith(
                'dragging'
            );
        });

        it('should reset component drag state', () => {
            const mockPlaceholder = document.createElement('div');
            const mockParent = document.createElement('div');
            mockParent.appendChild(mockPlaceholder);

            mockComponent.dragData = { cardId: 'card1' };
            mockComponent.dragPlaceholder = mockPlaceholder;
            mockComponent.lastPlaceholderPosition = 'col1-0';

            const event = createMockDragEvent();
            handler.handleDragEnd(event);

            expect(mockComponent.dragData).toBeNull();
            expect(mockComponent.dragPlaceholder).toBeNull();
            expect(mockComponent.lastPlaceholderPosition).toBeNull();
        });
    });

    describe('handleDragOver', () => {
        beforeEach(() => {
            mockComponent.dragData = {
                cardId: 'card1',
                columnId: 'col1',
                cardHeight: 100
            };
        });

        it('should prevent default and set drop effect', () => {
            const event = createMockDragEvent();
            handler.handleDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
        });

        it('should do nothing when no drag data exists', () => {
            mockComponent.dragData = null;
            const event = createMockDragEvent();

            handler.handleDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockComponent.lastPlaceholderPosition).toBeNull();
        });
    });

    describe('handleDrop', () => {
        it('should handle successful drop', async () => {
            mockComponent.dragData = { cardId: 'card1', columnId: 'col1' };
            const event = createMockDragEvent({
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => []),
                    children: []
                }
            });

            await handler.handleDrop(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockComponent.operationQueue.enqueue).toHaveBeenCalled();
        });

        it('should do nothing when no drag data exists', async () => {
            mockComponent.dragData = null;
            const event = createMockDragEvent();

            await handler.handleDrop(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockComponent.operationQueue.enqueue).not.toHaveBeenCalled();
        });
    });
});
