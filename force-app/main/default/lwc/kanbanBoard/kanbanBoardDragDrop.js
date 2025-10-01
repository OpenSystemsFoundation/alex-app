/**
 * Drag and drop handling for KanbanBoard component
 * Manages all drag and drop interactions and state
 */
import boardHelper from './kanbanBoardHelper';
import boardStore from 'c/kanbanBoardStore';

export default class KanbanBoardDragDrop {
    /**
     * Handle drag start event
     * @param {Object} component - Reference to the LWC component
     * @param {Event} event - Drag start event
     */
    static handleDragStart(component, event) {
        if (!event.target.classList.contains('kanban-card')) {
            event.preventDefault();
            return;
        }
        event.target.classList.add('start');
        component.draggedCardId = event.target.dataset.cardId;
        const dragData = boardHelper.getDragData(event);
        component.draggedCardSourceColumnId = dragData.sourceColumnId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }

    /**
     * Handle drag enter event
     * @param {Event} event - Drag enter event
     */
    static handleDragEnter(event) {
        event.preventDefault();
    }

    /**
     * Handle drag leave event
     * @param {Event} event - Drag leave event
     */
    static handleDragLeave(event) {
        event.preventDefault();
    }

    /**
     * Handle drag over event with real-time preview
     * @param {Object} component - Reference to the LWC component
     * @param {Event} event - Drag over event
     */
    static handleDragOver(component, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        try {
            const dragData = {
                cardId: component.draggedCardId,
                sourceColumnId: component.draggedCardSourceColumnId
            };
            
            if (!dragData.sourceColumnId) return;
            
            const dropTargetData = boardHelper.getDropTargetData(
                event, 
                component.draggedCardId, 
                component.previewState
            );
            const dropData = {
                ...dragData,
                ...dropTargetData
            };

            if (dropData.isOverPlaceholder) {
                return;
            }

            if (!boardHelper.isValidDrop(dropData)) {
                if (component.previewState) {
                    boardStore.cancelPreviewMove(component.boardId);
                }
                return;
            }

            const currentTargetKey = `${dropData.targetColumnId}:${dropData.targetCardId || 'end'}:${dropData.insertPosition || 'none'}`;
            const targetPositionChanged = component.lastTargetKey !== currentTargetKey;
            
            if (targetPositionChanged) {
                boardStore.previewMoveCard(component.boardId, dropData);
                component.lastTargetKey = currentTargetKey;
            } else if (!component.previewState) {
                boardStore.previewMoveCard(component.boardId, dropData);
                component.lastTargetKey = currentTargetKey;
            }
        } catch (error) {
            // Intentionally ignore DOMException from preventDefault if event is not cancelable
        }
    }

    /**
     * Handle drag end event
     * @param {Object} component - Reference to the LWC component
     * @param {Event} event - Drag end event
     */
    static handleDragEnd(component, event) {
        event.preventDefault();
        event.target.classList.remove('start');
        component.draggedCardId = null;
        component.draggedCardSourceColumnId = null;
        component.lastTargetKey = null;
        
        if (component.previewState) {
            boardStore.cancelPreviewMove(component.boardId);
        }
    }

    /**
     * Handle keyboard events during drag (e.g., Escape to cancel)
     * @param {Object} component - Reference to the LWC component
     * @param {Event} event - Keyboard event
     */
    static handleKeyDown(component, event) {
        if (event.key === 'Escape' && component.draggedCardId) {
            if (component.previewState) {
                boardStore.cancelPreviewMove(component.boardId);
            }
            component.draggedCardId = null;
            component.draggedCardSourceColumnId = null;
        }
    }

    /**
     * Handle drop event
     * @param {Object} component - Reference to the LWC component
     * @param {Event} event - Drop event
     */
    static handleDrop(component, event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            const dragData = JSON.parse(
                event.dataTransfer.getData('text/plain')
            );

            const currentTarget = event.currentTarget;
            if (!currentTarget) {
                boardStore.cancelPreviewMove(component.boardId);
                return;
            }

            const dropTargetData = boardHelper.getDropTargetData(
                event, 
                component.draggedCardId, 
                component.previewState
            );

            const finalDropData = {
                ...dragData,
                ...dropTargetData
            };
            
            if (component.previewState) {
                finalDropData.targetCardId = component.previewState.targetCardId;
                finalDropData.targetColumnId = component.previewState.targetColumnId;
                finalDropData.insertPosition = component.previewState.insertPosition;
            }

            if (!boardHelper.isValidDrop(finalDropData)) {
                boardStore.cancelPreviewMove(component.boardId);
                return;
            }

            if (dragData.cardId === finalDropData.targetCardId && 
                dragData.sourceColumnId === finalDropData.targetColumnId) {
                boardStore.cancelPreviewMove(component.boardId);
                return;
            }

            boardStore.moveCard(component.boardId, finalDropData);
        } catch (error) {
            component.handleError('Error moving card', error);
            boardStore.cancelPreviewMove(component.boardId);
        } finally {
            component.draggedCardId = null;
            component.draggedCardSourceColumnId = null;
            component.lastTargetKey = null;
        }
    }
}
