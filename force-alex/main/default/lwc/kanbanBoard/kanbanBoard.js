import { LightningElement, api, track, wire } from 'lwc';
import { createStore, selectors, moveCardToBacklogAsync } from 'c/kanbanStore';
import getKanbanConfig from '@salesforce/apex/KanbanBoardController.getKanbanConfig';
import EventHandler from './handlers/eventHandler';
import RequestTracker from './helpers/requestTracker';
import ReducerQueue from './helpers/reducerQueue';
import LifecycleManager from './managers/lifecycleManager';
import BoardDataLoader from './managers/boardDataLoader';
import DragDropHandler from './handlers/dragDropHandler';
import CardOperations from './handlers/cardOperations';
import SubscriptionEventHandler from './handlers/subscriptionEventHandler';
import { generateClientId } from './helpers/clientIdGenerator';

export default class KanbanBoard extends LightningElement {
    @api height; // Optional fixed height, if not set uses dynamic calculation

    // Private properties
    _recordId;
    _store = null;
    _storeUnsubscribe = null;
    _resizeObserver = null;
    _wrapperElement = null;
    _windowResizeHandler = null;
    _clientId = null; // Unique ID for this browser window/tab

    // Reactive state - only track what needs reactivity
    @track _storeState = null;

    // UI State - these don't need @track as they're reassigned directly
    selectedCard = null;
    showCardDetail = false;
    @track _eventCount = 0; // Needs @track for indicator reactivity
    @track _lastSyncTime = null; // Needs @track for indicator reactivity

    // Config
    @track _showDebugInfo = false;

    // Tab state
    @track activeTab = 'board';
    @track _isRefreshing = false;

    // Board filter state
    @track _boardSearchTerm = '';
    @track _boardFilterPriority = 'All';
    @track _boardFilterCardType = 'All';
    @track _boardHideCompleted = false;
    _searchDebounceTimer = null;

    // Sprint UI state
    @track showSprintModal = false;
    @track showSprintComplete = false;
    @track showSprintReports = false;
    @track editSprint = null;

    // Undo/redo state
    @track _canUndo = false;
    @track _canRedo = false;
    _keyboardHandler = null;

    // Drag state
    dragData = null;
    dragPlaceholder = null;
    lastPlaceholderPosition = null;

    // Child component references (set in renderedCallback)
    subscriptionManager = null; // Only needed for polling callback
    toastManager = null;
    navigationUtil = null;

    // Internal services
    eventHandler = null;
    requestTracker = null;
    operationQueue = null;
    windowFocusListener = null;
    subscriptionChannelName = '/event/OpenSF__CardUpdateEvent__e';
    sprintSubscriptionChannelName = '/event/OpenSF__SprintUpdateEvent__e';

    // Lazy-loaded helper instances
    _lifecycleManager = null;
    _boardDataLoader = null;
    _dragDropHandler = null;
    _cardOperations = null;
    _subscriptionEventHandler = null;

    // Store accessor
    get store() {
        if (!this._store) {
            this._store = createStore();
            // Enable devtools if config already arrived (wire fired before connectedCallback)
            if (this._enableDevTools) {
                this._store.enableDevTools();
            }
        }
        return this._store;
    }

    // Computed properties from store
    get columns() {
        return this._storeState
            ? selectors.getEnrichedColumns(this._storeState)
            : [];
    }

    get filteredColumns() {
        const cols = this.columns;
        if (!cols || cols.length === 0) return [];

        const search = this._boardSearchTerm.toLowerCase().trim();
        const priority = this._boardFilterPriority;
        const cardType = this._boardFilterCardType;
        const hideCompleted = this._boardHideCompleted;
        const hasFilter =
            search || priority !== 'All' || cardType !== 'All' || hideCompleted;

        if (!hasFilter) return cols;

        return cols.map((col) => {
            // Hide Done and Released columns when toggle is on
            if (hideCompleted && col.isCompleted) {
                return { ...col, cards: [], cardCount: 0, isHidden: true };
            }

            const filtered = (col.cards || []).filter((card) => {
                // Search: match subject, Name, cardType, assignee name
                if (search) {
                    const haystack = [
                        card.subject,
                        card.Name,
                        card.cardType,
                        card.assignee?.name,
                        card.status
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(search)) return false;
                }

                // Priority filter
                if (priority !== 'All' && card.priority !== priority) {
                    return false;
                }

                // Card type filter
                if (cardType !== 'All' && card.cardType !== cardType) {
                    return false;
                }

                return true;
            });

            return { ...col, cards: filtered, cardCount: filtered.length };
        });
    }

