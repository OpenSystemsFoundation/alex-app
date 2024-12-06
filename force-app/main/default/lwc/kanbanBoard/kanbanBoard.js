import { api, LightningElement, track, wire } from 'lwc';
import {
    MessageContext,
    subscribe,
    unsubscribe
} from 'lightning/messageService';
import {
    getFocusedTabInfo,
    IsConsoleNavigation
} from 'lightning/platformWorkspaceApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import tabFocusedChannel from '@salesforce/messageChannel/lightning__tabFocused';
import boardHelper from './kanbanBoardHelper';
import boardStore from 'c/kanbanBoardStore';

export default class KanbanBoard extends LightningElement {
    @wire(MessageContext)
    messageContext;
    @wire(IsConsoleNavigation)
    isConsoleNavigation;

    @api recordId;
    @api maxHeight = '70vh';
    @track board;
    @track columns;
    @track cards;
    boardId;
    error;
    isLoading = false;
    initializeBoard = false;

    openModal = false;
    modalRecordId;
    modalRecordName;

    subscriptionCallback;
    tabFocusedSubscription = null;
    tabInfo;

    connectedCallback() {
        this.subscriptionCallback = this.handleStateChange.bind(this);
        boardStore.subscribe(this.subscriptionCallback);
        try {
            this.boardId = this.recordId;
            this.initializeBoardData();
        } catch (error) {
            this.handleError('Failed to initialize board.', error);
        }

        this.subscribeToTabFocused();
    }

    renderedCallback() {
        boardHelper.applyMaxHeight(this.template, this.maxHeight);
        boardHelper.applyCardEdge(this.template, this.cards);
        boardHelper.applyColumnBorder(this.template, this.columns);
    }

    disconnectedCallback() {
        if (this.subscriptionCallback) {
            boardStore.unsubscribe(this.subscriptionCallback);
        }

        this.unsubscribeFromTabFocused();
        this.boardId = null;
    }

    async initializeBoardData() {
        this.initializeBoard = true;
        try {
            await boardStore.initialize(this.boardId);
        } catch (error) {
            this.handleError('Error initializing Kanban Board', error);
        } finally {
            this.initializeBoard = false;
        }
    }

    subscribeToTabFocused() {
        if (!this.tabFocusedSubscription) {
            this.tabFocusedSubscription = subscribe(
                this.messageContext,
                tabFocusedChannel,
                message => this.handleTabFocused(message)
            );
        }
    }

    async handleTabFocused() {
        try {
            const tabInfo = await getFocusedTabInfo();
            if (tabInfo && tabInfo.recordId) {
                if (tabInfo.recordId !== this.boardId) {
                    this.boardId = tabInfo.recordId;
                    await this.initializeBoardData();
                }
            }
        } catch (error) {
            this.showToast(
                'Error',
                'Unable to fetch focused tab info.',
                'error'
            );
        }
    }

    unsubscribeFromTabFocused() {
        if (this.tabFocusedSubscription) {
            unsubscribe(this.tabFocusedSubscription);
            this.tabFocusedSubscription = null;
        }
    }

    handleStateChange(state) {
        const { boards, error } = state;
        if (error || !boards) {
            this.error = error;
            return;
        }

        const boardState = boards[this.boardId];
        if (!boardState) {
            this.error = 'Board data not found.';
            return;
        }

        this.updateBoardState(boardState);
        this.isLoading = boardState.isLoading;
    }

    updateBoardState({ board, columns, cards, isLoading }) {
        this.board = board;
        this.columns = columns;
        this.cards = cards;
        this.error = null;
        this.isLoading = isLoading;
    }

    get columnsWithCards() {
        if (!this.columns || !this.cards) {
            return [];
        }

        const sortedColumns = [...this.columns].sort(
            (colA, colB) => colA.columnPosition - colB.columnPosition
        );

        return sortedColumns.map(column => {
            const columnCards = this.cards
                .filter(card => card.columnId === column.columnId)
                .sort(
                    (cardA, cardB) => cardA.cardPosition - cardB.cardPosition
                );

            return {
                ...column,
                cards: columnCards
            };
        });
    }

    handleDragStart(event) {
        if (!event.target.classList.contains('kanban-card')) {
            event.preventDefault();
            return;
        }
        event.target.classList.add('start');
        const dragData = boardHelper.getDragData(event);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }

    handleDragEnter(event) {
        event.preventDefault();
        const target = event.currentTarget.closest('article');
        target.classList.add('over');
    }

    handleDragLeave(event) {
        const target = event.currentTarget.closest('article');
        target.classList.remove('over');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const target = event.currentTarget.closest('article');
        if (!target.classList.contains('over')) {
            target.classList.add('over');
        }
    }

    handleDragEnd(event) {
        event.preventDefault();
        event.target.classList.remove('start');
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const boardCards = this.template.querySelectorAll('.kanban-card');
        boardCards.forEach(card => card.classList.remove('over'));

        const dropData = {
            ...JSON.parse(event.dataTransfer.getData('text/plain')),
            ...boardHelper.getDropTargetData(event)
        };

        if (!boardHelper.isValidDrop(dropData)) {
            return;
        }

        try {
            boardStore.moveCard(this.boardId, dropData);
        } catch (error) {
            this.handleError('Error moving card', error);
        }
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
        event.stopPropagation();
        if (!this.isConsoleNavigation) {
            return;
        }
        event.preventDefault();

        boardHelper.openItem({
            dataAttribute: 'cardId',
            event,
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
