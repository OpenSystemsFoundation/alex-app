@isTest
public class EpicServiceTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Epic Test Board');
        OpenSF__Column__c todoCol = TestFactory.createColumn(
            board.Id,
            'To Do',
            LexoRank.initial(),
            '#1B96FF'
        );
        todoCol.OpenSF__Category__c = 'To Do';
        update todoCol;

        OpenSF__Column__c doneCol = TestFactory.createColumn(
            board.Id,
            'Done',
            LexoRank.between(LexoRank.initial(), null),
            '#4BC076'
        );
        doneCol.OpenSF__Category__c = 'Done';
        update doneCol;

        // Create an Epic card
        OpenSF__Card__c epic = TestFactory.createCard(
            todoCol.Id,
            'Test Epic',
            'Epic',
            'To Do',
            LexoRank.initial()
        );

        // Create child cards linked to the epic
        String pos = LexoRank.initial();
        for (Integer i = 0; i < 3; i++) {
            pos = LexoRank.between(pos, null);
            OpenSF__Card__c child = TestFactory.createCard(
                todoCol.Id,
                'Story ' + i,
                'Story',
                'To Do',
                pos
            );
            child.OpenSF__Epic__c = epic.Id;
            child.OpenSF__StoryPoints__c = 3;
            update child;
        }

        // Create a done child card
        String donePos = LexoRank.initial();
        OpenSF__Card__c doneChild = TestFactory.createCard(
            doneCol.Id,
            'Done Story',
            'Story',
            'Done',
            donePos
        );
        doneChild.OpenSF__Epic__c = epic.Id;
        doneChild.OpenSF__StoryPoints__c = 5;
        update doneChild;

        // Create a card with no epic
        TestFactory.createCard(todoCol.Id, 'Orphan Card');
    }

    @isTest
    static void testGetEpicSummaries() {
        Id boardId = [SELECT Id FROM OpenSF__Board__c LIMIT 1].Id;

        Test.startTest();
        List<KanbanBoardDTO.EpicSummaryDTO> summaries = EpicService.getEpicSummaries(
            boardId
        );
        Test.stopTest();

        System.assertEquals(1, summaries.size(), 'Should find 1 epic');
        KanbanBoardDTO.EpicSummaryDTO summary = summaries[0];
        System.assertEquals(
            'Test Epic',
            summary.subject,
            'Epic subject should match'
        );
        System.assertEquals(
            4,
            summary.totalCards,
            'Should have 4 child cards'
        );
        System.assertEquals(
            1,
            summary.completedCards,
            'Should have 1 completed card'
        );
        System.assert(
            summary.totalPoints > 0,
            'Should have total story points'
        );
        System.assertEquals(
            25,
            summary.progressPercent,
            'Progress should be 25% (1 of 4)'
        );
    }

    @isTest
    static void testGetEpicSummariesEmptyBoard() {
        OpenSF__Board__c emptyBoard = TestFactory.createBoard('Empty Board');

        Test.startTest();
        List<KanbanBoardDTO.EpicSummaryDTO> summaries = EpicService.getEpicSummaries(
            emptyBoard.Id
        );
        Test.stopTest();

        System.assertEquals(
            0,
            summaries.size(),
            'Empty board should have no epics'
        );
    }

    @isTest
    static void testGetEpicDetail() {
        OpenSF__Card__c epic = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.EpicSummaryDTO detail = EpicService.getEpicDetail(
            epic.Id
        );
        Test.stopTest();

        System.assertEquals('Test Epic', detail.subject, 'Subject should match');
        System.assertEquals(
            4,
            detail.totalCards,
            'Should have 4 child cards'
        );
        System.assertNotEquals(
            null,
            detail.childCards,
            'Child cards list should not be null'
        );
        System.assertEquals(
            4,
            detail.childCards.size(),
            'Child cards list should have 4 entries'
        );

        // Verify child card DTO fields
        KanbanBoardDTO.EpicChildCardDTO firstChild = detail.childCards[0];
        System.assertNotEquals(null, firstChild.id, 'Child ID should exist');
        System.assertNotEquals(null, firstChild.name, 'Child name should exist');
    }

    @isTest
    static void testGetEpicDetailNonEpicCard() {
        OpenSF__Card__c story = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Story'
            LIMIT 1
        ];

        Test.startTest();
        try {
            EpicService.getEpicDetail(story.Id);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('not an Epic'),
                'Should indicate card is not an Epic'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testControllerGetEpicSummaries() {
        Id boardId = [SELECT Id FROM OpenSF__Board__c LIMIT 1].Id;

        Test.startTest();
        List<KanbanBoardDTO.EpicSummaryDTO> summaries = KanbanBoardController.getEpicSummaries(
            boardId
        );
        Test.stopTest();

        System.assertEquals(1, summaries.size(), 'Controller should return epics');
    }

    @isTest
    static void testControllerGetEpicDetail() {
        OpenSF__Card__c epic = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.EpicSummaryDTO detail = KanbanBoardController.getEpicDetail(
            epic.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, detail, 'Should return detail');
        System.assertEquals(4, detail.totalCards, 'Should have 4 child cards');
    }

    @isTest
    static void testEpicCardsCountTrigger() {
        OpenSF__Card__c epic = [
            SELECT Id, OpenSF__EpicCardsCount__c
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            LIMIT 1
        ];

        // EpicCardsCount should have been updated by trigger
        System.assertEquals(
            4,
            epic.OpenSF__EpicCardsCount__c,
            'Epic should show 4 linked cards'
        );

        // Remove one child card's epic link
        OpenSF__Card__c child = [
            SELECT Id, OpenSF__Epic__c
            FROM OpenSF__Card__c
            WHERE
                OpenSF__Epic__c = :epic.Id
                AND OpenSF__CardType__c = 'Story'
            LIMIT 1
        ];

        Test.startTest();
        child.OpenSF__Epic__c = null;
        update child;
        Test.stopTest();

        epic = [
            SELECT OpenSF__EpicCardsCount__c
            FROM OpenSF__Card__c
            WHERE Id = :epic.Id
        ];
        System.assertEquals(
            3,
            epic.OpenSF__EpicCardsCount__c,
            'Epic count should decrease to 3'
        );
    }

    @isTest
    static void testEpicSelectorMethods() {
        Id boardId = [SELECT Id FROM OpenSF__Board__c LIMIT 1].Id;
        OpenSF__Card__c epic = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            LIMIT 1
        ];

        Test.startTest();
        List<OpenSF__Card__c> epics = KanbanBoardSelector.getEpicsByBoardId(
            boardId
        );
        List<OpenSF__Card__c> children = KanbanBoardSelector.getChildCardsByEpicId(
            epic.Id
        );
        Test.stopTest();

        System.assertEquals(1, epics.size(), 'Should find 1 epic');
        System.assertEquals(
            4,
            children.size(),
            'Should find 4 child cards'
        );
    }

    @isTest
    static void testEnrichedEpicDTO() {
        OpenSF__Card__c epic = [
            SELECT
                Id,
                OpenSF__Subject__c,
                OpenSF__Color__c,
                OpenSF__Epic__c,
                OpenSF__Epic__r.OpenSF__Subject__c,
                OpenSF__Epic__r.OpenSF__Color__c
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.EpicDTO dto = new KanbanBoardDTO.EpicDTO(epic);
        Test.stopTest();

        System.assertEquals(epic.Id, dto.id, 'ID should match');
        System.assertEquals(
            'Test Epic',
            dto.subject,
            'Subject should match'
        );
    }
}
