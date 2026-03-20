/**
 * SprintService - Business logic for sprint management
 */
public with sharing class SprintService {
    /**
     * Create a new sprint
     */
    public static KanbanBoardDTO.SprintDTO createSprint(
        Id boardId,
        String goal,
        Date startDate,
        Date endDate
    ) {
        // Validate board exists
        List<OpenSF__Board__c> boards = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Id = :boardId
            WITH USER_MODE
            LIMIT 1
        ];
        if (boards.isEmpty()) {
            throw new AuraHandledException('Board not found: ' + boardId);
        }

        // Calculate next sprint number
        List<OpenSF__Sprint__c> existingSprints = SprintSelector.getSprintsByBoardId(
            boardId
        );
        Decimal nextNumber = 1;
        if (!existingSprints.isEmpty()) {
            for (OpenSF__Sprint__c s : existingSprints) {
                if (
                    s.OpenSF__SprintNumber__c != null &&
                    s.OpenSF__SprintNumber__c >= nextNumber
                ) {
                    nextNumber = s.OpenSF__SprintNumber__c + 1;
                }
            }
        }

        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            OpenSF__Board__c = boardId,
            OpenSF__Goal__c = goal,
            OpenSF__Status__c = 'Planning',
            OpenSF__StartDate__c = startDate,
            OpenSF__EndDate__c = endDate,
            OpenSF__SprintNumber__c = nextNumber,
            OpenSF__TotalStoryPoints__c = 0,
            OpenSF__CompletedStoryPoints__c = 0
        );
        List<OpenSF__Sprint__c> strippedSprints = (List<OpenSF__Sprint__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__Sprint__c>{ sprint }
            )
            .getRecords();
        insert strippedSprints;

        // Re-query to get auto-number name
        sprint = SprintSelector.getSprintById(strippedSprints[0].Id);
        return new KanbanBoardDTO.SprintDTO(sprint);
    }

    /**
     * Start a sprint - validates no other active sprint exists
     */
    public static KanbanBoardDTO.SprintDTO startSprint(Id sprintId) {
        OpenSF__Sprint__c sprint = SprintSelector.getSprintById(sprintId);

        if (sprint.OpenSF__Status__c != 'Planning') {
            throw new AuraHandledException(
                'Only sprints in Planning status can be started.'
            );
        }

        // Check no other active sprint on this board
        OpenSF__Sprint__c activeSprint = SprintSelector.getActiveSprintByBoardId(
            sprint.OpenSF__Board__c
        );
        if (activeSprint != null) {
            throw new AuraHandledException(
                'Board already has an active sprint: ' + activeSprint.Name
            );
        }

        // Calculate total story points from sprint cards
        List<OpenSF__SprintCard__c> sprintCards = SprintSelector.getSprintCardsBySprintId(
            sprintId
        );
        Decimal totalPoints = 0;
        for (OpenSF__SprintCard__c sc : sprintCards) {
            if (sc.OpenSF__StoryPointsAtAdd__c != null) {
                totalPoints += sc.OpenSF__StoryPointsAtAdd__c;
            }
        }

        sprint.OpenSF__Status__c = 'Active';
        sprint.OpenSF__StartDate__c = sprint.OpenSF__StartDate__c != null
            ? sprint.OpenSF__StartDate__c
            : Date.today();
        sprint.OpenSF__TotalStoryPoints__c = totalPoints;
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Sprint__c>{ sprint }
            )
            .getRecords();

        // Set as active sprint on the board
        OpenSF__Board__c board = new OpenSF__Board__c(
            Id = sprint.OpenSF__Board__c,
            OpenSF__ActiveSprint__c = sprint.Id
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Board__c>{ board }
            )
            .getRecords();

        // Create initial snapshot
        createDailySnapshot(sprintId);

        // Publish event
        publishSprintEvent('sprint_started', sprint);

        return new KanbanBoardDTO.SprintDTO(
            SprintSelector.getSprintById(sprintId)
        );
    }

    /**
     * Complete a sprint with card dispositions
     * @param dispositions Map of cardId -> disposition ('backlog' or sprintId to move to)
     */
    public static KanbanBoardDTO.SprintDTO completeSprint(
        Id sprintId,
        Map<Id, String> dispositions
    ) {
        OpenSF__Sprint__c sprint = SprintSelector.getSprintById(sprintId);

        if (sprint.OpenSF__Status__c != 'Active') {
            throw new AuraHandledException(
                'Only active sprints can be completed.'
            );
        }

        List<OpenSF__SprintCard__c> sprintCards = SprintSelector.getSprintCardsBySprintId(
            sprintId
        );

        // Calculate completed points
        Decimal completedPoints = 0;
        List<OpenSF__SprintCard__c> cardsToUpdate = new List<OpenSF__SprintCard__c>();

        for (OpenSF__SprintCard__c sc : sprintCards) {
            if (sc.OpenSF__CompletedInSprint__c == true) {
                Decimal points = sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
                if (points != null) {
                    completedPoints += points;
                }
            }
        }

        // Handle dispositions for incomplete cards
        if (dispositions != null) {
            List<OpenSF__SprintCard__c> newJunctions = new List<OpenSF__SprintCard__c>();

            // Collect and validate destination sprint IDs belong to the same board
            Set<Id> destinationSprintIds = new Set<Id>();
            for (String disposition : dispositions.values()) {
                if (disposition != 'backlog' && disposition instanceof Id) {
                    destinationSprintIds.add((Id) disposition);
                }
            }
            Set<Id> validSprintIds = new Set<Id>();
            if (!destinationSprintIds.isEmpty()) {
                for (OpenSF__Sprint__c s : [
                    SELECT Id
                    FROM OpenSF__Sprint__c
                    WHERE
                        Id IN :destinationSprintIds
                        AND OpenSF__Board__c = :sprint.OpenSF__Board__c
                    WITH USER_MODE
                ]) {
                    validSprintIds.add(s.Id);
                }
            }

            for (OpenSF__SprintCard__c sc : sprintCards) {
                if (
                    sc.OpenSF__CompletedInSprint__c != true &&
                    dispositions.containsKey(sc.OpenSF__Card__c)
                ) {
                    String disposition = dispositions.get(sc.OpenSF__Card__c);

                    if (
                        disposition != 'backlog' &&
                        disposition instanceof Id &&
                        validSprintIds.contains((Id) disposition)
                    ) {
                        // Move to another sprint on the same board
                        newJunctions.add(
                            new OpenSF__SprintCard__c(
                                OpenSF__Sprint__c = (Id) disposition,
                                OpenSF__Card__c = sc.OpenSF__Card__c,
                                OpenSF__AddedDate__c = DateTime.now(),
                                OpenSF__StoryPointsAtAdd__c = sc.OpenSF__Card__r.OpenSF__StoryPoints__c,
                                OpenSF__Position__c = sc.OpenSF__Position__c
                            )
                        );
                    }
                    // 'backlog' or invalid sprint = card stays unassigned
                }
            }

            if (!newJunctions.isEmpty()) {
                insert Security.stripInaccessible(
                        AccessType.CREATABLE,
                        newJunctions
                    )
                    .getRecords();
            }
        }

        // Update sprint
        sprint.OpenSF__Status__c = 'Completed';
        sprint.OpenSF__CompletedStoryPoints__c = completedPoints;
        sprint.OpenSF__Velocity__c = completedPoints;
        sprint.OpenSF__EndDate__c = sprint.OpenSF__EndDate__c != null
            ? sprint.OpenSF__EndDate__c
            : Date.today();
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Sprint__c>{ sprint }
            )
            .getRecords();

        // Clear active sprint on board
        OpenSF__Board__c board = new OpenSF__Board__c(
            Id = sprint.OpenSF__Board__c,
            OpenSF__ActiveSprint__c = null
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Board__c>{ board }
            )
            .getRecords();

        // Create final snapshot
        createDailySnapshot(sprintId);

        // Publish event
        publishSprintEvent('sprint_completed', sprint);

        return new KanbanBoardDTO.SprintDTO(
            SprintSelector.getSprintById(sprintId)
        );
    }

    /**
     * Add cards to a sprint
     */
    public static List<KanbanBoardDTO.SprintCardDTO> addCardsToSprint(
        Id sprintId,
        List<Id> cardIds
    ) {
        // Check which cards are already in the sprint
        List<OpenSF__SprintCard__c> existing = SprintSelector.getActiveSprintCardsByCardIds(
            sprintId,
            cardIds
        );
        Set<Id> existingCardIds = new Set<Id>();
        for (OpenSF__SprintCard__c sc : existing) {
            existingCardIds.add(sc.OpenSF__Card__c);
        }

        // Get card details for story points
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByIds(
            cardIds
        );
        Map<Id, OpenSF__Card__c> cardMap = new Map<Id, OpenSF__Card__c>(cards);

        List<OpenSF__SprintCard__c> newJunctions = new List<OpenSF__SprintCard__c>();
        for (Id cardId : cardIds) {
            if (!existingCardIds.contains(cardId)) {
                OpenSF__Card__c card = cardMap.get(cardId);
                newJunctions.add(
                    new OpenSF__SprintCard__c(
                        OpenSF__Sprint__c = sprintId,
                        OpenSF__Card__c = cardId,
                        OpenSF__AddedDate__c = DateTime.now(),
                        OpenSF__StoryPointsAtAdd__c = card != null
                            ? card.OpenSF__StoryPoints__c
                            : null,
                        OpenSF__Position__c = LexoRank.between(null, null)
                    )
                );
            }
        }

        if (!newJunctions.isEmpty()) {
            insert Security.stripInaccessible(
                    AccessType.CREATABLE,
                    newJunctions
                )
                .getRecords();
        }

        // Update sprint total points
        recalculateSprintPoints(sprintId);

        // Publish event
        OpenSF__Sprint__c sprint = SprintSelector.getSprintById(sprintId);
        publishSprintEvent('cards_added', sprint);

        // Return the newly created junctions
        List<OpenSF__SprintCard__c> allCards = SprintSelector.getSprintCardsBySprintId(
            sprintId
        );
        return KanbanBoardDTO.convertSprintCards(allCards);
    }

    /**
     * Remove a card from a sprint (soft delete)
     */
    public static void removeCardFromSprint(Id sprintId, Id cardId) {
        List<OpenSF__SprintCard__c> junctions = [
            SELECT Id, OpenSF__RemovedDate__c
            FROM OpenSF__SprintCard__c
            WHERE
                OpenSF__Sprint__c = :sprintId
                AND OpenSF__Card__c = :cardId
                AND OpenSF__RemovedDate__c = NULL
            WITH USER_MODE
            LIMIT 1
        ];

        if (!junctions.isEmpty()) {
            junctions[0].OpenSF__RemovedDate__c = DateTime.now();
            update Security.stripInaccessible(AccessType.UPDATABLE, junctions)
                .getRecords();
        }

        // Recalculate sprint points
        recalculateSprintPoints(sprintId);

        // Publish event
        OpenSF__Sprint__c sprint = SprintSelector.getSprintById(sprintId);
        publishSprintEvent('card_removed', sprint);
    }

    /**
     * Get sprint data for a board (active sprint + backlog + sprint cards)
     */
    public static SprintBoardData getSprintData(Id boardId) {
        SprintBoardData data = new SprintBoardData();

        // Get active sprint
        OpenSF__Sprint__c activeSprint = SprintSelector.getActiveSprintByBoardId(
            boardId
        );
        if (activeSprint != null) {
            data.activeSprint = new KanbanBoardDTO.SprintDTO(activeSprint);
            data.sprintCards = KanbanBoardDTO.convertSprintCards(
                SprintSelector.getSprintCardsBySprintId(activeSprint.Id)
            );
        }

        // Get all sprints for the board
        data.sprints = KanbanBoardDTO.convertSprints(
            SprintSelector.getSprintsByBoardId(boardId)
        );

        // Get backlog cards and backfill any missing positions
        List<OpenSF__Card__c> backlogCards = SprintSelector.getBacklogCardsByBoardId(
            boardId
        );
        KanbanCardService.backfillMissingPositions(backlogCards);
        data.backlogCards = KanbanBoardDTO.convertCards(backlogCards);

        return data;
    }

    /**
     * Create a daily snapshot for a sprint
     */
    public static void createDailySnapshot(Id sprintId) {
        List<OpenSF__SprintCard__c> sprintCards = SprintSelector.getSprintCardsBySprintId(
            sprintId
        );

        Decimal totalPoints = 0;
        Decimal completedPoints = 0;
        Decimal cardCount = sprintCards.size();
        Decimal completedCardCount = 0;

        for (OpenSF__SprintCard__c sc : sprintCards) {
            Decimal points = sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
            if (points != null) {
                totalPoints += points;
            }
            if (sc.OpenSF__CompletedInSprint__c == true) {
                completedCardCount++;
                if (points != null) {
                    completedPoints += points;
                }
            }
        }

        OpenSF__SprintSnapshot__c snapshot = new OpenSF__SprintSnapshot__c(
            OpenSF__Sprint__c = sprintId,
            OpenSF__SnapshotDate__c = Date.today(),
            OpenSF__TotalPoints__c = totalPoints,
            OpenSF__RemainingPoints__c = totalPoints - completedPoints,
            OpenSF__CompletedPoints__c = completedPoints,
            OpenSF__CardCount__c = cardCount,
            OpenSF__CompletedCardCount__c = completedCardCount
        );
        insert Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__SprintSnapshot__c>{ snapshot }
            )
            .getRecords();
    }

    /**
     * Get burndown data for a sprint
     */
    public static List<KanbanBoardDTO.SprintSnapshotDTO> getBurndownData(
        Id sprintId
    ) {
        return KanbanBoardDTO.convertSnapshots(
            SprintSelector.getSnapshotsBySprintId(sprintId)
        );
    }

    /**
     * Get velocity data for a board
     */
    public static List<KanbanBoardDTO.SprintDTO> getVelocityData(
        Id boardId,
        Integer count
    ) {
        return KanbanBoardDTO.convertSprints(
            SprintSelector.getCompletedSprintsByBoardId(boardId, count)
        );
    }

    /**
     * Mark a sprint card as completed
     */
    public static void markCardCompleted(Id sprintId, Id cardId) {
        List<OpenSF__SprintCard__c> junctions = [
            SELECT Id, OpenSF__CompletedInSprint__c, OpenSF__CompletedDate__c
            FROM OpenSF__SprintCard__c
            WHERE
                OpenSF__Sprint__c = :sprintId
                AND OpenSF__Card__c = :cardId
                AND OpenSF__RemovedDate__c = NULL
            WITH USER_MODE
            LIMIT 1
        ];

        if (
            !junctions.isEmpty() && !junctions[0].OpenSF__CompletedInSprint__c
        ) {
            junctions[0].OpenSF__CompletedInSprint__c = true;
            junctions[0].OpenSF__CompletedDate__c = DateTime.now();
            update Security.stripInaccessible(AccessType.UPDATABLE, junctions)
                .getRecords();

            recalculateSprintPoints(sprintId);
        }
    }

    /**
     * Public wrapper for recalculating sprint points (called by KanbanCardService
     * when auto-completing cards on move to Done-category columns)
     */
    public static void recalculateSprintPointsPublic(Id sprintId) {
        recalculateSprintPoints(sprintId);
    }

    /**
     * Recalculate sprint total and completed points
     */
    private static void recalculateSprintPoints(Id sprintId) {
        List<OpenSF__SprintCard__c> sprintCards = SprintSelector.getSprintCardsBySprintId(
            sprintId
        );

        Decimal totalPoints = 0;
        Decimal completedPoints = 0;

        for (OpenSF__SprintCard__c sc : sprintCards) {
            Decimal points = sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
            if (points != null) {
                totalPoints += points;
            }
            if (sc.OpenSF__CompletedInSprint__c == true && points != null) {
                completedPoints += points;
            }
        }

        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            Id = sprintId,
            OpenSF__TotalStoryPoints__c = totalPoints,
            OpenSF__CompletedStoryPoints__c = completedPoints
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Sprint__c>{ sprint }
            )
            .getRecords();
    }

    /**
     * Publish a sprint update event
     */
    private static void publishSprintEvent(
        String eventType,
        OpenSF__Sprint__c sprint
    ) {
        OpenSF__SprintUpdateEvent__e event = new OpenSF__SprintUpdateEvent__e(
            OpenSF__EventType__c = eventType,
            OpenSF__Payload__c = JSON.serialize(
                new KanbanBoardDTO.SprintDTO(sprint)
            ),
            OpenSF__BoardId__c = String.valueOf(sprint.OpenSF__Board__c)
        );
        EventBus.publish(event);
    }

    /**
     * Wrapper for sprint board data
     */
    public class SprintBoardData {
        @AuraEnabled
        public KanbanBoardDTO.SprintDTO activeSprint;
        @AuraEnabled
        public List<KanbanBoardDTO.SprintDTO> sprints;
        @AuraEnabled
        public List<KanbanBoardDTO.SprintCardDTO> sprintCards;
        @AuraEnabled
        public List<KanbanBoardDTO.CardDTO> backlogCards;
    }
}
