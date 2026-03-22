/**
 * CardCommentServiceTest - Test class for CardCommentService
 */
@isTest
public class CardCommentServiceTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestFactory.createColumn(board.Id, 'To Do');
        TestFactory.createCard(column.Id, 'Test Card');
    }

    private static OpenSF__Card__c getTestCard() {
        return [
            SELECT Id, OpenSF__Subject__c
            FROM OpenSF__Card__c
            LIMIT 1
        ];
    }

    @isTest
    static void testAddComment() {
        OpenSF__Card__c card = getTestCard();

        Test.startTest();
        KanbanBoardDTO.CardCommentDTO result = CardCommentService.addComment(
            card.Id,
            'This is a test comment'
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Comment should be created');
        System.assertEquals(
            'This is a test comment',
            result.body,
            'Body should match'
        );
        System.assertEquals(card.Id, result.cardId, 'Card ID should match');
        System.assertNotEquals(
            null,
            result.createdByName,
            'Created by name should be populated'
        );
    }

    @isTest
    static void testAddCommentBlankBody() {
        OpenSF__Card__c card = getTestCard();

        Test.startTest();
        try {
            CardCommentService.addComment(card.Id, '');
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('empty'),
                'Should mention empty body'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testGetComments() {
        OpenSF__Card__c card = getTestCard();

        // Insert comments directly
        List<OpenSF__CardComment__c> comments = new List<OpenSF__CardComment__c>();
        for (Integer i = 0; i < 3; i++) {
            comments.add(
                new OpenSF__CardComment__c(
                    OpenSF__Card__c = card.Id,
                    OpenSF__Body__c = 'Comment ' + i
                )
            );
        }
        insert comments;

        Test.startTest();
        List<KanbanBoardDTO.CardCommentDTO> results = CardCommentService.getComments(
            card.Id
        );
        Test.stopTest();

        System.assertEquals(3, results.size(), 'Should return 3 comments');
    }

    @isTest
    static void testUpdateComment() {
        OpenSF__Card__c card = getTestCard();
        OpenSF__CardComment__c comment = new OpenSF__CardComment__c(
            OpenSF__Card__c = card.Id,
            OpenSF__Body__c = 'Original text'
        );
        insert comment;

        Test.startTest();
        KanbanBoardDTO.CardCommentDTO result = CardCommentService.updateComment(
            comment.Id,
            'Updated text'
        );
        Test.stopTest();

        System.assertEquals(
            'Updated text',
            result.body,
            'Body should be updated'
        );
    }

    @isTest
    static void testDeleteComment() {
        OpenSF__Card__c card = getTestCard();
        OpenSF__CardComment__c comment = new OpenSF__CardComment__c(
            OpenSF__Card__c = card.Id,
            OpenSF__Body__c = 'To be deleted'
        );
        insert comment;

        Test.startTest();
        CardCommentService.deleteComment(comment.Id);
        Test.stopTest();

        List<OpenSF__CardComment__c> remaining = [
            SELECT Id
            FROM OpenSF__CardComment__c
            WHERE Id = :comment.Id
        ];
        System.assertEquals(0, remaining.size(), 'Comment should be deleted');
    }

    @isTest
    static void testControllerGetComments() {
        OpenSF__Card__c card = getTestCard();
        insert new OpenSF__CardComment__c(
            OpenSF__Card__c = card.Id,
            OpenSF__Body__c = 'Test via controller'
        );

        Test.startTest();
        List<KanbanBoardDTO.CardCommentDTO> results = KanbanBoardController.getCardComments(
            card.Id
        );
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return 1 comment');
    }

    @isTest
    static void testControllerAddComment() {
        OpenSF__Card__c card = getTestCard();

        Test.startTest();
        KanbanBoardDTO.CardCommentDTO result = KanbanBoardController.addCardComment(
            card.Id,
            'Controller comment'
        );
        Test.stopTest();

        System.assertNotEquals(null, result.Id, 'Comment should be created');
    }

    @isTest
    static void testControllerUpdateComment() {
        OpenSF__Card__c card = getTestCard();
        OpenSF__CardComment__c comment = new OpenSF__CardComment__c(
            OpenSF__Card__c = card.Id,
            OpenSF__Body__c = 'Original'
        );
        insert comment;

        Test.startTest();
        KanbanBoardDTO.CardCommentDTO result = KanbanBoardController.updateCardComment(
            comment.Id,
            'Updated via controller'
        );
        Test.stopTest();

        System.assertEquals('Updated via controller', result.body);
    }

    @isTest
    static void testControllerDeleteComment() {
        OpenSF__Card__c card = getTestCard();
        OpenSF__CardComment__c comment = new OpenSF__CardComment__c(
            OpenSF__Card__c = card.Id,
            OpenSF__Body__c = 'To delete'
        );
        insert comment;

        Test.startTest();
        KanbanBoardController.deleteCardComment(comment.Id);
        Test.stopTest();

        Integer count = [
            SELECT COUNT()
            FROM OpenSF__CardComment__c
            WHERE Id = :comment.Id
        ];
        System.assertEquals(0, count, 'Comment should be deleted');
    }
}
