@IsTest
private class AgentAssignmentActionsTest {
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
        return [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__Subject__c = :subject
            LIMIT 1
        ];
    }

    @IsTest
    static void testAssignCard() {
        OpenSF__Card__c card = getCard('Test Card 1');
        User currentUser = [
            SELECT Id, Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        AgentAssignCard.Request req = new AgentAssignCard.Request();
        req.cardId = card.Id;
        req.assigneeName = currentUser.Name;

        Test.startTest();
        List<AgentAssignCard.Response> responses = AgentAssignCard.execute(
            new List<AgentAssignCard.Request>{ req }
        );
        Test.stopTest();

        AgentAssignCard.Response res = responses[0];
        System.assertEquals(true, res.success, 'Assignment should succeed');
        System.assertEquals(
            currentUser.Name,
            res.assignedUserName,
            'Assigned user name should match'
        );

        OpenSF__Card__c updated = [
            SELECT OpenSF__Assignee__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            currentUser.Id,
            updated.OpenSF__Assignee__c,
            'Card assignee should be set'
        );
    }

    @IsTest
    static void testAssignCardAsPeerReviewer() {
        OpenSF__Card__c card = getCard('Test Card 1');
        User currentUser = [
            SELECT Id, Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        AgentAssignCard.Request req = new AgentAssignCard.Request();
        req.cardId = card.Id;
        req.assigneeName = currentUser.Name;
        req.setPeerReviewer = true;

        Test.startTest();
        List<AgentAssignCard.Response> responses = AgentAssignCard.execute(
            new List<AgentAssignCard.Request>{ req }
        );
        Test.stopTest();

        AgentAssignCard.Response res = responses[0];
        System.assertEquals(
            true,
            res.success,
            'Peer reviewer assignment should succeed'
        );
        System.assert(
            res.message.contains('Peer Reviewer'),
            'Message should mention Peer Reviewer'
        );

        OpenSF__Card__c updated = [
            SELECT OpenSF__PeerReviewer__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            currentUser.Id,
            updated.OpenSF__PeerReviewer__c,
            'Card peer reviewer should be set'
        );
    }

    @IsTest
    static void testAssignCardUserNotFound() {
        OpenSF__Card__c card = getCard('Test Card 1');

        AgentAssignCard.Request req = new AgentAssignCard.Request();
        req.cardId = card.Id;
        req.assigneeName = 'ZzNonExistentUserXx12345';

        Test.startTest();
        List<AgentAssignCard.Response> responses = AgentAssignCard.execute(
            new List<AgentAssignCard.Request>{ req }
        );
        Test.stopTest();

        AgentAssignCard.Response res = responses[0];
        System.assertEquals(
            false,
            res.success,
            'Should fail for non-existent user'
        );
        System.assert(
            res.message.contains('No active user found'),
            'Message should indicate user not found'
        );
    }

    @IsTest
    static void testSearchUsers() {
        User currentUser = [
            SELECT Id, Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        AgentSearchUsers.Request req = new AgentSearchUsers.Request();
        req.searchTerm = currentUser.Name;

        Test.startTest();
        List<AgentSearchUsers.Response> responses = AgentSearchUsers.execute(
            new List<AgentSearchUsers.Request>{ req }
        );
        Test.stopTest();

        AgentSearchUsers.Response res = responses[0];
        System.assert(
            res.totalFound >= 1,
            'Should find at least the current user'
        );
        System.assertNotEquals(
            null,
            res.users,
            'Users JSON should not be null'
        );
        System.assert(
            res.message.contains('Found'),
            'Message should indicate users found'
        );
    }

    @IsTest
    static void testGetUserWorkload() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard('Test Card 1');
        User currentUser = [
            SELECT Id, Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        // Assign a card to the current user
        card.OpenSF__Assignee__c = currentUser.Id;
        update card;

        AgentGetUserWorkload.Request req = new AgentGetUserWorkload.Request();
        req.boardId = board.Id;
        req.userName = currentUser.Name;

        Test.startTest();
        List<AgentGetUserWorkload.Response> responses = AgentGetUserWorkload.execute(
            new List<AgentGetUserWorkload.Request>{ req }
        );
        Test.stopTest();

        AgentGetUserWorkload.Response res = responses[0];
        System.assertEquals(
            currentUser.Name,
            res.userName,
            'User name should match'
        );
        System.assert(
            res.totalCards >= 1,
            'Should find at least one assigned card'
        );
        System.assert(
            res.totalStoryPoints >= 5,
            'Should include story points from assigned card'
        );
        System.assertNotEquals(
            null,
            res.cardsByStatus,
            'Cards by status JSON should not be null'
        );
    }
}
