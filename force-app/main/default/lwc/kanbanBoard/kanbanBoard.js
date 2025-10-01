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
    lastTargetKey = null; // Track last target position (columnId:cardId:insertPosition)

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
        
        // Add keyboard listener for Escape key to cancel drag
        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);
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
        document.removeEventListener('keydown', this.handleKeyDown);
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
                (message) => this.handleTabFocused(message)
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

    updateBoardState({ board, columns, cards, isLoading, previewState }) {
        this.board = board;
        this.columns = columns;
        this.cards = cards;
        this.previewState = previewState;
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

        // Get the dragged card data for the ghost preview
        const draggedCard = this.draggedCardId 
            ? this.cards.find(card => card.cardId === this.draggedCardId)
            : null;

        return sortedColumns.map((column) => {
            // Check if column is empty (excluding the dragged card)
            const cardsInColumn = this.cards.filter((card) => card.columnId === column.columnId);
            const nonDraggedCardsInColumn = cardsInColumn.filter((card) => card.cardId !== this.draggedCardId);
            const isEmptyColumn = nonDraggedCardsInColumn.length === 0;
            
            let columnCards = cardsInColumn
                .sort(
                    (cardA, cardB) => cardA.cardPosition - cardB.cardPosition
                )
                .map((card) => {
                    const isBeingDragged = this.draggedCardId === card.cardId;
                    const isInPreviewState = this.previewState !== null && this.previewState !== undefined;
                    
                    // Build CSS classes
                    let cardClass = 'kanban-card slds-box slds-box_small slds-var-m-horizontal_x-small';
                    
                    if (isBeingDragged && isInPreviewState) {
                        // This is the dragged card - make it semi-transparent
                        cardClass += ' dragging';
                    } else if (isBeingDragged && !isInPreviewState) {
                        // Being dragged but no preview yet
                        cardClass += ' start';
                    }
                    
                    // Add preview placeholder indicator
                    let showPreviewBefore = false;
                    let showPreviewAfter = false;
                    
                    if (isInPreviewState && this.previewState && 
                        this.previewState.targetColumnId === column.columnId &&
                        !isBeingDragged) {
                        
                        const isDraggingFromThisColumn = this.previewState.sourceColumnId === column.columnId;
                        
                        if (this.previewState.targetCardId === card.cardId) {
                            if (isDraggingFromThisColumn) {
                                // In source column - need to calculate if this results in same position
                                // Get all cards in source column from original data
                                const originalCardsInColumn = this.cards
                                    .filter(c => c.columnId === column.columnId)
                                    .sort((a, b) => a.cardPosition - b.cardPosition);
                                
                                const draggedCardOriginal = originalCardsInColumn.find(c => c.cardId === this.draggedCardId);
                                const targetCardOriginal = originalCardsInColumn.find(c => c.cardId === card.cardId);
                                
                                if (!draggedCardOriginal || !targetCardOriginal) {
                                    // Safety check
                                } else {
                                    // Find indices in the original sorted list
                                    const draggedIndex = originalCardsInColumn.indexOf(draggedCardOriginal);
                                    const targetIndex = originalCardsInColumn.indexOf(targetCardOriginal);
                                    
                                    // Calculate what index the card would have after the move
                                    let newIndex = null;
                                    if (this.previewState.insertPosition === 'before') {
                                        // Insert before target
                                        newIndex = targetIndex;
                                        // If target is after dragged card, it shifts down by 1 after removal
                                        if (targetIndex > draggedIndex) {
                                            newIndex = targetIndex - 1;
                                        }
                                    } else {
                                        // Insert after target
                                        newIndex = targetIndex + 1;
                                        // If target is after dragged card, it shifts down by 1 after removal
                                        if (targetIndex > draggedIndex) {
                                            newIndex = targetIndex;
                                        }
                                    }
                                    
                                    // Only show preview if the new index is different from original
                                    if (newIndex !== draggedIndex) {
                                        if (this.previewState.insertPosition === 'before') {
                                            showPreviewBefore = true;
                                        } else {
                                            showPreviewAfter = true;
                                        }
                                    }
                                }
                            } else {
                                // Different column - show preview normally
                                if (this.previewState.insertPosition === 'before') {
                                    showPreviewBefore = true;
                                } else {
                                    showPreviewAfter = true;
                                }
                            }
                        }
                    }
                    
                    return {
                        ...card,
                        cardClass,
                        showPreviewBefore,
                        showPreviewAfter
                    };
                });
            
            // Check if preview should be at the end of this column
            // Show when: no targetCardId (empty column or hovering empty space at end)
            // BUT don't show at end of source column (would likely be at/near original position)
            const isSourceColumn = this.previewState && this.previewState.sourceColumnId === column.columnId;
            const showPreviewAtEnd = this.previewState && 
                this.previewState.targetColumnId === column.columnId &&
                (isEmptyColumn || !this.previewState.targetCardId) &&
                !isSourceColumn; // Don't show at end of source column

            return {
                ...column,
                cards: columnCards,
                showPreviewAtEnd,
                previewCard: draggedCard // Pass dragged card data for ghost preview
            };
        });
    }

    handleDragStart(event) {
        if (!event.target.classList.contains('kanban-card')) {
            event.preventDefault();
            return;
        }
        event.target.classList.add('start');
        this.draggedCardId = event.target.dataset.cardId;
        const dragData = boardHelper.getDragData(event);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }

    handleDragEnter(event) {
        event.preventDefault();
    }

    handleDragLeave(event) {
        event.preventDefault();
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Trello-style: Update every frame for smooth, real-time feedback
        // No throttling - the browser handles frame rate naturally
        
        try {
            const dragData = {
                cardId: this.draggedCardId,
                sourceColumnId: this.cards.find(c => c.cardId === this.draggedCardId)?.columnId
            };
            
            if (!dragData.sourceColumnId) return;
            
            const dropTargetData = boardHelper.getDropTargetData(event, this.draggedCardId, this.previewState);
            const dropData = {
                ...dragData,
                ...dropTargetData
            };

            // If hovering over the placeholder itself, maintain current state
            if (dropData.isOverPlaceholder) {
                return;
            }

            if (!boardHelper.isValidDrop(dropData)) {
                // Cancel preview if hovering over invalid target
                if (this.previewState) {
                    boardStore.cancelPreviewMove(this.boardId);
                }
                return;
            }

            // Only update preview if the target position has actually changed
            // Use a composite key that includes insertPosition for accuracy
            const currentTargetKey = `${dropData.targetColumnId}:${dropData.targetCardId || 'end'}:${dropData.insertPosition || 'none'}`;
            const targetPositionChanged = this.lastTargetKey !== currentTargetKey;
            
            // Update immediately when position changes - no throttling
            if (targetPositionChanged) {
                boardStore.previewMoveCard(this.boardId, dropData);
                this.lastTargetKey = currentTargetKey;
            } else if (!this.previewState) {
                // Initial preview if we don't have one yet
                boardStore.previewMoveCard(this.boardId, dropData);
                this.lastTargetKey = currentTargetKey;
            }
        } catch (error) {
            // Silently handle dragover errors to avoid console spam
        }
    }

    handleDragEnd(event) {
        event.preventDefault();
        event.target.classList.remove('start');
        this.draggedCardId = null;
        this.lastTargetKey = null;
        
        // Cancel preview if drag ends without drop
        if (this.previewState) {
            boardStore.cancelPreviewMove(this.boardId);
        }
    }

    handleKeyDown(event) {
        // Cancel drag preview on Escape key
        if (event.key === 'Escape' && this.draggedCardId) {
            if (this.previewState) {
                boardStore.cancelPreviewMove(this.boardId);
            }
            this.draggedCardId = null;
        }
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            const dragData = JSON.parse(
                event.dataTransfer.getData('text/plain')
            );

            const currentTarget = event.currentTarget;
            if (!currentTarget) {
                boardStore.cancelPreviewMove(this.boardId);
                return;
            }

            const dropTargetData = boardHelper.getDropTargetData(event, this.draggedCardId, this.previewState);

            // If we have a preview state, use its position (where the ghost is shown)
            // Otherwise use the drop target data
            const finalDropData = {
                ...dragData,
                ...dropTargetData
            };
            
            // Override with preview state position if it exists (more accurate)
            if (this.previewState) {
                finalDropData.targetCardId = this.previewState.targetCardId;
                finalDropData.targetColumnId = this.previewState.targetColumnId;
                finalDropData.insertPosition = this.previewState.insertPosition;
            }

            if (!boardHelper.isValidDrop(finalDropData)) {
                boardStore.cancelPreviewMove(this.boardId);
                return;
            }

            // Check if dropping on original position
            if (dragData.cardId === finalDropData.targetCardId && 
                dragData.sourceColumnId === finalDropData.targetColumnId) {
                boardStore.cancelPreviewMove(this.boardId);
                return;
            }

            // Commit the move (using the preview position)
            boardStore.moveCard(this.boardId, finalDropData);
        } catch (error) {
            this.handleError('Error moving card', error);
            boardStore.cancelPreviewMove(this.boardId);
        } finally {
            this.draggedCardId = null;
            this.lastTargetKey = null;
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
