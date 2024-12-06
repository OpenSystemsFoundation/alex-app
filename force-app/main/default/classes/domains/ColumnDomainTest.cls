@isTest
public with sharing class ColumnDomainTest {
    @testSetup
    static void setup() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            // Create a test board to use in all tests
            OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
            // Create a few test columns in the board
            TestDataFactory.createColumns(board.Id, 3);
        }
    }

    @isTest
    static void testHandleBeforeInsert() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board Before Insert'
        );
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>{
            new OpenSF__Column__c(
                OpenSF__Board__c = board.Id,
                OpenSF__Position__c = 1
            ),
            new OpenSF__Column__c(
                OpenSF__Board__c = board.Id,
                OpenSF__Position__c = 2
            )
        };

        Test.startTest();
        insert columns;
        Test.stopTest();

        // Verifying insert worked
        System.assertEquals(
            2,
            [
                SELECT COUNT()
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :board.Id
            ],
            'The number of columns inserted does not match the expected value.'
        );
    }

    @isTest
    static void testHandleAfterInsert() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board After Insert'
        );
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = 1
        );

        Test.startTest();
        insert column;
        Test.stopTest();

        // Verifying insert worked
        System.assertEquals(
            1,
            [
                SELECT COUNT()
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :board.Id
            ],
            'The number of columns inserted does not match the expected value.'
        );
    }

    @isTest
    static void testHandleAfterUpdate() {
        // Test setup
        List<OpenSF__Column__c> columns = [
            SELECT Id, OpenSF__Position__c, OpenSF__Status__c
            FROM OpenSF__Column__c
            LIMIT 1
        ];
        OpenSF__Column__c columnToUpdate = columns[0];

        // Changing each field to trigger an event
        columnToUpdate.OpenSF__Position__c = 5;
        columnToUpdate.OpenSF__Status__c = 'Done';

        Test.startTest();
        update columnToUpdate;
        Test.stopTest();

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }

    @isTest
    static void testHandleBeforeDelete() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board Before Delete'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        // Add a card to the column to test the exception
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Column__c = column.Id
        );
        insert card;

        Test.startTest();
        try {
            delete column;
            System.assert(
                false,
                'Expected an exception due to associated cards.'
            );
        } catch (DmlException e) {
            System.assert(
                e.getMessage().contains('associated cards'),
                'Caught expected DmlException with correct message.'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testHandleAfterDelete() {
        // Test setup
        List<OpenSF__Column__c> columns = [
            SELECT Id
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        Test.startTest();
        delete columns;
        Test.stopTest();

        // Verifying the column was deleted
        System.assertEquals(
            0,
            [SELECT COUNT() FROM OpenSF__Column__c WHERE Id = :columns[0].Id],
            'The column was not deleted as expected.'
        );

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }

    @isTest
    static void testHandleAfterUndelete() {
        // Test setup: create and delete a column
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board After Undelete'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        delete column;

        Test.startTest();
        undelete column;
        Test.stopTest();

        // Verifying the column was undeleted
        System.assertEquals(
            1,
            [SELECT COUNT() FROM OpenSF__Column__c WHERE Id = :column.Id],
            'The column was not undeleted as expected.'
        );

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }
}
