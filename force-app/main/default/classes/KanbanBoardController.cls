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
    // Epic Management Methods
    // =========================================================================

    /**
     * Get epic summaries with progress data for a board
     */
    @AuraEnabled(cacheable=true)
    public static List<KanbanBoardDTO.EpicSummaryDTO> getEpicSummaries(
        Id boardId
    ) {
        try {
            return EpicService.getEpicSummaries(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading epic summaries: ' + e.getMessage()
            );
        }
    }

    /**
     * Get detailed epic data with child cards list
     */
    @AuraEnabled(cacheable=true)
    public static KanbanBoardDTO.EpicSummaryDTO getEpicDetail(Id epicId) {
        try {
            return EpicService.getEpicDetail(epicId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading epic detail: ' + e.getMessage()
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

    /**
     * Delete a sprint (Planning status only)
     */
    @AuraEnabled
    public static void deleteSprint(Id sprintId) {
        try {
            SprintService.deleteSprint(sprintId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting sprint: ' + e.getMessage()
            );
        }
    }

    /**
     * Reorder a sprint (move up or down)
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.SprintDTO> reorderSprint(
        Id sprintId,
        String direction
    ) {
        try {
            return SprintService.reorderSprint(sprintId, direction);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error reordering sprint: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // Card Comment Methods
    // =========================================================================

    /**
     * Get comments for a card
     */
    @AuraEnabled(cacheable=true)
    public static List<KanbanBoardDTO.CardCommentDTO> getCardComments(
        Id cardId
    ) {
        try {
            return CardCommentService.getComments(cardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading comments: ' + e.getMessage()
            );
        }
    }

    /**
     * Add a comment to a card
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardCommentDTO addCardComment(
        Id cardId,
        String body
    ) {
        try {
            return CardCommentService.addComment(cardId, body);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error adding comment: ' + e.getMessage()
            );
        }
    }

    /**
     * Update a comment
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardCommentDTO updateCardComment(
        Id commentId,
        String body
    ) {
        try {
            return CardCommentService.updateComment(commentId, body);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating comment: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a comment
     */
    @AuraEnabled
    public static void deleteCardComment(Id commentId) {
        try {
            CardCommentService.deleteComment(commentId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting comment: ' + e.getMessage()
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
     * Get runtime config for developer features.
     */
    @AuraEnabled(cacheable=true)
    public static KanbanConfigResult getKanbanConfig() {
        return KanbanBoardService.getKanbanConfig();
    }

    // =========================================================================
    // Card File Methods
    // =========================================================================

    /**
     * Get files attached to a card.
     *
     * Note: `ContentDocumentLink` doesn't support WITH USER_MODE /
     * WITH SECURITY_ENFORCED because the object uses its own sharing
     * rules (share to the linked entity). Access is enforced implicitly
     * by the `LinkedEntityId = :cardId` filter — users only see links
     * for cards they can access. We additionally verify the caller has
     * read access to the card via `KanbanBoardSelector.getCardById`,
     * which runs WITH USER_MODE and will throw QueryException if the
     * card is inaccessible.
     */
    @AuraEnabled
    public static List<CardFileDTO> getCardFiles(Id cardId) {
        try {
            // Authorization: require read access to the parent card.
            // getCardById runs WITH USER_MODE and throws if inaccessible.
            KanbanBoardSelector.getCardById(cardId);

            List<CardFileDTO> result = new List<CardFileDTO>();
            for (ContentDocumentLink cdl : [
                SELECT
                    ContentDocumentId,
                    ContentDocument.Title,
                    ContentDocument.FileExtension,
                    ContentDocument.ContentSize,
                    ContentDocument.LatestPublishedVersionId
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :cardId
                ORDER BY ContentDocument.CreatedDate DESC
            ]) {
                result.add(new CardFileDTO(cdl));
            }
            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading files: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a file attached to a card.
     *
     * Authorization model:
     *   1. The caller must have a ContentDocumentLink to this document
     *      via a Card record they can access (enforces record-level
     *      sharing — users can't delete files on cards they can't see).
     *   2. The caller must have delete permission on ContentDocument
     *      (enforced by Database.delete with USER_MODE).
     *
     * Without these checks, any authenticated user could delete any
     * ContentDocument in the org by guessing/enumerating its Id.
     */
    @AuraEnabled
    public static void deleteCardFile(Id contentDocumentId, Id cardId) {
        try {
            if (contentDocumentId == null || cardId == null) {
                throw new AuraHandledException(
                    'Both contentDocumentId and cardId are required.'
                );
            }

            // Authorization: verify the document is linked to a Card
            // the caller can access. ContentDocumentLink sharing mirrors
            // LinkedEntityId access, so this confirms the caller has
            // read access to the parent card.
            List<ContentDocumentLink> links = [
                SELECT Id
                FROM ContentDocumentLink
                WHERE
                    ContentDocumentId = :contentDocumentId
                    AND LinkedEntityId = :cardId
                LIMIT 1
            ];
            if (links.isEmpty()) {
                throw new AuraHandledException(
                    'File not found or access denied.'
                );
            }

            // Additionally confirm the caller has read access to the
            // parent card via a WITH USER_MODE query.
            KanbanBoardSelector.getCardById(cardId);

            // Enforce delete permission on ContentDocument.
            List<ContentDocument> docs = [
                SELECT Id
                FROM ContentDocument
                WHERE Id = :contentDocumentId
                WITH USER_MODE
                LIMIT 1
            ];
            if (docs.isEmpty()) {
                throw new AuraHandledException(
                    'File not found or access denied.'
                );
            }
            Database.delete(docs, AccessLevel.USER_MODE);
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting file: ' + e.getMessage()
            );
        }
    }

    public class CardFileDTO {
        @AuraEnabled public String contentDocumentId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public Integer contentSize;
        @AuraEnabled public String latestVersionId;

        public CardFileDTO(ContentDocumentLink cdl) {
            this.contentDocumentId = cdl.ContentDocumentId;
            this.title = cdl.ContentDocument.Title;
            this.fileExtension = cdl.ContentDocument.FileExtension;
            this.contentSize = (Integer) cdl.ContentDocument.ContentSize;
            this.latestVersionId = cdl.ContentDocument.LatestPublishedVersionId;
        }
    }
}
