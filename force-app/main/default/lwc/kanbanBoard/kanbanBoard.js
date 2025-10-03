import { LightningElement, api, track } from 'lwc';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import { createStore } from 'c/kanbanStore';
import DataManager from './dataManager';
import DragDropManager from './dragDropManager';
import SubscriptionManager from './subscriptionManager';
import EventHandler from './eventHandler';
import ToastManager from './toastManager';
import ServerOperations from './serverOperations';

export default class KanbanBoard extends LightningElement {
    // API properties
    _recordId;
    @api height = '600px';
    
    // Store management
    store = createStore();
    storeUnsubscribe = null;
    @track _columnsCache = []; // Tracked property for reactivity
    
    // UI state
    @track cardsByColumn = {};
    @track board = null;
    @track selectedCard = null;
    @track showCardDetail = false;
    @track isLoading = true;
    @track error = null;
    
    // Managers (initialized in connectedCallback)
    dragDropManager = null;
    subscriptionManager = null;
    eventHandler = null;
    toastManager = null;
    
    /**
     * Get columns from store - returns cached tracked value for reactivity
     */
    get columns() {
        return this._columnsCache;
    }
    
    /**
     * Set columns - no-op, use store dispatch instead
     * Setter required for LWC proxy reactivity
     */
    set columns(value) {
        // This setter is required for LWC reactivity but we don't use it
        // All updates go through the store
    }
    
    // Getter/setter for recordId to trigger data load
    @api
    get recordId() {
        return this._recordId;
    }
    
    set recordId(value) {
        this._recordId = value;
        // Load board data when recordId changes
        if (value) {
            this.loadBoardData();
        }
    }
    
    connectedCallback() {
        // Initialize managers
        this.dragDropManager = new DragDropManager(this.template);
        this.toastManager = new ToastManager(this);
        this.eventHandler = new EventHandler();
        
        // Initialize subscription manager
        const channelName = '/event/OpenSF__CardUpdateEvent__e';
        this.subscriptionManager = new SubscriptionManager(
            channelName,
            (response) => this.handlePlatformEvent(response.data.payload),
            (variant, title, message) => this.handleSubscriptionMessage(variant, title, message)
        );
        
        // Subscribe to store changes
        this.storeUnsubscribe = this.store.subscribe(() => {
            requestAnimationFrame(() => {
                this._columnsCache = [...this.store.getColumns()];
            });
        });
        
        // Initialize cache
        this._columnsCache = [...this.store.getColumns()];
        
        // Register platform event error listener
        this.subscriptionManager.registerErrorListener();
        
        // Load initial data if recordId is set
        if (this._recordId) {
            this.loadBoardData();
        }
    }
    
