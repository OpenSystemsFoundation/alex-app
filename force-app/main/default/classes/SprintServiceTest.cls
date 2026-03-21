/**
 * @description Tests for SprintService
 */
@isTest
private class SprintServiceTest {
    @TestSetup
    static void setup() {
        Map<String, Object> hierarchy = TestFactory.createFullBoardHierarchy(
            'Sprint Board',
            3,
            3
        );
    }

    @isTest
    static void testCreateSprint() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];

        Test.startTest();
        KanbanBoardDTO.SprintDTO result = SprintService.createSprint(
            board.Id,
            'Sprint Goal',
            Date.today(),
            Date.today().addDays(14)
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Sprint should be created');
        System.assertEquals(
            'Planning',
            result.status,
            'Status should be Planning'
        );
        System.assertEquals('Sprint Goal', result.goal, 'Goal should match');
        System.assertEquals(
            1,
            result.sprintNumber,
            'Should be sprint number 1'
        );
    }

    @isTest
    static void testStartSprint() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__StoryPoints__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
        card.OpenSF__StoryPoints__c = 5;
        update card;
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        KanbanBoardDTO.SprintDTO result = SprintService.startSprint(sprint.Id);
        Test.stopTest();

        System.assertEquals('Active', result.status, 'Sprint should be Active');
        OpenSF__Board__c updatedBoard = [
            SELECT OpenSF__ActiveSprint__c
            FROM OpenSF__Board__c
            WHERE Id = :board.Id
        ];
        System.assertEquals(
            sprint.Id,
            updatedBoard.OpenSF__ActiveSprint__c,
            'Board should reference active sprint'
        );
    }

    @isTest
    static void testStartSprintAlreadyActive() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c activeSprint = TestFactory.createSprint(
            board.Id,
            'Active'
        );
        OpenSF__Sprint__c newSprint = TestFactory.createSprint(
            board.Id,
            'Planning'
        );

        Test.startTest();
        Boolean exceptionThrown = false;
        try {
            SprintService.startSprint(newSprint.Id);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        System.assert(
            exceptionThrown,
            'Should have thrown AuraHandledException'
        );
        Test.stopTest();
    }

    @isTest
    static void testCompleteSprint() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        board.OpenSF__ActiveSprint__c = sprint.Id;
        update board;

        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c LIMIT 3];
        for (OpenSF__Card__c card : cards) {
            card.OpenSF__StoryPoints__c = 3;
        }
        update cards;

        OpenSF__SprintCard__c sc1 = TestFactory.createSprintCard(
            sprint.Id,
            cards[0].Id
        );
        sc1.OpenSF__CompletedInSprint__c = true;
        sc1.OpenSF__CompletedDate__c = DateTime.now();
        update sc1;
        TestFactory.createSprintCard(sprint.Id, cards[1].Id);

        Map<Id, String> dispositions = new Map<Id, String>();
        dispositions.put(cards[1].Id, 'backlog');

        Test.startTest();
        KanbanBoardDTO.SprintDTO result = SprintService.completeSprint(
            sprint.Id,
            dispositions
        );
        Test.stopTest();

        System.assertEquals(
            'Completed',
            result.status,
            'Sprint should be Completed'
        );
        OpenSF__Board__c updatedBoard = [
            SELECT OpenSF__ActiveSprint__c
            FROM OpenSF__Board__c
            WHERE Id = :board.Id
        ];
        System.assertEquals(
            null,
            updatedBoard.OpenSF__ActiveSprint__c,
            'Active sprint should be cleared'
        );
    }

    @isTest
    static void testAddCardsToSprint() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c LIMIT 3];
        List<Id> cardIds = new List<Id>();
        for (OpenSF__Card__c card : cards) {
            cardIds.add(card.Id);
        }

        Test.startTest();
        List<KanbanBoardDTO.SprintCardDTO> result = SprintService.addCardsToSprint(
            sprint.Id,
            cardIds
        );
        Test.stopTest();

        System.assertEquals(3, result.size(), 'Should have 3 sprint cards');
    }

    @isTest
    static void testAddDuplicateCards() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        List<KanbanBoardDTO.SprintCardDTO> result = SprintService.addCardsToSprint(
            sprint.Id,
            new List<Id>{ card.Id }
        );
        Test.stopTest();

        // Should not create duplicate
        Integer count = [
            SELECT COUNT()
            FROM OpenSF__SprintCard__c
            WHERE
                OpenSF__Sprint__c = :sprint.Id
                AND OpenSF__Card__c = :card.Id
                AND OpenSF__RemovedDate__c = NULL
        ];
        System.assertEquals(1, count, 'Should not have duplicate sprint cards');
    }

    @isTest
    static void testRemoveCardFromSprint() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        SprintService.removeCardFromSprint(sprint.Id, card.Id);
        Test.stopTest();

        OpenSF__SprintCard__c sc = [
            SELECT OpenSF__RemovedDate__c
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__c = :sprint.Id AND OpenSF__Card__c = :card.Id
        ];
        System.assertNotEquals(
            null,
            sc.OpenSF__RemovedDate__c,
            'Should be soft-deleted'
        );
    }

    @isTest
    static void testGetSprintData() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        SprintService.SprintBoardData result = SprintService.getSprintData(
            board.Id
        );
        Test.stopTest();

        System.assertNotEquals(
            null,
            result.activeSprint,
            'Should have active sprint'
        );
        System.assert(!result.sprints.isEmpty(), 'Should have sprints list');
    }

    @isTest
    static void testCreateDailySnapshot() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        card.OpenSF__StoryPoints__c = 8;
        update card;
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        SprintService.createDailySnapshot(sprint.Id);
        Test.stopTest();

        List<OpenSF__SprintSnapshot__c> snapshots = [
            SELECT Id, OpenSF__TotalPoints__c
            FROM OpenSF__SprintSnapshot__c
            WHERE OpenSF__Sprint__c = :sprint.Id
        ];
        System.assertEquals(1, snapshots.size(), 'Should have 1 snapshot');
        System.assertEquals(
            8,
            snapshots[0].OpenSF__TotalPoints__c,
            'Total points should be 8'
        );
    }

    @isTest
    static void testGetBurndownData() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        TestFactory.createSprintSnapshot(
            sprint.Id,
            Date.today().addDays(-2),
            20,
            15
        );
        TestFactory.createSprintSnapshot(
            sprint.Id,
            Date.today().addDays(-1),
            20,
            10
        );

        Test.startTest();
        List<KanbanBoardDTO.SprintSnapshotDTO> result = SprintService.getBurndownData(
            sprint.Id
        );
        Test.stopTest();

        System.assertEquals(2, result.size(), 'Should have 2 snapshots');
    }

    @isTest
    static void testGetVelocityData() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Completed'
        );
        sprint.OpenSF__Velocity__c = 25;
        sprint.OpenSF__CompletedStoryPoints__c = 25;
        update sprint;

        Test.startTest();
        List<KanbanBoardDTO.SprintDTO> result = SprintService.getVelocityData(
            board.Id,
            5
        );
        Test.stopTest();

        System.assertEquals(1, result.size(), 'Should have 1 completed sprint');
    }

    @isTest
    static void testMarkCardCompleted() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Sprint__c sprint = TestFactory.createSprint(board.Id, 'Active');
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        card.OpenSF__StoryPoints__c = 5;
        update card;
        TestFactory.createSprintCard(sprint.Id, card.Id);

        Test.startTest();
        SprintService.markCardCompleted(sprint.Id, card.Id);
        Test.stopTest();

        OpenSF__SprintCard__c sc = [
            SELECT OpenSF__CompletedInSprint__c, OpenSF__CompletedDate__c
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Sprint__c = :sprint.Id AND OpenSF__Card__c = :card.Id
        ];
        System.assertEquals(
            true,
            sc.OpenSF__CompletedInSprint__c,
            'Should be marked complete'
        );
        System.assertNotEquals(
            null,
            sc.OpenSF__CompletedDate__c,
            'Should have completion date'
        );
    }
}
