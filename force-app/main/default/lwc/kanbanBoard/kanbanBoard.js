import { LightningElement, api, track } from 'lwc';
import { createStore, selectors, moveCardToBacklog, deleteCard } from 'c/kanbanStore';
import { removeCardFromSprintAsync } from 'c/kanbanStore';
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
    _boardElement = null;
    _windowResizeHandler = null;
    _clientId = null; // Unique ID for this browser window/tab

    // Reactive state - only track what needs reactivity
    @track _storeState = null;

    // UI State - these don't need @track as they're reassigned directly
    selectedCard = null;
    showCardDetail = false;
    @track _eventCount = 0; // Needs @track for indicator reactivity
    @track _lastSyncTime = null; // Needs @track for indicator reactivity

    // Tab state
    @track activeTab = 'board';

    // Sprint UI state
    @track showSprintModal = false;
    @track showSprintComplete = false;
    @track showSprintReports = false;
    @track editSprint = null;

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
        }
        return this._store;
    }

    // Computed properties from store
    get columns() {
        return this._storeState
            ? selectors.getEnrichedColumns(this._storeState)
            : [];
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
        });

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

    handleRefresh() {
        this.loadBoardData();
    }

    handleWindowFocus() {
        this.lifecycleManager.handleWindowFocus();
    }

    // =============================================================================
    // Dynamic Height Management
    // =============================================================================

    initializeDynamicHeight() {
        this._boardElement = this.template.querySelector('.kanban-board');

        if (!this._boardElement) {
            return;
        }

        // If height is manually set, use it and skip dynamic calculation
        if (this.height) {
            this._boardElement.style.setProperty('--board-height', this.height);
            return;
        }

        // Initial height calculation
        this.updateBoardHeight();

        // Create ResizeObserver to handle viewport changes, zoom, etc.
        this._resizeObserver = new ResizeObserver(() => {
            this.updateBoardHeight();
        });

        // Observe the board element itself
        this._resizeObserver.observe(this._boardElement);

        // Also observe viewport changes via window resize
        this._windowResizeHandler = this.updateBoardHeight.bind(this);
        window.addEventListener('resize', this._windowResizeHandler);
    }

    updateBoardHeight() {
        if (!this._boardElement || this.height) {
            return; // Skip dynamic calculation if height is manually set
        }

        // Get the board element's position relative to viewport
        const rect = this._boardElement.getBoundingClientRect();

        // Calculate available height:
        // viewport height - distance from top - padding/margin buffer
        const buffer = 80; // Space for bottom padding and any floating elements
        const availableHeight = window.innerHeight - rect.top - buffer;

        // Set minimum height to prevent collapse
        const minHeight = 400;
        const calculatedHeight = Math.max(minHeight, availableHeight);

        // Update CSS custom property
        this._boardElement.style.setProperty(
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

    get boardTabClass() {
        return this.activeTab === 'board'
            ? 'slds-tabs_default__item slds-is-active'
            : 'slds-tabs_default__item';
    }

    get backlogTabClass() {
        return this.activeTab === 'backlog'
            ? 'slds-tabs_default__item slds-is-active'
            : 'slds-tabs_default__item';
    }

    get backlogCardCount() {
        return this._storeState
            ? selectors.getBacklogCardCount(this._storeState)
            : 0;
    }

    get boardName() {
        return this.board?.Name || 'Kanban Board';
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
                this.store.dispatch(moveCardToBacklog(cardId));
                this.store.dispatch(deleteCard(cardId));
                if (this.activeSprint) {
                    await this.store.dispatch(
                        removeCardFromSprintAsync(
                            this.activeSprint.Id,
                            cardId
                        )
                    );
                }
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

    handleBacklogError(event) {
        const message = event.detail?.message;
        if (message && this.toastManager) {
            this.toastManager.showError('Backlog Error', message);
        }
    }
}
