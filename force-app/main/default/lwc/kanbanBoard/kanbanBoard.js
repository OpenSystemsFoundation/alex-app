import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import {
    IsConsoleNavigation,
    openTab,
    getFocusedTabInfo
} from 'lightning/platformWorkspaceApi';
import getBoardData from '@salesforce/apex/KanbanBoardController.getBoardData';
import { createStore } from 'c/kanbanStore';
import DataManager from './dataManager';
import SubscriptionManager from './subscriptionManager';
import EventHandler from './eventHandler';
import ToastManager from './toastManager';
import ServerOperations from './serverOperations';

export default class KanbanBoard extends NavigationMixin(LightningElement) {
    // API properties
    _recordId;
    @api height = '720px';

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

    // Drag state - Simplified
    dragData = null;
    dragPlaceholder = null; // For visual preview during drag
    lastPlaceholderPosition = null; // Track last position to prevent flickering

    // Managers (initialized in connectedCallback)
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
        this.toastManager = new ToastManager(this);
        this.eventHandler = new EventHandler();

        // Initialize subscription manager
        const channelName = '/event/OpenSF__CardUpdateEvent__e';
        this.subscriptionManager = new SubscriptionManager(
            channelName,
            (response) => this.handlePlatformEvent(response.data.payload),
            (variant, title, message) =>
                this.handleSubscriptionMessage(variant, title, message)
        );

