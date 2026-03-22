import { LightningElement, api, track, wire } from 'lwc';
import { createStore, selectors } from 'c/kanbanStore';
import getKanbanConfig from '@salesforce/apex/KanbanBoardController.getKanbanConfig';
import EventHandler from './handlers/eventHandler';
import RequestTracker from './helpers/requestTracker';
import ReducerQueue from './helpers/reducerQueue';
import LifecycleManager from './managers/lifecycleManager';
import BoardDataLoader from './managers/boardDataLoader';
import DragDropHandler from './handlers/dragDropHandler';
import CardOperations from './handlers/cardOperations';
import SubscriptionEventHandler from './handlers/subscriptionEventHandler';
import FilterManager from './managers/filterManager';
import SwimlaneManager from './managers/swimlaneManager';
import MobileNavigationManager from './managers/mobileNavigationManager';
import ContextMenuManager from './managers/contextMenuManager';
import { generateClientId } from './helpers/clientIdGenerator';

/**
 * @typedef {Object} CardDTO
 * @property {string} id
 * @property {string} name
 * @property {string} subject
 * @property {string} [description]
 * @property {string} [priority]
 * @property {string} [status]
 * @property {string} [cardType]
 * @property {string} [color]
 * @property {string} [dueDate]
 * @property {number} [storyPoints]
 * @property {string} columnId
 * @property {string} boardId
 * @property {string} [lexoRankPosition]
 * @property {number} [sequenceNumber]
 * @property {boolean} [locked]
 * @property {boolean} [needsRefinement]
 * @property {{id: string, name: string, photoUrl: string}} [assignee]
 * @property {{id: string, name: string}} [peerReviewer]
 * @property {{id: string, subject: string}} [epic]
 */

/**
 * @typedef {Object} ColumnDTO
 * @property {string} id
 * @property {string} name
 * @property {string} columnHeader
 * @property {string} boardId
 * @property {string} [lexoRankPosition]
 * @property {string} [color]
 * @property {string} [status]
 * @property {string} [category]
 * @property {number} [cardCount]
 */

/**
 * @typedef {Object} SprintDTO
 * @property {string} id
 * @property {string} name
 * @property {string} boardId
 * @property {string} [goal]
 * @property {string} status - 'Planning' | 'Active' | 'Completed'
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {number} [sprintNumber]
 * @property {number} [totalStoryPoints]
 * @property {number} [completedStoryPoints]
 * @property {number} [velocity]
 */

export default class KanbanBoard extends LightningElement {
    /** @type {string|undefined} Optional fixed height; if not set, uses dynamic calculation */
    @api height;
    /** @type {boolean} Experience Cloud mode for community portal */
    @api experienceCloud = false;

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
    @track _boardFilterEpic = 'All';
    @track _boardHideCompleted = false;
    _searchDebounceTimer = null;

    // Mobile state
    @track _mobileActiveColumnIndex = 0;

    // Sprint UI state
    @track showSprintModal = false;
    @track showSprintComplete = false;
    @track showSprintReports = false;
    @track editSprint = null;

    // Analytics UI state
    @track showAnalytics = false;

