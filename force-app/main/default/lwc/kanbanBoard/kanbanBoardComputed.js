/**
 * Computed properties for KanbanBoard component
 * Handles data transformation and derived state
 */

export default class KanbanBoardComputed {
    /**
     * Get columns with their associated cards and preview states
     * @param {Object} component - Reference to the LWC component
     * @returns {Array} Columns with cards and preview information
     */
    static getColumnsWithCards(component) {
        if (!component.columns || !component.cards) {
            return [];
        }

        const sortedColumns = [...component.columns].sort(
            (colA, colB) => colA.columnPosition - colB.columnPosition
        );

        const draggedCard = component.draggedCardId 
            ? component.cards.find(card => card.cardId === component.draggedCardId)
            : null;

        return sortedColumns.map((column) => {
            const cardsInColumn = component.cards.filter((card) => card.columnId === column.columnId);
            const nonDraggedCardsInColumn = cardsInColumn.filter((card) => card.cardId !== component.draggedCardId);
            const isEmptyColumn = nonDraggedCardsInColumn.length === 0;
            
            const columnCards = this.getColumnCards(component, column, cardsInColumn, isEmptyColumn);
            const showPreviewAtEnd = this.shouldShowPreviewAtEnd(component, column, isEmptyColumn);

            return {
                ...column,
                cards: columnCards,
                showPreviewAtEnd,
                previewCard: draggedCard
            };
        });
    }

    /**
     * Get cards for a specific column with their UI states
     * @param {Object} component - Reference to the LWC component
     * @param {Object} column - Column object
     * @param {Array} cardsInColumn - Cards in this column
     * @param {Boolean} isEmptyColumn - Whether column is empty
     * @returns {Array} Cards with UI state
     */
    static getColumnCards(component, column, cardsInColumn, isEmptyColumn) {
        return cardsInColumn
            .sort((cardA, cardB) => cardA.cardPosition - cardB.cardPosition)
            .map((card) => {
                const isBeingDragged = component.draggedCardId === card.cardId;
                const isInPreviewState = component.previewState !== null && component.previewState !== undefined;
                
                let cardClass = 'kanban-card slds-box slds-box_small slds-var-m-horizontal_x-small';
                
                if (isBeingDragged && isInPreviewState) {
                    cardClass += ' dragging';
                } else if (isBeingDragged && !isInPreviewState) {
                    cardClass += ' start';
                }
                
                const { showPreviewBefore, showPreviewAfter } = this.calculatePreviewIndicators(
                    component,
                    column,
                    card,
                    isBeingDragged
                );
                
                return {
                    ...card,
                    cardClass,
                    showPreviewBefore,
                    showPreviewAfter
                };
            });
    }

    /**
     * Calculate whether to show preview indicators before/after a card
     * @param {Object} component - Reference to the LWC component
     * @param {Object} column - Column object
     * @param {Object} card - Card object
     * @param {Boolean} isBeingDragged - Whether this card is being dragged
     * @returns {Object} { showPreviewBefore, showPreviewAfter }
     */
    static calculatePreviewIndicators(component, column, card, isBeingDragged) {
        let showPreviewBefore = false;
        let showPreviewAfter = false;
        
        const isInPreviewState = component.previewState !== null && component.previewState !== undefined;
        
        if (isInPreviewState && component.previewState && 
            component.previewState.targetColumnId === column.columnId &&
            !isBeingDragged) {
            
            const isDraggingFromThisColumn = component.previewState.sourceColumnId === column.columnId;
            
            if (component.previewState.targetCardId === card.cardId) {
                if (isDraggingFromThisColumn) {
                    const shouldShowPreview = this.shouldShowPreviewInSourceColumn(
                        component,
                        column,
                        card
                    );
                    
                    if (shouldShowPreview) {
                        if (component.previewState.insertPosition === 'before') {
                            showPreviewBefore = true;
                        } else {
                            showPreviewAfter = true;
                        }
                    }
                } else {
                    if (component.previewState.insertPosition === 'before') {
                        showPreviewBefore = true;
                    } else {
                        showPreviewAfter = true;
                    }
                }
            }
        }
        
        return { showPreviewBefore, showPreviewAfter };
    }

    /**
     * Check if preview should be shown in source column
     * @param {Object} component - Reference to the LWC component
     * @param {Object} column - Column object
     * @param {Object} card - Card object
     * @returns {Boolean} Whether to show preview
     */
    static shouldShowPreviewInSourceColumn(component, column, card) {
        const originalCardsInColumn = component.cards
            .filter(c => c.columnId === column.columnId)
            .sort((a, b) => a.cardPosition - b.cardPosition);
        
        const draggedCardOriginal = originalCardsInColumn.find(c => c.cardId === component.draggedCardId);
        const targetCardOriginal = originalCardsInColumn.find(c => c.cardId === card.cardId);
        
        if (!draggedCardOriginal || !targetCardOriginal) {
            return false;
        }
        
        const draggedIndex = originalCardsInColumn.indexOf(draggedCardOriginal);
        const targetIndex = originalCardsInColumn.indexOf(targetCardOriginal);
        
        let newIndex = null;
        if (component.previewState.insertPosition === 'before') {
            newIndex = targetIndex;
            if (targetIndex > draggedIndex) {
                newIndex = targetIndex - 1;
            }
        } else {
            newIndex = targetIndex + 1;
            if (targetIndex > draggedIndex) {
                newIndex = targetIndex;
            }
        }
        
        return newIndex !== draggedIndex;
    }

    /**
     * Check if preview should be shown at the end of column
     * @param {Object} component - Reference to the LWC component
     * @param {Object} column - Column object
     * @param {Boolean} isEmptyColumn - Whether column is empty
     * @returns {Boolean} Whether to show preview at end
     */
    static shouldShowPreviewAtEnd(component, column, isEmptyColumn) {
        const isSourceColumn = component.previewState && component.previewState.sourceColumnId === column.columnId;
        
        return component.previewState && 
            component.previewState.targetColumnId === column.columnId &&
            (isEmptyColumn || !component.previewState.targetCardId) &&
            !isSourceColumn;
    }
}