        // Subscribe to store changes
        this.storeUnsubscribe = this.store.subscribe(() => {
            this._columnsCache = [...this.store.getColumns()];
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
            const { processedColumns, cardsByColumn } =
                DataManager.processCards(data.cards || [], columns);

            this.cardsByColumn = cardsByColumn;
            this.store.dispatch({
                type: 'SET_COLUMNS',
                payload: processedColumns
            });

            // Subscribe to platform events after board is loaded
            // TEMPORARILY DISABLED
            // if (this.board && this.subscriptionManager.getStatus() === 'disconnected') {
            //     this.subscriptionManager.subscribe();
            // }
        } catch (error) {
            this.error = error;
            this.toastManager.showError('Error loading board', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handle drag start - Simplified approach
     */
    handleDragStart(event) {
        const cardId = event.target.dataset.cardId;
        const columnId = event.target.dataset.columnId;

        // Store drag data including the card element's height
        const cardHeight = event.target.offsetHeight;

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.dataTransfer.setData('columnId', columnId);

        // Visual feedback
        event.target.classList.add('dragging');

        // Store in component for drop handler
        this.dragData = { cardId, columnId, cardHeight };
    }

    /**
     * Handle drag end - clear drag state
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');

        // Remove placeholder if it exists
        if (this.dragPlaceholder && this.dragPlaceholder.parentNode) {
            this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
        }

        this.dragData = null;
        this.dragPlaceholder = null;
        this.lastPlaceholderPosition = null;
    }

    /**
     * Handle drag over - show visual preview with placeholder
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (!this.dragData) {
            return;
        }

        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        const targetPosition = this.calculateDropPosition(
            event,
            cardsContainer
        );

        // Don't show placeholder if hovering over the original position in the same column
        const isSameColumn = this.dragData.columnId === targetColumnId;
        if (isSameColumn) {
            const sourceColumn = this.columns.find(
                (col) => col.Id === this.dragData.columnId
            );
            if (sourceColumn) {
                const sourceIndex = sourceColumn.cards.findIndex(
                    (c) => c.Id === this.dragData.cardId
                );

                // Don't show placeholder at the original position
                if (sourceIndex === targetPosition) {
                    // Remove placeholder if it exists
                    if (
                        this.dragPlaceholder &&
                        this.dragPlaceholder.parentNode
                    ) {
                        this.dragPlaceholder.parentNode.removeChild(
                            this.dragPlaceholder
                        );
                        this.lastPlaceholderPosition = null;
                    }
                    return;
                }
            }
        }

        // Create position key to check if position changed
        const positionKey = `${targetColumnId}-${targetPosition}`;

        // Only update placeholder if position actually changed
        if (this.lastPlaceholderPosition !== positionKey) {
            this.lastPlaceholderPosition = positionKey;
            this.updateDragPlaceholder(cardsContainer, targetPosition);
        }
    }

    /**
     * Handle drop - Simplified synchronous approach
     */
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.dragData) {
            return;
        }

        const { cardId, columnId: sourceColumnId } = this.dragData;
        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;

        // Calculate visual drop position (excluding the dragged card for UI)
        const visualPosition = this.calculateDropPosition(
            event,
            cardsContainer
        );

        // Check if position actually changed
        const sourceColumn = this.columns.find(
            (col) => col.Id === sourceColumnId
        );
        if (!sourceColumn) {
            return;
        }

        const sourceIndex = sourceColumn.cards.findIndex(
            (c) => c.Id === cardId
        );

        // Convert visual position to actual array position for the target column
        // The visualPosition is calculated without the dragged card in the DOM
        // We need to determine what index to pass to ServerOperations
        const targetColumn = this.columns.find(
            (col) => col.Id === targetColumnId
        );
        let targetIndex = visualPosition;

        // If same column, we need to account for the card being removed
        if (sourceColumnId === targetColumnId) {
            // If moving down, visualPosition already accounts for removal
            // If moving up, visualPosition is correct as-is
            // The visual position IS the final position after the card is removed and re-inserted
            targetIndex = visualPosition;
        }

        // For same column, check if position really changed
        if (sourceColumnId === targetColumnId) {
            // If dropping in the exact same position, skip
            if (sourceIndex === targetIndex) {
                return;
            }
        }

        try {
            // Call Apex to move the card
            // ServerOperations will look at the cards array and get the LexoRank positions
            // of the cards at targetIndex-1 and targetIndex to calculate the new position
            const result = await ServerOperations.moveCard(
                cardId,
                targetColumnId,
                targetIndex,
                this.columns
            );

            // Update local state directly
            const updatedColumns = JSON.parse(JSON.stringify(this.columns));

            // Find and remove card from source column
            const sourceCol = updatedColumns.find(
                (col) => col.Id === sourceColumnId
            );
            const cardIndex = sourceCol.cards.findIndex((c) => c.Id === cardId);
            const [movedCard] = sourceCol.cards.splice(cardIndex, 1);
            sourceCol.cardCount = sourceCol.cards.length;

            // Find target column
            const targetCol = updatedColumns.find(
                (col) => col.Id === targetColumnId
            );

            // Update card properties
            movedCard.columnId = targetColumnId;
            movedCard.position = result.newPosition;

            // If the target column has a status, update the card's status to match
            if (targetCol.status) {
                movedCard.status = targetCol.status;
            }

            // Add to target column at the calculated position
            targetCol.cards.splice(targetIndex, 0, movedCard);
            targetCol.cardCount = targetCol.cards.length;

            // Update store
            this.store.dispatch({
                type: 'SET_COLUMNS',
                payload: updatedColumns
            });

            this.toastManager.showSuccess('Card moved successfully');
        } catch (error) {
            console.error('Error moving card:', error);
            this.toastManager.showError('Error moving card', error);
            // Reload on error to restore correct state
            this.loadBoardData();
        }
    }

    /**
     * Calculate drop position based on mouse location
     * Returns the index where the card should be inserted (excluding the dragged card)
     */
    calculateDropPosition(event, cardsContainer) {
        const cardElements = Array.from(
            cardsContainer.querySelectorAll(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            )
        );

        if (cardElements.length === 0) {
            return 0;
        }

        const mouseY = event.clientY;

        // Find insertion point based on mouse position
        // Use bottom quarter of the card (75% from top) for more accurate mouse tracking
        for (let i = 0; i < cardElements.length; i++) {
            const rect = cardElements[i].getBoundingClientRect();
            // Use bottom quarter of the card as the threshold
            const threshold = rect.top + rect.height * 0.75;

            if (mouseY < threshold) {
                return i;
            }
        }

        // Drop after all cards
        return cardElements.length;
    }

    /**
     * Update drag placeholder for visual preview
     */
    updateDragPlaceholder(cardsContainer, targetPosition) {
        // Get all non-dragging, non-placeholder cards
        const cardElements = Array.from(
            cardsContainer.querySelectorAll(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            )
        );

        // Create placeholder if it doesn't exist
        if (!this.dragPlaceholder) {
            this.dragPlaceholder = document.createElement('div');
            this.dragPlaceholder.className = 'kanban-card drag-placeholder';

            // Use the actual dragged card's height
            const cardHeight = this.dragData?.cardHeight || 80;
            this.dragPlaceholder.style.height = `${cardHeight}px`;

            this.dragPlaceholder.style.margin =
                '0 var(--lwc-spacingXSmall) var(--lwc-spacingXSmall)';
            this.dragPlaceholder.style.border = '2px dashed #0176d3';
            this.dragPlaceholder.style.borderRadius = '0.25rem';
            this.dragPlaceholder.style.backgroundColor =
                'rgba(1, 118, 211, 0.05)';
            this.dragPlaceholder.style.display = 'flex';
            this.dragPlaceholder.style.alignItems = 'center';
            this.dragPlaceholder.style.justifyContent = 'center';
        }

        // Remove placeholder from current position if it exists
        if (this.dragPlaceholder.parentNode) {
            this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
        }

        // Insert placeholder at target position
        if (targetPosition >= cardElements.length) {
            // Append to end
            cardsContainer.appendChild(this.dragPlaceholder);
        } else {
            // Insert before target card
            const targetCard = cardElements[targetPosition];
            if (targetCard) {
                cardsContainer.insertBefore(this.dragPlaceholder, targetCard);
            }
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
            card = column.cards.find((c) => c.Id === cardId);
            if (card) break;
        }

        if (card) {
            this.selectedCard = card;
            this.showCardDetail = true;
        }
    }

    /**
     * Handle card name click for navigation
     */
    async handleCardNameClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const cardId = event.currentTarget.dataset.cardId;

        if (!cardId) {
            console.warn('No cardId found for navigation');
            return;
        }

        const pageReference = {
            type: 'standard__recordPage',
            attributes: {
                recordId: cardId,
                objectApiName: 'OpenSF__Card__c',
                actionName: 'view'
            }
        };

        try {
            // Check if we're in console navigation
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                // Open in a new subtab in console
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    console.warn(
                        'Failed to get focused tab, opening without parent:',
                        error
                    );
                    // Fallback if getFocusedTabInfo fails
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                // Regular navigation
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            console.error('Navigation error, using fallback:', error);
            // Fallback to regular navigation if IsConsoleNavigation fails
            this[NavigationMixin.Navigate](pageReference);
        }
    }

