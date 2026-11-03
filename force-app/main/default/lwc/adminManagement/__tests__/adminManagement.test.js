import { createElement } from 'lwc';
import AdminManagement from 'c/adminManagement';
import getBoards from '@salesforce/apex/AdminController.getBoards';
import getOnboardingStatus from '@salesforce/apex/AdminController.getOnboardingStatus';
import createBoardWithDefaultColumns from '@salesforce/apex/AdminController.createBoardWithDefaultColumns';
import createBoard from '@salesforce/apex/AdminController.createBoard';
import updateBoard from '@salesforce/apex/AdminController.updateBoard';
import deleteBoard from '@salesforce/apex/AdminController.deleteBoard';
import getCardCustomFields from '@salesforce/apex/AdminController.getCardCustomFields';
import saveCardCustomField from '@salesforce/apex/AdminController.saveCardCustomField';
import deactivateCardCustomField from '@salesforce/apex/AdminController.deactivateCardCustomField';
import getAvailableCardFields from '@salesforce/apex/AdminController.getAvailableCardFields';

const mockNavigate = jest.fn();

jest.mock('lightning/navigation', () => {
    const Navigate = Symbol('Navigate');
    const NavigationMixin = (Base) =>
        class extends Base {
            [Navigate](pageReference) {
                mockNavigate(pageReference);
            }
        };
    NavigationMixin.Navigate = Navigate;
    return { NavigationMixin };
});

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

const BOARDS = [
    {
        Id: 'a00000000000001',
        Name: 'Alpha',
        description: 'First board',
        type: 'Team',
        status: 'Active',
        active: true,
        emailNotifications: true,
        salesforceNotifications: false
    },
    {
        Id: 'a00000000000002',
        Name: 'Beta',
        status: 'Active',
        active: false
    }
];

const CARD_FIELDS = [
    {
        developerName: 'Story_Points',
        fieldApiName: 'OpenSF__Story_Points__c',
        displayLabel: 'Points',
        fieldType: 'Number',
        sortOrder: 10,
        active: true
    },
    {
        developerName: 'Due_Date',
        fieldApiName: 'OpenSF__Due_Date__c',
        displayLabel: 'Due',
        fieldType: 'Date',
        sortOrder: 20,
        active: false
    }
];

const AVAILABLE_FIELDS = [
    { label: 'Story Points', apiName: 'OpenSF__Story_Points__c' },
    { label: 'Risk', apiName: 'OpenSF__Risk__c' }
];

const BOARD_PAGE_REF = (recordId) => ({
    type: 'standard__recordPage',
    attributes: {
        recordId,
        objectApiName: 'OpenSF__Board__c',
        actionName: 'view'
    }
});

async function renderAdmin() {
    const element = createElement('c-admin-management', {
        is: AdminManagement
    });
    const toasts = [];
    element.addEventListener('lightning__showtoast', (evt) =>
        toasts.push(evt.detail)
    );
    document.body.appendChild(element);
    await flushPromises();
    return { element, toasts };
}

function $(element, selector) {
    return element.shadowRoot.querySelector(selector);
}

function $$(element, selector) {
    return [...element.shadowRoot.querySelectorAll(selector)];
}

function change(target, detail) {
    target.dispatchEvent(new CustomEvent('change', { detail }));
}

function menuItem(element, boardId, value) {
    return $$(element, 'lightning-menu-item').find(
        (item) => item.dataset.boardId === boardId && item.value === value
    );
}

function clickMenuItem(element, boardId, value) {
    menuItem(element, boardId, value).dispatchEvent(
        new CustomEvent('click', { detail: { value } })
    );
}

function modalTitle(element, id) {
    const heading = $(element, `#${id}`) || $(element, `[id^="${id}"]`);
    return heading ? heading.textContent.trim() : null;
}

function emptyStateHeadings(element) {
    return $$(element, '.empty-state h3').map((h) => h.textContent.trim());
}

async function openCardFieldsTab(element) {
    const tab = $$(element, 'lightning-tab').find(
        (candidate) => candidate.value === 'cardFields'
    );
    tab.dispatchEvent(new CustomEvent('active'));
    await flushPromises();
}

