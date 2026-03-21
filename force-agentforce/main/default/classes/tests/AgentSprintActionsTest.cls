@IsTest
private class AgentSprintActionsTest {
    @TestSetup
    static void setupTestData() {
        OpenSF__Board__c board = new OpenSF__Board__c(
            OpenSF__Description__c = 'Test Board',
            OpenSF__Status__c = 'Active',
            OpenSF__Type__c = 'Sprint',
            OpenSF__Active__c = true
        );
        insert board;

        OpenSF__Column__c col1 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'To Do',
            OpenSF__Category__c = 'To Do',
            OpenSF__Color__c = '#cccccc',
            OpenSF__LexoRankPosition__c = 'a',
            OpenSF__CardCount__c = 0
        );
        OpenSF__Column__c col2 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'In Progress',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'In Progress',
            OpenSF__Category__c = 'In Progress',
            OpenSF__Color__c = '#0070d2',
            OpenSF__LexoRankPosition__c = 'b',
            OpenSF__CardCount__c = 0
        );
        OpenSF__Column__c col3 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'Done',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'Done',
            OpenSF__Category__c = 'Done',
            OpenSF__Color__c = '#4bca81',
            OpenSF__LexoRankPosition__c = 'c',
            OpenSF__CardCount__c = 0
        );
        insert new List<OpenSF__Column__c>{ col1, col2, col3 };

        OpenSF__Card__c card1 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 1',
            OpenSF__Description__c = 'A test card description',
            OpenSF__Column__c = col1.Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'High',
            OpenSF__CardType__c = 'Story',
            OpenSF__StoryPoints__c = 5,
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LexoRankPosition__c = 'a'
        );
        OpenSF__Card__c card2 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 2',
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'Medium',
            OpenSF__CardType__c = 'Bug',
            OpenSF__StoryPoints__c = 3,
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LexoRankPosition__c = 'b'
        );
        insert new List<OpenSF__Card__c>{ card1, card2 };
    }

    static OpenSF__Board__c getBoard() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    static List<OpenSF__Card__c> getCards() {
        return [SELECT Id, OpenSF__StoryPoints__c FROM OpenSF__Card__c ORDER BY OpenSF__Subject__c];
    }

    static OpenSF__Sprint__c createPlanningSprint(Id boardId) {
        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            OpenSF__Board__c = boardId,
            OpenSF__Goal__c = 'Test Sprint Goal',
            OpenSF__Status__c = 'Planning',
            OpenSF__StartDate__c = Date.today(),
            OpenSF__EndDate__c = Date.today().addDays(14),
            OpenSF__SprintNumber__c = 1,
            OpenSF__TotalStoryPoints__c = 0,
            OpenSF__CompletedStoryPoints__c = 0
        );
        insert sprint;
        return sprint;
    }

    @IsTest
    static void testCreateSprint() {
        OpenSF__Board__c board = getBoard();

        AgentCreateSprint.Request req = new AgentCreateSprint.Request();
        req.boardId = board.Id;
        req.goal = 'Sprint Goal';
        req.startDate = Date.today();
        req.endDate = Date.today().addDays(14);

        Test.startTest();
        List<AgentCreateSprint.Response> responses = AgentCreateSprint.createSprints(
            new List<AgentCreateSprint.Request>{ req }
        );
        Test.stopTest();

        AgentCreateSprint.Response res = responses[0];
        System.assertNotEquals(null, res.sprintId, 'Sprint Id should be set');
        System.assertEquals(1, res.sprintNumber, 'First sprint should be number 1');
        System.assert(res.message.contains('successfully'), 'Should succeed');

        OpenSF__Sprint__c created = [
            SELECT OpenSF__Goal__c, OpenSF__Status__c
            FROM OpenSF__Sprint__c
            WHERE Id = :res.sprintId
        ];
        System.assertEquals('Sprint Goal', created.OpenSF__Goal__c);
        System.assertEquals('Planning', created.OpenSF__Status__c);
    }

    @IsTest
    static void testStartSprint() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);

        AgentStartSprint.Request req = new AgentStartSprint.Request();
        req.sprintId = sprint.Id;

        Test.startTest();
        List<AgentStartSprint.Response> responses = AgentStartSprint.startSprints(
            new List<AgentStartSprint.Request>{ req }
        );
        Test.stopTest();

        AgentStartSprint.Response res = responses[0];
        System.assertEquals(true, res.success, 'Start should succeed');

        OpenSF__Sprint__c updated = [
            SELECT OpenSF__Status__c
            FROM OpenSF__Sprint__c
            WHERE Id = :sprint.Id
        ];
        System.assertEquals('Active', updated.OpenSF__Status__c);
    }

    @IsTest
    static void testStartSprintNotPlanning() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);

        // Start the sprint first
        sprint.OpenSF__Status__c = 'Active';
        update sprint;

        AgentStartSprint.Request req = new AgentStartSprint.Request();
        req.sprintId = sprint.Id;

        Test.startTest();
        List<AgentStartSprint.Response> responses = AgentStartSprint.startSprints(
            new List<AgentStartSprint.Request>{ req }
        );
        Test.stopTest();

        AgentStartSprint.Response res = responses[0];
        System.assertEquals(false, res.success, 'Should fail for non-Planning sprint');
        System.assert(res.message.contains('Planning'), 'Message should mention Planning status');
    }

    @IsTest
    static void testCompleteSprint() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);

        // Make it active
        sprint.OpenSF__Status__c = 'Active';
        update sprint;

        board.OpenSF__ActiveSprint__c = sprint.Id;
        update board;

        AgentCompleteSprint.Request req = new AgentCompleteSprint.Request();
        req.sprintId = sprint.Id;
        req.moveIncompleteToBacklog = true;

        Test.startTest();
        List<AgentCompleteSprint.Response> responses = AgentCompleteSprint.completeSprints(
            new List<AgentCompleteSprint.Request>{ req }
        );
        Test.stopTest();

        AgentCompleteSprint.Response res = responses[0];
        System.assertEquals(true, res.success, 'Complete should succeed');

        OpenSF__Sprint__c updated = [
            SELECT OpenSF__Status__c
            FROM OpenSF__Sprint__c
            WHERE Id = :sprint.Id
        ];
        System.assertEquals('Completed', updated.OpenSF__Status__c);
    }

    @IsTest
    static void testAddCardsToSprint() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);
        List<OpenSF__Card__c> cards = getCards();

        List<Id> cardIds = new List<Id>();
        for (OpenSF__Card__c c : cards) {
            cardIds.add(c.Id);
        }

        AgentAddCardsToSprint.Request req = new AgentAddCardsToSprint.Request();
        req.sprintId = sprint.Id;
        req.cardIds = cardIds;

        Test.startTest();
        List<AgentAddCardsToSprint.Response> responses = AgentAddCardsToSprint.addCardsToSprints(
            new List<AgentAddCardsToSprint.Request>{ req }
        );
        Test.stopTest();

        AgentAddCardsToSprint.Response res = responses[0];
        System.assertEquals(cards.size(), res.addedCount, 'All cards should be added');
        System.assert(res.totalSprintPoints >= 0, 'Total sprint points should be calculated');

        Integer linkCount = [
            SELECT COUNT()
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__c = :sprint.Id AND OpenSF__RemovedDate__c = NULL
        ];
        System.assertEquals(cards.size(), linkCount, 'SprintCard records should exist');
    }

    @IsTest
    static void testRemoveCardFromSprint() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);
        OpenSF__Card__c card = getCards()[0];

        // Add card to sprint first
        OpenSF__SprintCard__c sc = new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint.Id,
            OpenSF__Card__c = card.Id,
            OpenSF__AddedDate__c = Date.today(),
            OpenSF__StoryPointsAtAdd__c = card.OpenSF__StoryPoints__c
        );
        insert sc;

        AgentRemoveCardFromSprint.Request req = new AgentRemoveCardFromSprint.Request();
        req.sprintId = sprint.Id;
        req.cardId = card.Id;

        Test.startTest();
        List<AgentRemoveCardFromSprint.Response> responses = AgentRemoveCardFromSprint.removeCards(
            new List<AgentRemoveCardFromSprint.Request>{ req }
        );
        Test.stopTest();

        AgentRemoveCardFromSprint.Response res = responses[0];
        System.assertEquals(true, res.success, 'Remove should succeed');

        OpenSF__SprintCard__c updated = [
            SELECT OpenSF__RemovedDate__c
            FROM OpenSF__SprintCard__c
            WHERE Id = :sc.Id
        ];
        System.assertNotEquals(null, updated.OpenSF__RemovedDate__c, 'RemovedDate should be set');
    }

    @IsTest
    static void testGetSprintStatus() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Sprint__c sprint = createPlanningSprint(board.Id);

        // Make it active
        sprint.OpenSF__Status__c = 'Active';
        update sprint;

        AgentGetSprintStatus.Request req = new AgentGetSprintStatus.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentGetSprintStatus.Response> responses = AgentGetSprintStatus.getSprintStatuses(
            new List<AgentGetSprintStatus.Request>{ req }
        );
        Test.stopTest();

        AgentGetSprintStatus.Response res = responses[0];
        System.assertNotEquals(null, res.sprintId, 'Sprint Id should be set');
        System.assertEquals('Active', res.status);
        System.assertNotEquals(null, res.daysRemaining, 'Days remaining should be calculated');
    }

    @IsTest
    static void testGetSprintStatusNoActiveSprint() {
        OpenSF__Board__c board = getBoard();

        AgentGetSprintStatus.Request req = new AgentGetSprintStatus.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentGetSprintStatus.Response> responses = AgentGetSprintStatus.getSprintStatuses(
            new List<AgentGetSprintStatus.Request>{ req }
        );
        Test.stopTest();

        AgentGetSprintStatus.Response res = responses[0];
        System.assertEquals(null, res.sprintId, 'Sprint Id should be null');
        System.assert(res.message.contains('No active sprint'), 'Should indicate no active sprint');
    }

    @IsTest
    static void testGetBacklog() {
        OpenSF__Board__c board = getBoard();

        // card2 has no column, so it is a backlog card
        AgentGetBacklog.Request req = new AgentGetBacklog.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentGetBacklog.Response> responses = AgentGetBacklog.getBacklogs(
            new List<AgentGetBacklog.Request>{ req }
        );
        Test.stopTest();

        AgentGetBacklog.Response res = responses[0];
        System.assert(res.totalCount >= 1, 'Should find at least one backlog card');
        System.assertNotEquals(null, res.cards, 'Cards list should not be null');
    }

    @IsTest
    static void testGetBacklogNeedsRefinement() {
        OpenSF__Board__c board = getBoard();

        // Update card2 (backlog card) to need refinement
        OpenSF__Card__c card2 = [
            SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Subject__c = 'Test Card 2' LIMIT 1
        ];
        card2.OpenSF__NeedsRefinement__c = true;
        update card2;

        AgentGetBacklog.Request req = new AgentGetBacklog.Request();
        req.boardId = board.Id;
        req.needsRefinementOnly = true;

        Test.startTest();
        List<AgentGetBacklog.Response> responses = AgentGetBacklog.getBacklogs(
            new List<AgentGetBacklog.Request>{ req }
        );
        Test.stopTest();

        AgentGetBacklog.Response res = responses[0];
        System.assert(res.totalCount >= 1, 'Should find at least one card needing refinement');
        for (AgentGetBacklog.BacklogCardResult bcr : res.cards) {
            System.assertEquals(true, bcr.needsRefinement, 'All returned cards should need refinement');
        }
    }
}
