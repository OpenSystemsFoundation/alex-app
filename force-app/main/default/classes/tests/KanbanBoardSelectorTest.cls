/**
 * KanbanBoardSelectorTest - Test class for KanbanBoardSelector
 * Tests all selector query methods
 */
@isTest
private class KanbanBoardSelectorTest {
    
    @testSetup
    static void setup() {
        // Create test board
        OpenSF__Board__c board = TestFactory.createBoard('Test Board', 'Published', 'Project');
        
        // Create columns
        OpenSF__Column__c todoColumn = TestFactory.createColumn(board.Id, 'To Do', '0|h00000:', '#1B96FF');
        OpenSF__Column__c inProgressColumn = TestFactory.createColumn(board.Id, 'In Progress', '0|h00001:', '#FCC003');
        
        // Create cards
        TestFactory.createCard(todoColumn.Id, 'Card 1', 'Story', 'To Do', '0|h00000:');
        TestFactory.createCard(inProgressColumn.Id, 'Card 2', 'Bug', 'In Progress', '0|h00000:');
    }
    
    @isTest
    static void testGetBoardById() {
        OpenSF__Board__c testBoard = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        OpenSF__Board__c board = KanbanBoardSelector.getBoardById(testBoard.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, board, 'Board should not be null');
        System.assertEquals('Test Board', board.Name, 'Board name should match');
        System.assertEquals('Test Description', board.OpenSF__Description__c, 'Description should match');
        System.assertEquals('Published', board.OpenSF__Status__c, 'Status should match');
        System.assertEquals(true, board.OpenSF__Active__c, 'Active flag should be true');
        System.assertEquals(true, board.OpenSF__EmailNotifications__c, 'Email notifications should be enabled');
        System.assertEquals(true, board.OpenSF__SalesforceNotifications__c, 'Salesforce notifications should be enabled');
    }
    
    @isTest
    static void testGetColumnsByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(board.Id);
        Test.stopTest();
        