describe('c-admin-management data loading and onboarding', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('shows a spinner until data loads, then renders boards', async () => {
        let resolveBoards;
        getBoards.mockReturnValue(
            new Promise((resolve) => {
                resolveBoards = resolve;
            })
        );
        getOnboardingStatus.mockResolvedValue({ isComplete: true });

        const { element } = await renderAdmin();
        expect($(element, 'lightning-spinner')).not.toBeNull();
        expect($$(element, '.board-card')).toHaveLength(0);

        resolveBoards(BOARDS);
        await flushPromises();

        expect($(element, 'lightning-spinner')).toBeNull();
        const names = $$(element, '.board-name').map((n) => n.textContent);
        expect(names).toEqual(['Alpha', 'Beta']);
        expect($$(element, '.board-description')).toHaveLength(1);
        expect($$(element, 'lightning-badge.badge-active')).toHaveLength(1);
        expect($(element, '.onboarding-banner')).toBeNull();
        expect(emptyStateHeadings(element)).not.toContain('No Boards Yet');
    });

    it('shows the empty state when there are no boards', async () => {
        getBoards.mockResolvedValue([]);
        getOnboardingStatus.mockResolvedValue({ isComplete: true });

        const { element } = await renderAdmin();

        expect(emptyStateHeadings(element)).toContain('No Boards Yet');
    });

    it('toasts an error when loading fails', async () => {
        getBoards.mockRejectedValue({ body: { message: 'No access' } });
        getOnboardingStatus.mockResolvedValue({});

        const { element, toasts } = await renderAdmin();

        expect(toasts).toEqual([
            {
                title: 'Error loading data',
                message: 'No access',
                variant: 'error'
            }
        ]);
        expect($(element, 'lightning-spinner')).toBeNull();
    });

    it('hides onboarding when status is missing', async () => {
        getBoards.mockResolvedValue([]);
        getOnboardingStatus.mockResolvedValue(null);

        const { element } = await renderAdmin();
        expect($(element, '.onboarding-banner')).toBeNull();
    });

    it('step 1: prompts to create the first board', async () => {
        getBoards.mockResolvedValue([]);
        getOnboardingStatus.mockResolvedValue({
            isComplete: false,
            hasBoardsCreated: false
        });

        const { element } = await renderAdmin();

        expect($(element, 'lightning-progress-indicator').currentStep).toBe(
            'board'
        );
        buttonByLabel(element, 'Create Your First Board').click();
        await flushPromises();

        expect(modalTitle(element, 'board-modal-heading')).toBe('New Board');
    });

    it('step 2: prompts to set up columns and opens the first board', async () => {
        getBoards.mockResolvedValue(BOARDS);
        getOnboardingStatus.mockResolvedValue({
            isComplete: false,
            hasBoardsCreated: true,
            hasColumnsConfigured: false
        });

        const { element } = await renderAdmin();

        expect($(element, 'lightning-progress-indicator').currentStep).toBe(
            'columns'
        );
        expect(buttonByLabel(element, 'Create Your First Board')).toBeFalsy();

        buttonByLabel(element, 'Open First Board').click();
        expect(mockNavigate).toHaveBeenCalledWith(
            BOARD_PAGE_REF('a00000000000001')
        );
    });

    it('step 3: prompts to assign users', async () => {
        getBoards.mockResolvedValue(BOARDS);
        getOnboardingStatus.mockResolvedValue({
            isComplete: false,
            hasBoardsCreated: true,
            hasColumnsConfigured: true,
            hasUsersAssigned: false
        });

        const { element } = await renderAdmin();

        expect($(element, 'lightning-progress-indicator').currentStep).toBe(
            'users'
        );
        expect(buttonByLabel(element, 'Open First Board')).toBeFalsy();
        expect($(element, '.onboarding-actions').textContent).toContain(
            'Alex Admin'
        );
    });
});

