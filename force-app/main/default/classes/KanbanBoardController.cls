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
     * Get backlog cards for a board (cards not assigned to any column)
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.CardDTO> getBacklogCards(Id boardId) {
        try {
            List<OpenSF__Card__c> cards = KanbanBoardSelector.getBacklogCardsByBoardId(
                boardId
            );
            KanbanCardService.backfillMissingPositions(cards);
            return KanbanBoardDTO.convertCards(cards);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading backlog cards: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new backlog card (not assigned to any column)
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardDTO createBacklogCard(
        Id boardId,
        String subject,
        String cardType,
        String priority,
        Decimal storyPoints
    ) {
        try {
            return KanbanCardService.createBacklogCard(
                boardId,
                subject,
                cardType,
                priority,
                storyPoints
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating backlog card: ' + e.getMessage()
            );
        }
    }

    /**
     * Reorder a backlog card by computing a new LexoRank position
     * between two neighboring cards.
     * @return The computed LexoRank position string
     */
    @AuraEnabled
    public static String reorderBacklogCard(
        Id cardId,
        String previousCardPosition,
        String nextCardPosition
    ) {
        try {
            String newPosition = LexoRank.between(
                previousCardPosition,
                nextCardPosition
            );
            OpenSF__Card__c card = new OpenSF__Card__c(
                Id = cardId,
                OpenSF__LexoRankPosition__c = newPosition
            );
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Card__c>{ card }
                )
                .getRecords();
            return newPosition;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error reordering backlog card: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // Sprint Management Methods
    // =========================================================================

    /**
     * Get sprint data for a board
     */
    @AuraEnabled
    public static SprintService.SprintBoardData getSprintData(Id boardId) {
        try {
            return SprintService.getSprintData(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading sprint data: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new sprint
     */
    @AuraEnabled
    public static KanbanBoardDTO.SprintDTO createSprint(
        Id boardId,
        String goal,
        Date startDate,
        Date endDate
    ) {
        try {
            return SprintService.createSprint(
                boardId,
                goal,
                startDate,
                endDate
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Start a sprint
     */
    @AuraEnabled
    public static KanbanBoardDTO.SprintDTO startSprint(Id sprintId) {
        try {
            return SprintService.startSprint(sprintId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error starting sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Complete a sprint with card dispositions
     */
    @AuraEnabled
    public static KanbanBoardDTO.SprintDTO completeSprint(
        Id sprintId,
        Map<Id, String> dispositions
    ) {
        try {
            return SprintService.completeSprint(sprintId, dispositions);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error completing sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Add cards to a sprint
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.SprintCardDTO> addCardsToSprint(
        Id sprintId,
        List<Id> cardIds
    ) {
        try {
            return SprintService.addCardsToSprint(sprintId, cardIds);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error adding cards to sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Remove a card from a sprint
     */
    @AuraEnabled
    public static void removeCardFromSprint(Id sprintId, Id cardId) {
        try {
            SprintService.removeCardFromSprint(sprintId, cardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error removing card from sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Get burndown data for a sprint
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.SprintSnapshotDTO> getBurndownData(
        Id sprintId
    ) {
        try {
            return SprintService.getBurndownData(sprintId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading burndown data: ' + e.getMessage()
            );
        }
    }

    /**
     * Get velocity data for a board
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.SprintDTO> getVelocityData(
        Id boardId,
        Integer count
    ) {
        try {
            return SprintService.getVelocityData(boardId, count);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading velocity data: ' + e.getMessage()
            );
        }
    }

    /**
     * Mark a card as completed in the sprint
     */
    @AuraEnabled
    public static void markCardCompletedInSprint(Id sprintId, Id cardId) {
        try {
            SprintService.markCardCompleted(sprintId, cardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error marking card complete: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // Analytics Methods
    // =========================================================================

    /**
     * Get cycle time analytics for a board
     */
    @AuraEnabled
    public static KanbanBoardDTO.CycleTimeResult getCycleTimeAnalytics(
        Id boardId,
        Integer daysBack
    ) {
        try {
            return AnalyticsService.getCycleTimeAnalytics(boardId, daysBack);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading cycle time analytics: ' + e.getMessage()
            );
        }
    }

    /**
     * Get cumulative flow data for a board
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.CumulativeFlowDataPoint> getCumulativeFlowData(
        Id boardId,
        Integer daysBack
    ) {
        try {
            return AnalyticsService.getCumulativeFlowData(boardId, daysBack);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading cumulative flow data: ' + e.getMessage()
            );
        }
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
        @AuraEnabled
        public Map<String, String> cardTypeIcons;
        @AuraEnabled
        public List<KanbanBoardDTO.CardCustomFieldDTO> customFieldConfigs;
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

    public class KanbanConfigResult {
        @AuraEnabled
        public Boolean showDebugInfo = false;
        @AuraEnabled
        public Boolean enableDevTools = false;
    }

    /**
     * Get runtime config from the KanbanConfig hierarchy custom setting
     */
    @AuraEnabled(cacheable=true)
    public static KanbanConfigResult getKanbanConfig() {
        return KanbanBoardService.getKanbanConfig();
    }
}
