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

        // Track when card enters/leaves Done-category columns
        updateDoneDate(card, targetColumn);

        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Card__c>{ card }
            )
            .getRecords();

        // Auto-complete/un-complete sprint card based on column category
        autoUpdateSprintCompletion(cardId, targetColumn);

        // Query updated card to get new sequence number
        OpenSF__Card__c updatedCard = [
            SELECT OpenSF__SequenceNumber__c, LastModifiedDate
            FROM OpenSF__Card__c
            WHERE Id = :cardId
            WITH USER_MODE
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

        // Set DoneDate if card is created directly in a Done-category column
        updateDoneDate(card, column);

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
            // Convert loose map to typed request
            CardUpdateRequest req = CardUpdateRequest.fromMap(updates);

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
                    req.hasSubject &&
                    existingCard.OpenSF__Subject__c != req.subject
                ) {
                    conflictingFields.put(
                        'subject',
                        existingCard.OpenSF__Subject__c
                    );
                }
                if (
                    req.hasDescription &&
                    existingCard.OpenSF__Description__c != req.description
                ) {
                    conflictingFields.put(
                        'description',
                        existingCard.OpenSF__Description__c
                    );
                }
                if (
                    req.hasPriority &&
                    existingCard.OpenSF__Priority__c != req.priority
                ) {
                    conflictingFields.put(
                        'priority',
                        existingCard.OpenSF__Priority__c
                    );
                }
            }

            // Apply updates (server wins on conflict, but we flag it)
            OpenSF__Card__c card = new OpenSF__Card__c(Id = cardId);
            req.applyTo(card);

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
     * Create a backlog card (not assigned to any column).
     * New cards are placed at the top of the backlog.
     */
    public static KanbanBoardDTO.CardDTO createBacklogCard(
        Id boardId,
        String subject,
        String cardType,
        String priority,
        Decimal storyPoints
    ) {
        // Find the current first backlog card's position to insert before it
        List<OpenSF__Card__c> topCards = [
            SELECT OpenSF__LexoRankPosition__c
            FROM OpenSF__Card__c
            WHERE
                OpenSF__Board__c = :boardId
                AND OpenSF__Column__c = NULL
                AND OpenSF__LexoRankPosition__c != NULL
            WITH USER_MODE
            ORDER BY OpenSF__LexoRankPosition__c ASC
            LIMIT 1
        ];
        String firstPosition = topCards.isEmpty()
            ? null
            : topCards[0].OpenSF__LexoRankPosition__c;
        String newPosition = LexoRank.between(null, firstPosition);

        // Create card with board reference but no column (backlog card)
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = subject,
            OpenSF__Board__c = boardId,
            OpenSF__CardType__c = cardType,
            OpenSF__Priority__c = priority,
            OpenSF__StoryPoints__c = storyPoints,
            OpenSF__NeedsRefinement__c = false,
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LexoRankPosition__c = newPosition
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
     * Backfill LexoRankPosition for cards that have NULL positions.
     * Assigns positions after the last positioned card so existing
     * order is preserved. Updates are persisted to the database.
     *
     * Skips processing entirely when all cards already have positions
     * (the common case) to avoid unnecessary iteration and DML.
     */
    public static void backfillMissingPositions(List<OpenSF__Card__c> cards) {
        // Quick scan: bail out if no nulls exist
        Boolean hasNulls = false;
        for (OpenSF__Card__c card : cards) {
            if (card.OpenSF__LexoRankPosition__c == null) {
                hasNulls = true;
                break;
            }
        }
        if (!hasNulls) {
            return;
        }

        String lastPosition = null;
        List<OpenSF__Card__c> toUpdate = new List<OpenSF__Card__c>();

        for (OpenSF__Card__c card : cards) {
            if (card.OpenSF__LexoRankPosition__c != null) {
                lastPosition = card.OpenSF__LexoRankPosition__c;
            } else {
                String newPosition = LexoRank.between(lastPosition, null);
                card.OpenSF__LexoRankPosition__c = newPosition;
                toUpdate.add(
                    new OpenSF__Card__c(
                        Id = card.Id,
                        OpenSF__LexoRankPosition__c = newPosition
                    )
                );
                lastPosition = newPosition;
            }
        }

        if (!toUpdate.isEmpty()) {
            update Security.stripInaccessible(AccessType.UPDATABLE, toUpdate)
                .getRecords();
        }
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

    /**
     * Auto-update sprint completion when a card moves between column categories.
     *
     * The key insight: "Done" means development complete — that's when the
     * burndown should count the card. "Released" means deployed to production —
     * a logistics step that happens AFTER Done.
     *
     * Rules:
     *  - Moving TO a Done column → mark CompletedInSprint = true (burndown counts it)
     *  - Moving FROM Done TO Released → no change (card stays completed)
     *  - Moving FROM Done/Released BACK to To Do or In Progress → un-complete
     *    (card was pulled back into active work)
     *
     * This gives smooth, incremental burndown. Release batches don't create cliffs
     * because the burndown already counted the card when it hit Done.
     *
     * @param cardId The card that was moved
     * @param targetColumn The column the card was moved to
     */
    private static void autoUpdateSprintCompletion(
        Id cardId,
        OpenSF__Column__c targetColumn
    ) {
        String category = targetColumn.OpenSF__Category__c;
        Boolean isDoneCategory =
            category ==
            KanbanEnums.columnCategoryValue(KanbanEnums.ColumnCategory.DONE);
        Boolean isReleasedCategory =
            category ==
            KanbanEnums.columnCategoryValue(
                KanbanEnums.ColumnCategory.RELEASED
            );
        Boolean isActiveWork =
            category ==
            KanbanEnums.columnCategoryValue(KanbanEnums.ColumnCategory.TODO) ||
            category ==
            KanbanEnums.columnCategoryValue(
                KanbanEnums.ColumnCategory.IN_PROGRESS
            );

        // Find active sprint junction for this card
        List<OpenSF__SprintCard__c> junctions = [
            SELECT
                Id,
                OpenSF__CompletedInSprint__c,
                OpenSF__CompletedDate__c,
                OpenSF__Sprint__c,
                OpenSF__Sprint__r.OpenSF__Status__c
            FROM OpenSF__SprintCard__c
            WHERE
                OpenSF__Card__c = :cardId
                AND OpenSF__RemovedDate__c = NULL
                AND OpenSF__Sprint__r.OpenSF__Status__c = 'Active'
            WITH USER_MODE
            LIMIT 1
        ];

        if (junctions.isEmpty()) {
            return;
        }

        OpenSF__SprintCard__c junction = junctions[0];

        if (isDoneCategory && !junction.OpenSF__CompletedInSprint__c) {
            // Moving to Done — mark completed (burndown counts this)
            junction.OpenSF__CompletedInSprint__c = true;
            junction.OpenSF__CompletedDate__c = DateTime.now();
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__SprintCard__c>{ junction }
                )
                .getRecords();

            SprintService.recalculateSprintPointsPublic(
                junction.OpenSF__Sprint__c
            );
        } else if (isReleasedCategory) {
            // Moving to Released — card stays completed, no burndown change.
            // Released is post-Done. If the card wasn't already completed
            // (edge case: dragged straight to Released), complete it now.
            if (!junction.OpenSF__CompletedInSprint__c) {
                junction.OpenSF__CompletedInSprint__c = true;
                junction.OpenSF__CompletedDate__c = DateTime.now();
                update Security.stripInaccessible(
                        AccessType.UPDATABLE,
                        new List<OpenSF__SprintCard__c>{ junction }
                    )
                    .getRecords();

                SprintService.recalculateSprintPointsPublic(
                    junction.OpenSF__Sprint__c
                );
            }
        } else if (isActiveWork && junction.OpenSF__CompletedInSprint__c) {
            // Moving back to active work — un-complete (card was pulled back)
            junction.OpenSF__CompletedInSprint__c = false;
            junction.OpenSF__CompletedDate__c = null;
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__SprintCard__c>{ junction }
                )
                .getRecords();

            SprintService.recalculateSprintPointsPublic(
                junction.OpenSF__Sprint__c
            );
        }
        // If category is null or unrecognized, do nothing — don't break existing boards
    }

    /**
     * Set or clear DoneDate__c based on the target column's category.
     * - Moving TO a Done or Released column → stamp DoneDate if not already set
     * - Moving BACK to active work → clear DoneDate
     *
     * Works for all board types (Kanban and Sprint). The frontend uses
     * DoneDate + Board.DoneCardRetentionDays to auto-hide old done cards
     * on non-Sprint boards.
     *
     * @param card The card record being updated (fields are set in-place before DML)
     * @param targetColumn The column the card is moving to
     */
    private static void updateDoneDate(
        OpenSF__Card__c card,
        OpenSF__Column__c targetColumn
    ) {
        String category = targetColumn.OpenSF__Category__c;
        Boolean isDoneOrReleased =
            category ==
            KanbanEnums.columnCategoryValue(KanbanEnums.ColumnCategory.DONE) ||
            category ==
            KanbanEnums.columnCategoryValue(
                KanbanEnums.ColumnCategory.RELEASED
            );

        if (isDoneOrReleased) {
            card.OpenSF__DoneDate__c = DateTime.now();
        } else {
            card.OpenSF__DoneDate__c = null;
        }
    }
}
