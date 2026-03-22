/**
 * AgentUpdateCard - Agentforce invocable action to update card fields.
 * Only non-null request fields are applied to the card.
 */
public with sharing class AgentUpdateCard {
    public class Request {
        @InvocableVariable(
            required=true
            description='The Id of the card to update'
        )
        public Id cardId;

        @InvocableVariable(description='New subject / title')
        public String subject;

        @InvocableVariable(description='New description')
        public String description;

        @InvocableVariable(description='New priority')
        public String priority;

        @InvocableVariable(description='New card type')
        public String cardType;

        @InvocableVariable(description='New story points estimate')
        public Decimal storyPoints;

        @InvocableVariable(description='New due date')
        public Date dueDate;

        @InvocableVariable(description='New color')
        public String color;

        @InvocableVariable(description='Whether the card needs refinement')
        public Boolean needsRefinement;
    }

    public class Response {
        @InvocableVariable(description='Whether the update succeeded')
        public Boolean success;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Update Card'
        description='Updates one or more fields on an existing card'
    )
    public static List<Response> updateCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(updateCard(req));
        }
        return responses;
    }

    private static Response updateCard(Request req) {
        Response res = new Response();
        try {
            OpenSF__Card__c card = new OpenSF__Card__c(Id = req.cardId);
            Boolean hasUpdates = false;

            if (req.subject != null) {
                card.OpenSF__Subject__c = req.subject;
                hasUpdates = true;
            }
            if (req.description != null) {
                card.OpenSF__Description__c = req.description;
                hasUpdates = true;
            }
            if (req.priority != null) {
                card.OpenSF__Priority__c = req.priority;
                hasUpdates = true;
            }
            if (req.cardType != null) {
                card.OpenSF__CardType__c = req.cardType;
                hasUpdates = true;
            }
            if (req.storyPoints != null) {
                card.OpenSF__StoryPoints__c = req.storyPoints;
                hasUpdates = true;
            }
            if (req.dueDate != null) {
                card.OpenSF__DueDate__c = req.dueDate;
                hasUpdates = true;
            }
            if (req.color != null) {
                card.OpenSF__Color__c = req.color;
                hasUpdates = true;
            }
            if (req.needsRefinement != null) {
                card.OpenSF__NeedsRefinement__c = req.needsRefinement;
                hasUpdates = true;
            }

            if (!hasUpdates) {
                res.success = false;
                res.message = 'No fields provided to update.';
                return res;
            }

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Card__c>{ card }
                )
                .getRecords();

            res.success = true;
            res.message = 'Card updated successfully.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error updating card: ' + e.getMessage();
        }
        return res;
    }
}
