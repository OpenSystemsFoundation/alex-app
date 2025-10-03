import DragDropManager from '../dragDropManager';

// Mock store
const createMockStore = () => ({
    getState: jest.fn(() => ({
        columns: [
            {
                Id: 'col1',
                cards: [
                    { Id: 'card1', position: 'a' },
                    { Id: 'card2', position: 'b' }
                ]
            },
            {
                Id: 'col2',
                cards: [{ Id: 'card3', position: 'a' }]
            }
        ],
        isDragging: false,
        dragSource: null
    })),
    dispatch: jest.fn()
});

// Mock template
const createMockTemplate = () => ({
    querySelectorAll: jest.fn(() => [])
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
        ...overrides.target
    },
    currentTarget: {
        dataset: { columnId: 'col1' },
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        querySelectorAll: () => [],
        ...overrides.currentTarget
    },
    dataTransfer: {
        effectAllowed: '',
        dropEffect: '',
        setData: jest.fn(),
        setDragImage: jest.fn()
    },
    clientX: 100,
    clientY: 50,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides
});

describe('DragDropManager', () => {
    let manager;
    let mockTemplate;
    let mockStore;

    beforeEach(() => {
        mockTemplate = createMockTemplate();
        manager = new DragDropManager(mockTemplate);
        mockStore = createMockStore();

        // Mock document.body for drag image
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
        document.body.contains = jest.fn(() => true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with default values', () => {
            expect(manager.draggedCard).toBeNull();
            expect(manager.dragPlaceholder).toBeNull();
            expect(manager.dropSuccessful).toBe(false);
            expect(manager.template).toBe(mockTemplate);
        });
    });

    describe('handleDragStart', () => {
        it('should initialize drag state', () => {
            const event = createMockDragEvent();
            const result = manager.handleDragStart(event, mockStore);

            expect(result).toBe(true);
            expect(manager.draggedCard.id).toBe('card1');
            expect(event.target.classList.add).toHaveBeenCalledWith('dragging');
            expect(mockStore.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'START_DRAG' })
            );
        });

        it('should handle invalid scenarios', () => {
            mockStore.getState.mockReturnValue({ columns: [] });
            const event = createMockDragEvent();
            expect(manager.handleDragStart(event, mockStore)).toBe(false);
        });
    });

    describe('handleDragEnd', () => {
        it('should remove dragging class', () => {
            const event = createMockDragEvent();
            manager.handleDragEnd(event, mockStore);

            expect(event.target.classList.remove).toHaveBeenCalledWith(
                'dragging'
            );
        });

        it('should dispatch CANCEL_DRAG when drop was not successful', () => {
            const event = createMockDragEvent();
            manager.dropSuccessful = false;
            manager.handleDragEnd(event, mockStore);

            expect(mockStore.dispatch).toHaveBeenCalledWith({
                type: 'CANCEL_DRAG'
            });
        });

        it('should reset manager state', () => {
            const event = createMockDragEvent();
            manager.draggedCard = { id: 'card1' };
            manager.dragPlaceholder = { columnId: 'col1' };

            manager.handleDragEnd(event, mockStore);

            expect(manager.draggedCard).toBeNull();
            expect(manager.dragPlaceholder).toBeNull();
        });
    });

    describe('handleDragOver', () => {
        beforeEach(() => {
            manager.draggedCard = {
                id: 'card1',
                columnId: 'col1',
                element: document.createElement('div')
            };
            mockStore.getState.mockReturnValue({
                columns: [
                    { Id: 'col1', cards: [{ Id: 'card1', position: 'a' }] }
                ],
                isDragging: true,
                dragSource: { columnId: 'col1', cardIndex: 0 }
            });
        });

        it('should handle drag over', () => {
            manager.lastDragUpdate = Date.now() - 100;
            const event = createMockDragEvent();
            manager.handleDragOver(event, mockStore);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
        });
    });

    describe('handleDrop', () => {
        it('should handle successful drop', () => {
            manager.draggedCard = { id: 'card1', columnId: 'col1' };
            manager.dragPlaceholder = { columnId: 'col2', targetIndex: 0 };
            mockStore.getState.mockReturnValue({
                columns: [
                    { Id: 'col1', cards: [{ Id: 'card1' }] },
                    { Id: 'col2', cards: [] }
                ],
                isDragging: true,
                dragSource: { columnId: 'col1', cardIndex: 0 }
            });

            const event = createMockDragEvent();
            const result = manager.handleDrop(event, mockStore);

            expect(result.cardId).toBe('card1');
            expect(result.targetColumnId).toBe('col2');
            expect(mockStore.dispatch).toHaveBeenCalledWith({
                type: 'COMMIT_DRAG'
            });
        });

        it('should handle invalid drop', () => {
            manager.draggedCard = null;
            const result = manager.handleDrop(createMockDragEvent(), mockStore);
            expect(result).toBeNull();
        });
    });

    describe('Utility Methods', () => {
        it('should reset drag state', () => {
            manager.draggedCard = { id: 'card1' };
            manager.dropSuccessful = true;
            manager.reset();

            expect(manager.draggedCard).toBeNull();
            expect(manager.dropSuccessful).toBe(false);
        });

        it('should throttle rapid updates', () => {
            manager.draggedCard = { id: 'card1', columnId: 'col1' };
            manager.lastDragUpdate = Date.now();
            mockStore.getState.mockReturnValue({
                columns: [{ Id: 'col1', cards: [] }],
                isDragging: true
            });

            const result = manager.handleDragOver(
                createMockDragEvent(),
                mockStore
            );
            expect(result).toBeNull(); // Throttled
        });
    });
});
