@IsTest
private class AgentEstimationActionsTest {
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

    static OpenSF__Card__c getCard(String subject) {
        return [SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Subject__c = :subject LIMIT 1];
    }

    @IsTest
    static void testEstimateStoryPointsBug() {
        OpenSF__Card__c card = getCard('Test Card 2');

        AgentEstimateStoryPoints.Request req = new AgentEstimateStoryPoints.Request();
        req.cardId = card.Id;

        Test.startTest();
        List<AgentEstimateStoryPoints.Response> responses = AgentEstimateStoryPoints.execute(
            new List<AgentEstimateStoryPoints.Request>{ req }
        );
        Test.stopTest();

        AgentEstimateStoryPoints.Response res = responses[0];
        System.assertNotEquals(null, res.estimatedPoints, 'Estimated points should not be null');
        System.assert(res.estimatedPoints > 0, 'Estimated points should be positive');
        System.assertNotEquals(null, res.confidence, 'Confidence should be set');
        System.assertNotEquals(null, res.reasoning, 'Reasoning should be set');
        System.assertEquals(3, res.currentPoints, 'Current points should match existing value');
        System.assert(res.message.contains('Estimated'), 'Message should indicate estimation');
    }

    @IsTest
    static void testEstimateStoryPointsEpic() {
        OpenSF__Board__c board = getBoard();

        OpenSF__Card__c epicCard = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Epic Feature',
            OpenSF__Description__c = 'A large epic feature requiring significant effort',
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'High',
            OpenSF__CardType__c = 'Epic',
            OpenSF__SequenceNumber__c = 3,
            OpenSF__LexoRankPosition__c = 'c'
        );
        insert epicCard;

        AgentEstimateStoryPoints.Request req = new AgentEstimateStoryPoints.Request();
        req.cardId = epicCard.Id;

        Test.startTest();
        List<AgentEstimateStoryPoints.Response> responses = AgentEstimateStoryPoints.execute(
            new List<AgentEstimateStoryPoints.Request>{ req }
        );
        Test.stopTest();

