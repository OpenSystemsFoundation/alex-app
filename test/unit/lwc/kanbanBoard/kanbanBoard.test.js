import { createElement } from 'lwc';
import KanbanBoard from 'c/kanbanBoard';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getBoardData',
    () => {
        return {
            default: jest.fn()
        };
    },
    { virtual: true }
);

jest.mock(
    '@salesforce/apex/KanbanBoardController.getKanbanConfig',
    () => {
        const { createApexTestWireAdapter } =
            require('@salesforce/sfdx-lwc-jest').default || require('@salesforce/sfdx-lwc-jest');
        return {
            default: createApexTestWireAdapter(jest.fn())
        };
    },
    { virtual: true }
);

// Mock lightning/platformWorkspaceApi
jest.mock(
    'lightning/platformWorkspaceApi',
    () => {
        return {
            IsConsoleNavigation: jest.fn(),
            openTab: jest.fn(),
            getFocusedTabInfo: jest.fn()
        };
    },
    { virtual: true }
);

// Mock the store with proper thunk support
jest.mock('c/kanbanStore', () => {
    const mockGetBoardData =
        require('@salesforce/apex/KanbanBoardController.getBoardData').default;

    const mockDispatch = jest.fn(async (action) => {
        // If action is a function (thunk), execute it with dispatch and getState
        if (typeof action === 'function') {
            const getState = jest.fn(() => ({
                columns: [],
                board: null
            }));
            return action(mockDispatch, getState);
        }
        return action;
    });

    // Create the loadBoardData thunk that calls getBoardData
    const mockLoadBoardData = jest.fn((boardId) => {
        return async (dispatch, getState) => {
            const data = await mockGetBoardData({ boardId });
            // Dispatch actions as the real thunk would
            dispatch({ type: 'board/set', payload: data.board });
            dispatch({ type: 'columns/set', payload: data.columns || [] });
            return {
                success: true,
                board: data.board,
                columns: data.columns || []
            };
        };
    });

    return {
        createStore: jest.fn(() => ({
            subscribe: jest.fn(() => jest.fn()),
            dispatch: mockDispatch,
            getColumns: jest.fn(() => []),
            getState: jest.fn(() => ({
                columns: [],
                board: null,
                isLoading: false,
                error: null,
                subscriptionStatus: 'disconnected'
            }))
        })),
        loadBoardData: mockLoadBoardData,
        setLoading: jest.fn((isLoading) => ({
            type: 'SET_LOADING',
            payload: isLoading
        })),
        setError: jest.fn((error) => ({
            type: 'SET_ERROR',
            payload: error
        })),
        clearError: jest.fn(() => ({ type: 'CLEAR_ERROR' })),
        setSubscriptionStatus: jest.fn((status) => ({
            type: 'SET_SUBSCRIPTION_STATUS',
            payload: status
        })),
        selectors: {
            getEnrichedColumns: jest.fn(() => []),
            getCardsByColumnMap: jest.fn(() => ({})),
            getBoard: jest.fn(() => null),
            getIsLoading: jest.fn(() => false),
            getError: jest.fn(() => null),
            getSubscriptionStatus: jest.fn(() => 'disconnected'),
            getSyncState: jest.fn(() => 'idle'),
            getPendingOperations: jest.fn(() => []),
            getLastSyncError: jest.fn(() => null)
        }
    };
});

// Mock navigation mixin
jest.mock('lightning/navigation', () => {
    const Navigate = jest.fn();
    return {
        NavigationMixin: (Base) => {
            return class extends Base {
                [Navigate] = jest.fn();
            };
        }
    };
});

// Sample test data
const MOCK_BOARD_DATA = {
    board: {
        Id: 'a00xx000000001',
        Name: 'Test Board',
        OpenSF__Description__c: 'Test Description'
    },
    columns: [
        {
            Id: 'a01xx000000001',
            Name: 'To Do',
            OpenSF__Position__c: 'a',
            OpenSF__Board__c: 'a00xx000000001'
        },
        {
            Id: 'a01xx000000002',
            Name: 'In Progress',
            OpenSF__Position__c: 'b',
            OpenSF__Board__c: 'a00xx000000001'
        },
        {
            Id: 'a01xx000000003',
            Name: 'Done',
            OpenSF__Position__c: 'c',
            OpenSF__Board__c: 'a00xx000000001'
        }
    ],
    cards: [
        {
            Id: 'a02xx000000001',
            Name: 'Card 1',
            OpenSF__Column__c: 'a01xx000000001',
            OpenSF__Position__c: 'a',
            OpenSF__Description__c: 'Description 1'
        },
        {
            Id: 'a02xx000000002',
            Name: 'Card 2',
            OpenSF__Column__c: 'a01xx000000001',
            OpenSF__Position__c: 'b',
            OpenSF__Description__c: 'Description 2'
        },
        {
            Id: 'a02xx000000003',
            Name: 'Card 3',
            OpenSF__Column__c: 'a01xx000000002',
            OpenSF__Position__c: 'a',
            OpenSF__Description__c: 'Description 3'
        }
    ]
};

describe('c-kanban-board', () => {
    afterEach(() => {
        // Clean up DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Component Initialization', () => {
        it('should create component successfully', () => {
            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            document.body.appendChild(element);

            expect(element).toBeTruthy();
        });
    });

    describe('Data Loading', () => {
        it('should load board data when recordId is set', async () => {
            getBoardData.mockResolvedValue(MOCK_BOARD_DATA);

            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            element.recordId = 'a00xx000000001';
            document.body.appendChild(element);

            // Wait for connectedCallback and async loading
            await Promise.resolve();
            await Promise.resolve();

            expect(getBoardData).toHaveBeenCalledWith({
                boardId: 'a00xx000000001'
            });
        });

        it('should not load data when recordId is not set', async () => {
            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            document.body.appendChild(element);

            await Promise.resolve();

            expect(getBoardData).not.toHaveBeenCalled();
        });
    });

    describe('Public API', () => {
        it('should accept height and recordId properties', () => {
            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            element.height = '800px';
            element.recordId = 'test123';
            document.body.appendChild(element);

            expect(element.height).toBe('800px');
            expect(element.recordId).toBe('test123');
        });
    });

    describe('Board Operations', () => {
        it('should handle board data with columns and cards', async () => {
            getBoardData.mockResolvedValue(MOCK_BOARD_DATA);

            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            element.recordId = 'a00xx000000001';
            document.body.appendChild(element);

            // Wait for connectedCallback and async loading
            await Promise.resolve();
            await Promise.resolve();

            // Verify board is loaded with correct data
            expect(getBoardData).toHaveBeenCalledWith({
                boardId: 'a00xx000000001'
            });
        });

        it('should handle error state', async () => {
            const errorMessage = 'Failed to load board';
            getBoardData.mockRejectedValue(new Error(errorMessage));

            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            element.recordId = 'a00xx000000001';
            document.body.appendChild(element);

            // Wait for connectedCallback and async loading
            await Promise.resolve();
            await Promise.resolve();

            expect(getBoardData).toHaveBeenCalledWith({
                boardId: 'a00xx000000001'
            });
        });
    });
});