    get hasActiveFilters() {
        return (
            this._boardSearchTerm.trim() ||
            this._boardFilterPriority !== 'All' ||
            this._boardFilterCardType !== 'All' ||
            this._boardHideCompleted
        );
    }

    get filteredCardCount() {
        if (!this.hasActiveFilters) return null;
        return this.filteredColumns.reduce(
            (sum, col) => sum + (col.cardCount || 0),
            0
        );
    }

    get totalCardCount() {
        return this.columns.reduce(
            (sum, col) => sum + (col.cards?.length || 0),
            0
        );
    }

    get filterSummary() {
        if (!this.hasActiveFilters) return '';
        return `${this.filteredCardCount} of ${this.totalCardCount} cards`;
    }

    get priorityFilterOptions() {
        return [
            { label: 'All Priorities', value: 'All' },
            { label: 'Blocking', value: 'Blocking' },
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' },
            { label: 'Trivial', value: 'Trivial' }
        ];
    }

    get cardTypeFilterOptions() {
        return [
            { label: 'All Types', value: 'All' },
            { label: 'Story', value: 'Story' },
            { label: 'Bug', value: 'Bug' },
            { label: 'Task', value: 'Task' },
            { label: 'Epic', value: 'Epic' }
        ];
    }

    get hideCompletedClass() {
        return this._boardHideCompleted
            ? 'filter-toggle filter-toggle--active'
            : 'filter-toggle';
    }

    get cardsByColumn() {
        return this._storeState
            ? selectors.getCardsByColumnMap(this._storeState)
            : {};
    }

    get board() {
        return this._storeState ? selectors.getBoard(this._storeState) : null;
    }

    get syncState() {
        return this._storeState
            ? selectors.getSyncState(this._storeState)
            : 'idle';
    }

    get pendingOperationsCount() {
        return this._storeState
            ? selectors.getPendingOperations(this._storeState).length
            : 0;
    }

    get lastSyncError() {
        return this._storeState
            ? selectors.getLastSyncError(this._storeState)
            : null;
    }

    get isLoading() {
        return this._storeState
            ? selectors.getIsLoading(this._storeState)
            : true;
    }

    get error() {
        return this._storeState ? selectors.getError(this._storeState) : null;
    }

    get _subscriptionStatus() {
        return this._storeState
            ? selectors.getSubscriptionStatus(this._storeState)
            : 'disconnected';
    }

    get shouldAutoSubscribe() {
        // Auto-subscribe when board is loaded and not already loading
        return !!this.board && !this.isLoading;
    }

    // Lazy getters for helper instances
    get lifecycleManager() {
        if (!this._lifecycleManager) {
            this._lifecycleManager = new LifecycleManager(this);
        }
        return this._lifecycleManager;
    }

    get boardDataLoader() {
        if (!this._boardDataLoader) {
            this._boardDataLoader = new BoardDataLoader(this);
        }
        return this._boardDataLoader;
    }

    get dragDropHandler() {
        if (!this._dragDropHandler) {
            this._dragDropHandler = new DragDropHandler(this);
        }
        return this._dragDropHandler;
    }

    get cardOperations() {
        if (!this._cardOperations) {
            this._cardOperations = new CardOperations(this);
        }
        return this._cardOperations;
    }

    get subscriptionEventHandler() {
        if (!this._subscriptionEventHandler) {
            this._subscriptionEventHandler = new SubscriptionEventHandler(this);
        }
        return this._subscriptionEventHandler;
    }

