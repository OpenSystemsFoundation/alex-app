/**
 * AgentGetBoardLayout - Agentforce invocable action to retrieve the full
 * column layout for a board.
 */
public with sharing class AgentGetBoardLayout {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the board to get layout for'
        )
        public Id boardId;
    }

    public class Response {
        @InvocableVariable(
            description='JSON array of column details: [{id, name, color, category, status, cardCount, position}]'
        )
        public String columns;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Get Board Layout'
        description='Retrieves the full column layout for a board'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getBoardLayout(req));
        }
        return responses;
    }

    private static Response getBoardLayout(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Column__c> cols = [
                SELECT
                    Id,
                    OpenSF__ColumnHeader__c,
                    OpenSF__Color__c,
                    OpenSF__Category__c,
                    OpenSF__Status__c,
                    OpenSF__CardCount__c,
                    OpenSF__LexoRankPosition__c
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :req.boardId
                WITH USER_MODE
                ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
            ];

            if (cols.isEmpty()) {
                res.columns = '[]';
                res.message = 'No columns found for board ID: ' + req.boardId;
                return res;
            }

            List<Map<String, Object>> colList = new List<Map<String, Object>>();
            for (OpenSF__Column__c col : cols) {
                Map<String, Object> colMap = new Map<String, Object>();
                colMap.put('id', col.Id);
                colMap.put('name', col.OpenSF__ColumnHeader__c);
                colMap.put('color', col.OpenSF__Color__c);
                colMap.put('category', col.OpenSF__Category__c);
                colMap.put('status', col.OpenSF__Status__c);
                colMap.put(
                    'cardCount',
                    col.OpenSF__CardCount__c != null
                        ? (Integer) col.OpenSF__CardCount__c
                        : 0
                );
                colMap.put('position', col.OpenSF__LexoRankPosition__c);
                colList.add(colMap);
            }

            res.columns = JSON.serialize(colList);
            res.message = 'Successfully retrieved ' + cols.size() + ' columns.';
        } catch (Exception e) {
            res.message = 'Error retrieving board layout: ' + e.getMessage();
        }
        return res;
    }
}
