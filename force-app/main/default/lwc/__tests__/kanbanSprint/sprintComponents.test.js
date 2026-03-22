import { createElement } from '@lwc/engine-dom';

// Mock the store module before importing components
jest.mock('c/kanbanStore', () => {
    return {
        selectors: {
            getActiveSprint: jest.fn(),
            getSprints: jest.fn(() => []),
            getSprintCards: jest.fn(() => []),
            getSprintProgress: jest.fn(() => 0),
            getSprintDaysRemaining: jest.fn(() => null)
        },
        createSprintAsync: jest.fn(() => jest.fn()),
        startSprintAsync: jest.fn(() => jest.fn()),
        completeSprintAsync: jest.fn(() => jest.fn()),
        loadBurndownDataAsync: jest.fn(() => jest.fn()),
        loadVelocityDataAsync: jest.fn(() => jest.fn())
    };
});

import KanbanSprintHeader from 'c/kanbanSprintHeader';
import KanbanSprintModal from 'c/kanbanSprintModal';
import KanbanSprintComplete from 'c/kanbanSprintComplete';
import KanbanSprintReports from 'c/kanbanSprintReports';
import KanbanContextMenu from 'c/kanbanContextMenu';
import {
    selectors,
    createSprintAsync,
    startSprintAsync,
    completeSprintAsync,
    loadBurndownDataAsync,
    loadVelocityDataAsync
} from 'c/kanbanStore';

// Helper: create a mock store
function createMockStore(state = {}) {
    const mockState = {
        columns: [],
        board: null,
        sprints: [],
        sprintCards: [],
        ...state
    };

    return {
        subscribe: jest.fn((cb) => {
            cb(mockState);
            return jest.fn(); // unsubscribe
        }),
        dispatch: jest.fn(async (action) => {
            if (typeof action === 'function') {
                return action(
                    () => {},
                    () => mockState
                );
            }
            return action;
        }),
        getState: jest.fn(() => mockState)
    };
}

// Flush microtasks and DOM updates
function flushPromises() {
    return new Promise((resolve) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(resolve, 0);
    });
}

// Helper to find lightning stub elements by property (attribute selectors don't work on LWC stubs)
function findByProp(root, tag, prop, value) {
    const els = root.querySelectorAll(tag);
    return Array.from(els).find((el) => el[prop] === value) || null;
}

