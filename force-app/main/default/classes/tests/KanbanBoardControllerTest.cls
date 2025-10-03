@isTest
private class KanbanBoardControllerTest {
    
    @testSetup
    static void setup() {
        // Create test board
        OpenSF__Board__c board = new OpenSF__Board__c(
            Name = 'Test Board',
            OpenSF__Status__c = 'Active',
            OpenSF__Active__c = true
        );
        insert board;
        
        // Create columns
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        columns.add(new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'Active'
        ));
        columns.add(new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'In Progress',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|hzzzzz:',
            OpenSF__Status__c = 'Active'
        ));
        insert columns;
        
        // Create cards
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        cards.add(new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 1',
            OpenSF__Column__c = columns[0].Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'Active',
            OpenSF__CardType__c = 'Story',
            OpenSF__Priority__c = 'High'
        ));
        cards.add(new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 2',
            OpenSF__Column__c = columns[0].Id,
            OpenSF__Position__c = '0|h00001:',
            OpenSF__Status__c = 'Active',
            OpenSF__CardType__c = 'Bug',
            OpenSF__Priority__c = 'Medium'
        ));
        insert cards;
    }
    
    @isTest
    static void testGetBoardData() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        KanbanBoardController.BoardData data = KanbanBoardController.getBoardData(board.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, data, 'Board data should not be null');
        System.assertNotEquals(null, data.board, 'Board should not be null');
        System.assertEquals(2, data.columns.size(), 'Should have 2 columns');
        System.assertEquals(2, data.cards.size(), 'Should have 2 cards');
    }
    
    @isTest
    static void testMoveCard() {
        OpenSF__Card__c card = [SELECT Id, OpenSF__Column__c FROM OpenSF__Card__c WHERE OpenSF__Subject__c = 'Test Card 1' LIMIT 1];
        OpenSF__Column__c targetColumn = [SELECT Id FROM OpenSF__Column__c WHERE OpenSF__ColumnHeader__c = 'In Progress' LIMIT 1];
        
        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            card.Id,
            targetColumn.Id,
            null,
            null
        );
        Test.stopTest();
        
        System.assert(result.success, 'Move should be successful');
        System.assertEquals(targetColumn.Id, result.card.columnId, 'Card should be in target column');
        System.assertNotEquals(null, result.newPosition, 'New position should not be null');
    }
    
    @isTest
    static void testCreateCard() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        KanbanBoardDTO.CardDTO newCard = KanbanBoardController.createCard(
            column.Id,
            'New Test Card',
            null,
            null
        );
        Test.stopTest();
        
        System.assertNotEquals(null, newCard, 'Card should be created');
        System.assertEquals('New Test Card', newCard.subject, 'Subject should match');
        System.assertEquals(column.Id, newCard.columnId, 'Column should match');
    }
    
    @isTest
    static void testUpdateCard() {
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        
        Map<String, Object> updates = new Map<String, Object>();
        updates.put('subject', 'Updated Subject');
        updates.put('description', 'Updated Description');
        updates.put('priority', 'Low');
        
        Test.startTest();
        KanbanBoardDTO.CardDTO updatedCard = KanbanBoardController.updateCard(card.Id, updates);
        Test.stopTest();
        
        System.assertEquals('Updated Subject', updatedCard.subject, 'Subject should be updated');
        System.assertEquals('Updated Description', updatedCard.description, 'Description should be updated');
        System.assertEquals('Low', updatedCard.priority, 'Priority should be updated');
    }
    
    @isTest
    static void testDeleteCard() {
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        
        Test.startTest();
        KanbanBoardController.deleteCard(card.Id);
        Test.stopTest();
        
        List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c WHERE Id = :card.Id];
        System.assertEquals(0, cards.size(), 'Card should be deleted');
    }
    
    @isTest
    static void testMoveColumn() {
        OpenSF__Column__c column = [SELECT Id, OpenSF__Position__c FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        KanbanBoardDTO.ColumnDTO movedColumn = KanbanBoardController.moveColumn(
            column.Id,
            null,
            '0|zzzzzz:'
        );
        Test.stopTest();
        
        System.assertNotEquals(column.OpenSF__Position__c, movedColumn.position, 'Position should be updated');
    }
    
    @isTest
    static void testSearchUsers() {
        Test.startTest();
        List<User> users = KanbanBoardController.searchUsers('test');
        Test.stopTest();
        
        System.assertNotEquals(null, users, 'Users list should not be null');
    }
    
    @isTest
    static void testMoveCardWithPositioning() {
        // Create additional cards for position testing
        Column__c column = [SELECT Id FROM Column__c LIMIT 1];
        List<Card__c> cards = new List<Card__c>();
        cards.add(new Card__c(
            Subject__c = 'Card A',
            Column__c = column.Id,
            Position__c = '0|h00000:',
            Status__c = 'Active'
        ));
        cards.add(new Card__c(
            Subject__c = 'Card B',
            Column__c = column.Id,
            Position__c = '0|h00002:',
            Status__c = 'Active'
        ));
        insert cards;
        
        Column__c targetColumn = [SELECT Id FROM Column__c WHERE Id != :column.Id LIMIT 1];
        
        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            cards[0].Id,
            targetColumn.Id,
            null,
            null
        );
        Test.stopTest();
        
        System.assert(result.success, 'Move should be successful');
        System.assertNotEquals(null, result.newPosition, 'Position should be calculated');
    }
}