    disconnectedCallback() {
        // Clean up subscriptions
        if (this.subscriptionManager) {
            this.subscriptionManager.unsubscribe();
        }
        
        // Unsubscribe from store
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
        }
    }
    
    /**
     * Load board data imperatively
     */
    async loadBoardData() {
        if (!this._recordId) {
            return;
        }
        
        this.isLoading = true;
        this.error = null;
        
        try {
            const data = await getBoardData({ boardId: this._recordId });
            
            this.board = data.board || null;
            this.store.dispatch({ type: 'SET_BOARD', payload: data.board });
            
            // Process columns and cards using DataManager
            const columns = DataManager.processColumns(data.columns || []);
            const { processedColumns, cardsByColumn } = DataManager.processCards(
                data.cards || [], 
                columns
            );
            
            this.cardsByColumn = cardsByColumn;
            this.store.dispatch({ type: 'SET_COLUMNS', payload: processedColumns });
            
            // Subscribe to platform events after board is loaded
            if (this.board && this.subscriptionManager.getStatus() === 'disconnected') {
                this.subscriptionManager.subscribe();
            }
        } catch (error) {
            this.error = error;
            this.toastManager.showError('Error loading board', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Handle drag start
     */
    handleDragStart(event) {
        this.dragDropManager.handleDragStart(event, this.store);
    }
    
    /**
     * Handle drag end - clear drag state
     */
    handleDragEnd(event) {
        this.dragDropManager.handleDragEnd(event, this.store);
    }
    
    /**
     * Handle drag over - live state update with optimistic preview (throttled)
     */
    handleDragOver(event) {
        this.dragDropManager.handleDragOver(event, this.store);
    }
    
    /**
     * Handle drop - commit drag state and sync with server
     */
    async handleDrop(event) {
        const dropData = this.dragDropManager.handleDrop(event, this.store);
        
        if (!dropData) {
            return; // Drop was cancelled or invalid
        }
        
        // Sync with server (optimistic update already applied)
        await this.moveCardToColumn(
            dropData.cardId,
            dropData.sourceColumnId,
            dropData.targetColumnId,
            dropData.targetPosition
        );
    }
    
    /**
     * Move card with optimistic update and server sync
     */
    async moveCardToColumn(cardId, sourceColumnId, targetColumnId, targetPosition) {
        try {
            // Server update
            const result = await ServerOperations.moveCard(
                cardId,
                targetColumnId,
                targetPosition,
                this.columns
            );
            
            // Track this change to ignore immediate platform event echo
            this.eventHandler.trackChange(cardId);
            
            // Update position in store
            this.store.dispatch({
                type: 'UPDATE_CARD',
                payload: { 
                    cardId: cardId,
                    updates: { position: result.newPosition } 
                }
            });
            
        } catch (error) {
            // Rollback would be handled by store if needed
            this.toastManager.showError('Error moving card', error);
        }
    }
    
    /**
     * Handle card click for editing
     */
    handleCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;
        
        // Find the card
        let card = null;
        for (let column of this.columns) {
            card = column.cards.find(c => c.Id === cardId);
            if (card) break;
        }
        
        if (card) {
            this.selectedCard = card;
            this.showCardDetail = true;
        }
    }
    
    /**
     * Handle card detail close
     */
    handleCardDetailClose() {
        this.showCardDetail = false;
        this.selectedCard = null;
    }
    
    /**
     * Handle card updated from modal
     */
    handleCardUpdated() {
        if (this.selectedCard) {
            this.eventHandler.trackChange(this.selectedCard.Id);
        }
        this.loadBoardData();
    }
    
    /**
     * Handle card deleted from modal
     */
    handleCardDeleted() {
        if (this.selectedCard) {
            this.eventHandler.trackChange(this.selectedCard.Id);
        }
        this.showCardDetail = false;
        this.selectedCard = null;
        this.loadBoardData();
    }
    
    /**
     * Handle refresh button
     */
    handleRefresh() {
        this.loadBoardData();
    }
    
    /**
     * Handle add card
     */
    async handleAddCard(event) {
        const columnId = event.target.dataset.columnId;
        
        try {
            const newCard = await ServerOperations.createCard(
                columnId,
                'New Card',
                this.columns
            );
            
            // Track this change to ignore immediate platform event echo
            this.eventHandler.trackChange(newCard.Id);
            
            this.toastManager.showSuccess('Card created successfully');
            
        } catch (error) {
            this.toastManager.showError('Error creating card', error);
        }
    }
    
    /**
     * Handle platform event
     */
    handlePlatformEvent(event) {
        const needsRefresh = this.eventHandler.handlePlatformEvent(event, this.store);
        
        // Fallback: refresh entire board if event processing failed
        if (needsRefresh) {
            this.loadBoardData();
        }
    }
    
    /**
     * Handle subscription status messages
     */
    handleSubscriptionMessage(variant, title, message) {
        if (variant === 'success') {
            this.toastManager.showSuccess(title);
        } else if (variant === 'info') {
            this.toastManager.showInfo(title);
        } else if (variant === 'warning') {
            this.toastManager.showWarning(title);
        } else if (variant === 'error') {
            this.toastManager.showError(title, message);
        }
    }
    
    /**
     * Getters for template
     */
    get boardStyle() {
        return `height: ${this.height}`;
    }
    
    get hasColumns() {
        return this.columns && this.columns.length > 0;
    }
    
    get boardName() {
        return this.board?.Name || 'Kanban Board';
    }
    
    get showEmptyState() {
        return !this.isLoading && !this.hasColumns;
    }
    
    get connectionStatusIcon() {
        return this.subscriptionManager?.getStatusIcon() || '⚪';
    }
    
    get connectionStatusText() {
        return this.subscriptionManager?.getStatusText() || 'Unknown';
    }
    
    get connectionStatusClass() {
        return this.subscriptionManager?.getStatusClass() || 'status-unknown';
    }
}
