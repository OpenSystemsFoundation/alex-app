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
import RequestTracker from './requestTracker';
import ReducerQueue from './reducerQueue';

export default class KanbanBoard extends NavigationMixin(LightningElement) {
    _recordId;
    @api height = '720px';

    store = createStore();
    storeUnsubscribe = null;
    @track _columnsCache = [];

    @track cardsByColumn = {};
    @track board = null;
    @track selectedCard = null;
    @track showCardDetail = false;
    @track isLoading = true;
    @track error = null;

    dragData = null;
    dragPlaceholder = null;
    lastPlaceholderPosition = null;

    subscriptionManager = null;
    eventHandler = null;
    toastManager = null;
    requestTracker = null;
    operationQueue = null;

    get columns() {
        return this._columnsCache;
    }

    set columns(value) {}

    @api
    get recordId() {
        return this._recordId;
    }

    set recordId(value) {
        this._recordId = value;
        if (value) {
            this.loadBoardData();
        }
    }

    connectedCallback() {
        this.toastManager = new ToastManager(this);
        this.requestTracker = new RequestTracker();
        this.operationQueue = new ReducerQueue(this.store);
        this.eventHandler = new EventHandler(this.requestTracker, (message) =>
            this.handleEventActivity(message)
        );

        const channelName = '/event/OpenSF__CardUpdateEvent__e';
        this.subscriptionManager = new SubscriptionManager(
            channelName,
            (response) => this.handlePlatformEvent(response.data.payload),
            (variant, title, message) =>
                this.handleSubscriptionMessage(variant, title, message)
        );

        this.storeUnsubscribe = this.store.subscribe(() => {
            this._columnsCache = [...this.store.getColumns()];
        });

        this._columnsCache = [...this.store.getColumns()];
        this.subscriptionManager.registerErrorListener();

        if (this._recordId) {
            this.loadBoardData();
        }
    }

