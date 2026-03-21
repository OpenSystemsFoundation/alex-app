/**
 * AgentMoveCard - Agentforce invocable action to move a card to a named column.
 * Looks up the column by header name and board, then updates the card.
 */
public with sharing class AgentMoveCard {
    public class Request {
        @InvocableVariable(required=true description='The Id of the card to move')
        public Id cardId;

        @InvocableVariable(required=true description='The name of the target column')
        public String targetColumnName;

        @InvocableVariable(required=true description='The Id of the board')
        public Id boardId;
    }

    public class Response {
        @InvocableVariable(description='Whether the move succeeded')
        public Boolean success;

        @InvocableVariable(description='Status message')
        public String message;

        @InvocableVariable(description='The name of the column the card was moved to')
        public String newColumnName;
    }

    @InvocableMethod(
        label='Move Card'
        description='Moves a card to a different column by column name'
    )
    public static List<Response> moveCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(moveCard(req));
        }
        return responses;
    }

    private static Response moveCard(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Column__c> columns = [
                SELECT Id, OpenSF__ColumnHeader__c, OpenSF__Status__c
                FROM OpenSF__Column__c
                WHERE
                    OpenSF__ColumnHeader__c = :req.targetColumnName
                    AND OpenSF__Board__c = :req.boardId
                WITH USER_MODE
                LIMIT 1
            ];

            if (columns.isEmpty()) {
                res.success = false;
                res.message = 'Column "' + req.targetColumnName + '" not found on this board.';
                return res;
            }

            OpenSF__Column__c targetColumn = columns[0];

            OpenSF__Card__c card = new OpenSF__Card__c(
                Id = req.cardId,
                OpenSF__Column__c = targetColumn.Id
            );

            if (targetColumn.OpenSF__Status__c != null) {
                card.OpenSF__Status__c = targetColumn.OpenSF__Status__c;
            }

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Card__c>{ card }
                )
                .getRecords();

            res.success = true;
            res.newColumnName = targetColumn.OpenSF__ColumnHeader__c;
            res.message = 'Card moved to "' + targetColumn.OpenSF__ColumnHeader__c + '" successfully.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error moving card: ' + e.getMessage();
        }
        return res;
    }
}