describe('c-admin-management board actions', () => {
    beforeEach(() => {
        getBoards.mockResolvedValue(BOARDS);
        getOnboardingStatus.mockResolvedValue({ isComplete: true });
        updateBoard.mockResolvedValue({});
        createBoard.mockResolvedValue({});
        createBoardWithDefaultColumns.mockResolvedValue({});
        deleteBoard.mockResolvedValue({});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('opens a board from the card button and the menu', async () => {
        const { element } = await renderAdmin();

        const openButtons = $$(element, 'lightning-button').filter(
            (button) => button.label === 'Open Board'
        );
        openButtons[1].click();
        expect(mockNavigate).toHaveBeenLastCalledWith(
            BOARD_PAGE_REF('a00000000000002')
        );

        clickMenuItem(element, 'a00000000000001', 'open');
        expect(mockNavigate).toHaveBeenLastCalledWith(
            BOARD_PAGE_REF('a00000000000001')
        );
        expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('resolves the board id from currentTarget when the target lacks it', async () => {
        const { element } = await renderAdmin();
        const item = menuItem(element, 'a00000000000002', 'open');
        const inner = document.createElement('span');
        item.appendChild(inner);

        inner.dispatchEvent(
            new CustomEvent('click', {
                detail: { value: 'open' },
                bubbles: true
            })
        );

        expect(mockNavigate).toHaveBeenCalledWith(
            BOARD_PAGE_REF('a00000000000002')
        );
    });

    it('does not navigate when no board id is available', async () => {
        const { element } = await renderAdmin();
        const item = menuItem(element, 'a00000000000001', 'open');
        item.removeAttribute('data-board-id');

        item.dispatchEvent(
            new CustomEvent('click', { detail: { value: 'open' } })
        );

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('ignores unknown menu actions', async () => {
        const { element } = await renderAdmin();
        const item = menuItem(element, 'a00000000000001', 'open');

        item.dispatchEvent(
            new CustomEvent('click', { detail: { value: 'archive' } })
        );
        await flushPromises();

        expect(mockNavigate).not.toHaveBeenCalled();
        expect($(element, 'section[role="dialog"]')).toBeNull();
    });

    it('edits a board, toggling notification settings', async () => {
        const { element, toasts } = await renderAdmin();

        clickMenuItem(element, 'a00000000000001', 'edit');
        await flushPromises();

        expect(modalTitle(element, 'board-modal-heading')).toBe('Edit Board');
        expect(buttonByLabel(element, 'Save')).toBeTruthy();
        // Default-columns option is only offered for new boards
        expect(
            $$(element, 'lightning-input').some(
                (input) => input.type === 'checkbox'
            )
        ).toBe(false);
        expect($(element, 'lightning-input[data-field="name"]').value).toBe(
            'Alpha'
        );

        const active = $(element, 'lightning-input[data-field="active"]');
        active.checked = false;
        change(active);
        const sfNotify = $(
            element,
            'lightning-input[data-field="salesforceNotifications"]'
        );
        sfNotify.checked = true;
        change(sfNotify);
        const email = $(
            element,
            'lightning-input[data-field="emailNotifications"]'
        );
        email.checked = false;
        change(email);
        change($(element, 'lightning-textarea[data-field="description"]'), {
            value: 'Updated'
        });
        await flushPromises();

        buttonByLabel(element, 'Save').click();
        await flushPromises();

        expect(updateBoard).toHaveBeenCalledWith({
            boardId: 'a00000000000001',
            updates: {
                name: 'Alpha',
                description: 'Updated',
                type: 'Team',
                active: false,
                emailNotifications: false,
                salesforceNotifications: true
            }
        });
        expect(toasts).toContainEqual({
            title: 'Success',
            message: 'Board updated',
            variant: 'success'
        });
        expect($(element, 'section[role="dialog"]')).toBeNull();
        // Data reloaded after save
        expect(getBoards).toHaveBeenCalledTimes(2);
    });

    it('defaults description and type when editing a sparse board', async () => {
        const { element } = await renderAdmin();

        clickMenuItem(element, 'a00000000000002', 'edit');
        await flushPromises();

        expect(
            $(element, 'lightning-textarea[data-field="description"]').value
        ).toBe('');
        expect($(element, 'lightning-combobox[data-field="type"]').value).toBe(
            'Project'
        );
    });

    it('creates a board without default columns', async () => {
        const { element, toasts } = await renderAdmin();
        buttonByLabel(element, 'New Board').click();
        await flushPromises();

        change($(element, 'lightning-input[data-field="name"]'), {
            value: 'Gamma'
        });
        const defaults = $$(element, 'lightning-input').find(
            (input) => input.type === 'checkbox'
        );
        expect(defaults.checked).toBe(true);
        defaults.checked = false;
        change(defaults);
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(createBoard).toHaveBeenCalledWith({
            name: 'Gamma',
            description: '',
            boardType: 'Project'
        });
        expect(createBoardWithDefaultColumns).not.toHaveBeenCalled();
        expect(toasts).toContainEqual({
            title: 'Success',
            message: 'Board created',
            variant: 'success'
        });
    });

    it('confirms creation with default columns', async () => {
        const { element, toasts } = await renderAdmin();
        buttonByLabel(element, 'New Board').click();
        await flushPromises();
        change($(element, 'lightning-input[data-field="name"]'), {
            value: 'Delta'
        });
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(toasts).toContainEqual({
            title: 'Success',
            message: 'Board created with default columns',
            variant: 'success'
        });
    });

    it('requires a board name', async () => {
        const { element, toasts } = await renderAdmin();
        buttonByLabel(element, 'New Board').click();
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(toasts).toEqual([
            {
                title: 'Error',
                message: 'Board name is required',
                variant: 'error'
            }
        ]);
        expect(createBoardWithDefaultColumns).not.toHaveBeenCalled();
        expect(modalTitle(element, 'board-modal-heading')).toBe('New Board');
    });

    it('toasts and keeps the modal open when saving fails', async () => {
        createBoardWithDefaultColumns.mockRejectedValue(new Error('dup name'));
        const { element, toasts } = await renderAdmin();
        buttonByLabel(element, 'New Board').click();
        await flushPromises();
        change($(element, 'lightning-input[data-field="name"]'), {
            value: 'Alpha'
        });
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(toasts).toEqual([
            {
                title: 'Error saving board',
                message: 'dup name',
                variant: 'error'
            }
        ]);
        expect(modalTitle(element, 'board-modal-heading')).toBe('New Board');
        expect(buttonByLabel(element, 'Create').disabled).toBe(false);
    });

    it('closes the board modal via Cancel and the close icon', async () => {
        const { element } = await renderAdmin();
        buttonByLabel(element, 'New Board').click();
        await flushPromises();
        buttonByLabel(element, 'Cancel').click();
        await flushPromises();
        expect($(element, 'section[role="dialog"]')).toBeNull();

        buttonByLabel(element, 'New Board').click();
        await flushPromises();
        $(element, 'button.slds-modal__close').click();
        await flushPromises();
        expect($(element, 'section[role="dialog"]')).toBeNull();
    });

    it('deletes a board after confirmation', async () => {
        const { element, toasts } = await renderAdmin();

        clickMenuItem(element, 'a00000000000002', 'delete');
        await flushPromises();

        expect(modalTitle(element, 'delete-modal-heading')).toBe(
            'Confirm Delete'
        );
        expect(
            $(element, 'section[role="dialog"] .slds-modal__content')
                .textContent
        ).toContain('delete the board "Beta"');

        buttonByLabel(element, 'Delete').click();
        await flushPromises();

        expect(deleteBoard).toHaveBeenCalledWith({
            boardId: 'a00000000000002'
        });
        expect(toasts).toContainEqual({
            title: 'Success',
            message: 'Board deleted',
            variant: 'success'
        });
        expect(getBoards).toHaveBeenCalledTimes(2);
        expect($(element, 'section[role="dialog"]')).toBeNull();
    });

    it('keeps the delete modal open when deletion fails', async () => {
        deleteBoard.mockRejectedValue({});
        const { element, toasts } = await renderAdmin();

        clickMenuItem(element, 'a00000000000001', 'delete');
        await flushPromises();
        buttonByLabel(element, 'Delete').click();
        await flushPromises();

        expect(toasts).toEqual([
            {
                title: 'Error deleting',
                message: 'Unknown error',
                variant: 'error'
            }
        ]);
        expect(modalTitle(element, 'delete-modal-heading')).toBe(
            'Confirm Delete'
        );
    });

    it('cancels deletion', async () => {
        const { element } = await renderAdmin();
        clickMenuItem(element, 'a00000000000001', 'delete');
        await flushPromises();

        buttonByLabel(element, 'Cancel').click();
        await flushPromises();

        expect($(element, 'section[role="dialog"]')).toBeNull();
        expect(deleteBoard).not.toHaveBeenCalled();
    });
});

describe('c-admin-management card fields', () => {
    beforeEach(() => {
        getBoards.mockResolvedValue([]);
        getOnboardingStatus.mockResolvedValue({ isComplete: true });
        getCardCustomFields.mockResolvedValue(CARD_FIELDS);
        getAvailableCardFields.mockResolvedValue(AVAILABLE_FIELDS);
        saveCardCustomField.mockResolvedValue({});
        deactivateCardCustomField.mockResolvedValue({});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('loads card fields once when the tab is first activated', async () => {
        const { element } = await renderAdmin();
        expect(getCardCustomFields).not.toHaveBeenCalled();

        // Activating another tab does not load fields
        const boardsTab = $$(element, 'lightning-tab').find(
            (tab) => tab.value === 'boards'
        );
        boardsTab.dispatchEvent(new CustomEvent('active'));
        await flushPromises();
        expect(getCardCustomFields).not.toHaveBeenCalled();

        await openCardFieldsTab(element);

        expect(getCardCustomFields).toHaveBeenCalledTimes(1);
        const labels = $$(element, '.column-header-text').map(
            (n) => n.textContent
        );
        expect(labels).toEqual(['Points', 'Due']);
        const badges = $$(element, '.column-card-count span');
        expect(badges.map((b) => b.textContent)).toEqual([
            'Active',
            'Inactive'
        ]);
        expect(badges[0].className).toBe('slds-badge badge-active');
        expect(badges[1].className).toBe('slds-badge');

        await openCardFieldsTab(element);
        expect(getCardCustomFields).toHaveBeenCalledTimes(1);
    });

    it('shows the empty state and reloads while no fields exist', async () => {
        getCardCustomFields.mockResolvedValue([]);
        const { element } = await renderAdmin();

        await openCardFieldsTab(element);
        expect(emptyStateHeadings(element)).toContain(
            'No Custom Fields Configured'
        );

        await openCardFieldsTab(element);
        expect(getCardCustomFields).toHaveBeenCalledTimes(2);
    });

    it('toasts when card fields fail to load', async () => {
        getCardCustomFields.mockRejectedValue(new Error('metadata down'));
        const { element, toasts } = await renderAdmin();

        await openCardFieldsTab(element);

        expect(toasts).toEqual([
            {
                title: 'Error loading card fields',
                message: 'metadata down',
                variant: 'error'
            }
        ]);
    });

    it('creates a new card field with derived developer name and label', async () => {
        jest.useFakeTimers();
        const { element, toasts } = await renderAdmin();
        await openCardFieldsTab(element);

        buttonByLabel(element, 'Add Field').click();
        await flushPromises();

        expect(modalTitle(element, 'card-field-modal-heading')).toBe(
            'New Card Field'
        );
        const apiCombo = $(
            element,
            'lightning-combobox[data-field="fieldApiName"]'
        );
        expect(apiCombo.options).toEqual([
            {
                label: 'Story Points (OpenSF__Story_Points__c)',
                value: 'OpenSF__Story_Points__c'
            },
            { label: 'Risk (OpenSF__Risk__c)', value: 'OpenSF__Risk__c' }
        ]);
        expect(
            $(element, 'lightning-input[data-field="sortOrder"]').value
        ).toBe(30);

        change(apiCombo, { value: 'Risk-Level__c' });
        change($(element, 'lightning-combobox[data-field="fieldType"]'), {
            value: 'Picklist'
        });
        // lightning-input number change without detail falls back to target.value
        const sortInput = $(element, 'lightning-input[data-field="sortOrder"]');
        sortInput.value = 45;
        sortInput.dispatchEvent(new CustomEvent('change'));
        const activeToggle = $(element, 'lightning-input[data-field="active"]');
        activeToggle.checked = false;
        change(activeToggle);
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(saveCardCustomField).toHaveBeenCalledWith({
            fieldConfig: {
                developerName: 'Risk_Level',
                masterLabel: 'Risk-Level',
                fieldApiName: 'Risk-Level__c',
                displayLabel: '',
                fieldType: 'Picklist',
                sortOrder: 45,
                active: false
            }
        });
        expect(toasts).toContainEqual({
            title: 'Success',
            message:
                'Card field configuration saved. It may take a moment to deploy.',
            variant: 'success'
        });
        expect($(element, 'section[role="dialog"]')).toBeNull();

        // Fields reload after the deploy delay
        expect(getCardCustomFields).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(2000);
        await flushPromises();
        expect(getCardCustomFields).toHaveBeenCalledTimes(2);
    });

    it('edits an existing card field', async () => {
        const { element } = await renderAdmin();
        await openCardFieldsTab(element);

        const editButton = $$(element, 'lightning-button-icon').find(
            (b) =>
                b.dataset.developerName === 'Story_Points' &&
                b.iconName === 'utility:edit'
        );
        editButton.click();
        await flushPromises();

        expect(modalTitle(element, 'card-field-modal-heading')).toBe(
            'Edit Card Field'
        );
        const apiCombo = $(
            element,
            'lightning-combobox[data-field="fieldApiName"]'
        );
        expect(apiCombo.disabled).toBe(true);
        expect(apiCombo.value).toBe('OpenSF__Story_Points__c');

        change($(element, 'lightning-input[data-field="displayLabel"]'), {
            value: 'Story Pts'
        });
        await flushPromises();
        buttonByLabel(element, 'Save').click();
        await flushPromises();

        expect(saveCardCustomField).toHaveBeenCalledWith({
            fieldConfig: {
                developerName: 'Story_Points',
                masterLabel: 'Story Pts',
                fieldApiName: 'OpenSF__Story_Points__c',
                displayLabel: 'Story Pts',
                fieldType: 'Number',
                sortOrder: 10,
                active: true
            }
        });
    });

    it('requires a field API name', async () => {
        const { element, toasts } = await renderAdmin();
        await openCardFieldsTab(element);
        buttonByLabel(element, 'Add Field').click();
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(toasts).toEqual([
            {
                title: 'Error',
                message: 'Field API name is required',
                variant: 'error'
            }
        ]);
        expect(saveCardCustomField).not.toHaveBeenCalled();
    });

    it('toasts when saving a card field fails', async () => {
        saveCardCustomField.mockRejectedValue({
            body: { message: 'Missing ManageCardFields' }
        });
        const { element, toasts } = await renderAdmin();
        await openCardFieldsTab(element);
        buttonByLabel(element, 'Add Field').click();
        await flushPromises();
        change($(element, 'lightning-combobox[data-field="fieldApiName"]'), {
            value: 'OpenSF__Risk__c'
        });
        await flushPromises();

        buttonByLabel(element, 'Create').click();
        await flushPromises();

        expect(toasts).toEqual([
            {
                title: 'Error saving card field',
                message: 'Missing ManageCardFields',
                variant: 'error'
            }
        ]);
        expect(modalTitle(element, 'card-field-modal-heading')).toBe(
            'New Card Field'
        );
    });

    it('closes the card field modal', async () => {
        const { element } = await renderAdmin();
        await openCardFieldsTab(element);
        buttonByLabel(element, 'Add Field').click();
        await flushPromises();
        buttonByLabel(element, 'Cancel').click();
        await flushPromises();
        expect($(element, 'section[role="dialog"]')).toBeNull();

        buttonByLabel(element, 'Add Field').click();
        await flushPromises();
        $(element, 'button.slds-modal__close').click();
        await flushPromises();
        expect($(element, 'section[role="dialog"]')).toBeNull();
    });

    it('deactivates a card field after confirmation and reloads later', async () => {
        jest.useFakeTimers();
        const { element, toasts } = await renderAdmin();
        await openCardFieldsTab(element);

        const deactivate = $$(element, 'lightning-button-icon').find(
            (b) =>
                b.dataset.developerName === 'Due_Date' &&
                b.iconName === 'utility:delete'
        );
        deactivate.click();
        await flushPromises();

        expect(
            $(element, 'section[role="dialog"] .slds-modal__content')
                .textContent
        ).toContain('deactivate the card field "Due"');

        buttonByLabel(element, 'Delete').click();
        await flushPromises();

        expect(deactivateCardCustomField).toHaveBeenCalledWith({
            developerName: 'Due_Date'
        });
        expect(toasts).toContainEqual({
            title: 'Success',
            message:
                'Card field deactivated. Changes may take a moment to deploy.',
            variant: 'success'
        });
        expect($(element, 'section[role="dialog"]')).toBeNull();

        jest.advanceTimersByTime(2000);
        await flushPromises();
        expect(getCardCustomFields).toHaveBeenCalledTimes(2);
    });

    it('closes the delete modal from the close icon', async () => {
        const { element } = await renderAdmin();
        await openCardFieldsTab(element);
        $$(element, 'lightning-button-icon')
            .find((b) => b.iconName === 'utility:delete')
            .click();
        await flushPromises();

        $(element, 'button.slds-modal__close').click();
        await flushPromises();

        expect($(element, 'section[role="dialog"]')).toBeNull();
        expect(deactivateCardCustomField).not.toHaveBeenCalled();
    });
});