    @wire(getKanbanConfig)
    wiredConfig({ data }) {
        if (data) {
            this._showDebugInfo = data.showDebugInfo === true;
            this._enableDevTools = data.enableDevTools === true;
            // Enable devtools if store already exists (wire fired after connectedCallback)
            if (this._enableDevTools && this._store) {
                this._store.enableDevTools();
            }
        }
    }

    get showDebugInfo() {
        return this._showDebugInfo;
    }

    @api
    get recordId() {
        return this._recordId;
    }

    set recordId(value) {
        const hasChanged = this._recordId !== value;
        this._recordId = value;

        // Only load if value exists and component is connected
        if (value && hasChanged && this._storeUnsubscribe) {
            this.loadBoardData();
        }
    }

    connectedCallback() {
        // Generate unique client ID for this window/tab
        this._clientId = generateClientId();

        // Initialize core services
        this.requestTracker = new RequestTracker(this._clientId);
        this.operationQueue = new ReducerQueue(this.store);
        this.eventHandler = new EventHandler(
            this.requestTracker,
            (message) =>
                this.subscriptionEventHandler.handleEventActivity(message),
            this._recordId,
            this._clientId
        );

        // Subscribe to store updates
        this._storeUnsubscribe = this.store.subscribe((state) => {
            this._storeState = state;
            this._refreshUndoRedoState();
        });

        // Keyboard shortcuts for undo/redo
        this._keyboardHandler = this._handleKeyboard.bind(this);
        // eslint-disable-next-line @lwc/lwc/no-document-query
        document.addEventListener('keydown', this._keyboardHandler);

        // Initialize lifecycle (lazy getters handle instance creation)
        this.lifecycleManager.initialize();
    }
    renderedCallback() {
        if (this.lifecycleManager) {
            this.lifecycleManager.initializeChildComponents(this.template);
        }

        // Initialize dynamic height calculation
        if (!this._resizeObserver) {
            this.initializeDynamicHeight();
        }
    }

