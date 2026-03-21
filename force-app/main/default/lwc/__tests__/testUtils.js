/**
 * Shared test utilities for LWC unit tests
 * Contains common mock data, helper functions, and test setup utilities
 */

// ===================================
// Mock Data Factories
// ===================================

export const createMockBoard = (overrides = {}) => ({
    Id: 'a00xx000000001',
    Name: 'Test Board',
    description: 'Test board description',
    active: true,
    ...overrides
});

export const createMockColumn = (overrides = {}) => ({
    Id: `col${Math.random().toString(36).substr(2, 9)}`,
    Name: 'Test Column',
    position: 'a',
    boardId: 'a00xx000000001',
    color: '#4285F4',
    cards: [],
    cardCount: 0,
    ...overrides
});

export const createMockCard = (overrides = {}) => ({
    Id: `card${Math.random().toString(36).substr(2, 9)}`,
    Name: 'Test Card',
    subject: 'Test Subject',
    description: 'Test Description',
    columnId: 'col1',
    position: 'a',
    priority: 'Medium',
    status: 'New',
    cardType: 'Feature',
    storyPoints: 3,
    ...overrides
});

export const createMockBoardData = (numColumns = 3, cardsPerColumn = 2) => {
    const board = createMockBoard();
    const columns = Array.from({ length: numColumns }, (_, i) =>
        createMockColumn({
            Id: `col${i + 1}`,
            Name: `Column ${i + 1}`,
            position: String.fromCharCode(97 + i) // a, b, c...
        })
    );

    const cards = columns.flatMap((column, colIndex) =>
        Array.from({ length: cardsPerColumn }, (_, cardIndex) =>
            createMockCard({
                Id: `card${colIndex}_${cardIndex}`,
                Name: `Card ${colIndex + 1}-${cardIndex + 1}`,
                columnId: column.Id,
                position: String.fromCharCode(97 + cardIndex)
            })
        )
    );

    return { board, columns, cards };
};

// ===================================
// Mock Store Factory
// ===================================

export const createMockStore = (initialState = {}) => {
    const state = {
        board: null,
        columns: [],
        dragState: {
            isDragging: false,
            draggedCardId: null,
            sourceColumnId: null
        },
        ...initialState
    };

    const subscribers = [];

    return {
        getState: jest.fn(() => state),
        setState: jest.fn((newState) => {
            Object.assign(state, newState);
            subscribers.forEach((sub) => sub(state));
        }),
        dispatch: jest.fn((action) => {
            // Simple action handler for testing
            switch (action.type) {
                case 'SET_BOARD':
                    state.board = action.payload;
                    break;
                case 'SET_COLUMNS':
                    state.columns = action.payload;
                    break;
                case 'ADD_CARD': {
                    const column = state.columns.find(
                        (c) => c.Id === action.payload.columnId
                    );
                    if (column) column.cards.push(action.payload.card);
                    break;
                }
                case 'DELETE_CARD':
                    state.columns.forEach((col) => {
                        col.cards = col.cards.filter(
                            (c) => c.Id !== action.payload.cardId
                        );
                    });
                    break;
                default:
                    break;
            }
            subscribers.forEach((sub) => sub(state));
        }),
        subscribe: jest.fn((callback) => {
            subscribers.push(callback);
            return jest.fn(() => {
                const index = subscribers.indexOf(callback);
                if (index > -1) subscribers.splice(index, 1);
            });
        }),
        getColumns: jest.fn(() => state.columns),
        getBoard: jest.fn(() => state.board)
    };
};

// ===================================
// DOM Testing Utilities
// ===================================

export const flushPromises = () =>
    new Promise((resolve) => Promise.resolve().then(resolve));

export const waitFor = (condition, timeout = 1000) => {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(check, 50);
            }
        };
        check();
    });
};

export const queryElement = (element, selector) => {
    return element.shadowRoot
        ? element.shadowRoot.querySelector(selector)
        : element.querySelector(selector);
};

export const queryAllElements = (element, selector) => {
    return element.shadowRoot
        ? element.shadowRoot.querySelectorAll(selector)
        : element.querySelectorAll(selector);
};

// ===================================
// Event Testing Utilities
// ===================================

