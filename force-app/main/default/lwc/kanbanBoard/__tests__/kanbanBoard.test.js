import { createElement } from 'lwc';
import KanbanBoard from 'c/kanbanBoard';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';

// Mock Apex wire adapter
const getBoardDataAdapter = registerApexTestWireAdapter(getBoardData);

// Mock data
const mockBoardData = {
    board: {
        Id: 'a015g00000ABCDE',
        Name: 'Test Board',
        Status__c: 'Active'
    },
    columns: [
        {
            Id: 'a025g00000ABCDE',
            Name: 'To Do',
            ColumnHeader__c: 'To Do',
            Position__c: '0|h00000:',
            Status__c: 'Active',
            CardCount__c: 2
        },
        {
            Id: 'a025g00000ABCDF',
            Name: 'In Progress',
            ColumnHeader__c: 'In Progress',
            Position__c: '0|hzzzzz:',
            Status__c: 'Active',
            CardCount__c: 1
        }
    ],
    cards: [
        {
            Id: 'a035g00000ABCDE',
            Name: 'CARD-001',
            Subject__c: 'Test Card 1',
            Column__c: 'a025g00000ABCDE',
            Position__c: '0|h00000:',
            Priority__c: 'High',
            Status__c: 'Active'
        },
        {
            Id: 'a035g00000ABCDF',
            Name: 'CARD-002',
            Subject__c: 'Test Card 2',
            Column__c: 'a025g00000ABCDE',
            Position__c: '0|h00001:',
            Priority__c: 'Medium',
            Status__c: 'Active'
        },
        {
            Id: 'a035g00000ABCDG',
            Name: 'CARD-003',
            Subject__c: 'Test Card 3',
            Column__c: 'a025g00000ABCDF',
            Position__c: '0|h00000:',
            Priority__c: 'Low',
            Status__c: 'Active'
        }
    ]
};

describe('c-kanban-board', () => {
    afterEach(() => {
        // Clean up the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('should render board with columns and cards', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        // Emit mock data
        getBoardDataAdapter.emit(mockBoardData);

        // Wait for any asynchronous DOM updates
        await Promise.resolve();

        // Check columns are rendered
        const columns = element.shadowRoot.querySelectorAll('.kanban-column');
        expect(columns.length).toBe(2);

        // Check cards are rendered
        const cards = element.shadowRoot.querySelectorAll('.kanban-card');
        expect(cards.length).toBe(3);
    });

    it('should display correct column headers', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const columnTitles = element.shadowRoot.querySelectorAll('.column-title h3');
        expect(columnTitles[0].textContent).toBe('To Do');
        expect(columnTitles[1].textContent).toBe('In Progress');
    });

    it('should display card count in columns', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const cardCounts = element.shadowRoot.querySelectorAll('.card-count');
        expect(cardCounts[0].textContent).toBe('2');
        expect(cardCounts[1].textContent).toBe('1');
    });

    it('should handle drag start event', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const card = element.shadowRoot.querySelector('.kanban-card');
        
        // Simulate drag start
        const dragEvent = new Event('dragstart');
        card.dispatchEvent(dragEvent);

        // Check that dragging class is added
        expect(card.classList.contains('dragging')).toBe(true);
    });

    it('should display priority badges correctly', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const priorityBadges = element.shadowRoot.querySelectorAll('[class*="priority-"]');
        expect(priorityBadges.length).toBeGreaterThan(0);
    });

    it('should show loading state when no data', () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        const spinner = element.shadowRoot.querySelector('lightning-spinner');
        expect(spinner).not.toBeNull();
    });

    it('should handle empty board state', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        const emptyData = {
            board: mockBoardData.board,
            columns: [],
            cards: []
        };

        getBoardDataAdapter.emit(emptyData);
        await Promise.resolve();

        const columns = element.shadowRoot.querySelectorAll('.kanban-column');
        expect(columns.length).toBe(0);
    });

    it('should display card subjects', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const cardSubjects = element.shadowRoot.querySelectorAll('.card-subject');
        expect(cardSubjects[0].textContent).toBe('Test Card 1');
        expect(cardSubjects[1].textContent).toBe('Test Card 2');
        expect(cardSubjects[2].textContent).toBe('Test Card 3');
    });

    it('should have draggable cards', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const cards = element.shadowRoot.querySelectorAll('.kanban-card');
        cards.forEach(card => {
            expect(card.getAttribute('draggable')).toBe('true');
        });
    });

    it('should show add card button on columns', async () => {
        const element = createElement('c-kanban-board', {
            is: KanbanBoard
        });
        element.recordId = 'a015g00000ABCDE';
        document.body.appendChild(element);

        getBoardDataAdapter.emit(mockBoardData);
        await Promise.resolve();

        const addButtons = element.shadowRoot.querySelectorAll('lightning-button-icon[icon-name="utility:add"]');
        expect(addButtons.length).toBe(2); // One per column
    });
});
