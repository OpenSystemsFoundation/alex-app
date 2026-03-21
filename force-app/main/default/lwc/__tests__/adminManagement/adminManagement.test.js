import { createElement } from '@lwc/engine-dom';

// ─── Mock: Apex methods ─────────────────────────────────────────────
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
    '@salesforce/apex/AdminController.getColumns',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.createColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.updateColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.deleteColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/AdminController.reorderColumn',
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

// ─── Mock: lightning/platformShowToastEvent ──────────────────────────
jest.mock(
    'lightning/platformShowToastEvent',
    () => ({
        ShowToastEvent: jest.fn(function (params) {
            return new CustomEvent('lightning__showtoast', {
                detail: params
            });
        })
    }),
    { virtual: true }
);

// ─── Import component under test ────────────────────────────────────
import AdminManagement from 'c/adminManagement';

// ─── Import mocked Apex methods ─────────────────────────────────────
import getBoards from '@salesforce/apex/AdminController.getBoards';
import createBoard from '@salesforce/apex/AdminController.createBoard';
import createBoardWithDefaultColumns from '@salesforce/apex/AdminController.createBoardWithDefaultColumns';
import updateBoard from '@salesforce/apex/AdminController.updateBoard';
import deleteBoard from '@salesforce/apex/AdminController.deleteBoard';
import getColumns from '@salesforce/apex/AdminController.getColumns';
import createColumn from '@salesforce/apex/AdminController.createColumn';
import updateColumn from '@salesforce/apex/AdminController.updateColumn';
import deleteColumn from '@salesforce/apex/AdminController.deleteColumn';
import reorderColumn from '@salesforce/apex/AdminController.reorderColumn';
import getOnboardingStatus from '@salesforce/apex/AdminController.getOnboardingStatus';

// ─── Test Data ──────────────────────────────────────────────────────
const MOCK_BOARDS = [
    {
        Id: 'board1',
        Name: 'Project Alpha',
        description: 'Alpha board',
        type: 'Project',
        active: true,
        status: 'Active',
        emailNotifications: true,
        salesforceNotifications: false
    },
    {
        Id: 'board2',
        Name: 'Personal Tasks',
        description: '',
        type: 'Personal',
        active: false,
        status: 'Inactive',
        emailNotifications: false,
        salesforceNotifications: false
    }
];

const MOCK_ONBOARDING_COMPLETE = {
    isComplete: true,
    hasBoardsCreated: true,
    hasColumnsConfigured: true,
    hasUsersAssigned: true
};

const MOCK_ONBOARDING_NO_BOARDS = {
    isComplete: false,
    hasBoardsCreated: false,
    hasColumnsConfigured: false,
    hasUsersAssigned: false
};

const MOCK_ONBOARDING_NO_COLUMNS = {
    isComplete: false,
    hasBoardsCreated: true,
    hasColumnsConfigured: false,
    hasUsersAssigned: false
};

const MOCK_ONBOARDING_NO_USERS = {
    isComplete: false,
    hasBoardsCreated: true,
    hasColumnsConfigured: true,
    hasUsersAssigned: false
};

const MOCK_COLUMNS = [
    {
        Id: 'col1',
        columnHeader: 'To Do',
        category: 'To Do',
        color: '#1B96FF',
        position: 1,
        cardCount: 5
    },
    {
        Id: 'col2',
        columnHeader: 'In Progress',
        category: 'In Progress',
        color: '#FF9800',
        position: 2,
        cardCount: 3
    },
    {
        Id: 'col3',
        columnHeader: 'Done',
        category: 'Done',
        color: '#4CAF50',
        position: 3,
        cardCount: 0
    }
];

