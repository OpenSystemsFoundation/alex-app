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

    static getDropTargetData(event) {
        const targetCard = event.currentTarget.closest('.kanban-card'),
            targetColumn = event.currentTarget.closest('.kanban-column');
        return {
            targetCardId: targetCard?.dataset.cardId || null,
            targetColumnId: targetColumn?.dataset.columnId,
            targetColumnStatus: targetColumn?.dataset.columnStatus
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
        cards.forEach(card => {
            const element = template.querySelector(
                `article[data-card-id="${card.cardId}"]`
            );
            if (element) {
                element.style.setProperty('--card-color', card.cardColor);
            }
        });
    }
    static applyColumnBorder(template, columns) {
        columns.forEach(column => {
            const element = template.querySelector(
                `div.kanban-column[data-column-id="${column.columnId}"]`
            );
            if (element) {
                element.style.setProperty('--column-color', column.columnColor);
            }
        });
    }
}
