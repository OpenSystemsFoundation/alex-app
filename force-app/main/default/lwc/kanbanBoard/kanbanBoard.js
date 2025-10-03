import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import moveCard from '@salesforce/apex/KanbanBoardController.moveCard';
import createCard from '@salesforce/apex/KanbanBoardController.createCard';
import { createStore } from 'c/kanbanStore';
import userId from '@salesforce/user/Id';

export default class KanbanBoard extends LightningElement {
    _recordId;
    @api height = '600px';
    
    // Track recent changes from THIS window only (lightweight, short-lived)
    recentChanges = new Map(); // cardId -> timestamp
    changeTrackingWindow = 2000; // 2 seconds - just long enough to ignore immediate echo
    
    // Store reference and subscription - each component instance gets its own store
    store = createStore();
    storeUnsubscribe = null;
    @track _columnsCache = []; // Tracked property for reactivity
    
    @track cardsByColumn = {};
    @track board = null;
    @track selectedCard = null;
    @track showCardDetail = false;
    @track isLoading = true;
    @track error = null;
    
    subscription = {};
    draggedCard = null;
    draggedOverColumn = null;
    draggedOverCard = null;
    dragPlaceholder = null;
    dropSuccessful = false; // Track if drop was successful
    
    // Performance optimization for drag
    lastDragUpdate = 0;
    dragUpdateThrottle = 50; // ms between drag updates
    lastDragPosition = null; // Cache last position to avoid redundant updates
    
    // Debounce server sync for rapid moves
    pendingServerSync = null;
    serverSyncDebounce = 300; // ms to wait after last drop
    queuedMoves = []; // Queue moves during rapid drag/drop
    
    // Platform event channel and subscription monitoring
    channelName = '/event/OpenSF__CardUpdateEvent__e';
    @track subscriptionStatus = 'disconnected'; // disconnected | connecting | connected | error
    subscriptionRetryCount = 0;
    maxRetryAttempts = 3;
    retryTimeout = null;
    
    // Polling fallback mechanism
    pollingInterval = null;
    pollingFrequency = 5000; // Poll every 5 seconds when subscription is down
    lastSuccessfulPoll = null;
    consecutiveFailedPolls = 0;
    maxFailedPolls = 3;
    
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
        // Subscribe to store changes and update cached columns
        this.storeUnsubscribe = this.store.subscribe(() => {
            // Use requestAnimationFrame for smooth updates
            requestAnimationFrame(() => {
                // Update tracked cache to trigger re-render
                this._columnsCache = [...this.store.getColumns()];
            });
        });
        
        // Initialize cache
        this._columnsCache = [...this.store.getColumns()];
        
