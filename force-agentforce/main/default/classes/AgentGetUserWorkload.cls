/**
 * AgentGetUserWorkload - Agentforce invocable action to retrieve workload
 * information for a specific user on a board.
 */
public with sharing class AgentGetUserWorkload {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the board to check workload on'
        )
        public Id boardId;
        @InvocableVariable(
            required=true
            description='Name of the user to check workload for'
        )
        public String userName;
    }

    public class Response {
        @InvocableVariable(description='Full name of the matched user')
        public String userName;
        @InvocableVariable(
            description='Total cards assigned to the user on this board'
        )
        public Integer totalCards;
        @InvocableVariable(
            description='JSON object of cards grouped by status: {status: count}'
        )
        public String cardsByStatus;
        @InvocableVariable(
            description='Total story points across all assigned cards'
        )
        public Decimal totalStoryPoints;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Get User Workload'
        description='Retrieves workload summary for a user on a specific board'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getUserWorkload(req));
        }
        return responses;
    }

    private static Response getUserWorkload(Request req) {
        Response res = new Response();
        try {
            String searchPattern =
                '%' +
                String.escapeSingleQuotes(req.userName) +
                '%';
            List<User> users = [
                SELECT Id, Name
                FROM User
                WHERE Name LIKE :searchPattern AND IsActive = TRUE
                WITH USER_MODE
                LIMIT 1
            ];
            if (users.isEmpty()) {
                res.message =
                    'No active user found matching name: ' + req.userName;
                return res;
            }
            User matchedUser = users[0];
            res.userName = matchedUser.Name;

            List<OpenSF__Card__c> cards = [
                SELECT Id, OpenSF__Status__c, OpenSF__StoryPoints__c
                FROM OpenSF__Card__c
                WHERE
                    OpenSF__Board__c = :req.boardId
                    AND OpenSF__Assignee__c = :matchedUser.Id
                WITH USER_MODE
            ];

            res.totalCards = cards.size();
            Decimal totalPoints = 0;
            Map<String, Integer> statusCounts = new Map<String, Integer>();
            for (OpenSF__Card__c card : cards) {
                String status = card.OpenSF__Status__c != null
                    ? card.OpenSF__Status__c
                    : 'No Status';
                Integer cnt = statusCounts.containsKey(status)
                    ? statusCounts.get(status)
                    : 0;
                statusCounts.put(status, cnt + 1);
                if (card.OpenSF__StoryPoints__c != null) {
                    totalPoints += card.OpenSF__StoryPoints__c;
                }
            }

            res.totalStoryPoints = totalPoints;
            res.cardsByStatus = JSON.serialize(statusCounts);
            res.message = cards.isEmpty()
                ? 'No cards assigned to ' + matchedUser.Name + ' on this board.'
                : 'Found ' +
                  cards.size() +
                  ' card(s) assigned to ' +
                  matchedUser.Name +
                  '.';
        } catch (Exception e) {
            res.message = 'Error retrieving user workload: ' + e.getMessage();
        }
        return res;
    }
}
