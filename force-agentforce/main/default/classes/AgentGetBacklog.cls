/**
 * AgentGetBacklog - Agentforce invocable action to retrieve backlog cards for a board.
 * Returns cards not in the active sprint, optionally filtered by refinement status.
 */
public with sharing class AgentGetBacklog {
    public class Request {
        @InvocableVariable(required=true description='The Id of the board')
        public Id boardId;

        @InvocableVariable(description='If true, only return cards that need refinement')
        public Boolean needsRefinementOnly;
    }

    public class Response {
        @InvocableVariable(description='List of backlog cards')
        public List<BacklogCardResult> cards;

        @InvocableVariable(description='Total number of backlog cards')
        public Integer totalCount;

        @InvocableVariable(description='Total story points across all backlog cards')
        public Decimal totalStoryPoints;

        @InvocableVariable(description='Status message')
        public String message;
    }

    public class BacklogCardResult {
        @InvocableVariable(description='Card Id')
        public Id cardId;

        @InvocableVariable(description='Card subject')
        public String subject;

        @InvocableVariable(description='Card priority')
        public String priority;

        @InvocableVariable(description='Card type')
        public String cardType;

        @InvocableVariable(description='Story points')
        public Decimal storyPoints;

        @InvocableVariable(description='Assignee name')
        public String assigneeName;

        @InvocableVariable(description='Whether the card needs refinement')
        public Boolean needsRefinement;
    }

    @InvocableMethod(
        label='Get Backlog'
        description='Retrieves backlog cards for a board that are not in the active sprint'
    )
    public static List<Response> getBacklogs(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getBacklog(req));
        }
        return responses;
    }

    private static Response getBacklog(Request req) {
        Response res = new Response();
        try {
            // Find active sprint card Ids to exclude
            Set<Id> activeSprintCardIds = new Set<Id>();
            List<OpenSF__Sprint__c> activeSprints = [
                SELECT Id
                FROM OpenSF__Sprint__c
                WHERE
                    OpenSF__Board__c = :req.boardId
                    AND OpenSF__Status__c = 'Active'
                WITH USER_MODE
                LIMIT 1
            ];

            if (!activeSprints.isEmpty()) {
                for (OpenSF__SprintCard__c sc : [
                    SELECT OpenSF__Card__c
                    FROM OpenSF__SprintCard__c
                    WHERE
                        OpenSF__Sprint__c = :activeSprints[0].Id
                        AND OpenSF__RemovedDate__c = NULL
                    WITH USER_MODE
                ]) {
                    activeSprintCardIds.add(sc.OpenSF__Card__c);
                }
            }

            // Build dynamic query for backlog cards
            Id boardId = req.boardId;
            String query = 'SELECT Id, OpenSF__Subject__c, OpenSF__Priority__c, '
                + 'OpenSF__CardType__c, OpenSF__StoryPoints__c, '
                + 'OpenSF__NeedsRefinement__c, OpenSF__Assignee__r.Name '
                + 'FROM OpenSF__Card__c '
                + 'WHERE OpenSF__Board__c = :boardId '
                + 'AND OpenSF__Column__c = NULL';

            if (!activeSprintCardIds.isEmpty()) {
                query += ' AND Id NOT IN :activeSprintCardIds';
            }

            if (req.needsRefinementOnly == true) {
                query += ' AND OpenSF__NeedsRefinement__c = true';
            }

            query += ' WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 100';

            List<OpenSF__Card__c> cards = Database.query(query);

            List<BacklogCardResult> results = new List<BacklogCardResult>();
            Decimal totalPts = 0;

            for (OpenSF__Card__c card : cards) {
                BacklogCardResult bcr = new BacklogCardResult();
                bcr.cardId = card.Id;
                bcr.subject = card.OpenSF__Subject__c;
                bcr.priority = card.OpenSF__Priority__c;
                bcr.cardType = card.OpenSF__CardType__c;
                bcr.storyPoints = card.OpenSF__StoryPoints__c;
                bcr.needsRefinement = card.OpenSF__NeedsRefinement__c;
                bcr.assigneeName = card.OpenSF__Assignee__r != null ? card.OpenSF__Assignee__r.Name : null;
                results.add(bcr);

                if (card.OpenSF__StoryPoints__c != null) {
                    totalPts += card.OpenSF__StoryPoints__c;
                }
            }

            res.cards = results;
            res.totalCount = results.size();
            res.totalStoryPoints = totalPts;
            res.message = results.isEmpty()
                ? 'No backlog cards found.'
                : results.size() + ' backlog card(s) found with ' + totalPts + ' total story points.';
        } catch (Exception e) {
            res.cards = new List<BacklogCardResult>();
            res.totalCount = 0;
            res.totalStoryPoints = 0;
            res.message = 'Error retrieving backlog: ' + e.getMessage();
        }
        return res;
    }
}
