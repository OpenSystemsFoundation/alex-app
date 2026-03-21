@IsTest
private class AgentCardActionsTest {
    @TestSetup
    static void setupTestData() {
        OpenSF__Board__c board = new OpenSF__Board__c(
            OpenSF__Description__c = 'Test Board',
            OpenSF__Status__c = 'Active',
            OpenSF__Type__c = 'Sprint',
            OpenSF__Active__c = true
        );
        insert board;

        OpenSF__Column__c col1 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'To Do',
            OpenSF__Category__c = 'To Do',
            OpenSF__Color__c = '#cccccc',
            OpenSF__LexoRankPosition__c = 'a',
            OpenSF__CardCount__c = 0
        );
        OpenSF__Column__c col2 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'In Progress',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'In Progress',
            OpenSF__Category__c = 'In Progress',
            OpenSF__Color__c = '#0070d2',
            OpenSF__LexoRankPosition__c = 'b',
            OpenSF__CardCount__c = 0
        );
        OpenSF__Column__c col3 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'Done',
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'Done',
            OpenSF__Category__c = 'Done',
            OpenSF__Color__c = '#4bca81',
            OpenSF__LexoRankPosition__c = 'c',
            OpenSF__CardCount__c = 0
        );
        insert new List<OpenSF__Column__c>{ col1, col2, col3 };

        OpenSF__Card__c card1 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 1',
            OpenSF__Description__c = 'A test card description',
            OpenSF__Column__c = col1.Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'High',
            OpenSF__CardType__c = 'Story',
            OpenSF__StoryPoints__c = 5,
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LexoRankPosition__c = 'a'
        );
        OpenSF__Card__c card2 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 2',
            OpenSF__Board__c = board.Id,
            OpenSF__Priority__c = 'Medium',
            OpenSF__CardType__c = 'Bug',
            OpenSF__StoryPoints__c = 3,
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LexoRankPosition__c = 'b'
        );
        insert new List<OpenSF__Card__c>{ card1, card2 };
    }

    static OpenSF__Board__c getBoard() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    static OpenSF__Card__c getCard(String subject) {
        return [SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Subject__c = :subject LIMIT 1];
    }

    @IsTest
    static void testCreateCardInColumn() {
        OpenSF__Board__c board = getBoard();

        AgentCreateCard.Request req = new AgentCreateCard.Request();
        req.boardId = board.Id;
        req.columnName = 'To Do';
        req.subject = 'New Card In Column';
        req.description = 'Created via test';
        req.priority = 'High';
        req.cardType = 'Story';
        req.storyPoints = 3;

        Test.startTest();
        List<AgentCreateCard.Response> responses = AgentCreateCard.createCards(
            new List<AgentCreateCard.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(1, responses.size(), 'Should return one response');
        AgentCreateCard.Response res = responses[0];
        System.assertNotEquals(null, res.cardId, 'Card Id should be set');
        System.assert(res.message.contains('successfully'), 'Message should indicate success');

        OpenSF__Card__c created = [
            SELECT OpenSF__Subject__c, OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :res.cardId
        ];
        System.assertEquals('New Card In Column', created.OpenSF__Subject__c);
        System.assertNotEquals(null, created.OpenSF__Column__c, 'Card should be in a column');
    }

    @IsTest
    static void testCreateCardInBacklog() {
        OpenSF__Board__c board = getBoard();

        AgentCreateCard.Request req = new AgentCreateCard.Request();
        req.boardId = board.Id;
        req.subject = 'Backlog Card';
        req.priority = 'Low';
        req.cardType = 'Task';

        Test.startTest();
        List<AgentCreateCard.Response> responses = AgentCreateCard.createCards(
            new List<AgentCreateCard.Request>{ req }
        );
        Test.stopTest();

        AgentCreateCard.Response res = responses[0];
        System.assertNotEquals(null, res.cardId, 'Card Id should be set');

        OpenSF__Card__c created = [
            SELECT OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :res.cardId
        ];
        System.assertEquals(null, created.OpenSF__Column__c, 'Backlog card should have no column');
    }

    @IsTest
    static void testCreateCardInvalidColumn() {
        OpenSF__Board__c board = getBoard();

        AgentCreateCard.Request req = new AgentCreateCard.Request();
        req.boardId = board.Id;
        req.columnName = 'Nonexistent Column';
        req.subject = 'Should Fail';

        Test.startTest();
        List<AgentCreateCard.Response> responses = AgentCreateCard.createCards(
            new List<AgentCreateCard.Request>{ req }
        );
        Test.stopTest();

        AgentCreateCard.Response res = responses[0];
        System.assertEquals(null, res.cardId, 'Card Id should be null on failure');
        System.assert(res.message.contains('not found'), 'Message should indicate column not found');
    }

    @IsTest
    static void testUpdateCard() {
        OpenSF__Card__c card = getCard('Test Card 1');

        AgentUpdateCard.Request req = new AgentUpdateCard.Request();
        req.cardId = card.Id;
        req.subject = 'Updated Subject';
        req.priority = 'Critical';
        req.storyPoints = 8;

        Test.startTest();
        List<AgentUpdateCard.Response> responses = AgentUpdateCard.updateCards(
            new List<AgentUpdateCard.Request>{ req }
        );
        Test.stopTest();

        AgentUpdateCard.Response res = responses[0];
        System.assertEquals(true, res.success, 'Update should succeed');

        OpenSF__Card__c updated = [
            SELECT OpenSF__Subject__c, OpenSF__Priority__c, OpenSF__StoryPoints__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals('Updated Subject', updated.OpenSF__Subject__c);
        System.assertEquals('Critical', updated.OpenSF__Priority__c);
        System.assertEquals(8, updated.OpenSF__StoryPoints__c);
    }

    @IsTest
    static void testDeleteCard() {
        OpenSF__Card__c card = getCard('Test Card 1');
        Id cardId = card.Id;

        AgentDeleteCard.Request req = new AgentDeleteCard.Request();
        req.cardId = cardId;

        Test.startTest();
        List<AgentDeleteCard.Response> responses = AgentDeleteCard.deleteCards(
            new List<AgentDeleteCard.Request>{ req }
        );
        Test.stopTest();

        AgentDeleteCard.Response res = responses[0];
        System.assertEquals(true, res.success, 'Delete should succeed');

        List<OpenSF__Card__c> remaining = [
            SELECT Id FROM OpenSF__Card__c WHERE Id = :cardId
        ];
        System.assertEquals(0, remaining.size(), 'Card should be deleted');
    }

    @IsTest
    static void testMoveCard() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard('Test Card 1');

        AgentMoveCard.Request req = new AgentMoveCard.Request();
        req.cardId = card.Id;
        req.targetColumnName = 'Done';
        req.boardId = board.Id;

        Test.startTest();
        List<AgentMoveCard.Response> responses = AgentMoveCard.moveCards(
            new List<AgentMoveCard.Request>{ req }
        );
        Test.stopTest();

        AgentMoveCard.Response res = responses[0];
        System.assertEquals(true, res.success, 'Move should succeed');
        System.assertEquals('Done', res.newColumnName, 'Should be moved to Done');

        OpenSF__Card__c moved = [
            SELECT OpenSF__Column__r.OpenSF__ColumnHeader__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals('Done', moved.OpenSF__Column__r.OpenSF__ColumnHeader__c);
    }

    @IsTest
    static void testMoveCardInvalidColumn() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard('Test Card 1');

        AgentMoveCard.Request req = new AgentMoveCard.Request();
        req.cardId = card.Id;
        req.targetColumnName = 'Nonexistent';
        req.boardId = board.Id;

        Test.startTest();
        List<AgentMoveCard.Response> responses = AgentMoveCard.moveCards(
            new List<AgentMoveCard.Request>{ req }
        );
        Test.stopTest();

        AgentMoveCard.Response res = responses[0];
        System.assertEquals(false, res.success, 'Move should fail');
        System.assert(res.message.contains('not found'), 'Message should indicate column not found');
    }

    @IsTest
    static void testSearchCardsByText() {
        OpenSF__Board__c board = getBoard();

        AgentSearchCards.Request req = new AgentSearchCards.Request();
        req.boardId = board.Id;
        req.searchText = 'Test Card 1';

        Test.startTest();
        List<AgentSearchCards.Response> responses = AgentSearchCards.searchCards(
            new List<AgentSearchCards.Request>{ req }
        );
        Test.stopTest();

        AgentSearchCards.Response res = responses[0];
        System.assert(res.totalFound >= 1, 'Should find at least one card');
        System.assertEquals('Test Card 1', res.cards[0].subject);
    }

    @IsTest
    static void testSearchCardsByPriority() {
        OpenSF__Board__c board = getBoard();

        AgentSearchCards.Request req = new AgentSearchCards.Request();
        req.boardId = board.Id;
        req.priority = 'High';

        Test.startTest();
        List<AgentSearchCards.Response> responses = AgentSearchCards.searchCards(
            new List<AgentSearchCards.Request>{ req }
        );
        Test.stopTest();

        AgentSearchCards.Response res = responses[0];
        System.assert(res.totalFound >= 1, 'Should find at least one High priority card');
        for (AgentSearchCards.CardResult cr : res.cards) {
            System.assertEquals('High', cr.priority, 'All results should be High priority');
        }
    }

    @IsTest
    static void testGetCardDetails() {
        OpenSF__Card__c card = getCard('Test Card 1');

        AgentGetCardDetails.Request req = new AgentGetCardDetails.Request();
        req.cardId = card.Id;

        Test.startTest();
        List<AgentGetCardDetails.Response> responses = AgentGetCardDetails.getCardDetails(
            new List<AgentGetCardDetails.Request>{ req }
        );
        Test.stopTest();

        AgentGetCardDetails.Response res = responses[0];
        System.assertEquals(card.Id, res.cardId);
        System.assertEquals('Test Card 1', res.subject);
        System.assertEquals('High', res.priority);
        System.assertEquals('Story', res.cardType);
        System.assertEquals(5, res.storyPoints);
        System.assertEquals('To Do', res.columnName);
        System.assert(res.message.contains('successfully'), 'Should succeed');
    }
}
