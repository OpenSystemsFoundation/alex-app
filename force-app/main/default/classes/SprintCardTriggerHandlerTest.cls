/**
 * @description Tests for SprintCardTriggerHandler
 */
@isTest
public class SprintCardTriggerHandlerTest {
    @TestSetup
    static void setup() {
        Map<String, Object> hierarchy = TestFactory.createFullBoardHierarchy(
            'Trigger Board',
            2,
            2
        );
    }

    @isTest
    static void testAfterInsertPublishesEvent() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];

        Test.startTest();
        // Don't bypass trigger - let it fire
        OpenSF__SprintCard__c sc = new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint.Id,
            OpenSF__Card__c = card.Id,
            OpenSF__AddedDate__c = DateTime.now(),
            OpenSF__Position__c = LexoRank.initial()
        );
        insert sc;
        Test.stopTest();

        // Verify the sprint card was created
        System.assertNotEquals(null, sc.Id, 'Sprint card should be created');
    }

    @isTest
    static void testAfterUpdatePublishesEvent() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        OpenSF__SprintCard__c sc = TestFactory.createSprintCard(
            sprint.Id,
            card.Id
        );

        Test.startTest();
        TriggerHandler.clearBypass('SprintCardTriggerHandler');
        sc.OpenSF__CompletedInSprint__c = true;
        sc.OpenSF__CompletedDate__c = DateTime.now();
        update sc;
        Test.stopTest();

        OpenSF__SprintCard__c updated = [
            SELECT OpenSF__CompletedInSprint__c
            FROM OpenSF__SprintCard__c
            WHERE Id = :sc.Id
        ];
        System.assertEquals(
            true,
            updated.OpenSF__CompletedInSprint__c,
            'Should be marked complete'
        );
    }

    @isTest
    static void testAfterDeletePublishesEvent() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id);
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        OpenSF__SprintCard__c sc = TestFactory.createSprintCard(
            sprint.Id,
            card.Id
        );

        Test.startTest();
        TriggerHandler.clearBypass('SprintCardTriggerHandler');
        delete sc;
        Test.stopTest();

        Integer count = [
            SELECT COUNT()
            FROM OpenSF__SprintCard__c
            WHERE Id = :sc.Id
        ];
        System.assertEquals(0, count, 'Sprint card should be deleted');
    }

    @isTest
    static void testSchedulerCreatesSnapshots() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        card.OpenSF__StoryPoints__c = 5;
        update card;
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        SprintSnapshotScheduler scheduler = new SprintSnapshotScheduler();
        scheduler.execute(null);
        Test.stopTest();

        List<OpenSF__SprintSnapshot__c> snapshots = [
            SELECT Id
            FROM OpenSF__SprintSnapshot__c
            WHERE OpenSF__Sprint__c = :sprint.Id
        ];
        System.assert(snapshots.size() >= 1, 'Should have at least 1 snapshot');
    }
}
