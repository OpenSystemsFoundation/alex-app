@IsTest
private class AgentBoardActionsTest {
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

    @IsTest
    static void testGetBoardSummary() {
        OpenSF__Board__c board = getBoard();

        AgentGetBoardSummary.Request req = new AgentGetBoardSummary.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentGetBoardSummary.Response> responses = AgentGetBoardSummary.execute(
            new List<AgentGetBoardSummary.Request>{ req }
        );
        Test.stopTest();

        AgentGetBoardSummary.Response res = responses[0];
        System.assertEquals(3, res.columnCount, 'Board should have 3 columns');
        System.assertEquals(
            'Sprint',
            res.boardType,
            'Board type should be Sprint'
        );
        System.assertNotEquals(
            null,
            res.columns,
            'Columns JSON should not be null'
        );
        System.assert(res.message.contains('Successfully'), 'Should succeed');
    }

    @IsTest
    static void testGetBurndown() {
        OpenSF__Board__c board = getBoard();

        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Goal__c = 'Burndown Sprint',
            OpenSF__Status__c = 'Active',
            OpenSF__StartDate__c = Date.today().addDays(-7),
            OpenSF__EndDate__c = Date.today().addDays(7),
            OpenSF__SprintNumber__c = 1,
            OpenSF__TotalStoryPoints__c = 20,
            OpenSF__CompletedStoryPoints__c = 8
        );
        insert sprint;

        OpenSF__SprintSnapshot__c snap = new OpenSF__SprintSnapshot__c(
            OpenSF__Sprint__c = sprint.Id,
            OpenSF__SnapshotDate__c = Date.today(),
            OpenSF__TotalPoints__c = 20,
            OpenSF__RemainingPoints__c = 12,
            OpenSF__CompletedPoints__c = 8
        );
        insert snap;

        AgentGetBurndown.Request req = new AgentGetBurndown.Request();
        req.sprintId = sprint.Id;

        Test.startTest();
        List<AgentGetBurndown.Response> responses = AgentGetBurndown.execute(
            new List<AgentGetBurndown.Request>{ req }
        );
        Test.stopTest();

        AgentGetBurndown.Response res = responses[0];
        System.assertNotEquals(
            null,
            res.snapshots,
            'Snapshots should not be null'
        );
        System.assertNotEquals(
            '[]',
            res.snapshots,
            'Snapshots should not be empty'
        );
        System.assert(
            res.message.contains('1 burndown snapshots'),
            'Should report snapshot count'
        );
    }

    @IsTest
    static void testGetVelocity() {
        OpenSF__Board__c board = getBoard();

        OpenSF__Sprint__c sprint1 = new OpenSF__Sprint__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Goal__c = 'Sprint 1',
            OpenSF__Status__c = 'Completed',
            OpenSF__StartDate__c = Date.today().addDays(-28),
            OpenSF__EndDate__c = Date.today().addDays(-14),
            OpenSF__SprintNumber__c = 1,
            OpenSF__TotalStoryPoints__c = 20,
            OpenSF__CompletedStoryPoints__c = 18,
            OpenSF__Velocity__c = 18
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

        AgentGetVelocity.Request req = new AgentGetVelocity.Request();
        req.boardId = board.Id;
        req.sprintCount = 5;

        Test.startTest();
        List<AgentGetVelocity.Response> responses = AgentGetVelocity.execute(
            new List<AgentGetVelocity.Request>{ req }
        );
        Test.stopTest();

        AgentGetVelocity.Response res = responses[0];
        System.assertEquals(
            19.0,
            res.averageVelocity,
            'Average velocity should be (18+20)/2 = 19.0'
        );
        System.assertNotEquals(
            null,
            res.sprints,
            'Sprints JSON should not be null'
        );
        System.assert(
            res.message.contains('2 sprints'),
            'Should report sprint count'
        );
    }

    @IsTest
    static void testGetBoardLayout() {
        OpenSF__Board__c board = getBoard();

        AgentGetBoardLayout.Request req = new AgentGetBoardLayout.Request();
        req.boardId = board.Id;

        Test.startTest();
        List<AgentGetBoardLayout.Response> responses = AgentGetBoardLayout.execute(
            new List<AgentGetBoardLayout.Request>{ req }
        );
        Test.stopTest();

        AgentGetBoardLayout.Response res = responses[0];
        System.assertNotEquals(
            null,
            res.columns,
            'Columns JSON should not be null'
        );
        System.assertNotEquals(
            '[]',
            res.columns,
            'Columns should not be empty'
        );
        System.assert(
            res.message.contains('3 columns'),
            'Should report 3 columns'
        );
    }
}