    disconnectedCallback() {
        // Only cleanup if lifecycle manager was instantiated
        if (this._lifecycleManager) {
            this._lifecycleManager.cleanup();
        }

        // Cleanup resize observer
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        // Cleanup window resize listener
        if (this._windowResizeHandler) {
            window.removeEventListener('resize', this._windowResizeHandler);
            this._windowResizeHandler = null;
        }

        // Cleanup keyboard listener
        if (this._keyboardHandler) {
            // eslint-disable-next-line @lwc/lwc/no-document-query
            document.removeEventListener('keydown', this._keyboardHandler);
            this._keyboardHandler = null;
        }

        // Cleanup search debounce timer
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
        }
    }

    // =============================================================================
    // Data Loading
    // =============================================================================

    async loadBoardData() {
        if (!this._recordId) {
            return;
        }

        // Use lazy getter to ensure boardDataLoader is instantiated
        await this.boardDataLoader.loadBoardData();

        // Clear DevTools history after first load so only
        // user-initiated actions are undoable.
        if (this.store.devTools && !this._initialLoadDone) {
            this._initialLoadDone = true;
            this.store.devTools.clear();
        }
    } // =============================================================================
    // Drag & Drop Event Handlers
    // =============================================================================

    handleDragStart(event) {
        this.dragDropHandler.handleDragStart(event);
    }

    handleDragEnd(event) {
        this.dragDropHandler.handleDragEnd(event);
    }

    handleDragOver(event) {
        this.dragDropHandler.handleDragOver(event);
    }

    async handleDrop(event) {
        await this.dragDropHandler.handleDrop(event);
    }

    // =============================================================================
    // Card Event Handlers
    // =============================================================================

    handleCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;
        this.cardOperations.handleCardClick(cardId);
    }

    async handleCardNameClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const cardId = event.currentTarget.dataset.cardId;

        if (!cardId || !this.navigationUtil) {
            return;
        }

        await this.navigationUtil.navigateToRecord(cardId, 'OpenSF__Card__c');
    }

    handleCardDetailClose() {
        this.cardOperations.handleCardDetailClose();
    }

    handleCardUpdated() {
        this.cardOperations.handleCardUpdated();
    }

    handleCardDeleted(event) {
        const cardId = event?.detail?.cardId;
        if (cardId) {
            this.cardOperations.handleCardDeleted(cardId);
        }
    }

    async handleAddCard(event) {
        const button = event.currentTarget;
        const columnId = button.dataset.columnId;
        await this.cardOperations.createCard(columnId, button);
    }

    // =============================================================================
    // Column Event Handlers
    // =============================================================================

    async handleColumnClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const columnId = event.currentTarget.dataset.columnId;

        if (!columnId || !this.navigationUtil) {
            return;
        }

        await this.navigationUtil.navigateToRecord(
            columnId,
            'OpenSF__Column__c'
        );
    }

    // =============================================================================
    // Subscription Event Handlers
    // =============================================================================

    handlePlatformEvent(event) {
        this.subscriptionEventHandler.handlePlatformEvent(event);
    }

    handleEventActivity(message) {
        this.subscriptionEventHandler.handleEventActivity(message);
    }

    handleSubscriptionMessage(event) {
        const { payload } = event.detail;
        this._eventCount++;
        this.subscriptionEventHandler.handleSubscriptionMessage(payload);
    }

    handleSubscriptionStatusMessage(event) {
        const { variant, title, message } = event.detail;
        this.subscriptionEventHandler.handleSubscriptionStatusMessage(
            variant,
            title,
            message
        );
    }

    handlePollingRequired() {
        this.subscriptionEventHandler.handlePollingRequired();
    }

    handleSubscriptionStatusChange(event) {
        const { status } = event.detail;
        this.subscriptionEventHandler.handleSubscriptionStatusChange(status);
    }

    // =============================================================================
    // Sprint Subscription Handler
    // =============================================================================

    handleSprintSubscriptionMessage(event) {
        // Reload sprint data when sprint events are received
        const { payload } = event.detail;
        if (payload) {
            this.loadBoardData();
        }
    }

    // =============================================================================
    // UI Event Handlers
    // =============================================================================

    async handleRefresh() {
        this._isRefreshing = true;
        try {
            await this.loadBoardData();
        } finally {
            // Keep spinning for at least 600ms so user sees feedback
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this._isRefreshing = false;
            }, 600);
        }
    }

    get refreshButtonClass() {
        return this._isRefreshing
            ? 'topbar-icon-btn topbar-icon-btn--spinning'
            : 'topbar-icon-btn';
    }

    // =============================================================================
    // Undo / Redo
    // =============================================================================

    get hasDevTools() {
        return !!this.store.devTools;
    }

    get isUndoDisabled() {
        return !this._canUndo;
    }

    get isRedoDisabled() {
        return !this._canRedo;
    }

    get undoButtonClass() {
        return this._canUndo
            ? 'topbar-icon-btn'
            : 'topbar-icon-btn topbar-icon-btn--disabled';
    }

    get redoButtonClass() {
        return this._canRedo
            ? 'topbar-icon-btn'
            : 'topbar-icon-btn topbar-icon-btn--disabled';
    }

    get _isMac() {
        return /mac/i.test(
            navigator.userAgentData?.platform || navigator.platform || ''
        );
    }

    get undoTooltip() {
        return this._isMac ? 'Undo (\u2318Z)' : 'Undo (Ctrl+Z)';
    }

    get redoTooltip() {
        return this._isMac ? 'Redo (\u2318\u21E7Z)' : 'Redo (Ctrl+Y)';
    }

    _refreshUndoRedoState() {
        const dt = this.store.devTools;
        if (dt) {
            this._canUndo = dt.canUndo();
            this._canRedo = dt.canRedo();
        }
    }

    handleUndo() {
        const dt = this.store.devTools;
        if (!dt) return;
        const state = dt.undo();
        if (state) {
            this.store._applyState(state);
            this._refreshUndoRedoState();
        }
    }

    handleRedo() {
        const dt = this.store.devTools;
        if (!dt) return;
        const state = dt.redo();
        if (state) {
            this.store._applyState(state);
            this._refreshUndoRedoState();
        }
    }

    _handleKeyboard(event) {
        if (!this.store.devTools) return;

        const isMeta = event.metaKey || event.ctrlKey;
        if (!isMeta) return;

        // Ignore when typing in inputs/textareas
        const tag = event.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (event.key === 'z' || event.key === 'Z') {
            if (event.shiftKey) {
                // Ctrl+Shift+Z or Cmd+Shift+Z → Redo
                event.preventDefault();
                this.handleRedo();
            } else {
                // Ctrl+Z or Cmd+Z → Undo
                event.preventDefault();
                this.handleUndo();
            }
        } else if (event.key === 'y' || event.key === 'Y') {
            // Ctrl+Y → Redo (Windows/Linux)
            event.preventDefault();
            this.handleRedo();
        }
    }

    handleWindowFocus() {
        this.lifecycleManager.handleWindowFocus();
    }

    // =============================================================================
    // Dynamic Height Management
    // =============================================================================

    initializeDynamicHeight() {
        this._wrapperElement = this.template.querySelector(
            '.kanban-board-wrapper'
        );

        if (!this._wrapperElement) {
            return;
        }

        // If height is manually set, use it and skip dynamic calculation
        if (this.height) {
            this._wrapperElement.style.setProperty(
                '--board-height',
                this.height
            );
            return;
        }

        // Initial height calculation
        this.updateBoardHeight();

        // Create ResizeObserver to handle viewport changes, zoom, etc.
        this._resizeObserver = new ResizeObserver(() => {
            this.updateBoardHeight();
        });

        // Observe the wrapper element
        this._resizeObserver.observe(this._wrapperElement);

        // Also observe viewport changes via window resize
        this._windowResizeHandler = this.updateBoardHeight.bind(this);
        window.addEventListener('resize', this._windowResizeHandler);
    }

    updateBoardHeight() {
        if (!this._wrapperElement || this.height) {
            return; // Skip dynamic calculation if height is manually set
        }

        // Get the wrapper's position relative to viewport
        const rect = this._wrapperElement.getBoundingClientRect();

        // Fill to near-bottom of viewport — no page scrolling
        const buffer = 24;
        const availableHeight = window.innerHeight - rect.top - buffer;

        // Set minimum height to prevent collapse
        const minHeight = 300;
        const calculatedHeight = Math.max(minHeight, availableHeight);

        // Update CSS custom property on wrapper
        this._wrapperElement.style.setProperty(
            '--board-height',
            `${calculatedHeight}px`
        );
    }

    get hasColumns() {
        return this.columns && this.columns.length > 0;
    }

    // =============================================================================
    // Tab Getters
    // =============================================================================

    get isBoardTabActive() {
        return this.activeTab === 'board';
    }

    get isBacklogTabActive() {
        return this.activeTab === 'backlog';
    }

    get boardTabButtonClass() {
        return this.activeTab === 'board'
            ? 'topbar-tab topbar-tab--active'
            : 'topbar-tab';
    }

    get backlogTabButtonClass() {
        return this.activeTab === 'backlog'
            ? 'topbar-tab topbar-tab--active'
            : 'topbar-tab';
    }

    get backlogCardCount() {
        return this._storeState
            ? selectors.getBacklogCardCount(this._storeState)
            : 0;
    }

    get connectionStatusConfig() {
        return {
            status: this._subscriptionStatus,
            eventCount: this._eventCount,
            lastSyncTime: this._lastSyncTime,
            syncState: this.syncState,
            pendingOperationsCount: this.pendingOperationsCount,
            lastSyncError: this.lastSyncError,
            pollingUpdateDetected: this._storeState
                ? this._storeState.pollingUpdateDetected
                : null
        };
    }

    // =============================================================================
    // Sprint Getters
    // =============================================================================

    get isSprintBoard() {
        return this._storeState
            ? selectors.isSprintBoard(this._storeState)
            : false;
    }

    get activeSprint() {
        return this._storeState
            ? selectors.getActiveSprint(this._storeState)
            : null;
    }

    get activeSprintId() {
        return this.activeSprint?.Id || null;
    }

    // =============================================================================
    // Tab Event Handlers
    // =============================================================================

    handleTabClick(event) {
        event.preventDefault();
        this.activeTab = event.currentTarget.dataset.tabId;
    }

    // =============================================================================
    // Board Filter Handlers
    // =============================================================================

    handleBoardSearch(event) {
        const value = event.target.value;
        // Debounce search input for smooth typing
        if (this._searchDebounceTimer) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            clearTimeout(this._searchDebounceTimer);
        }
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._searchDebounceTimer = setTimeout(() => {
            this._boardSearchTerm = value;
        }, 150);
    }

    handlePriorityFilter(event) {
        this._boardFilterPriority = event.target.value;
    }

    handleCardTypeFilter(event) {
        this._boardFilterCardType = event.target.value;
    }

    handleToggleHideCompleted() {
        this._boardHideCompleted = !this._boardHideCompleted;
    }

    handleClearFilters() {
        this._boardSearchTerm = '';
        this._boardFilterPriority = 'All';
        this._boardFilterCardType = 'All';
        this._boardHideCompleted = false;
        // Clear the search input element value
        const searchInput = this.template.querySelector('.board-filter-search');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    handleCreateSprint() {
        this.editSprint = null;
        this.showSprintModal = true;
    }

    handleCompleteSprint() {
        this.showSprintComplete = true;
    }

    handleShowReports() {
        this.showSprintReports = true;
    }

    handleSprintModalClose() {
        this.showSprintModal = false;
        this.editSprint = null;
    }

    handleSprintCreated() {
        this.showSprintModal = false;
        this.loadBoardData();
    }

    handleSprintStarted() {
        this.showSprintModal = false;
        this.loadBoardData();
    }

    handleSprintCompleteClose() {
        this.showSprintComplete = false;
    }

    handleSprintCompleted() {
        this.showSprintComplete = false;
        this.loadBoardData();
    }

    handleSprintReportsClose() {
        this.showSprintReports = false;
    }

    // =============================================================================
    // Board Context Menu
    // =============================================================================

    _boardContextMenuCardId = null;

    get boardContextMenuItems() {
        return [
            {
                label: 'Move to Backlog',
                value: 'moveToBacklog',
                icon: 'utility:back'
            },
            {
                label: 'Delete',
                value: 'delete',
                icon: 'utility:delete',
                dividerBefore: true
            }
        ];
    }

    handleBoardCardContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        this._boardContextMenuCardId = cardId;
        const contextMenu = this.template.querySelector(
            'c-kanban-context-menu'
        );
        if (contextMenu) {
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    async handleBoardContextMenuSelect(event) {
        const { value } = event.detail;
        const cardId = this._boardContextMenuCardId;
        if (!cardId || !this.store) return;

        switch (value) {
            case 'moveToBacklog':
                await this.store.dispatch(
                    moveCardToBacklogAsync(
                        this.activeSprint?.Id || null,
                        cardId
                    )
                );
                break;
            case 'delete':
                this.cardOperations.handleCardDeleted(cardId);
                break;
            default:
                break;
        }
    }

    // =============================================================================
    // Backlog Event Handlers
    // =============================================================================

    handleBacklogCardClick(event) {
        const cardId = event.detail?.cardId;
        if (cardId) {
            this.cardOperations.handleCardClick(cardId);
        }
    }

    async handleBacklogNavigateToCard(event) {
        const cardId = event.detail?.cardId;
        if (cardId && this.navigationUtil) {
            await this.navigationUtil.navigateToRecord(
                cardId,
                'OpenSF__Card__c'
            );
        }
    }

    async handlePanelNavigateToCard(event) {
        const cardId = event.detail?.cardId;
        if (cardId && this.navigationUtil) {
            await this.navigationUtil.navigateToRecord(
                cardId,
                'OpenSF__Card__c'
            );
        }
    }

    handleBacklogError(event) {
        const message = event.detail?.message;
        if (message && this.toastManager) {
            this.toastManager.showError('Backlog Error', message);
        }
    }
}
