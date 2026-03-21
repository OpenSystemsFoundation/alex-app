/**
 * AgentAnalyzeSprintCapacity - Agentforce invocable action to analyze sprint
 * capacity based on historical velocity and current backlog.
 */
public with sharing class AgentAnalyzeSprintCapacity {

    public class Request {
        @InvocableVariable(required=true description='The ID of the board to analyze capacity for')
        public Id boardId;
        @InvocableVariable(description='Proposed sprint duration in days (default 14)')
        public Integer proposedSprintDays;
    }

    public class Response {
        @InvocableVariable(description='Average velocity across recent completed sprints')
        public Decimal averageVelocity;
        @InvocableVariable(description='Suggested story point capacity for the proposed sprint duration')
        public Decimal suggestedPointCapacity;
        @InvocableVariable(description='Total story points in the backlog')
        public Decimal backlogTotalPoints;
        @InvocableVariable(description='Number of cards in the backlog')
        public Integer backlogCardCount;
        @InvocableVariable(description='Estimated number of sprints to complete the backlog')
        public Decimal sprintsToCompleteBacklog;
        @InvocableVariable(description='Capacity assessment: Under Capacity, Right-Sized, or Over Capacity')
        public String teamCanHandle;
        @InvocableVariable(description='JSON array of historical sprint data: [{name, velocity, points}]')
        public String historicalSprints;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(label='Analyze Sprint Capacity' description='Analyzes sprint capacity based on historical velocity and backlog size')
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(analyzeCapacity(req));
        }
        return responses;
    }

    private static Response analyzeCapacity(Request req) {
        Response res = new Response();
        try {
            Integer sprintDays = (req.proposedSprintDays != null && req.proposedSprintDays > 0)
                ? req.proposedSprintDays
                : 14;

            // Query last 5 completed sprints for velocity
            List<OpenSF__Sprint__c> completedSprints = [
                SELECT Name, OpenSF__Velocity__c, OpenSF__CompletedStoryPoints__c,
                    OpenSF__TotalStoryPoints__c
                FROM OpenSF__Sprint__c
                WHERE OpenSF__Board__c = :req.boardId
                    AND OpenSF__Status__c = 'Completed'
                WITH USER_MODE
                ORDER BY OpenSF__EndDate__c DESC
                LIMIT 5
            ];

            Decimal totalVelocity = 0;
            List<Map<String, Object>> sprintList = new List<Map<String, Object>>();
            for (OpenSF__Sprint__c sp : completedSprints) {
                Decimal vel = sp.OpenSF__Velocity__c != null ? sp.OpenSF__Velocity__c : 0;
                totalVelocity += vel;
                Map<String, Object> spMap = new Map<String, Object>();
                spMap.put('name', sp.Name);
                spMap.put('velocity', vel);
                spMap.put('points', sp.OpenSF__CompletedStoryPoints__c != null ? sp.OpenSF__CompletedStoryPoints__c : 0);
                sprintList.add(spMap);
            }
            res.historicalSprints = JSON.serialize(sprintList);

            Decimal avgVelocity = completedSprints.isEmpty()
                ? 0
                : (totalVelocity / completedSprints.size()).setScale(1, RoundingMode.HALF_UP);
            res.averageVelocity = avgVelocity;

            // Suggested capacity scaled by sprint duration
            Decimal suggestedPoints = avgVelocity * ((Decimal) sprintDays / 14);
            res.suggestedPointCapacity = suggestedPoints.setScale(1, RoundingMode.HALF_UP);

            // Query backlog cards (cards on the board without a column, or all cards with story points)
            List<OpenSF__Card__c> backlogCards = [
                SELECT Id, OpenSF__StoryPoints__c
                FROM OpenSF__Card__c
                WHERE OpenSF__Board__c = :req.boardId
                    AND OpenSF__Column__c = null
                WITH USER_MODE
            ];

            Decimal backlogPoints = 0;
            for (OpenSF__Card__c card : backlogCards) {
                if (card.OpenSF__StoryPoints__c != null) {
                    backlogPoints += card.OpenSF__StoryPoints__c;
                }
            }
            res.backlogTotalPoints = backlogPoints;
            res.backlogCardCount = backlogCards.size();

            // Sprints to complete backlog
            if (avgVelocity > 0) {
                res.sprintsToCompleteBacklog = (backlogPoints / avgVelocity).setScale(1, RoundingMode.HALF_UP);
            } else {
                res.sprintsToCompleteBacklog = 0;
            }

            // Capacity assessment: compare backlog points to suggested capacity
            if (avgVelocity == 0) {
                res.teamCanHandle = 'Under Capacity';
                res.message = 'No completed sprints found. Unable to calculate velocity-based capacity.';
            } else if (backlogPoints <= suggestedPoints * 0.8) {
                res.teamCanHandle = 'Under Capacity';
                res.message = 'Team has capacity to take on more work. Backlog (' + backlogPoints
                    + ' points) is below suggested capacity (' + res.suggestedPointCapacity + ' points).';
            } else if (backlogPoints <= suggestedPoints * 1.2) {
                res.teamCanHandle = 'Right-Sized';
                res.message = 'Backlog is well-matched to team capacity. Backlog: ' + backlogPoints
                    + ' points, Suggested capacity: ' + res.suggestedPointCapacity + ' points.';
            } else {
                res.teamCanHandle = 'Over Capacity';
                res.message = 'Backlog (' + backlogPoints + ' points) exceeds suggested capacity ('
                    + res.suggestedPointCapacity + ' points). Consider prioritizing or splitting work.';
            }
        } catch (Exception e) {
            res.message = 'Error analyzing sprint capacity: ' + e.getMessage();
        }
        return res;
    }
}
