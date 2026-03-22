/**
 * AgentGetSprintStatus - Agentforce invocable action to retrieve the active sprint status for a board.
 * Returns sprint details, progress metrics, and days remaining.
 */
public with sharing class AgentGetSprintStatus {
    public class Request {
        @InvocableVariable(required=true description='The Id of the board')
        public Id boardId;
    }

    public class Response {
        @InvocableVariable(description='Sprint Id')
        public Id sprintId;

        @InvocableVariable(description='Sprint auto-number name')
        public String sprintName;

        @InvocableVariable(description='Sprint goal')
        public String goal;

        @InvocableVariable(description='Sprint status')
        public String status;

        @InvocableVariable(description='Sprint start date')
        public Date startDate;

        @InvocableVariable(description='Sprint end date')
        public Date endDate;

        @InvocableVariable(description='Total story points committed')
        public Decimal totalPoints;

        @InvocableVariable(description='Completed story points')
        public Decimal completedPoints;

        @InvocableVariable(description='Total number of cards in the sprint')
        public Integer totalCards;

        @InvocableVariable(description='Number of completed cards')
        public Integer completedCards;

        @InvocableVariable(description='Number of days remaining in the sprint')
        public Integer daysRemaining;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Get Sprint Status'
        description='Retrieves the active sprint status and progress for a board'
    )
    public static List<Response> getSprintStatuses(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(getSprintStatus(req));
        }
        return responses;
    }

    private static Response getSprintStatus(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Sprint__c> sprints = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Goal__c,
                    OpenSF__Status__c,
                    OpenSF__StartDate__c,
                    OpenSF__EndDate__c,
                    OpenSF__TotalStoryPoints__c,
                    OpenSF__CompletedStoryPoints__c
                FROM OpenSF__Sprint__c
                WHERE
                    OpenSF__Board__c = :req.boardId
                    AND OpenSF__Status__c = 'Active'
                WITH USER_MODE
                LIMIT 1
            ];

            if (sprints.isEmpty()) {
                res.message = 'No active sprint found for this board.';
                return res;
            }

            OpenSF__Sprint__c sprint = sprints[0];

            // Count sprint cards and completed cards
            List<OpenSF__SprintCard__c> sprintCards = [
                SELECT
                    Id,
                    OpenSF__CompletedInSprint__c,
                    OpenSF__Card__r.OpenSF__StoryPoints__c
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :sprint.Id
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
            ];

            Integer totalCardCount = sprintCards.size();
            Integer completedCardCount = 0;
            Decimal completedPts = 0;
            Decimal totalPts = 0;

            for (OpenSF__SprintCard__c sc : sprintCards) {
                Decimal pts = sc.OpenSF__Card__r.OpenSF__StoryPoints__c != null
                    ? sc.OpenSF__Card__r.OpenSF__StoryPoints__c
                    : 0;
                totalPts += pts;

                if (sc.OpenSF__CompletedInSprint__c) {
                    completedCardCount++;
                    completedPts += pts;
                }
            }

            // Calculate days remaining
            Integer daysLeft = 0;
            if (sprint.OpenSF__EndDate__c != null) {
                daysLeft = Date.today().daysBetween(sprint.OpenSF__EndDate__c);
                if (daysLeft < 0) {
                    daysLeft = 0;
                }
            }

            res.sprintId = sprint.Id;
            res.sprintName = sprint.Name;
            res.goal = sprint.OpenSF__Goal__c;
            res.status = sprint.OpenSF__Status__c;
            res.startDate = sprint.OpenSF__StartDate__c;
            res.endDate = sprint.OpenSF__EndDate__c;
            res.totalPoints = totalPts;
            res.completedPoints = completedPts;
            res.totalCards = totalCardCount;
            res.completedCards = completedCardCount;
            res.daysRemaining = daysLeft;
            res.message =
                'Sprint status retrieved. ' +
                completedCardCount +
                '/' +
                totalCardCount +
                ' cards completed, ' +
                completedPts +
                '/' +
                totalPts +
                ' points, ' +
                daysLeft +
                ' days remaining.';
        } catch (Exception e) {
            res.message = 'Error retrieving sprint status: ' + e.getMessage();
        }
        return res;
    }
}
