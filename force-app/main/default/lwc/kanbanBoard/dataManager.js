/**
 * Data Manager for Kanban Board
 * Handles data loading, processing, and card enrichment
 */

export default class DataManager {
    /**
     * Process columns data into UI-ready format
     */
    static processColumns(columns) {
        if (!columns || columns.length === 0) {
            return [];
        }
        
        return columns.map(col => ({
            ...col,
            cardCount: 0,
            cards: [],
            columnStyle: col.color ? `background-color: ${col.color}` : ''
        }));
    }
    
    /**
     * Process cards data and assign to columns
     */
    static processCards(cards, columns) {
        if (!cards || !columns || columns.length === 0) {
            return { processedColumns: columns, cardsByColumn: {} };
        }
        
        // Create working copy
        const processedColumns = JSON.parse(JSON.stringify(columns));
        const cardsByColumn = {};
        
        // Initialize columns
        processedColumns.forEach(col => {
            col.cards = [];
            col.cardCount = 0;
            cardsByColumn[col.Id] = [];
        });
        
        // Group cards by column
        const cardsNotPlaced = [];
        
        cards.forEach(card => {
            const column = processedColumns.find(col => col.Id === card.columnId);
            if (column) {
                const enrichedCard = DataManager.enrichCard(card);
                column.cards.push(enrichedCard);
                column.cardCount++;
                cardsByColumn[column.Id] = column.cards;
            } else {
                cardsNotPlaced.push({
                    cardId: card.Id,
                    cardSubject: card.subject,
                    columnId: card.columnId
                });
            }
        });
        
        return { processedColumns, cardsByColumn };
    }
    
    /**
     * Enrich card with computed UI properties
     */
    static enrichCard(card) {
        return {
            ...card,
            priorityClass: DataManager.getPriorityClass(card.priority),
            assigneeInitials: DataManager.getInitials(card.assignee?.name),
            hasAssignee: !!card.assigneeId,
            formattedDueDate: card.dueDate ? DataManager.formatDate(card.dueDate) : null,
            isOverdue: card.dueDate ? new Date(card.dueDate) < new Date() : false,
            cardStyle: card.color ? `border-left: 4px solid ${card.color}` : ''
        };
    }
    
    /**
     * Get priority CSS class
     */
    static getPriorityClass(priority) {
        const priorityMap = {
            'High': 'priority-high',
            'Medium': 'priority-medium',
            'Low': 'priority-low'
        };
        return priorityMap[priority] || '';
    }
    
    /**
     * Get initials from name
     */
    static getInitials(name) {
        if (!name) return '';
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    /**
     * Format date for display
     */
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
}
