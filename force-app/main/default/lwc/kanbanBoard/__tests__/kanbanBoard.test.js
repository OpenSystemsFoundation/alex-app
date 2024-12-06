import KanbanBoard from 'c/kanbanBoard';
import { createElement } from 'lwc';
describe('c-kanban-board', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the Kanban board', () => {
        // Create element, append it, and check if the board is rendered
        const board = document.body
            .appendChild(createElement('c-kanban-board', { is: KanbanBoard }))
            .shadowRoot.querySelector('.kanban-board');
        expect(board).not.toBeNull();
    });
});