export const dispatchCustomEvent = (element, eventName, detail = {}) => {
    element.dispatchEvent(
        new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true
        })
    );
};

export const createDragEvent = (type, dataTransfer = {}) => {
    const event = new CustomEvent(type, { bubbles: true, cancelable: true });
    event.dataTransfer = {
        setData: jest.fn(),
        getData: jest.fn(),
        effectAllowed: '',
        dropEffect: '',
        ...dataTransfer
    };
    return event;
};

export const simulateDragAndDrop = (source, target) => {
    const dragStartEvent = createDragEvent('dragstart');
    const dragOverEvent = createDragEvent('dragover');
    const dropEvent = createDragEvent('drop');

    source.dispatchEvent(dragStartEvent);
    target.dispatchEvent(dragOverEvent);
    target.dispatchEvent(dropEvent);

    return { dragStartEvent, dragOverEvent, dropEvent };
};

// ===================================
// Assertion Helpers
// ===================================

export const expectEventDispatched = (element, eventName) => {
    const handler = jest.fn();
    element.addEventListener(eventName, handler);
    return {
        toBeCalled: () => expect(handler).toHaveBeenCalled(),
        toBeCalledWith: (expectedDetail) => {
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining(expectedDetail)
                })
            );
        },
        toBeCalledTimes: (times) => expect(handler).toHaveBeenCalledTimes(times)
    };
};

export const expectToastShown = (element) => {
    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);
    return handler;
};

// ===================================
// Mock Implementations
// ===================================

export const mockApexSuccess = (data) => Promise.resolve(data);

export const mockApexError = (message = 'Apex Error') =>
    Promise.reject({
        body: { message },
        message
    });

export const createMockWireAdapter = (data, error = null) => {
    return jest.fn(() => {
        return {
            subscribe: (callback) => {
                callback({ data, error });
                return () => {}; // Unsubscribe function
            }
        };
    });
};

// ===================================
// Console Utilities
// ===================================

export const suppressConsole = () => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    beforeEach(() => {
        console.error = jest.fn();
        console.warn = jest.fn();
        console.log = jest.fn();
    });

    afterEach(() => {
        console.error = originalError;
        console.warn = originalWarn;
        console.log = originalLog;
    });

    return {
        expectError: () => expect(console.error).toHaveBeenCalled(),
        expectWarn: () => expect(console.warn).toHaveBeenCalled(),
        expectLog: () => expect(console.log).toHaveBeenCalled()
    };
};

export const withMockedConsole = (testFn) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
        return testFn({ errorSpy, warnSpy, logSpy });
    } finally {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        logSpy.mockRestore();
    }
};

// ===================================
// Test Data Builders
// ===================================

export class BoardDataBuilder {
    constructor() {
        this.boardData = createMockBoardData(0, 0);
    }

    withBoard(overrides = {}) {
        this.boardData.board = createMockBoard(overrides);
        return this;
    }

    withColumns(count = 3) {
        this.boardData.columns = Array.from({ length: count }, (_, i) =>
            createMockColumn({
                Id: `col${i + 1}`,
                Name: `Column ${i + 1}`,
                position: String.fromCharCode(97 + i)
            })
        );
        return this;
    }

    withCards(columnIndex, count = 2) {
        const column = this.boardData.columns[columnIndex];
        if (!column)
            throw new Error(`Column at index ${columnIndex} not found`);

        const cards = Array.from({ length: count }, (_, i) =>
            createMockCard({
                Id: `card${columnIndex}_${i}`,
                columnId: column.Id
            })
        );

        this.boardData.cards.push(...cards);
        return this;
    }

    build() {
        return this.boardData;
    }
}

// ===================================
// Exports
// ===================================

export default {
    createMockBoard,
    createMockColumn,
    createMockCard,
    createMockBoardData,
    createMockStore,
    flushPromises,
    waitFor,
    queryElement,
    queryAllElements,
    dispatchCustomEvent,
    createDragEvent,
    simulateDragAndDrop,
    expectEventDispatched,
    expectToastShown,
    mockApexSuccess,
    mockApexError,
    createMockWireAdapter,
    suppressConsole,
    withMockedConsole,
    BoardDataBuilder
};
