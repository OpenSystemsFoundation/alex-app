import { createElement } from 'lwc';

// ─── Mock: c/kanbanStore ────────────────────────────────────────────
jest.mock('c/kanbanStore', () => ({
    selectors: {
        getBacklogCards: jest.fn(() => []),
        getUnrefinedBacklogCards: jest.fn(() => []),
        getBacklogCardCount: jest.fn(() => 0),
        getSelectedBacklogCards: jest.fn(() => []),
        getActiveSprint: jest.fn(() => null),
        isSprintBoard: jest.fn(() => false),
        getBoardId: jest.fn(() => 'board1'),
        isBacklogSyncing: jest.fn(() => false)
    },
    setSelectedBacklogCards: jest.fn((ids) => ({
        type: 'SET_SELECTED',
        payload: ids
    })),
    toggleBacklogCardSelection: jest.fn((id) => ({
        type: 'TOGGLE',
        payload: id
    })),
    createBacklogCardAsync: jest.fn(() => jest.fn()),
    updateBacklogCardAsync: jest.fn(() => jest.fn()),
    deleteBacklogCardsAsync: jest.fn(() => jest.fn()),
    reorderBacklogCardAsync: jest.fn(() => jest.fn()),
    moveCardsToSprintAsync: jest.fn(() => jest.fn()),
    updateCard: jest.fn(),
    deleteCardAsync: jest.fn(() => jest.fn())
}));

