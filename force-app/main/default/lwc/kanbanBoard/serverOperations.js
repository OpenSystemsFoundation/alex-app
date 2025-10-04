/**
 * Server Operations Manager
 * Handles all server-side operations (CRUD for cards)
 */

import moveCard from '@salesforce/apex/KanbanBoardController.moveCard';
import createCard from '@salesforce/apex/KanbanBoardController.createCard';

export default class ServerOperations {
    /**
     * Move card to target column with position calculation
     */
    static async moveCard(cardId, targetColumnId, targetPosition, columns) {
        const targetColumn = columns.find((col) => col.Id === targetColumnId);

        if (!targetColumn) {
            throw new Error('Target column not found');
        }

        const cards = targetColumn.cards || [];

        let previousPosition = null;
        let nextPosition = null;

        if (targetPosition !== null) {
            if (targetPosition > 0 && cards[targetPosition - 1]) {
                previousPosition = cards[targetPosition - 1].position;
            }
            if (targetPosition < cards.length && cards[targetPosition]) {
                nextPosition = cards[targetPosition].position;
            }
        } else {
            if (cards.length > 0) {
                previousPosition = cards[cards.length - 1].position;
            }
        }

        const result = await moveCard({
            cardId: cardId,
            targetColumnId: targetColumnId,
            previousCardPosition: previousPosition,
            nextCardPosition: nextPosition
        });

        return result;
    }

    /**
     * Create new card in column
     */
    static async createCard(columnId, subject, columns) {
        const column = columns.find((col) => col.Id === columnId);

        if (!column) {
            throw new Error('Column not found');
        }

        const cards = column.cards || [];

        let previousPosition = null;
        if (cards.length > 0) {
            previousPosition = cards[cards.length - 1].position;
        }

        const newCard = await createCard({
            columnId: columnId,
            subject: subject || 'New Card',
            previousCardPosition: previousPosition,
            nextCardPosition: null
        });

        return newCard;
    }

    /**
     * Calculate position for card insertion
     */
    static calculatePosition(targetPosition, cards) {
        let previousPosition = null;
        let nextPosition = null;

        if (targetPosition !== null && cards) {
            if (targetPosition > 0 && cards[targetPosition - 1]) {
                previousPosition = cards[targetPosition - 1].position;
            }
            if (targetPosition < cards.length && cards[targetPosition]) {
                nextPosition = cards[targetPosition].position;
            }
        } else if (cards && cards.length > 0) {
            previousPosition = cards[cards.length - 1].position;
        }

        return { previousPosition, nextPosition };
    }
}