        System.assertEquals(2, columns.size(), 'Should return 2 columns');
        System.assertEquals('To Do', columns[0].OpenSF__ColumnHeader__c, 'First column should be To Do');
        System.assertEquals('In Progress', columns[1].OpenSF__ColumnHeader__c, 'Second column should be In Progress');
        System.assertEquals('#1B96FF', columns[0].OpenSF__Color__c, 'First column should be blue');
    }
    
    @isTest
    static void testGetCardsByBoardId() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(board.Id);
        Test.stopTest();
        
        System.assertEquals(2, cards.size(), 'Should return 2 cards');
        System.assertNotEquals(null, cards[0].OpenSF__Subject__c, 'Card should have subject');
        System.assertNotEquals(null, cards[0].OpenSF__Column__c, 'Card should have column');
    }
    
    @isTest
    static void testGetCardById() {
        OpenSF__Card__c testCard = [SELECT Id FROM OpenSF__Card__c LIMIT 1];
        
        Test.startTest();
        OpenSF__Card__c card = KanbanBoardSelector.getCardById(testCard.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, card, 'Card should not be null');
        System.assertNotEquals(null, card.OpenSF__Subject__c, 'Card should have subject');
        System.assertNotEquals(null, card.OpenSF__Column__c, 'Card should have column');
        System.assertNotEquals(null, card.OpenSF__Priority__c, 'Card should have priority');
        System.assertNotEquals(null, card.OpenSF__CardType__c, 'Card should have card type');
    }
    
    @isTest
    static void testGetCardsByColumnId() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c WHERE OpenSF__ColumnHeader__c = 'To Do' LIMIT 1];
        
        Test.startTest();
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByColumnId(column.Id);
        Test.stopTest();
        
        System.assertEquals(1, cards.size(), 'Should return 1 card in To Do column');
        System.assertEquals(column.Id, cards[0].OpenSF__Column__c, 'Card should belong to the column');
    }
    
    @isTest
    static void testGetColumnById() {
        OpenSF__Column__c testColumn = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        Test.startTest();
        OpenSF__Column__c column = KanbanBoardSelector.getColumnById(testColumn.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, column, 'Column should not be null');
        System.assertEquals('To Do', column.OpenSF__ColumnHeader__c, 'Column header should match');
        System.assertEquals('#1B96FF', column.OpenSF__Color__c, 'Color should match');
        System.assertEquals('To Do', column.OpenSF__Status__c, 'Status should match');
    }
    
    @isTest
    static void testGetCardsByIds() {
        List<OpenSF__Card__c> testCards = [SELECT Id FROM OpenSF__Card__c];
        List<Id> cardIds = new List<Id>();
        for (OpenSF__Card__c card : testCards) {
            cardIds.add(card.Id);
        }
        
        Test.startTest();
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByIds(cardIds);
        Test.stopTest();
        
        System.assertEquals(2, cards.size(), 'Should return 2 cards');
        System.assertNotEquals(null, cards[0].OpenSF__Subject__c, 'Cards should have subject');
    }
    
    @isTest
    static void testSearchUsers() {
        Test.startTest();
        List<User> users = KanbanBoardSelector.searchUsers('test');
        Test.stopTest();
        
        System.assertNotEquals(null, users, 'Users list should not be null');
        System.assert(users.size() <= 10, 'Should return max 10 users');
    }
    
    @isTest
    static void testSearchUsersWithEmail() {
        Test.startTest();
        List<User> users = KanbanBoardSelector.searchUsers('admin');
        Test.stopTest();
        
        System.assertNotEquals(null, users, 'Users list should not be null');
    }
    
    @isTest
    static void testGetCardsWithAssignee() {
        // Create card with assignee
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        User currentUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId()];
        
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Assigned Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00002:',
            OpenSF__Status__c = 'To Do',
            OpenSF__Assignee__c = currentUser.Id
        );
        insert card;
        
        Test.startTest();
        OpenSF__Card__c retrievedCard = KanbanBoardSelector.getCardById(card.Id);
        Test.stopTest();
        
        System.assertEquals(currentUser.Id, retrievedCard.OpenSF__Assignee__c, 'Card should have assignee');
        System.assertNotEquals(null, retrievedCard.OpenSF__Assignee__r.Name, 'Assignee name should be populated');
    }
    
    @isTest
    static void testDTOConversions() {
        // Test all DTO conversions using selector methods that fetch all fields
        OpenSF__Board__c testBoard = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Board__c board = KanbanBoardSelector.getBoardById(testBoard.Id);
        
        List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(testBoard.Id);
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(testBoard.Id);
        
        Test.startTest();
        // Test BoardDTO
        KanbanBoardDTO.BoardDTO boardDTO = new KanbanBoardDTO.BoardDTO(board);
        System.assertEquals(board.Name, boardDTO.Name, 'Board name should match');
        System.assertEquals(board.OpenSF__Status__c, boardDTO.status, 'Board status should match');
        
        // Test ColumnDTO
        KanbanBoardDTO.ColumnDTO columnDTO = new KanbanBoardDTO.ColumnDTO(columns[0]);
        System.assertEquals(columns[0].OpenSF__ColumnHeader__c, columnDTO.columnHeader, 'Column header should match');
        System.assertEquals(columns[0].OpenSF__Color__c, columnDTO.color, 'Column color should match');
        
        // Test CardDTO
        KanbanBoardDTO.CardDTO cardDTO = new KanbanBoardDTO.CardDTO(cards[0]);
        System.assertEquals(cards[0].OpenSF__Subject__c, cardDTO.subject, 'Card subject should match');
        System.assertEquals(cards[0].OpenSF__Status__c, cardDTO.status, 'Card status should match');
        
        // Test bulk conversions
        List<KanbanBoardDTO.BoardDTO> boardDTOs = KanbanBoardDTO.convertBoards(new List<OpenSF__Board__c>{board});
        System.assertEquals(1, boardDTOs.size(), 'Should convert 1 board');
        
        List<KanbanBoardDTO.ColumnDTO> columnDTOs = KanbanBoardDTO.convertColumns(columns);
        System.assertEquals(columns.size(), columnDTOs.size(), 'Should convert all columns');
        
        List<KanbanBoardDTO.CardDTO> cardDTOs = KanbanBoardDTO.convertCards(cards);
        System.assertEquals(cards.size(), cardDTOs.size(), 'Should convert all cards');
        Test.stopTest();
    }
    
    @isTest
    static void testDTONestedObjects() {
        // Create card with epic relationship
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        
        // Create an epic card
        OpenSF__Card__c epic = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Epic Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|m00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Epic'
        );
        insert epic;
        
        // Create card with assignee, peer reviewer, and epic
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Card with Relations',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|m00001:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story',
            OpenSF__Assignee__c = UserInfo.getUserId(),
            OpenSF__PeerReviewer__c = UserInfo.getUserId(),
            OpenSF__Epic__c = epic.Id,
            OpenSF__Locked__c = true
        );
        insert card;
        
        Test.startTest();
        OpenSF__Card__c retrievedCard = KanbanBoardSelector.getCardById(card.Id);
        KanbanBoardDTO.CardDTO cardDTO = new KanbanBoardDTO.CardDTO(retrievedCard);
        
        // Test nested UserDTO - only test name, photoUrl may not be available in test context
        System.assertNotEquals(null, cardDTO.assignee, 'Assignee should not be null');
        System.assertNotEquals(null, cardDTO.assignee.name, 'Assignee name should not be null');
        System.assertNotEquals(null, cardDTO.peerReviewer, 'Peer reviewer should not be null');
        System.assertNotEquals(null, cardDTO.peerReviewer.name, 'Peer reviewer name should not be null');
        
        // Test nested EpicDTO
        System.assertNotEquals(null, cardDTO.epic, 'Epic should not be null');
        System.assertEquals('Epic Card', cardDTO.epic.subject, 'Epic subject should match');
        System.assertEquals(true, cardDTO.locked, 'Card should be locked');
        
        // Test that assigneeId and peerReviewerId are properly set
        System.assertEquals(UserInfo.getUserId(), cardDTO.assigneeId, 'Assignee ID should match');
        System.assertEquals(UserInfo.getUserId(), cardDTO.peerReviewerId, 'Peer reviewer ID should match');
        Test.stopTest();
    }
}