        this.registerErrorListener();
        // Load initial data if recordId is already set
        if (this._recordId) {
            this.loadBoardData();
        }
    }
    
    disconnectedCallback() {
        this.unsubscribeFromPlatformEvents();
        this.stopPolling();
        
        // Clear any pending retry timeouts
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
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
            
            this.processColumns(data.columns || []);
            this.processCards(data.cards || []);
            
            // Subscribe to platform events after board is loaded
            if (!this.subscription.channel && this.board) {
                this.subscribeToPlatformEvents();
            }
        } catch (error) {
            this.error = error;
            this.showError('Error loading board', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Process columns data
     */
    processColumns(columns) {
        if (!columns || columns.length === 0) {
            this.store.dispatch({ type: 'SET_COLUMNS', payload: [] });
            this.cardsByColumn = {};
            return;
        }
        
        const columnsArray = columns.map(col => ({
            ...col,
            cardCount: 0,
            cards: [],
            columnStyle: col.color ? `background-color: ${col.color}` : ''
        }));
        
        // Initialize cardsByColumn
        columnsArray.forEach(col => {
            this.cardsByColumn[col.Id] = [];
        });
        
        // Dispatch to store
        this.store.dispatch({ type: 'SET_COLUMNS', payload: columnsArray });
    }
    
    /**
     * Process cards data
     */
    processCards(cards) {
        // Get columns directly from store state (don't rely on cached tracked property)
        const storeColumns = this.store.getState().columns;
        
        if (!cards || !storeColumns || storeColumns.length === 0) {
            return;
        }
        
        // Get current columns from store and create a working copy
        const currentColumns = JSON.parse(JSON.stringify(storeColumns));
        
        // Clear existing cards
        currentColumns.forEach(col => {
            col.cards = [];
            col.cardCount = 0;
        });
        
        // Group cards by column
        let cardsPlaced = 0;
        let cardsNotPlaced = [];
        
        cards.forEach(card => {
            const column = currentColumns.find(col => col.Id === card.columnId);
            if (column) {
                column.cards.push(this.enrichCard(card));
                column.cardCount++;
                cardsPlaced++;
            } else {
                cardsNotPlaced.push({
                    cardId: card.Id,
                    cardSubject: card.subject,
                    columnId: card.columnId
                });
            }
        });
        
        // Update cardsByColumn
        currentColumns.forEach(col => {
            this.cardsByColumn[col.Id] = col.cards;
        });
        
        // Dispatch updated columns to store
        this.store.dispatch({ type: 'UPDATE_COLUMNS', payload: currentColumns });
    }
    
    /**
     * Enrich card with computed properties
     */
    enrichCard(card) {
        return {
            ...card,
            priorityClass: this.getPriorityClass(card.priority),
            assigneeInitials: this.getInitials(card.assignee?.name),
            hasAssignee: !!card.assigneeId,
            formattedDueDate: card.dueDate ? this.formatDate(card.dueDate) : null,
            isOverdue: card.dueDate ? new Date(card.dueDate) < new Date() : false,
            cardStyle: card.color ? `border-left: 4px solid ${card.color}` : ''
        };
    }
    
    /**
     * Handle drag start
     */
    handleDragStart(event) {
        const cardId = event.target.dataset.cardId;
        const columnId = event.target.dataset.columnId;
        
        // Find the card position in current state
        const columns = this.store.getState().columns;
        
        if (!columns || columns.length === 0) {
            return;
        }
        
        const sourceColumn = columns.find(col => col.Id === columnId);
        if (!sourceColumn) {
            return;
        }
        
        const cardIndex = sourceColumn.cards?.findIndex(c => c.Id === cardId);
        if (cardIndex === -1 || cardIndex === undefined) {
            return;
        }
        
        this.draggedCard = {
            id: cardId,
            columnId: columnId,
            element: event.target
        };
        
        // Dispatch START_DRAG action to store
        this.store.dispatch({
            type: 'START_DRAG',
            payload: {
                source: { columnId, cardIndex }
            }
        });
        
        // Add dragging class for visual feedback
        event.target.classList.add('dragging');
        
        // Set drag data
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        
        // Use the original card as the drag image (browser default behavior)
        // This ensures proper styling is maintained during drag
    }
    
    /**
     * Handle drag end - clear drag state
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        
        // Only cancel drag if drop was not successful (e.g., drag cancelled)
        if (!this.dropSuccessful) {
            this.store.dispatch({ type: 'CANCEL_DRAG' });
        }
        
        // Reset drag state
        this.draggedCard = null;
        this.draggedOverColumn = null;
        this.draggedOverCard = null;
        this.dragPlaceholder = null;
        this.dropSuccessful = false;
        this.lastDragPosition = null; // Reset position cache
        this.lastDragUpdate = 0; // Reset throttle timer
        
        // Remove all drag classes
        this.template.querySelectorAll('.drag-active').forEach(el => {
            el.classList.remove('drag-active');
        });
    }
    
    /**
     * Handle drag over - live state update with optimistic preview (throttled)
     */
    handleDragOver(event) {
        event.preventDefault();
        
        const storeState = this.store.getState();
        if (!this.draggedCard || !storeState.isDragging) {
            return;
        }
        
        event.dataTransfer.dropEffect = 'move';
        
        // Throttle updates for performance
        const now = Date.now();
        if (now - this.lastDragUpdate < this.dragUpdateThrottle) {
            return; // Skip this update
        }
        
        // Get the cards container (event target)
        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        
        // Get all card elements in this column (excluding the dragged one)
        const cardElements = Array.from(cardsContainer.querySelectorAll('.kanban-card:not(.dragging)'));
        
        // Calculate target position based on mouse Y
        let targetIndex = cardElements.length; // Default to end
        
        if (cardElements.length > 0) {
            const mouseY = event.clientY;
            
            for (let i = 0; i < cardElements.length; i++) {
                const cardElement = cardElements[i];
                const rect = cardElement.getBoundingClientRect();
                const cardMiddle = rect.top + rect.height / 2;
                
                if (mouseY < cardMiddle) {
                    targetIndex = i;
                    break;
                }
            }
        }
        
        // Check if position actually changed
        const positionKey = `${targetColumnId}-${targetIndex}`;
        if (this.lastDragPosition === positionKey) {
            return; // Position hasn't changed, skip update
        }
        
        // Update last position cache
        this.lastDragPosition = positionKey;
        this.lastDragUpdate = now;
        
        // Dispatch UPDATE_DRAG_POSITION to store for live preview
        this.store.dispatch({
            type: 'UPDATE_DRAG_POSITION',
            payload: { targetColumnId, targetIndex }
        });
        
        // Store for drop handling
        this.dragPlaceholder = {
            columnId: targetColumnId,
            targetIndex: targetIndex
        };
    }
    
    /**
     * Handle drop - commit drag state and sync with server
     */
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const cardsContainer = event.currentTarget;
        cardsContainer.classList.remove('drag-active');
        
        // Remove all visual feedback
        this.template.querySelectorAll('.drag-active').forEach(el => {
            el.classList.remove('drag-active');
        });
        
        if (!this.draggedCard || !this.dragPlaceholder) {
            this.store.dispatch({ type: 'CANCEL_DRAG' });
            return;
        }
        
        const targetColumnId = this.dragPlaceholder.columnId;
        const targetPosition = this.dragPlaceholder.targetIndex;
        const storeState = this.store.getState();
        
        // Check if position actually changed
        if (storeState.dragSource && storeState.dragSource.columnId === targetColumnId) {
            const currentIndex = storeState.dragSource.cardIndex;
            
            // Account for removal when calculating same position
            if (currentIndex === targetPosition || currentIndex + 1 === targetPosition) {
                this.store.dispatch({ type: 'CANCEL_DRAG' });
                return;
            }
        }
        
        // Commit drag state to store (optimistic update)
        this.store.dispatch({ type: 'COMMIT_DRAG' });
        
        // Mark drop as successful so handleDragEnd doesn't revert
        this.dropSuccessful = true;
        
        // Sync with server (optimistic update already applied)
        await this.moveCardToColumn(this.draggedCard.id, targetColumnId, targetPosition);
    }
    
    /**
     * Move card with optimistic update
     */
    async moveCardToColumn(cardId, targetColumnId, targetPosition) {
        const sourceColumnId = this.draggedCard.columnId;
        
        // Find positions
        const targetColumn = this.columns.find(col => col.Id === targetColumnId);
        const cards = targetColumn.cards;
        
        let previousPosition = null;
        let nextPosition = null;
        
        if (targetPosition !== null) {
            // Drop between specific cards
            if (targetPosition > 0) {
                previousPosition = cards[targetPosition - 1].position;
            }
            if (targetPosition < cards.length) {
                nextPosition = cards[targetPosition].position;
            }
        } else {
            // Drop at end
            if (cards.length > 0) {
                previousPosition = cards[cards.length - 1].position;
            }
        }
        
        try {
            
            // Server update - returns minimal data now (no full query)
            const result = await moveCard({
                cardId: cardId,
                targetColumnId: targetColumnId,
                previousCardPosition: previousPosition,
                nextCardPosition: nextPosition
            });
            
            // Track this change to ignore immediate platform event echo
            this.recentChanges.set(cardId, Date.now());
            setTimeout(() => this.recentChanges.delete(cardId), this.changeTrackingWindow);
            
            // Update ONLY the position in store (no full state refresh needed)
            // The optimistic update already moved the card visually
            this.updateCardPositionOnly(cardId, result.newPosition);
            
        } catch (error) {
            // Rollback optimistic update
            this.rollbackOptimisticMove(cardId, targetColumnId, sourceColumnId);
            this.showError('Error moving card', error);
        }
    }
    
    /**
     * Apply optimistic move
     */
    applyOptimisticMove(cardId, sourceColumnId, targetColumnId) {
        // Remove from source
        const sourceColumn = this.columns.find(col => col.Id === sourceColumnId);
        const cardIndex = sourceColumn.cards.findIndex(c => c.Id === cardId);
        const card = sourceColumn.cards.splice(cardIndex, 1)[0];
        sourceColumn.cardCount--;
        
        // Add to target
        const targetColumn = this.columns.find(col => col.Id === targetColumnId);
        card.columnId = targetColumnId;
        targetColumn.cards.push(card);
        targetColumn.cardCount++;
        
        // Note: Reactivity handled by store, no manual trigger needed
    }
    
    /**
     * Rollback optimistic move
     */
    rollbackOptimisticMove(cardId, sourceColumnId, targetColumnId) {
        // Reverse the optimistic move
        this.applyOptimisticMove(cardId, sourceColumnId, targetColumnId);
    }
    
    /**
     * Update only card position (minimal update for performance)
     */
    updateCardPositionOnly(cardId, newPosition) {
        // Dispatch minimal update to store
        this.store.dispatch({
            type: 'UPDATE_CARD',
            payload: { 
                cardId: cardId,
                updates: { position: newPosition } 
            }
        });
    }
    
    /**
     * Update card in state with full data (legacy method for non-move operations)
     */
    updateCardInState(updatedCard) {
        
        const enriched = this.enrichCard(updatedCard);
        
        this.columns.forEach(column => {
            const index = column.cards.findIndex(c => c.Id === updatedCard.Id);
            if (index !== -1) {
                if (column.Id === updatedCard.columnId) {
                    // Update in same column
                    column.cards[index] = enriched;
                } else {
                    // Remove from old column
                    column.cards.splice(index, 1);
                    column.cardCount--;
                }
            } else if (column.Id === updatedCard.columnId) {
                // Add to new column
                column.cards.push(enriched);
                column.cardCount++;
            }
        });
        
        this.columns = [...this.columns];
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
        // Track this card to ignore immediate platform event echo
        if (this.selectedCard) {
            this.recentChanges.set(this.selectedCard.Id, Date.now());
            setTimeout(() => this.recentChanges.delete(this.selectedCard.Id), this.changeTrackingWindow);
        }
        this.loadBoardData();
    }
    
    /**
     * Handle card deleted from modal
     */
    handleCardDeleted() {
        // Track this card to ignore immediate platform event echo
        if (this.selectedCard) {
            this.recentChanges.set(this.selectedCard.Id, Date.now());
            setTimeout(() => this.recentChanges.delete(this.selectedCard.Id), this.changeTrackingWindow);
        }
        this.showCardDetail = false;
        this.selectedCard = null;
        this.loadBoardData();
    }
    
    /**
     * Handle refresh button
     */
    handleRefresh() {
        this.dropSuccessful = false; // Reset flag
        this.loadBoardData();
    }
    
    /**
     * Handle add card
     */
    async handleAddCard(event) {
        const columnId = event.target.dataset.columnId;
        
        try {
            const column = this.columns.find(col => col.Id === columnId);
            const cards = column.cards;
            
            let previousPosition = null;
            if (cards.length > 0) {
                previousPosition = cards[cards.length - 1].position;
            }
            
            // Create card with default subject
            const newCard = await createCard({
                columnId: columnId,
                subject: 'New Card',
                previousCardPosition: previousPosition,
                nextCardPosition: null
            });
            
            // Track this change to ignore immediate platform event echo
            this.recentChanges.set(newCard.Id, Date.now());
            setTimeout(() => this.recentChanges.delete(newCard.Id), this.changeTrackingWindow);
            
            // Add to store using dispatch (proper state management)
            this.store.dispatch({
                type: 'ADD_CARD',
                payload: {
                    card: this.enrichCard(newCard),
                    columnId: columnId
                }
            });
            
            this.showSuccess('Card created successfully');
            
        } catch (error) {
            this.showError('Error creating card', error);
        }
    }
    
    /**
     * Subscribe to platform events with monitoring
     */
    subscribeToPlatformEvents() {
        // Only subscribe if we have a valid recordId
        if (!this._recordId) {
            return;
        }
        
        if (this.subscription && this.subscription.channel) {
            return;
        }
        this.subscriptionStatus = 'connecting';
        
        const messageCallback = (response) => {
            const event = response.data.payload;
            
            // Mark subscription as healthy
            if (this.subscriptionStatus !== 'connected') {
                this.subscriptionStatus = 'connected';
                this.subscriptionRetryCount = 0;
                this.showInfo('Real-time updates connected');
                
                // Stop polling if it was running
                this.stopPolling();
            }
            
            this.handlePlatformEvent(event);
        };
        
        subscribe(this.channelName, -1, messageCallback)
            .then(response => {
                this.subscription = response;
                this.subscriptionStatus = 'connected';
                this.subscriptionRetryCount = 0;
                this.showSuccess('Real-time updates enabled');
            })
            .catch(error => {
                this.subscriptionStatus = 'error';
                this.handleSubscriptionError(error);
            });
    }
    
    /**
     * Handle subscription errors with retry logic
     */
    handleSubscriptionError(error) {
        this.subscriptionRetryCount++;
        
        if (this.subscriptionRetryCount < this.maxRetryAttempts) {
            const retryDelay = 2000 * this.subscriptionRetryCount; // Exponential backoff
            
            this.showWarning(`Connection lost. Retrying (${this.subscriptionRetryCount}/${this.maxRetryAttempts})...`);
            
            this.retryTimeout = setTimeout(() => {
                this.subscribeToPlatformEvents();
            }, retryDelay);
        } else {
            this.showError('Real-time updates unavailable', 'Using polling fallback');
            this.startPolling();
        }
    }
    
    /**
     * Unsubscribe from platform events
     */
    unsubscribeFromPlatformEvents() {
        if (this.subscription && this.subscription.channel) {
            unsubscribe(this.subscription, response => {
                this.subscriptionStatus = 'disconnected';
                this.subscription = {};
            });
        }
    }
    
    /**
     * Start polling fallback mechanism
     */
    startPolling() {
        if (this.pollingInterval) {
            return;
        }
        
        this.subscriptionStatus = 'polling';
        
        this.pollingInterval = setInterval(() => {
            this.pollForUpdates();
        }, this.pollingFrequency);
        
        // Immediate poll
        this.pollForUpdates();
    }
    
    /**
     * Stop polling mechanism
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.consecutiveFailedPolls = 0;
        }
    }
    
    /**
     * Poll for updates (fallback when platform events fail)
     */
    async pollForUpdates() {
        try {
            await this.loadBoardData();
            this.lastSuccessfulPoll = Date.now();
            this.consecutiveFailedPolls = 0;
            
        } catch (error) {
            this.consecutiveFailedPolls++;
            
            if (this.consecutiveFailedPolls >= this.maxFailedPolls) {
                this.stopPolling();
                this.showError('Connection lost', 'Please refresh the page');
            }
        }
    }
    
    /**
     * Handle platform event
     */
    handlePlatformEvent(event) {
        try {
            // Parse JSON payload
            const payload = JSON.parse(event.OpenSF__Payload__c);
            const eventType = event.OpenSF__EventType__c;
            
            // Ignore events for cards we just changed in THIS window (within last 2 seconds)
            // This prevents duplicate updates while still allowing changes from other windows/users
            const recentChangeTime = this.recentChanges.get(payload.Id);
            if (recentChangeTime && (Date.now() - recentChangeTime) < this.changeTrackingWindow) {
                return; // Skip - we just made this change
            }
            
            if (eventType === 'move' || eventType === 'update') {
                // For move/update, we can use the payload DTO directly (no full refresh needed)
                this.updateCardInStateFromDTO(payload);
            } else if (eventType === 'create') {
                // Add new card from payload
                this.addCardToStateFromDTO(payload);
            } else if (eventType === 'delete') {
                // Remove card
                this.removeCardFromState(payload.Id);
            }
        } catch (error) {
            // Fallback: refresh entire board
            this.loadBoardData();
        }
    }
    
    /**
     * Update card in state from DTO payload
     */
    updateCardInStateFromDTO(cardDTO) {
        // Enrich the DTO with UI properties
        const enrichedCard = this.enrichCard(cardDTO);
        
        // Use store dispatch to update card properly
        this.store.dispatch({
            type: 'UPDATE_CARD',
            payload: {
                cardId: cardDTO.Id,
                card: enrichedCard
            }
        });
    }
    
    /**
     * Add new card to state from DTO payload
     */
    addCardToStateFromDTO(cardDTO) {
        const enrichedCard = this.enrichCard(cardDTO);
        
        // Check if card already exists in state
        const columns = this.store.getState().columns;
        const cardExists = columns.some(col => 
            col.cards.some(c => c.Id === cardDTO.Id)
        );
        
        if (cardExists) {
            return;
        }
        
        // Use store dispatch to add card properly
        this.store.dispatch({
            type: 'ADD_CARD',
            payload: {
                card: enrichedCard,
                columnId: cardDTO.columnId
            }
        });
    }
    
    /**
     * Remove card from state
     */
    removeCardFromState(cardId) {
        this.columns.forEach(column => {
            const index = column.cards.findIndex(c => c.Id === cardId);
            if (index !== -1) {
                column.cards.splice(index, 1);
                column.cardCount--;
            }
        });
        this.columns = [...this.columns];
    }
    
    /**
     * Register error listener for platform event connection issues
     */
    registerErrorListener() {
        onError(error => {
            this.subscriptionStatus = 'error';
            
            // Show toast notification
            this.showError('Connection interrupted', 'Attempting to reconnect...');
            
            // Attempt to reconnect
            this.unsubscribeFromPlatformEvents();
            this.handleSubscriptionError(error);
        });
    }
    
    /**
     * Utility: Get priority class
     */
    getPriorityClass(priority) {
        const priorityMap = {
            'High': 'priority-high',
            'Medium': 'priority-medium',
            'Low': 'priority-low'
        };
        return priorityMap[priority] || '';
    }
    
    /**
     * Utility: Get initials
     */
    getInitials(name) {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    /**
     * Utility: Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    /**
     * Show success toast
     */
    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        }));
    }
    
    /**
     * Show info toast
     */
    showInfo(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Info',
            message: message,
            variant: 'info'
        }));
    }
    
    /**
     * Show warning toast
     */
    showWarning(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Warning',
            message: message,
            variant: 'warning'
        }));
    }
    
    /**
     * Show error toast
     */
    showError(title, error) {
        let message = 'Unknown error';
        if (error) {
            if (error.body && error.body.message) {
                message = error.body.message;
            } else if (error.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
        }
        
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: 'error',
            mode: 'sticky'
        }));
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
        const statusMap = {
            'connected': '✅',
            'connecting': '🔄',
            'disconnected': '⚫',
            'error': '❌',
            'polling': '🔄'
        };
        return statusMap[this.subscriptionStatus] || '⚪';
    }
    
    get connectionStatusText() {
        const textMap = {
            'connected': 'Real-time updates active',
            'connecting': 'Connecting...',
            'disconnected': 'Disconnected',
            'error': 'Connection error',
            'polling': 'Polling mode (fallback)'
        };
        return textMap[this.subscriptionStatus] || 'Unknown';
    }
    
    get connectionStatusClass() {
        const classMap = {
            'connected': 'status-connected',
            'connecting': 'status-connecting',
            'disconnected': 'status-disconnected',
            'error': 'status-error',
            'polling': 'status-polling'
        };
        return classMap[this.subscriptionStatus] || 'status-unknown';
    }
}
