@isTest
public class CardTriggerHandlerTest {
    // Test Setup Method
    @testSetup
    static void setupTestData() {
        // User user = TestDataFactory.createStandardUser();
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        TestDataFactory.createColumn(board.Id);
    }

    // Test Before Insert Trigger
    @isTest
    static void testBeforeInsert() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        for (OpenSF__Card__c card : cards) {
            card.Id = null;
        }
        Test.startTest();
        insert cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be populated after insert'
            );
        }
    }

    // Test After Insert Trigger
    @isTest
    static void testAfterInsert() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        for (OpenSF__Card__c card : cards) {
            card.Id = null;
        }
        Test.startTest();
        insert cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be populated after insert'
            );
        }
    }

    // Test Before Update Trigger
    @isTest
    static void testBeforeUpdate() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        Test.startTest();
        update cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be present after update'
            );
        }
    }

    // Test After Update Trigger
    @isTest
    static void testAfterUpdate() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        Test.startTest();
        update cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be present after update'
            );
        }
    }

    // Test Before Delete Trigger
    @isTest
    static void testBeforeDelete() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        Test.startTest();
        delete cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be present before delete'
            );
        }
    }

    // Test After Delete Trigger
    @isTest
    static void testAfterDelete() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        Test.startTest();
        delete cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be present after delete'
            );
        }
    }

    // Test After Undelete Trigger
    @isTest
    static void testAfterUndelete() {
        setupTestData();
        // Retrieve cards using SOQL
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
        delete cards;
        Test.startTest();
        undelete cards;
        Test.stopTest();
        for (OpenSF__Card__c card : cards) {
            System.assertNotEquals(
                null,
                card.Id,
                'Card Id should be present after undelete'
            );
        }
    }
}
