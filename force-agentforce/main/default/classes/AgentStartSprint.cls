/**
 * AgentStartSprint - Agentforce invocable action to start a sprint.
 * Validates the sprint is in Planning status and no other sprint is active on the board.
 */
public with sharing class AgentStartSprint {
    public class Request {
        @InvocableVariable(
            required=true
            description='The Id of the sprint to start'
        )
        public Id sprintId;
    }

    public class Response {
        @InvocableVariable(
            description='Whether the sprint was started successfully'
        )
        public Boolean success;

        @InvocableVariable(
            description='Total story points committed to the sprint'
        )
        public Decimal totalStoryPoints;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Start Sprint'
        description='Starts a sprint, setting it to Active and updating the board'
    )
    public static List<Response> startSprints(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(startSprint(req));
        }
        return responses;
    }

    private static Response startSprint(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Sprint__c> sprints = [
                SELECT Id, OpenSF__Status__c, OpenSF__Board__c
                FROM OpenSF__Sprint__c
                WHERE Id = :req.sprintId
                WITH USER_MODE
                LIMIT 1
            ];

            if (sprints.isEmpty()) {
                res.success = false;
                res.message = 'Sprint not found.';
                return res;
            }

            OpenSF__Sprint__c sprint = sprints[0];

            if (sprint.OpenSF__Status__c != 'Planning') {
                res.success = false;
                res.message =
                    'Sprint must be in Planning status to start. Current status: ' +
                    sprint.OpenSF__Status__c;
                return res;
            }

            // Check no other active sprint on this board
            List<OpenSF__Sprint__c> activeSprints = [
                SELECT Id
                FROM OpenSF__Sprint__c
                WHERE
                    OpenSF__Board__c = :sprint.OpenSF__Board__c
                    AND OpenSF__Status__c = 'Active'
                    AND Id != :req.sprintId
                WITH USER_MODE
                LIMIT 1
            ];

            if (!activeSprints.isEmpty()) {
                res.success = false;
                res.message = 'Another sprint is already active on this board. Complete it before starting a new one.';
                return res;
            }

            // Calculate total story points from sprint cards
            Decimal totalPoints = 0;
            List<OpenSF__SprintCard__c> sprintCards = [
                SELECT OpenSF__Card__r.OpenSF__StoryPoints__c
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :req.sprintId
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
            ];

            for (OpenSF__SprintCard__c sc : sprintCards) {
                if (sc.OpenSF__Card__r.OpenSF__StoryPoints__c != null) {
                    totalPoints += sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
                }
            }

            // Update sprint to Active
            OpenSF__Sprint__c sprintUpdate = new OpenSF__Sprint__c(
                Id = req.sprintId,
                OpenSF__Status__c = 'Active',
                OpenSF__TotalStoryPoints__c = totalPoints
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Sprint__c>{ sprintUpdate }
                )
                .getRecords();

            // Update board's active sprint
            OpenSF__Board__c boardUpdate = new OpenSF__Board__c(
                Id = sprint.OpenSF__Board__c,
                OpenSF__ActiveSprint__c = req.sprintId
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Board__c>{ boardUpdate }
                )
                .getRecords();

            res.success = true;
            res.totalStoryPoints = totalPoints;
            res.message =
                'Sprint started successfully with ' +
                totalPoints +
                ' story points.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error starting sprint: ' + e.getMessage();
        }
        return res;
    }
}
