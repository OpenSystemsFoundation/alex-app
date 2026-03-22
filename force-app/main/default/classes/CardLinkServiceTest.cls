@isTest
private class CardLinkServiceTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Link Test Board');
        OpenSF__Column__c col = TestFactory.createColumn(board.Id, 'To Do');
        TestFactory.createCards(col.Id, 3);
    }

    static List<OpenSF__Card__c> getCards() {
        return [
            SELECT Id, Name, OpenSF__Subject__c
            FROM OpenSF__Card__c
            ORDER BY Name
        ];
    }

    @isTest
    static void testCreateCardLink() {
        List<OpenSF__Card__c> cards = getCards();

        Test.startTest();
        KanbanBoardDTO.CardLinkDTO result = CardLinkService.createCardLink(
            cards[0].Id,
            cards[1].Id,
            'Blocks'
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Link should be created');
        System.assertEquals('Blocks', result.linkType);
        System.assertEquals(cards[1].Id, result.targetCardId);
    }

    @isTest
    static void testCreateCardLinkSelfReference() {
        List<OpenSF__Card__c> cards = getCards();

        Test.startTest();
        Boolean caught = false;
        try {
            CardLinkService.createCardLink(
                cards[0].Id,
                cards[0].Id,
                'Relates To'
            );
        } catch (AuraHandledException e) {
            caught = true;
        }
        Test.stopTest();

        System.assert(caught, 'Should have thrown AuraHandledException');
    }

    @isTest
    static void testCreateDuplicateLink() {
        List<OpenSF__Card__c> cards = getCards();
        CardLinkService.createCardLink(cards[0].Id, cards[1].Id, 'Blocks');

        Test.startTest();
        Boolean caught = false;
        try {
            CardLinkService.createCardLink(
                cards[0].Id,
                cards[1].Id,
                'Relates To'
            );
        } catch (AuraHandledException e) {
            caught = true;
        }
        Test.stopTest();

        System.assert(caught, 'Should have thrown AuraHandledException');
    }

    @isTest
    static void testGetCardLinks() {
        List<OpenSF__Card__c> cards = getCards();
        CardLinkService.createCardLink(cards[0].Id, cards[1].Id, 'Blocks');
        CardLinkService.createCardLink(cards[0].Id, cards[2].Id, 'Relates To');

        Test.startTest();
        List<KanbanBoardDTO.CardLinkDTO> links = CardLinkService.getCardLinks(
            cards[0].Id
        );
        Test.stopTest();

        System.assertEquals(2, links.size(), 'Should return 2 links');
    }

    @isTest
    static void testGetCardLinksFromTargetPerspective() {
        List<OpenSF__Card__c> cards = getCards();
        CardLinkService.createCardLink(cards[0].Id, cards[1].Id, 'Blocks');

        Test.startTest();
        List<KanbanBoardDTO.CardLinkDTO> links = CardLinkService.getCardLinks(
            cards[1].Id
        );
        Test.stopTest();

        System.assertEquals(1, links.size());
        System.assertEquals(
            'Is Blocked By',
            links[0].linkType,
            'Should show inverse link type from target perspective'
        );
    }

    @isTest
    static void testDeleteCardLink() {
        List<OpenSF__Card__c> cards = getCards();
        KanbanBoardDTO.CardLinkDTO link = CardLinkService.createCardLink(
            cards[0].Id,
            cards[1].Id,
            'Blocks'
        );

        Test.startTest();
        CardLinkService.deleteCardLink(link.Id);
        Test.stopTest();

        List<OpenSF__CardLink__c> remaining = [
            SELECT Id
            FROM OpenSF__CardLink__c
        ];
        System.assertEquals(0, remaining.size(), 'Link should be deleted');
    }

    @isTest
    static void testSearchCardsForLinking() {
        List<OpenSF__Card__c> cards = getCards();

        Test.startTest();
        List<CardLinkService.CardSearchResult> results = CardLinkService.searchCardsForLinking(
            cards[0].Id,
            'Test Card'
        );
        Test.stopTest();

        System.assertEquals(
            2,
            results.size(),
            'Should find 2 cards (excluding the source card)'
        );
    }

    @isTest
    static void testSearchExcludesAlreadyLinked() {
        List<OpenSF__Card__c> cards = getCards();
        CardLinkService.createCardLink(cards[0].Id, cards[1].Id, 'Blocks');

        Test.startTest();
        List<CardLinkService.CardSearchResult> results = CardLinkService.searchCardsForLinking(
            cards[0].Id,
            'Test Card'
        );
        Test.stopTest();

        System.assertEquals(
            1,
            results.size(),
            'Should find 1 card (excluding source and already linked)'
        );
    }

    @isTest
    static void testControllerGetCardLinks() {
        List<OpenSF__Card__c> cards = getCards();
        CardLinkService.createCardLink(cards[0].Id, cards[1].Id, 'Relates To');

        Test.startTest();
        List<KanbanBoardDTO.CardLinkDTO> links = KanbanBoardController.getCardLinks(
            cards[0].Id
        );
        Test.stopTest();

        System.assertEquals(1, links.size());
    }

    @isTest
    static void testControllerCreateCardLink() {
        List<OpenSF__Card__c> cards = getCards();

        Test.startTest();
        KanbanBoardDTO.CardLinkDTO link = KanbanBoardController.createCardLink(
            cards[0].Id,
            cards[1].Id,
            'Blocks'
        );
        Test.stopTest();

        System.assertNotEquals(null, link.Id);
    }

    @isTest
    static void testControllerDeleteCardLink() {
        List<OpenSF__Card__c> cards = getCards();
        KanbanBoardDTO.CardLinkDTO link = CardLinkService.createCardLink(
            cards[0].Id,
            cards[1].Id,
            'Blocks'
        );

        Test.startTest();
        KanbanBoardController.deleteCardLink(link.Id);
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM OpenSF__CardLink__c]);
    }

    @isTest
    static void testControllerSearchCardsForLinking() {
        List<OpenSF__Card__c> cards = getCards();

        Test.startTest();
        List<CardLinkService.CardSearchResult> results = KanbanBoardController.searchCardsForLinking(
            cards[0].Id,
            'Test Card'
        );
        Test.stopTest();

        System.assert(results.size() > 0, 'Should return search results');
    }

    @isTest
    static void testInverseLinkTypes() {
        System.assertEquals(
            'Is Blocked By',
            KanbanEnums.inverseLinkType('Blocks')
        );
        System.assertEquals(
            'Blocks',
            KanbanEnums.inverseLinkType('Is Blocked By')
        );
        System.assertEquals(
            'Is Duplicated By',
            KanbanEnums.inverseLinkType('Duplicates')
        );
        System.assertEquals(
            'Duplicates',
            KanbanEnums.inverseLinkType('Is Duplicated By')
        );
        System.assertEquals(
            'Relates To',
            KanbanEnums.inverseLinkType('Relates To')
        );
    }
}
