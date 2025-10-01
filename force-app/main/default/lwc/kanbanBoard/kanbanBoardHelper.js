import { openTab } from 'lightning/platformWorkspaceApi';

export default class BoardHelper {
    static applyMaxHeight(template, maxHeight) {
        const kanbanBoard = template.querySelector('.kanban-board');
        if (!kanbanBoard) {
            return;
        }
        kanbanBoard.style.setProperty('--max-height', `${maxHeight}`);
    }

    static getColumnData(event) {
        const column = event.target.closest('.kanban-column');
        return {
            columnId: column?.dataset.columnId,
            columnStatus: column?.dataset.columnStatus
        };
    }

    static getDragData(event) {
        return {
            cardId: event.target.dataset.cardId,
            sourceColumnId:
                event.target.closest('.kanban-column').dataset.columnId
        };
    }

    static getDropTargetData(event, draggedCardId = null, previewState = null) {
        let targetCard = null;
        let targetColumn = null;
        let isOverPlaceholder = false;
        
        // Salesforce: Use event.target for reliable Shadow DOM detection
        const hoveredElement = event.target;
        if (hoveredElement) {
            if (hoveredElement.classList.contains('preview-ghost') || 
                hoveredElement.closest('.preview-ghost')) {
                isOverPlaceholder = true;
                targetColumn = hoveredElement.closest('.kanban-column');
                
                return {
                    targetCardId: null,
                    targetColumnId: targetColumn?.dataset.columnId,
                    targetColumnStatus: targetColumn?.dataset.columnStatus,
                    isOverPlaceholder: true
                };
            }
            
            targetCard = hoveredElement.closest('.kanban-card');
            targetColumn = hoveredElement.closest('.kanban-column');
            
            if (targetCard && !targetCard.classList.contains('dragging') && 
                !targetCard.classList.contains('preview-ghost') && event.clientY) {
                const rect = targetCard.getBoundingClientRect();
                const mouseY = event.clientY;
                const relativeY = mouseY - rect.top;
                targetCard._calculatedPosition = relativeY < (rect.height / 2) ? 'before' : 'after';
            }
        }
        
        if (!targetCard && targetColumn && event.clientY) {
            const columnWrapper = targetColumn.querySelector('.kanban-column__card-wrapper');
            if (columnWrapper) {
                const allCards = Array.from(columnWrapper.querySelectorAll('.kanban-card:not(.dragging):not(.preview-ghost)'));
                const mouseY = event.clientY;
                
                if (allCards.length > 0) {
                    if (previewState) {
                        const ghostCard = document.querySelector('.preview-ghost');
                        if (ghostCard) {
                            const ghostRect = ghostCard.getBoundingClientRect();
                            const BUFFER = 20;
                            
                            if (mouseY >= ghostRect.top - BUFFER && mouseY <= ghostRect.bottom + BUFFER) {
                                return {
                                    targetCardId: null,
                                    targetColumnId: targetColumn?.dataset.columnId,
                                    targetColumnStatus: targetColumn?.dataset.columnStatus,
                                    isOverPlaceholder: true
                                };
                            }
                        }
                    }
                    
                    const firstCard = allCards[0];
                    const firstCardRect = firstCard.getBoundingClientRect();
                    
                    if (mouseY <= firstCardRect.top + (firstCardRect.height / 2)) {
                        targetCard = firstCard;
                        targetCard._calculatedPosition = 'before';
                    } else {
                        let closestDistance = Infinity;
                        let bestCard = null;
                        let bestPosition = null;
                        
                        allCards.forEach((card) => {
                            const rect = card.getBoundingClientRect();
                            
                            const distanceToTop = Math.abs(mouseY - rect.top);
                            if (distanceToTop < closestDistance) {
                                closestDistance = distanceToTop;
                                bestCard = card;
                                bestPosition = 'before';
                            }
                            
                            const distanceToBottom = Math.abs(mouseY - rect.bottom);
                            if (distanceToBottom < closestDistance) {
                                closestDistance = distanceToBottom;
                                bestCard = card;
                                bestPosition = 'after';
                            }
                        });
                        
                        if (bestCard) {
                            targetCard = bestCard;
                            targetCard._calculatedPosition = bestPosition;
                        }
                    }
                }
            }
        }
        
        if (!targetCard && !targetColumn && event.clientX !== undefined && event.clientY !== undefined) {
            const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
            if (elementUnderMouse && !elementUnderMouse.classList.contains('ONE-RECORD-HOME-FLEXIPAGE2')) {
                targetCard = elementUnderMouse.closest('.kanban-card');
                targetColumn = elementUnderMouse.closest('.kanban-column');
            }
        }
        
        if (isOverPlaceholder) {
            return {
                targetCardId: null,
                targetColumnId: targetColumn?.dataset.columnId,
                targetColumnStatus: targetColumn?.dataset.columnStatus,
                isOverPlaceholder: true
            };
        }
        
        if (!targetColumn) {
            return {
                targetCardId: null,
                targetColumnId: null,
                targetColumnStatus: null,
                isOverPlaceholder: false
            };
        }
        
        if (targetCard && draggedCardId && targetCard.dataset.cardId === draggedCardId) {
            return {
                targetCardId: null,
                targetColumnId: targetColumn?.dataset.columnId,
                targetColumnStatus: targetColumn?.dataset.columnStatus,
                isOverPlaceholder: false,
                insertPosition: null
            };
        }
        
        let insertPosition = null;
        
        if (targetCard) {
            insertPosition = targetCard._calculatedPosition || null;
            delete targetCard._calculatedPosition;
        }
        
        return {
            targetCardId: targetCard?.dataset.cardId || null,
            targetColumnId: targetColumn?.dataset.columnId,
            targetColumnStatus: targetColumn?.dataset.columnStatus,
            isOverPlaceholder: false,
            insertPosition: targetCard ? insertPosition : null
        };
    }

    static isValidDrop({
        targetColumnId,
        cardId,
        targetCardId,
        sourceColumnId
    }) {
        return (
            targetColumnId &&
            !(cardId === targetCardId && sourceColumnId === targetColumnId)
        );
    }

    static openItem({ dataAttribute, event, isConsoleNavigation, selector }) {
        if (!isConsoleNavigation) {
            return;
        }

        const recordId = event.target.closest(selector)?.dataset[dataAttribute];
        if (!recordId) {
            return;
        }

        openTab({
            focus: true,
            recordId
        });
    }

    static applyCardEdge(template, cards) {
        cards.forEach((card) => {
            const element = template.querySelector(
                `article[data-card-id="${card.cardId}"]`
            );
            if (element) {
                if (card.cardColor != null) {
                    element.classList.add('card-edge');
                } else {
                    element.classList.remove('card-edge');
                }
                element.style.setProperty('--card-color', card.cardColor);
            }
        });
    }

    static applyColumnBorder(template, columns) {
        columns.forEach((column) => {
            const element = template.querySelector(
                `div.kanban-column[data-column-id="${column.columnId}"]`
            );
            if (element) {
                element.style.setProperty('--column-color', column.columnColor);
            }
        });
    }
}
