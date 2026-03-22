/**
 * AgentRemoveCardFromSprint - Agentforce invocable action to soft-remove a card from a sprint.
 * Sets the RemovedDate__c instead of deleting the junction record.
 */
public with sharing class AgentRemoveCardFromSprint {
    public class Request {
        @InvocableVariable(required=true description='The Id of the sprint')
        public Id sprintId;

        @InvocableVariable(
            required=true
            description='The Id of the card to remove'
        )
        public Id cardId;
    }

    public class Response {
        @InvocableVariable(description='Whether the removal succeeded')
        public Boolean success;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Remove Card from Sprint'
        description='Soft-removes a card from a sprint by setting the removed date'
    )
    public static List<Response> removeCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(removeCard(req));
        }
        return responses;
    }

    private static Response removeCard(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__SprintCard__c> sprintCards = [
                SELECT Id
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :req.sprintId
                    AND OpenSF__Card__c = :req.cardId
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
                LIMIT 1
            ];

            if (sprintCards.isEmpty()) {
                res.success = false;
                res.message = 'Card is not in this sprint or has already been removed.';
                return res;
            }

            // Soft delete by setting removed date
            OpenSF__SprintCard__c scUpdate = new OpenSF__SprintCard__c(
                Id = sprintCards[0].Id,
                OpenSF__RemovedDate__c = Date.today()
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__SprintCard__c>{ scUpdate }
                )
                .getRecords();

            // Recalculate total sprint points
            Decimal totalPoints = 0;
            List<OpenSF__SprintCard__c> remainingCards = [
                SELECT OpenSF__Card__r.OpenSF__StoryPoints__c
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :req.sprintId
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
            ];

            for (OpenSF__SprintCard__c sc : remainingCards) {
                if (sc.OpenSF__Card__r.OpenSF__StoryPoints__c != null) {
                    totalPoints += sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
                }
            }

            // Update sprint total
            OpenSF__Sprint__c sprintUpdate = new OpenSF__Sprint__c(
                Id = req.sprintId,
                OpenSF__TotalStoryPoints__c = totalPoints
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Sprint__c>{ sprintUpdate }
                )
                .getRecords();

            res.success = true;
            res.message = 'Card removed from sprint successfully.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error removing card from sprint: ' + e.getMessage();
        }
        return res;
    }
}
