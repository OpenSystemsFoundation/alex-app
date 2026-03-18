/**
 * SprintSelector - Selector class for Sprint-related queries
 */
public with sharing class SprintSelector {
    /**
     * Get Sprint by Id
     */
    public static OpenSF__Sprint__c getSprintById(Id sprintId) {
        return [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Goal__c, OpenSF__Status__c,
                   OpenSF__StartDate__c, OpenSF__EndDate__c, OpenSF__SprintNumber__c,
                   OpenSF__TotalStoryPoints__c, OpenSF__CompletedStoryPoints__c,
                   OpenSF__Velocity__c
            FROM OpenSF__Sprint__c
            WHERE Id = :sprintId
            LIMIT 1
        ];
    }

    /**
     * Get all Sprints for a Board
     */
    public static List<OpenSF__Sprint__c> getSprintsByBoardId(Id boardId) {
        return [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Goal__c, OpenSF__Status__c,
                   OpenSF__StartDate__c, OpenSF__EndDate__c, OpenSF__SprintNumber__c,
                   OpenSF__TotalStoryPoints__c, OpenSF__CompletedStoryPoints__c,
                   OpenSF__Velocity__c
            FROM OpenSF__Sprint__c
            WHERE OpenSF__Board__c = :boardId
            ORDER BY OpenSF__SprintNumber__c DESC
        ];
    }

    /**
     * Get active Sprint for a Board
     */
    public static OpenSF__Sprint__c getActiveSprintByBoardId(Id boardId) {
        List<OpenSF__Sprint__c> sprints = [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Goal__c, OpenSF__Status__c,
                   OpenSF__StartDate__c, OpenSF__EndDate__c, OpenSF__SprintNumber__c,
                   OpenSF__TotalStoryPoints__c, OpenSF__CompletedStoryPoints__c,
                   OpenSF__Velocity__c
            FROM OpenSF__Sprint__c
            WHERE OpenSF__Board__c = :boardId AND OpenSF__Status__c = 'Active'
            LIMIT 1
        ];
        return sprints.isEmpty() ? null : sprints[0];
    }

    /**
     * Get SprintCards for a Sprint (active only - not removed)
     */
    public static List<OpenSF__SprintCard__c> getSprintCardsBySprintId(Id sprintId) {
        return [
            SELECT Id, Name, OpenSF__Sprint__c, OpenSF__Card__c,
                   OpenSF__AddedDate__c, OpenSF__RemovedDate__c,
                   OpenSF__StoryPointsAtAdd__c, OpenSF__CompletedInSprint__c,
                   OpenSF__CompletedDate__c, OpenSF__Position__c,
                   OpenSF__Card__r.Id, OpenSF__Card__r.Name,
                   OpenSF__Card__r.OpenSF__Subject__c,
                   OpenSF__Card__r.OpenSF__Description__c,
                   OpenSF__Card__r.OpenSF__Column__c,
                   OpenSF__Card__r.OpenSF__LexoRankPosition__c,
                   OpenSF__Card__r.OpenSF__Color__c,
                   OpenSF__Card__r.OpenSF__Priority__c,
                   OpenSF__Card__r.OpenSF__Status__c,
                   OpenSF__Card__r.OpenSF__CardType__c,
                   OpenSF__Card__r.OpenSF__DueDate__c,
                   OpenSF__Card__r.OpenSF__StoryPoints__c,
                   OpenSF__Card__r.OpenSF__Assignee__c,
                   OpenSF__Card__r.OpenSF__Assignee__r.Name,
                   OpenSF__Card__r.OpenSF__Assignee__r.SmallPhotoUrl,
                   OpenSF__Card__r.OpenSF__PeerReviewer__c,
                   OpenSF__Card__r.OpenSF__PeerReviewer__r.Name,
                   OpenSF__Card__r.OpenSF__Epic__c,
                   OpenSF__Card__r.OpenSF__Epic__r.OpenSF__Subject__c,
                   OpenSF__Card__r.OpenSF__Locked__c,
                   OpenSF__Card__r.OpenSF__SequenceNumber__c,
                   OpenSF__Card__r.LastModifiedDate,
                   OpenSF__Card__r.LastModifiedById
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__c = :sprintId
              AND OpenSF__RemovedDate__c = null
            ORDER BY OpenSF__Position__c ASC NULLS LAST
        ];
    }

    /**
     * Get backlog cards for a Board - cards not in any active sprint
     */
    public static List<OpenSF__Card__c> getBacklogCardsByBoardId(Id boardId) {
        // Get cards that belong to this board but are not in any active sprint
        Set<Id> cardsInActiveSprints = new Set<Id>();
        for (OpenSF__SprintCard__c sc : [
            SELECT OpenSF__Card__c
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__r.OpenSF__Board__c = :boardId
              AND OpenSF__Sprint__r.OpenSF__Status__c = 'Active'
              AND OpenSF__RemovedDate__c = null
        ]) {
            cardsInActiveSprints.add(sc.OpenSF__Card__c);
        }

        return [
            SELECT Id, Name, OpenSF__Subject__c, OpenSF__Description__c,
                   OpenSF__Column__c, OpenSF__LexoRankPosition__c,
                   OpenSF__Color__c, OpenSF__Priority__c, OpenSF__Status__c,
                   OpenSF__CardType__c, OpenSF__DueDate__c, OpenSF__StoryPoints__c,
                   OpenSF__Assignee__c, OpenSF__Assignee__r.Name,
                   OpenSF__Assignee__r.SmallPhotoUrl,
                   OpenSF__PeerReviewer__c, OpenSF__PeerReviewer__r.Name,
                   OpenSF__Epic__c, OpenSF__Epic__r.OpenSF__Subject__c,
                   OpenSF__Locked__c, OpenSF__SequenceNumber__c,
                   LastModifiedDate, LastModifiedById
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__r.OpenSF__Board__c = :boardId
              AND Id NOT IN :cardsInActiveSprints
            ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
        ];
    }

    /**
     * Get Snapshots for a Sprint
     */
    public static List<OpenSF__SprintSnapshot__c> getSnapshotsBySprintId(Id sprintId) {
        return [
            SELECT Id, OpenSF__Sprint__c, OpenSF__SnapshotDate__c,
                   OpenSF__TotalPoints__c, OpenSF__RemainingPoints__c,
                   OpenSF__CompletedPoints__c, OpenSF__CardCount__c,
                   OpenSF__CompletedCardCount__c
            FROM OpenSF__SprintSnapshot__c
            WHERE OpenSF__Sprint__c = :sprintId
            ORDER BY OpenSF__SnapshotDate__c ASC
        ];
    }

    /**
     * Get completed Sprints for velocity calculation
     */
    public static List<OpenSF__Sprint__c> getCompletedSprintsByBoardId(Id boardId, Integer limitCount) {
        return [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Goal__c, OpenSF__Status__c,
                   OpenSF__StartDate__c, OpenSF__EndDate__c, OpenSF__SprintNumber__c,
                   OpenSF__TotalStoryPoints__c, OpenSF__CompletedStoryPoints__c,
                   OpenSF__Velocity__c
            FROM OpenSF__Sprint__c
            WHERE OpenSF__Board__c = :boardId AND OpenSF__Status__c = 'Completed'
            ORDER BY OpenSF__EndDate__c DESC
            LIMIT :limitCount
        ];
    }

    /**
     * Get all active sprints (for scheduled snapshot job)
     */
    public static List<OpenSF__Sprint__c> getAllActiveSprints() {
        return [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Goal__c, OpenSF__Status__c,
                   OpenSF__StartDate__c, OpenSF__EndDate__c, OpenSF__SprintNumber__c,
                   OpenSF__TotalStoryPoints__c, OpenSF__CompletedStoryPoints__c,
                   OpenSF__Velocity__c
            FROM OpenSF__Sprint__c
            WHERE OpenSF__Status__c = 'Active'
        ];
    }

    /**
     * Check if a card is already in a sprint
     */
    public static List<OpenSF__SprintCard__c> getActiveSprintCardsByCardIds(Id sprintId, List<Id> cardIds) {
        return [
            SELECT Id, OpenSF__Card__c
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__c = :sprintId
              AND OpenSF__Card__c IN :cardIds
              AND OpenSF__RemovedDate__c = null
        ];
    }
}
