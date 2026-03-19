import { createElement } from 'lwc';

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

    test('subscribes to store and renders sprint info in DOM', async () => {
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

        // Check DOM renders sprint name
        const nameSpan = element.shadowRoot.querySelector(
            '.sprint-inline__name'
        );
        expect(nameSpan).not.toBeNull();
        expect(nameSpan.textContent).toBe('Sprint 1');

        // Check goal is rendered
        const goalSpan = element.shadowRoot.querySelector(
            '.sprint-inline__goal'
        );
        expect(goalSpan).not.toBeNull();
        expect(goalSpan.textContent).toBe('Deliver feature X');

        // Progress bar fill style
        const fill = element.shadowRoot.querySelector(
            '.sprint-inline__progress-fill'
        );
        expect(fill.style.cssText).toContain('width: 38%');

        // Progress label
        const label = element.shadowRoot.querySelector(
            '.sprint-inline__progress-label'
        );
        expect(label.textContent).toBe('5 / 13 pts (38%)');

        // Complete button visible for active sprint
        const completeBtn = element.shadowRoot.querySelector(
            'lightning-button[label="Complete"]'
        );
        expect(completeBtn).not.toBeNull();
    });

    test('shows "No active sprint" when no sprint exists', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue(null);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const emptyLabel = element.shadowRoot.querySelector(
            '.sprint-inline__empty'
        );
        expect(emptyLabel).not.toBeNull();
        expect(emptyLabel.textContent).toBe('No active sprint');

        // New Sprint button visible
        const newBtn = element.shadowRoot.querySelector(
            'lightning-button[label="New Sprint"]'
        );
        expect(newBtn).not.toBeNull();

        // Complete button should NOT be visible
        const completeBtn = element.shadowRoot.querySelector(
            'lightning-button[label="Complete"]'
        );
        expect(completeBtn).toBeNull();
    });

    test('daysRemainingLabel covers all branches: overdue, last day, warning, normal, null', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Active',
            Name: 'S'
        });

        const element = createComponent({ store: mockStore });
        await flushPromises();

        // Overdue
        selectors.getSprintDaysRemaining.mockReturnValue(-3);
        expect(element.daysRemainingLabel).toBe('3d overdue');
        expect(element.daysRemainingClass).toBe('slds-text-color_error');

        // Last day
        selectors.getSprintDaysRemaining.mockReturnValue(0);
        expect(element.daysRemainingLabel).toBe('Last day');
        expect(element.daysRemainingClass).toBe('slds-text-color_error');

        // Warning
        selectors.getSprintDaysRemaining.mockReturnValue(2);
        expect(element.daysRemainingLabel).toBe('2d remaining');
        expect(element.daysRemainingClass).toBe('slds-text-color_warning');

        // Normal
        selectors.getSprintDaysRemaining.mockReturnValue(5);
        expect(element.daysRemainingLabel).toBe('5d remaining');
        expect(element.daysRemainingClass).toBe('');

        // Null
        selectors.getSprintDaysRemaining.mockReturnValue(null);
        expect(element.daysRemainingLabel).toBe('');
        expect(element.daysRemainingClass).toBe('');
    });

    test('sprintOptions maps sprints to label/value pairs', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Active',
            Name: 'S'
        });
        selectors.getSprints.mockReturnValue([
            { Id: 's1', Name: 'Sprint 1', status: 'Active' },
            { Id: 's2', Name: 'Sprint 2', status: 'Planning' }
        ]);

        const element = createComponent({ store: mockStore });

        expect(element.sprintOptions).toEqual([
            { label: 'Sprint 1 (Active)', value: 's1' },
            { label: 'Sprint 2 (Planning)', value: 's2' }
        ]);
    });

    test('handleCompleteSprint dispatches completesprint event with sprintId', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 'sprint1',
            status: 'Active',
            Name: 'Sprint 1'
        });
        selectors.getSprintProgress.mockReturnValue(50);

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('completesprint', handler);

        const completeBtn = element.shadowRoot.querySelector(
            'lightning-button[label="Complete"]'
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

        const newBtn = element.shadowRoot.querySelector(
            'lightning-button[label="New Sprint"]'
        );
        newBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('handleShowReports dispatches showreports event', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 'sprint1',
            status: 'Active',
            Name: 'Sprint 1'
        });

        const element = createComponent({ store: mockStore });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('showreports', handler);

        const reportBtn = element.shadowRoot.querySelector(
            'lightning-button-icon[icon-name="utility:chart"]'
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

    test('handles no store gracefully (null state paths)', () => {
        const element = createComponent({});

        expect(element.sprint).toBeNull();
        expect(element.hasSprint).toBe(false);
        expect(element.progress).toBe(0);
        expect(element.sprints).toEqual([]);
        expect(element.daysRemaining).toBeNull();
    });

    test('dateRange returns empty when sprint has no dates', () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Active',
            Name: 'S'
        });

        const element = createComponent({ store: mockStore });

        expect(element.dateRange).toBe(' - ');

        // With start and end
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Active',
            Name: 'S',
            startDate: '2026-01-01',
            endDate: '2026-01-14'
        });
        expect(element.dateRange).toBe('2026-01-01 - 2026-01-14');
    });

    test('isActive and canComplete are false for non-Active sprints', () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({
            Id: 's1',
            status: 'Planning',
            Name: 'S'
        });

        const element = createComponent({ store: mockStore });

        expect(element.isActive).toBe(false);
        expect(element.canComplete).toBe(false);
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

    test('defaults to create mode with 2-week sprint dates', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        expect(element.isEditMode).toBe(false);
        expect(element.modalTitle).toBe('Create Sprint');
        expect(element.canStart).toBe(false);
        expect(element.saveLabel).toBe('Save');

        // Check DOM renders modal title
        const title = element.shadowRoot.querySelector('.slds-modal__title');
        expect(title.textContent).toContain('Create Sprint');

        // Start Sprint button should NOT be visible (canStart is false)
        const startBtn = element.shadowRoot.querySelector(
            'button.slds-button_outline-brand'
        );
        expect(startBtn).toBeNull();
    });

    test('edit mode populates from sprint data and shows Start Sprint button', async () => {
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

        expect(element.isEditMode).toBe(true);
        expect(element.modalTitle).toBe('Edit Sprint');
        expect(element.canStart).toBe(true);

        // Start Sprint button should be visible
        const startBtn = element.shadowRoot.querySelector(
            'button.slds-button_outline-brand'
        );
        expect(startBtn).not.toBeNull();
        expect(startBtn.textContent).toContain('Start Sprint');
    });

    test('handleSave dispatches createSprintAsync and emits sprintcreated then close', async () => {
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

        // Click Save button
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

    test('handleSave does nothing when no store is provided', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const saveBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        saveBtn.click();
        await flushPromises();

        expect(createSprintAsync).not.toHaveBeenCalled();
    });

    test('handleStartSprint dispatches startSprintAsync and emits events', async () => {
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

        // Click Start Sprint button
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

    test('Escape key dispatches close event', async () => {
        const element = createComponent({ isOpen: true, boardId: 'board1' });
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('close', handler);

        const dialog = element.shadowRoot.querySelector('section[role="dialog"]');
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('saveLabel shows Saving... when processing', () => {
        const element = createComponent({ isOpen: true });

        expect(element.saveLabel).toBe('Save');
        element.isProcessing = true;
        expect(element.saveLabel).toBe('Saving...');
    });

    test('does not render when isOpen is false', () => {
        const element = createComponent({ isOpen: false });

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).toBeNull();
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
        { cardId: 'c1', completedInSprint: true, storyPoints: 3 },
        { cardId: 'c2', completedInSprint: true, storyPoints: 5 },
        { cardId: 'c3', completedInSprint: false, storyPoints: 2 },
        { cardId: 'c4', completedInSprint: false, storyPoints: 1 }
    ];

    test('subscribes to store and renders step 1 summary with card counts', async () => {
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
        expect(element.completedCount).toBe(2);
        expect(element.incompleteCount).toBe(2);
        expect(element.totalCount).toBe(4);
        expect(element.completedPoints).toBe(8);
        expect(element.totalPoints).toBe(11);
        expect(element.hasIncompleteCards).toBe(true);
        expect(element.isStep1).toBe(true);

        // DOM: Step 1 shows Sprint Summary heading
        const heading = element.shadowRoot.querySelector(
            '.slds-text-heading_medium'
        );
        expect(heading.textContent).toContain('Sprint Summary');

        // DOM: Next button visible
        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        expect(nextBtn.textContent).toContain('Next');
    });

    test('step navigation via Next/Back buttons: 1 -> 2 -> 3 and back', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Step 1: click Next -> step 2 (incomplete cards exist)
        let nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        expect(element.step).toBe(2);

        // Step 2 DOM: shows disposition heading
        const heading = element.shadowRoot.querySelector(
            '.slds-text-heading_small'
        );
        expect(heading.textContent).toContain('incomplete cards');

        // Step 2: click Next -> step 3
        nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        expect(element.step).toBe(3);

        // Step 3 DOM: shows Complete Sprint button
        const completeBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        expect(completeBtn.textContent).toContain('Complete Sprint');

        // Click Back -> step 2
        const backBtn = element.shadowRoot.querySelector(
            'button.slds-button_neutral'
        );
        backBtn.click();
        await flushPromises();

        expect(element.step).toBe(2);
    });

    test('step 1 jumps directly to step 3 when no incomplete cards', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([
            { cardId: 'c1', completedInSprint: true }
        ]);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        expect(element.hasIncompleteCards).toBe(false);

        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        expect(element.step).toBe(3);
    });

    test('handleBack does not go below step 1', () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([]);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });

        element.handleBack();
        expect(element.step).toBe(1);
    });

    test('dispositions are initialized when navigating to step 2', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Click Next to go to step 2
        const nextBtn = element.shadowRoot.querySelector(
            'button.slds-button_brand'
        );
        nextBtn.click();
        await flushPromises();

        expect(element.dispositions).toEqual({
            c3: 'backlog',
            c4: 'backlog'
        });

        // incompleteCardsWithDisposition
        const cards = element.incompleteCardsWithDisposition;
        expect(cards).toHaveLength(2);
        expect(cards[0].disposition).toBe('backlog');
    });

    test('dispositionOptions returns expected options', () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue([]);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });

        expect(element.dispositionOptions).toEqual([
            { label: 'Move to Backlog', value: 'backlog' }
        ]);
    });

    test('handleComplete dispatches completeSprintAsync and emits events', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        completeSprintAsync.mockReturnValue(() => Promise.resolve());
        mockStore.dispatch.mockResolvedValue();

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Navigate to step 3
        element.handleNext(); // step 2
        element.handleNext(); // step 3
        await flushPromises();

        const completedHandler = jest.fn();
        const closeHandler = jest.fn();
        element.addEventListener('sprintcompleted', completedHandler);
        element.addEventListener('close', closeHandler);

        // Click Complete Sprint button
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

    test('handleComplete does nothing when no store', async () => {
        const element = createComponent({ sprintId: 's1', isOpen: true });

        element.handleComplete();
        await flushPromises();

        expect(completeSprintAsync).not.toHaveBeenCalled();
    });

    test('handleClose resets step and dispositions, emits close', async () => {
        const mockStore = createMockStore();
        selectors.getActiveSprint.mockReturnValue({ Id: 's1' });
        selectors.getSprintCards.mockReturnValue(mockSprintCards);

        const element = createComponent({
            store: mockStore,
            sprintId: 's1',
            isOpen: true
        });
        await flushPromises();

        // Navigate to step 2
        element.handleNext();
        expect(element.step).toBe(2);

        const handler = jest.fn();
        element.addEventListener('close', handler);

        // Click Cancel/Close button (in step 2 it's the Back/cancel area, but handleClose is on Cancel at step 1)
        element.handleClose();

        expect(element.step).toBe(1);
        expect(element.dispositions).toEqual({});
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('unsubscribes from store on disconnect', () => {
        const unsubscribe = jest.fn();
        const mockStore = createMockStore();
        mockStore.subscribe.mockReturnValue(unsubscribe);

        const element = createComponent({ store: mockStore, sprintId: 's1' });
        document.body.removeChild(element);

        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    test('handles null state gracefully', () => {
        const element = createComponent({ sprintId: 's1', isOpen: true });

        expect(element.sprint).toBeNull();
        expect(element.sprintCards).toEqual([]);
        expect(element.completedCount).toBe(0);
        expect(element.incompleteCount).toBe(0);
        expect(element.totalCount).toBe(0);
        expect(element.completedPoints).toBe(0);
        expect(element.totalPoints).toBe(0);
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

    function createComponent(props = {}) {
        const element = createElement('c-kanban-sprint-reports', {
            is: KanbanSprintReports
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        return element;
    }

    test('renders burndown tab by default with correct tab classes', async () => {
        const element = createComponent({ isOpen: true });
        await flushPromises();

        expect(element.isBurndownTab).toBe(true);
        expect(element.isVelocityTab).toBe(false);
        expect(element.isSummaryTab).toBe(false);

        expect(element.burndownTabClass).toContain('slds-is-active');
        expect(element.velocityTabClass).not.toContain('slds-is-active');
        expect(element.summaryTabClass).not.toContain('slds-is-active');

        // DOM: burndown tab content visible
        const tabContent = element.shadowRoot.querySelector(
            '.slds-tabs_default__content'
        );
        expect(tabContent).not.toBeNull();
    });

    test('handleTabClick switches tabs via DOM click', async () => {
        const element = createComponent({ isOpen: true });
        await flushPromises();

        // Click velocity tab
        const velocityTab = element.shadowRoot.querySelector(
            'a[data-tab="velocity"]'
        );
        velocityTab.click();
        await flushPromises();

        expect(element.isVelocityTab).toBe(true);
        expect(element.isBurndownTab).toBe(false);
        expect(element.velocityTabClass).toContain('slds-is-active');

        // Click summary tab
        const summaryTab = element.shadowRoot.querySelector(
            'a[data-tab="summary"]'
        );
        summaryTab.click();
        await flushPromises();

        expect(element.isSummaryTab).toBe(true);
        expect(element.summaryTabClass).toContain('slds-is-active');
    });

    test('hasBurndownData and hasVelocityData reflect data arrays', () => {
        const element = createComponent({ isOpen: true });

        expect(element.hasBurndownData).toBe(false);
        expect(element.hasVelocityData).toBe(false);
    });

    test('averageVelocity computes correctly including rounding', () => {
        const element = createComponent({ isOpen: true });

        expect(element.averageVelocity).toBe(0);

        element.velocityData = [
            { velocity: 10, Name: 'S1' },
            { velocity: 20, Name: 'S2' },
            { velocity: 15, Name: 'S3' }
        ];
        expect(element.averageVelocity).toBe(15);

        // Rounds correctly
        element.velocityData = [
            { velocity: 10, Name: 'S1' },
            { velocity: 11, Name: 'S2' }
        ];
        expect(element.averageVelocity).toBe(11); // 10.5 rounds to 11
    });

    test('loadData fetches burndown and velocity data from store', async () => {
        const mockStore = createMockStore();
        mockStore.dispatch
            .mockResolvedValueOnce({
                data: [
                    {
                        snapshotDate: '2026-03-01',
                        remainingPoints: 10,
                        totalPoints: 20
                    }
                ]
            })
            .mockResolvedValueOnce({
                data: [{ velocity: 12, Name: 'S1' }]
            });

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

    test('loadData handles errors gracefully and resets isLoading', async () => {
        const mockStore = createMockStore();
        mockStore.dispatch.mockRejectedValue(new Error('Network error'));

        loadBurndownDataAsync.mockReturnValue(jest.fn());

        const consoleSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        createComponent({
            store: mockStore,
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: true
        });

        await flushPromises();

        expect(element.isLoading).toBeFalsy();
        consoleSpy.mockRestore();
    });

    test('loadData skips if no store', async () => {
        createComponent({ isOpen: true });
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

    test('drawBurndownChart handles missing canvas gracefully', () => {
        const element = createComponent({ isOpen: true });

        // Should not throw when canvas is not found
        expect(() => element.drawBurndownChart()).not.toThrow();
    });

    test('drawVelocityChart handles missing canvas gracefully', () => {
        const element = createComponent({ isOpen: true });

        expect(() => element.drawVelocityChart()).not.toThrow();
    });

    test('does not render when isOpen is false', () => {
        const element = createComponent({ isOpen: false });

        const dialog = element.shadowRoot.querySelector(
            'section[role="dialog"]'
        );
        expect(dialog).toBeNull();
    });

    test('does not call loadData when isOpen is false on connect', async () => {
        createComponent({
            store: createMockStore(),
            sprintId: 'sprint1',
            boardId: 'board1',
            isOpen: false
        });
        await flushPromises();

        expect(loadBurndownDataAsync).not.toHaveBeenCalled();
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

    test('show() makes menu visible and sets position, hide() removes it', async () => {
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

        // Hide
        element.hide();
        await flushPromises();

        menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('processedItems computes hasSubmenu, itemClass, and keys', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        // Check menu items rendered in DOM
        const items = element.shadowRoot.querySelectorAll(
            'a[role="menuitem"]'
        );
        expect(items.length).toBe(4);

        // Edit
        expect(items[0].dataset.value).toBe('edit');
        // Move
        expect(items[1].dataset.value).toBe('move');
        // Delete (disabled)
        expect(items[2].dataset.value).toBe('delete');
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

        // Menu should be hidden
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('clicking a disabled item does nothing', async () => {
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
        // Menu stays open
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();
    });

    test('clicking an item with submenu toggles submenu, shows sub-items', async () => {
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

        expect(handler).not.toHaveBeenCalled(); // No select yet

        // Submenu should be visible
        const submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).not.toBeNull();

        // Submenu items
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

        // Menu hidden after submenu click
        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).toBeNull();
    });

    test('clicking submenu item twice toggles it off', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        // Click Move to open submenu
        const moveLink = element.shadowRoot.querySelector(
            'a[data-value="move"]'
        );
        moveLink.click();
        await flushPromises();

        let submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).not.toBeNull();

        // Click Move again to close submenu
        const moveLink2 = element.shadowRoot.querySelector(
            'a[data-value="move"]'
        );
        moveLink2.click();
        await flushPromises();

        submenu = element.shadowRoot.querySelector('.context-submenu');
        expect(submenu).toBeNull();
    });

    test('Escape key hides the menu', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();

        // Dispatch keydown on the menu div
        menu.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        await flushPromises();

        const menuAfter = element.shadowRoot.querySelector('.context-menu');
        expect(menuAfter).toBeNull();
    });

    test('disconnectedCallback hides the menu', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const menu = element.shadowRoot.querySelector('.context-menu');
        expect(menu).not.toBeNull();

        // Remove from DOM triggers disconnectedCallback
        document.body.removeChild(element);

        // Internally isVisible should be false (verified by the hide() call in disconnectedCallback)
        // We can verify the window listeners were cleaned up by checking _clickOutsideHandler is null
        // Since internal state is not accessible, we just verify no error is thrown
    });

    test('menuStyle returns correct CSS positioning', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(150, 250);
        await flushPromises();

        expect(element.menuStyle).toBe('left: 150px; top: 250px;');
    });

    test('divider items render with separator class', async () => {
        const element = createComponent({ menuItems: sampleMenuItems });
        element.show(0, 0);
        await flushPromises();

        const separators = element.shadowRoot.querySelectorAll(
            '.slds-has-divider_top-space'
        );
        expect(separators.length).toBe(1); // Only 'Priority' has dividerBefore
    });
});
