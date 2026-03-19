/**
 * KanbanCardService - Service class for card business logic
 * Extracted from KanbanBoardController to separate concerns
 */
public with sharing class KanbanCardService {
    /**
     * Move card with conflict detection based on expected sequence number
     * Client sends the sequence number it expects the card to have
     * If different, a conflict occurred and server wins
     */
    public static KanbanBoardController.CardMoveResult moveCard(
        Id cardId,
        Id targetColumnId,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId,
        Decimal expectedSequenceNumber,
        String clientId
    ) {
        // Query full card data for conflict detection
        OpenSF__Card__c existingCard = KanbanBoardSelector.getCardById(cardId);

        // Detect conflicts
        Boolean hasConflict = false;
        String conflictReason = null;

        // Sequence number conflict detection
        if (
            expectedSequenceNumber != null &&
            existingCard.OpenSF__SequenceNumber__c != null &&
            expectedSequenceNumber != existingCard.OpenSF__SequenceNumber__c
        ) {
            hasConflict = true;
            conflictReason =
                'Card was modified by another user (expected seq: ' +
                expectedSequenceNumber +
                ', actual: ' +
                existingCard.OpenSF__SequenceNumber__c +
                ')';
        }

        // Position conflict detection (card moved by someone else)
        // Note: We still apply the move, but flag it as a conflict
        if (
            existingCard.OpenSF__Column__c != null &&
            targetColumnId != existingCard.OpenSF__Column__c
        ) {
            // Card is being moved to different column - this is expected
            // Only conflict if client thinks card is in different column than server
        }

        // Calculate new position using LexoRank
        String newPosition = LexoRank.between(
            previousCardPosition,
            nextCardPosition
        );

        // Query the target column to get its status
        OpenSF__Column__c targetColumn = KanbanBoardSelector.getColumnById(
            targetColumnId
        );

        // Update position, column, status (if needed), and lastClientRequestId
        // Sequence number will be auto-incremented by trigger
        OpenSF__Card__c card = new OpenSF__Card__c(
            Id = cardId,
            OpenSF__Column__c = targetColumnId,
            OpenSF__LexoRankPosition__c = newPosition,
            OpenSF__LastClientRequestId__c = clientRequestId,
            OpenSF__LastClientId__c = clientId
        );

        // Apply column status to card if applicable
        applyColumnStatusToCard(
            card,
            targetColumn,
            existingCard.OpenSF__Status__c
        );

        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Card__c>{ card }
            )
            .getRecords();

        // Query updated card to get new sequence number
        OpenSF__Card__c updatedCard = [
            SELECT OpenSF__SequenceNumber__c, LastModifiedDate
            FROM OpenSF__Card__c
            WHERE Id = :cardId
            LIMIT 1
        ];

        // Return result with conflict information
        KanbanBoardController.CardMoveResult result = new KanbanBoardController.CardMoveResult();
        result.success = true;
        result.newPosition = newPosition;
        result.cardId = cardId;
        result.columnId = targetColumnId;
        result.conflict = hasConflict;
        result.conflictReason = conflictReason;
        result.serverSequenceNumber = updatedCard.OpenSF__SequenceNumber__c;
        result.serverTimestamp = updatedCard.LastModifiedDate;
        result.clientId = clientId;

        return result;
    }

    /**
     * Create card in column
     */
    public static KanbanBoardDTO.CardDTO createCard(
        Id columnId,
        String subject,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId,
        String clientId
    ) {
        // Calculate position
        String position = LexoRank.between(
            previousCardPosition,
            nextCardPosition
        );

        // Get the column to apply its status
        OpenSF__Column__c column = KanbanBoardSelector.getColumnById(columnId);

        // Create card with initial sequence number and clientId
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = subject,
            OpenSF__Column__c = columnId,
            OpenSF__Board__c = column.OpenSF__Board__c,
            OpenSF__LexoRankPosition__c = position,
            OpenSF__LastClientRequestId__c = clientRequestId,
            OpenSF__LastClientId__c = clientId,
            OpenSF__SequenceNumber__c = 1
        );

        // Apply column status to new card (currentStatus is null for new cards)
        applyColumnStatusToCard(card, column, null);

        List<OpenSF__Card__c> strippedCards = (List<OpenSF__Card__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__Card__c>{ card }
            )
            .getRecords();
        insert strippedCards;
        card.Id = strippedCards[0].Id;

        // Event published by trigger

        // Return full card data as DTO
        OpenSF__Card__c createdCard = KanbanBoardSelector.getCardById(card.Id);
        return new KanbanBoardDTO.CardDTO(createdCard);
    }

    /**
     * Update card with conflict detection
     * Client can send expected sequence number to detect concurrent modifications
     */
    public static KanbanBoardController.CardUpdateResult updateCard(
        Id cardId,
        Map<String, Object> updates,
        Decimal expectedSequenceNumber,
        String clientId
    ) {
        try {
            // Query existing card for conflict detection
            OpenSF__Card__c existingCard = KanbanBoardSelector.getCardById(
                cardId
            );

            // Detect conflicts
            Boolean hasConflict = false;
            String conflictReason = null;
            Map<String, Object> conflictingFields = new Map<String, Object>();

            // Sequence number conflict
            if (
                expectedSequenceNumber != null &&
                existingCard.OpenSF__SequenceNumber__c != null &&
                expectedSequenceNumber != existingCard.OpenSF__SequenceNumber__c
            ) {
                hasConflict = true;
                conflictReason = 'Card was modified by another user';

                // Capture current server state for each field being updated
                if (
                    updates.containsKey('subject') &&
                    existingCard.OpenSF__Subject__c !=
                    (String) updates.get('subject')
                ) {
                    conflictingFields.put(
                        'subject',
                        existingCard.OpenSF__Subject__c
                    );
                }
                if (
                    updates.containsKey('description') &&
                    existingCard.OpenSF__Description__c !=
                    (String) updates.get('description')
                ) {
                    conflictingFields.put(
                        'description',
                        existingCard.OpenSF__Description__c
                    );
                }
                if (
                    updates.containsKey('priority') &&
                    existingCard.OpenSF__Priority__c !=
                    (String) updates.get('priority')
                ) {
                    conflictingFields.put(
                        'priority',
                        existingCard.OpenSF__Priority__c
                    );
                }
            }

            // Apply updates (server wins on conflict, but we flag it)
            OpenSF__Card__c card = new OpenSF__Card__c(Id = cardId);

            if (updates.containsKey('subject')) {
                card.OpenSF__Subject__c = (String) updates.get('subject');
            }
            if (updates.containsKey('description')) {
                card.OpenSF__Description__c = (String) updates.get(
                    'description'
                );
            }
            if (updates.containsKey('priority')) {
                card.OpenSF__Priority__c = (String) updates.get('priority');
            }
            if (updates.containsKey('color')) {
                card.OpenSF__Color__c = (String) updates.get('color');
            }
            if (updates.containsKey('dueDate')) {
                card.OpenSF__DueDate__c = Date.valueOf(
                    (String) updates.get('dueDate')
                );
            }
            if (updates.containsKey('storyPoints')) {
                card.OpenSF__StoryPoints__c = (Decimal) updates.get(
                    'storyPoints'
                );
            }
            if (updates.containsKey('assigneeId')) {
                card.OpenSF__Assignee__c = (Id) updates.get('assigneeId');
            }
            if (updates.containsKey('needsRefinement')) {
                card.OpenSF__NeedsRefinement__c = (Boolean) updates.get(
                    'needsRefinement'
                );
            }

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Card__c>{ card }
                )
                .getRecords();

            // Query updated card
            OpenSF__Card__c updatedCard = KanbanBoardSelector.getCardById(
                cardId
            );

            // Return result with conflict information
            KanbanBoardController.CardUpdateResult result = new KanbanBoardController.CardUpdateResult();
            result.success = true;
            result.card = new KanbanBoardDTO.CardDTO(updatedCard);
            result.conflict = hasConflict;
            result.conflictReason = conflictReason;
            result.serverSequenceNumber = updatedCard.OpenSF__SequenceNumber__c;
            result.serverTimestamp = updatedCard.LastModifiedDate;
            result.serverState = conflictingFields;
            result.clientId = clientId;

            return result;
        } catch (Exception e) {
            KanbanBoardController.CardUpdateResult result = new KanbanBoardController.CardUpdateResult();
            result.success = false;
            result.conflictReason = e.getMessage();
            return result;
        }
    }

    /**
     * Create a backlog card (not assigned to any column)
     */
    public static KanbanBoardDTO.CardDTO createBacklogCard(
        Id boardId,
        String subject,
        String cardType,
        String priority,
        Decimal storyPoints
    ) {
        // Create card with board reference but no column (backlog card)
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = subject,
            OpenSF__Board__c = boardId,
            OpenSF__CardType__c = cardType,
            OpenSF__Priority__c = priority,
            OpenSF__StoryPoints__c = storyPoints,
            OpenSF__NeedsRefinement__c = true,
            OpenSF__SequenceNumber__c = 1
        );

        List<OpenSF__Card__c> strippedCards = (List<OpenSF__Card__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__Card__c>{ card }
            )
            .getRecords();
        insert strippedCards;
        card.Id = strippedCards[0].Id;

        // Return full card data as DTO
        OpenSF__Card__c createdCard = KanbanBoardSelector.getCardById(card.Id);
        return new KanbanBoardDTO.CardDTO(createdCard);
    }

    /**
     * Delete card
     */
    public static void deleteCard(Id cardId) {
        if (!Schema.sObjectType.OpenSF__Card__c.isDeletable()) {
            throw new AuraHandledException(
                'Insufficient access to delete cards.'
            );
        }
        delete new OpenSF__Card__c(Id = cardId);
        // Event published by trigger
    }

    /**
     * Apply column status to a card if the column has a status
     * This is used when creating or moving cards to ensure they inherit the column's status
     *
     * @param card The card record to update (must have Id set for moves, not for creates)
     * @param column The target column
     * @param currentStatus The card's current status (null for new cards)
     * @return Boolean indicating if the status was applied
     */
    private static Boolean applyColumnStatusToCard(
        OpenSF__Card__c card,
        OpenSF__Column__c column,
        String currentStatus
    ) {
        // Only apply if column has a status and it's different from current status
        if (
            column.OpenSF__Status__c != null &&
            column.OpenSF__Status__c != currentStatus
        ) {
            card.OpenSF__Status__c = column.OpenSF__Status__c;
            return true;
        }
        return false;
    }
}
