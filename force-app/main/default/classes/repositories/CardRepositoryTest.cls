@isTest
public class CardRepositoryTest {
    @testSetup
    static void setupTestData() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
            OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);
            insert new OpenSF__Card__c(
                OpenSF__Column__c = column.Id,
                OpenSF__Position__c = 1
            );
        }
    }

    @isTest
    static void testCreateCard() {
        // Arrange
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);

        // Act
        Test.startTest();
        OpenSF__Card__c createdCard = CardRepository.createCard(
            new OpenSF__Card__c(
                OpenSF__Column__c = column.Id,
                OpenSF__Position__c = 1
            )
        );
        Test.stopTest();

        // Assert
        System.assertNotEquals(
            null,
            createdCard.Id,
            'Card ID should not be null after creation'
        );
        System.assertEquals(
            column.Id,
            createdCard.OpenSF__Column__c,
            'Card should belong to the correct column'
        );
    }

    @isTest
    static void testUpdateCards() {
        // Arrange
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestDataFactory.createColumn(board.Id);
        List<OpenSF__Card__c> cards = TestDataFactory.createCards(column.Id, 3);

        // Modify card positions
        for (Integer i = 0; i < cards.size(); i++) {
            cards[i].OpenSF__Position__c = i + 10;
        }

        // Act
        Test.startTest();
        CardRepository.updateCards(cards);
        Test.stopTest();

        // Reload cards from the database to verify update
        List<OpenSF__Card__c> updatedCards = [
            SELECT Id, OpenSF__Position__c
            FROM OpenSF__Card__c
            WHERE Id IN :cards
        ];

        // Assert
        for (Integer i = 0; i < updatedCards.size(); i++) {
            System.assertEquals(
                i + 10,
                updatedCards[i].OpenSF__Position__c,
                'Card position should be updated correctly'
            );
        }
    }
}
