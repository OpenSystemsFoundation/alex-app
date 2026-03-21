@IsTest
private class RetrospectiveControllerTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = new OpenSF__Board__c(
            OpenSF__Active__c = true,
            OpenSF__Status__c = 'Published',
            OpenSF__Description__c = 'Test Board'
        );
        insert board;

        OpenSF__Column__c col = new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__LexoRankPosition__c = 'a'
        );
        insert col;

        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'Active',
            OpenSF__Goal__c = 'Test Sprint',
            OpenSF__StartDate__c = Date.today(),
            OpenSF__EndDate__c = Date.today().addDays(14)
        );
        insert sprint;

        OpenSF__Retrospective__c retro = new OpenSF__Retrospective__c(
            OpenSF__Sprint__c = sprint.Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Status__c = 'Active',
            OpenSF__Template__c = 'Start_Stop_Continue',
            OpenSF__ShowAlways__c = false,
            OpenSF__Revealed__c = false,
            OpenSF__MaxVotesPerUser__c = 5
        );
        insert retro;
    }

    static OpenSF__Retrospective__c getRetro() {
        return [SELECT Id FROM OpenSF__Retrospective__c LIMIT 1];
    }

    static OpenSF__Board__c getBoard() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    @IsTest
    static void testGetRetroData() {
        OpenSF__Retrospective__c retro = getRetro();

        Test.startTest();
        RetrospectiveService.RetroData data = RetrospectiveController.getRetroData(
            retro.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, data, 'Data should not be null');
        System.assertNotEquals(null, data.retro, 'Retro should not be null');
        System.assertEquals(
            'Start_Stop_Continue',
            data.retro.template,
            'Template should match'
        );
        System.assertEquals(
            3,
            data.categories.size(),
            'Should have 3 categories'
        );
        System.assertEquals(
            'Start',
            data.categories[0],
            'First category should be Start'
        );
    }

    @IsTest
    static void testCreateRetroCard() {
        OpenSF__Retrospective__c retro = getRetro();

        Test.startTest();
        RetrospectiveDTO.RetroCardDTO card = RetrospectiveController.createRetroCard(
            retro.Id,
            'Start',
            'We should start doing daily standups'
        );
        Test.stopTest();

        System.assertNotEquals(null, card, 'Card should not be null');
        System.assertEquals('Start', card.category, 'Category should match');
        System.assertEquals(
            'We should start doing daily standups',
            card.text,
            'Text should match'
        );
        System.assertEquals(
            UserInfo.getUserId(),
            card.authorId,
            'Author should be current user'
        );
    }

    @IsTest
    static void testToggleVote() {
        OpenSF__Retrospective__c retro = getRetro();

        // Create a card first
        OpenSF__RetroCard__c card = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Start',
            OpenSF__Text__c = 'Test card',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        insert card;

        Test.startTest();
        // Vote
        RetrospectiveDTO.RetroCardDTO voted = RetrospectiveController.toggleVote(
            card.Id
        );
        System.assertEquals(true, voted.hasVoted, 'Should have voted');

        // Unvote
        RetrospectiveDTO.RetroCardDTO unvoted = RetrospectiveController.toggleVote(
            card.Id
        );
        System.assertEquals(false, unvoted.hasVoted, 'Should have unvoted');
        Test.stopTest();
    }

    @IsTest
    static void testRevealAuthors() {
        OpenSF__Retrospective__c retro = getRetro();

        Test.startTest();
        RetrospectiveController.revealAuthors(retro.Id);
        Test.stopTest();

        OpenSF__Retrospective__c updated = [
            SELECT OpenSF__Revealed__c
            FROM OpenSF__Retrospective__c
            WHERE Id = :retro.Id
        ];
        System.assertEquals(
            true,
            updated.OpenSF__Revealed__c,
            'Should be revealed'
        );
    }

    @IsTest
    static void testUpdateRetroStatus() {
        OpenSF__Retrospective__c retro = getRetro();

        Test.startTest();
        RetrospectiveDTO.RetroDTO updated = RetrospectiveController.updateRetroStatus(
            retro.Id,
            'Voting'
        );
        Test.stopTest();

        System.assertEquals(
            'Voting',
            updated.status,
            'Status should be updated'
        );
    }

    @IsTest
    static void testDeleteRetroCard() {
        OpenSF__Retrospective__c retro = getRetro();

        OpenSF__RetroCard__c card = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Stop',
            OpenSF__Text__c = 'Card to delete',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        insert card;

        Test.startTest();
        RetrospectiveController.deleteRetroCard(card.Id);
        Test.stopTest();

        List<OpenSF__RetroCard__c> remaining = [
            SELECT Id
            FROM OpenSF__RetroCard__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(0, remaining.size(), 'Card should be deleted');
    }

    @IsTest
    static void testCreateActionItem() {
        OpenSF__Retrospective__c retro = getRetro();
        OpenSF__Board__c board = getBoard();

        OpenSF__RetroCard__c card = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Start',
            OpenSF__Text__c = 'Action: Implement daily standups',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        insert card;

        Test.startTest();
        RetrospectiveDTO.RetroCardDTO result = RetrospectiveController.createActionItem(
            card.Id,
            board.Id,
            UserInfo.getUserId(),
            'first_column'
        );
        Test.stopTest();

        System.assertNotEquals(
            null,
            result.actionItemCardId,
            'Action item card should be created'
        );

        // Verify the kanban card was created
        OpenSF__Card__c kanbanCard = [
            SELECT
                Id,
                OpenSF__Subject__c,
                OpenSF__Assignee__c,
                OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :result.actionItemCardId
        ];
        System.assertEquals(
            'Action: Implement daily standups',
            kanbanCard.OpenSF__Subject__c,
            'Subject should match retro card text'
        );
        System.assertNotEquals(
            null,
            kanbanCard.OpenSF__Column__c,
            'Should be in first column'
        );
    }

    @IsTest
    static void testCreateActionItemBacklog() {
        OpenSF__Retrospective__c retro = getRetro();
        OpenSF__Board__c board = getBoard();

        OpenSF__RetroCard__c card = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Continue',
            OpenSF__Text__c = 'Backlog action item',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        insert card;

        Test.startTest();
        RetrospectiveDTO.RetroCardDTO result = RetrospectiveController.createActionItem(
            card.Id,
            board.Id,
            null,
            'backlog'
        );
        Test.stopTest();

        OpenSF__Card__c kanbanCard = [
            SELECT OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :result.actionItemCardId
        ];
        System.assertEquals(
            null,
            kanbanCard.OpenSF__Column__c,
            'Should be in backlog (no column)'
        );
    }

    @IsTest
    static void testGetBoards() {
        Test.startTest();
        List<KanbanBoardDTO.BoardDTO> boards = RetrospectiveController.getBoards();
        Test.stopTest();

        System.assert(boards.size() > 0, 'Should have at least one board');
    }

    @IsTest
    static void testGetCategoriesForTemplates() {
        System.assertEquals(
            3,
            RetrospectiveDTO.getCategoriesForTemplate('Start_Stop_Continue')
                .size()
        );
        System.assertEquals(
            3,
            RetrospectiveDTO.getCategoriesForTemplate('Mad_Sad_Glad').size()
        );
        System.assertEquals(
            4,
            RetrospectiveDTO.getCategoriesForTemplate('Four_Ls').size()
        );
        System.assertEquals(
            3,
            RetrospectiveDTO.getCategoriesForTemplate('Went_Well_Improve')
                .size()
        );
        System.assertEquals(
            3,
            RetrospectiveDTO.getCategoriesForTemplate(null).size()
        );
    }

    @IsTest
    static void testVoteLimitEnforced() {
        OpenSF__Retrospective__c retro = getRetro();

        // Set max votes to 1
        update new OpenSF__Retrospective__c(
            Id = retro.Id,
            OpenSF__MaxVotesPerUser__c = 1
        );

        // Create two cards
        OpenSF__RetroCard__c card1 = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Start',
            OpenSF__Text__c = 'Card 1',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        OpenSF__RetroCard__c card2 = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retro.Id,
            OpenSF__Category__c = 'Stop',
            OpenSF__Text__c = 'Card 2',
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = 0
        );
        insert new List<OpenSF__RetroCard__c>{ card1, card2 };

        Test.startTest();
        // First vote should succeed
        RetrospectiveController.toggleVote(card1.Id);

        // Second vote should fail
        Boolean exceptionThrown = false;
        try {
            RetrospectiveController.toggleVote(card2.Id);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Should throw exception for vote limit');
    }
}
