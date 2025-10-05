import moveCard from '@salesforce/apex/KanbanBoardController.moveCard';
import createCard from '@salesforce/apex/KanbanBoardController.createCard';

export default class ServerOperations {
    static async moveCard(
        cardId,
        targetColumnId,
        targetPosition,
        columns,
        requestId = null
    ) {
        const targetColumn = columns.find((col) => col.Id === targetColumnId);

        if (!targetColumn) {
            throw new Error('Target column not found');
        }

        const allCards = targetColumn.cards || [];
        const currentIndex = allCards.findIndex((c) => c.Id === cardId);
        const cardsWithoutDragged = allCards.filter((c) => c.Id !== cardId);

        let previousPosition = null;
        let nextPosition = null;

        if (targetPosition !== null && targetPosition !== undefined) {
            if (targetPosition > 0 && cardsWithoutDragged[targetPosition - 1]) {
                previousPosition =
                    cardsWithoutDragged[targetPosition - 1].position;
            }

            if (
                targetPosition < cardsWithoutDragged.length &&
                cardsWithoutDragged[targetPosition]
            ) {
                nextPosition = cardsWithoutDragged[targetPosition].position;
            }
        } else {
            if (cardsWithoutDragged.length > 0) {
                previousPosition =
                    cardsWithoutDragged[cardsWithoutDragged.length - 1]
                        .position;
            }
        }

        const params = {
            cardId: cardId,
            targetColumnId: targetColumnId,
            previousCardPosition: previousPosition,
            nextCardPosition: nextPosition
        };

        if (requestId) {
            params.clientRequestId = requestId;
        }

        const result = await moveCard(params);
        return result;
    }

    static async createCard(columnId, subject, columns, requestId = null) {
        const column = columns.find((col) => col.Id === columnId);

        if (!column) {
            throw new Error('Column not found');
        }

        const cards = column.cards || [];

        let previousPosition = null;
        if (cards.length > 0) {
            previousPosition = cards[cards.length - 1].position;
        }

        const params = {
            columnId: columnId,
            subject: subject || 'New Card',
            previousCardPosition: previousPosition,
            nextCardPosition: null
        };

        if (requestId) {
            params.clientRequestId = requestId;
        }

        const newCard = await createCard(params);
        return newCard;
    }

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
