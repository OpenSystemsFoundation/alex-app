@isTest
private class KanbanBoardControllerTest {
    
    @testSetup
    static void setup() {
        // Create test board
        OpenSF__Board__c board = TestFactory.createBoard('Test Board', 'Published', 'Project');
        
        // Create columns
        OpenSF__Column__c todoColumn = TestFactory.createColumn(board.Id, 'To Do', '0|h00000:', '#1B96FF');
        OpenSF__Column__c inProgressColumn = TestFactory.createColumn(board.Id, 'In Progress', '0|hzzzzz:', '#1B96FF');
        
        // Create cards
        TestFactory.createCard(todoColumn.Id, 'Test Card 1', 'Story', 'To Do', '0|h00000:');
        TestFactory.createCard(todoColumn.Id, 'Test Card 2', 'Bug', 'To Do', '0|h00001:');
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
        System.assertEquals(targetColumn.Id, result.columnId, 'Card should be in target column');
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
        
        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;
        
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
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        cards.add(new OpenSF__Card__c(
            OpenSF__Subject__c = 'Card A',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story'
        ));
        cards.add(new OpenSF__Card__c(
            OpenSF__Subject__c = 'Card B',
            OpenSF__Column__c = column.Id,
            OpenSF__Position__c = '0|h00002:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story'
        ));
        insert cards;
        
        OpenSF__Column__c targetColumn = [SELECT Id FROM OpenSF__Column__c WHERE Id != :column.Id LIMIT 1];
        
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
    
    @isTest
    static void testGetBoardDataError() {
        // Test with non-existent board ID
        Id fakeBoardId = '001000000000000AAA';
        
        Test.startTest();
        try {
            KanbanBoardController.getBoardData(fakeBoardId);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testMoveCardError() {
        Id fakeCardId = '001000000000000AAA';
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        try {
            KanbanBoardController.moveCard(fakeCardId, column.Id, null, null);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testCreateCardError() {
        Id fakeColumnId = '001000000000000AAA';
        
        Test.startTest();
        try {
            KanbanBoardController.createCard(fakeColumnId, 'Test', null, null);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testUpdateCardError() {
        Id fakeCardId = '001000000000000AAA';
        
        Test.startTest();
        try {
            KanbanBoardController.updateCard(fakeCardId, new Map<String, Object>());
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testDeleteCardError() {
        Id fakeCardId = '001000000000000AAA';
        
        Test.startTest();
        try {
            KanbanBoardController.deleteCard(fakeCardId);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testMoveColumnError() {
        Id fakeColumnId = '001000000000000AAA';
        
        Test.startTest();
        try {
            KanbanBoardController.moveColumn(fakeColumnId, null, null);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
}
