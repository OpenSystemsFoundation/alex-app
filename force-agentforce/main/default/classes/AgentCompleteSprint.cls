/**
 * AgentCompleteSprint - Agentforce invocable action to complete a sprint.
 * Handles incomplete cards by optionally moving them back to the backlog.
 */
public with sharing class AgentCompleteSprint {
    public class Request {
        @InvocableVariable(required=true description='The Id of the sprint to complete')
        public Id sprintId;

        @InvocableVariable(description='Whether to move incomplete cards to backlog (default true)')
        public Boolean moveIncompleteToBacklog;
    }

    public class Response {
        @InvocableVariable(description='Whether the sprint was completed successfully')
        public Boolean success;

        @InvocableVariable(description='Story points completed in this sprint')
        public Decimal completedPoints;

        @InvocableVariable(description='Total story points committed to this sprint')
        public Decimal totalPoints;

        @InvocableVariable(description='Sprint velocity (completed / total)')
        public Decimal velocity;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Complete Sprint'
        description='Completes a sprint, calculates velocity, and optionally moves incomplete cards to backlog'
    )
    public static List<Response> completeSprints(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(completeSprint(req));
        }
        return responses;
    }

    private static Response completeSprint(Request req) {
        Response res = new Response();
        try {
            Boolean moveToBacklog = req.moveIncompleteToBacklog != null ? req.moveIncompleteToBacklog : true;

            List<OpenSF__Sprint__c> sprints = [
                SELECT Id, OpenSF__Status__c, OpenSF__Board__c, OpenSF__TotalStoryPoints__c
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

            if (sprint.OpenSF__Status__c != 'Active') {
                res.success = false;
                res.message = 'Only active sprints can be completed. Current status: ' + sprint.OpenSF__Status__c;
                return res;
            }

            // Get all sprint cards that haven't been removed
            List<OpenSF__SprintCard__c> sprintCards = [
                SELECT
                    Id,
                    OpenSF__Card__c,
                    OpenSF__CompletedInSprint__c,
                    OpenSF__Card__r.OpenSF__StoryPoints__c,
                    OpenSF__Card__r.OpenSF__Status__c
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :req.sprintId
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
            ];

            Decimal completedPts = 0;
            Decimal totalPts = 0;
            List<OpenSF__Card__c> cardsToBacklog = new List<OpenSF__Card__c>();

            for (OpenSF__SprintCard__c sc : sprintCards) {
                Decimal pts = sc.OpenSF__Card__r.OpenSF__StoryPoints__c != null
                    ? sc.OpenSF__Card__r.OpenSF__StoryPoints__c
                    : 0;
                totalPts += pts;

                if (sc.OpenSF__CompletedInSprint__c) {
                    completedPts += pts;
                } else if (moveToBacklog) {
                    // Move incomplete card to backlog (remove from column)
                    cardsToBacklog.add(new OpenSF__Card__c(
                        Id = sc.OpenSF__Card__c,
                        OpenSF__Column__c = null
                    ));
                }
            }

            // Move incomplete cards to backlog if requested
            if (!cardsToBacklog.isEmpty()) {
                update Security.stripInaccessible(
                        AccessType.UPDATABLE,
                        cardsToBacklog
                    )
                    .getRecords();
            }

            // Calculate velocity
            Decimal velocityVal = totalPts > 0
                ? (completedPts / totalPts * 100).setScale(1)
                : 0;

            // Update sprint to Completed
            OpenSF__Sprint__c sprintUpdate = new OpenSF__Sprint__c(
                Id = req.sprintId,
                OpenSF__Status__c = 'Completed',
                OpenSF__CompletedStoryPoints__c = completedPts,
                OpenSF__TotalStoryPoints__c = totalPts,
                OpenSF__Velocity__c = velocityVal
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Sprint__c>{ sprintUpdate }
                )
                .getRecords();

            // Clear board's active sprint
            OpenSF__Board__c boardUpdate = new OpenSF__Board__c(
                Id = sprint.OpenSF__Board__c,
                OpenSF__ActiveSprint__c = null
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Board__c>{ boardUpdate }
                )
                .getRecords();

            res.success = true;
            res.completedPoints = completedPts;
            res.totalPoints = totalPts;
            res.velocity = velocityVal;
            res.message = 'Sprint completed. ' + completedPts + ' of ' + totalPts + ' points completed (' + velocityVal + '% velocity).';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error completing sprint: ' + e.getMessage();
        }
        return res;
    }
}
