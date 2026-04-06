/**
 * CardCommentService - CRUD operations for card comments
 */
public with sharing class CardCommentService {
    /**
     * Standard comment field list used by all comment queries.
     */
    private static final String COMMENT_FIELDS = String.join(
        new List<String>{
            'Id',
            'Name',
            'OpenSF__Body__c',
            'OpenSF__Card__c',
            'CreatedById',
            'CreatedBy.Name',
            'CreatedBy.SmallPhotoUrl',
            'CreatedDate',
            'LastModifiedDate'
        },
        ', '
    );

    /**
     * Query a single comment by Id with all standard fields.
     */
    private static OpenSF__CardComment__c queryCommentById(Id commentId) {
        return Database.query(
            'SELECT ' +
                COMMENT_FIELDS +
                ' FROM OpenSF__CardComment__c' +
                ' WHERE Id = :commentId' +
                ' WITH SECURITY_ENFORCED'
        );
    }

    /**
     * Get comments for a card, ordered newest first
     */
    public static List<KanbanBoardDTO.CardCommentDTO> getComments(Id cardId) {
        List<OpenSF__CardComment__c> comments = Database.query(
            'SELECT ' +
                COMMENT_FIELDS +
                ' FROM OpenSF__CardComment__c' +
                ' WHERE OpenSF__Card__c = :cardId' +
                ' WITH SECURITY_ENFORCED' +
                ' ORDER BY CreatedDate DESC' +
                ' LIMIT 200'
        );
        List<KanbanBoardDTO.CardCommentDTO> dtos = new List<KanbanBoardDTO.CardCommentDTO>();
        for (OpenSF__CardComment__c c : comments) {
            dtos.add(new KanbanBoardDTO.CardCommentDTO(c));
        }
        return dtos;
    }

    /**
     * Add a comment to a card
     */
    public static KanbanBoardDTO.CardCommentDTO addComment(
        Id cardId,
        String body
    ) {
        if (String.isBlank(body)) {
            AuraHandledException ex = new AuraHandledException(
                'Comment body cannot be empty'
            );
            ex.setMessage('Comment body cannot be empty');
            throw ex;
        }
        OpenSF__CardComment__c comment = new OpenSF__CardComment__c(
            OpenSF__Card__c = cardId,
            OpenSF__Body__c = body.trim()
        );
        List<OpenSF__CardComment__c> toInsert = Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__CardComment__c>{ comment }
            )
            .getRecords();
        insert toInsert;

        // Re-query to get CreatedBy fields
        comment = queryCommentById(toInsert[0].Id);
        return new KanbanBoardDTO.CardCommentDTO(comment);
    }

    /**
     * Update a comment body (only the author can update)
     */
    public static KanbanBoardDTO.CardCommentDTO updateComment(
        Id commentId,
        String body
    ) {
        if (String.isBlank(body)) {
            AuraHandledException ex = new AuraHandledException(
                'Comment body cannot be empty'
            );
            ex.setMessage('Comment body cannot be empty');
            throw ex;
        }
        OpenSF__CardComment__c comment = [
            SELECT Id, CreatedById
            FROM OpenSF__CardComment__c
            WHERE Id = :commentId
            WITH SECURITY_ENFORCED
        ];
        if (comment.CreatedById != UserInfo.getUserId()) {
            AuraHandledException ex = new AuraHandledException(
                'You can only edit your own comments'
            );
            ex.setMessage('You can only edit your own comments');
            throw ex;
        }
        comment.OpenSF__Body__c = body.trim();
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__CardComment__c>{ comment }
            )
            .getRecords();

        comment = queryCommentById(comment.Id);
        return new KanbanBoardDTO.CardCommentDTO(comment);
    }

    /**
     * Delete a comment (only the author can delete)
     */
    public static void deleteComment(Id commentId) {
        OpenSF__CardComment__c comment = [
            SELECT Id, CreatedById
            FROM OpenSF__CardComment__c
            WHERE Id = :commentId
            WITH SECURITY_ENFORCED
        ];
        if (comment.CreatedById != UserInfo.getUserId()) {
            AuraHandledException ex = new AuraHandledException(
                'You can only delete your own comments'
            );
            ex.setMessage('You can only delete your own comments');
            throw ex;
        }
        delete comment;
    }
}
