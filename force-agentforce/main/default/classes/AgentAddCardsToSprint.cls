/**
 * AgentAddCardsToSprint - Agentforce invocable action to add cards to a sprint.
 * Checks for duplicates and recalculates total story points.
 */
public with sharing class AgentAddCardsToSprint {
    public class Request {
        @InvocableVariable(required=true description='The Id of the sprint')
        public Id sprintId;

        @InvocableVariable(required=true description='List of card Ids to add')
        public List<Id> cardIds;
    }

    public class Response {
        @InvocableVariable(description='Number of cards successfully added')
        public Integer addedCount;

        @InvocableVariable(
            description='Total story points in the sprint after adding'
        )
        public Decimal totalSprintPoints;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Add Cards to Sprint'
        description='Adds one or more cards to a sprint, checking for duplicates'
    )
    public static List<Response> addCardsToSprints(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(addCards(req));
        }
        return responses;
    }

    private static Response addCards(Request req) {
        Response res = new Response();
        try {
            // Check which cards are already in this sprint (not removed)
            List<OpenSF__SprintCard__c> existingLinks = [
                SELECT OpenSF__Card__c
                FROM OpenSF__SprintCard__c
                WHERE
                    OpenSF__Sprint__c = :req.sprintId
                    AND OpenSF__Card__c IN :req.cardIds
                    AND OpenSF__RemovedDate__c = NULL
                WITH USER_MODE
            ];

            Set<Id> alreadyInSprint = new Set<Id>();
            for (OpenSF__SprintCard__c sc : existingLinks) {
                alreadyInSprint.add(sc.OpenSF__Card__c);
            }

            // Get card details for the ones we're adding
            List<OpenSF__Card__c> cards = [
                SELECT Id, OpenSF__StoryPoints__c
                FROM OpenSF__Card__c
                WHERE Id IN :req.cardIds AND Id NOT IN :alreadyInSprint
                WITH USER_MODE
            ];

            if (cards.isEmpty()) {
                res.addedCount = 0;
                res.message = 'No new cards to add. All specified cards are already in the sprint.';
                // Still calculate total points
                res.totalSprintPoints = calculateTotalPoints(req.sprintId);
                return res;
            }

            // Create SprintCard junction records
            List<OpenSF__SprintCard__c> newLinks = new List<OpenSF__SprintCard__c>();
            for (OpenSF__Card__c card : cards) {
                newLinks.add(
                    new OpenSF__SprintCard__c(
                        OpenSF__Sprint__c = req.sprintId,
                        OpenSF__Card__c = card.Id,
                        OpenSF__AddedDate__c = Date.today(),
                        OpenSF__StoryPointsAtAdd__c = card.OpenSF__StoryPoints__c
                    )
                );
            }

            insert Security.stripInaccessible(AccessType.CREATABLE, newLinks)
                .getRecords();

            // Recalculate total sprint points
            Decimal totalPoints = calculateTotalPoints(req.sprintId);

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

            res.addedCount = cards.size();
            res.totalSprintPoints = totalPoints;
            res.message = cards.size() + ' card(s) added to the sprint.';
            if (!alreadyInSprint.isEmpty()) {
                res.message +=
                    ' ' +
                    alreadyInSprint.size() +
                    ' card(s) were already in the sprint and skipped.';
            }
        } catch (Exception e) {
            res.addedCount = 0;
            res.message = 'Error adding cards to sprint: ' + e.getMessage();
        }
        return res;
    }

    private static Decimal calculateTotalPoints(Id sprintId) {
        Decimal total = 0;
        List<OpenSF__SprintCard__c> allCards = [
            SELECT OpenSF__Card__r.OpenSF__StoryPoints__c
            FROM OpenSF__SprintCard__c
            WHERE
                OpenSF__Sprint__c = :sprintId
                AND OpenSF__RemovedDate__c = NULL
            WITH USER_MODE
        ];
        for (OpenSF__SprintCard__c sc : allCards) {
            if (sc.OpenSF__Card__r.OpenSF__StoryPoints__c != null) {
                total += sc.OpenSF__Card__r.OpenSF__StoryPoints__c;
            }
        }
        return total;
    }
}
