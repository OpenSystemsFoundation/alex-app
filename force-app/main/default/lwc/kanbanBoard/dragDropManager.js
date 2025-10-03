/**
 * Drag and Drop Manager for Kanban Board
 * Handles all drag-and-drop operations with performance optimizations
 */

const DRAG_UPDATE_THROTTLE = 8; // ms between drag updates (~120fps for smoother reordering)
const DROP_ZONE_TOLERANCE = 2; // px - small tolerance to prevent jitter

export default class DragDropManager {
    constructor(template) {
        this.template = template;
        this.draggedCard = null;
        this.dragPlaceholder = null;
        this.dropSuccessful = false;
        this.lastDragUpdate = 0;
        this.lastDragPosition = null;
        this.dragOffset = { x: 0, y: 0 }; // Store where user clicked on card
    }

    /**
     * Handle drag start
     */
    handleDragStart(event, store) {
        const cardId = event.target.dataset.cardId;
        const columnId = event.target.dataset.columnId;

        const columns = store.getState().columns;
        if (!columns || columns.length === 0) {
            return false;
        }

        const sourceColumn = columns.find((col) => col.Id === columnId);
        if (!sourceColumn) {
            return false;
        }

        const cardIndex = sourceColumn.cards?.findIndex((c) => c.Id === cardId);
        if (cardIndex === -1 || cardIndex === undefined) {
            return false;
        }

        // Store drag offset for accurate position calculations
        const rect = event.target.getBoundingClientRect();
        this.dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        this.draggedCard = {
            id: cardId,
            columnId: columnId,
            element: event.target,
            rect: rect
        };

        // Dispatch to store
        store.dispatch({
            type: 'START_DRAG',
            payload: { source: { columnId, cardIndex } }
        });

        // Visual feedback
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);

        // Create drag image with natural offset (where user clicked)
        this._createDragImage(event, rect);

        return true;
    }

    /**
     * Handle drag end
     */
    handleDragEnd(event, store) {
        event.target.classList.remove('dragging');

        // Cancel drag if not successful
        if (!this.dropSuccessful) {
            store.dispatch({ type: 'CANCEL_DRAG' });
        }

        // Remove all drag classes from template
        if (this.template) {
            this.template.querySelectorAll('.drag-active').forEach((el) => {
                el.classList.remove('drag-active');
            });
        }

        // Reset state
        this.reset();
    }

    /**
     * Handle drag over with throttling
     */
    handleDragOver(event, store) {
        event.preventDefault();

        if (!this.draggedCard || !store.getState().isDragging) {
            return null;
        }

        event.dataTransfer.dropEffect = 'move';

        // Throttle for performance
        const now = Date.now();
        if (now - this.lastDragUpdate < DRAG_UPDATE_THROTTLE) {
            return null;
        }

        const cardsContainer = event.currentTarget;
        const targetColumnId = cardsContainer.dataset.columnId;
        const targetIndex = this._calculateTargetIndex(event, cardsContainer);

        // Check if position changed
        const positionKey = `${targetColumnId}-${targetIndex}`;
        if (this.lastDragPosition === positionKey) {
            return null;
        }

        // Update cache
        this.lastDragPosition = positionKey;
        this.lastDragUpdate = now;

        // Dispatch update
        store.dispatch({
            type: 'UPDATE_DRAG_POSITION',
            payload: { targetColumnId, targetIndex }
        });

        // Store for drop
        this.dragPlaceholder = {
            columnId: targetColumnId,
            targetIndex: targetIndex
        };

        return this.dragPlaceholder;
    }

    /**
     * Handle drop
     */
    handleDrop(event, store) {
        event.preventDefault();
        event.stopPropagation();

        const cardsContainer = event.currentTarget;
        cardsContainer.classList.remove('drag-active');

        // Remove all visual feedback from template
        if (this.template) {
            this.template.querySelectorAll('.drag-active').forEach((el) => {
                el.classList.remove('drag-active');
            });
        }

        if (!this.draggedCard || !this.dragPlaceholder) {
            store.dispatch({ type: 'CANCEL_DRAG' });
            return null;
        }

        const targetColumnId = this.dragPlaceholder.columnId;
        const targetPosition = this.dragPlaceholder.targetIndex;
        const storeState = store.getState();

        // Check if position actually changed
        if (this._isSamePosition(storeState, targetColumnId, targetPosition)) {
            store.dispatch({ type: 'CANCEL_DRAG' });
            return null;
        }

        // Commit drag
        store.dispatch({ type: 'COMMIT_DRAG' });
        this.dropSuccessful = true;

        return {
            cardId: this.draggedCard.id,
            sourceColumnId: this.draggedCard.columnId,
            targetColumnId,
            targetPosition
        };
    }

    /**
     * Reset drag state
     */
    reset() {
        this.draggedCard = null;
        this.dragPlaceholder = null;
        this.dropSuccessful = false;
        this.lastDragPosition = null;
        this.lastDragUpdate = 0;
        this.dragOffset = { x: 0, y: 0 };
    }

    /**
     * Get current dragged card
     */
    getDraggedCard() {
        return this.draggedCard;
    }

    /**
     * Create drag image with natural offset (preserves click position)
     * @private
     */
    _createDragImage(event, rect) {
        const dragElement = event.target;

        // Use pre-calculated offset for consistency
        const offsetX = this.dragOffset.x;
        const offsetY = this.dragOffset.y;

        const dragImage = dragElement.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.width = rect.width + 'px';
        dragImage.style.opacity = '0.8';
        dragImage.classList.remove('dragging');

        document.body.appendChild(dragImage);

        // Use the actual click offset instead of centering
        event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

        // Remove drag image after render - use Promise.resolve for LWC compliance
        Promise.resolve().then(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        });
    }

    /**
     * Calculate target index based on mouse position
     * Accounts for same-column reordering where dragged card affects indices
     * @private
     */
    _calculateTargetIndex(event, cardsContainer) {
        const cardElements = Array.from(
            cardsContainer.querySelectorAll('.kanban-card:not(.dragging)')
        );

        if (cardElements.length === 0) {
            return 0;
        }

        // Use mouse Y position directly for more responsive detection
        const mouseY = event.clientY;

        // Check if we're in the same column as the source
        const targetColumnId = cardsContainer.dataset.columnId;
        const isSameColumn =
            this.draggedCard && this.draggedCard.columnId === targetColumnId;

        // Find insertion point
        for (let i = 0; i < cardElements.length; i++) {
            const rect = cardElements[i].getBoundingClientRect();

            // Use the midpoint of each card as the threshold
            const cardMidpoint = rect.top + rect.height / 2;

            if (isSameColumn) {
                // For same column, be more responsive - use mouse position directly
                if (mouseY < cardMidpoint) {
                    return i;
                }
            } else {
                // Different column - add small tolerance to prevent jitter
                if (mouseY < cardMidpoint - DROP_ZONE_TOLERANCE) {
                    return i;
                }
            }
        }

        // Position is after all cards
        return cardElements.length;
    }

    /**
     * Check if drop position is the same as source
     * @private
     */
    _isSamePosition(storeState, targetColumnId, targetPosition) {
        if (!storeState.dragSource) {
            return false;
        }

        if (storeState.dragSource.columnId !== targetColumnId) {
            return false;
        }

        const currentIndex = storeState.dragSource.cardIndex;
        return (
            currentIndex === targetPosition ||
            currentIndex + 1 === targetPosition
        );
    }
}