    /**
     * Handle column header click for navigation
     */
    async handleColumnClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const columnId = event.currentTarget.dataset.columnId;

        if (!columnId) {
            console.warn('No columnId found for navigation');
            return;
        }

        const pageReference = {
            type: 'standard__recordPage',
            attributes: {
                recordId: columnId,
                objectApiName: 'OpenSF__Column__c',
                actionName: 'view'
            }
        };

        try {
            // Check if we're in console navigation
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                // Open in a new subtab in console
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    console.warn(
                        'Failed to get focused tab, opening without parent:',
                        error
                    );
                    // Fallback if getFocusedTabInfo fails
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                // Regular navigation
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            console.error('Navigation error, using fallback:', error);
            // Fallback to regular navigation if IsConsoleNavigation fails
            this[NavigationMixin.Navigate](pageReference);
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
     * Handle card updated from modal - Simplified synchronous approach
     */
    handleCardUpdated() {
        // Close the modal
        this.showCardDetail = false;

        // Reload board data to get the updated card with all its relationships
        // This is simpler than trying to fetch and merge just the updated card
        this.loadBoardData();

        // Clear selected card after reload starts
        this.selectedCard = null;
    }

    /**
     * Handle card deleted from modal - Simplified synchronous approach
     */
    handleCardDeleted(event) {
        const cardId = event?.detail?.cardId;

        if (!cardId) {
            console.error('No card ID provided for deletion');
            return;
        }

        // Find and remove the card from columns
        const updatedColumns = JSON.parse(JSON.stringify(this.columns));
        let found = false;

        for (const column of updatedColumns) {
            const cardIndex = column.cards.findIndex((c) => c.Id === cardId);
            if (cardIndex !== -1) {
                column.cards.splice(cardIndex, 1);
                column.cardCount = column.cards.length;
                found = true;
                break;
            }
        }

        if (found) {
            // Update store with new columns
            this.store.dispatch({
                type: 'SET_COLUMNS',
                payload: updatedColumns
            });
        }

        // Close modal and clear selection
        this.showCardDetail = false;
        this.selectedCard = null;
    }

    /**
     * Handle refresh button
     */
    handleRefresh() {
        this.loadBoardData();
    }

    /**
     * Handle add card - Simplified synchronous approach
     */
    async handleAddCard(event) {
        // Use currentTarget to get the button element, not the clicked child element
        const button = event.currentTarget;
        const columnId = button.dataset.columnId;

        if (!columnId) {
            console.error('Column ID not found on button:', button);
            this.toastManager.showError(
                'Invalid column',
                'Column ID not found'
            );
            return;
        }

        try {
            // Show loading state
            button.disabled = true;

            // Call Apex synchronously to create the card
            const newCard = await ServerOperations.createCard(
                columnId,
                'New Card',
                this.columns
            );

            // Enrich the card with UI properties
            const enrichedCard = DataManager.enrichCard(newCard);

            // Find the column and add the card directly
            const columnIndex = this.columns.findIndex(
                (col) => col.Id === columnId
            );
            if (columnIndex !== -1) {
                // Create a new columns array with the updated column
                const updatedColumns = JSON.parse(JSON.stringify(this.columns));
                updatedColumns[columnIndex].cards.push(enrichedCard);
                updatedColumns[columnIndex].cardCount =
                    updatedColumns[columnIndex].cards.length;

                // Update store with new columns
                this.store.dispatch({
                    type: 'SET_COLUMNS',
                    payload: updatedColumns
                });
            }

            this.toastManager.showSuccess('Card created successfully');
        } catch (error) {
            console.error('Error creating card:', error);
            this.toastManager.showError('Error creating card', error);
        } finally {
            // Re-enable button
            button.disabled = false;
        }
    }

    /**
     * Handle platform event
     */
    handlePlatformEvent(event) {
        const needsRefresh = this.eventHandler.handlePlatformEvent(
            event,
            this.store
        );

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
