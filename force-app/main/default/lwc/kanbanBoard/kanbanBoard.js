import { api, LightningElement, track, wire } from 'lwc';
import { MessageContext } from 'lightning/messageService';
import { IsConsoleNavigation } from 'lightning/platformWorkspaceApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import boardHelper from './kanbanBoardHelper';
import boardStore from 'c/kanbanBoardStore';
import KanbanBoardLifecycle from './kanbanBoardLifecycle';
import KanbanBoardState from './kanbanBoardState';
import KanbanBoardComputed from './kanbanBoardComputed';
import KanbanBoardDragDrop from './kanbanBoardDragDrop';

/**
 * KanbanBoard - Main component focused on event handling
 * Delegates business logic to specialized modules following SOC principles
 */
export default class KanbanBoard extends LightningElement {
    @wire(MessageContext)
    messageContext;
    @wire(IsConsoleNavigation)
    isConsoleNavigation;

    @api recordId;
    @api maxHeight = '70vh';
    @api experienceCloud;
    @track board;
    @track columns;
    @track cards;
    @track previewState;
    boardId;
    error;
    isLoading = false;
    initializeBoard = false;
    draggedCardId = null;
    draggedCardSourceColumnId = null;
    lastTargetKey = null;

    openModal = false;
    modalRecordId;
    modalRecordName;

    subscriptionCallback;
    tabFocusedSubscription = null;
    tabInfo;

    connectedCallback() {
        KanbanBoardLifecycle.onConnected(this);
    }

    renderedCallback() {
        KanbanBoardLifecycle.onRendered(this);
    }

    disconnectedCallback() {
        KanbanBoardLifecycle.onDisconnected(this);
    }

    handleStateChange(state) {
        KanbanBoardState.handleStateChange(this, state);
    }

    get columnsWithCards() {
        return KanbanBoardComputed.getColumnsWithCards(this);
    }

    handleDragStart(event) {
        KanbanBoardDragDrop.handleDragStart(this, event);
    }

    handleDragEnter(event) {
        KanbanBoardDragDrop.handleDragEnter(event);
    }

    handleDragLeave(event) {
        KanbanBoardDragDrop.handleDragLeave(event);
    }

    handleDragOver(event) {
        KanbanBoardDragDrop.handleDragOver(this, event);
    }

    handleDragEnd(event) {
        KanbanBoardDragDrop.handleDragEnd(this, event);
    }

    handleKeyDown(event) {
        KanbanBoardDragDrop.handleKeyDown(this, event);
    }

    handleDrop(event) {
        KanbanBoardDragDrop.handleDrop(this, event);
    }

    handleCardClick(event) {
        const cardElement = event.target.closest('.kanban-card');
        if (!cardElement) {
            throw new Error('Card element not found');
        }
        this.modalRecordId = cardElement.dataset.cardId;
        this.modalRecordName = cardElement.dataset.cardName;
        this.openModal = true;
    }

    handleModalClose() {
        this.openModal = false;
        this.modalRecordId = null;
        this.modalRecordName = null;
    }

    handleCreateCard(event) {
        try {
            const { columnId, columnStatus } = boardHelper.getColumnData(event);
            boardStore.createCard(this.boardId, columnId, columnStatus);
            this.showToast('Success', 'Card created successfully', 'success');
        } catch (error) {
            this.handleError('Error creating card', error);
        }
    }

    openColumn(event) {
        if (!this.isConsoleNavigation) {
            return;
        }
        event.preventDefault();
        boardHelper.openItem({
            dataAttribute: 'columnId',
            event,
            isConsoleNavigation: this.isConsoleNavigation,
            selector: '.kanban-column'
        });
    }

    openCard(event) {
        const originalEvent = event.detail?.originalEvent || event;
        const cardId = event.detail?.cardId;
        
        originalEvent.stopPropagation();
        if (!this.isConsoleNavigation) {
            return;
        }
        originalEvent.preventDefault();

        // Find the article element with the card data
        const cardElement = originalEvent.target.closest('.kanban-card');
        if (!cardElement) {
            return;
        }

        boardHelper.openItem({
            dataAttribute: 'cardId',
            event: originalEvent,
            isConsoleNavigation: this.isConsoleNavigation,
            selector: '.kanban-card'
        });
    }

    handleError(customMessage, error) {
        const errorMessage =
            error && error.message
                ? `Error: ${error.message}`
                : 'An unexpected error occurred';
        this.error = customMessage || errorMessage;
        this.showToast('Error', this.error, 'error');
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
}
