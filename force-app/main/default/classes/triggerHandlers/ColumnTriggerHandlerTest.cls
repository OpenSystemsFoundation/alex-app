@isTest
public class ColumnTriggerHandlerTest {
    static OpenSF__Board__c testBoard;

    // Test Setup Method
    @testSetup
    static void setupTestData() {
        testBoard = TestDataFactory.createBoard('Test Board');
        TestDataFactory.createColumn(testBoard.Id);
    }

    // Helper method to create test data
    private static List<OpenSF__Column__c> createTestColumns() {
        if (testBoard == null) {
            testBoard = TestDataFactory.createBoard('Test Board');
        }
        return TestDataFactory.createColumns(testBoard.Id, 1);
    }

    // Test Before Insert Trigger
    @isTest
    static void testBeforeInsert() {
        List<OpenSF__Column__c> columns = createTestColumns();
        for (OpenSF__Column__c column : columns) {
            column.Id = null;
        }
        Test.startTest();
        insert columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be populated after insert'
            );
        }
    }

    // Test After Insert Trigger
    @isTest
    static void testAfterInsert() {
        List<OpenSF__Column__c> columns = createTestColumns();
        for (OpenSF__Column__c column : columns) {
            column.Id = null;
        }
        Test.startTest();
        insert columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be populated after insert'
            );
        }
    }

    // Test Before Update Trigger
    @isTest
    static void testBeforeUpdate() {
        List<OpenSF__Column__c> columns = createTestColumns();
        Test.startTest();
        update columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be present after update'
            );
        }
    }

    // Test After Update Trigger
    @isTest
    static void testAfterUpdate() {
        List<OpenSF__Column__c> columns = createTestColumns();
        Test.startTest();
        update columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be present after update'
            );
        }
    }

    // Test Before Delete Trigger
    @isTest
    static void testBeforeDelete() {
        List<OpenSF__Column__c> columns = createTestColumns();
        Test.startTest();
        delete columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be present before delete'
            );
        }
    }

    // Test After Delete Trigger
    @isTest
    static void testAfterDelete() {
        List<OpenSF__Column__c> columns = createTestColumns();
        Test.startTest();
        delete columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be present after delete'
            );
        }
    }

    // Test After Undelete Trigger
    @isTest
    static void testAfterUndelete() {
        List<OpenSF__Column__c> columns = createTestColumns();
        delete columns;
        Test.startTest();
        undelete columns;
        Test.stopTest();
        for (OpenSF__Column__c column : columns) {
            System.assertNotEquals(
                null,
                column.Id,
                'Column Id should be present after undelete'
            );
        }
    }
}
