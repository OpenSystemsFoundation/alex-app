/**
 * Drag and Drop Manager for Kanban Board
 * Handles all drag-and-drop operations with performance optimizations
 */

const DRAG_UPDATE_THROTTLE = 16; // ms between drag updates (~60fps)

export default class DragDropManager {
    constructor() {
        this.draggedCard = null;
        this.dragPlaceholder = null;
        this.dropSuccessful = false;
        this.lastDragUpdate = 0;
        this.lastDragPosition = null;
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
        
        const sourceColumn = columns.find(col => col.Id === columnId);
        if (!sourceColumn) {
            return false;
        }
        
        const cardIndex = sourceColumn.cards?.findIndex(c => c.Id === cardId);
        if (cardIndex === -1 || cardIndex === undefined) {
            return false;
        }
        
        this.draggedCard = {
            id: cardId,
            columnId: columnId,
            element: event.target
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
        
        // Create centered drag image
        this._createDragImage(event);
        
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
    }
    
    /**
     * Get current dragged card
     */
    getDraggedCard() {
        return this.draggedCard;
    }
    
    /**
     * Create centered drag image
     * @private
     */
    _createDragImage(event) {
        const dragElement = event.target;
        const rect = dragElement.getBoundingClientRect();
        
        const dragImage = dragElement.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.width = rect.width + 'px';
        dragImage.style.opacity = '0.8';
        dragImage.classList.remove('dragging');
        
        document.body.appendChild(dragImage);
        
        const offsetX = rect.width / 2;
        const offsetY = rect.height / 2;
        event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
        
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }
    
    /**
     * Calculate target index based on mouse position
     * @private
     */
    _calculateTargetIndex(event, cardsContainer) {
        const cardElements = Array.from(
            cardsContainer.querySelectorAll('.kanban-card:not(.dragging)')
        );
        
        if (cardElements.length === 0) {
            return 0;
        }
        
        const mouseY = event.clientY;
        let closestDistance = Infinity;
        let closestIndex = cardElements.length;
        
        for (let i = 0; i < cardElements.length; i++) {
            const cardElement = cardElements[i];
            const rect = cardElement.getBoundingClientRect();
            
            const distanceToTop = Math.abs(mouseY - rect.top);
            if (distanceToTop < closestDistance) {
                closestDistance = distanceToTop;
                closestIndex = i;
            }
            
            const distanceToBottom = Math.abs(mouseY - rect.bottom);
            if (distanceToBottom < closestDistance) {
                closestDistance = distanceToBottom;
                closestIndex = i + 1;
            }
        }
        
        return closestIndex;
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
        return currentIndex === targetPosition || currentIndex + 1 === targetPosition;
    }
}
