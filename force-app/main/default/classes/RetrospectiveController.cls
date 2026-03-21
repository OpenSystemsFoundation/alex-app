/**
 * RetrospectiveController - Thin facade for Retrospective Board LWC
 * Delegates business logic to RetrospectiveService
 */
public with sharing class RetrospectiveController {
    /**
     * Get full retrospective data (retro, cards, votes, categories)
     */
    @AuraEnabled
    public static RetrospectiveService.RetroData getRetroData(Id retroId) {
        try {
            return RetrospectiveService.getRetroData(retroId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading retrospective: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new retro card
     */
    @AuraEnabled
    public static RetrospectiveDTO.RetroCardDTO createRetroCard(
        Id retroId,
        String category,
        String text
    ) {
        try {
            return RetrospectiveService.createRetroCard(
                retroId,
                category,
                text
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating retro card: ' + e.getMessage()
            );
        }
    }

    /**
     * Toggle vote on a retro card
     */
    @AuraEnabled
    public static RetrospectiveDTO.RetroCardDTO toggleVote(Id cardId) {
        try {
            return RetrospectiveService.toggleVote(cardId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Reveal all card authors
     */
    @AuraEnabled
    public static void revealAuthors(Id retroId) {
        try {
            RetrospectiveService.revealAuthors(retroId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error revealing authors: ' + e.getMessage()
            );
        }
    }

    /**
     * Update retrospective status
     */
    @AuraEnabled
    public static RetrospectiveDTO.RetroDTO updateRetroStatus(
        Id retroId,
        String status
    ) {
        try {
            return RetrospectiveService.updateRetroStatus(retroId, status);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating status: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a retro card
     */
    @AuraEnabled
    public static void deleteRetroCard(Id cardId) {
        try {
            RetrospectiveService.deleteRetroCard(cardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting retro card: ' + e.getMessage()
            );
        }
    }

    /**
     * Create an action item card on a kanban board
     */
    @AuraEnabled
    public static RetrospectiveDTO.RetroCardDTO createActionItem(
        Id retroCardId,
        Id boardId,
        Id assigneeId,
        String destination
    ) {
        try {
            return RetrospectiveService.createActionItem(
                retroCardId,
                boardId,
                assigneeId,
                destination
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating action item: ' + e.getMessage()
            );
        }
    }

    /**
     * Get active boards for action item destination
     */
    @AuraEnabled(cacheable=true)
    public static List<KanbanBoardDTO.BoardDTO> getBoards() {
        try {
            return RetrospectiveService.getBoards();
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading boards: ' + e.getMessage()
            );
        }
    }
}
