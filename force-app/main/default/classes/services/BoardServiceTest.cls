@isTest
public class BoardServiceTest {
    @testSetup
    static void setupTestData() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            // Set up a board with columns and cards for testing
            OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
            OpenSF__Column__c column1 = TestDataFactory.createColumn(board.Id);
            OpenSF__Column__c column2 = TestDataFactory.createColumn(board.Id);

            // Create cards in the columns
            TestDataFactory.createCards(column1.Id, 3);
            TestDataFactory.createCards(column2.Id, 2);
        }
    }

    @isTest
    static void testGetBoardData() {
        // Retrieve the board created in testSetup
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];

        // Test getBoardData method
        Map<String, Object> result = BoardService.getBoardData(board.Id);
        System.assertNotEquals(null, result, 'Expected non-null result');
        System.assert(result.containsKey('board'), 'Expected board in result');
        System.assert(
            result.containsKey('columns'),
            'Expected columns in result'
        );
        System.assert(result.containsKey('cards'), 'Expected cards in result');

        List<OpenSF__Column__c> columns = (List<OpenSF__Column__c>) result.get(
            'columns'
        );
        System.assertEquals(2, columns.size(), 'Expected 2 columns');

        List<OpenSF__Card__c> cards = (List<OpenSF__Card__c>) result.get(
            'cards'
        );
        System.assertEquals(5, cards.size(), 'Expected 5 cards across columns');
    }

    @isTest
    static void testMoveCard() {
        // Retrieve all cards created in testSetup
        List<OpenSF__Card__c> cards = [
            SELECT Id, OpenSF__Column__c, OpenSF__Position__c
            FROM OpenSF__Card__c
            ORDER BY OpenSF__Position__c ASC
            LIMIT 5
        ];
        System.assertEquals(5, cards.size(), 'Expected 5 cards for move test');

        // Move a card to a new position in the same column
        OpenSF__Card__c movedCard = cards[0];
        movedCard.OpenSF__Position__c = 2;

        Test.startTest();
        List<OpenSF__Card__c> updatedCards = BoardService.moveCard(movedCard);
        Test.stopTest();

        // Verify positions were updated
        for (OpenSF__Card__c card : updatedCards) {
            if (card.Id == movedCard.Id) {
                System.assertEquals(
                    2,
                    card.OpenSF__Position__c,
                    'Expected moved card position to be 2'
                );
            }
        }
    }

    @isTest
    static void testMoveCardToDifferentColumn() {
        // Retrieve two columns created in testSetup
        List<OpenSF__Column__c> columns = [
            SELECT Id
            FROM OpenSF__Column__c
            LIMIT 2
        ];
        OpenSF__Column__c sourceColumn = columns[0];
        OpenSF__Column__c targetColumn = columns[1];

        // Retrieve a card from the source column
        List<OpenSF__Card__c> sourceCards = [
            SELECT Id, OpenSF__Column__c, OpenSF__Position__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :sourceColumn.Id
            LIMIT 1
        ];
        OpenSF__Card__c movedCard = sourceCards[0];
        movedCard.OpenSF__Column__c = targetColumn.Id;
        movedCard.OpenSF__Position__c = 1;

        Test.startTest();
        BoardService.moveCard(movedCard);
        Test.stopTest();

        // Verify that positions in the target column are adjusted
        List<OpenSF__Card__c> targetCards = [
            SELECT Id, OpenSF__Position__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :targetColumn.Id
            ORDER BY OpenSF__Position__c ASC
        ];
        for (Integer i = 0; i < targetCards.size(); i++) {
            System.assertEquals(
                i + 1,
                targetCards[i].OpenSF__Position__c,
                'Expected card position to be sequential'
            );
        }
    }

    @isTest
    static void testCreateCard() {
        // Retrieve a column for adding a new card
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // Create a new card in the column
        Test.startTest();
        OpenSF__Card__c newCard = BoardService.createCard(column.Id, 'Backlog');
        Test.stopTest();

        // Verify the card was created
        System.assertNotEquals(null, newCard, 'Expected new card');
        System.assertEquals(
            column.Id,
            newCard.OpenSF__Column__c,
            'Expected column ID to match'
        );
    }

    @isTest
    static void testUpdateCards() {
        // Retrieve all cards created in testSetup
        List<OpenSF__Card__c> cards = [
            SELECT Id, OpenSF__Column__c, OpenSF__Position__c
            FROM OpenSF__Card__c
            LIMIT 5
        ];
        System.assertEquals(
            5,
            cards.size(),
            'Expected 5 cards for update test'
        );

        // Modify some card positions
        cards[0].OpenSF__Position__c = 3;
        cards[1].OpenSF__Position__c = 2;

        // Update card positions using BoardService
        Test.startTest();
        List<OpenSF__Card__c> updatedCards = BoardService.updateCards(cards);
        Test.stopTest();

        // Verify positions were updated
        for (OpenSF__Card__c card : updatedCards) {
            System.assertNotEquals(
                null,
                card.OpenSF__Position__c,
                'Expected non-null position'
            );
        }
    }
}
