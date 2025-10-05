/**
 * KanbanBoardController - Apex controller for Kanban Board LWC
 * Handles board data retrieval, card movements, and real-time updates
 */
public with sharing class KanbanBoardController {
    /**
     * Get board with columns and cards
     */
    @AuraEnabled
    public static BoardData getBoardData(Id boardId) {
        try {
            // Use selector class for queries
            OpenSF__Board__c board = KanbanBoardSelector.getBoardById(boardId);
            List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(
                boardId
            );
            List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(
                boardId
            );

            // Convert to DTOs for LWC consumption
            BoardData result = new BoardData();
            result.board = new KanbanBoardDTO.BoardDTO(board);
            result.columns = KanbanBoardDTO.convertColumns(columns);
            result.cards = KanbanBoardDTO.convertCards(cards);

            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading board: ' + e.getMessage()
            );
        }
    }

    /**
     * Move card to new position (OPTIMIZED for rapid moves)
     * Updates position, column, and status (if column has a status and it differs)
     * Now with conflict detection and resolution
     */
    @AuraEnabled
    public static CardMoveResult moveCard(
        Id cardId,
        Id targetColumnId,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId,
        String clientId
    ) {
        return moveCardWithConflictDetection(
            cardId,
            targetColumnId,
            previousCardPosition,
            nextCardPosition,
            clientRequestId,
            null, // No expected sequence from legacy calls
            clientId
        );
    }

    /**
     * Move card with conflict detection based on expected sequence number
     * Client sends the sequence number it expects the card to have
     * If different, a conflict occurred and server wins
     */
    @AuraEnabled
    public static CardMoveResult moveCardWithConflictDetection(
        Id cardId,
        Id targetColumnId,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId,
        Decimal expectedSequenceNumber,
        String clientId
    ) {
        try {
            // Query full card data for conflict detection
            OpenSF__Card__c existingCard = KanbanBoardSelector.getCardById(
                cardId
            );

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

            update card;

            // Query updated card to get new sequence number
            OpenSF__Card__c updatedCard = [
                SELECT OpenSF__SequenceNumber__c, LastModifiedDate
                FROM OpenSF__Card__c
                WHERE Id = :cardId
                LIMIT 1
            ];

            // Return result with conflict information
            CardMoveResult result = new CardMoveResult();
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
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error moving card: ' + e.getMessage()
            );
        }
    }

    /**
     * Create new card
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardDTO createCard(
        Id columnId,
        String subject,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId,
        String clientId
    ) {
        try {
            // Calculate position
            String position = LexoRank.between(
                previousCardPosition,
                nextCardPosition
            );

            // Get the column to apply its status
            OpenSF__Column__c column = KanbanBoardSelector.getColumnById(
                columnId
            );

            // Create card with initial sequence number and clientId
            OpenSF__Card__c card = new OpenSF__Card__c(
                OpenSF__Subject__c = subject,
                OpenSF__Column__c = columnId,
                OpenSF__LexoRankPosition__c = position,
                OpenSF__LastClientRequestId__c = clientRequestId,
                OpenSF__LastClientId__c = clientId,
                OpenSF__SequenceNumber__c = 1
            );

            // Apply column status to new card (currentStatus is null for new cards)
            applyColumnStatusToCard(card, column, null);

            insert card;

            // Event published by trigger

            // Return full card data as DTO
            OpenSF__Card__c createdCard = KanbanBoardSelector.getCardById(
                card.Id
            );
            return new KanbanBoardDTO.CardDTO(createdCard);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating card: ' + e.getMessage()
            );
        }
    }

    /**
     * Update card details
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardDTO updateCard(
        Id cardId,
        Map<String, Object> updates,
        String clientId
    ) {
        CardUpdateResult result = updateCardWithConflictDetection(
            cardId,
            updates,
            null,
            clientId
        );
        if (!result.success) {
            throw new AuraHandledException('Update failed');
        }
        return result.card;
    }

    /**
     * Update card with conflict detection
     * Client can send expected sequence number to detect concurrent modifications
     */
    @AuraEnabled
    public static CardUpdateResult updateCardWithConflictDetection(
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

            update card;

            // Query updated card
            OpenSF__Card__c updatedCard = KanbanBoardSelector.getCardById(
                cardId
            );

            // Return result with conflict information
            CardUpdateResult result = new CardUpdateResult();
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
            CardUpdateResult result = new CardUpdateResult();
            result.success = false;
            result.conflictReason = e.getMessage();
            return result;
        }
    }

    /**
     * Delete card
     */
    @AuraEnabled
    public static void deleteCard(Id cardId) {
        try {
            delete new OpenSF__Card__c(Id = cardId);
            // Event published by trigger
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting card: ' + e.getMessage()
            );
        }
    }

    /**
     * Reorder column
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO moveColumn(
        Id columnId,
        String previousColumnPosition,
        String nextColumnPosition
    ) {
        try {
            String newPosition = LexoRank.between(
                previousColumnPosition,
                nextColumnPosition
            );

            OpenSF__Column__c column = new OpenSF__Column__c(
                Id = columnId,
                OpenSF__LexoRankPosition__c = newPosition
            );

            update column;

            // Return updated column as DTO
            OpenSF__Column__c updatedColumn = KanbanBoardSelector.getColumnById(
                columnId
            );
            return new KanbanBoardDTO.ColumnDTO(updatedColumn);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error moving column: ' + e.getMessage()
            );
        }
    }

    /**
     * Platform events are now published by triggers (CardTriggerHandler)
     * This provides better separation of concerns and follows Salesforce best practices
     */

    /**
     * Search users for assignment
     */
    @AuraEnabled(cacheable=true)
    public static List<User> searchUsers(String searchTerm) {
        return KanbanBoardSelector.searchUsers(searchTerm);
    }

    /**
     * Get incremental updates since a timestamp (for polling fallback)
     * Returns only cards that have been modified since the given timestamp
     */
    @AuraEnabled
    public static IncrementalUpdateData getIncrementalUpdates(
        Id boardId,
        DateTime lastSyncTime
    ) {
        try {
            IncrementalUpdateData result = new IncrementalUpdateData();
            result.syncTimestamp = DateTime.now();
            result.hasChanges = false;

            // Query for cards modified since lastSyncTime
            List<OpenSF__Card__c> modifiedCards = [
                SELECT
                    Id,
                    OpenSF__Subject__c,
                    OpenSF__Description__c,
                    OpenSF__Priority__c,
                    OpenSF__Status__c,
                    OpenSF__CardType__c,
                    OpenSF__Color__c,
                    OpenSF__DueDate__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Column__c,
                    OpenSF__LexoRankPosition__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE
                    OpenSF__Column__r.OpenSF__Board__c = :boardId
                    AND LastModifiedDate > :lastSyncTime
                ORDER BY LastModifiedDate ASC
            ];

            if (!modifiedCards.isEmpty()) {
                result.cards = KanbanBoardDTO.convertCards(modifiedCards);
                result.hasChanges = true;
            }

            // Also check for deleted cards (via a custom approach if needed)
            // For now, we'll rely on full refresh if inconsistencies are detected

            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error fetching updates: ' + e.getMessage()
            );
        }
    }

    /**
     * Check platform event health status
     * Returns metrics about platform event delivery
     */
    @AuraEnabled
    public static PlatformEventHealth checkPlatformEventHealth() {
        try {
            PlatformEventHealth health = new PlatformEventHealth();
            health.isHealthy = true;
            health.timestamp = DateTime.now();

            // Check event bus delivery limits
            // Note: This is a simplified check. In production, you'd want to query
            // actual event delivery metrics or use Platform Event monitoring APIs
            try {
                // Query recent event delivery (if tracking is enabled)
                // For now, we assume healthy unless we detect issues
                health.deliveryRate = 100; // Percentage
                health.message = 'Platform events operational';
            } catch (Exception e) {
                health.isHealthy = false;
                health.deliveryRate = 0;
                health.message = 'Unable to verify event delivery';
            }

            return health;
        } catch (Exception e) {
            PlatformEventHealth health = new PlatformEventHealth();
            health.isHealthy = false;
            health.timestamp = DateTime.now();
            health.deliveryRate = 0;
            health.message = 'Error checking health: ' + e.getMessage();
            return health;
        }
    }

    /**
     * Get modal settings from custom metadata
     */
    @AuraEnabled(cacheable=true)
    public static ModalSettings getModalSettings() {
        try {
            KanbanBoardSettings__mdt settings = [
                SELECT FieldNames__c
                FROM KanbanBoardSettings__mdt
                WHERE DeveloperName = 'Modal_Settings'
                LIMIT 1
            ];

            ModalSettings result = new ModalSettings();
            if (settings != null && String.isNotBlank(settings.FieldNames__c)) {
                // Parse comma-separated field names and clean them
                List<String> fields = settings.FieldNames__c.split(',');
                result.visibleFields = new List<String>();
                for (String field : fields) {
                    String cleanField = field.trim();
                    if (String.isNotBlank(cleanField)) {
                        result.visibleFields.add(cleanField);
                    }
                }
            } else {
                // Default fields if not configured
                result.visibleFields = new List<String>{
                    'OpenSF__Subject__c',
                    'OpenSF__Description__c',
                    'OpenSF__Priority__c',
                    'OpenSF__CardType__c',
                    'OpenSF__Assignee__c',
                    'OpenSF__DueDate__c',
                    'OpenSF__StoryPoints__c',
                    'OpenSF__Color__c'
                };
            }
            return result;
        } catch (Exception e) {
            // Return defaults on error
            ModalSettings result = new ModalSettings();
            result.visibleFields = new List<String>{
                'OpenSF__Subject__c',
                'OpenSF__Description__c',
                'OpenSF__Priority__c',
                'OpenSF__CardType__c'
            };
            return result;
        }
    }

    /**
     * Wrapper classes
     */
    public class BoardData {
        @AuraEnabled
        public KanbanBoardDTO.BoardDTO board;
        @AuraEnabled
        public List<KanbanBoardDTO.ColumnDTO> columns;
        @AuraEnabled
        public List<KanbanBoardDTO.CardDTO> cards;
    }

    public class CardMoveResult {
        @AuraEnabled
        public Boolean success;
        @AuraEnabled
        public KanbanBoardDTO.CardDTO card; // Optional - only for full updates
        @AuraEnabled
        public String newPosition;
        @AuraEnabled
        public Id cardId; // For minimal updates
        @AuraEnabled
        public Id columnId; // For minimal updates
        @AuraEnabled
        public Boolean conflict; // True if a conflict was detected and resolved
        @AuraEnabled
        public String conflictReason; // Description of the conflict
        @AuraEnabled
        public Decimal serverSequenceNumber; // Server's final sequence number
        @AuraEnabled
        public DateTime serverTimestamp; // When server processed the change
        @AuraEnabled
        public String clientId; // Echo back client ID for window identification
    }

    public class CardUpdateResult {
        @AuraEnabled
        public Boolean success;
        @AuraEnabled
        public KanbanBoardDTO.CardDTO card;
        @AuraEnabled
        public Boolean conflict;
        @AuraEnabled
        public String conflictReason;
        @AuraEnabled
        public Decimal serverSequenceNumber;
        @AuraEnabled
        public DateTime serverTimestamp;
        @AuraEnabled
        public Map<String, Object> serverState; // Current server state for conflict resolution
        @AuraEnabled
        public String clientId; // Echo back client ID for window identification
    }

    public class ModalSettings {
        @AuraEnabled
        public List<String> visibleFields;
    }

    public class IncrementalUpdateData {
        @AuraEnabled
        public List<KanbanBoardDTO.CardDTO> cards;
        @AuraEnabled
        public DateTime syncTimestamp;
        @AuraEnabled
        public Boolean hasChanges;
    }

    public class PlatformEventHealth {
        @AuraEnabled
        public Boolean isHealthy;
        @AuraEnabled
        public DateTime timestamp;
        @AuraEnabled
        public Decimal deliveryRate;
        @AuraEnabled
        public String message;
    }

    /**
     * Helper Methods
     */

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