// ============================================================
// KanbanSprintHeader Tests
// ============================================================
describe('c-kanban-sprint-header', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    function createComponent(props = {}) {
        const element = createElement('c-kanban-sprint-header', {
            is: KanbanSprintHeader
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    test('subscribes to store and renders sprint name, goal, progress in DOM', async () => {
        const mockStore = createMockStore();
        const mockSprint = {
            Id: 'sprint1',
            Name: 'Sprint 1',
            goal: 'Deliver feature X',
            status: 'Active',
            startDate: '2026-03-01',
            endDate: '2026-03-14',
            completedStoryPoints: 5,
            totalStoryPoints: 13
        };

        selectors.getActiveSprint.mockReturnValue(mockSprint);
        selectors.getSprintProgress.mockReturnValue(38);
        selectors.getSprintDaysRemaining.mockReturnValue(5);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        expect(mockStore.subscribe).toHaveBeenCalled();
        expect(mockStore.getState).toHaveBeenCalled();

        // Sprint name rendered
        const nameSpan = element.shadowRoot.querySelector(
            '.sprint-inline__name'
        );
        expect(nameSpan).not.toBeNull();
        expect(nameSpan.textContent).toBe('Sprint 1');

        // Goal rendered
        const goalSpan = element.shadowRoot.querySelector(
            '.sprint-inline__goal'
        );
        expect(goalSpan).not.toBeNull();
        expect(goalSpan.textContent).toBe('Deliver feature X');

        // Progress bar fill
        const fill = element.shadowRoot.querySelector(
            '.sprint-inline__progress-fill'
        );
        expect(fill.style.cssText).toContain('width: 38%');

        // Progress label
        const label = element.shadowRoot.querySelector(
            '.sprint-inline__progress-label'
        );
        expect(label.textContent).toBe('5 / 13 pts (38%)');

        // Complete button visible (find by checking all lightning-buttons)
        const allBtns = element.shadowRoot.querySelectorAll('lightning-button');
        const completeBtn = Array.from(allBtns).find(
            (b) => b.label === 'Complete'
        );
        expect(completeBtn).toBeTruthy();
    });

    test('renders "No active sprint" and New Sprint button when no sprint', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue(null);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const emptyLabel = element.shadowRoot.querySelector(
            '.sprint-inline__empty'
        );
        expect(emptyLabel).not.toBeNull();
        expect(emptyLabel.textContent).toBe('No active sprint');

        const newBtn = findByProp(
            element.shadowRoot,
            'lightning-button',
            'label',
            'New Sprint'
        );
        expect(newBtn).not.toBeNull();

        // Complete button should NOT exist
        const completeBtn = findByProp(
            element.shadowRoot,
            'lightning-button',
            'label',
            'Complete'
        );
        expect(completeBtn).toBeNull();
    });

    test('renders days remaining text with correct class for overdue sprint', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            Name: 'S',
            status: 'Active',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });
        selectors.getSprintProgress.mockReturnValue(0);
        selectors.getSprintDaysRemaining.mockReturnValue(-3);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const daysSpan = element.shadowRoot.querySelector(
            '.slds-text-color_error'
        );
        expect(daysSpan).not.toBeNull();
        expect(daysSpan.textContent).toBe('3d overdue');
    });

    test('renders "Last day" and error class for 0 days remaining', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            Name: 'S',
            status: 'Active',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });
        selectors.getSprintProgress.mockReturnValue(0);
        selectors.getSprintDaysRemaining.mockReturnValue(0);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const daysSpan = element.shadowRoot.querySelector(
            '.slds-text-color_error'
        );
        expect(daysSpan).not.toBeNull();
        expect(daysSpan.textContent).toBe('Last day');
    });

    test('renders warning class for 2 days remaining', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            Name: 'S',
            status: 'Active',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });
        selectors.getSprintProgress.mockReturnValue(0);
        selectors.getSprintDaysRemaining.mockReturnValue(2);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const daysSpan = element.shadowRoot.querySelector(
            '.slds-text-color_warning'
        );
        expect(daysSpan).not.toBeNull();
        expect(daysSpan.textContent).toBe('2d remaining');
    });

    test('handleCompleteSprint dispatches completesprint event with sprintId', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 'sprint1',
            status: 'Active',
            Name: 'Sprint 1',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });
        selectors.getSprintProgress.mockReturnValue(50);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('completesprint', handler);

        const completeBtn = findByProp(
            element.shadowRoot,
            'lightning-button',
            'label',
            'Complete'
        );
        completeBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.sprintId).toBe('sprint1');
    });

    test('handleCreateSprint dispatches createsprint event', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue(null);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('createsprint', handler);

        const newBtn = findByProp(
            element.shadowRoot,
            'lightning-button',
            'label',
            'New Sprint'
        );
        newBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('handleShowReports dispatches showreports event', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 'sprint1',
            status: 'Active',
            Name: 'Sprint 1',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('showreports', handler);

        const reportBtn = findByProp(
            element.shadowRoot,
            'lightning-button-icon',
            'iconName',
            'utility:chart'
        );
        reportBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.sprintId).toBe('sprint1');
    });

    test('unsubscribes from store on disconnectedCallback', () => {
        const unsubscribe = jest.fn();
        const mockStore = createMockStore();
        mockStore.subscribe.mockReturnValue(unsubscribe);

        const element = createComponent({ store: mockStore });
        document.body.removeChild(element);

        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    test('does not render sprint when no store is provided', async () => {
        const element = createComponent({});
        await flushPromises();

        // Should render the "no sprint" path
        const emptyLabel = element.shadowRoot.querySelector(
            '.sprint-inline__empty'
        );
        expect(emptyLabel).not.toBeNull();
    });

    test('hides Complete button when sprint is not Active', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Planning',
            Name: 'S',
            completedStoryPoints: 0,
            totalStoryPoints: 10
        });
        selectors.getSprintProgress.mockReturnValue(0);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const completeBtn = findByProp(
            element.shadowRoot,
            'lightning-button',
            'label',
            'Complete'
        );
        expect(completeBtn).toBeNull();
    });
});

