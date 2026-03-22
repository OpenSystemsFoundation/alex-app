/**
 * AgentCreateCard - Agentforce invocable action to create a card on a board.
 * Creates the card in a specific column (by name) or as a backlog card.
 */
public with sharing class AgentCreateCard {
    public class Request {
        @InvocableVariable(
            required=true
            description='The Id of the board to create the card on'
        )
        public Id boardId;

        @InvocableVariable(
            description='Column name to place the card in. If blank, card is created in the backlog.'
        )
        public String columnName;

        @InvocableVariable(
            required=true
            description='Subject / title of the card'
        )
        public String subject;

        @InvocableVariable(description='Description of the card')
        public String cardDescription;

        @InvocableVariable(
            description='Priority (e.g. Critical, High, Medium, Low)'
        )
        public String priority;

        @InvocableVariable(
            description='Card type (e.g. Story, Bug, Task, Epic)'
        )
        public String cardType;

        @InvocableVariable(description='Story points estimate')
        public Decimal storyPoints;

        @InvocableVariable(description='Due date for the card')
        public Date dueDate;
    }

    public class Response {
        @InvocableVariable(description='The Id of the newly created card')
        public Id cardId;

        @InvocableVariable(description='The auto-number name of the card')
        public String cardName;

        @InvocableVariable(description='Status message')
        public String message;
    }

    @InvocableMethod(
        label='Create Card'
        description='Creates a new card on a board, either in a named column or the backlog'
    )
    public static List<Response> createCards(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(createCard(req));
        }
        return responses;
    }

    private static Response createCard(Request req) {
        Response res = new Response();
        try {
            Id columnId = null;

            if (String.isNotBlank(req.columnName)) {
                List<OpenSF__Column__c> columns = [
                    SELECT Id
                    FROM OpenSF__Column__c
                    WHERE
                        OpenSF__ColumnHeader__c = :req.columnName
                        AND OpenSF__Board__c = :req.boardId
                    WITH USER_MODE
                    LIMIT 1
                ];
                if (columns.isEmpty()) {
                    res.message =
                        'Column "' +
                        req.columnName +
                        '" not found on this board.';
                    return res;
                }
                columnId = columns[0].Id;
            }

            OpenSF__Card__c card = new OpenSF__Card__c(
                OpenSF__Subject__c = req.subject,
                OpenSF__Board__c = req.boardId,
                OpenSF__SequenceNumber__c = 1
            );

            if (columnId != null) {
                card.OpenSF__Column__c = columnId;
            }
            if (req.cardDescription != null) {
                card.OpenSF__Description__c = req.cardDescription;
            }
            if (req.priority != null) {
                card.OpenSF__Priority__c = req.priority;
            }
            if (req.cardType != null) {
                card.OpenSF__CardType__c = req.cardType;
            }
            if (req.storyPoints != null) {
                card.OpenSF__StoryPoints__c = req.storyPoints;
            }
            if (req.dueDate != null) {
                card.OpenSF__DueDate__c = req.dueDate;
            }

            List<OpenSF__Card__c> strippedCards = (List<OpenSF__Card__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__Card__c>{ card }
                )
                .getRecords();
            insert strippedCards;

            OpenSF__Card__c created = [
                SELECT Id, Name
                FROM OpenSF__Card__c
                WHERE Id = :strippedCards[0].Id
                WITH USER_MODE
                LIMIT 1
            ];

            res.cardId = created.Id;
            res.cardName = created.Name;
            res.message = 'Card created successfully.';
        } catch (Exception e) {
            res.message = 'Error creating card: ' + e.getMessage();
        }
        return res;
    }
}
