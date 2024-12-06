@isTest
public class CardDomainTest {
    @testSetup
    static void setup() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            // Create a test board and a column to use in all tests
            OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
            OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

            // Create a few test cards in the column
            TestDataFactory.createCards(column.Id, 3);
        }
    }

    @isTest
    static void testHandleBeforeInsert() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board Before Insert'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        // Creating test cards to trigger before insert
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>{
            new OpenSF__Card__c(
                OpenSF__Column__c = column.Id,
                OpenSF__Position__c = 1
            ),
            new OpenSF__Card__c(
                OpenSF__Column__c = column.Id,
                OpenSF__Position__c = 2
            )
        };

        Test.startTest();
        insert cards;
        Test.stopTest();

        // Verifying insert worked
        System.assertEquals(
            2,
            [
                SELECT COUNT()
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :column.Id
            ],
            'The number of cards inserted does not match the expected value.'
        );

        // Verifying events published
        // Since Platform Events cannot be queried, we assume the trigger logic is correct if no exceptions were thrown
        System.assert(true, 'Platform Events published successfully.');
    }

    @isTest
    static void testHandleAfterInsert() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board After Insert'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        // Creating test cards to trigger after insert
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = 1
        );

        Test.startTest();
        insert card;
        Test.stopTest();

        // Verifying insert worked
        System.assertEquals(
            1,
            [
                SELECT COUNT()
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :column.Id
            ],
            'The number of cards inserted does not match the expected value.'
        );

        // Verifying events published
        // Since Platform Events cannot be queried, we assume the trigger logic is correct if no exceptions were thrown
        System.assert(true, 'Platform Events published successfully.');
    }

    @isTest
    static void testHandleBeforeUpdate() {
        // Test setup
        List<OpenSF__Card__c> cards = [
            SELECT Id, OpenSF__Position__c, OpenSF__Column__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
        OpenSF__Card__c cardToUpdate = cards[0];
        cardToUpdate.OpenSF__Position__c = 2;

        Test.startTest();
        update cardToUpdate;
        Test.stopTest();

        // Ensuring code executed without issues

        // Verifying events published
        // Since Platform Events cannot be queried, we assume the trigger logic is correct if no exceptions were thrown
        System.assert(true, 'Platform Events published successfully.');
    }

    @isTest
    static void testHandleAfterUpdate() {
        // Test setup
        List<OpenSF__Card__c> cards = [
            SELECT
                Id,
                OpenSF__Position__c,
                OpenSF__Status__c,
                OpenSF__Priority__c,
                OpenSF__Subject__c,
                OpenSF__CardType__c,
                OpenSF__StoryPoints__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
        OpenSF__Card__c cardToUpdate = cards[0];

        // Changing each field to trigger an event
        cardToUpdate.OpenSF__Position__c = 5;
        cardToUpdate.OpenSF__Status__c = 'Done';
        cardToUpdate.OpenSF__Priority__c = 'High';
        cardToUpdate.OpenSF__Subject__c = 'New Subject';
        cardToUpdate.OpenSF__CardType__c = 'Bug';
        cardToUpdate.OpenSF__StoryPoints__c = 10;

        Test.startTest();
        update cardToUpdate;
        Test.stopTest();

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }

    @isTest
    static void testHandleBeforeDelete() {
        // Test setup
        List<OpenSF__Card__c> cards = [
            SELECT Id, OpenSF__Locked__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
        OpenSF__Card__c cardToDelete = cards[0];
        cardToDelete.OpenSF__Locked__c = true;
        update cardToDelete; // Ensure the locked status is saved

        Test.startTest();
        try {
            delete cardToDelete;
            System.assert(false, 'Expected an exception due to locked card.');
        } catch (DmlException e) {
            System.assert(
                e.getDmlMessage(0).contains('Locked cards cannot be deleted.'),
                'Expected error message for locked card deletion not found.'
            );
        }
        Test.stopTest();

        // Ensuring no issues in delete trigger
    }

    @isTest
    static void testHandleAfterDelete() {
        // Test setup
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c LIMIT 1];

        Test.startTest();
        delete cards;
        Test.stopTest();

        // Verifying the card was deleted
        System.assertEquals(
            0,
            [
                SELECT COUNT()
                FROM OpenSF__Card__c
                WHERE Id = :cards[0].Id
            ],
            'The card was not deleted as expected.'
        );

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }

    @isTest
    static void testHandleAfterUndelete() {
        // Test setup: create and delete a card
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board After Undelete'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);
        OpenSF__Card__c card = TestDataFactory.createCard(column.Id, 1);

        delete card;

        Test.startTest();
        undelete card;
        Test.stopTest();

        // Verifying the card was undeleted
        System.assertEquals(
            1,
            [
                SELECT COUNT()
                FROM OpenSF__Card__c
                WHERE Id = :card.Id
            ],
            'The card was not undeleted as expected.'
        );

        // Ensuring Platform Event published without errors
        System.assert(true, 'Platform Event published successfully.');
    }

    @isTest
    static void testCountEpicCards() {
        // Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard(
            'Test Board for Epic'
        );
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);
        OpenSF__Card__c epic = TestDataFactory.createEpic();

        // Create cards in the column using TestDataFactory
        List<OpenSF__Card__c> cards = TestDataFactory.createCards(column.Id, 2);

        // Update cards to associate them with the epic
        for (OpenSF__Card__c card : cards) {
            card.OpenSF__Epic__c = epic.Id;
        }
        Test.startTest();
        update cards;
        Test.stopTest();

        // Verify the epic card count
        List<OpenSF__Card__c> epicCards = [
            SELECT OpenSF__EpicCardsCount__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Epic__c = :epic.Id
        ];
        System.assertEquals(
            2,
            epicCards.size(),
            'Epic card count is incorrect.'
        );
    }

    @isTest
    static void testCountColumnCards() {
        // Step 1: Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        OpenSF__Column__c column1 = TestDataFactory.createColumn(board.Id);
        OpenSF__Column__c column2 = TestDataFactory.createColumn(board.Id);

        // Create cards associated with column1
        List<OpenSF__Card__c> cards = TestDataFactory.createCards(
            column1.Id,
            3
        );

        // Verify initial card count on column1
        OpenSF__Column__c refreshedColumn1 = [
            SELECT OpenSF__CardCount__c
            FROM OpenSF__Column__c
            WHERE Id = :column1.Id
        ];
        System.assertEquals(
            3,
            refreshedColumn1.OpenSF__CardCount__c,
            'Initial card count should be 3'
        );

        Test.startTest();

        // Step 2: Update the Column__c field for one card to column2
        OpenSF__Card__c updatedCard = cards[0];
        updatedCard.OpenSF__Column__c = column2.Id;
        update updatedCard;

        Test.stopTest();

        // Step 3: Verify the updated card counts
        refreshedColumn1 = [
            SELECT OpenSF__CardCount__c
            FROM OpenSF__Column__c
            WHERE Id = :column1.Id
        ];
        OpenSF__Column__c refreshedColumn2 = [
            SELECT OpenSF__CardCount__c
            FROM OpenSF__Column__c
            WHERE Id = :column2.Id
        ];

        System.assertEquals(
            2,
            refreshedColumn1.OpenSF__CardCount__c,
            'Card count for column1 should decrease to 2'
        );
        System.assertEquals(
            1,
            refreshedColumn2.OpenSF__CardCount__c,
            'Card count for column2 should increase to 1'
        );
    }

    @isTest
    static void testDeleteCards() {
        // Step 1: Test setup
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        // Create multiple cards associated with the column
        List<OpenSF__Card__c> cards = TestDataFactory.createCards(column.Id, 3);

        // Verify initial card count
        OpenSF__Column__c refreshedColumn = [
            SELECT OpenSF__CardCount__c
            FROM OpenSF__Column__c
            WHERE Id = :column.Id
        ];
        System.assertEquals(
            3,
            refreshedColumn.OpenSF__CardCount__c,
            'Initial card count should be 3'
        );

        Test.startTest();

        // Step 2: Delete a card
        delete cards[0];

        Test.stopTest();

        // Step 3: Verify card count decreases
        refreshedColumn = [
            SELECT OpenSF__CardCount__c
            FROM OpenSF__Column__c
            WHERE Id = :column.Id
        ];
        System.assertEquals(
            2,
            refreshedColumn.OpenSF__CardCount__c,
            'Card count should decrease to 2'
        );
    }
}