    disconnectedCallback() {
        if (this.subscriptionManager) {
            this.subscriptionManager.unsubscribe();
        }

        if (this.operationQueue) {
            this.operationQueue.clear();
        }

        if (this.requestTracker) {
            this.requestTracker.destroy();
        }

        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
        }
    }
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

            const columns = DataManager.processColumns(data.columns || []);
            const { processedColumns, cardsByColumn } =
                DataManager.processCards(data.cards || [], columns);

            this.cardsByColumn = cardsByColumn;
            this.store.dispatch({
                type: 'SET_COLUMNS',
                payload: processedColumns
            });

            if (
                this.board &&
                this.subscriptionManager.getStatus() === 'disconnected'
            ) {
                this.subscriptionManager.subscribe();
            }
        } catch (error) {
            this.error = error;
            this.toastManager.showError('Error loading board', error);
        } finally {
            this.isLoading = false;
        }
    }
    handleDragStart(event) {
        const cardId = event.target.dataset.cardId;
        const columnId = event.target.dataset.columnId;
        const cardHeight = event.target.offsetHeight;

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.dataTransfer.setData('columnId', columnId);

        event.target.classList.add('dragging');
        this.dragData = { cardId, columnId, cardHeight };
    }

    handleDragEnd(event) {
        event.target.classList.remove('dragging');

        if (this.dragPlaceholder && this.dragPlaceholder.parentNode) {
            this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
        }

        this.dragData = null;
        this.dragPlaceholder = null;
        this.lastPlaceholderPosition = null;
    }
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

        const isSameColumn = this.dragData.columnId === targetColumnId;
        if (isSameColumn) {
            const sourceColumn = this.columns.find(
                (col) => col.Id === this.dragData.columnId
            );
            if (sourceColumn) {
                const sourceIndex = sourceColumn.cards.findIndex(
                    (c) => c.Id === this.dragData.cardId
                );

                if (sourceIndex === targetPosition) {
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

        const positionKey = `${targetColumnId}-${targetPosition}`;

        if (this.lastPlaceholderPosition !== positionKey) {
            this.lastPlaceholderPosition = positionKey;
            this.updateDragPlaceholder(cardsContainer, targetPosition);
        }
    }
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.dragData) {
            return;
        }

        const { cardId, columnId: sourceColumnId } = this.dragData;
        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        const visualPosition = this.calculateDropPosition(
            event,
            cardsContainer
        );

        const sourceColumn = this.columns.find(
            (col) => col.Id === sourceColumnId
        );
        if (!sourceColumn) {
            return;
        }

        const sourceIndex = sourceColumn.cards.findIndex(
            (c) => c.Id === cardId
        );
        const targetIndex = visualPosition;

        if (sourceColumnId === targetColumnId && sourceIndex === targetIndex) {
            return;
        }

        const requestId = this.requestTracker.trackRequest('move', cardId, {
            sourceColumnId,
            targetColumnId,
            targetIndex
        });

        this.operationQueue
            .enqueue({
                type: 'move',
                cardId,
                sourceColumnId,
                targetColumnId,
                targetIndex,
                requestId,
                execute: async () => {
                    try {
                        const result = await ServerOperations.moveCard(
                            cardId,
                            targetColumnId,
                            targetIndex,
                            this.columns,
                            requestId
                        );

                        this.requestTracker.completeRequest(requestId, result);
                        return result;
                    } catch (error) {
                        this.requestTracker.failRequest(requestId, error);

                        if (!this.subscriptionManager.isConnected()) {
                            await this.loadBoardData();
                        }

                        throw error;
                    }
                }
            })
            .then(
                () => {},
                (error) => {
                    this.toastManager.showError('Error moving card', error);
                }
            );
    }
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

        for (let i = 0; i < cardElements.length; i++) {
            const rect = cardElements[i].getBoundingClientRect();
            const threshold = rect.top + rect.height * 0.75;

            if (mouseY < threshold) {
                return i;
            }
        }

        return cardElements.length;
    }

    updateDragPlaceholder(cardsContainer, targetPosition) {
        const cardElements = Array.from(
            cardsContainer.querySelectorAll(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            )
        );

        if (!this.dragPlaceholder) {
            this.dragPlaceholder = document.createElement('div');
            this.dragPlaceholder.className = 'kanban-card drag-placeholder';

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

        if (this.dragPlaceholder.parentNode) {
            this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
        }

        if (targetPosition >= cardElements.length) {
            cardsContainer.appendChild(this.dragPlaceholder);
        } else {
            const targetCard = cardElements[targetPosition];
            if (targetCard) {
                cardsContainer.insertBefore(this.dragPlaceholder, targetCard);
            }
        }
    }
    handleCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;

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

    async handleCardNameClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const cardId = event.currentTarget.dataset.cardId;

        if (!cardId) {
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
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            this[NavigationMixin.Navigate](pageReference);
        }
    }

    async handleColumnClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const columnId = event.currentTarget.dataset.columnId;

        if (!columnId) {
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
            const isConsole = await IsConsoleNavigation();

            if (isConsole) {
                try {
                    const focusedTab = await getFocusedTabInfo();
                    await openTab({
                        pageReference: pageReference,
                        focus: true,
                        parentTabId: focusedTab.tabId
                    });
                } catch (error) {
                    await openTab({
                        pageReference: pageReference,
                        focus: true
                    });
                }
            } else {
                this[NavigationMixin.Navigate](pageReference);
            }
        } catch (error) {
            this[NavigationMixin.Navigate](pageReference);
        }
    }
    handleCardDetailClose() {
        this.showCardDetail = false;
        this.selectedCard = null;
    }

    handleCardUpdated() {
        this.showCardDetail = false;
        this.loadBoardData();
        this.selectedCard = null;
    }

    handleCardDeleted(event) {
        const cardId = event?.detail?.cardId;

        if (!cardId) {
            return;
        }

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
            this.store.dispatch({
                type: 'SET_COLUMNS',
                payload: updatedColumns
            });
        }

        this.showCardDetail = false;
        this.selectedCard = null;
    }

    handleRefresh() {
        this.loadBoardData();
    }
    async handleAddCard(event) {
        const button = event.currentTarget;
        const columnId = button.dataset.columnId;

        if (!columnId) {
            this.toastManager.showError(
                'Invalid column',
                'Column ID not found'
            );
            return;
        }

        button.disabled = true;

        try {
            const requestId = this.requestTracker.trackRequest('create', null, {
                columnId,
                subject: 'New Card'
            });

            await this.operationQueue.enqueue({
                type: 'create',
                cardId: null,
                columnId,
                requestId,
                execute: async () => {
                    try {
                        const newCard = await ServerOperations.createCard(
                            columnId,
                            'New Card',
                            this.columns,
                            requestId
                        );

                        const request =
                            this.requestTracker.getRequest(requestId);
                        if (request) {
                            request.cardId = newCard.Id;
                        }
                        this.requestTracker.completeRequest(requestId, newCard);

                        return newCard;
                    } catch (error) {
                        this.requestTracker.failRequest(requestId, error);

                        if (!this.subscriptionManager.isConnected()) {
                            await this.loadBoardData();
                        }

                        throw error;
                    }
                }
            });

            this.toastManager.showSuccess('Card created successfully');
        } catch (error) {
            this.toastManager.showError('Error creating card', error);
        } finally {
            button.disabled = false;
        }
    }

    handlePlatformEvent(event) {
        const needsRefresh = this.eventHandler.handlePlatformEvent(
            event,
            this.store
        );

        if (needsRefresh) {
            this.loadBoardData();
        }
    }

    handleEventActivity(message) {
        this.toastManager.showSubscriptionStatus(
            'Real-time update received',
            message,
            'info'
        );
    }

    handleSubscriptionMessage(variant, title, message) {
        if (variant === 'success') {
            this.toastManager.showSuccess(title, 'dismissible');
        } else {
            this.toastManager.showSubscriptionStatus(title, message, 'info');
        }
    }
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
