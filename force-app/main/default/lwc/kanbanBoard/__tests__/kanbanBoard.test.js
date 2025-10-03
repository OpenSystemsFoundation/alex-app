import { createElement } from 'lwc';
import KanbanBoard from 'c/kanbanBoard';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';

// Mock Apex
jest.mock(
    '@salesforce/apex/KanbanBoardController.getBoardData',
    () => {
        return {
            default: jest.fn()
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

// Mock the store
jest.mock('c/kanbanStore', () => {
    return {
        createStore: jest.fn(() => ({
            subscribe: jest.fn(() => jest.fn()),
            dispatch: jest.fn(),
            getColumns: jest.fn(() => []),
            getState: jest.fn(() => ({
                columns: [],
                board: null
            }))
        }))
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
            expect(element.height).toBe('600px');
        });
    });

    describe('Data Loading', () => {
        it('should load board data when recordId is set', async () => {
            getBoardData.mockResolvedValue(MOCK_BOARD_DATA);

            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            document.body.appendChild(element);
            element.recordId = 'a00xx000000001';

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
});
