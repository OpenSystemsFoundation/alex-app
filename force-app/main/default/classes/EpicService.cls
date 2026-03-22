/**
 * EpicService - Service class for Epic management business logic
 * Provides epic progress tracking, child card management, and summary data
 */
public with sharing class EpicService {
    /**
     * Get epic summaries for a board with progress data
     * Returns all epics associated with the board along with child card counts
     */
    public static List<KanbanBoardDTO.EpicSummaryDTO> getEpicSummaries(
        Id boardId
    ) {
        List<OpenSF__Card__c> epics = KanbanBoardSelector.getEpicsByBoardId(
            boardId
        );

        if (epics.isEmpty()) {
            return new List<KanbanBoardDTO.EpicSummaryDTO>();
        }

        // Collect epic IDs
        Set<Id> epicIds = new Set<Id>();
        for (OpenSF__Card__c epic : epics) {
            epicIds.add(epic.Id);
        }

        // Aggregate child card data per epic
        Map<Id, EpicStats> statsMap = new Map<Id, EpicStats>();
        for (Id epicId : epicIds) {
            statsMap.put(epicId, new EpicStats());
        }

        for (AggregateResult ar : [
            SELECT
                OpenSF__Epic__c epicId,
                OpenSF__Column__r.OpenSF__Category__c category,
                COUNT(Id) cardCount,
                SUM(OpenSF__StoryPoints__c) totalPoints
            FROM OpenSF__Card__c
            WHERE OpenSF__Epic__c IN :epicIds
            GROUP BY
                OpenSF__Epic__c,
                OpenSF__Column__r.OpenSF__Category__c
        ]) {
            Id epicId = (Id) ar.get('epicId');
            String category = (String) ar.get('category');
            Integer count = (Integer) ar.get('cardCount');
            Decimal points = (Decimal) ar.get('totalPoints');

            EpicStats stats = statsMap.get(epicId);
            stats.totalCards += count;
            stats.totalPoints += (points != null ? points : 0);

            if (
                category ==
                KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.DONE
                ) ||
                category ==
                KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.RELEASED
                )
            ) {
                stats.completedCards += count;
                stats.completedPoints += (points != null ? points : 0);
            }
        }

        // Also count backlog children (no column = no category)
        for (AggregateResult ar : [
            SELECT OpenSF__Epic__c epicId, COUNT(Id) cardCount,
                SUM(OpenSF__StoryPoints__c) totalPoints
            FROM OpenSF__Card__c
            WHERE
                OpenSF__Epic__c IN :epicIds
                AND OpenSF__Column__c = NULL
            GROUP BY OpenSF__Epic__c
        ]) {
            Id epicId = (Id) ar.get('epicId');
            Integer count = (Integer) ar.get('cardCount');
            Decimal points = (Decimal) ar.get('totalPoints');

            EpicStats stats = statsMap.get(epicId);
            stats.totalCards += count;
            stats.totalPoints += (points != null ? points : 0);
        }

        // Build summary DTOs
        List<KanbanBoardDTO.EpicSummaryDTO> summaries = new List<KanbanBoardDTO.EpicSummaryDTO>();
        for (OpenSF__Card__c epic : epics) {
            KanbanBoardDTO.EpicSummaryDTO summary = new KanbanBoardDTO.EpicSummaryDTO();
            summary.id = epic.Id;
            summary.subject = epic.OpenSF__Subject__c;
            summary.color = epic.OpenSF__Color__c;
            summary.status = epic.OpenSF__Status__c;

            EpicStats stats = statsMap.get(epic.Id);
            summary.totalCards = stats.totalCards;
            summary.completedCards = stats.completedCards;
            summary.totalPoints = stats.totalPoints;
            summary.completedPoints = stats.completedPoints;
            summary.progressPercent = stats.totalCards > 0
                ? Math.round(
                      ((Decimal) stats.completedCards / stats.totalCards) * 100
                  )
                    .intValue()
                : 0;

            summaries.add(summary);
        }

        return summaries;
    }

    /**
     * Get detailed epic data with child cards
     */
    public static KanbanBoardDTO.EpicSummaryDTO getEpicDetail(Id epicId) {
        // Get the epic card itself
        OpenSF__Card__c epic = KanbanBoardSelector.getCardById(epicId);
        if (epic.OpenSF__CardType__c != 'Epic') {
            throw new AuraHandledException('Card is not an Epic');
        }

        // Get child cards
        List<OpenSF__Card__c> children = KanbanBoardSelector.getChildCardsByEpicId(
            epicId
        );

        // Build summary
        KanbanBoardDTO.EpicSummaryDTO summary = new KanbanBoardDTO.EpicSummaryDTO();
        summary.id = epic.Id;
        summary.subject = epic.OpenSF__Subject__c;
        summary.color = epic.OpenSF__Color__c;
        summary.status = epic.OpenSF__Status__c;
        summary.totalCards = 0;
        summary.completedCards = 0;
        summary.totalPoints = 0;
        summary.completedPoints = 0;
        summary.childCards = new List<KanbanBoardDTO.EpicChildCardDTO>();

        for (OpenSF__Card__c child : children) {
            KanbanBoardDTO.EpicChildCardDTO childDTO = new KanbanBoardDTO.EpicChildCardDTO(
                child
            );
            summary.childCards.add(childDTO);
            summary.totalCards++;
            if (child.OpenSF__StoryPoints__c != null) {
                summary.totalPoints += child.OpenSF__StoryPoints__c;
            }
            if (
                childDTO.columnCategory ==
                KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.DONE
                ) ||
                childDTO.columnCategory ==
                KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.RELEASED
                )
            ) {
                summary.completedCards++;
                if (child.OpenSF__StoryPoints__c != null) {
                    summary.completedPoints += child.OpenSF__StoryPoints__c;
                }
            }
        }

        summary.progressPercent = summary.totalCards > 0
            ? Math.round(
                  ((Decimal) summary.completedCards / summary.totalCards) * 100
              )
                .intValue()
            : 0;

        return summary;
    }

    /**
     * Internal helper to accumulate per-epic statistics
     */
    private class EpicStats {
        public Integer totalCards = 0;
        public Integer completedCards = 0;
        public Decimal totalPoints = 0;
        public Decimal completedPoints = 0;
    }
}
