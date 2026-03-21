/**
 * AgentAssignCard - Agentforce invocable action to assign a user to a card
 * as either the Assignee or Peer Reviewer.
 */
public with sharing class AgentAssignCard {

    public class Request {
        @InvocableVariable(required=true description='The ID of the card to assign')
        public Id cardId;
        @InvocableVariable(required=true description='Name of the user to assign (partial match supported)')
        public String assigneeName;
        @InvocableVariable(description='If true, set as Peer Reviewer instead of Assignee')
        public Boolean setPeerReviewer;
    }

    public class Response {
        @InvocableVariable(description='Whether the assignment was successful')
        public Boolean success;
        @InvocableVariable(description='Full name of the assigned user')
        public String assignedUserName;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(label='Assign Card' description='Assigns a user to a card as Assignee or Peer Reviewer')
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(assignCard(req));
        }
        return responses;
    }

    private static Response assignCard(Request req) {
        Response res = new Response();
        res.success = false;
        try {
            List<OpenSF__Card__c> cards = [
                SELECT Id, Name
                FROM OpenSF__Card__c
                WHERE Id = :req.cardId
                WITH USER_MODE
                LIMIT 1
            ];
            if (cards.isEmpty()) {
                res.message = 'Card not found with ID: ' + req.cardId;
                return res;
            }

            String searchPattern = '%' + String.escapeSingleQuotes(req.assigneeName) + '%';
            List<User> users = [
                SELECT Id, Name
                FROM User
                WHERE Name LIKE :searchPattern
                    AND IsActive = true
                WITH USER_MODE
                LIMIT 1
            ];
            if (users.isEmpty()) {
                res.message = 'No active user found matching name: ' + req.assigneeName;
                return res;
            }

            User matchedUser = users[0];
            Boolean isPeerReviewer = req.setPeerReviewer != null && req.setPeerReviewer;

            OpenSF__Card__c cardToUpdate = new OpenSF__Card__c(Id = req.cardId);
            if (isPeerReviewer) {
                cardToUpdate.OpenSF__PeerReviewer__c = matchedUser.Id;
            } else {
                cardToUpdate.OpenSF__Assignee__c = matchedUser.Id;
            }

            SObjectAccessDecision decision = Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Card__c>{ cardToUpdate }
            );
            update decision.getRecords();

            String role = isPeerReviewer ? 'Peer Reviewer' : 'Assignee';
            res.success = true;
            res.assignedUserName = matchedUser.Name;
            res.message = 'Successfully set ' + matchedUser.Name + ' as ' + role + ' on card ' + cards[0].Name + '.';
        } catch (Exception e) {
            res.message = 'Error assigning card: ' + e.getMessage();
        }
        return res;
    }
}
