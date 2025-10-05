export default class DataManager {
    static processColumns(columns) {
        if (!columns || columns.length === 0) {
            return [];
        }

        return columns.map((col) => ({
            ...col,
            cardCount: 0,
            cards: [],
            columnStyle: col.color ? `border-top: 8px solid ${col.color}` : '',
            columnUrl: `/lightning/r/OpenSF__Column__c/${col.Id}/view`
        }));
    }

    static processCards(cards, columns) {
        if (!cards || !columns || columns.length === 0) {
            return { processedColumns: columns, cardsByColumn: {} };
        }

        const processedColumns = JSON.parse(JSON.stringify(columns));
        const cardsByColumn = {};

        processedColumns.forEach((col) => {
            col.cards = [];
            col.cardCount = 0;
            cardsByColumn[col.Id] = [];
        });

        cards.forEach((card) => {
            const column = processedColumns.find(
                (col) => col.Id === card.columnId
            );
            if (column) {
                const enrichedCard = DataManager.enrichCard(card);
                column.cards.push(enrichedCard);
                column.cardCount++;
                cardsByColumn[column.Id] = column.cards;
            }
        });

        processedColumns.forEach((col) => {
            col.cards.sort((a, b) => {
                if (!a.position && !b.position) return 0;
                if (!a.position) return 1;
                if (!b.position) return -1;

                return a.position.localeCompare(b.position);
            });
        });

        return { processedColumns, cardsByColumn };
    }

    static enrichCard(card) {
        return {
            ...card,
            priorityClass: DataManager.getPriorityClass(card.priority),
            assigneeInitials: DataManager.getInitials(card.assignee?.name),
            hasAssignee: !!card.assigneeId,
            formattedDueDate: card.dueDate
                ? DataManager.formatDate(card.dueDate)
                : null,
            isOverdue: card.dueDate
                ? new Date(card.dueDate) < new Date()
                : false,
            cardStyle: card.color ? `border-left: 4px solid ${card.color}` : '',
            recordUrl: `/lightning/r/OpenSF__Card__c/${card.Id}/view`
        };
    }

    static getPriorityClass(priority) {
        const priorityMap = {
            High: 'priority-high',
            Medium: 'priority-medium',
            Low: 'priority-low'
        };
        return priorityMap[priority] || '';
    }

    static getInitials(name) {
        if (!name) return '';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
}
