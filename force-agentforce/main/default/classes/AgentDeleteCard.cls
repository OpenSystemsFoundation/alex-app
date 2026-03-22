/**
 * AgentDeleteCard - Agentforce invocable action to delete a card.
 */
public with sharing class AgentDeleteCard {
    public class Request {
        @InvocableVariable(
            required=true
            description='The Id of the card to delete'
        )
        public Id cardId;
    }

    public class Response {
        @InvocableVariable(description='Whether the delete succeeded')
        public Boolean success;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Delete Card'
        description='Deletes a card from a board'
    )
    public static List<Response> deleteCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(deleteCard(req));
        }
        return responses;
    }

    private static Response deleteCard(Request req) {
        Response res = new Response();
        try {
            if (!Schema.sObjectType.OpenSF__Card__c.isDeletable()) {
                res.success = false;
                res.message = 'Insufficient access to delete cards.';
                return res;
            }

            delete new OpenSF__Card__c(Id = req.cardId);

            res.success = true;
            res.message = 'Card deleted successfully.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error deleting card: ' + e.getMessage();
        }
        return res;
    }
}
