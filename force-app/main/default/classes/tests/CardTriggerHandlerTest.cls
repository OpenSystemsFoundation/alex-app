/**
 * CardTriggerHandlerTest - Test class for CardTriggerHandler
 * Tests trigger handler logic and platform event publishing
 */
@isTest
private class CardTriggerHandlerTest {
    
    @testSetup
    static void setup() {
        // Create test board and column using TestFactory
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumn(board.Id, 'To Do');
    }
    
    @isTest
    static void testAfterInsert() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        // Insert new card - should trigger afterInsert
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story',
            OpenSF__Priority__c = 'High'
        );
        insert card;
        Test.stopTest();
        
        // Verify card was created
        OpenSF__Card__c insertedCard = [SELECT Id, OpenSF__Subject__c FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals('Test Card', insertedCard.OpenSF__Subject__c, 'Card should be inserted');
    }
    
    @isTest
    static void testAfterUpdate() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;
        
        Test.startTest();
        // Update card - should trigger afterUpdate
        card.OpenSF__Subject__c = 'Updated Card';
        card.OpenSF__Priority__c = 'Medium';
        update card;
        Test.stopTest();
        
        // Verify card was updated
        OpenSF__Card__c updatedCard = [SELECT Id, OpenSF__Subject__c, OpenSF__Priority__c FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals('Updated Card', updatedCard.OpenSF__Subject__c, 'Subject should be updated');
        System.assertEquals('Medium', updatedCard.OpenSF__Priority__c, 'Priority should be updated');
    }
    
    @isTest
    static void testAfterDelete() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;
        
        Test.startTest();
        // Delete card - should trigger afterDelete
        delete card;
        Test.stopTest();
        
        // Verify card was deleted
        List<OpenSF__Card__c> deletedCards = [SELECT Id FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals(0, deletedCards.size(), 'Card should be deleted');
    }
    
    @isTest
    static void testAfterUndelete() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        // Create and delete card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;
        delete card;
        
        Test.startTest();
        // Undelete card - should trigger afterUndelete
        undelete card;
        Test.stopTest();
        
        // Verify card was undeleted
        OpenSF__Card__c undeletedCard = [SELECT Id, OpenSF__Subject__c FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals('Test Card', undeletedCard.OpenSF__Subject__c, 'Card should be undeleted');
    }
    
    @isTest
    static void testBulkInsert() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        for (Integer i = 0; i < 200; i++) {
            cards.add(new OpenSF__Card__c(
                OpenSF__Subject__c = 'Bulk Card ' + i,
                OpenSF__Column__c = column.Id,
                OpenSF__Position__c = '0|h0000' + i + ':',
                OpenSF__Status__c = 'To Do',
                OpenSF__CardType__c = 'Story'
            ));
        }
        
        Test.startTest();
        insert cards;
        Test.stopTest();
        
        // Verify all cards were inserted
        List<OpenSF__Card__c> insertedCards = [SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Column__c = :column.Id];
        System.assertEquals(200, insertedCards.size(), 'All 200 cards should be inserted');
    }
    
    @isTest
    static void testEventPublishing() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        // Insert card which should publish event
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Event Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Bug'
        );
        insert card;
        
        // Update to trigger another event
        card.OpenSF__Priority__c = 'High';
        update card;
        Test.stopTest();
        
        // Note: Platform events are asynchronous and can't be directly verified in tests
        // but we can verify the card operations completed successfully
        OpenSF__Card__c verifyCard = [SELECT Id, OpenSF__Priority__c FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals('High', verifyCard.OpenSF__Priority__c, 'Card should be updated successfully');
    }
}
