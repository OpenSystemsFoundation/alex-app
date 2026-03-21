/**
 * AgentGetCardDetails - Agentforce invocable action to retrieve full details for a card.
 */
public with sharing class AgentGetCardDetails {
    public class Request {
        @InvocableVariable(required=true description='The Id of the card to retrieve')
        public Id cardId;
    }

    public class Response {
        @InvocableVariable(description='Card Id')
        public Id cardId;

        @InvocableVariable(description='Card auto-number name')
        public String cardName;

        @InvocableVariable(description='Card subject')
        public String subject;

        @InvocableVariable(description='Card description')
        public String description;

        @InvocableVariable(description='Priority')
        public String priority;

        @InvocableVariable(description='Status')
        public String status;

        @InvocableVariable(description='Card type')
        public String cardType;

        @InvocableVariable(description='Story points')
        public Decimal storyPoints;

        @InvocableVariable(description='Due date')
        public Date dueDate;

        @InvocableVariable(description='Color')
        public String color;

        @InvocableVariable(description='Whether the card needs refinement')
        public Boolean needsRefinement;

        @InvocableVariable(description='Whether the card is locked')
        public Boolean locked;

        @InvocableVariable(description='Assignee name')
        public String assigneeName;

        @InvocableVariable(description='Peer reviewer name')
        public String peerReviewerName;

        @InvocableVariable(description='Epic subject')
        public String epicSubject;

        @InvocableVariable(description='Column name')
        public String columnName;

        @InvocableVariable(description='Board Id')
        public Id boardId;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Get Card Details'
        description='Retrieves the full details of a card'
    )
    public static List<Response> getCardDetails(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getDetails(req));
        }
        return responses;
    }

    private static Response getDetails(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Card__c> cards = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Subject__c,
                    OpenSF__Description__c,
                    OpenSF__Priority__c,
                    OpenSF__Status__c,
                    OpenSF__CardType__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__DueDate__c,
                    OpenSF__Color__c,
                    OpenSF__NeedsRefinement__c,
                    OpenSF__Locked__c,
                    OpenSF__Board__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__PeerReviewer__r.Name,
                    OpenSF__Epic__r.OpenSF__Subject__c,
                    OpenSF__Column__r.OpenSF__ColumnHeader__c
                FROM OpenSF__Card__c
                WHERE Id = :req.cardId
                WITH USER_MODE
                LIMIT 1
            ];

            if (cards.isEmpty()) {
                res.message = 'Card not found.';
                return res;
            }

            OpenSF__Card__c card = cards[0];
            res.cardId = card.Id;
            res.cardName = card.Name;
            res.subject = card.OpenSF__Subject__c;
            res.description = card.OpenSF__Description__c;
            res.priority = card.OpenSF__Priority__c;
            res.status = card.OpenSF__Status__c;
            res.cardType = card.OpenSF__CardType__c;
            res.storyPoints = card.OpenSF__StoryPoints__c;
            res.dueDate = card.OpenSF__DueDate__c;
            res.color = card.OpenSF__Color__c;
            res.needsRefinement = card.OpenSF__NeedsRefinement__c;
            res.locked = card.OpenSF__Locked__c;
            res.boardId = card.OpenSF__Board__c;
            res.assigneeName = card.OpenSF__Assignee__r != null ? card.OpenSF__Assignee__r.Name : null;
            res.peerReviewerName = card.OpenSF__PeerReviewer__r != null ? card.OpenSF__PeerReviewer__r.Name : null;
            res.epicSubject = card.OpenSF__Epic__r != null ? card.OpenSF__Epic__r.OpenSF__Subject__c : null;
            res.columnName = card.OpenSF__Column__r != null ? card.OpenSF__Column__r.OpenSF__ColumnHeader__c : null;
            res.message = 'Card details retrieved successfully.';
        } catch (Exception e) {
            res.message = 'Error retrieving card details: ' + e.getMessage();
        }
        return res;
    }
}