        AgentEstimateStoryPoints.Response res = responses[0];
        // Epic base is 13, High priority +2 = 15, mapped to fibonacci 13
        System.assert(res.estimatedPoints >= 13, 'Epic should have high estimated points');
        System.assert(res.reasoning.contains('Epic'), 'Reasoning should mention Epic type');
    }

    @IsTest
    static void testEstimateStoryPointsComplexity() {
        OpenSF__Board__c board = getBoard();

        OpenSF__Card__c complexCard = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Build API integration for payments',
            OpenSF__Description__c = 'Implement a new API integration with external payment provider',
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'High',
            OpenSF__CardType__c = 'Story',
            OpenSF__SequenceNumber__c = 3,
            OpenSF__LexoRankPosition__c = 'c'
        );
        insert complexCard;

        AgentEstimateStoryPoints.Request req = new AgentEstimateStoryPoints.Request();
        req.cardId = complexCard.Id;

        Test.startTest();
        List<AgentEstimateStoryPoints.Response> responses = AgentEstimateStoryPoints.execute(
            new List<AgentEstimateStoryPoints.Request>{ req }
        );
        Test.stopTest();

        AgentEstimateStoryPoints.Response res = responses[0];
        System.assert(res.reasoning.contains('integration/API/migration'), 'Reasoning should flag complexity keywords');
        // Story base 5 + High +2 + complexity +3 = 10, mapped to 8
        System.assert(res.estimatedPoints >= 8, 'Complex card should have higher estimate');
    }

    @IsTest
    static void testEstimateStoryPointsSimple() {
        OpenSF__Board__c board = getBoard();

        OpenSF__Card__c simpleCard = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Fix minor typo fix in header',
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'Low',
            OpenSF__CardType__c = 'Task',
            OpenSF__SequenceNumber__c = 3,
            OpenSF__LexoRankPosition__c = 'c'
        );
        insert simpleCard;

        AgentEstimateStoryPoints.Request req = new AgentEstimateStoryPoints.Request();
        req.cardId = simpleCard.Id;

        Test.startTest();
        List<AgentEstimateStoryPoints.Response> responses = AgentEstimateStoryPoints.execute(
            new List<AgentEstimateStoryPoints.Request>{ req }
        );
        Test.stopTest();

        AgentEstimateStoryPoints.Response res = responses[0];
        System.assert(res.reasoning.contains('simple/minor/typo/text change'), 'Reasoning should flag simplicity keywords');
        // Task base 2 + Low -1 + simplicity -2 + no desc -1 = -2, clamped to 1
        System.assert(res.estimatedPoints <= 2, 'Simple card should have low estimate');
    }

    @IsTest
    static void testEstimateStoryPointsCardNotFound() {
        // Use a fabricated ID that does not exist
        Id fakeCardId = OpenSF__Card__c.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

        AgentEstimateStoryPoints.Request req = new AgentEstimateStoryPoints.Request();
        req.cardId = fakeCardId;

        Test.startTest();
        List<AgentEstimateStoryPoints.Response> responses = AgentEstimateStoryPoints.execute(
            new List<AgentEstimateStoryPoints.Request>{ req }
        );
        Test.stopTest();

        AgentEstimateStoryPoints.Response res = responses[0];
        System.assertEquals(null, res.estimatedPoints, 'Estimated points should be null for missing card');
        System.assert(res.message.contains('Card not found'), 'Message should indicate card not found');
    }

    @IsTest
    static void testAnalyzeSprintCapacity() {
        OpenSF__Board__c board = getBoard();

        // Create completed sprints for velocity history
        OpenSF__Sprint__c sprint1 = new OpenSF__Sprint__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Goal__c = 'Sprint 1',
            OpenSF__Status__c = 'Completed',
            OpenSF__StartDate__c = Date.today().addDays(-28),
            OpenSF__EndDate__c = Date.today().addDays(-14),
            OpenSF__SprintNumber__c = 1,
            OpenSF__TotalStoryPoints__c = 20,
            OpenSF__CompletedStoryPoints__c = 16,
            OpenSF__Velocity__c = 16
        );
        OpenSF__Sprint__c sprint2 = new OpenSF__Sprint__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Goal__c = 'Sprint 2',
            OpenSF__Status__c = 'Completed',
            OpenSF__StartDate__c = Date.today().addDays(-14),
            OpenSF__EndDate__c = Date.today(),
            OpenSF__SprintNumber__c = 2,
            OpenSF__TotalStoryPoints__c = 22,
            OpenSF__CompletedStoryPoints__c = 20,
            OpenSF__Velocity__c = 20
        );
        insert new List<OpenSF__Sprint__c>{ sprint1, sprint2 };

        AgentAnalyzeSprintCapacity.Request req = new AgentAnalyzeSprintCapacity.Request();
        req.boardId = board.Id;
        req.proposedSprintDays = 14;

        Test.startTest();
        List<AgentAnalyzeSprintCapacity.Response> responses = AgentAnalyzeSprintCapacity.execute(
            new List<AgentAnalyzeSprintCapacity.Request>{ req }
        );
        Test.stopTest();

        AgentAnalyzeSprintCapacity.Response res = responses[0];
        System.assertEquals(18.0, res.averageVelocity, 'Average velocity should be (16+20)/2 = 18.0');
        System.assertNotEquals(null, res.suggestedPointCapacity, 'Suggested capacity should be set');
        System.assertNotEquals(null, res.backlogCardCount, 'Backlog card count should be set');
        System.assertNotEquals(null, res.teamCanHandle, 'Capacity assessment should be set');
        System.assertNotEquals(null, res.historicalSprints, 'Historical sprints JSON should not be null');
    }

    @IsTest
    static void testAnalyzeSprintCapacityNoHistory() {
        OpenSF__Board__c board = getBoard();

        AgentAnalyzeSprintCapacity.Request req = new AgentAnalyzeSprintCapacity.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentAnalyzeSprintCapacity.Response> responses = AgentAnalyzeSprintCapacity.execute(
            new List<AgentAnalyzeSprintCapacity.Request>{ req }
        );
        Test.stopTest();

        AgentAnalyzeSprintCapacity.Response res = responses[0];
        System.assertEquals(0, res.averageVelocity, 'Average velocity should be 0 with no history');
        System.assertEquals('Under Capacity', res.teamCanHandle, 'Should report Under Capacity with no velocity data');
        System.assert(res.message.contains('No completed sprints'), 'Message should indicate no completed sprints');
    }
}