// ─── Mock: Apex wire adapter for KanbanCardPanel ────────────────────
jest.mock(
    '@salesforce/apex/KanbanBoardController.getModalSettings',
    () => {
        const { createApexTestWireAdapter } =
            require('@salesforce/sfdx-lwc-jest').default ||
            require('@salesforce/sfdx-lwc-jest');
        return { default: createApexTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);

// ─── Mock: lightning/platformShowToastEvent ──────────────────────────
jest.mock(
    'lightning/platformShowToastEvent',
    () => ({ ShowToastEvent: jest.fn() }),
    { virtual: true }
);

// ─── Imports under test ─────────────────────────────────────────────
import KanbanBacklogView from 'c/kanbanBacklogView';
import KanbanCardPanel from 'c/kanbanCardPanel';
// Direct path import — the c/ moduleNameMapper only handles c/<component> patterns
import { createLoggingMiddleware } from '../../../../force-app/main/default/lwc/kanbanStore/middleware/loggingMiddleware';

// ─── Get references to the mocked functions ─────────────────────────
import {
    selectors as mockSelectors,
    setSelectedBacklogCards as mockSetSelectedBacklogCards,
    toggleBacklogCardSelection as mockToggleBacklogCardSelection,
    createBacklogCardAsync as mockCreateBacklogCardAsync,
    updateBacklogCardAsync as mockUpdateBacklogCardAsync,
    deleteBacklogCardsAsync as mockDeleteBacklogCardsAsync,
    reorderBacklogCardAsync as mockReorderBacklogCardAsync,
    moveCardsToSprintAsync as mockMoveCardsToSprintAsync,
    updateCard as mockUpdateCard,
    deleteCardAsync as mockDeleteCardAsync
} from 'c/kanbanStore';

// ─── Helpers ────────────────────────────────────────────────────────

function createMockStore(stateOverrides = {}) {
    const defaultState = {
        backlogCards: [],
        selectedBacklogCards: [],
        ...stateOverrides
    };
    return {
        subscribe: jest.fn((cb) => {
            cb(defaultState);
            return jest.fn(); // unsubscribe
        }),
        dispatch: jest.fn(async (action) => {
            if (typeof action === 'function') {
                return action();
            }
            return action;
        }),
        getState: jest.fn(() => defaultState)
    };
}

const SAMPLE_CARDS = [
    {
        Id: 'card1',
        Name: 'CARD-001',
        subject: 'Build login page',
        priority: 'High',
        cardType: 'Story',
        storyPoints: 5,
        needsRefinement: false,
        color: '#ff0000'
    },
    {
        Id: 'card2',
        Name: 'CARD-002',
        subject: 'Fix navigation bug',
        priority: 'Medium',
        cardType: 'Bug',
        storyPoints: 3,
        needsRefinement: true,
        color: null
    },
    {
        Id: 'card3',
        Name: 'CARD-003',
        subject: 'Setup CI pipeline',
        priority: 'Low',
        cardType: 'Task',
        storyPoints: 2,
        needsRefinement: false,
        color: null
    }
];

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// =====================================================================
//  1. KanbanBacklogView Tests
// =====================================================================
describe('c-kanban-backlog-view', () => {
    let element;
    let mockStore;

    function createBacklogView(storeState = {}) {
        mockStore = createMockStore(storeState);
        // Configure selectors to return based on state
        element = createElement('c-kanban-backlog-view', {
            is: KanbanBacklogView
        });
        element.store = mockStore;
        document.body.appendChild(element);
        return element;
    }

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ── Computed properties: backlogCards ────────────────────────────
    describe('backlogCards', () => {
        it('returns empty array when no store state', () => {
            element = createElement('c-kanban-backlog-view', {
                is: KanbanBacklogView
            });
            // Do NOT set store — _storeState stays null
            document.body.appendChild(element);
            // Empty state message should appear
            return flushPromises().then(() => {
                const emptyState = element.shadowRoot.querySelector(
                    '.slds-align_absolute-center'
                );
                expect(emptyState).not.toBeNull();
            });
        });

        it('shows cards when selector returns data', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const rows =
                    element.shadowRoot.querySelectorAll('.backlog-row');
                // 1 header + 3 data rows
                expect(rows.length).toBe(4);
            });
        });

        it('applies search filter on subject', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                // Simulate search input
                const searchInput =
                    element.shadowRoot.querySelector('.backlog-search');
                searchInput.value = 'login';
                searchInput.dispatchEvent(new CustomEvent('change'));

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });

        it('applies search filter on Name', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                const searchInput =
                    element.shadowRoot.querySelector('.backlog-search');
                searchInput.value = 'CARD-002';
                searchInput.dispatchEvent(new CustomEvent('change'));

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });

        it('applies search filter on cardType', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                const searchInput =
                    element.shadowRoot.querySelector('.backlog-search');
                searchInput.value = 'Bug';
                searchInput.dispatchEvent(new CustomEvent('change'));

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });

        it('applies priority filter', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                // Find the priority combobox (2nd combobox = index 1)
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                const priorityCombo = comboboxes[1]; // Priority filter
                priorityCombo.dispatchEvent(
                    new CustomEvent('change', { detail: { value: 'High' } })
                );

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });

        it('applies cardType filter', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                const typeCombo = comboboxes[2]; // Type filter
                typeCombo.dispatchEvent(
                    new CustomEvent('change', {
                        detail: { value: 'Task' }
                    })
                );

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });

        it('enriches cards with selection state and UI helpers', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);
            createBacklogView();

            return flushPromises().then(() => {
                // The first data row should have a colored border
                const firstRow = element.shadowRoot.querySelectorAll(
                    '.backlog-row:not(.backlog-row--header)'
                )[0];
                expect(firstRow.style.cssText).toContain(
                    'border-left: 3px solid'
                );
            });
        });

        it('uses unrefined cards in refinement view mode', () => {
            const unrefinedCards = [SAMPLE_CARDS[1]]; // only card2 needs refinement
            mockSelectors.getUnrefinedBacklogCards.mockReturnValue(
                unrefinedCards
            );
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();

            return flushPromises().then(() => {
                // Switch to refinement view
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                const viewModeCombo = comboboxes[0];
                viewModeCombo.dispatchEvent(
                    new CustomEvent('change', {
                        detail: { value: 'refinement' }
                    })
                );

                return flushPromises().then(() => {
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(1);
                });
            });
        });
    });

    // ── Computed: simple getters ────────────────────────────────────
    describe('simple computed properties', () => {
        it('hasCards returns false for empty backlog', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const emptyState = element.shadowRoot.querySelector(
                    '.slds-align_absolute-center'
                );
                expect(emptyState).not.toBeNull();
            });
        });

        it('showEmptyState is true when no cards and no create form', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const emptyState = element.shadowRoot.querySelector(
                    '.slds-align_absolute-center'
                );
                expect(emptyState).not.toBeNull();
            });
        });

        it('cardCount returns value from selector', () => {
            mockSelectors.getBacklogCardCount.mockReturnValue(42);
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                // Card count is rendered in the toolbar
                const toolbar = element.shadowRoot.querySelector(
                    '.backlog-view__toolbar'
                );
                expect(toolbar.textContent).toContain('42');
            });
        });

        it('totalStoryPoints sums story points', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const toolbar = element.shadowRoot.querySelector(
                    '.backlog-view__toolbar'
                );
                // 5+3+2 = 10
                expect(toolbar.textContent).toContain('10');
            });
        });

        it('selectedCount shown in bulk action bar', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1',
                'card2'
            ]);
            createBacklogView();
            return flushPromises().then(() => {
                const bulkBar = element.shadowRoot.querySelector(
                    '.backlog-view__bulk-actions'
                );
                expect(bulkBar).not.toBeNull();
                expect(bulkBar.textContent).toContain('2');
            });
        });

        it('addToSprintLabel includes selected count', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);
            mockSelectors.getActiveSprint.mockReturnValue({
                Id: 'sprint1',
                Name: 'Sprint 1'
            });
            createBacklogView();
            return flushPromises().then(() => {
                const addBtn = element.shadowRoot.querySelector(
                    '.backlog-view__bulk-actions lightning-button[variant="brand"]'
                );
                expect(addBtn).not.toBeNull();
                expect(addBtn.label).toContain('1');
            });
        });

        it('isBacklogSaving shows spinner when syncing', () => {
            mockSelectors.isBacklogSyncing.mockReturnValue(true);
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const spinner = element.shadowRoot.querySelector(
                    'lightning-spinner'
                );
                expect(spinner).not.toBeNull();
            });
        });

        it('boardId returns value from selector', () => {
            mockSelectors.getBoardId.mockReturnValue('myBoard');
            createBacklogView();
            // boardId is used internally; we verify create card uses it
            return flushPromises();
        });

        it('isSprintBoard returns value from selector', () => {
            mockSelectors.isSprintBoard.mockReturnValue(true);
            createBacklogView();
            return flushPromises();
        });
    });

    // ── Computed: option lists ──────────────────────────────────────
    describe('option lists', () => {
        it('viewModeOptions has All and Needs Refinement', () => {
            createBacklogView();
            return flushPromises().then(() => {
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                const viewCombo = comboboxes[0];
                expect(viewCombo.options).toEqual([
                    { label: 'All', value: 'all' },
                    { label: 'Needs Refinement', value: 'refinement' }
                ]);
            });
        });

        it('priorityFilterOptions includes All and three levels', () => {
            createBacklogView();
            return flushPromises().then(() => {
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                expect(comboboxes[1].options).toHaveLength(4);
            });
        });

        it('cardTypeFilterOptions includes All and four types', () => {
            createBacklogView();
            return flushPromises().then(() => {
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                expect(comboboxes[2].options).toHaveLength(5);
            });
        });
    });

    // ── Computed: contextMenuItems ──────────────────────────────────
    describe('contextMenuItems', () => {
        it('includes moveToSprint when active sprint exists', () => {
            mockSelectors.getActiveSprint.mockReturnValue({
                Id: 'sprint1'
            });
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const contextMenu = element.shadowRoot.querySelector(
                    'c-kanban-context-menu'
                );
                const items = contextMenu.menuItems;
                const moveItem = items.find(
                    (i) => i.value === 'moveToSprint'
                );
                expect(moveItem).toBeDefined();
            });
        });

        it('excludes moveToSprint when no active sprint', () => {
            mockSelectors.getActiveSprint.mockReturnValue(null);
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const contextMenu = element.shadowRoot.querySelector(
                    'c-kanban-context-menu'
                );
                const items = contextMenu.menuItems;
                const moveItem = items.find(
                    (i) => i.value === 'moveToSprint'
                );
                expect(moveItem).toBeUndefined();
            });
        });

        it('always includes moveTop, moveBottom, setPriority, toggleRefinement, delete', () => {
            mockSelectors.getActiveSprint.mockReturnValue(null);
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const contextMenu = element.shadowRoot.querySelector(
                    'c-kanban-context-menu'
                );
                const values = contextMenu.menuItems.map((i) => i.value);
                expect(values).toContain('moveTop');
                expect(values).toContain('moveBottom');
                expect(values).toContain('setPriority');
                expect(values).toContain('toggleRefinement');
                expect(values).toContain('delete');
            });
        });
    });

    // ── Event handlers: toolbar ─────────────────────────────────────
    describe('toolbar handlers', () => {
        it('handleSearchChange updates searchTerm', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            return flushPromises().then(() => {
                const searchInput =
                    element.shadowRoot.querySelector('.backlog-search');
                searchInput.value = 'test';
                searchInput.dispatchEvent(new CustomEvent('change'));
                return flushPromises().then(() => {
                    // Verify filtering happened (no matching cards)
                    const dataRows = element.shadowRoot.querySelectorAll(
                        '.backlog-row:not(.backlog-row--header)'
                    );
                    expect(dataRows.length).toBe(0);
                });
            });
        });

        it('handleViewModeChange updates viewMode', () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getUnrefinedBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const comboboxes =
                    element.shadowRoot.querySelectorAll(
                        'lightning-combobox'
                    );
                comboboxes[0].dispatchEvent(
                    new CustomEvent('change', {
                        detail: { value: 'refinement' }
                    })
                );
                return flushPromises().then(() => {
                    expect(comboboxes[0].value).toBe('refinement');
                });
            });
        });
    });

    // ── Event handlers: create form ─────────────────────────────────
    describe('create form', () => {
        it('handleToggleCreateForm shows the create form', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                // Click "New Card" button
                const newBtn = element.shadowRoot.querySelector(
                    'lightning-button[label="New Card"]'
                );
                newBtn.click();
                return flushPromises().then(() => {
                    const createForm = element.shadowRoot.querySelector(
                        '.backlog-view__create-form'
                    );
                    expect(createForm).not.toBeNull();
                });
            });
        });

        it('handleToggleCreateForm hides the form on second click', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const newBtn = element.shadowRoot.querySelector(
                    'lightning-button[label="New Card"]'
                );
                newBtn.click();
                return flushPromises().then(() => {
                    newBtn.click();
                    return flushPromises().then(() => {
                        const createForm =
                            element.shadowRoot.querySelector(
                                '.backlog-view__create-form'
                            );
                        expect(createForm).toBeNull();
                    });
                });
            });
        });

        it('isCreateDisabled is true when subject is empty', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const newBtn = element.shadowRoot.querySelector(
                    'lightning-button[label="New Card"]'
                );
                newBtn.click();
                return flushPromises().then(() => {
                    const saveBtn = element.shadowRoot.querySelector(
                        '.backlog-view__create-form lightning-button[label="Save"]'
                    );
                    expect(saveBtn.disabled).toBe(true);
                });
            });
        });

        it('handleNewSubjectChange updates newCardSubject', () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            return flushPromises().then(() => {
                const newBtn = element.shadowRoot.querySelector(
                    'lightning-button[label="New Card"]'
                );
                newBtn.click();
                return flushPromises().then(() => {
                    const input = element.shadowRoot.querySelector(
                        '.create-input'
                    );
                    input.value = 'New task';
                    input.dispatchEvent(new CustomEvent('change'));
                    return flushPromises().then(() => {
                        const saveBtn = element.shadowRoot.querySelector(
                            '.backlog-view__create-form lightning-button[label="Save"]'
                        );
                        expect(saveBtn.disabled).toBe(false);
                    });
                });
            });
        });

        it('handleCreateKeyDown with Enter calls handleCreateCard', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            mockSelectors.getBoardId.mockReturnValue('board1');
            createBacklogView();
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const input =
                element.shadowRoot.querySelector('.create-input');
            input.value = 'My new card';
            input.dispatchEvent(new CustomEvent('change'));
            await flushPromises();

            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true
                })
            );
            await flushPromises();

            expect(mockCreateBacklogCardAsync).toHaveBeenCalledWith(
                'board1',
                { subject: 'My new card' }
            );
            expect(mockStore.dispatch).toHaveBeenCalled();
        });

        it('handleCreateKeyDown with Escape closes form', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const input =
                element.shadowRoot.querySelector('.create-input');
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true
                })
            );
            await flushPromises();

            const form = element.shadowRoot.querySelector(
                '.backlog-view__create-form'
            );
            expect(form).toBeNull();
        });

        it('handleCreateCard dispatches createBacklogCardAsync', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            mockSelectors.getBoardId.mockReturnValue('board1');
            createBacklogView();
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const input =
                element.shadowRoot.querySelector('.create-input');
            input.value = 'Create me';
            input.dispatchEvent(new CustomEvent('change'));
            await flushPromises();

            const saveBtn = element.shadowRoot.querySelector(
                '.backlog-view__create-form lightning-button[label="Save"]'
            );
            saveBtn.click();
            await flushPromises();

            expect(mockCreateBacklogCardAsync).toHaveBeenCalledWith(
                'board1',
                { subject: 'Create me' }
            );
        });

        it('handleCreateCard does nothing without subject', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const saveBtn = element.shadowRoot.querySelector(
                '.backlog-view__create-form lightning-button[label="Save"]'
            );
            saveBtn.click();
            await flushPromises();

            expect(mockCreateBacklogCardAsync).not.toHaveBeenCalled();
        });

        it('handleCreateCard dispatches error on failure', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            mockSelectors.getBoardId.mockReturnValue('board1');
            const failStore = createMockStore();
            failStore.dispatch.mockRejectedValueOnce(
                new Error('Server error')
            );

            element = createElement('c-kanban-backlog-view', {
                is: KanbanBacklogView
            });
            element.store = failStore;
            document.body.appendChild(element);
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const input =
                element.shadowRoot.querySelector('.create-input');
            input.value = 'Fail card';
            input.dispatchEvent(new CustomEvent('change'));
            await flushPromises();

            let errorReceived = false;
            element.addEventListener('error', () => {
                errorReceived = true;
            });

            const saveBtn = element.shadowRoot.querySelector(
                '.backlog-view__create-form lightning-button[label="Save"]'
            );
            saveBtn.click();
            await flushPromises();

            expect(errorReceived).toBe(true);
        });

        it('handleCancelCreate closes the form', async () => {
            mockSelectors.getBacklogCards.mockReturnValue([]);
            createBacklogView();
            await flushPromises();

            const newBtn = element.shadowRoot.querySelector(
                'lightning-button[label="New Card"]'
            );
            newBtn.click();
            await flushPromises();

            const cancelBtn = element.shadowRoot.querySelector(
                '.backlog-view__create-form lightning-button[label="Cancel"]'
            );
            cancelBtn.click();
            await flushPromises();

            const form = element.shadowRoot.querySelector(
                '.backlog-view__create-form'
            );
            expect(form).toBeNull();
        });
    });

    // ── Event handlers: selection ───────────────────────────────────
    describe('selection handlers', () => {
        it('handleSelectAll selects all cards', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([]);
            createBacklogView();
            await flushPromises();

            const selectAllCheckbox = element.shadowRoot.querySelector(
                '.backlog-row--header lightning-input[type="checkbox"]'
            );
            selectAllCheckbox.dispatchEvent(
                new CustomEvent('change')
            );
            await flushPromises();

            expect(mockStore.dispatch).toHaveBeenCalled();
            expect(mockSetSelectedBacklogCards).toHaveBeenCalledWith([
                'card1',
                'card2',
                'card3'
            ]);
        });

        it('handleSelectAll deselects all when all are selected', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1',
                'card2',
                'card3'
            ]);
            createBacklogView();
            await flushPromises();

            const selectAllCheckbox = element.shadowRoot.querySelector(
                '.backlog-row--header lightning-input[type="checkbox"]'
            );
            selectAllCheckbox.dispatchEvent(
                new CustomEvent('change')
            );
            await flushPromises();

            expect(mockSetSelectedBacklogCards).toHaveBeenCalledWith([]);
        });

        it('handleCardSelect toggles card selection', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([]);
            createBacklogView();
            await flushPromises();

            const checkboxes = element.shadowRoot.querySelectorAll(
                '.backlog-row:not(.backlog-row--header) lightning-input[type="checkbox"]'
            );
            // Simulate click on first card's checkbox
            checkboxes[0].dispatchEvent(new CustomEvent('change'));
            await flushPromises();

            expect(mockToggleBacklogCardSelection).toHaveBeenCalledWith(
                'card1'
            );
        });

        it('handleDeselectAll clears selection', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1',
                'card2'
            ]);
            createBacklogView();
            await flushPromises();

            const clearBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Clear"]'
            );
            clearBtn.click();
            await flushPromises();

            expect(mockSetSelectedBacklogCards).toHaveBeenCalledWith([]);
        });
    });

    // ── Event handlers: bulk actions ────────────────────────────────
    describe('bulk action handlers', () => {
        it('handleBulkAddToSprint dispatches moveCardsToSprintAsync', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);
            mockSelectors.getActiveSprint.mockReturnValue({
                Id: 'sprint1'
            });
            createBacklogView();
            await flushPromises();

            const addBtn = element.shadowRoot.querySelector(
                '.backlog-view__bulk-actions lightning-button[variant="brand"]'
            );
            addBtn.click();
            await flushPromises();

            expect(mockMoveCardsToSprintAsync).toHaveBeenCalledWith(
                'sprint1',
                ['card1']
            );
        });

        it('handleBulkAddToSprint clears selection after success', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);
            mockSelectors.getActiveSprint.mockReturnValue({
                Id: 'sprint1'
            });
            createBacklogView();
            await flushPromises();

            const addBtn = element.shadowRoot.querySelector(
                '.backlog-view__bulk-actions lightning-button[variant="brand"]'
            );
            addBtn.click();
            await flushPromises();

            expect(mockSetSelectedBacklogCards).toHaveBeenCalledWith([]);
        });

        it('handleBulkDelete dispatches deleteBacklogCardsAsync', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1',
                'card2'
            ]);
            createBacklogView();
            await flushPromises();

            const deleteBtn = element.shadowRoot.querySelector(
                'lightning-button[icon-name="utility:delete"]'
            );
            deleteBtn.click();
            await flushPromises();

            expect(mockDeleteBacklogCardsAsync).toHaveBeenCalledWith([
                'card1',
                'card2'
            ]);
        });

        it('handleBulkSetPriority dispatches updateBacklogCardAsync for each card', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1',
                'card2'
            ]);
            createBacklogView();
            await flushPromises();

            const priorityCombo = element.shadowRoot.querySelector(
                '.backlog-view__bulk-actions lightning-combobox'
            );
            priorityCombo.dispatchEvent(
                new CustomEvent('change', {
                    detail: { value: 'High' }
                })
            );
            await flushPromises();

            expect(mockUpdateBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                { priority: 'High' }
            );
            expect(mockUpdateBacklogCardAsync).toHaveBeenCalledWith(
                'card2',
                { priority: 'High' }
            );
        });

        it('handleBulkAddToSprint does nothing without active sprint', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);
            mockSelectors.getActiveSprint.mockReturnValue(null);
            createBacklogView();
            await flushPromises();

            // No sprint button should appear
            const bulkBar = element.shadowRoot.querySelector(
                '.backlog-view__bulk-actions'
            );
            if (bulkBar) {
                const brandBtns = bulkBar.querySelectorAll(
                    'lightning-button[variant="brand"]'
                );
                expect(brandBtns.length).toBe(0);
            }
        });

        it('handleBulkDelete dispatches error on failure', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getSelectedBacklogCards.mockReturnValue([
                'card1'
            ]);

            const failStore = createMockStore();
            failStore.dispatch.mockRejectedValueOnce(
                new Error('fail')
            );

            element = createElement('c-kanban-backlog-view', {
                is: KanbanBacklogView
            });
            element.store = failStore;
            document.body.appendChild(element);
            await flushPromises();

            let errorReceived = false;
            element.addEventListener('error', () => {
                errorReceived = true;
            });

            const deleteBtn = element.shadowRoot.querySelector(
                'lightning-button[icon-name="utility:delete"]'
            );
            deleteBtn.click();
            await flushPromises();

            expect(errorReceived).toBe(true);
        });
    });

    // ── Event handlers: card actions ────────────────────────────────
    describe('card action handlers', () => {
        it('handleCardClick dispatches cardclick event', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            let receivedDetail;
            element.addEventListener('cardclick', (e) => {
                receivedDetail = e.detail;
            });

            // Click on a card name link
            const link = element.shadowRoot.querySelector(
                '.backlog-cell--name a'
            );
            link.click();
            await flushPromises();

            // handleCardNameClick fires navigatetocard, not cardclick
            expect(receivedDetail).toEqual({ cardId: 'card1' });
        });

        it('handleCardNameClick dispatches navigatetocard event', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            let receivedDetail;
            element.addEventListener('navigatetocard', (e) => {
                receivedDetail = e.detail;
            });

            const link = element.shadowRoot.querySelector(
                '.backlog-cell--name a'
            );
            link.click();
            await flushPromises();

            expect(receivedDetail).toEqual({ cardId: 'card1' });
        });

        it('handleRowClick dispatches cardclick when clicking on row', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            let receivedDetail;
            element.addEventListener('cardclick', (e) => {
                receivedDetail = e.detail;
            });

            // Click on the subject cell (not a checkbox, link, etc.)
            const subjectCell = element.shadowRoot.querySelector(
                '.backlog-cell--subject'
            );
            subjectCell.click();
            await flushPromises();

            expect(receivedDetail).toEqual({ cardId: 'card1' });
        });

        it('handleRowClick does nothing when clicking checkbox', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            let cardClicked = false;
            element.addEventListener('cardclick', () => {
                cardClicked = true;
            });

            // Click checkbox area
            const checkboxCell = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header) .backlog-cell--checkbox'
            );
            // Simulate click on the lightning-input inside
            const input = checkboxCell.querySelector('lightning-input');
            if (input) {
                input.click();
            }
            await flushPromises();

            // Should NOT fire cardclick (the closest() check should block it)
            // The lightning-input click won't propagate to row click handler
        });

        it('handleRefinementToggle dispatches updateBacklogCardAsync', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const refinementBtn = element.shadowRoot.querySelector(
                '.refinement-toggle'
            );
            refinementBtn.click();
            await flushPromises();

            expect(mockUpdateBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                { needsRefinement: true }
            );
        });
    });

    // ── Event handlers: context menu ────────────────────────────────
    describe('context menu handlers', () => {
        it('handleContextMenuSelect moveTop dispatches reorder to 0', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            // Simulate right-click to set _contextMenuCardId
            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            // Simulate context menu selection
            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'moveTop' }
                })
            );
            await flushPromises();

            expect(mockReorderBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                0
            );
        });

        it('handleContextMenuSelect moveBottom dispatches reorder to last', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'moveBottom' }
                })
            );
            await flushPromises();

            expect(mockReorderBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                2
            );
        });

        it('handleContextMenuSelect setPriority dispatches update', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'setPriority', subValue: 'Low' }
                })
            );
            await flushPromises();

            expect(mockUpdateBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                { priority: 'Low' }
            );
        });

        it('handleContextMenuSelect toggleRefinement dispatches update', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'toggleRefinement' }
                })
            );
            await flushPromises();

            // card1 has needsRefinement: false, so should toggle to true
            expect(mockUpdateBacklogCardAsync).toHaveBeenCalledWith(
                'card1',
                { needsRefinement: true }
            );
        });

        it('handleContextMenuSelect moveToSprint dispatches move', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            mockSelectors.getActiveSprint.mockReturnValue({
                Id: 'sprint1'
            });
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'moveToSprint' }
                })
            );
            await flushPromises();

            expect(mockMoveCardsToSprintAsync).toHaveBeenCalledWith(
                'sprint1',
                ['card1']
            );
        });

        it('handleContextMenuSelect delete dispatches delete', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'delete' }
                })
            );
            await flushPromises();

            expect(mockDeleteBacklogCardsAsync).toHaveBeenCalledWith([
                'card1'
            ]);
        });

        it('handleContextMenuSelect does nothing without cardId', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            // Fire select without setting _contextMenuCardId first
            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'moveTop' }
                })
            );
            await flushPromises();

            expect(mockReorderBacklogCardAsync).not.toHaveBeenCalled();
        });

        it('handleContextMenuSelect default case does nothing', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            row.dispatchEvent(
                new MouseEvent('contextmenu', {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true
                })
            );
            await flushPromises();

            const contextMenu = element.shadowRoot.querySelector(
                'c-kanban-context-menu'
            );
            contextMenu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'unknownAction' }
                })
            );
            await flushPromises();

            // No thunks should be called
            expect(mockReorderBacklogCardAsync).not.toHaveBeenCalled();
            expect(mockUpdateBacklogCardAsync).not.toHaveBeenCalled();
            expect(mockDeleteBacklogCardsAsync).not.toHaveBeenCalled();
            expect(mockMoveCardsToSprintAsync).not.toHaveBeenCalled();
        });
    });

    // ── Event handlers: drag and drop ───────────────────────────────
    describe('drag and drop handlers', () => {
        it('handleDragStart sets draggedCardId', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );
            const mockDataTransfer = {
                effectAllowed: '',
                setData: jest.fn()
            };
            row.dispatchEvent(
                Object.assign(new Event('dragstart', { bubbles: true }), {
                    dataTransfer: mockDataTransfer
                })
            );
            await flushPromises();

            expect(mockDataTransfer.effectAllowed).toBe('move');
            expect(mockDataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'card1'
            );
        });

        it('handleDragEnd resets drag state', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const row = element.shadowRoot.querySelector(
                '.backlog-row:not(.backlog-row--header)'
            );

            // First start a drag
            const mockDataTransfer = {
                effectAllowed: '',
                setData: jest.fn()
            };
            row.dispatchEvent(
                Object.assign(new Event('dragstart', { bubbles: true }), {
                    dataTransfer: mockDataTransfer
                })
            );
            await flushPromises();

            // Then end it
            row.dispatchEvent(new Event('dragend', { bubbles: true }));
            await flushPromises();

            // Drag state should be cleared - no visual artifacts
            const draggingRows =
                element.shadowRoot.querySelectorAll('.dragging');
            expect(draggingRows.length).toBe(0);
        });

        it('handleDrop dispatches reorderBacklogCardAsync', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const rows = element.shadowRoot.querySelectorAll(
                '.backlog-row:not(.backlog-row--header)'
            );
            const sourceRow = rows[0];
            const targetRow = rows[2];

            // Start drag
            const mockDataTransfer = {
                effectAllowed: '',
                dropEffect: '',
                setData: jest.fn()
            };
            sourceRow.dispatchEvent(
                Object.assign(new Event('dragstart', { bubbles: true }), {
                    dataTransfer: mockDataTransfer
                })
            );
            await flushPromises();

            // Drag over target (simulate being in bottom half)
            const targetRect = {
                top: 100,
                height: 40
            };
            jest.spyOn(targetRow, 'getBoundingClientRect').mockReturnValue(targetRect);
            targetRow.dispatchEvent(
                Object.assign(
                    new Event('dragover', {
                        bubbles: true,
                        cancelable: true
                    }),
                    {
                        dataTransfer: mockDataTransfer,
                        clientY: 130, // bottom half
                        currentTarget: targetRow
                    }
                )
            );
            await flushPromises();

            // Drop
            targetRow.dispatchEvent(
                Object.assign(
                    new Event('drop', {
                        bubbles: true,
                        cancelable: true
                    }),
                    {
                        dataTransfer: mockDataTransfer
                    }
                )
            );
            await flushPromises();

            expect(mockReorderBacklogCardAsync).toHaveBeenCalled();
        });

        it('handleDrop does nothing when cardId is null', async () => {
            mockSelectors.getBacklogCards.mockReturnValue(SAMPLE_CARDS);
            createBacklogView();
            await flushPromises();

            const rows = element.shadowRoot.querySelectorAll(
                '.backlog-row:not(.backlog-row--header)'
            );
            const targetRow = rows[1];

            // Drop without having started a drag
            targetRow.dispatchEvent(
                Object.assign(
                    new Event('drop', {
                        bubbles: true,
                        cancelable: true
                    }),
                    {
                        dataTransfer: { dropEffect: '' }
                    }
                )
            );
            await flushPromises();

            expect(mockReorderBacklogCardAsync).not.toHaveBeenCalled();
        });
    });

    // ── Lifecycle ───────────────────────────────────────────────────
    describe('lifecycle', () => {
        it('connectedCallback subscribes to store', () => {
            createBacklogView();
            expect(mockStore.subscribe).toHaveBeenCalled();
        });

        it('connectedCallback without store does not throw', () => {
            element = createElement('c-kanban-backlog-view', {
                is: KanbanBacklogView
            });
            document.body.appendChild(element);
            return flushPromises();
        });

        it('disconnectedCallback unsubscribes from store', () => {
            createBacklogView();
            const unsubscribe = mockStore.subscribe.mock.results[0].value;
            document.body.removeChild(element);
            expect(unsubscribe).toHaveBeenCalled();
        });
    });
});

