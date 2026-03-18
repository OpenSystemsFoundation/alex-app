/**
 * KanbanBoardController - Thin facade for Kanban Board LWC
 * Delegates business logic to KanbanCardService and KanbanBoardService
 */
public with sharing class KanbanBoardController {
    /**
     * Get board with columns and cards
     */
    @AuraEnabled
    public static BoardData getBoardData(Id boardId) {
        return KanbanBoardService.getBoardData(boardId);
    }

    /**
     * Move card to new position (legacy signature without conflict detection)
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
        try {
            return KanbanCardService.moveCard(
                cardId,
                targetColumnId,
                previousCardPosition,
                nextCardPosition,
                clientRequestId,
                null,
                clientId
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error moving card: ' + e.getMessage()
            );
        }
    }

    /**
     * Move card with conflict detection based on expected sequence number
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
            return KanbanCardService.moveCard(
                cardId,
                targetColumnId,
                previousCardPosition,
                nextCardPosition,
                clientRequestId,
                expectedSequenceNumber,
                clientId
            );
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
            return KanbanCardService.createCard(
                columnId,
                subject,
                previousCardPosition,
                nextCardPosition,
                clientRequestId,
                clientId
            );
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
        CardUpdateResult result = KanbanCardService.updateCard(
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
     */
    @AuraEnabled
    public static CardUpdateResult updateCardWithConflictDetection(
        Id cardId,
        Map<String, Object> updates,
        Decimal expectedSequenceNumber,
        String clientId
    ) {
        return KanbanCardService.updateCard(
            cardId,
            updates,
            expectedSequenceNumber,
            clientId
        );
    }

    /**
     * Delete card
     */
    @AuraEnabled
    public static void deleteCard(Id cardId) {
        try {
            KanbanCardService.deleteCard(cardId);
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
        return KanbanBoardService.moveColumn(
            columnId,
            previousColumnPosition,
            nextColumnPosition
        );
    }

    /**
     * Search users for assignment
     */
    @AuraEnabled(cacheable=true)
    public static List<User> searchUsers(String searchTerm) {
        return KanbanBoardSelector.searchUsers(searchTerm);
    }

    /**
     * Get incremental updates since a timestamp (for polling fallback)
     */
    @AuraEnabled
    public static IncrementalUpdateData getIncrementalUpdates(
        Id boardId,
        DateTime lastSyncTime
    ) {
        return KanbanBoardService.getIncrementalUpdates(boardId, lastSyncTime);
    }

    /**
     * Check platform event health status
     */
    @AuraEnabled
    public static PlatformEventHealth checkPlatformEventHealth() {
        return KanbanBoardService.checkPlatformEventHealth();
    }

    /**
     * Get modal settings from custom metadata
     */
    @AuraEnabled(cacheable=true)
    public static ModalSettings getModalSettings() {
        return KanbanBoardService.getModalSettings();
    }

    /**
     * Wrapper classes (kept here since they're @AuraEnabled)
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
        public KanbanBoardDTO.CardDTO card;
        @AuraEnabled
        public String newPosition;
        @AuraEnabled
        public Id cardId;
        @AuraEnabled
        public Id columnId;
        @AuraEnabled
        public Boolean conflict;
        @AuraEnabled
        public String conflictReason;
        @AuraEnabled
        public Decimal serverSequenceNumber;
        @AuraEnabled
        public DateTime serverTimestamp;
        @AuraEnabled
        public String clientId;
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
        public Map<String, Object> serverState;
        @AuraEnabled
        public String clientId;
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
}
