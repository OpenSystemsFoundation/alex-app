import { createElement } from 'lwc';
import KanbanBoard from 'c/kanbanBoard';
import { createStore, actions } from 'c/kanbanStore';
import getKanbanConfig from '@salesforce/apex/KanbanBoardController.getKanbanConfig';
import LifecycleManager from '../managers/lifecycleManager';
import BoardDataLoader from '../managers/boardDataLoader';
import DragDropHandler from '../handlers/dragDropHandler';
import CardOperations from '../handlers/cardOperations';
import SubscriptionEventHandler from '../handlers/subscriptionEventHandler';
import FilterManager from '../managers/filterManager';
import SwimlaneManager from '../managers/swimlaneManager';
import MobileNavigationManager from '../managers/mobileNavigationManager';
import ContextMenuManager from '../managers/contextMenuManager';
import UndoRedoManager from '../managers/undoRedoManager';
import EventHandler from '../handlers/eventHandler';
import RequestTracker from '../helpers/requestTracker';
import ReducerQueue from '../helpers/reducerQueue';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getKanbanConfig',
    () => {
        const {
            createApexTestWireAdapter
        } = require('@salesforce/sfdx-lwc-jest');
        return { default: createApexTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);

// Wired by the real c-kanban-card-panel child
jest.mock(
    '@salesforce/apex/KanbanBoardController.getModalSettings',
    () => {
        const {
            createApexTestWireAdapter
        } = require('@salesforce/sfdx-lwc-jest');
        return { default: createApexTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);

// Real store, but createStore is a spy so individual tests can swap in a
// store variant (e.g. without an undoManager).
jest.mock('c/kanbanStore', () => {
    const actual = jest.requireActual('c/kanbanStore');
    return {
        ...actual,
        createStore: jest.fn((...args) => actual.createStore(...args))
    };
});

/**
 * Builds a constructor mock that records its args, exposes the component it
 * was given, stubs the listed methods and applies extra (component-aware) props.
 */
function mockHelperClass(methods, props) {
    return jest.fn().mockImplementation(function (...args) {
        this.args = args;
        this.component = args[0];
        methods.forEach((name) => {
            this[name] = jest.fn();
        });
        Object.assign(this, props ? props(args[0]) : {});
    });
}

jest.mock('../managers/lifecycleManager', () => ({
    __esModule: true,
    default: mockHelperClass([
        'initialize',
        'initializeChildComponents',
        'cleanup',
        'handleWindowFocus'
    ])
}));
jest.mock('../managers/boardDataLoader', () => ({
    __esModule: true,
    default: mockHelperClass(['stopPolling', 'loadIncrementalUpdates'], () => ({
        loadBoardData: jest.fn(() => Promise.resolve())
    }))
}));
jest.mock('../handlers/dragDropHandler', () => ({
    __esModule: true,
    default: mockHelperClass([
        'handleDragStart',
        'handleDragEnd',
        'handleDragOver',
        'handleDrop'
    ])
}));
jest.mock('../handlers/cardOperations', () => ({
    __esModule: true,
    default: mockHelperClass([
        'handleCardClick',
        'handleCardDetailClose',
        'handleCardUpdated',
        'handleCardDeleted',
        'createCard'
    ])
}));
jest.mock('../handlers/subscriptionEventHandler', () => ({
    __esModule: true,
    default: mockHelperClass([
        'handlePlatformEvent',
        'handleEventActivity',
        'handleSubscriptionMessage',
        'handleSubscriptionStatusMessage',
        'handlePollingRequired',
        'handleSubscriptionStatusChange'
    ])
}));
jest.mock('../managers/filterManager', () => ({
    __esModule: true,
    default: mockHelperClass(
        [
            'handleBoardSearch',
            'handlePriorityFilter',
            'handleCardTypeFilter',
            'handleEpicFilter',
            'handleAssigneeFilter',
            'handleToggleHideCompleted',
            'handleClearFilters'
        ],
        (component) => ({
            hasActiveFilters: false,
            priorityFilterOptions: [{ label: 'All', value: 'All' }],
            cardTypeFilterOptions: [{ label: 'All', value: 'All' }],
            assigneeFilterOptions: [],
            showHideDoneToggle: false,
            hideCompletedClass: '',
            getFilteredColumns: jest.fn(() => component.columns),
            getFilteredCardCount: jest.fn((columns) =>
                columns.reduce((sum, col) => sum + col.cards.length, 0)
            ),
            getFilterSummary: jest.fn(
                (columns, total) => `${columns.length} cols / ${total} cards`
            )
        })
    )
}));
jest.mock('../managers/swimlaneManager', () => ({
    __esModule: true,
    default: mockHelperClass(['handleModeChange'], () => ({
        modeOptions: [{ label: 'None', value: 'none' }],
        isActive: false,
        getSwimlanes: jest.fn(() => [])
    }))
}));
jest.mock('../managers/mobileNavigationManager', () => ({
    __esModule: true,
    default: mockHelperClass(
        [
            'handleColumnChange',
            'handlePrevColumn',
            'handleNextColumn',
            'handleTouchStart',
            'handleTouchEnd'
        ],
        () => ({
            isFirstColumn: true,
            getActiveColumnId: jest.fn((columns) => columns[0]?.Id || null),
            getColumnCounter: jest.fn((columns) => `1 / ${columns.length}`),
            isLastColumn: jest.fn(() => false)
        })
    )
}));
jest.mock('../managers/contextMenuManager', () => ({
    __esModule: true,
    default: mockHelperClass(['handleContextMenu', 'handleMenuSelect'], () => ({
        defaultMenuItems: [{ label: 'Edit', value: 'edit' }]
    }))
}));
jest.mock('../managers/undoRedoManager', () => ({
    __esModule: true,
    default: mockHelperClass(['handleKeyboard', 'handleUndo', 'handleRedo'])
}));
jest.mock('../handlers/eventHandler', () => ({
    __esModule: true,
    default: mockHelperClass(['setBoardId'])
}));
jest.mock('../helpers/requestTracker', () => ({
    __esModule: true,
    default: mockHelperClass(['destroy'])
}));
jest.mock('../helpers/reducerQueue', () => ({
    __esModule: true,
    default: mockHelperClass(['clear'])
}));

// Let pending promises and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

const COLUMNS = [
    {
        Id: 'col1',
        columnHeader: 'To Do',
        cardCount: 2,
        mobileColumnClass: 'kanban-column',
        columnStyle: '',
        columnUrl: '/lightning/r/col1/view',
        cards: [
            {
                Id: 'card1',
                Name: 'C-1',
                subject: 'Write tests',
                recordUrl: '/lightning/r/card1/view'
            },
            {
                Id: 'card2',
                Name: 'C-2',
                subject: '',
                recordUrl: '/lightning/r/card2/view'
            }
        ]
    },
    {
        Id: 'col2',
        columnHeader: 'Done',
        cardCount: 0,
        mobileColumnClass: 'kanban-column',
        columnStyle: '',
        columnUrl: '/lightning/r/col2/view',
        cards: []
    }
];

function lastInstance(MockClass) {
    const { instances } = MockClass.mock;
    return instances[instances.length - 1];
}

/** The KanbanBoard component instance, as handed to its helper classes. */
function getComponent() {
    return lastInstance(LifecycleManager).component;
}

function createBoard(props = {}) {
    const element = createElement('c-kanban-board', { is: KanbanBoard });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

function $(element, selector) {
    return element.shadowRoot.querySelector(selector);
}

function $$(element, selector) {
    return [...element.shadowRoot.querySelectorAll(selector)];
}

async function loadState(component, { board, columns = COLUMNS, extra } = {}) {
    const store = component.store;
    store.dispatch(actions.setBoard(board || { Id: 'a01', type: 'Kanban' }));
    store.dispatch(actions.setColumns(columns));
    if (extra) {
        extra(store);
    }
    await flushPromises();
}

function fakeUndoManager(overrides = {}) {
    const subscribers = [];
    return {
        subscribers,
        subscribe: jest.fn((fn) => {
            subscribers.push(fn);
            return jest.fn();
        }),
        canUndo: jest.fn(() => false),
        canRedo: jest.fn(() => false),
        peekUndo: jest.fn(() => null),
        peekRedo: jest.fn(() => null),
        clear: jest.fn(),
        ...overrides
    };
}

/** Make the next createStore() call return a real store with a custom undoManager. */
function useStoreWithUndoManager(undoManager) {
    const actual = jest.requireActual('c/kanbanStore');
    createStore.mockImplementationOnce(() => {
        const store = actual.createStore();
        if (undoManager === undefined) {
            delete store.undoManager;
        } else {
            store.undoManager = undoManager;
        }
        return store;
    });
}

function enableUndoRedoDebug() {
    window.localStorage.setItem('alex.debug.undoRedo', 'true');
}

describe('c-kanban-board', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        window.localStorage.clear();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    describe('initialization', () => {
        it('wires up core services with a generated client id', () => {
            createBoard({ recordId: 'a01' });
            const component = getComponent();

            const clientId = RequestTracker.mock.calls[0][0];
            expect(typeof clientId).toBe('string');
            expect(clientId.length).toBeGreaterThan(0);
            expect(component._clientId).toBe(clientId);

            expect(ReducerQueue).toHaveBeenCalledWith(component.store);
            const [tracker, , recordId, eventClientId] =
                EventHandler.mock.calls[0];
            expect(tracker).toBe(lastInstance(RequestTracker));
            expect(recordId).toBe('a01');
            expect(eventClientId).toBe(clientId);
            expect(
                lastInstance(LifecycleManager).initialize
            ).toHaveBeenCalled();
            expect(UndoRedoManager).toHaveBeenCalledWith(component);
        });

        it('routes event-handler activity to the subscription event handler', () => {
            createBoard();
            const onActivity = EventHandler.mock.calls[0][1];

            onActivity({ type: 'CardUpdate' });

            expect(
                lastInstance(SubscriptionEventHandler).handleEventActivity
            ).toHaveBeenCalledWith({ type: 'CardUpdate' });
        });

        it('forwards document keydown events to the undo/redo manager', () => {
            createBoard();
            const event = new KeyboardEvent('keydown', { key: 'z' });

            document.dispatchEvent(event);

            expect(
                lastInstance(UndoRedoManager).handleKeyboard
            ).toHaveBeenCalledWith(event);
        });

        it('creates helper instances lazily and only once', () => {
            createBoard();
            const component = getComponent();

            expect(component.dragDropHandler).toBe(component.dragDropHandler);
            expect(component.cardOperations).toBe(component.cardOperations);
            expect(component.boardDataLoader).toBe(component.boardDataLoader);
            expect(component.lifecycleManager).toBe(component.lifecycleManager);
            expect(DragDropHandler).toHaveBeenCalledTimes(1);
            expect(CardOperations).toHaveBeenCalledTimes(1);
        });

        it('renders the loading defaults before the store emits any state', () => {
            const element = createBoard();
            const component = getComponent();

            expect(component.isLoading).toBe(true);
            expect(component.board).toBeNull();
            expect(component.error).toBeNull();
            expect(component.columns).toEqual([]);
            expect(component.cardsByColumn).toEqual({});
            expect(component.syncState).toBe('idle');
            expect(component.pendingOperationsCount).toBe(0);
            expect(component.lastSyncError).toBeNull();
            expect(component.backlogCardCount).toBe(0);
            expect(component.isSprintBoard).toBe(false);
            expect(component.activeSprint).toBeNull();
            expect(component.shouldAutoSubscribe).toBe(false);
            expect(component.connectionStatusConfig).toEqual({
                status: 'disconnected',
                eventCount: 0,
                lastSyncTime: null,
                syncState: 'idle',
                pendingOperationsCount: 0,
                lastSyncError: null,
                pollingUpdateDetected: null
            });
            expect($(element, '.slds-text-body_regular').textContent).toContain(
                'No columns found'
            );
        });
    });

    describe('undo/redo debug flag', () => {
        it('hides undo/redo buttons by default', () => {
            const element = createBoard();
            expect($(element, '.topbar-undo-redo')).toBeNull();
        });

        it('shows undo/redo buttons when the localStorage flag is set', () => {
            enableUndoRedoDebug();
            const element = createBoard();
            const buttons = $$(element, '.topbar-undo-redo button');
            expect(buttons).toHaveLength(2);
            expect(buttons[0].disabled).toBe(true);
            expect(buttons[0].className).toContain('topbar-icon-btn--disabled');
            expect(buttons[1].disabled).toBe(true);
        });

        it('falls back to hidden when localStorage access throws', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('blocked');
            });
            const element = createBoard();
            expect(getComponent().showUndoRedoButtons).toBe(false);
            expect($(element, '.topbar-undo-redo')).toBeNull();
        });

        it('delegates undo and redo clicks to the undo/redo manager', async () => {
            enableUndoRedoDebug();
            const undoManager = fakeUndoManager({
                canUndo: jest.fn(() => true),
                canRedo: jest.fn(() => true)
            });
            useStoreWithUndoManager(undoManager);
            const element = createBoard();
            await loadState(getComponent());

            const [undoBtn, redoBtn] = $$(element, '.topbar-undo-redo button');
            expect(undoBtn.disabled).toBe(false);
            expect(redoBtn.disabled).toBe(false);
            expect(undoBtn.className).toBe('topbar-icon-btn');
            expect(redoBtn.className).toBe('topbar-icon-btn');

            undoBtn.click();
            redoBtn.click();

            const manager = lastInstance(UndoRedoManager);
            expect(manager.handleUndo).toHaveBeenCalledTimes(1);
            expect(manager.handleRedo).toHaveBeenCalledTimes(1);
        });

        it('ignores undo/redo when no undo/redo manager exists', () => {
            createBoard();
            const component = getComponent();
            const manager = lastInstance(UndoRedoManager);
            component._undoRedoManager = null;

            expect(() => component.handleUndo()).not.toThrow();
            expect(() => component.handleRedo()).not.toThrow();
            expect(manager.handleUndo).not.toHaveBeenCalled();
            expect(manager.handleRedo).not.toHaveBeenCalled();
        });
    });

    describe('undo manager integration', () => {
        it('reflects undoManager subscription updates in button state', async () => {
            enableUndoRedoDebug();
            const undoManager = fakeUndoManager();
            useStoreWithUndoManager(undoManager);
            const element = createBoard();
            const component = getComponent();

            expect(undoManager.subscribe).toHaveBeenCalledTimes(1);
            undoManager.subscribers[0]({ canUndo: true, canRedo: false });
            await flushPromises();

            expect(component.isUndoDisabled).toBe(false);
            expect(component.isRedoDisabled).toBe(true);
            const [undoBtn, redoBtn] = $$(element, '.topbar-undo-redo button');
            expect(undoBtn.disabled).toBe(false);
            expect(redoBtn.className).toContain('topbar-icon-btn--disabled');
        });

        it('builds tooltips with the peeked undo/redo descriptions', () => {
            const undoManager = fakeUndoManager({
                peekUndo: jest.fn(() => ({ description: 'Move card' })),
                peekRedo: jest.fn(() => ({ description: 'Delete card' }))
            });
            useStoreWithUndoManager(undoManager);
            jest.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
            createBoard();
            const component = getComponent();

            expect(component.undoTooltip).toBe('Undo (Ctrl+Z) — Move card');
            expect(component.redoTooltip).toBe('Redo (Ctrl+Y) — Delete card');
        });

        it('uses mac shortcuts based on navigator.platform', () => {
            jest.spyOn(navigator, 'platform', 'get').mockReturnValue(
                'MacIntel'
            );
            createBoard();
            const component = getComponent();

            expect(component.undoTooltip).toBe('Undo (⌘Z)');
            expect(component.redoTooltip).toBe('Redo (⌘⇧Z)');
        });

        it('prefers navigator.userAgentData.platform when available', () => {
            Object.defineProperty(navigator, 'userAgentData', {
                value: { platform: 'macOS' },
                configurable: true
            });
            try {
                createBoard();
                expect(getComponent().undoTooltip).toBe('Undo (⌘Z)');
            } finally {
                delete navigator.userAgentData;
            }
        });

        it('treats a missing platform as non-mac', () => {
            jest.spyOn(navigator, 'platform', 'get').mockReturnValue('');
            createBoard();
            expect(getComponent()._isMac).toBe(false);
            expect(getComponent().redoTooltip).toBe('Redo (Ctrl+Y)');
        });

        it('works with a store that has no undoManager', async () => {
            useStoreWithUndoManager(undefined);
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();

            expect(component._undoManagerUnsubscribe).toBeNull();
            expect(component.undoTooltip).toContain('Undo');
            expect(component.redoTooltip).toContain('Redo');

            await loadState(component);
            expect(component.isUndoDisabled).toBe(true);
            await component.loadBoardData();
            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalled();

            document.body.removeChild(element);
            expect(lastInstance(LifecycleManager).cleanup).toHaveBeenCalled();
        });
    });

    describe('config wire', () => {
        it('applies debug and devtools flags from config', async () => {
            createBoard({ recordId: 'a01' });
            const component = getComponent();
            expect(component.showDebugInfo).toBe(false);
            expect(component.hasDevTools).toBe(false);

            getKanbanConfig.emit({ showDebugInfo: true, enableDevTools: true });
            await flushPromises();

            expect(component.showDebugInfo).toBe(true);
            expect(component.hasDevTools).toBe(true);
        });

        it('treats non-boolean flags as disabled', async () => {
            createBoard();
            const component = getComponent();

            getKanbanConfig.emit({ showDebugInfo: 'yes', enableDevTools: 1 });
            await flushPromises();

            expect(component.showDebugInfo).toBe(false);
            expect(component._enableDevTools).toBe(false);
            expect(component.hasDevTools).toBe(false);
        });

        it('ignores wire results without data', async () => {
            createBoard();
            const component = getComponent();
            getKanbanConfig.emit({ showDebugInfo: true });
            await flushPromises();

            getKanbanConfig.error();
            await flushPromises();

            expect(component.showDebugInfo).toBe(true);
        });

        it('enables devtools on a lazily created store when config arrived first', () => {
            createBoard();
            const component = getComponent();
            component._store = null;
            component._enableDevTools = true;

            const store = component.store;

            expect(store.devTools).toBeTruthy();
            expect(component.hasDevTools).toBe(true);
        });

        it('enables devtools only after the store exists', async () => {
            createBoard();
            const component = getComponent();
            const store = component._store;
            component._store = null;

            getKanbanConfig.emit({ enableDevTools: true });
            await flushPromises();

            expect(store.devTools).toBeNull();
            expect(component._enableDevTools).toBe(true);
        });
    });

    describe('recordId and data loading', () => {
        it('does not load when recordId is set before connecting', () => {
            const element = createElement('c-kanban-board', {
                is: KanbanBoard
            });
            element.recordId = 'a01';
            expect(element.recordId).toBe('a01');
            expect(BoardDataLoader).not.toHaveBeenCalled();
        });

        it('loads board data when recordId changes after connecting', async () => {
            const element = createBoard();
            const component = getComponent();

            element.recordId = 'a02';
            await flushPromises();

            expect(component._recordId).toBe('a02');
            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalledTimes(1);

            element.recordId = 'a02';
            element.recordId = null;
            await flushPromises();
            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalledTimes(1);
        });

        it('skips loading without a recordId', async () => {
            createBoard();
            await getComponent().loadBoardData();
            expect(BoardDataLoader).not.toHaveBeenCalled();
        });

        it('clears undo history after every load and devtools history once', async () => {
            const undoManager = fakeUndoManager();
            useStoreWithUndoManager(undoManager);
            createBoard({ recordId: 'a01' });
            const component = getComponent();
            component.store.enableDevTools();
            const devToolsClear = jest.spyOn(component.store.devTools, 'clear');

            await component.loadBoardData();
            await component.loadBoardData();

            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalledTimes(2);
            expect(undoManager.clear).toHaveBeenCalledTimes(2);
            expect(devToolsClear).toHaveBeenCalledTimes(1);
        });
    });

    describe('rendering lifecycle', () => {
        it('initializes child component references with the template', () => {
            createBoard();
            const component = getComponent();
            expect(
                lastInstance(LifecycleManager).initializeChildComponents
            ).toHaveBeenCalledWith(component.template);
        });

        it('applies a fixed height when provided', () => {
            const element = createBoard({ height: '500px' });
            const wrapper = $(element, '.kanban-board-wrapper');

            expect(wrapper.style.getPropertyValue('--board-height')).toBe(
                '500px'
            );
            expect(wrapper.style.height).toBe('500px');
            expect(wrapper.style.maxHeight).toBe('500px');
        });

        it('computes height from window.innerHeight by default', () => {
            const element = createBoard();
            const wrapper = $(element, '.kanban-board-wrapper');
            const expected = Math.max(300, window.innerHeight - 80);

            expect(wrapper.style.height).toBe(`${expected}px`);
            expect(wrapper.style.getPropertyValue('--board-height')).toBe(
                `${expected}px`
            );
        });

        it('uses visualViewport and the wrapper offset when available', () => {
            window.visualViewport = { height: 1000 };
            jest.spyOn(
                HTMLElement.prototype,
                'getBoundingClientRect'
            ).mockReturnValue({ top: 120.4 });
            try {
                const element = createBoard();
                const wrapper = $(element, '.kanban-board-wrapper');
                // 1000 - ceil(120.4) - 80
                expect(wrapper.style.maxHeight).toBe('799px');
            } finally {
                delete window.visualViewport;
            }
        });

        it('never goes below the 300px minimum', () => {
            window.visualViewport = { height: 200 };
            try {
                const element = createBoard();
                expect($(element, '.kanban-board-wrapper').style.height).toBe(
                    '300px'
                );
            } finally {
                delete window.visualViewport;
            }
        });

        it('skips height recalculation without a wrapper or with a fixed height', () => {
            const element = createBoard({ height: '400px' });
            const component = getComponent();
            const wrapper = $(element, '.kanban-board-wrapper');

            component.updateBoardHeight();
            expect(wrapper.style.height).toBe('400px');

            component._wrapperElement = null;
            expect(() => component.updateBoardHeight()).not.toThrow();
        });

        it('cleans up listeners, subscriptions and timers on disconnect', () => {
            const undoManager = fakeUndoManager();
            useStoreWithUndoManager(undoManager);
            const element = createBoard();
            const component = getComponent();
            const unsubscribe = undoManager.subscribe.mock.results[0].value;
            const clearSpy = jest.spyOn(window, 'clearTimeout');
            component._searchDebounceTimer = 42;

            document.body.removeChild(element);

            expect(lastInstance(LifecycleManager).cleanup).toHaveBeenCalled();
            expect(unsubscribe).toHaveBeenCalled();
            expect(component._undoManagerUnsubscribe).toBeNull();
            expect(component._keyboardHandler).toBeNull();
            expect(component._heightInitialized).toBe(false);
            expect(clearSpy).toHaveBeenCalledWith(42);

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
            expect(
                lastInstance(UndoRedoManager).handleKeyboard
            ).not.toHaveBeenCalled();
        });

        it('tolerates disconnect when helpers were never created', () => {
            const element = createBoard();
            const component = getComponent();
            const lifecycle = lastInstance(LifecycleManager);
            component._lifecycleManager = null;
            component._keyboardHandler = null;
            const clearSpy = jest.spyOn(window, 'clearTimeout');

            document.body.removeChild(element);

            expect(lifecycle.cleanup).not.toHaveBeenCalled();
            expect(clearSpy).not.toHaveBeenCalled();
        });
    });

    describe('board rendering from store state', () => {
        it('renders columns and cards from the store', async () => {
            const element = createBoard();
            await loadState(getComponent());

            const headers = $$(element, '.kanban-column__header h2 a');
            expect(headers.map((a) => a.textContent.trim())).toEqual([
                'To Do',
                'Done'
            ]);
            expect($$(element, 'article.kanban-card')).toHaveLength(2);
            const options = $$(element, '.mobile-column-select option');
            expect(options).toHaveLength(2);
            expect($(element, '.mobile-column-counter').textContent).toBe(
                '1 / 2'
            );
        });

        it('decorates card text for board context', async () => {
            createBoard();
            const component = getComponent();
            await loadState(component);

            const [col] = component.filteredColumns;
            expect(col.cards[0].nameClass).toContain('kanban-card__name');
            expect(col.cards[0].subjectTitle).toBe('Write tests');
            expect(col.cards[1].subjectTitle).toBeNull();
        });

        it('exposes derived counts and summaries', async () => {
            createBoard();
            const component = getComponent();
            await loadState(component, {
                columns: [...COLUMNS, { Id: 'col3', columnHeader: 'X' }]
            });

            expect(component.totalCardCount).toBe(2);
            expect(component.cardsByColumn).toEqual({
                col1: COLUMNS[0].cards,
                col2: [],
                col3: []
            });
            expect(component.hasColumns).toBe(true);
        });

        it('reports filtered counts and summary via the filter manager', async () => {
            createBoard();
            const component = getComponent();
            await loadState(component);
            const filterManager = lastInstance(FilterManager);

            expect(component.filteredCardCount).toBe(2);
            expect(component.filterSummary).toBe('2 cols / 2 cards');
            expect(filterManager.getFilterSummary).toHaveBeenCalledWith(
                component.filteredColumns,
                2
            );
            expect(component.hideCompletedClass).toBe('');
            expect(component.showHideDoneToggle).toBe(false);
        });

        it('shows the error message from the store', async () => {
            const element = createBoard();
            const component = getComponent();
            component.store.dispatch(actions.setError('Boom'));
            await flushPromises();

            expect(component.error).toBe('Boom');
            expect($(element, 'lightning-formatted-text').value).toBe('Boom');
        });

        it('passes connection details to the status indicator', async () => {
            const element = createBoard();
            const component = getComponent();
            await loadState(component, {
                extra: (store) => {
                    store.dispatch(actions.setSubscriptionStatus('connected'));
                    store.dispatch(actions.setLoading(false));
                }
            });

            const indicator = $(element, 'c-connection-status-indicator');
            expect(indicator.config).toEqual(
                expect.objectContaining({
                    status: 'connected',
                    eventCount: 0,
                    syncState: 'idle',
                    pendingOperationsCount: 0,
                    pollingUpdateDetected: null
                })
            );
            expect(component.shouldAutoSubscribe).toBe(true);
            expect($(element, 'c-subscription-manager').autoSubscribe).toBe(
                true
            );
        });
    });

    describe('board interactions', () => {
        async function setup(props) {
            const element = createBoard(props);
            const component = getComponent();
            await loadState(component);
            return { element, component };
        }

        it('delegates drag and drop events to the drag-drop handler', async () => {
            const { element } = await setup();
            const card = $(element, 'article.kanban-card');
            const wrapper = $(element, '.kanban-column__card-wrapper');
            const handler = getComponent().dragDropHandler;

            card.dispatchEvent(new CustomEvent('dragstart'));
            card.dispatchEvent(new CustomEvent('dragend'));
            wrapper.dispatchEvent(new CustomEvent('dragover'));
            wrapper.dispatchEvent(new CustomEvent('drop'));
            await flushPromises();

            expect(handler.handleDragStart).toHaveBeenCalledTimes(1);
            expect(handler.handleDragEnd).toHaveBeenCalledTimes(1);
            expect(handler.handleDragOver).toHaveBeenCalledTimes(1);
            expect(handler.handleDrop).toHaveBeenCalledTimes(1);
            expect(handler.handleDragStart.mock.calls[0][0].type).toBe(
                'dragstart'
            );
        });

        it('opens a card on click', async () => {
            const { element } = await setup();
            $(element, 'article.kanban-card').click();
            expect(
                lastInstance(CardOperations).handleCardClick
            ).toHaveBeenCalledWith('card1');
        });

        it('creates a card from the column add button', async () => {
            const { element } = await setup();
            const button = $$(element, '.add-card-button')[1];
            button.click();
            await flushPromises();
            expect(
                lastInstance(CardOperations).createCard
            ).toHaveBeenCalledWith('col2', button);
        });

        it('navigates to the card record when its name is clicked', async () => {
            const { element, component } = await setup();
            component.navigationUtil = {
                navigateToRecord: jest.fn(() => Promise.resolve())
            };
            const link = $(element, 'a[data-card-id="card1"]');

            link.click();
            await flushPromises();

            expect(
                component.navigationUtil.navigateToRecord
            ).toHaveBeenCalledWith('card1', 'OpenSF__Card__c');
            // The click must not bubble to the card (which would open the panel)
            expect(
                component.cardOperations.handleCardClick
            ).not.toHaveBeenCalled();
        });

        it('does nothing on card name click without a navigation util', async () => {
            const { element, component } = await setup();
            component.navigationUtil = null;
            const link = $(element, 'a[data-card-id="card1"]');
            const event = new CustomEvent('click', { cancelable: true });

            link.dispatchEvent(event);
            await flushPromises();

            expect(event.defaultPrevented).toBe(true);
        });

        it('navigates to the column record when its header is clicked', async () => {
            const { element, component } = await setup();
            component.navigationUtil = {
                navigateToRecord: jest.fn(() => Promise.resolve())
            };

            $(element, 'a[data-column-id="col2"]').click();
            await flushPromises();

            expect(
                component.navigationUtil.navigateToRecord
            ).toHaveBeenCalledWith('col2', 'OpenSF__Column__c');
        });

        it('does nothing on column click without a navigation util', async () => {
            const { element, component } = await setup();
            component.navigationUtil = null;
            const event = new CustomEvent('click', { cancelable: true });

            $(element, 'a[data-column-id="col1"]').dispatchEvent(event);
            await flushPromises();

            expect(event.defaultPrevented).toBe(true);
        });

        it('delegates context menu events', async () => {
            const { element } = await setup();
            const manager = lastInstance(ContextMenuManager);

            $(element, 'article.kanban-card').dispatchEvent(
                new CustomEvent('contextmenu')
            );
            const menu = $(element, 'c-kanban-context-menu');
            expect(menu.menuItems).toEqual([{ label: 'Edit', value: 'edit' }]);
            menu.dispatchEvent(
                new CustomEvent('select', { detail: { value: 'edit' } })
            );
            await flushPromises();

            expect(manager.handleContextMenu).toHaveBeenCalledTimes(1);
            expect(manager.handleMenuSelect).toHaveBeenCalledTimes(1);
            expect(manager.handleMenuSelect.mock.calls[0][0].detail).toEqual({
                value: 'edit'
            });
        });

        it('delegates mobile navigation events with the filtered columns', async () => {
            const { element, component } = await setup();
            const manager = lastInstance(MobileNavigationManager);
            const [prev, next] = $$(element, '.mobile-nav-btn');
            const board = $(element, '.kanban-board');

            expect(prev.disabled).toBe(true);
            expect(next.disabled).toBe(false);
            expect(component.mobileActiveColumnId).toBe('col1');

            prev.click(); // disabled on the first column
            expect(manager.handlePrevColumn).not.toHaveBeenCalled();
            component.handleMobilePrevColumn();
            next.click();
            $(element, '.mobile-column-select').dispatchEvent(
                new CustomEvent('change')
            );
            board.dispatchEvent(new CustomEvent('touchstart'));
            board.dispatchEvent(new CustomEvent('touchend'));

            const columns = component.filteredColumns;
            expect(manager.handlePrevColumn).toHaveBeenCalledTimes(1);
            expect(manager.handleNextColumn).toHaveBeenCalledWith(columns);
            expect(manager.handleColumnChange.mock.calls[0][1]).toBe(columns);
            expect(manager.handleTouchStart).toHaveBeenCalledTimes(1);
            expect(manager.handleTouchEnd.mock.calls[0][1]).toBe(columns);
        });
    });

    describe('filters', () => {
        it('delegates filter bar events to the filter manager', async () => {
            const element = createBoard();
            await loadState(getComponent());
            const bar = $(element, 'c-kanban-filter-bar');
            const fm = lastInstance(FilterManager);
            const sm = lastInstance(SwimlaneManager);

            const fire = (name, detail) =>
                bar.dispatchEvent(new CustomEvent(name, { detail }));
            fire('searchinput', { value: 'abc' });
            fire('prioritychange', { value: 'High' });
            fire('cardtypechange', { value: 'Bug' });
            fire('epicchange', { value: 'e1' });
            fire('assigneechange', { value: ['u1'] });
            fire('swimlanechange', { value: 'assignee' });
            fire('togglehidedone');
            fire('clearfilters');

            expect(fm.handleBoardSearch.mock.calls[0][0].detail).toEqual({
                value: 'abc'
            });
            expect(fm.handlePriorityFilter).toHaveBeenCalledTimes(1);
            expect(fm.handleCardTypeFilter).toHaveBeenCalledTimes(1);
            expect(fm.handleEpicFilter).toHaveBeenCalledTimes(1);
            expect(fm.handleAssigneeFilter).toHaveBeenCalledTimes(1);
            expect(sm.handleModeChange.mock.calls[0][0].detail).toEqual({
                value: 'assignee'
            });
            expect(fm.handleToggleHideCompleted).toHaveBeenCalledTimes(1);
            expect(fm.handleClearFilters).toHaveBeenCalledTimes(1);
        });

        it('passes filter options and active-filter info to the filter bar', async () => {
            const element = createBoard();
            const component = getComponent();
            const fm = lastInstance(FilterManager);
            fm.hasActiveFilters = true;
            fm.assigneeFilterOptions = [{ label: 'Ann', value: 'u1' }];
            await loadState(component);

            const bar = $(element, 'c-kanban-filter-bar');
            expect(bar.priorityOptions).toEqual(fm.priorityFilterOptions);
            expect(bar.cardTypeOptions).toEqual(fm.cardTypeFilterOptions);
            expect(bar.assigneeOptions).toEqual([
                { label: 'Ann', value: 'u1' }
            ]);
            expect(bar.showAssigneeFilter).toBe(true);
            expect(bar.showClearFilters).toBe(true);
            expect(bar.infoText).toBe('2 cols / 2 cards');
            expect(bar.swimlaneOptions).toEqual([
                { label: 'None', value: 'none' }
            ]);
            expect(component.hasActiveFilters).toBe(true);
        });

        it('builds epic filter options from epic summaries', async () => {
            const element = createBoard();
            const component = getComponent();
            expect(component.hasEpics).toBe(false);
            expect(component.epicFilterOptions).toEqual([
                { label: 'All Epics', value: 'All' }
            ]);

            await loadState(component, {
                extra: (store) =>
                    store.dispatch(
                        actions.setEpicSummaries([
                            { id: 'e1', subject: 'Payments' },
                            { id: 'e2' }
                        ])
                    )
            });

            expect(component.hasEpics).toBe(true);
            const bar = $(element, 'c-kanban-filter-bar');
            expect(bar.showEpicFilter).toBe(true);
            expect(bar.epicOptions).toEqual([
                { label: 'All Epics', value: 'All' },
                { label: 'Payments', value: 'e1' },
                { label: 'Untitled Epic', value: 'e2' },
                { label: 'No Epic', value: '__none__' }
            ]);
        });

        it('treats an empty epic summary list as no epics', async () => {
            createBoard();
            const component = getComponent();
            await loadState(component, {
                extra: (store) => store.dispatch(actions.setEpicSummaries([]))
            });
            expect(component.hasEpics).toBe(false);
            expect(component.epicFilterOptions).toHaveLength(1);
        });
    });

    describe('swimlanes', () => {
        it('renders swimlane rows and delegates their drag events', async () => {
            createBoard();
            const component = getComponent();
            const sm = lastInstance(SwimlaneManager);
            sm.isActive = true;
            sm.getSwimlanes.mockImplementation((columns) => [
                {
                    key: 'lane-1',
                    label: 'Ann',
                    totalCards: 1,
                    columns: columns.map((col) => ({
                        ...col,
                        laneKey: `lane-1-${col.Id}`,
                        cards: col.cards.slice(0, 1)
                    }))
                }
            ]);
            component._swimlaneMode = 'assignee';
            await loadState(component);
            const element = document.body.querySelector('c-kanban-board');

            expect(component.hasSwimlanes).toBe(true);
            expect($(element, '.swimlane-label').textContent).toBe('Ann');
            expect(
                $$(element, '.swimlane-col-header .slds-truncate').map(
                    (s) => s.textContent
                )
            ).toEqual(['To Do', 'Done']);
            // swimlane context: no board-only name decoration
            expect(component.filteredColumns[0].cards[0].nameClass).toBe(
                undefined
            );
            expect(sm.getSwimlanes).toHaveBeenCalledWith(
                component.filteredColumns
            );

            const cell = $(element, '.swimlane-cell');
            const card = $(element, '.swimlane-row article.kanban-card');
            cell.dispatchEvent(new CustomEvent('dragover'));
            cell.dispatchEvent(new CustomEvent('drop'));
            card.dispatchEvent(new CustomEvent('dragstart'));
            card.click();
            await flushPromises();

            const dd = lastInstance(DragDropHandler);
            expect(dd.handleDragOver).toHaveBeenCalledTimes(1);
            expect(dd.handleDrop).toHaveBeenCalledTimes(1);
            expect(dd.handleDragStart).toHaveBeenCalledTimes(1);
            expect(
                lastInstance(CardOperations).handleCardClick
            ).toHaveBeenCalledWith('card1');
        });
    });

    describe('subscription events', () => {
        it('counts and forwards subscription messages', async () => {
            const element = createBoard();
            const component = getComponent();
            const manager = $(element, 'c-subscription-manager');
            const seh = lastInstance(SubscriptionEventHandler);

            manager.dispatchEvent(
                new CustomEvent('message', { detail: { payload: { a: 1 } } })
            );
            manager.dispatchEvent(
                new CustomEvent('statusmessage', {
                    detail: { variant: 'info', title: 'T', message: 'M' }
                })
            );
            manager.dispatchEvent(
                new CustomEvent('statuschange', {
                    detail: { status: 'polling' }
                })
            );
            manager.dispatchEvent(new CustomEvent('pollingrequired'));
            await flushPromises();

            expect(seh.handleSubscriptionMessage).toHaveBeenCalledWith({
                a: 1
            });
            expect(component._eventCount).toBe(1);
            expect(
                $(element, 'c-connection-status-indicator').config.eventCount
            ).toBe(1);
            expect(seh.handleSubscriptionStatusMessage).toHaveBeenCalledWith(
                'info',
                'T',
                'M'
            );
            expect(seh.handleSubscriptionStatusChange).toHaveBeenCalledWith(
                'polling'
            );
            expect(seh.handlePollingRequired).toHaveBeenCalledTimes(1);
        });

        it('forwards platform events and event activity', () => {
            createBoard();
            const component = getComponent();
            const seh = lastInstance(SubscriptionEventHandler);

            component.handlePlatformEvent({ data: 1 });
            component.handleEventActivity('activity');

            expect(seh.handlePlatformEvent).toHaveBeenCalledWith({ data: 1 });
            expect(seh.handleEventActivity).toHaveBeenCalledWith('activity');
        });

        it('reloads board data on sprint events with a payload only', async () => {
            const element = createBoard({ recordId: 'a01' });
            await loadState(getComponent(), {
                board: { Id: 'a01', type: 'Sprint' }
            });
            const managers = $$(element, 'c-subscription-manager');
            expect(managers).toHaveLength(2);
            const sprintManager = managers[1];
            expect(sprintManager.channelName).toBe(
                '/event/OpenSF__SprintUpdateEvent__e'
            );

            sprintManager.dispatchEvent(
                new CustomEvent('message', { detail: {} })
            );
            await flushPromises();
            expect(BoardDataLoader).not.toHaveBeenCalled();

            sprintManager.dispatchEvent(
                new CustomEvent('message', { detail: { payload: { x: 1 } } })
            );
            await flushPromises();
            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('refresh', () => {
        it('reloads, reconnects when disconnected and spins for 600ms', async () => {
            jest.useFakeTimers();
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            component.subscriptionManager = { resubscribe: jest.fn() };
            const refresh = $(element, 'button[title="Refresh"]');

            refresh.click();
            await flushPromises();

            const loader = lastInstance(BoardDataLoader);
            expect(loader.loadBoardData).toHaveBeenCalledTimes(1);
            expect(loader.stopPolling).toHaveBeenCalledTimes(1);
            expect(
                component.subscriptionManager.resubscribe
            ).toHaveBeenCalled();
            expect(refresh.className).toContain('topbar-icon-btn--spinning');

            jest.advanceTimersByTime(600);
            await flushPromises();
            expect(refresh.className).toBe('topbar-icon-btn');
            expect(component.refreshButtonClass).toBe('topbar-icon-btn');
        });

        it.each(['connected', 'connecting'])(
            'does not reconnect when the subscription is %s',
            async (status) => {
                createBoard({ recordId: 'a01' });
                const component = getComponent();
                component.subscriptionManager = { resubscribe: jest.fn() };
                component.store.dispatch(actions.setSubscriptionStatus(status));

                await component.handleRefresh();

                expect(
                    component.subscriptionManager.resubscribe
                ).not.toHaveBeenCalled();
                expect(
                    lastInstance(BoardDataLoader).stopPolling
                ).not.toHaveBeenCalled();
            }
        );

        it('does not reconnect without a subscription manager', async () => {
            createBoard({ recordId: 'a01' });
            const component = getComponent();
            component.subscriptionManager = null;

            await component.handleRefresh();

            expect(
                lastInstance(BoardDataLoader).stopPolling
            ).not.toHaveBeenCalled();
        });

        it('still resets the spinner when loading fails', async () => {
            jest.useFakeTimers();
            createBoard({ recordId: 'a01' });
            const component = getComponent();
            component.boardDataLoader.loadBoardData.mockRejectedValueOnce(
                new Error('fail')
            );

            await expect(component.handleRefresh()).rejects.toThrow('fail');
            expect(component._isRefreshing).toBe(true);

            jest.advanceTimersByTime(600);
            expect(component._isRefreshing).toBe(false);
        });

        it('delegates window focus to the lifecycle manager', () => {
            createBoard();
            getComponent().handleWindowFocus();
            expect(
                lastInstance(LifecycleManager).handleWindowFocus
            ).toHaveBeenCalled();
        });
    });

    describe('tabs', () => {
        it('switches between board, backlog and columns tabs', async () => {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            await loadState(component);
            const tabs = $$(element, '.kanban-topbar__tabs button');
            const [backlogTab, boardTab, columnsTab] = tabs;

            expect(boardTab.className).toBe('topbar-tab topbar-tab--active');
            expect(component.showBoardContent).toBe(true);

            backlogTab.click();
            await flushPromises();
            expect(component.activeTab).toBe('backlog');
            expect(backlogTab.className).toBe('topbar-tab topbar-tab--active');
            expect(boardTab.className).toBe('topbar-tab');
            expect($(element, 'c-kanban-backlog-view')).not.toBeNull();
            expect($(element, '.kanban-board-container')).toBeNull();

            columnsTab.click();
            await flushPromises();
            expect(columnsTab.className).toBe('topbar-tab topbar-tab--active');
            expect($(element, 'c-column-management')).not.toBeNull();
            expect($(element, 'c-kanban-backlog-view')).toBeNull();

            boardTab.click();
            await flushPromises();
            expect($(element, '.kanban-board-container')).not.toBeNull();
        });

        it('opens and closes the analytics modal', async () => {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            const analyticsTab = $$(element, '.kanban-topbar__tabs button')[3];

            analyticsTab.click();
            await flushPromises();
            expect(component.isAnalyticsTabActive).toBe(true);
            expect(analyticsTab.className).toBe(
                'topbar-tab topbar-tab--active'
            );
            const analytics = $(element, 'c-kanban-analytics');
            expect(analytics).not.toBeNull();

            analytics.dispatchEvent(new CustomEvent('close'));
            await flushPromises();
            expect($(element, 'c-kanban-analytics')).toBeNull();
            expect(analyticsTab.className).toBe('topbar-tab');

            component.handleShowAnalytics();
            await flushPromises();
            expect($(element, 'c-kanban-analytics')).not.toBeNull();

            // Clicking a regular tab also closes analytics
            $$(element, '.kanban-topbar__tabs button')[1].click();
            await flushPromises();
            expect(component.showAnalytics).toBe(false);
        });
    });

    describe('backlog view events', () => {
        async function setupBacklog() {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            component.handleGoToBacklog();
            await flushPromises();
            return {
                element,
                component,
                backlog: $(element, 'c-kanban-backlog-view')
            };
        }

        it('opens cards clicked in the backlog', async () => {
            const { backlog, component } = await setupBacklog();
            const ops = component.cardOperations;

            backlog.dispatchEvent(
                new CustomEvent('cardclick', { detail: { cardId: 'b1' } })
            );
            backlog.dispatchEvent(new CustomEvent('cardclick', { detail: {} }));

            expect(ops.handleCardClick).toHaveBeenCalledTimes(1);
            expect(ops.handleCardClick).toHaveBeenCalledWith('b1');
        });

        it('navigates to backlog cards when possible', async () => {
            const { backlog, component } = await setupBacklog();
            const navigateToRecord = jest.fn(() => Promise.resolve());

            backlog.dispatchEvent(
                new CustomEvent('navigatetocard', { detail: { cardId: 'b1' } })
            );
            component.navigationUtil = { navigateToRecord };
            backlog.dispatchEvent(
                new CustomEvent('navigatetocard', { detail: {} })
            );
            backlog.dispatchEvent(
                new CustomEvent('navigatetocard', { detail: { cardId: 'b2' } })
            );
            await flushPromises();

            expect(navigateToRecord).toHaveBeenCalledTimes(1);
            expect(navigateToRecord).toHaveBeenCalledWith(
                'b2',
                'OpenSF__Card__c'
            );
        });

        it('shows backlog errors through the toast manager', async () => {
            const { backlog, component } = await setupBacklog();
            const showError = jest.fn();

            backlog.dispatchEvent(
                new CustomEvent('error', { detail: { message: 'early' } })
            );
            component.toastManager = { showError };
            backlog.dispatchEvent(new CustomEvent('error', { detail: {} }));
            backlog.dispatchEvent(
                new CustomEvent('error', { detail: { message: 'Bad' } })
            );

            expect(showError).toHaveBeenCalledTimes(1);
            expect(showError).toHaveBeenCalledWith('Backlog Error', 'Bad');
        });

        it('opens the sprint modal from the backlog', async () => {
            const { backlog, element, component } = await setupBacklog();
            const sprint = { Id: 's1', Name: 'Sprint 1' };

            backlog.dispatchEvent(
                new CustomEvent('startsprint', { detail: { sprint } })
            );
            await flushPromises();
            expect(component.editSprint).toEqual(sprint);
            expect($(element, 'c-kanban-sprint-modal')).not.toBeNull();

            backlog.dispatchEvent(
                new CustomEvent('startsprint', { detail: {} })
            );
            await flushPromises();
            expect(component.editSprint).toBeNull();
            expect(component.showSprintModal).toBe(true);
        });

        it('opens sprint completion from the backlog', async () => {
            const { backlog, element } = await setupBacklog();
            backlog.dispatchEvent(new CustomEvent('completesprint'));
            await flushPromises();
            expect($(element, 'c-kanban-sprint-complete')).not.toBeNull();
        });

        it('renders the card panel on the backlog tab', async () => {
            const { element, component } = await setupBacklog();
            component.selectedCard = { Id: 'b1', Name: 'B-1' };
            component.showCardDetail = true;
            await flushPromises();

            const panel = $(element, 'c-kanban-card-panel');
            expect(panel).not.toBeNull();
            panel.dispatchEvent(new CustomEvent('close'));
            expect(
                lastInstance(CardOperations).handleCardDetailClose
            ).toHaveBeenCalled();
        });
    });

    describe('card detail panel', () => {
        async function setupPanel() {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            await loadState(component);
            component.selectedCard = { Id: 'card1', Name: 'C-1' };
            component.showCardDetail = true;
            await flushPromises();
            return {
                element,
                component,
                panel: $(element, 'c-kanban-card-panel')
            };
        }

        it('passes the selected card and panel width to the panel', async () => {
            const { panel } = await setupPanel();
            expect(panel.card).toEqual({ Id: 'card1', Name: 'C-1' });
            expect(panel.initialPanelWidth).toBe(400);
        });

        it('delegates close, update and delete events', async () => {
            const { panel, component } = await setupPanel();
            const ops = component.cardOperations;

            panel.dispatchEvent(new CustomEvent('close'));
            panel.dispatchEvent(new CustomEvent('cardupdated'));
            panel.dispatchEvent(
                new CustomEvent('carddeleted', { detail: { cardId: 'card1' } })
            );
            panel.dispatchEvent(new CustomEvent('carddeleted'));

            expect(ops.handleCardDetailClose).toHaveBeenCalledTimes(1);
            expect(ops.handleCardUpdated).toHaveBeenCalledTimes(1);
            expect(ops.handleCardDeleted).toHaveBeenCalledTimes(1);
            expect(ops.handleCardDeleted).toHaveBeenCalledWith('card1');
        });

        it('stores finite panel widths only', async () => {
            const { panel, component } = await setupPanel();

            panel.dispatchEvent(
                new CustomEvent('panelresize', { detail: { width: '520' } })
            );
            expect(component._cardPanelWidth).toBe(520);

            panel.dispatchEvent(
                new CustomEvent('panelresize', { detail: { width: 'wide' } })
            );
            panel.dispatchEvent(new CustomEvent('panelresize'));
            expect(component._cardPanelWidth).toBe(520);
        });

        it('navigates to cards from the panel', async () => {
            const { panel, component } = await setupPanel();
            const navigateToRecord = jest.fn(() => Promise.resolve());

            panel.dispatchEvent(
                new CustomEvent('navigatetocard', { detail: { cardId: 'x' } })
            );
            component.navigationUtil = { navigateToRecord };
            panel.dispatchEvent(new CustomEvent('navigatetocard'));
            panel.dispatchEvent(
                new CustomEvent('navigatetocard', {
                    detail: { cardId: 'card9' }
                })
            );
            await flushPromises();

            expect(navigateToRecord).toHaveBeenCalledTimes(1);
            expect(navigateToRecord).toHaveBeenCalledWith(
                'card9',
                'OpenSF__Card__c'
            );
        });
    });

    describe('sprint boards', () => {
        it('shows the no-active-sprint state and links to the backlog', async () => {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            await loadState(component, {
                board: { Id: 'a01', type: 'Sprint' }
            });

            expect(component.isSprintBoard).toBe(true);
            expect(component.hasNoActiveSprint).toBe(true);
            expect(component.hasActiveSprint).toBe(false);
            expect(component.activeSprintId).toBeNull();
            expect($(element, '.kanban-no-sprint-state')).not.toBeNull();
            expect($(element, '.kanban-board')).toBeNull();

            $(element, '.kanban-no-sprint-state lightning-button').click();
            await flushPromises();
            expect(component.activeTab).toBe('backlog');
        });

        it('drives sprint modals from the sprint header', async () => {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            await loadState(component, {
                board: {
                    Id: 'a01',
                    type: 'Sprint',
                    defaultSprintDurationDays: 10
                },
                extra: (store) =>
                    store.dispatch(actions.setSprint({ Id: 's1', Name: 'S1' }))
            });
            const loader = () => lastInstance(BoardDataLoader).loadBoardData;

            expect(component.hasNoActiveSprint).toBe(false);
            expect(component.activeSprintId).toBe('s1');
            expect(component.defaultSprintDurationDays).toBe(10);

            const header = $(element, 'c-kanban-sprint-header');
            header.dispatchEvent(new CustomEvent('completesprint'));
            header.dispatchEvent(new CustomEvent('showreports'));
            await flushPromises();

            const complete = $(element, 'c-kanban-sprint-complete');
            const reports = $(element, 'c-kanban-sprint-reports');
            expect(complete.sprintId).toBe('s1');
            expect(reports.sprintId).toBe('s1');
            expect(reports.boardId).toBe('a01');

            reports.dispatchEvent(new CustomEvent('close'));
            complete.dispatchEvent(new CustomEvent('close'));
            await flushPromises();
            expect($(element, 'c-kanban-sprint-reports')).toBeNull();
            expect($(element, 'c-kanban-sprint-complete')).toBeNull();

            component.handleCompleteSprint();
            await flushPromises();
            $(element, 'c-kanban-sprint-complete').dispatchEvent(
                new CustomEvent('sprintcompleted')
            );
            await flushPromises();
            expect($(element, 'c-kanban-sprint-complete')).toBeNull();
            expect(loader()).toHaveBeenCalledTimes(1);
        });

        it('handles sprint modal lifecycle events', async () => {
            const element = createBoard({ recordId: 'a01' });
            const component = getComponent();
            await loadState(component, {
                board: { Id: 'a01', type: 'Sprint' }
            });
            const openModal = async () => {
                component.handleCreateSprint();
                await flushPromises();
                return $(element, 'c-kanban-sprint-modal');
            };

            let modal = await openModal();
            expect(component.editSprint).toBeNull();
            expect(modal.defaultDurationDays).toBe(14);
            expect(modal.hasActiveSprint).toBe(false);
            component.editSprint = { Id: 's1' };
            modal.dispatchEvent(new CustomEvent('close'));
            await flushPromises();
            expect($(element, 'c-kanban-sprint-modal')).toBeNull();
            expect(component.editSprint).toBeNull();

            modal = await openModal();
            modal.dispatchEvent(new CustomEvent('sprintcreated'));
            await flushPromises();
            expect($(element, 'c-kanban-sprint-modal')).toBeNull();

            modal = await openModal();
            modal.dispatchEvent(new CustomEvent('sprintstarted'));
            await flushPromises();
            expect($(element, 'c-kanban-sprint-modal')).toBeNull();

            expect(
                lastInstance(BoardDataLoader).loadBoardData
            ).toHaveBeenCalledTimes(2);
        });
    });

    describe('experience cloud mode', () => {
        it('hides internal chrome and always shows the board', async () => {
            const element = createBoard({
                recordId: 'a01',
                experienceCloud: true
            });
            const component = getComponent();
            component.activeTab = 'backlog';
            await loadState(component, {
                board: { Id: 'a01', type: 'Sprint' }
            });

            expect(component.isInternalMode).toBe(false);
            expect(component.showBoardContent).toBe(true);
            expect(component.showBacklogContent).toBe(false);
            expect(component.showColumnsContent).toBe(false);
            expect($(element, '.kanban-topbar__tabs')).toBeNull();
            expect($(element, 'c-kanban-filter-bar')).toBeNull();
            expect($(element, '.add-card-button')).toBeNull();
            expect($(element, 'c-kanban-sprint-header').experienceCloud).toBe(
                true
            );
        });

        it('follows the href for card and column links', async () => {
            createBoard({ experienceCloud: true });
            const component = getComponent();
            component.navigationUtil = { navigateToRecord: jest.fn() };
            const makeEvent = (dataset, href) => ({
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                currentTarget: { dataset, getAttribute: () => href }
            });

            await component.handleCardNameClick(
                makeEvent({ cardId: 'card1' }, '#card1')
            );
            expect(window.location.hash).toBe('#card1');

            await component.handleColumnClick(
                makeEvent({ columnId: 'col1' }, '#col1')
            );
            expect(window.location.hash).toBe('#col1');

            await component.handleCardNameClick(
                makeEvent({ cardId: 'card1' }, null)
            );
            await component.handleColumnClick(
                makeEvent({ columnId: 'col1' }, null)
            );
            expect(window.location.hash).toBe('#col1');
            expect(
                component.navigationUtil.navigateToRecord
            ).not.toHaveBeenCalled();
        });

        it('ignores link clicks without an id', async () => {
            createBoard();
            const component = getComponent();
            component.navigationUtil = { navigateToRecord: jest.fn() };
            const event = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                currentTarget: { dataset: {} }
            };

            await component.handleCardNameClick(event);
            await component.handleColumnClick(event);

            expect(event.preventDefault).toHaveBeenCalledTimes(2);
            expect(
                component.navigationUtil.navigateToRecord
            ).not.toHaveBeenCalled();
        });
    });
});