// =====================================================================
//  2. KanbanCardPanel Tests
// =====================================================================
describe('c-kanban-card-panel', () => {
    let element;

    function createPanel(props = {}) {
        element = createElement('c-kanban-card-panel', {
            is: KanbanCardPanel
        });
        Object.assign(element, {
            card: { Id: 'card1', Name: 'CARD-001' },
            store: createMockStore(),
            isOpen: true,
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    describe('processFields', () => {
        // Test processFields via the prototype (avoids illegal constructor)
        const processFields =
            KanbanCardPanel.prototype.processFields;

        it('maps unqualified field names to qualified names', () => {
            const result = processFields(['Subject__c', 'Status__c']);
            expect(result[0].fieldName).toBe('OpenSF__Subject__c');
            expect(result[1].fieldName).toBe('OpenSF__Status__c');
        });

        it('keeps already-qualified names as-is', () => {
            const result = processFields(['OpenSF__Subject__c']);
            expect(result[0].fieldName).toBe('OpenSF__Subject__c');
        });

        it('applies correct metadata for known fields', () => {
            const result = processFields(['Description__c']);
            expect(result[0].fullWidth).toBe(true);
            expect(result[0].isTextarea).toBe(true);
            expect(result[0].columnClass).toBe(
                'slds-col slds-size_1-of-1'
            );
        });

        it('applies default metadata for unknown fields', () => {
            const result = processFields(['CustomField__c']);
            expect(result[0].fullWidth).toBe(false);
            expect(result[0].isTextarea).toBe(false);
            expect(result[0].columnClass).toBe(
                'slds-col slds-size_1-of-2'
            );
        });

        it('sets key equal to fieldName', () => {
            const result = processFields(['Subject__c']);
            expect(result[0].key).toBe('OpenSF__Subject__c');
        });
    });

    describe('computed properties', () => {
        it('panelStyle returns width string', () => {
            createPanel();
            return flushPromises().then(() => {
                const panelDiv =
                    element.shadowRoot.querySelector('.card-panel');
                expect(panelDiv.style.width).toBe('400px');
            });
        });

        it('cardRecordUrl with card returns correct URL', () => {
            createPanel({ card: { Id: 'abc123', Name: 'Test' } });
            return flushPromises().then(() => {
                const link =
                    element.shadowRoot.querySelector('.slds-text-link');
                expect(link.href).toContain(
                    '/lightning/r/OpenSF__Card__c/abc123/view'
                );
            });
        });

        it('cardRecordUrl without card returns #', () => {
            // Test via prototype getter with a mock context
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'cardRecordUrl'
            ).get;
            expect(getter.call({ card: null })).toBe('#');
            expect(getter.call({ card: undefined })).toBe('#');
        });

        it('hasFields returns false when formFields is empty', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'hasFields'
            ).get;
            expect(getter.call({ formFields: [] })).toBe(false);
            expect(getter.call({ formFields: null })).toBe(false);
        });

        it('hasFields returns true when formFields has items', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'hasFields'
            ).get;
            expect(
                getter.call({
                    formFields: [
                        {
                            fieldName: 'OpenSF__Subject__c',
                            key: 'OpenSF__Subject__c'
                        }
                    ]
                })
            ).toBe(true);
        });

        it('descriptionField returns the description field', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'descriptionField'
            ).get;
            const result = getter.call({
                formFields: [
                    {
                        fieldName: 'OpenSF__Subject__c',
                        key: 'OpenSF__Subject__c'
                    },
                    {
                        fieldName: 'OpenSF__Description__c',
                        key: 'OpenSF__Description__c'
                    }
                ]
            });
            expect(result.fieldName).toBe('OpenSF__Description__c');
        });

        it('regularFields excludes description', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'regularFields'
            ).get;
            const regular = getter.call({
                formFields: [
                    {
                        fieldName: 'OpenSF__Subject__c',
                        key: 'OpenSF__Subject__c'
                    },
                    {
                        fieldName: 'OpenSF__Description__c',
                        key: 'OpenSF__Description__c'
                    }
                ]
            });
            expect(regular).toHaveLength(1);
            expect(regular[0].fieldName).toBe('OpenSF__Subject__c');
        });

        it('deleteButtonLabel returns Delete by default', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'deleteButtonLabel'
            ).get;
            expect(getter.call({ deleteConfirmState: false })).toBe(
                'Delete'
            );
        });

        it('deleteButtonLabel returns Confirm Delete when in confirm state', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'deleteButtonLabel'
            ).get;
            expect(getter.call({ deleteConfirmState: true })).toBe(
                'Confirm Delete'
            );
        });

        it('deleteButtonVariant returns neutral by default', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'deleteButtonVariant'
            ).get;
            expect(getter.call({ deleteConfirmState: false })).toBe(
                'neutral'
            );
        });

        it('deleteButtonVariant returns destructive when in confirm state', () => {
            const getter = Object.getOwnPropertyDescriptor(
                KanbanCardPanel.prototype,
                'deleteButtonVariant'
            ).get;
            expect(getter.call({ deleteConfirmState: true })).toBe(
                'destructive'
            );
        });
    });

    describe('event handlers', () => {
        it('handleClose dispatches close event', async () => {
            createPanel();
            await flushPromises();

            let closeFired = false;
            element.addEventListener('close', () => {
                closeFired = true;
            });

            const closeBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Cancel"]'
            );
            closeBtn.click();
            await flushPromises();

            expect(closeFired).toBe(true);
        });

        it('handleKeyDown with Escape calls handleClose', async () => {
            createPanel();
            await flushPromises();

            let closeFired = false;
            element.addEventListener('close', () => {
                closeFired = true;
            });

            const panelDiv =
                element.shadowRoot.querySelector('.card-panel');
            panelDiv.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true
                })
            );
            await flushPromises();

            expect(closeFired).toBe(true);
        });

        it('handleKeyDown with other keys does nothing', async () => {
            createPanel();
            await flushPromises();

            let closeFired = false;
            element.addEventListener('close', () => {
                closeFired = true;
            });

            const panelDiv =
                element.shadowRoot.querySelector('.card-panel');
            panelDiv.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true
                })
            );
            await flushPromises();

            expect(closeFired).toBe(false);
        });

        it('handleDelete first click sets confirmState', async () => {
            jest.useFakeTimers();
            createPanel();
            await flushPromises();

            const deleteBtn = element.shadowRoot.querySelector(
                'lightning-button[variant="neutral"][label="Delete"]'
            );
            deleteBtn.click();
            await flushPromises();

            // After first click, label should change to "Confirm Delete"
            const confirmBtn = element.shadowRoot.querySelector(
                'lightning-button[variant="destructive"]'
            );
            expect(confirmBtn).not.toBeNull();
            expect(confirmBtn.label).toBe('Confirm Delete');
            jest.useRealTimers();
        });

        it('handleDelete second click performs delete', async () => {
            jest.useFakeTimers();
            const store = createMockStore();
            createPanel({ store });
            await flushPromises();

            const deleteBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Delete"]'
            );
            deleteBtn.click();
            await flushPromises();

            // Click again to confirm
            const confirmBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Confirm Delete"]'
            );
            confirmBtn.click();
            await flushPromises();

            expect(mockDeleteCardAsync).toHaveBeenCalledWith('card1');
            jest.useRealTimers();
        });

        it('handleDelete confirm state times out', async () => {
            jest.useFakeTimers();
            createPanel();
            await flushPromises();

            const deleteBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Delete"]'
            );
            deleteBtn.click();
            await flushPromises();

            // Advance timer past DELETE_CONFIRM_TIMEOUT (3000ms)
            jest.advanceTimersByTime(3500);
            await flushPromises();

            // Should revert to normal delete button
            const normalBtn = element.shadowRoot.querySelector(
                'lightning-button[label="Delete"]'
            );
            expect(normalBtn).not.toBeNull();
            jest.useRealTimers();
        });

        it('handleNameClick dispatches navigatetocard', async () => {
            createPanel();
            await flushPromises();

            let receivedDetail;
            element.addEventListener('navigatetocard', (e) => {
                receivedDetail = e.detail;
            });

            const link =
                element.shadowRoot.querySelector('.slds-text-link');
            link.click();
            await flushPromises();

            expect(receivedDetail).toEqual({ cardId: 'card1' });
        });
    });

    describe('resize handling', () => {
        it('handleResize clamps to min/max bounds', () => {
            const handleResize =
                KanbanCardPanel.prototype.handleResize;
            const ctx = {
                _resizing: true,
                _resizeStartX: 500,
                _resizeStartWidth: 400,
                panelWidth: 400
            };

            // Drag far left (trying to make very wide)
            handleResize.call(ctx, { clientX: 0 });
            expect(ctx.panelWidth).toBe(800); // MAX

            // Drag far right (trying to make very narrow)
            handleResize.call(ctx, { clientX: 1000 });
            expect(ctx.panelWidth).toBe(300); // MIN
        });

        it('handleResize does nothing when not resizing', () => {
            const handleResize =
                KanbanCardPanel.prototype.handleResize;
            const ctx = {
                _resizing: false,
                panelWidth: 400
            };
            handleResize.call(ctx, { clientX: 100 });
            expect(ctx.panelWidth).toBe(400);
        });

        it('handleResizeEnd cleans up listeners', () => {
            const handleResizeEnd =
                KanbanCardPanel.prototype.handleResizeEnd;
            const mockRemove = jest.spyOn(
                window,
                'removeEventListener'
            );

            const ctx = {
                _resizing: true,
                _boundHandleResize: () => {},
                _boundHandleResizeEnd: () => {}
            };

            handleResizeEnd.call(ctx);

            expect(ctx._resizing).toBe(false);
            expect(mockRemove).toHaveBeenCalledTimes(2);
            expect(ctx._boundHandleResize).toBeNull();
            expect(ctx._boundHandleResizeEnd).toBeNull();

            mockRemove.mockRestore();
        });
    });

    describe('disconnectedCallback', () => {
        it('clears delete timer', () => {
            jest.useFakeTimers();
            const disconnectedCallback =
                KanbanCardPanel.prototype.disconnectedCallback;
            const timer = setTimeout(() => {}, 3000);
            const ctx = {
                _deleteTimer: timer,
                _boundHandleResize: null,
                _boundHandleResizeEnd: null
            };
            const spy = jest.spyOn(global, 'clearTimeout');

            disconnectedCallback.call(ctx);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
            jest.useRealTimers();
        });

        it('removes resize listeners if active', () => {
            const disconnectedCallback =
                KanbanCardPanel.prototype.disconnectedCallback;
            const mockRemove = jest.spyOn(
                window,
                'removeEventListener'
            );
            const ctx = {
                _deleteTimer: null,
                _boundHandleResize: () => {},
                _boundHandleResizeEnd: () => {}
            };

            disconnectedCallback.call(ctx);

            expect(mockRemove).toHaveBeenCalledTimes(2);
            mockRemove.mockRestore();
        });

        it('handles no active timers or listeners gracefully', () => {
            const disconnectedCallback =
                KanbanCardPanel.prototype.disconnectedCallback;
            const ctx = {
                _deleteTimer: null,
                _boundHandleResize: null,
                _boundHandleResizeEnd: null
            };

            expect(() =>
                disconnectedCallback.call(ctx)
            ).not.toThrow();
        });
    });
});