// ============================================================
// KanbanSprintModal Tests
// ============================================================
describe('c-kanban-sprint-modal', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    function createComponent(props = {}) {
        const element = createElement('c-kanban-sprint-modal', {
            is: KanbanSprintModal
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    test('renders Create Sprint modal in create mode', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        // Modal title
        const title = element.shadowRoot.querySelector('.slds-modal__title');
        expect(title.textContent).toContain('Create Sprint');

        // Start Sprint button should NOT be visible (canStart is false)
        const startBtn = element.shadowRoot.querySelector(
            'button.slds-button_outline-brand'
        );
        expect(startBtn).toBeNull();

        // Save button visible
        const saveBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        expect(saveBtn).not.toBeNull();
        expect(saveBtn.textContent).toContain('Save');
    });

    test('renders Edit Sprint modal with Start Sprint button for Planning sprint', async () => {
        const sprint = {
            Id: 's1',
            goal: 'Deliver MVP',
            startDate: '2026-03-01',
            endDate: '2026-03-14',
            status: 'Planning'
        };

        const element = createComponent({
            isOpen: true,
            boardId: 'board1',
            sprint
        });
        await flushPromises();

        const title = element.shadowRoot.querySelector('.slds-modal__title');
        expect(title.textContent).toContain('Edit Sprint');

        // Start Sprint button visible (Planning status)
        const startBtn = element.shadowRoot.querySelector(
            'button.slds-button_outline-brand'
        );
        expect(startBtn).not.toBeNull();
        expect(startBtn.textContent).toContain('Start Sprint');
    });

    test('Save button calls createSprintAsync and emits sprintcreated + close', async () => {
        const mockStore = createMockStore();
        const mockResult = { sprint: { Id: 'newSprint1' } };

        createSprintAsync.mockReturnValue(() => Promise.resolve(mockResult));
        mockStore.dispatch.mockResolvedValue(mockResult);

        const element = createComponent({
            isOpen: true,
            boardId: 'board1',
            store: mockStore
        });
        await flushPromises();

        const createdHandler = jest.fn();
        const closeHandler = jest.fn();
        element.addEventListener('sprintcreated', createdHandler);
        element.addEventListener('close', closeHandler);

        // Click Save
        const saveBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        saveBtn.click();
        await flushPromises();

        expect(mockStore.dispatch).toHaveBeenCalled();
        expect(createSprintAsync).toHaveBeenCalledWith(
            'board1',
            expect.any(String),
            expect.any(String),
            expect.any(String)
        );
        expect(createdHandler).toHaveBeenCalledTimes(1);
        expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    test('Save does nothing when no store is provided', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const saveBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        saveBtn.click();
        await flushPromises();

        expect(createSprintAsync).not.toHaveBeenCalled();
    });

    test('Start Sprint button calls startSprintAsync and emits sprintstarted + close', async () => {
        const mockStore = createMockStore();
        const sprint = {
            Id: 's1',
            status: 'Planning',
            goal: 'G',
            startDate: '2026-03-01',
            endDate: '2026-03-14'
        };

        startSprintAsync.mockReturnValue(() => Promise.resolve());
        mockStore.dispatch.mockResolvedValue();

        const element = createComponent({
            isOpen: true,
            boardId: 'board1',
            sprint,
            store: mockStore
        });
        await flushPromises();

        const startedHandler = jest.fn();
        const closeHandler = jest.fn();
        element.addEventListener('sprintstarted', startedHandler);
        element.addEventListener('close', closeHandler);

        const startBtn = element.shadowRoot.querySelector(
            'button.slds-button_outline-brand'
        );
        startBtn.click();
        await flushPromises();

        expect(startSprintAsync).toHaveBeenCalledWith('s1');
        expect(startedHandler).toHaveBeenCalledTimes(1);
        expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    test('Cancel button dispatches close event', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const cancelBtn = element.shadowRoot.querySelector(
            'button.slds-button_neutral'
        );
        cancelBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('Escape key on dialog dispatches close event', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        dialog.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('non-Escape key does not close', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        dialog.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );

        expect(handler).not.toHaveBeenCalled();
    });

    test('does not render dialog when isOpen is false', () => {
        const element = createComponent({ isOpen: false });

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).toBeNull();
    });

    test('close button (X) at top dispatches close', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const closeBtn = element.shadowRoot.querySelector(
            'button.slds-modal__close'
        );
        closeBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KanbanSprintComplete Tests
// ============================================================
describe('c-kanban-sprint-complete', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    function createComponent(props = {}) {
        const element = createElement('c-kanban-sprint-complete', {
            is: KanbanSprintComplete
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    const mockSprintCards = [
        {
            Id: 'sc1',
            cardId: 'c1',
            completedInSprint: true,
            storyPoints: 3
        },
        {
            Id: 'sc2',
            cardId: 'c2',
            completedInSprint: true,
            storyPoints: 5
        },
        {
            Id: 'sc3',
            cardId: 'c3',
            completedInSprint: false,
            storyPoints: 2
        },
        {
            Id: 'sc4',
            cardId: 'c4',
            completedInSprint: false,
            storyPoints: 1
        }
    ];

    test('renders step 1 summary with correct counts in DOM', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            completedStoryPoints: 8,
            totalStoryPoints: 11
        });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        expect(mockStore.subscribe).toHaveBeenCalled();

        // Step 1 heading
        const heading = element.shadowRoot.querySelector(
            '.slds-text-heading_medium'
        );
        expect(heading.textContent).toContain('Sprint Summary');

        // Count values in DOM (4 large headings: completed, incomplete, points done, total points)
        const counts = element.shadowRoot.querySelectorAll(
            '.slds-text-heading_large'
        );
        expect(counts.length).toBe(4);
        expect(counts[0].textContent.trim()).toBe('2'); // completed
        expect(counts[1].textContent.trim()).toBe('2'); // incomplete
        expect(counts[2].textContent.trim()).toBe('8'); // completed points
        expect(counts[3].textContent.trim()).toBe('11'); // total points

        // Next button
        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        expect(nextBtn.textContent).toContain('Next');
    });

    test('Next button navigates step 1 -> 2 -> 3 and Back goes back', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Step 1 -> 2 (has incomplete cards)
        let nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        // Step 2: disposition heading
        const heading = element.shadowRoot.querySelector(
            '.slds-text-heading_small'
        );
        expect(heading.textContent).toContain('incomplete cards');

        // Step 2 -> 3
        nextBtn = element.shadowRoot.querySelector('button.slds-button_brand');
        nextBtn.click();
        await flushPromises();

        // Step 3: Complete Sprint button
        const completeBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        expect(completeBtn.textContent).toContain('Complete Sprint');

        // Confirm text
        const confirmText = element.shadowRoot.querySelector(
            '.slds-text-heading_medium'
        );
        expect(confirmText.textContent).toContain('Ready to Complete Sprint');

        // Back button
        const backBtn = element.shadowRoot.querySelector(
            'button.slds-button_neutral'
        );
        backBtn.click();
        await flushPromises();

        // Back at step 2
        const heading2 = element.shadowRoot.querySelector(
            '.slds-text-heading_small'
        );
        expect(heading2.textContent).toContain('incomplete cards');
    });

    test('Next jumps directly to step 3 when no incomplete cards', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([
            { Id: 'sc1', cardId: 'c1', completedInSprint: true }
        ]);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        // Should be at step 3 directly
        const confirmHeading = element.shadowRoot.querySelector(
            '.slds-text-heading_medium'
        );
        expect(confirmHeading.textContent).toContain(
            'Ready to Complete Sprint'
        );
    });

    test('Complete Sprint button dispatches completeSprintAsync and events', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([
            { Id: 'sc1', cardId: 'c1', completedInSprint: true }
        ]);

        completeSprintAsync.mockReturnValue(() => Promise.resolve());
        mockStore.dispatch.mockResolvedValue();

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Navigate to step 3 (no incomplete cards, so Next goes straight to 3)
        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        const completedHandler = jest.fn();
        const closeHandler = jest.fn();
        element.addEventListener('sprintcompleted', completedHandler);
        element.addEventListener('close', closeHandler);

        const completeBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        completeBtn.click();
        await flushPromises();

        expect(completeSprintAsync).toHaveBeenCalledWith(
            's1',
            expect.any(Object)
        );
        expect(completedHandler).toHaveBeenCalledTimes(1);
        expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    test('Cancel button on step 1 dispatches close and resets state', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        // Cancel button at step 1
        const cancelBtn = element.shadowRoot.querySelector(
            'button.slds-button_neutral'
        );
        expect(cancelBtn.textContent).toContain('Cancel');
        cancelBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('Back button appears in steps 2 and 3 instead of Cancel', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Go to step 2
        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        const backBtn = element.shadowRoot.querySelector(
            'button.slds-button_neutral'
        );
        expect(backBtn.textContent).toContain('Back');
    });

    test('unsubscribes from store on disconnect', () => {
        const unsubscribe = jest.fn();
        const mockStore = createMockStore();
        mockStore.subscribe.mockReturnValue(unsubscribe);

        const element = createComponent({ store: mockStore, sprintId: 's1' });
        document.body.removeChild(element);

        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    test('does not render when isOpen is false', () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: false
        });

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).toBeNull();
    });

    test('close button (X) at top dispatches close', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([]);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const closeBtn = element.shadowRoot.querySelector(
            'button.slds-modal__close'
        );
        closeBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KanbanSprintReports Tests
// ============================================================
describe('c-kanban-sprint-reports', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // Mock canvas getContext for all reports tests
    const mockCtx = {
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        fillRect: jest.fn(),
        setLineDash: jest.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: ''
    };

    beforeEach(() => {
        // Override HTMLCanvasElement.prototype.getContext so chart drawing works
        HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);
    });

    function createComponent(props = {}) {
        const element = createElement('c-kanban-sprint-reports', {
            is: KanbanSprintReports
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    test('renders burndown tab by default with tab classes', async () => {
        const element = createComponent({ isOpen: true });
        await flushPromises();

        // Burndown tab is active
        const tabs = element.shadowRoot.querySelectorAll(
            '.slds-tabs_default__item'
        );
        expect(tabs.length).toBe(3);

        const activeTab = element.shadowRoot.querySelector(
            '.slds-tabs_default__item.slds-is-active'
        );
        expect(activeTab).not.toBeNull();

        const burndownLink = activeTab.querySelector('a[data-tab="burndown"]');
        expect(burndownLink).not.toBeNull();

        // Tab content should show "No burndown data" message
        const noDataMsg = element.shadowRoot.querySelector(
            '.slds-text-color_weak'
        );
        expect(noDataMsg.textContent).toContain('No burndown data');
    });

    test('tab click switches active tab content', async () => {
        const element = createComponent({ isOpen: true });
        await flushPromises();

        // Click velocity tab
        const velocityLink = element.shadowRoot.querySelector(
            'a[data-tab="velocity"]'
        );
        velocityLink.click();
        await flushPromises();

        // Velocity tab should now be active
        const activeTab = element.shadowRoot.querySelector(
            '.slds-tabs_default__item.slds-is-active'
        );
        const activeLink = activeTab.querySelector('a');
        expect(activeLink.dataset.tab).toBe('velocity');

        // Velocity no-data message
        const noDataMsg = element.shadowRoot.querySelector(
            '.slds-text-color_weak'
        );
        expect(noDataMsg.textContent).toContain('No completed sprints');

        // Click summary tab
        const summaryLink = element.shadowRoot.querySelector(
            'a[data-tab="summary"]'
        );
        summaryLink.click();
        await flushPromises();

        const summaryActive = element.shadowRoot.querySelector(
            '.slds-tabs_default__item.slds-is-active'
        );
        const summaryActiveLink = summaryActive.querySelector('a');
        expect(summaryActiveLink.dataset.tab).toBe('summary');
    });

    test('loadData fetches burndown and velocity data from store on connect', async () => {
        const mockStore = createMockStore();
        mockStore.dispatch
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] });

        loadBurndownDataAsync.mockReturnValue(jest.fn());
        loadVelocityDataAsync.mockReturnValue(jest.fn());

        createComponent({
            store: mockStore,
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: true
        });

        await flushPromises();

        expect(loadBurndownDataAsync).toHaveBeenCalledWith('sprint1');
        expect(loadVelocityDataAsync).toHaveBeenCalledWith('board1', 10);
        expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    });

    test('loadData handles errors gracefully', async () => {
        const mockStore = createMockStore();
        mockStore.dispatch.mockRejectedValue(new Error('Network error'));

        loadBurndownDataAsync.mockReturnValue(jest.fn());

        const consoleSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const element = createComponent({
            store: mockStore,
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: true
        });

        await flushPromises();

        // Should still render (not crash)
        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).not.toBeNull();
        consoleSpy.mockRestore();
    });

    test('does not call loadData when no store', async () => {
        createComponent({ isOpen: true });
        await flushPromises();

        expect(loadBurndownDataAsync).not.toHaveBeenCalled();
    });

    test('does not call loadData when isOpen is false', async () => {
        createComponent({
            store: createMockStore(),
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: false
        });
        await flushPromises();

        expect(loadBurndownDataAsync).not.toHaveBeenCalled();
    });

    test('Close button dispatches close event', async () => {
        const element = createComponent({ isOpen: true });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const closeBtn = element.shadowRoot.querySelector(
            '.slds-modal__footer button.slds-button_neutral'
        );
        closeBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('does not render when isOpen is false', () => {
        const element = createComponent({ isOpen: false });

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).toBeNull();
    });

    test('renders burndown canvas when burndownData is loaded', async () => {
        const mockStore = createMockStore();
        const burndownData = [
            {
                snapshotDate: '2026-03-01',
                totalPoints: 20,
                remainingPoints: 20
            },
            {
                snapshotDate: '2026-03-08',
                totalPoints: 20,
                remainingPoints: 10
            },
            {
                snapshotDate: '2026-03-14',
                totalPoints: 20,
                remainingPoints: 2
            }
        ];

        mockStore.dispatch
            .mockResolvedValueOnce({ data: burndownData })
            .mockResolvedValueOnce({ data: [] });

        loadBurndownDataAsync.mockReturnValue(jest.fn());
        loadVelocityDataAsync.mockReturnValue(jest.fn());

        const element = createComponent({
            store: mockStore,
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: true
        });

        await flushPromises();

        // Canvas should be rendered (burndownData loaded)
        const canvas = element.shadowRoot.querySelector('.burndown-canvas');
        expect(canvas).not.toBeNull();

        // getContext should have been called by drawBurndownChart via renderedCallback
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
            '2d'
        );
        expect(mockCtx.clearRect).toHaveBeenCalled();
        expect(mockCtx.stroke).toHaveBeenCalled();
    });
});

// ============================================================
// KanbanContextMenu Tests
// ============================================================
describe('c-kanban-context-menu', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    function createComponent(props = {}) {
        const element = createElement('c-kanban-context-menu', {
            is: KanbanContextMenu
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    const sampleMenuItems = [
        { label: 'Edit', value: 'edit', icon: 'utility:edit' },
        {
            label: 'Move',
            value: 'move',
            submenu: [
                { label: 'To Do', value: 'todo' },
                { label: 'Done', value: 'done' }
            ]
        },
        { label: 'Delete', value: 'delete', disabled: true },
        { label: 'Priority', value: 'priority', dividerBefore: true }
    ];

    test('show() renders the menu, hide() removes it', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        await flushPromises();

        // Initially not visible
        let menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();

        // Show
        element.show(100, 200);
        await flushPromises();

        menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();
        expect(menu.style.cssText).toContain('left: 100px');
        expect(menu.style.cssText).toContain('top: 200px');

        // Has menu items
        const items = menu.querySelectorAll('a[role="menuitem"]');
        expect(items.length).toBe(4);

        // Hide
        element.hide();
        await flushPromises();

        menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('renders disabled item with disabled class', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const disabledItem = element.shadowRoot.querySelector(
            '.context-menu__item--disabled'
        );
        expect(disabledItem).not.toBeNull();
    });

    test('renders divider before items with dividerBefore', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const separators = element.shadowRoot.querySelectorAll(
            '.slds-has-divider_top-space'
        );
        expect(separators.length).toBe(1);
    });

    test('clicking a regular item dispatches select event and hides menu', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('select', handler);

        const editLink = element.shadowRoot.querySelector(
            'a[data-value="edit"]'
        );
        editLink.click();
        await flushPromises();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.value).toBe('edit');

        // Menu hidden
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('clicking a disabled item does not dispatch select, menu stays open', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('select', handler);

        const deleteLink = element.shadowRoot.querySelector(
            'a[data-value="delete"]'
        );
        deleteLink.click();
        await flushPromises();

        expect(handler).not.toHaveBeenCalled();
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();
    });

    test('clicking item with submenu opens submenu, clicking sub-item dispatches select', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('select', handler);

        // Click Move to open submenu
        const moveLink = element.shadowRoot.querySelector(
            'a[data-value="move"]'
        );
        moveLink.click();
        await flushPromises();

        expect(handler).not.toHaveBeenCalled();

        // Submenu visible
        const submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).not.toBeNull();

        const subItems = submenu.querySelectorAll('a[role="menuitem"]');
        expect(subItems.length).toBe(2);
        expect(subItems[0].dataset.value).toBe('todo');
        expect(subItems[0].dataset.parent).toBe('move');

        // Click submenu item
        subItems[0].click();
        await flushPromises();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({
            value: 'move',
            subValue: 'todo'
        });

        // Menu hidden
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('clicking submenu parent twice toggles submenu off', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        // Open submenu
        const moveLink = element.shadowRoot.querySelector(
            'a[data-value="move"]'
        );
        moveLink.click();
        await flushPromises();

        let submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).not.toBeNull();

        // Click again to close
        const moveLink2 = element.shadowRoot.querySelector(
            'a[data-value="move"]'
        );
        moveLink2.click();
        await flushPromises();

        submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).toBeNull();
    });

    test('Escape key on menu hides it', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        let menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();

        // Dispatch Escape keydown on the menu div (onkeydown is on .context-menu)
        menu.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        await flushPromises();

        menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('disconnectedCallback hides the menu without error', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();

        // Remove from DOM triggers disconnectedCallback -> hide()
        expect(() => document.body.removeChild(element)).not.toThrow();
    });

    test('renders icon for items that have icon property', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        // Edit has icon, so lightning-icon should appear
        const icons = element.shadowRoot.querySelectorAll('lightning-icon');
        // At least one icon for 'Edit' item, plus chevronright for Move
        expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    test('renders chevron icon for items with submenu', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const allIcons = element.shadowRoot.querySelectorAll('lightning-icon');
        const chevrons = Array.from(allIcons).filter(
            (icon) => icon.iconName === 'utility:chevronright'
        );
        expect(chevrons.length).toBe(1); // Only 'Move' has submenu
    });
});
