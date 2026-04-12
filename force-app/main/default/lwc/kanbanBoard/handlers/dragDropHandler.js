import { moveCardAsync, addCardsToSprintAsync, selectors } from 'c/kanbanStore';

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
        const cardElement = event.target;
        const cardHeight = cardElement.offsetHeight;
        const cardWidth = cardElement.offsetWidth;

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.dataTransfer.setData('columnId', columnId);

        // Create a clean drag image clone to avoid Chrome's
        // ugly default ghost (double-opacity, captured shadows, etc.)
        const dragImage = cardElement.cloneNode(true);
        dragImage.style.width = `${cardWidth}px`;
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.left = '-9999px';
        dragImage.style.opacity = '0.85';
        dragImage.style.transform = 'rotate(2deg) scale(1.02)';
        dragImage.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.18)';
        dragImage.style.borderRadius = '0.3rem';
        dragImage.style.border = '2px solid rgb(1, 118, 211)';
        dragImage.style.backgroundColor = 'rgb(255, 255, 255)';
        dragImage.style.pointerEvents = 'none';
        dragImage.classList.remove('dragging');

        document.body.appendChild(dragImage);
        this._dragImageElement = dragImage;

        // Offset so the cursor sits near where the user grabbed
        const rect = cardElement.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

        // Use requestAnimationFrame so the browser captures the clone
        // before we style the original as "dragging"
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            cardElement.classList.add('dragging');
        });

        this.component.dragData = { cardId, columnId, cardHeight };
    }

    /**
     * Handle drag end event
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');

        // Clean up the offscreen drag image clone
        if (this._dragImageElement && this._dragImageElement.parentNode) {
            this._dragImageElement.parentNode.removeChild(
                this._dragImageElement
            );
        }
        this._dragImageElement = null;

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
        this._invalidateCardCache();
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
     * Handle drop event - supports both board-to-board and backlog-to-board drops
     */
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        // Clean up drag image in case dragend doesn't fire
        if (this._dragImageElement && this._dragImageElement.parentNode) {
            this._dragImageElement.parentNode.removeChild(
                this._dragImageElement
            );
            this._dragImageElement = null;
        }

        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;

        // Check if this is a backlog-to-board drop
        const source = event.dataTransfer.getData('source');
        if (source === 'backlog') {
            const cardId = event.dataTransfer.getData('text/plain');
            if (cardId) {
                await this.handleBacklogDrop(cardId, targetColumnId);
            }
            return;
        }

        if (!this.component.dragData) {
            return;
        }

        const { cardId, columnId: sourceColumnId } = this.component.dragData;
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
     * Handle dropping a card from backlog onto the board
     */
    async handleBacklogDrop(cardId, targetColumnId) {
        const state = this.component.store.getState();
        const activeSprint = selectors.getActiveSprint(state);

        if (!activeSprint) {
            return;
        }

        try {
            // Add card to sprint
            await this.component.store.dispatch(
                addCardsToSprintAsync(activeSprint.Id, [cardId])
            );

            // Move card to the target column
            await this.component.store.dispatch(
                moveCardAsync(cardId, targetColumnId, 0)
            );

            await this.component.loadBoardData();
        } catch (error) {
            console.error('Error handling backlog drop:', error);
            if (this.component.toastManager) {
                this.component.toastManager.showError(
                    'Error adding card to sprint',
                    error
                );
            }
        }
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

    _cachedCardElements = null;
    _cachedContainerId = null;

    /**
     * Get card elements for a container, caching during a drag operation.
     */
    _getCardElements(cardsContainer) {
        const containerId = cardsContainer.dataset?.columnId || null;
        if (
            containerId &&
            this._cachedContainerId === containerId &&
            this._cachedCardElements
        ) {
            return this._cachedCardElements;
        }
        this._cachedContainerId = containerId;
        this._cachedCardElements = Array.from(
            cardsContainer.querySelectorAll(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            )
        );
        return this._cachedCardElements;
    }

    /**
     * Invalidate cached card elements (call when placeholder is moved)
     */
    _invalidateCardCache() {
        this._cachedCardElements = null;
        this._cachedContainerId = null;
    }

    /**
     * Calculate the drop position based on mouse Y coordinate
     */
    calculateDropPosition(event, cardsContainer) {
        const cardElements = this._getCardElements(cardsContainer);

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
        const cardElements = this._getCardElements(cardsContainer);

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

        // Invalidate cache since DOM order changed
        this._invalidateCardCache();
    }
}