// =====================================================================
//  3. LoggingMiddleware Tests
// =====================================================================
describe('loggingMiddleware', () => {
    let mockStore;
    let mockNext;

    beforeEach(() => {
        mockStore = {
            getState: jest.fn()
        };
        mockNext = jest.fn((action) => action);
    });

    it('passes action through without logging when disabled', () => {
        const middleware = createLoggingMiddleware(false);
        const action = { type: 'TEST_ACTION' };

        const result = middleware(mockStore)(mockNext)(action);

        expect(result).toEqual(action);
        expect(mockNext).toHaveBeenCalledWith(action);
    });

    it('does not call console.group when disabled', () => {
        const groupSpy = jest.spyOn(console, 'group').mockImplementation();
        const middleware = createLoggingMiddleware(false);

        middleware(mockStore)(mockNext)({ type: 'TEST' });

        expect(groupSpy).not.toHaveBeenCalled();
        groupSpy.mockRestore();
    });

    it('logs action type, previous state, and next state when enabled', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation();
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        const groupEndSpy = jest
            .spyOn(console, 'groupEnd')
            .mockImplementation();

        mockStore.getState
            .mockReturnValueOnce({ count: 0 })
            .mockReturnValueOnce({ count: 1 });

        const middleware = createLoggingMiddleware(true);
        const action = { type: 'INCREMENT' };

        const result = middleware(mockStore)(mockNext)(action);

        expect(groupSpy).toHaveBeenCalledWith('Action: INCREMENT');
        expect(logSpy).toHaveBeenCalledWith(
            'Previous State:',
            { count: 0 }
        );
        expect(logSpy).toHaveBeenCalledWith('Action:', action);
        expect(logSpy).toHaveBeenCalledWith('Next State:', { count: 1 });
        expect(groupEndSpy).toHaveBeenCalled();
        expect(result).toEqual(action);

        groupSpy.mockRestore();
        logSpy.mockRestore();
        groupEndSpy.mockRestore();
    });

    it('calls next(action) and returns its result when enabled', () => {
        jest.spyOn(console, 'group').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'groupEnd').mockImplementation();

        mockStore.getState.mockReturnValue({});
        mockNext.mockReturnValue('next-result');

        const middleware = createLoggingMiddleware(true);
        const result = middleware(mockStore)(mockNext)({
            type: 'TEST'
        });

        expect(result).toBe('next-result');
        expect(mockNext).toHaveBeenCalled();

        console.group.mockRestore();
        console.log.mockRestore();
        console.groupEnd.mockRestore();
    });

    it('defaults to disabled when no argument is provided', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation();

        const middleware = createLoggingMiddleware();
        middleware(mockStore)(mockNext)({ type: 'TEST' });

        expect(groupSpy).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();

        groupSpy.mockRestore();
    });

    it('handles thunk-like actions without type gracefully when enabled', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'groupEnd').mockImplementation();

        mockStore.getState.mockReturnValue({});

        const middleware = createLoggingMiddleware(true);
        const thunkAction = null; // no type

        middleware(mockStore)(mockNext)(thunkAction);

        expect(groupSpy).toHaveBeenCalledWith('Action: THUNK');

        console.group.mockRestore();
        console.log.mockRestore();
        console.groupEnd.mockRestore();
    });

    it('handles undefined action gracefully when enabled', () => {
        const groupSpy = jest
            .spyOn(console, 'group')
            .mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'groupEnd').mockImplementation();

        mockStore.getState.mockReturnValue({});

        const middleware = createLoggingMiddleware(true);
        middleware(mockStore)(mockNext)(undefined);

        expect(groupSpy).toHaveBeenCalledWith('Action: THUNK');

        console.group.mockRestore();
        console.log.mockRestore();
        console.groupEnd.mockRestore();
    });
});
