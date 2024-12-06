import EditCardModal from 'c/editCardModal';
import { createElement } from 'lwc';

jest.mock('c/kanbanBoardStore', () => ({
    deleteCard: jest.fn(),
    updateCard: jest.fn()
}));

describe('c-edit-card-modal', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the modal', () => {
        const modal = createElement('c-edit-card-modal', { is: EditCardModal });
        document.body
            .appendChild(modal)
            .shadowRoot.querySelector('section[role="dialog"]');
        expect(modal).not.toBeNull();
    });
});
