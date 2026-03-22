/**
 * AgentGetBoardSummary - Agentforce invocable action to retrieve board summary information
 * including columns, card counts, and active sprint details.
 */
public with sharing class AgentGetBoardSummary {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the board to summarize'
        )
        public Id boardId;
    }

    public class Response {
        @InvocableVariable(description='Name of the board')
        public String boardName;
        @InvocableVariable(description='Type of the board')
        public String boardType;
        @InvocableVariable(description='Number of columns on the board')
        public Integer columnCount;
        @InvocableVariable(
            description='Total number of cards across all columns'
        )
        public Integer totalCards;
        @InvocableVariable(
            description='JSON array of column details: [{name, cardCount, category}]'
        )
        public String columns;
        @InvocableVariable(description='Whether the board has an active sprint')
        public Boolean hasActiveSprint;
        @InvocableVariable(description='Name of the active sprint, if any')
        public String activeSprintName;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Get Board Summary'
        description='Retrieves a summary of a kanban board including columns, cards, and sprint info'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getBoardSummary(req));
        }
        return responses;
    }

    private static Response getBoardSummary(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Board__c> boards = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Type__c,
                    OpenSF__ActiveSprint__c,
                    OpenSF__ActiveSprint__r.Name
                FROM OpenSF__Board__c
                WHERE Id = :req.boardId
                WITH USER_MODE
                LIMIT 1
            ];
            if (boards.isEmpty()) {
                res.message = 'Board not found with ID: ' + req.boardId;
                return res;
            }
            OpenSF__Board__c board = boards[0];
            res.boardName = board.Name;
            res.boardType = board.OpenSF__Type__c;
            res.hasActiveSprint = board.OpenSF__ActiveSprint__c != null;
            res.activeSprintName = board.OpenSF__ActiveSprint__c != null
                ? board.OpenSF__ActiveSprint__r.Name
                : null;

            List<OpenSF__Column__c> cols = [
                SELECT
                    Id,
                    OpenSF__ColumnHeader__c,
                    OpenSF__CardCount__c,
                    OpenSF__Category__c
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :req.boardId
                WITH USER_MODE
                ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
            ];

            res.columnCount = cols.size();
            Integer cardTotal = 0;
            List<Map<String, Object>> colList = new List<Map<String, Object>>();
            for (OpenSF__Column__c col : cols) {
                Integer cnt = col.OpenSF__CardCount__c != null
                    ? (Integer) col.OpenSF__CardCount__c
                    : 0;
                cardTotal += cnt;
                Map<String, Object> colMap = new Map<String, Object>();
                colMap.put('name', col.OpenSF__ColumnHeader__c);
                colMap.put('cardCount', cnt);
                colMap.put('category', col.OpenSF__Category__c);
                colList.add(colMap);
            }
            res.totalCards = cardTotal;
            res.columns = JSON.serialize(colList);
            res.message = 'Successfully retrieved board summary.';
        } catch (Exception e) {
            res.message = 'Error retrieving board summary: ' + e.getMessage();
        }
        return res;
    }
}
