/**
 * AgentSearchCards - Agentforce invocable action to search for cards on a board.
 * Supports dynamic filtering by text, priority, card type, assignee, and status.
 */
public with sharing class AgentSearchCards {
    public class Request {
        @InvocableVariable(
            required=true
            description='The Id of the board to search'
        )
        public Id boardId;

        @InvocableVariable(
            description='Free-text search (matches subject or description)'
        )
        public String searchText;

        @InvocableVariable(description='Filter by priority')
        public String priority;

        @InvocableVariable(description='Filter by card type')
        public String cardType;

        @InvocableVariable(
            description='Filter by assignee name (partial match)'
        )
        public String assigneeName;

        @InvocableVariable(description='Filter by status')
        public String status;
    }

    public class Response {
        @InvocableVariable(description='List of matching cards')
        public List<CardResult> cards;

        @InvocableVariable(description='Total number of cards found')
        public Integer totalFound;

        @InvocableVariable(description='Status message')
        public String message;
    }

    public class CardResult {
        @InvocableVariable(description='Card Id')
        public Id cardId;

        @InvocableVariable(description='Card auto-number name')
        public String name;

        @InvocableVariable(description='Card subject')
        public String subject;

        @InvocableVariable(description='Card priority')
        public String priority;

        @InvocableVariable(description='Card status')
        public String status;

        @InvocableVariable(description='Card type')
        public String cardType;

        @InvocableVariable(description='Story points')
        public Decimal storyPoints;

        @InvocableVariable(description='Assignee name')
        public String assigneeName;

        @InvocableVariable(description='Column name the card is in')
        public String columnName;
    }

    @InvocableMethod(
        label='Search Cards'
        description='Searches for cards on a board with optional filters'
    )
    public static List<Response> searchCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(search(req));
        }
        return responses;
    }

    private static Response search(Request req) {
        Response res = new Response();
        try {
            String query =
                'SELECT Id, Name, OpenSF__Subject__c, OpenSF__Priority__c, ' +
                'OpenSF__Status__c, OpenSF__CardType__c, OpenSF__StoryPoints__c, ' +
                'OpenSF__Assignee__r.Name, OpenSF__Column__r.OpenSF__ColumnHeader__c ' +
                'FROM OpenSF__Card__c WHERE ' +
                '(OpenSF__Column__r.OpenSF__Board__c = :boardId ' +
                'OR (OpenSF__Board__c = :boardId AND OpenSF__Column__c = null))';

            Id boardId = req.boardId;
            String searchText = null;
            String priority = null;
            String cardType = null;
            String assigneeName = null;
            String status = null;

            if (String.isNotBlank(req.searchText)) {
                searchText = '%' + req.searchText + '%';
                query += ' AND (OpenSF__Subject__c LIKE :searchText OR OpenSF__Description__c LIKE :searchText)';
            }
            if (String.isNotBlank(req.priority)) {
                priority = req.priority;
                query += ' AND OpenSF__Priority__c = :priority';
            }
            if (String.isNotBlank(req.cardType)) {
                cardType = req.cardType;
                query += ' AND OpenSF__CardType__c = :cardType';
            }
            if (String.isNotBlank(req.assigneeName)) {
                assigneeName = '%' + req.assigneeName + '%';
                query += ' AND OpenSF__Assignee__r.Name LIKE :assigneeName';
            }
            if (String.isNotBlank(req.status)) {
                status = req.status;
                query += ' AND OpenSF__Status__c = :status';
            }

            query += ' WITH USER_MODE ORDER BY LastModifiedDate DESC LIMIT 50';

            List<OpenSF__Card__c> cards = Database.query(query);

            List<CardResult> results = new List<CardResult>();
            for (OpenSF__Card__c c : cards) {
                CardResult cr = new CardResult();
                cr.cardId = c.Id;
                cr.name = c.Name;
                cr.subject = c.OpenSF__Subject__c;
                cr.priority = c.OpenSF__Priority__c;
                cr.status = c.OpenSF__Status__c;
                cr.cardType = c.OpenSF__CardType__c;
                cr.storyPoints = c.OpenSF__StoryPoints__c;
                cr.assigneeName = c.OpenSF__Assignee__r != null
                    ? c.OpenSF__Assignee__r.Name
                    : null;
                cr.columnName = c.OpenSF__Column__r != null
                    ? c.OpenSF__Column__r.OpenSF__ColumnHeader__c
                    : null;
                results.add(cr);
            }

            res.cards = results;
            res.totalFound = results.size();
            res.message = results.isEmpty()
                ? 'No cards found matching the criteria.'
                : results.size() + ' card(s) found.';
        } catch (Exception e) {
            res.cards = new List<CardResult>();
            res.totalFound = 0;
            res.message = 'Error searching cards: ' + e.getMessage();
        }
        return res;
    }
}
