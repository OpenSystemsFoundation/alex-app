/**
 * RoadmapService - Service layer for Roadmap and Timeline business logic.
 * Handles roadmap item CRUD, epic dependency management, and timeline queries.
 */
public with sharing class RoadmapService {
    /**
     * Get all roadmap items for a board, with related card (epic) data
     */
    public static List<RoadmapController.RoadmapItemDTO> getRoadmapItems(
        Id boardId
    ) {
        List<OpenSF__RoadmapItem__c> items = [
            SELECT
                Id,
                Name,
                OpenSF__Board__c,
                OpenSF__Card__c,
                OpenSF__Card__r.OpenSF__Subject__c,
                OpenSF__Card__r.OpenSF__Description__c,
                OpenSF__Card__r.OpenSF__Status__c,
                OpenSF__Card__r.OpenSF__Priority__c,
                OpenSF__Card__r.OpenSF__StoryPoints__c,
                OpenSF__Card__r.OpenSF__CardType__c,
                OpenSF__Card__r.OpenSF__Color__c,
                OpenSF__Card__r.OpenSF__EpicCardsCount__c,
                OpenSF__Card__r.OpenSF__Assignee__c,
                OpenSF__Card__r.OpenSF__Assignee__r.Name,
                OpenSF__Horizon__c,
                OpenSF__Quarter__c,
                OpenSF__Year__c,
                OpenSF__StartDate__c,
                OpenSF__TargetDate__c,
                OpenSF__Position__c,
                OpenSF__Status__c
            FROM OpenSF__RoadmapItem__c
            WHERE OpenSF__Board__c = :boardId
            WITH USER_MODE
            ORDER BY OpenSF__Position__c ASC NULLS LAST
        ];

        List<RoadmapController.RoadmapItemDTO> result = new List<RoadmapController.RoadmapItemDTO>();
        for (OpenSF__RoadmapItem__c item : items) {
            result.add(new RoadmapController.RoadmapItemDTO(item));
        }
        return result;
    }

    /**
     * Get all epic cards for a board that can be added to the roadmap
     */
    public static List<RoadmapController.EpicSummaryDTO> getAvailableEpics(
        Id boardId
    ) {
        // Get IDs of cards already on the roadmap
        Set<Id> roadmapCardIds = new Set<Id>();
        for (OpenSF__RoadmapItem__c ri : [
            SELECT OpenSF__Card__c
            FROM OpenSF__RoadmapItem__c
            WHERE OpenSF__Board__c = :boardId AND OpenSF__Card__c != NULL
            WITH USER_MODE
        ]) {
            roadmapCardIds.add(ri.OpenSF__Card__c);
        }

        List<OpenSF__Card__c> epics = [
            SELECT
                Id,
                OpenSF__Subject__c,
                OpenSF__Status__c,
                OpenSF__Priority__c,
                OpenSF__StoryPoints__c,
                OpenSF__Color__c,
                OpenSF__EpicCardsCount__c,
                OpenSF__Assignee__c,
                OpenSF__Assignee__r.Name
            FROM OpenSF__Card__c
            WHERE
                OpenSF__Board__c = :boardId
                AND OpenSF__CardType__c = 'Epic'
                AND Id NOT IN :roadmapCardIds
            WITH USER_MODE
            ORDER BY OpenSF__Subject__c ASC
        ];

        List<RoadmapController.EpicSummaryDTO> result = new List<RoadmapController.EpicSummaryDTO>();
        for (OpenSF__Card__c epic : epics) {
            result.add(new RoadmapController.EpicSummaryDTO(epic));
        }
        return result;
    }

    /**
     * Create a new roadmap item
     */
    public static RoadmapController.RoadmapItemDTO createRoadmapItem(
        Id boardId,
        Id cardId,
        String horizon,
        String quarter,
        Decimal year,
        Date startDate,
        Date targetDate,
        String previousPosition,
        String nextPosition
    ) {
        String position = LexoRank.between(previousPosition, nextPosition);

        OpenSF__RoadmapItem__c item = new OpenSF__RoadmapItem__c(
            OpenSF__Board__c = boardId,
            OpenSF__Card__c = cardId,
            OpenSF__Horizon__c = horizon,
            OpenSF__Quarter__c = quarter,
            OpenSF__Year__c = year,
            OpenSF__StartDate__c = startDate,
            OpenSF__TargetDate__c = targetDate,
            OpenSF__Position__c = position,
            OpenSF__Status__c = 'On Track'
        );

        List<OpenSF__RoadmapItem__c> toInsert = Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__RoadmapItem__c>{ item }
            )
            .getRecords();
        insert toInsert;

        // Re-query with relationships
        OpenSF__RoadmapItem__c created = [
            SELECT
                Id,
                Name,
                OpenSF__Board__c,
                OpenSF__Card__c,
                OpenSF__Card__r.OpenSF__Subject__c,
                OpenSF__Card__r.OpenSF__Description__c,
                OpenSF__Card__r.OpenSF__Status__c,
                OpenSF__Card__r.OpenSF__Priority__c,
                OpenSF__Card__r.OpenSF__StoryPoints__c,
                OpenSF__Card__r.OpenSF__CardType__c,
                OpenSF__Card__r.OpenSF__Color__c,
                OpenSF__Card__r.OpenSF__EpicCardsCount__c,
                OpenSF__Card__r.OpenSF__Assignee__c,
                OpenSF__Card__r.OpenSF__Assignee__r.Name,
                OpenSF__Horizon__c,
                OpenSF__Quarter__c,
                OpenSF__Year__c,
                OpenSF__StartDate__c,
                OpenSF__TargetDate__c,
                OpenSF__Position__c,
                OpenSF__Status__c
            FROM OpenSF__RoadmapItem__c
            WHERE Id = :toInsert[0].Id
            WITH USER_MODE
            LIMIT 1
        ];
        return new RoadmapController.RoadmapItemDTO(created);
    }

    /**
     * Update a roadmap item (horizon, quarter, dates, status, position)
     */
    public static RoadmapController.RoadmapItemDTO updateRoadmapItem(
        Id itemId,
        Map<String, Object> updates
    ) {
        OpenSF__RoadmapItem__c item = new OpenSF__RoadmapItem__c(Id = itemId);

        if (updates.containsKey('horizon')) {
            item.OpenSF__Horizon__c = (String) updates.get('horizon');
        }
        if (updates.containsKey('quarter')) {
            item.OpenSF__Quarter__c = (String) updates.get('quarter');
        }
        if (updates.containsKey('year')) {
            item.OpenSF__Year__c = (Decimal) updates.get('year');
        }
        if (updates.containsKey('startDate')) {
            item.OpenSF__StartDate__c = Date.valueOf(
                (String) updates.get('startDate')
            );
        }
        if (updates.containsKey('targetDate')) {
            item.OpenSF__TargetDate__c = Date.valueOf(
                (String) updates.get('targetDate')
            );
        }
        if (updates.containsKey('status')) {
            item.OpenSF__Status__c = (String) updates.get('status');
        }
        if (updates.containsKey('position')) {
            item.OpenSF__Position__c = (String) updates.get('position');
        }

        List<OpenSF__RoadmapItem__c> toUpdate = Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__RoadmapItem__c>{ item }
            )
            .getRecords();
        for (OpenSF__RoadmapItem__c r : toUpdate) {
            r.Id = itemId;
        }
        update toUpdate;

        // Re-query
        OpenSF__RoadmapItem__c updated = [
            SELECT
                Id,
                Name,
                OpenSF__Board__c,
                OpenSF__Card__c,
                OpenSF__Card__r.OpenSF__Subject__c,
                OpenSF__Card__r.OpenSF__Description__c,
                OpenSF__Card__r.OpenSF__Status__c,
                OpenSF__Card__r.OpenSF__Priority__c,
                OpenSF__Card__r.OpenSF__StoryPoints__c,
                OpenSF__Card__r.OpenSF__CardType__c,
                OpenSF__Card__r.OpenSF__Color__c,
                OpenSF__Card__r.OpenSF__EpicCardsCount__c,
                OpenSF__Card__r.OpenSF__Assignee__c,
                OpenSF__Card__r.OpenSF__Assignee__r.Name,
                OpenSF__Horizon__c,
                OpenSF__Quarter__c,
                OpenSF__Year__c,
                OpenSF__StartDate__c,
                OpenSF__TargetDate__c,
                OpenSF__Position__c,
                OpenSF__Status__c
            FROM OpenSF__RoadmapItem__c
            WHERE Id = :itemId
            WITH USER_MODE
            LIMIT 1
        ];
        return new RoadmapController.RoadmapItemDTO(updated);
    }

    /**
     * Delete a roadmap item
     */
    public static void deleteRoadmapItem(Id itemId) {
        OpenSF__RoadmapItem__c item = new OpenSF__RoadmapItem__c(Id = itemId);
        delete item;
    }

    /**
     * Move a roadmap item to a new bucket (horizon or quarter) with position
     */
    public static RoadmapController.RoadmapItemDTO moveRoadmapItem(
        Id itemId,
        String horizon,
        String quarter,
        String previousPosition,
        String nextPosition
    ) {
        String newPosition = LexoRank.between(previousPosition, nextPosition);
        Map<String, Object> updates = new Map<String, Object>{
            'position' => newPosition
        };
        if (String.isNotBlank(horizon)) {
            updates.put('horizon', horizon);
        }
        if (String.isNotBlank(quarter)) {
            updates.put('quarter', quarter);
        }
        return updateRoadmapItem(itemId, updates);
    }

    // =========================================================================
    // Epic Dependency Methods
    // =========================================================================

    /**
     * Get all epic dependencies for a board
     */
    public static List<RoadmapController.EpicDependencyDTO> getDependencies(
        Id boardId
    ) {
        List<OpenSF__EpicDependency__c> deps = [
            SELECT
                Id,
                Name,
                OpenSF__Board__c,
                OpenSF__SourceEpic__c,
                OpenSF__SourceEpic__r.OpenSF__Subject__c,
                OpenSF__TargetEpic__c,
                OpenSF__TargetEpic__r.OpenSF__Subject__c,
                OpenSF__DependencyType__c
            FROM OpenSF__EpicDependency__c
            WHERE OpenSF__Board__c = :boardId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];

        List<RoadmapController.EpicDependencyDTO> result = new List<RoadmapController.EpicDependencyDTO>();
        for (OpenSF__EpicDependency__c dep : deps) {
            result.add(new RoadmapController.EpicDependencyDTO(dep));
        }
        return result;
    }

    /**
     * Create a new epic dependency
     */
    public static RoadmapController.EpicDependencyDTO createDependency(
        Id boardId,
        Id sourceEpicId,
        Id targetEpicId,
        String dependencyType
    ) {
        OpenSF__EpicDependency__c dep = new OpenSF__EpicDependency__c(
            OpenSF__Board__c = boardId,
            OpenSF__SourceEpic__c = sourceEpicId,
            OpenSF__TargetEpic__c = targetEpicId,
            OpenSF__DependencyType__c = dependencyType
        );

        List<OpenSF__EpicDependency__c> toInsert = Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__EpicDependency__c>{ dep }
            )
            .getRecords();
        insert toInsert;

        // Re-query with relationships
        OpenSF__EpicDependency__c created = [
            SELECT
                Id,
                Name,
                OpenSF__Board__c,
                OpenSF__SourceEpic__c,
                OpenSF__SourceEpic__r.OpenSF__Subject__c,
                OpenSF__TargetEpic__c,
                OpenSF__TargetEpic__r.OpenSF__Subject__c,
                OpenSF__DependencyType__c
            FROM OpenSF__EpicDependency__c
            WHERE Id = :toInsert[0].Id
            WITH USER_MODE
            LIMIT 1
        ];
        return new RoadmapController.EpicDependencyDTO(created);
    }

    /**
     * Delete an epic dependency
     */
    public static void deleteDependency(Id dependencyId) {
        OpenSF__EpicDependency__c dep = new OpenSF__EpicDependency__c(
            Id = dependencyId
        );
        delete dep;
    }

    /**
     * Get timeline data: roadmap items with dependencies for Gantt view
     */
    public static RoadmapController.TimelineData getTimelineData(
        Id boardId
    ) {
        RoadmapController.TimelineData data = new RoadmapController.TimelineData();
        data.items = getRoadmapItems(boardId);
        data.dependencies = getDependencies(boardId);
        return data;
    }
}
