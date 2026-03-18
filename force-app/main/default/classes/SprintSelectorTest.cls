/**
 * @description Tests for SprintSelector
 */
@isTest
public class SprintSelectorTest {
    @TestSetup
    static void setup() {
        Map<String, Object> hierarchy = TestFactory.createFullBoardHierarchy(
            'Selector Board',
            2,
            2
        );
    }

    @isTest
    static void testGetSprintById() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);

        Test.startTest();
        OpenSF__Sprint__c result = SprintSelector.getSprintById(sprint.Id);
        Test.stopTest();

        System.assertEquals(
            sprint.Id,
            result.Id,
            'Should return correct sprint'
        );
    }

    @isTest
    static void testGetSprintsByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        TestFactory.createSprint(board.Id, 'Planning');
        TestFactory.createSprint(board.Id, 'Active');

        Test.startTest();
        List<OpenSF__Sprint__c> result = SprintSelector.getSprintsByBoardId(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(2, result.size(), 'Should return 2 sprints');
    }

    @isTest
    static void testGetActiveSprintByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        TestFactory.createSprint(board.Id, 'Planning');
        OpenSF__Sprint__c active = TestFactory.createSprint(board.Id, 'Active');

        Test.startTest();
        OpenSF__Sprint__c result = SprintSelector.getActiveSprintByBoardId(
            board.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should find active sprint');
        System.assertEquals(
            active.Id,
            result.Id,
            'Should return the active sprint'
        );
    }

    @isTest
    static void testGetActiveSprintByBoardIdNone() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        TestFactory.createSprint(board.Id, 'Planning');

        Test.startTest();
        OpenSF__Sprint__c result = SprintSelector.getActiveSprintByBoardId(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(
            null,
            result,
            'Should return null when no active sprint'
        );
    }

    @isTest
    static void testGetSprintCardsBySprintId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c LIMIT 2];
        TestFactory.createSprintCard(sprint.Id, cards[0].Id);
        TestFactory.createSprintCard(sprint.Id, cards[1].Id);

        Test.startTest();
        List<OpenSF__SprintCard__c> result = SprintSelector.getSprintCardsBySprintId(
            sprint.Id
        );
        Test.stopTest();

        System.assertEquals(2, result.size(), 'Should return 2 sprint cards');
    }

    @isTest
    static void testGetBacklogCardsByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c LIMIT 4];
        // Put first 2 in sprint
        TestFactory.createSprintCard(sprint.Id, cards[0].Id);
        TestFactory.createSprintCard(sprint.Id, cards[1].Id);

        Test.startTest();
        List<OpenSF__Card__c> result = SprintSelector.getBacklogCardsByBoardId(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(
            2,
            result.size(),
            'Should return 2 backlog cards (not in sprint)'
        );
    }

    @isTest
    static void testGetSnapshotsBySprintId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);
        TestFactory.createSprintSnapshot(
            sprint.Id,
            Date.today().addDays(-1),
            20,
            15
        );
        TestFactory.createSprintSnapshot(sprint.Id, Date.today(), 20, 10);

        Test.startTest();
        List<OpenSF__SprintSnapshot__c> result = SprintSelector.getSnapshotsBySprintId(
            sprint.Id
        );
        Test.stopTest();

        System.assertEquals(2, result.size(), 'Should return 2 snapshots');
    }

    @isTest
    static void testGetCompletedSprintsByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        TestFactory.createSprint(board.Id, 'Completed');
        TestFactory.createSprint(board.Id, 'Completed');
        TestFactory.createSprint(board.Id, 'Active');

        Test.startTest();
        List<OpenSF__Sprint__c> result = SprintSelector.getCompletedSprintsByBoardId(
            board.Id,
            10
        );
        Test.stopTest();

        System.assertEquals(
            2,
            result.size(),
            'Should return 2 completed sprints'
        );
    }

    @isTest
    static void testGetAllActiveSprints() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        TestFactory.createSprint(board.Id, 'Active');
        TestFactory.createSprint(board.Id, 'Planning');

        Test.startTest();
        List<OpenSF__Sprint__c> result = SprintSelector.getAllActiveSprints();
        Test.stopTest();

        System.assert(
            result.size() >= 1,
            'Should return at least 1 active sprint'
        );
    }
}
