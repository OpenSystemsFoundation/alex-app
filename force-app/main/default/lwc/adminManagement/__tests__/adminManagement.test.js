import { createElement } from 'lwc';
import AdminManagement from 'c/adminManagement';
import getBoards from '@salesforce/apex/AdminController.getBoards';
import getOnboardingStatus from '@salesforce/apex/AdminController.getOnboardingStatus';
import createBoardWithDefaultColumns from '@salesforce/apex/AdminController.createBoardWithDefaultColumns';

jest.mock(
    '@salesforce/apex/AdminController.getBoards',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.createBoard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.createBoardWithDefaultColumns',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.updateBoard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.deleteBoard',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.getOnboardingStatus',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.getCardCustomFields',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.saveCardCustomField',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.deactivateCardCustomField',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.getAvailableCardFields',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// Let pending Apex promises and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

function buttonByLabel(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(
        (button) => button.label === label
    );
}

async function openNewBoardModal() {
    const element = createElement('c-admin-management', {
        is: AdminManagement
    });
    document.body.appendChild(element);
    await flushPromises();

    buttonByLabel(element, 'New Board').click();
    await flushPromises();
    return element;
}

describe('c-admin-management board modal', () => {
    beforeEach(() => {
        getBoards.mockResolvedValue([]);
        getOnboardingStatus.mockResolvedValue({});
        createBoardWithDefaultColumns.mockResolvedValue({});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('offers every Board Type, including Sprint', async () => {
        const element = await openNewBoardModal();

        const typeBox = element.shadowRoot.querySelector(
            'lightning-combobox[data-field="type"]'
        );
        expect(typeBox.options.map((option) => option.value)).toEqual([
            'Project',
            'Personal',
            'Team',
            'Sprint'
        ]);
        expect(typeBox.value).toBe('Project');
    });

    it('creates a Sprint board when Sprint is selected', async () => {
        const element = await openNewBoardModal();

        const nameInput = element.shadowRoot.querySelector(
            'lightning-input[data-field="name"]'
        );
        nameInput.dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Team Sprints' } })
        );
        const typeBox = element.shadowRoot.querySelector(
            'lightning-combobox[data-field="type"]'
        );
        typeBox.dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Sprint' } })
        );
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(createBoardWithDefaultColumns).toHaveBeenCalledWith({
            name: 'Team Sprints',
            description: '',
            boardType: 'Sprint'
        });
    });
});
