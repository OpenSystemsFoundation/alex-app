/**
 * AgentCreateSprint - Agentforce invocable action to create a new sprint for a board.
 * Automatically calculates the next sprint number.
 */
public with sharing class AgentCreateSprint {
    public class Request {
        @InvocableVariable(required=true description='The Id of the board')
        public Id boardId;

        @InvocableVariable(required=true description='Sprint goal')
        public String goal;

        @InvocableVariable(required=true description='Sprint start date')
        public Date startDate;

        @InvocableVariable(required=true description='Sprint end date')
        public Date endDate;
    }

    public class Response {
        @InvocableVariable(description='The Id of the newly created sprint')
        public Id sprintId;

        @InvocableVariable(description='The auto-number name of the sprint')
        public String sprintName;

        @InvocableVariable(description='The sprint number')
        public Decimal sprintNumber;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Create Sprint'
        description='Creates a new sprint for a board with auto-calculated sprint number'
    )
    public static List<Response> createSprints(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(createSprint(req));
        }
        return responses;
    }

    private static Response createSprint(Request req) {
        Response res = new Response();
        try {
            // Calculate next sprint number
            List<OpenSF__Sprint__c> existingSprints = [
                SELECT OpenSF__SprintNumber__c
                FROM OpenSF__Sprint__c
                WHERE OpenSF__Board__c = :req.boardId
                WITH USER_MODE
                ORDER BY OpenSF__SprintNumber__c DESC
                LIMIT 1
            ];

            Decimal nextNumber = 1;
            if (!existingSprints.isEmpty() && existingSprints[0].OpenSF__SprintNumber__c != null) {
                nextNumber = existingSprints[0].OpenSF__SprintNumber__c + 1;
            }

            OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
                OpenSF__Board__c = req.boardId,
                OpenSF__Goal__c = req.goal,
                OpenSF__Status__c = 'Planning',
                OpenSF__StartDate__c = req.startDate,
                OpenSF__EndDate__c = req.endDate,
                OpenSF__SprintNumber__c = nextNumber,
                OpenSF__TotalStoryPoints__c = 0,
                OpenSF__CompletedStoryPoints__c = 0
            );

            List<OpenSF__Sprint__c> strippedSprints = (List<OpenSF__Sprint__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__Sprint__c>{ sprint }
                )
                .getRecords();
            insert strippedSprints;

            OpenSF__Sprint__c created = [
                SELECT Id, Name, OpenSF__SprintNumber__c
                FROM OpenSF__Sprint__c
                WHERE Id = :strippedSprints[0].Id
                WITH USER_MODE
                LIMIT 1
            ];

            res.sprintId = created.Id;
            res.sprintName = created.Name;
            res.sprintNumber = created.OpenSF__SprintNumber__c;
            res.message = 'Sprint created successfully.';
        } catch (Exception e) {
            res.message = 'Error creating sprint: ' + e.getMessage();
        }
        return res;
    }
}
