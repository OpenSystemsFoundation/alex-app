/**
 * RecordLinkingServiceTest - Test class for RecordLinkingService
 * Tests record linking CRUD, search, and bidirectional status sync
 */
@isTest
public class RecordLinkingServiceTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestFactory.createColumn(board.Id, 'To Do');
        TestFactory.createCard(column.Id, 'Test Card');
    }

    private static OpenSF__Card__c getTestCard() {
        return [
            SELECT Id, OpenSF__Subject__c, OpenSF__Status__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
    }

    @isTest
    static void testLinkRecord() {
        OpenSF__Card__c card = getTestCard();

        // Create a Case to link
        Case testCase = new Case(Subject = 'Test Case', Status = 'New');
        insert testCase;

        Test.startTest();
        KanbanBoardDTO.LinkedRecordDTO result = RecordLinkingService.linkRecord(
            card.Id,
            testCase.Id,
            'Case',
            true,
            '{"To Do":"New","In Progress":"Working","Done":"Closed"}'
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Link should be created');
        System.assertEquals(card.Id, result.cardId, 'Card ID should match');
        System.assertEquals(
            String.valueOf(testCase.Id),
            result.recordId,
            'Record ID should match'
        );
        System.assertEquals('Case', result.sObjectType, 'Type should be Case');
        System.assertEquals(true, result.syncEnabled, 'Sync should be enabled');
        System.assertEquals(
            'Test Case',
            result.recordName,
            'Record name should match'
        );
    }

    @isTest
    static void testGetLinkedRecords() {
        OpenSF__Card__c card = getTestCard();

        Case testCase = new Case(Subject = 'Test Case', Status = 'New');
        insert testCase;

        // Create link directly
        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'Test Case',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = true
        );
        insert link;

        Test.startTest();
        List<KanbanBoardDTO.LinkedRecordDTO> results = RecordLinkingService.getLinkedRecords(
            card.Id
        );
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one linked record');
        System.assertEquals(
            'Test Case',
            results[0].recordName,
            'Name should match'
        );
    }

    @isTest
    static void testUnlinkRecord() {
        OpenSF__Card__c card = getTestCard();

        Case testCase = new Case(Subject = 'Test Case', Status = 'New');
        insert testCase;

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'Test Case',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = false
        );
        insert link;

        Test.startTest();
        RecordLinkingService.unlinkRecord(link.Id);
        Test.stopTest();

        List<OpenSF__LinkedRecord__c> remaining = [
            SELECT Id
            FROM OpenSF__LinkedRecord__c
            WHERE OpenSF__Card__c = :card.Id
        ];
        System.assertEquals(0, remaining.size(), 'Link should be deleted');
    }

    @isTest
    static void testSearchRecords() {
        Case testCase = new Case(Subject = 'Searchable Case', Status = 'New');
        insert testCase;

        Test.startTest();
        List<RecordLinkingService.RecordSearchResult> results = RecordLinkingService.searchRecords(
            'Searchable',
            'Case'
        );
        Test.stopTest();

        System.assert(!results.isEmpty(), 'Should find the case');
        System.assertEquals(
            'Searchable Case',
            results[0].name,
            'Name should match'
        );
    }

    @isTest
    static void testSearchRecordsTooShort() {
        Test.startTest();
        List<RecordLinkingService.RecordSearchResult> results = RecordLinkingService.searchRecords(
            'a',
            'Case'
        );
        Test.stopTest();

        System.assertEquals(
            0,
            results.size(),
            'Too-short search should return empty'
        );
    }

    @isTest
    static void testSearchRecordsInvalidType() {
        Test.startTest();
        try {
            RecordLinkingService.searchRecords('test', 'FakeObject__xyz');
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('Invalid SObject type'),
                'Should indicate invalid type'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testGetMappedStatusCardToRecord() {
        String mapping = '{"To Do":"New","In Progress":"Working","Done":"Closed"}';

        String result = RecordLinkingService.getMappedStatus(
            mapping,
            'In Progress',
            'card_to_record'
        );
        System.assertEquals(
            'Working',
            result,
            'Should map In Progress to Working'
        );
    }

    @isTest
    static void testGetMappedStatusRecordToCard() {
        String mapping = '{"To Do":"New","In Progress":"Working","Done":"Closed"}';

        String result = RecordLinkingService.getMappedStatus(
            mapping,
            'Working',
            'record_to_card'
        );
        System.assertEquals(
            'In Progress',
            result,
            'Should reverse map Working to In Progress'
        );
    }

    @isTest
    static void testGetMappedStatusNull() {
        System.assertEquals(
            null,
            RecordLinkingService.getMappedStatus(null, 'Test', 'card_to_record'),
            'Null mapping should return null'
        );
        System.assertEquals(
            null,
            RecordLinkingService.getMappedStatus('{}', null, 'card_to_record'),
            'Null status should return null'
        );
    }

    @isTest
    static void testGetMappedStatusInvalidJson() {
        String result = RecordLinkingService.getMappedStatus(
            'not json',
            'Test',
            'card_to_record'
        );
        System.assertEquals(null, result, 'Invalid JSON should return null');
    }

    @isTest
    static void testSyncCardStatusToLinkedRecords() {
        OpenSF__Card__c card = getTestCard();

        Case testCase = new Case(Subject = 'Sync Test', Status = 'New');
        insert testCase;

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'Sync Test',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = true,
            OpenSF__StatusMapping__c = '{"To Do":"New","In Progress":"Working","Done":"Closed"}'
        );
        insert link;

        Test.startTest();
        RecordLinkingService.syncCardStatusToLinkedRecords(
            card.Id,
            'Done'
        );
        Test.stopTest();

        Case updatedCase = [
            SELECT Status
            FROM Case
            WHERE Id = :testCase.Id
        ];
        System.assertEquals(
            'Closed',
            updatedCase.Status,
            'Case status should be synced to Closed'
        );
    }

    @isTest
    static void testSyncRecordStatusToCard() {
        OpenSF__Card__c card = getTestCard();

        Case testCase = new Case(Subject = 'Reverse Sync', Status = 'New');
        insert testCase;

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'Reverse Sync',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = true,
            OpenSF__StatusMapping__c = '{"To Do":"New","In Progress":"Working","Done":"Closed"}'
        );
        insert link;

        Test.startTest();
        // Bypass card trigger to avoid recursive sync
        TriggerHandler.bypass('CardTriggerHandler');
        RecordLinkingService.syncRecordStatusToCard(
            String.valueOf(testCase.Id),
            'Working'
        );
        TriggerHandler.clearBypass('CardTriggerHandler');
        Test.stopTest();

        OpenSF__Card__c updatedCard = [
            SELECT OpenSF__Status__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            'In Progress',
            updatedCard.OpenSF__Status__c,
            'Card status should be synced to In Progress'
        );
    }

    @isTest
    static void testSyncDisabled() {
        OpenSF__Card__c card = getTestCard();

        Case testCase = new Case(Subject = 'No Sync', Status = 'New');
        insert testCase;

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'No Sync',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = false,
            OpenSF__StatusMapping__c = '{"To Do":"New","Done":"Closed"}'
        );
        insert link;

        Test.startTest();
        RecordLinkingService.syncCardStatusToLinkedRecords(card.Id, 'Done');
        Test.stopTest();

        Case updatedCase = [
            SELECT Status
            FROM Case
            WHERE Id = :testCase.Id
        ];
        System.assertEquals(
            'New',
            updatedCase.Status,
            'Case status should NOT change when sync disabled'
        );
    }

    @isTest
    static void testGetStatusField() {
        System.assertEquals(
            'Status',
            RecordLinkingService.getStatusField('Case'),
            'Case status field'
        );
        System.assertEquals(
            'StageName',
            RecordLinkingService.getStatusField('Opportunity'),
            'Opportunity status field'
        );
        System.assertEquals(
            null,
            RecordLinkingService.getStatusField('Account'),
            'Account has no status field'
        );
    }

    @isTest
    static void testControllerGetLinkedRecords() {
        OpenSF__Card__c card = getTestCard();

        Test.startTest();
        List<KanbanBoardDTO.LinkedRecordDTO> results = KanbanBoardController.getLinkedRecords(
            card.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, results, 'Should return a list');
    }

    @isTest
    static void testControllerLinkRecord() {
        OpenSF__Card__c card = getTestCard();
        Case testCase = new Case(Subject = 'Controller Test', Status = 'New');
        insert testCase;

        Test.startTest();
        KanbanBoardDTO.LinkedRecordDTO result = KanbanBoardController.linkRecord(
            card.Id,
            String.valueOf(testCase.Id),
            'Case',
            false,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Link should be created');
    }

    @isTest
    static void testControllerUnlinkRecord() {
        OpenSF__Card__c card = getTestCard();
        Case testCase = new Case(Subject = 'Unlink Test', Status = 'New');
        insert testCase;

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = card.Id,
            OpenSF__RecordId__c = testCase.Id,
            OpenSF__RecordName__c = 'Unlink Test',
            OpenSF__SObjectType__c = 'Case',
            OpenSF__SyncEnabled__c = false
        );
        insert link;

        Test.startTest();
        KanbanBoardController.unlinkRecord(link.Id);
        Test.stopTest();

        List<OpenSF__LinkedRecord__c> remaining = [
            SELECT Id
            FROM OpenSF__LinkedRecord__c
            WHERE Id = :link.Id
        ];
        System.assertEquals(0, remaining.size(), 'Link should be removed');
    }

    @isTest
    static void testControllerSearchRecords() {
        Case testCase = new Case(
            Subject = 'Search Controller Test',
            Status = 'New'
        );
        insert testCase;

        Test.startTest();
        List<RecordLinkingService.RecordSearchResult> results = KanbanBoardController.searchRecordsToLink(
            'Search Controller',
            'Case'
        );
        Test.stopTest();

        System.assert(!results.isEmpty(), 'Should find results');
    }
}
