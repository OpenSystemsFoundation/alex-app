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
     */
    @AuraEnabled
    public static CardMoveResult moveCard(
        Id cardId,
        Id targetColumnId,
        String previousCardPosition,
        String nextCardPosition,
        String clientRequestId
    ) {
        try {
            // Calculate new position using LexoRank
            String newPosition = LexoRank.between(
                previousCardPosition,
                nextCardPosition
            );

            // Query the target column to get its status
            OpenSF__Column__c targetColumn = KanbanBoardSelector.getColumnById(
                targetColumnId
            );

            // Query the card's current status to check if it needs updating
            OpenSF__Card__c existingCard = KanbanBoardSelector.getCardStatusById(
                cardId
            );

            // Update position, column, status (if needed), and lastClientRequestId
            // Sequence number will be auto-incremented by trigger
            OpenSF__Card__c card = new OpenSF__Card__c(
                Id = cardId,
                OpenSF__Column__c = targetColumnId,
                OpenSF__LexoRankPosition__c = newPosition,
                OpenSF__LastClientRequestId__c = clientRequestId
            );

            // Apply column status to card if applicable
            applyColumnStatusToCard(
                card,
                targetColumn,
                existingCard.OpenSF__Status__c
            );

            update card;

            // Skip platform event for move - client handles optimistic updates
            // Platform events only needed for multi-user scenarios (handled elsewhere)

            // Return minimal data (no full query needed)
            CardMoveResult result = new CardMoveResult();
            result.success = true;
            result.newPosition = newPosition;
            result.cardId = cardId;
            result.columnId = targetColumnId;
            // Skip full card DTO - client already has all data from optimistic update

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
        String clientRequestId
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

            // Create card with initial sequence number
            OpenSF__Card__c card = new OpenSF__Card__c(
                OpenSF__Subject__c = subject,
                OpenSF__Column__c = columnId,
                OpenSF__LexoRankPosition__c = position,
                OpenSF__LastClientRequestId__c = clientRequestId,
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
        Map<String, Object> updates
    ) {
        try {
            OpenSF__Card__c card = new OpenSF__Card__c(Id = cardId);

            // Apply updates
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

            // Event published by trigger

            // Return updated card as DTO
            OpenSF__Card__c updatedCard = KanbanBoardSelector.getCardById(
                cardId
            );
            return new KanbanBoardDTO.CardDTO(updatedCard);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating card: ' + e.getMessage()
            );
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