// ─── Helpers ────────────────────────────────────────────────────────
function createComponent() {
    const element = createElement('c-admin-management', {
        is: AdminManagement
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() {
    return new Promise((resolve) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(resolve, 0);
    });
}

/**
 * Find a lightning-button by its label property (not attribute).
 * LWC stubs set properties, not HTML attributes.
 */
function findButtonByLabel(root, label) {
    const buttons = root.querySelectorAll('lightning-button');
    return Array.from(buttons).find((b) => b.label === label) || null;
}

/**
 * Find all lightning-buttons by label property.
 */
function findAllButtonsByLabel(root, label) {
    const buttons = root.querySelectorAll('lightning-button');
    return Array.from(buttons).filter((b) => b.label === label);
}

/**
 * Find all lightning-menu-items by value property.
 */
function findAllMenuItemsByValue(root, value) {
    const items = root.querySelectorAll('lightning-menu-item');
    return Array.from(items).filter((i) => i.value === value);
}

/**
 * Find all lightning-button-icons by iconName property.
 */
function findAllButtonIconsByName(root, iconName) {
    const icons = root.querySelectorAll('lightning-button-icon');
    return Array.from(icons).filter((i) => i.iconName === iconName);
}

/**
 * Find input-like element by data-field dataset property.
 */
function findInputByField(root, field, tagName = 'lightning-input') {
    const inputs = root.querySelectorAll(tagName);
    return (
        Array.from(inputs).find(
            (i) => i.dataset && i.dataset.field === field
        ) || null
    );
}

/**
 * Simulate a change event with detail.value.
 * In LWC test harness, the target of the event is the element itself,
 * so dataset.field comes from the element's own data attributes.
 */
function simulateInputChange(inputEl, value) {
    inputEl.dispatchEvent(new CustomEvent('change', { detail: { value } }));
}

/**
 * Simulate a checkbox change event.
 */
function simulateCheckboxChange(inputEl, checked) {
    inputEl.checked = checked;
    inputEl.dispatchEvent(new CustomEvent('change'));
}

/**
 * Simulate a board action (edit/delete/columns) via the menu item.
 * handleBoardAction reads event.detail.value for action type and
 * event.target.dataset.boardId for the board. In the test stub,
 * we dispatch a 'click' CustomEvent with detail.value set,
 * and the target element must have dataset.boardId.
 */
function simulateBoardAction(menuItem, action, boardId) {
    // Ensure dataset is set on the element
    menuItem.dataset.boardId = boardId;
    menuItem.dispatchEvent(
        new CustomEvent('click', {
            detail: { value: action },
            bubbles: true,
            composed: true
        })
    );
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-admin-management', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ================================================================
    // Initial Load
    // ================================================================
    describe('Initial Load', () => {
        it('calls getBoards and getOnboardingStatus on connectedCallback', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            createComponent();
            await flushPromises();

            expect(getBoards).toHaveBeenCalledTimes(1);
            expect(getOnboardingStatus).toHaveBeenCalledTimes(1);
        });

        it('displays boards after successful load', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const boardNames =
                element.shadowRoot.querySelectorAll('.board-name');
            expect(boardNames.length).toBe(2);
            expect(boardNames[0].textContent).toBe('Project Alpha');
            expect(boardNames[1].textContent).toBe('Personal Tasks');
        });

        it('shows empty state when no boards', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);

            const element = createComponent();
            await flushPromises();

            const emptyState = element.shadowRoot.querySelector('.empty-state');
            expect(emptyState).toBeTruthy();
        });

        it('shows error toast when loadData fails', async () => {
            getBoards.mockRejectedValue({
                body: { message: 'Load failed' }
            });
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            expect(toastHandler).toHaveBeenCalled();
            const toastDetail = toastHandler.mock.calls[0][0].detail;
            expect(toastDetail.variant).toBe('error');
            expect(toastDetail.message).toBe('Load failed');
        });

        it('shows fallback message for unknown error shape', async () => {
            getBoards.mockRejectedValue({});
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            expect(toastHandler).toHaveBeenCalled();
            const toastDetail = toastHandler.mock.calls[0][0].detail;
            expect(toastDetail.message).toBe('Unknown error');
        });

        it('shows error.message when body is absent', async () => {
            getBoards.mockRejectedValue({ message: 'JS error' });
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const toastDetail = toastHandler.mock.calls[0][0].detail;
            expect(toastDetail.message).toBe('JS error');
        });
    });

    // ================================================================
    // Computed Properties
    // ================================================================
    describe('Computed Properties', () => {
        it('hasBoards renders boards-grid when boards exist', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const boardsGrid = element.shadowRoot.querySelector('.boards-grid');
            expect(boardsGrid).toBeTruthy();
        });

        it('noBoards renders empty-state when boards are empty', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const emptyState = element.shadowRoot.querySelector('.empty-state');
            expect(emptyState).toBeTruthy();
        });

        it('boardOptions maps boards to label/value pairs', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const combobox = element.shadowRoot.querySelector('.board-select');
            expect(combobox).toBeTruthy();
            expect(combobox.options).toEqual([
                { label: 'Project Alpha', value: 'board1' },
                { label: 'Personal Tasks', value: 'board2' }
            ]);
        });
    });

    // ================================================================
    // Onboarding Banner
    // ================================================================
    describe('Onboarding Banner', () => {
        it('shows onboarding banner when not complete', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);

            const element = createComponent();
            await flushPromises();

            const banner =
                element.shadowRoot.querySelector('.onboarding-banner');
            expect(banner).toBeTruthy();
        });

        it('hides onboarding banner when complete', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const banner =
                element.shadowRoot.querySelector('.onboarding-banner');
            expect(banner).toBeFalsy();
        });

        it('shows Create First Board button when no boards', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);

            const element = createComponent();
            await flushPromises();

            const actions = element.shadowRoot.querySelector(
                '.onboarding-actions'
            );
            expect(actions).toBeTruthy();
            const createBtn = findButtonByLabel(
                actions,
                'Create Your First Board'
            );
            expect(createBtn).toBeTruthy();
        });

        it('shows setup columns guidance when no columns configured', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const banner =
                element.shadowRoot.querySelector('.onboarding-banner');
            expect(banner).toBeTruthy();
            const actions = element.shadowRoot.querySelector(
                '.onboarding-actions'
            );
            const createBtn = findButtonByLabel(
                actions,
                'Create Your First Board'
            );
            expect(createBtn).toBeFalsy();
        });

        it('shows assign users message when columns configured but no users', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_USERS);

            const element = createComponent();
            await flushPromises();

            const banner =
                element.shadowRoot.querySelector('.onboarding-banner');
            expect(banner).toBeTruthy();
        });

        it('clicking Create Your First Board opens board modal', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);

            const element = createComponent();
            await flushPromises();

            const actions = element.shadowRoot.querySelector(
                '.onboarding-actions'
            );
            const createBtn = findButtonByLabel(
                actions,
                'Create Your First Board'
            );
            createBtn.click();
            await flushPromises();

            const modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"]'
            );
            expect(modal).toBeTruthy();
        });
    });

    // ================================================================
    // Tab Navigation
    // ================================================================
    describe('Tab Navigation', () => {
        it('handles tab change event', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const tabs = element.shadowRoot.querySelectorAll('lightning-tab');
            const columnsTab = Array.from(tabs).find(
                (t) => t.value === 'columns'
            );
            columnsTab.dispatchEvent(
                new CustomEvent('active', {
                    target: { value: 'columns' }
                })
            );
            await flushPromises();

            const tabset = element.shadowRoot.querySelector('lightning-tabset');
            expect(tabset.activeTabValue).toBe('columns');
        });
    });

    // ================================================================
    // Board CRUD
    // ================================================================
    describe('Board CRUD', () => {
        it('opens new board modal with default values', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            expect(newBoardBtn).toBeTruthy();
            newBoardBtn.click();
            await flushPromises();

            const modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            const heading = element.shadowRoot.querySelector(
                '#board-modal-heading'
            );
            expect(heading.textContent).toContain('New Board');
        });

        it('creates board with default columns', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);
            createBoardWithDefaultColumns.mockResolvedValue({
                Id: 'newBoard1'
            });

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            // Open modal
            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            // Fill in board name
            const nameInput = findInputByField(
                element.shadowRoot,
                'name',
                'lightning-input'
            );
            simulateInputChange(nameInput, 'Test Board');
            await flushPromises();

            // Set up for reload after save
            getBoards.mockResolvedValue([
                { Id: 'newBoard1', Name: 'Test Board', type: 'Project' }
            ]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_COLUMNS);

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createBoardWithDefaultColumns).toHaveBeenCalledWith({
                name: 'Test Board',
                description: '',
                boardType: 'Project'
            });
        });

        it('creates board without default columns when unchecked', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);
            createBoard.mockResolvedValue({ Id: 'newBoard2' });

            const element = createComponent();
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            // Fill in board name
            const nameInput = findInputByField(
                element.shadowRoot,
                'name',
                'lightning-input'
            );
            simulateInputChange(nameInput, 'Test Board 2');
            await flushPromises();

            // Uncheck defaults checkbox
            const allInputs =
                element.shadowRoot.querySelectorAll('lightning-input');
            const defaultsCheckbox = Array.from(allInputs).find(
                (c) => c.type === 'checkbox'
            );
            simulateCheckboxChange(defaultsCheckbox, false);
            await flushPromises();

            getBoards.mockResolvedValue([
                { Id: 'newBoard2', Name: 'Test Board 2', type: 'Project' }
            ]);

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createBoard).toHaveBeenCalledWith({
                name: 'Test Board 2',
                description: '',
                boardType: 'Project'
            });
        });

        it('shows validation error when board name is empty', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(toastHandler).toHaveBeenCalled();
            const toastDetail = toastHandler.mock.calls[0][0].detail;
            expect(toastDetail.title).toBe('Error');
            expect(toastDetail.message).toBe('Board name is required');
            expect(toastDetail.variant).toBe('error');
            expect(createBoard).not.toHaveBeenCalled();
            expect(createBoardWithDefaultColumns).not.toHaveBeenCalled();
        });

        it('opens edit board modal and updates board', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            updateBoard.mockResolvedValue({});

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            // Trigger edit via board action
            const editItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'edit'
            );
            expect(editItems.length).toBeGreaterThan(0);
            simulateBoardAction(editItems[0], 'edit', 'board1');
            await flushPromises();

            const modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            const heading = element.shadowRoot.querySelector(
                '#board-modal-heading'
            );
            expect(heading.textContent).toContain('Edit Board');

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Save');
            expect(saveBtn).toBeTruthy();

            getBoards.mockResolvedValue(MOCK_BOARDS);
            saveBtn.click();
            await flushPromises();

            expect(updateBoard).toHaveBeenCalledWith({
                boardId: 'board1',
                updates: expect.objectContaining({
                    name: 'Project Alpha'
                })
            });
        });

        it('handles board save error', async () => {
            getBoards.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_BOARDS);
            createBoardWithDefaultColumns.mockRejectedValue({
                body: { message: 'Create failed' }
            });

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            const nameInput = findInputByField(
                element.shadowRoot,
                'name',
                'lightning-input'
            );
            simulateInputChange(nameInput, 'Fail Board');
            await flushPromises();

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            const errorToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'error'
            );
            expect(errorToast).toBeTruthy();
            expect(errorToast[0].detail.message).toBe('Create failed');
        });

        it('closes board modal on cancel', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            let modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            const cancelBtn = findButtonByLabel(element.shadowRoot, 'Cancel');
            cancelBtn.click();
            await flushPromises();

            modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"]'
            );
            expect(modal).toBeFalsy();
        });

        it('handles board form change for description and type', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            createBoardWithDefaultColumns.mockResolvedValue({ Id: 'new1' });

            const element = createComponent();
            await flushPromises();

            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            // Change description
            const descInput = findInputByField(
                element.shadowRoot,
                'description',
                'lightning-textarea'
            );
            simulateInputChange(descInput, 'New description');
            await flushPromises();

            // Change type
            const typeCombo = findInputByField(
                element.shadowRoot,
                'type',
                'lightning-combobox'
            );
            simulateInputChange(typeCombo, 'Team');
            await flushPromises();

            // Set name
            const nameInput = findInputByField(
                element.shadowRoot,
                'name',
                'lightning-input'
            );
            simulateInputChange(nameInput, 'My Board');
            await flushPromises();

            getBoards.mockResolvedValue(MOCK_BOARDS);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createBoardWithDefaultColumns).toHaveBeenCalledWith({
                name: 'My Board',
                description: 'New description',
                boardType: 'Team'
            });
        });
    });

    // ================================================================
    // Board Delete
    // ================================================================
    describe('Board Delete', () => {
        it('opens delete confirmation modal for board', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const deleteItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'delete'
            );
            simulateBoardAction(deleteItems[0], 'delete', 'board1');
            await flushPromises();

            const deleteModal = element.shadowRoot.querySelector(
                'section[aria-labelledby="delete-modal-heading"]'
            );
            expect(deleteModal).toBeTruthy();
        });

        it('deletes board on confirm', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            deleteBoard.mockResolvedValue({});

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const deleteItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'delete'
            );
            simulateBoardAction(deleteItems[0], 'delete', 'board1');
            await flushPromises();

            getBoards.mockResolvedValue([MOCK_BOARDS[1]]);
            const confirmBtn = findButtonByLabel(element.shadowRoot, 'Delete');
            confirmBtn.click();
            await flushPromises();

            expect(deleteBoard).toHaveBeenCalledWith({
                boardId: 'board1'
            });
            const successToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'success'
            );
            expect(successToast).toBeTruthy();
        });

        it('clears selected board when deleting the active board', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);
            deleteBoard.mockResolvedValue({});

            const element = createComponent();
            await flushPromises();

            // Select board1 via Manage Columns
            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            // Delete board1
            const deleteItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'delete'
            );
            simulateBoardAction(deleteItems[0], 'delete', 'board1');
            await flushPromises();

            getBoards.mockResolvedValue([MOCK_BOARDS[1]]);
            const confirmBtn = findButtonByLabel(element.shadowRoot, 'Delete');
            confirmBtn.click();
            await flushPromises();

            expect(deleteBoard).toHaveBeenCalledWith({
                boardId: 'board1'
            });
        });

        it('closes delete modal on cancel', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const deleteItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'delete'
            );
            simulateBoardAction(deleteItems[0], 'delete', 'board1');
            await flushPromises();

            let deleteModal = element.shadowRoot.querySelector(
                'section[aria-labelledby="delete-modal-heading"]'
            );
            expect(deleteModal).toBeTruthy();

            // Click the close button on the delete modal
            const closeBtn = deleteModal.querySelector('.slds-modal__close');
            closeBtn.click();
            await flushPromises();

            deleteModal = element.shadowRoot.querySelector(
                'section[aria-labelledby="delete-modal-heading"]'
            );
            expect(deleteModal).toBeFalsy();
        });

        it('handles delete error', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            deleteBoard.mockRejectedValue({
                body: { message: 'Cannot delete' }
            });

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const deleteItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'delete'
            );
            simulateBoardAction(deleteItems[0], 'delete', 'board1');
            await flushPromises();

            const confirmBtn = findButtonByLabel(element.shadowRoot, 'Delete');
            confirmBtn.click();
            await flushPromises();

            const errorToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'error'
            );
            expect(errorToast).toBeTruthy();
        });
    });

    // ================================================================
    // Board Actions via Menu
    // ================================================================
    describe('Board Actions via Menu', () => {
        it('navigates to columns when "columns" action selected', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const columnsItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'columns'
            );
            simulateBoardAction(columnsItems[0], 'columns', 'board1');
            await flushPromises();

            expect(getColumns).toHaveBeenCalledWith({
                boardId: 'board1'
            });
        });

        it('navigates to columns via Manage Columns button', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            expect(getColumns).toHaveBeenCalledWith({
                boardId: 'board1'
            });
        });
    });

    // ================================================================
    // Column CRUD
    // ================================================================
    describe('Column CRUD', () => {
        async function setupColumnsView() {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            return element;
        }

        it('loads and displays columns', async () => {
            const element = await setupColumnsView();

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');
            expect(columnItems.length).toBe(3);

            const headers = element.shadowRoot.querySelectorAll(
                '.column-header-text'
            );
            expect(headers[0].textContent).toBe('To Do');
            expect(headers[1].textContent).toBe('In Progress');
            expect(headers[2].textContent).toBe('Done');
        });

        it('shows select board message when no board selected', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            const emptyStates =
                element.shadowRoot.querySelectorAll('.empty-state');
            const selectBoardMsg = Array.from(emptyStates).find((el) =>
                el.textContent.includes('Select a Board')
            );
            expect(selectBoardMsg).toBeTruthy();
        });

        it('shows no columns message when board has no columns', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue([]);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            const emptyStates =
                element.shadowRoot.querySelectorAll('.empty-state');
            const noColumnsMsg = Array.from(emptyStates).find((el) =>
                el.textContent.includes('No Columns Yet')
            );
            expect(noColumnsMsg).toBeTruthy();
        });

        it('selects board from combobox', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const combobox = element.shadowRoot.querySelector('.board-select');
            combobox.dispatchEvent(
                new CustomEvent('change', {
                    detail: { value: 'board2' }
                })
            );
            await flushPromises();

            expect(getColumns).toHaveBeenCalledWith({
                boardId: 'board2'
            });
        });

        it('opens new column modal', async () => {
            const element = await setupColumnsView();

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="column-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            const heading = element.shadowRoot.querySelector(
                '#column-modal-heading'
            );
            expect(heading.textContent).toContain('New Column');
        });

        it('creates new column', async () => {
            const element = await setupColumnsView();
            createColumn.mockResolvedValue({ Id: 'newCol' });
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'Review');
            await flushPromises();

            getColumns.mockResolvedValue([...MOCK_COLUMNS]);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createColumn).toHaveBeenCalledWith({
                boardId: 'board1',
                columnHeader: 'Review',
                category: 'To Do',
                color: '#1B96FF',
                previousPosition: 3,
                nextPosition: null
            });
        });

        it('shows validation error when column header is empty', async () => {
            const element = await setupColumnsView();

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(toastHandler).toHaveBeenCalled();
            const toastDetail = toastHandler.mock.calls[0][0].detail;
            expect(toastDetail.message).toBe('Column header is required');
            expect(toastDetail.variant).toBe('error');
            expect(createColumn).not.toHaveBeenCalled();
        });

        it('opens edit column modal with existing data', async () => {
            const element = await setupColumnsView();

            const editBtns = findAllButtonIconsByName(
                element.shadowRoot,
                'utility:edit'
            );
            editBtns[0].click();
            await flushPromises();

            const modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="column-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            const heading = element.shadowRoot.querySelector(
                '#column-modal-heading'
            );
            expect(heading.textContent).toContain('Edit Column');

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Save');
            expect(saveBtn).toBeTruthy();
        });

        it('updates column on save in edit mode', async () => {
            const element = await setupColumnsView();
            updateColumn.mockResolvedValue({});
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const editBtns = findAllButtonIconsByName(
                element.shadowRoot,
                'utility:edit'
            );
            editBtns[0].click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'Updated To Do');
            await flushPromises();

            getColumns.mockResolvedValue(MOCK_COLUMNS);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Save');
            saveBtn.click();
            await flushPromises();

            expect(updateColumn).toHaveBeenCalledWith({
                columnId: 'col1',
                updates: {
                    columnHeader: 'Updated To Do',
                    category: 'To Do',
                    color: '#1B96FF'
                }
            });
        });

        it('closes column modal on cancel', async () => {
            const element = await setupColumnsView();

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            let modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="column-modal-heading"]'
            );
            expect(modal).toBeTruthy();

            // Use the close button on the column modal
            const closeBtn = modal.querySelector('.slds-modal__close');
            closeBtn.click();
            await flushPromises();

            modal = element.shadowRoot.querySelector(
                'section[aria-labelledby="column-modal-heading"]'
            );
            expect(modal).toBeFalsy();
        });

        it('handles column save error', async () => {
            const element = await setupColumnsView();
            createColumn.mockRejectedValue({
                body: { message: 'Column save error' }
            });

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'Error Column');
            await flushPromises();

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            const errorToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'error'
            );
            expect(errorToast).toBeTruthy();
            expect(errorToast[0].detail.message).toBe('Column save error');
        });

        it('handles column form change for category and color', async () => {
            const element = await setupColumnsView();
            createColumn.mockResolvedValue({ Id: 'newCol2' });
            getColumns.mockResolvedValue(MOCK_COLUMNS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            // Change category
            const catCombo = findInputByField(
                element.shadowRoot,
                'category',
                'lightning-combobox'
            );
            simulateInputChange(catCombo, 'In Progress');
            await flushPromises();

            // Change color
            const colorInput = findInputByField(
                element.shadowRoot,
                'color',
                'lightning-input'
            );
            simulateInputChange(colorInput, '#FF0000');
            await flushPromises();

            // Set header
            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'WIP');
            await flushPromises();

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createColumn).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: 'In Progress',
                    color: '#FF0000',
                    columnHeader: 'WIP'
                })
            );
        });

        it('creates column with null previousPosition when no columns', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue([]);
            createColumn.mockResolvedValue({ Id: 'newCol3' });

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'First Column');
            await flushPromises();

            getColumns.mockResolvedValue([]);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(createColumn).toHaveBeenCalledWith(
                expect.objectContaining({
                    previousPosition: null,
                    nextPosition: null
                })
            );
        });
    });

    // ================================================================
    // Column Delete
    // ================================================================
    describe('Column Delete', () => {
        async function setupColumnsView() {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            return element;
        }

        it('opens delete confirmation for column', async () => {
            const element = await setupColumnsView();

            const deleteBtns = findAllButtonIconsByName(
                element.shadowRoot,
                'utility:delete'
            );
            deleteBtns[0].click();
            await flushPromises();

            const deleteModal = element.shadowRoot.querySelector(
                'section[aria-labelledby="delete-modal-heading"]'
            );
            expect(deleteModal).toBeTruthy();
        });

        it('deletes column on confirm', async () => {
            const element = await setupColumnsView();
            deleteColumn.mockResolvedValue({});

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const deleteBtns = findAllButtonIconsByName(
                element.shadowRoot,
                'utility:delete'
            );
            deleteBtns[0].click();
            await flushPromises();

            getColumns.mockResolvedValue([MOCK_COLUMNS[1], MOCK_COLUMNS[2]]);

            const confirmBtn = findButtonByLabel(element.shadowRoot, 'Delete');
            confirmBtn.click();
            await flushPromises();

            expect(deleteColumn).toHaveBeenCalledWith({
                columnId: 'col1'
            });
        });
    });

    // ================================================================
    // Column Drag and Drop
    // ================================================================
    describe('Column Drag and Drop', () => {
        async function setupColumnsView() {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            return element;
        }

        it('handles dragstart event', async () => {
            const element = await setupColumnsView();

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');
            const dragEvent = new Event('dragstart', { bubbles: true });
            Object.defineProperty(dragEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });

            columnItems[0].dispatchEvent(dragEvent);
            await flushPromises();

            expect(dragEvent.dataTransfer.effectAllowed).toBe('move');
        });

        it('handles dragover event', async () => {
            const element = await setupColumnsView();

            const columnsList =
                element.shadowRoot.querySelector('.columns-list');
            const dragOverEvent = new Event('dragover', {
                bubbles: true,
                cancelable: true
            });
            Object.defineProperty(dragOverEvent, 'dataTransfer', {
                value: { dropEffect: '' }
            });

            columnsList.dispatchEvent(dragOverEvent);

            expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
        });

        it('handles dragenter on different column', async () => {
            const element = await setupColumnsView();

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Start dragging col1
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[0].dispatchEvent(dragStartEvent);
            await flushPromises();

            // Enter col2
            const dragEnterEvent = new Event('dragenter', {
                bubbles: true,
                cancelable: true
            });
            columnItems[1].dispatchEvent(dragEnterEvent);
            await flushPromises();
        });

        it('handles dragenter on same column (no-op)', async () => {
            const element = await setupColumnsView();

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Start dragging col1
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[0].dispatchEvent(dragStartEvent);
            await flushPromises();

            // Enter same col1
            const dragEnterEvent = new Event('dragenter', {
                bubbles: true,
                cancelable: true
            });
            columnItems[0].dispatchEvent(dragEnterEvent);
            await flushPromises();
        });

        it('handles dragend event', async () => {
            const element = await setupColumnsView();

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Start drag
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[0].dispatchEvent(dragStartEvent);
            await flushPromises();

            // End drag
            const dragEndEvent = new Event('dragend', { bubbles: true });
            columnItems[0].dispatchEvent(dragEndEvent);
            await flushPromises();
        });

        it('handles drop event - reorders columns', async () => {
            const element = await setupColumnsView();
            reorderColumn.mockResolvedValue({});

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Start dragging col1
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[0].dispatchEvent(dragStartEvent);
            await flushPromises();

            // Enter col3
            const dragEnterEvent = new Event('dragenter', {
                bubbles: true,
                cancelable: true
            });
            columnItems[2].dispatchEvent(dragEnterEvent);
            await flushPromises();

            // Drop
            const columnsList =
                element.shadowRoot.querySelector('.columns-list');
            const dropEvent = new Event('drop', {
                bubbles: true,
                cancelable: true
            });
            columnsList.dispatchEvent(dropEvent);
            await flushPromises();

            expect(reorderColumn).toHaveBeenCalledWith({
                columnId: 'col1',
                previousPosition: 3,
                nextPosition: null
            });
        });

        it('handles drop with no drag IDs (no-op)', async () => {
            const element = await setupColumnsView();

            const columnsList =
                element.shadowRoot.querySelector('.columns-list');
            const dropEvent = new Event('drop', {
                bubbles: true,
                cancelable: true
            });
            columnsList.dispatchEvent(dropEvent);
            await flushPromises();

            expect(reorderColumn).not.toHaveBeenCalled();
        });

        it('handles reorder error', async () => {
            const element = await setupColumnsView();
            reorderColumn.mockRejectedValue({
                body: { message: 'Reorder failed' }
            });

            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Start dragging col1
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[0].dispatchEvent(dragStartEvent);
            await flushPromises();

            // Enter col2
            const dragEnterEvent = new Event('dragenter', {
                bubbles: true,
                cancelable: true
            });
            columnItems[1].dispatchEvent(dragEnterEvent);
            await flushPromises();

            // Drop
            getColumns.mockResolvedValue(MOCK_COLUMNS);
            const columnsList =
                element.shadowRoot.querySelector('.columns-list');
            const dropEvent = new Event('drop', {
                bubbles: true,
                cancelable: true
            });
            columnsList.dispatchEvent(dropEvent);
            await flushPromises();

            const errorToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'error'
            );
            expect(errorToast).toBeTruthy();
        });

        it('moves last column to first position', async () => {
            const element = await setupColumnsView();
            reorderColumn.mockResolvedValue({});

            const columnItems =
                element.shadowRoot.querySelectorAll('.column-item');

            // Drag col3
            const dragStartEvent = new Event('dragstart', {
                bubbles: true
            });
            Object.defineProperty(dragStartEvent, 'dataTransfer', {
                value: { effectAllowed: '' }
            });
            columnItems[2].dispatchEvent(dragStartEvent);
            await flushPromises();

            // Enter col1
            const dragEnterEvent = new Event('dragenter', {
                bubbles: true,
                cancelable: true
            });
            columnItems[0].dispatchEvent(dragEnterEvent);
            await flushPromises();

            // Drop
            const columnsList =
                element.shadowRoot.querySelector('.columns-list');
            const dropEvent = new Event('drop', {
                bubbles: true,
                cancelable: true
            });
            columnsList.dispatchEvent(dropEvent);
            await flushPromises();

            expect(reorderColumn).toHaveBeenCalledWith({
                columnId: 'col3',
                previousPosition: null,
                nextPosition: 1
            });
        });
    });

    // ================================================================
    // Column Loading
    // ================================================================
    describe('Column Loading', () => {
        it('handles column load error', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockRejectedValue({
                body: { message: 'Columns load failed' }
            });

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            const errorToast = toastHandler.mock.calls.find(
                (call) => call[0].detail.variant === 'error'
            );
            expect(errorToast).toBeTruthy();
            expect(errorToast[0].detail.message).toBe('Columns load failed');
        });

        it('does not load columns when no board selected', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            createComponent();
            await flushPromises();

            expect(getColumns).not.toHaveBeenCalled();
        });
    });

    // ================================================================
    // Refresh Onboarding
    // ================================================================
    describe('Refresh Onboarding', () => {
        it('refreshes onboarding after column save', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_COLUMNS);
            getColumns.mockResolvedValue(MOCK_COLUMNS);
            createColumn.mockResolvedValue({ Id: 'newCol' });

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            getOnboardingStatus.mockClear();
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'New Col');
            await flushPromises();

            getColumns.mockResolvedValue(MOCK_COLUMNS);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            expect(getOnboardingStatus).toHaveBeenCalled();
        });

        it('handles refreshOnboarding error gracefully', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_NO_COLUMNS);
            getColumns.mockResolvedValue(MOCK_COLUMNS);
            createColumn.mockResolvedValue({ Id: 'newCol' });

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            getOnboardingStatus.mockRejectedValue(new Error('refresh fail'));

            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            const headerInput = findInputByField(
                element.shadowRoot,
                'columnHeader',
                'lightning-input'
            );
            simulateInputChange(headerInput, 'New Col');
            await flushPromises();

            getColumns.mockResolvedValue(MOCK_COLUMNS);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Create');
            saveBtn.click();
            await flushPromises();

            // Should not throw
            expect(createColumn).toHaveBeenCalled();
        });
    });

    // ================================================================
    // Board Form Toggle Fields
    // ================================================================
    describe('Board Form Toggle Fields', () => {
        it('handles toggle field changes in edit mode', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            updateBoard.mockResolvedValue({});

            const element = createComponent();
            const toastHandler = jest.fn();
            element.addEventListener('lightning__showtoast', toastHandler);
            await flushPromises();

            // Click edit
            const editItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'edit'
            );
            simulateBoardAction(editItems[0], 'edit', 'board1');
            await flushPromises();

            const heading = element.shadowRoot.querySelector(
                '#board-modal-heading'
            );
            expect(heading.textContent).toContain('Edit Board');

            // Find toggle inputs
            const allInputs =
                element.shadowRoot.querySelectorAll('lightning-input');
            const toggles = Array.from(allInputs).filter(
                (i) => i.type === 'toggle'
            );
            expect(toggles.length).toBe(3);

            // Toggle active off
            simulateCheckboxChange(toggles[0], false);
            await flushPromises();

            // Toggle email on
            simulateCheckboxChange(toggles[1], true);
            await flushPromises();

            // Toggle SF notifications on
            simulateCheckboxChange(toggles[2], true);
            await flushPromises();

            getBoards.mockResolvedValue(MOCK_BOARDS);
            const saveBtn = findButtonByLabel(element.shadowRoot, 'Save');
            saveBtn.click();
            await flushPromises();

            expect(updateBoard).toHaveBeenCalledWith({
                boardId: 'board1',
                updates: expect.objectContaining({
                    name: 'Project Alpha',
                    active: false,
                    emailNotifications: true,
                    salesforceNotifications: true
                })
            });
        });
    });

    // ================================================================
    // Modal Computed Properties
    // ================================================================
    describe('Modal Computed Properties', () => {
        it('shows defaults checkbox for new board, not for edit', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);

            const element = createComponent();
            await flushPromises();

            // New board - should have checkbox
            const newBoardBtn = findButtonByLabel(
                element.shadowRoot,
                'New Board'
            );
            newBoardBtn.click();
            await flushPromises();

            let allInputs =
                element.shadowRoot.querySelectorAll('lightning-input');
            let checkbox = Array.from(allInputs).find(
                (i) => i.type === 'checkbox'
            );
            expect(checkbox).toBeTruthy();

            // Close modal
            const closeBtn = element.shadowRoot.querySelector(
                'section[aria-labelledby="board-modal-heading"] .slds-modal__close'
            );
            closeBtn.click();
            await flushPromises();

            // Edit board - should NOT have checkbox but should have toggles
            const editItems = findAllMenuItemsByValue(
                element.shadowRoot,
                'edit'
            );
            simulateBoardAction(editItems[0], 'edit', 'board1');
            await flushPromises();

            allInputs = element.shadowRoot.querySelectorAll('lightning-input');
            checkbox = Array.from(allInputs).find((i) => i.type === 'checkbox');
            expect(checkbox).toBeFalsy();
        });

        it('shows correct column modal titles for new and edit', async () => {
            getBoards.mockResolvedValue(MOCK_BOARDS);
            getOnboardingStatus.mockResolvedValue(MOCK_ONBOARDING_COMPLETE);
            getColumns.mockResolvedValue(MOCK_COLUMNS);

            const element = createComponent();
            await flushPromises();

            const manageBtns = findAllButtonsByLabel(
                element.shadowRoot,
                'Manage Columns'
            );
            manageBtns[0].click();
            await flushPromises();

            // New column
            const addColBtn = findButtonByLabel(
                element.shadowRoot,
                'Add Column'
            );
            addColBtn.click();
            await flushPromises();

            let heading = element.shadowRoot.querySelector(
                '#column-modal-heading'
            );
            expect(heading.textContent).toContain('New Column');

            // Close
            const closeBtn = element.shadowRoot.querySelector(
                'section[aria-labelledby="column-modal-heading"] .slds-modal__close'
            );
            closeBtn.click();
            await flushPromises();

            // Edit column
            const editBtns = findAllButtonIconsByName(
                element.shadowRoot,
                'utility:edit'
            );
            editBtns[0].click();
            await flushPromises();

            heading = element.shadowRoot.querySelector('#column-modal-heading');
            expect(heading.textContent).toContain('Edit Column');
        });
    });
});
