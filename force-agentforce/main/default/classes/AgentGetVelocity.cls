/**
 * AgentGetVelocity - Agentforce invocable action to retrieve velocity data
 * from completed sprints for a board.
 */
public with sharing class AgentGetVelocity {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the board to get velocity for'
        )
        public Id boardId;
        @InvocableVariable(
            description='Number of completed sprints to include (default 5)'
        )
        public Integer sprintCount;
    }

    public class Response {
        @InvocableVariable(
            description='JSON array of sprint velocity data: [{name, velocity, completedPoints, totalPoints, startDate, endDate}]'
        )
        public String sprints;
        @InvocableVariable(
            description='Average velocity across the queried sprints'
        )
        public Decimal averageVelocity;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Get Team Velocity'
        description='Retrieves velocity data from completed sprints for a board'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getVelocity(req));
        }
        return responses;
    }

    private static Response getVelocity(Request req) {
        Response res = new Response();
        try {
            Integer limit_count = (req.sprintCount != null &&
                req.sprintCount > 0)
                ? req.sprintCount
                : 5;

            List<OpenSF__Sprint__c> completedSprints = [
                SELECT
                    Name,
                    OpenSF__Velocity__c,
                    OpenSF__CompletedStoryPoints__c,
                    OpenSF__TotalStoryPoints__c,
                    OpenSF__StartDate__c,
                    OpenSF__EndDate__c
                FROM OpenSF__Sprint__c
                WHERE
                    OpenSF__Board__c = :req.boardId
                    AND OpenSF__Status__c = 'Completed'
                WITH USER_MODE
                ORDER BY OpenSF__EndDate__c DESC
                LIMIT :limit_count
            ];

            if (completedSprints.isEmpty()) {
                res.sprints = '[]';
                res.averageVelocity = 0;
                res.message = 'No completed sprints found for this board.';
                return res;
            }

            Decimal totalVelocity = 0;
            List<Map<String, Object>> sprintList = new List<Map<String, Object>>();
            for (OpenSF__Sprint__c sp : completedSprints) {
                Decimal vel = sp.OpenSF__Velocity__c != null
                    ? sp.OpenSF__Velocity__c
                    : 0;
                totalVelocity += vel;

                Map<String, Object> spMap = new Map<String, Object>();
                spMap.put('name', sp.Name);
                spMap.put('velocity', vel);
                spMap.put(
                    'completedPoints',
                    sp.OpenSF__CompletedStoryPoints__c != null
                        ? sp.OpenSF__CompletedStoryPoints__c
                        : 0
                );
                spMap.put(
                    'totalPoints',
                    sp.OpenSF__TotalStoryPoints__c != null
                        ? sp.OpenSF__TotalStoryPoints__c
                        : 0
                );
                spMap.put('startDate', String.valueOf(sp.OpenSF__StartDate__c));
                spMap.put('endDate', String.valueOf(sp.OpenSF__EndDate__c));
                sprintList.add(spMap);
            }

            res.sprints = JSON.serialize(sprintList);
            res.averageVelocity = (totalVelocity / completedSprints.size())
                .setScale(1, RoundingMode.HALF_UP);
            res.message =
                'Successfully retrieved velocity for ' +
                completedSprints.size() +
                ' sprints.';
        } catch (Exception e) {
            res.message = 'Error retrieving velocity data: ' + e.getMessage();
        }
        return res;
    }
}
