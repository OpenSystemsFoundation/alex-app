/**
 * AgentGetBurndown - Agentforce invocable action to retrieve sprint burndown data
 * from SprintSnapshot records.
 */
public with sharing class AgentGetBurndown {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the sprint to get burndown data for'
        )
        public Id sprintId;
    }

    public class Response {
        @InvocableVariable(
            description='JSON array of snapshot data: [{date, totalPoints, remainingPoints, completedPoints}]'
        )
        public String snapshots;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Get Sprint Burndown'
        description='Retrieves burndown chart data for a sprint from snapshot records'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getBurndown(req));
        }
        return responses;
    }

    private static Response getBurndown(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Sprint__c> sprints = [
                SELECT Id, Name
                FROM OpenSF__Sprint__c
                WHERE Id = :req.sprintId
                WITH USER_MODE
                LIMIT 1
            ];
            if (sprints.isEmpty()) {
                res.message = 'Sprint not found with ID: ' + req.sprintId;
                return res;
            }

            List<OpenSF__SprintSnapshot__c> snaps = [
                SELECT
                    OpenSF__SnapshotDate__c,
                    OpenSF__TotalPoints__c,
                    OpenSF__RemainingPoints__c,
                    OpenSF__CompletedPoints__c
                FROM OpenSF__SprintSnapshot__c
                WHERE OpenSF__Sprint__c = :req.sprintId
                WITH USER_MODE
                ORDER BY OpenSF__SnapshotDate__c ASC
            ];

            if (snaps.isEmpty()) {
                res.snapshots = '[]';
                res.message =
                    'No snapshot data found for sprint: ' + sprints[0].Name;
                return res;
            }

            List<Map<String, Object>> snapList = new List<Map<String, Object>>();
            for (OpenSF__SprintSnapshot__c snap : snaps) {
                Map<String, Object> snapMap = new Map<String, Object>();
                snapMap.put(
                    'date',
                    String.valueOf(snap.OpenSF__SnapshotDate__c)
                );
                snapMap.put(
                    'totalPoints',
                    snap.OpenSF__TotalPoints__c != null
                        ? snap.OpenSF__TotalPoints__c
                        : 0
                );
                snapMap.put(
                    'remainingPoints',
                    snap.OpenSF__RemainingPoints__c != null
                        ? snap.OpenSF__RemainingPoints__c
                        : 0
                );
                snapMap.put(
                    'completedPoints',
                    snap.OpenSF__CompletedPoints__c != null
                        ? snap.OpenSF__CompletedPoints__c
                        : 0
                );
                snapList.add(snapMap);
            }
            res.snapshots = JSON.serialize(snapList);
            res.message =
                'Successfully retrieved ' +
                snaps.size() +
                ' burndown snapshots.';
        } catch (Exception e) {
            res.message = 'Error retrieving burndown data: ' + e.getMessage();
        }
        return res;
    }
}