    // Swimlane state
    @track _swimlaneMode = 'none'; // 'none', 'assignee', 'priority', 'cardType', 'epic'

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
    _filterManager = null;
    _swimlaneManager = null;
    _mobileNavigationManager = null;
    _contextMenuManager = null;

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
        return this.filterManager.getFilteredColumns();
    }

    get hasActiveFilters() {
        return this.filterManager.hasActiveFilters;
    }

    get filteredCardCount() {
        return this.filterManager.getFilteredCardCount(this.filteredColumns);
    }

    get totalCardCount() {
        return this.columns.reduce(
            (sum, col) => sum + (col.cards?.length || 0),
            0
        );
    }

    get filterSummary() {
        return this.filterManager.getFilterSummary(
            this.filteredColumns,
            this.totalCardCount
        );
    }

    get priorityFilterOptions() {
        return this.filterManager.priorityFilterOptions;
    }

    get cardTypeFilterOptions() {
        return this.filterManager.cardTypeFilterOptions;
    }

    get epicFilterOptions() {
        const summaries = this._storeState?.epicSummaries || [];
        if (summaries.length === 0) {
            return [{ label: 'All Epics', value: 'All' }];
        }
        return [
            { label: 'All Epics', value: 'All' },
            ...summaries.map((e) => ({
                label: e.subject || 'Untitled Epic',
                value: e.id
            })),
            { label: 'No Epic', value: '__none__' }
        ];
    }

    get hasEpics() {
        const summaries = this._storeState?.epicSummaries;
        return summaries != null && summaries.length > 0;
    }

    get showHideDoneToggle() {
        return this.filterManager.showHideDoneToggle;
    }

    get hideCompletedClass() {
        return this.filterManager.hideCompletedClass;
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

    get filterManager() {
        if (!this._filterManager) {
            this._filterManager = new FilterManager(this);
        }
        return this._filterManager;
    }

    get swimlaneManager() {
        if (!this._swimlaneManager) {
            this._swimlaneManager = new SwimlaneManager(this);
        }
        return this._swimlaneManager;
    }

    get mobileNavigationManager() {
        if (!this._mobileNavigationManager) {
            this._mobileNavigationManager = new MobileNavigationManager(this);
        }
        return this._mobileNavigationManager;
    }

    get contextMenuManager() {
        if (!this._contextMenuManager) {
            this._contextMenuManager = new ContextMenuManager(this);
        }
        return this._contextMenuManager;
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

        if (!cardId) {
            return;
        }

        // In Experience Cloud mode, let the browser handle navigation via href
        if (this.experienceCloud) {
            const href = event.currentTarget.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
            return;
        }

        if (!this.navigationUtil) {
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

        if (!columnId) {
            return;
        }

        // In Experience Cloud mode, let the browser handle navigation via href
        if (this.experienceCloud) {
            const href = event.currentTarget.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
            return;
        }

        if (!this.navigationUtil) {
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

    get isInternalMode() {
        return !this.experienceCloud;
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

    // In Experience Cloud mode, always show board (no tabs)
    get showBoardContent() {
        return this.experienceCloud || this.isBoardTabActive;
    }

    // Backlog is internal-only
    get showBacklogContent() {
        return !this.experienceCloud && this.isBacklogTabActive;
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
        this.filterManager.handleBoardSearch(event);
    }

    handlePriorityFilter(event) {
        this.filterManager.handlePriorityFilter(event);
    }

    handleCardTypeFilter(event) {
        this.filterManager.handleCardTypeFilter(event);
    }

    handleEpicFilter(event) {
        this.filterManager.handleEpicFilter(event);
    }

    handleToggleHideCompleted() {
        this.filterManager.handleToggleHideCompleted();
    }

    handleClearFilters() {
        this.filterManager.handleClearFilters();
    }

    // =============================================================================
    // Swimlane Logic
    // =============================================================================

    get swimlaneModeOptions() {
        return this.swimlaneManager.modeOptions;
    }

    get hasSwimlanes() {
        return this.swimlaneManager.isActive;
    }

    get swimlanes() {
        return this.swimlaneManager.getSwimlanes(this.filteredColumns);
    }

    handleSwimlaneChange(event) {
        this.swimlaneManager.handleModeChange(event);
    }

    // =============================================================================
    // Analytics Handlers
    // =============================================================================

    handleShowAnalytics() {
        this.showAnalytics = true;
    }

    handleAnalyticsClose() {
        this.showAnalytics = false;
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

    get boardContextMenuItems() {
        return this.contextMenuManager.defaultMenuItems;
    }

    handleBoardCardContextMenu(event) {
        this.contextMenuManager.handleContextMenu(event);
    }

    async handleBoardContextMenuSelect(event) {
        await this.contextMenuManager.handleMenuSelect(event);
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

    // =============================================================================
    // Mobile Column Navigation
    // =============================================================================

    get mobileActiveColumnId() {
        return this.mobileNavigationManager.getActiveColumnId(
            this.filteredColumns
        );
    }

    get mobileColumnCounter() {
        return this.mobileNavigationManager.getColumnCounter(
            this.filteredColumns
        );
    }

    get isMobileFirstColumn() {
        return this.mobileNavigationManager.isFirstColumn;
    }

    get isMobileLastColumn() {
        return this.mobileNavigationManager.isLastColumn(this.filteredColumns);
    }

    handleMobileColumnChange(event) {
        this.mobileNavigationManager.handleColumnChange(
            event,
            this.filteredColumns
        );
    }

    handleMobilePrevColumn() {
        this.mobileNavigationManager.handlePrevColumn();
    }

    handleMobileNextColumn() {
        this.mobileNavigationManager.handleNextColumn(this.filteredColumns);
    }

    handleTouchStart(event) {
        this.mobileNavigationManager.handleTouchStart(event);
    }

    handleTouchEnd(event) {
        this.mobileNavigationManager.handleTouchEnd(
            event,
            this.filteredColumns
        );
    }
}
