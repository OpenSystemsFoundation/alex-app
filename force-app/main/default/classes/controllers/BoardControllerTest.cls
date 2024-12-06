@isTest
public class BoardControllerTest {
    @testSetup
    static void setupTestData() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            // Set up a test board, column, and some cards
            OpenSF__Board__c testBoard = TestDataFactory.createBoard(
                'Test Board'
            );
            OpenSF__Column__c testColumn = TestDataFactory.createColumn(
                testBoard.Id
            );
            TestDataFactory.createCards(testColumn.Id, 3);
        }
    }

    @isTest
    static void testFetchBoardData() {
        // Retrieve the test board
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];

        Test.startTest();

        // Call the fetchBoardData method
        Map<String, Object> result = BoardController.fetchBoardData(board.Id);

        Test.stopTest();

        // Validate the result
        System.assert(result != null, 'Expected result to not be null');
    }

    @isTest
    static void testUpdateCards() {
        // Retrieve the test cards
        List<OpenSF__Card__c> cards = [
            SELECT Id, OpenSF__Column__c, OpenSF__Position__c
            FROM OpenSF__Card__c
            LIMIT 3
        ];

        // Modify positions for testing update
        for (Integer i = 0; i < cards.size(); i++) {
            cards[i].OpenSF__Position__c = i + 10; // Arbitrary new positions for test
        }

        Test.startTest();

        // Call the updateCards method
        List<OpenSF__Card__c> updatedCards = BoardController.updateCards(cards);

        Test.stopTest();

        // Validate the updated card positions
        System.assertEquals(
            cards.size(),
            updatedCards.size(),
            'The number of cards returned should match the input'
        );

        for (Integer i = 0; i < updatedCards.size(); i++) {
            System.assertEquals(
                i + 10,
                updatedCards[i].OpenSF__Position__c,
                'Card position should be updated correctly'
            );
        }
    }

    @isTest
    static void testCreateCard() {
        // Retrieve the test column
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        Test.startTest();

        // Call the createCard method
        OpenSF__Card__c newCard = BoardController.createCard(
            column.Id,
            'In Progress'
        );

        Test.stopTest();

        // Validate the new card
        System.assert(newCard != null, 'Expected a new card to be created');
        System.assertEquals(
            column.Id,
            newCard.OpenSF__Column__c,
            'New card should be associated with the correct column'
        );
        System.assertEquals(
            'In Progress',
            newCard.OpenSF__Status__c,
            'New card should have the correct status'
        );
    }
}
