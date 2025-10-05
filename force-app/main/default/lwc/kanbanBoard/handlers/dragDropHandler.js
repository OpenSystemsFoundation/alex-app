import { moveCardAsync } from 'c/kanbanStore';

/**
 * Handles all drag-and-drop operations for kanban cards
 */
export default class DragDropHandler {
    constructor(component) {
        this.component = component;
    }

    /**
     * Handle drag start event
     */
    handleDragStart(event) {
        const cardId = event.target.dataset.cardId;
        const columnId = event.target.dataset.columnId;
        const cardHeight = event.target.offsetHeight;

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.dataTransfer.setData('columnId', columnId);

        event.target.classList.add('dragging');
        this.component.dragData = { cardId, columnId, cardHeight };
    }

    /**
     * Handle drag end event
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');

        if (
            this.component.dragPlaceholder &&
            this.component.dragPlaceholder.parentNode
        ) {
            this.component.dragPlaceholder.parentNode.removeChild(
                this.component.dragPlaceholder
            );
        }

        this.component.dragData = null;
        this.component.dragPlaceholder = null;
        this.component.lastPlaceholderPosition = null;
    }

    /**
     * Handle drag over event
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (!this.component.dragData) {
            return;
        }

        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        const targetPosition = this.calculateDropPosition(
            event,
            cardsContainer
        );

        const isSameColumn =
            this.component.dragData.columnId === targetColumnId;
        if (isSameColumn) {
            const sourceColumn = this.component.columns.find(
                (col) => col.Id === this.component.dragData.columnId
            );
            if (sourceColumn) {
                const sourceIndex = sourceColumn.cards.findIndex(
                    (c) => c.Id === this.component.dragData.cardId
                );

                if (sourceIndex === targetPosition) {
                    if (
                        this.component.dragPlaceholder &&
                        this.component.dragPlaceholder.parentNode
                    ) {
                        this.component.dragPlaceholder.parentNode.removeChild(
                            this.component.dragPlaceholder
                        );
                        this.component.lastPlaceholderPosition = null;
                    }
                    return;
                }
            }
        }

        const positionKey = `${targetColumnId}-${targetPosition}`;

        if (this.component.lastPlaceholderPosition !== positionKey) {
            this.component.lastPlaceholderPosition = positionKey;
            this.updateDragPlaceholder(cardsContainer, targetPosition);
        }
    }

    /**
     * Handle drop event
     */
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.component.dragData) {
            return;
        }

        const { cardId, columnId: sourceColumnId } = this.component.dragData;
        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        const visualPosition = this.calculateDropPosition(
            event,
            cardsContainer
        );

        const sourceColumn = this.component.columns.find(
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

        await this.moveCard(
            cardId,
            sourceColumnId,
            targetColumnId,
            targetIndex
        );
    }

    /**
     * Move a card to a new column and position
     */
    async moveCard(cardId, sourceColumnId, targetColumnId, targetIndex) {
        const requestId = this.component.requestTracker.trackRequest(
            'move',
            cardId,
            {
                sourceColumnId,
                targetColumnId,
                targetIndex
            }
        );

        this.component.operationQueue
            .enqueue({
                type: 'move',
                cardId,
                sourceColumnId,
                targetColumnId,
                targetIndex,
                requestId,
                execute: async () => {
                    try {
                        // Use thunk to move card
                        const result = await this.component.store.dispatch(
                            moveCardAsync(
                                cardId,
                                targetColumnId,
                                targetIndex,
                                requestId,
                                this.component._clientId
                            )
                        );

                        this.component.requestTracker.completeRequest(
                            requestId,
                            result
                        );
                        return result;
                    } catch (error) {
                        this.component.requestTracker.failRequest(
                            requestId,
                            error
                        );

                        if (
                            !this.component.subscriptionManager ||
                            !this.component.subscriptionManager.isConnected()
                        ) {
                            await this.component.loadBoardData();
                        }

                        throw error;
                    }
                }
            })
            .then(
                () => {},
                (error) => {
                    if (this.component.toastManager) {
                        this.component.toastManager.showError(
                            'Error moving card',
                            error
                        );
                    }
                }
            );
    }

    /**
     * Calculate the drop position based on mouse Y coordinate
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

        for (let i = 0; i < cardElements.length; i++) {
            const rect = cardElements[i].getBoundingClientRect();
            const threshold = rect.top + rect.height * 0.75;

            if (mouseY < threshold) {
                return i;
            }
        }

        return cardElements.length;
    }

    /**
     * Update the drag placeholder position
     */
    updateDragPlaceholder(cardsContainer, targetPosition) {
        const cardElements = Array.from(
            cardsContainer.querySelectorAll(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            )
        );

        if (!this.component.dragPlaceholder) {
            this.component.dragPlaceholder = document.createElement('div');
            this.component.dragPlaceholder.className =
                'kanban-card drag-placeholder';

            const cardHeight = this.component.dragData?.cardHeight || 80;
            this.component.dragPlaceholder.style.height = `${cardHeight}px`;
            this.component.dragPlaceholder.style.margin =
                '0 var(--lwc-spacingXSmall) var(--lwc-spacingXSmall)';
            this.component.dragPlaceholder.style.border = '2px dashed #0176d3';
            this.component.dragPlaceholder.style.borderRadius = '0.25rem';
            this.component.dragPlaceholder.style.backgroundColor =
                'rgba(1, 118, 211, 0.05)';
            this.component.dragPlaceholder.style.display = 'flex';
            this.component.dragPlaceholder.style.alignItems = 'center';
            this.component.dragPlaceholder.style.justifyContent = 'center';
        }

        if (this.component.dragPlaceholder.parentNode) {
            this.component.dragPlaceholder.parentNode.removeChild(
                this.component.dragPlaceholder
            );
        }

        if (targetPosition >= cardElements.length) {
            cardsContainer.appendChild(this.component.dragPlaceholder);
        } else {
            const targetCard = cardElements[targetPosition];
            if (targetCard) {
                cardsContainer.insertBefore(
                    this.component.dragPlaceholder,
                    targetCard
                );
            }
        }
    }
}
