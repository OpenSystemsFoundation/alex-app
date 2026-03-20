/**
 * CardTriggerHandler - Handles Card__c trigger events
 * Publishes platform events for real-time updates with JSON payload
 * Updates column card counts
 */
public with sharing class CardTriggerHandler extends TriggerHandler {
    private List<OpenSF__Card__c> newCards;
    private List<OpenSF__Card__c> oldCards;
    private Map<Id, OpenSF__Card__c> newCardMap;
    private Map<Id, OpenSF__Card__c> oldCardMap;

    public CardTriggerHandler() {
        super();
    }

    protected override void beforeUpdate() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        this.oldCardMap = (Map<Id, OpenSF__Card__c>) this.oldMap;
        incrementSequenceNumbers(this.newCards, this.oldCardMap);
    }

    protected override void afterInsert() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        updateColumnCounts(this.newCards, null);
        publishCardEvents(this.newCards, 'create');
    }

    protected override void afterUpdate() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        this.oldCardMap = (Map<Id, OpenSF__Card__c>) this.oldMap;
        updateColumnCounts(this.newCards, this.oldCardMap);
        publishCardEvents(this.newCards, 'update');
    }

    protected override void afterDelete() {
        this.oldCards = (List<OpenSF__Card__c>) this.oldList;
        updateColumnCounts(null, null, this.oldCards);
        publishCardEvents(this.oldCards, 'delete');
    }

    protected override void afterUndelete() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        updateColumnCounts(this.newCards, null);
        publishCardEvents(this.newCards, 'undelete');
    }

    /**
     * Increment sequence numbers for updated cards
     * Only increments if the card data has actually changed
     */
    private void incrementSequenceNumbers(
        List<OpenSF__Card__c> newCards,
        Map<Id, OpenSF__Card__c> oldCardMap
    ) {
        for (OpenSF__Card__c newCard : newCards) {
            OpenSF__Card__c oldCard = oldCardMap.get(newCard.Id);

            // Check if any meaningful field changed (ignore system fields)
            Boolean hasChanged = (newCard.OpenSF__Subject__c !=
            oldCard.OpenSF__Subject__c ||
            newCard.OpenSF__Description__c != oldCard.OpenSF__Description__c ||
            newCard.OpenSF__Column__c != oldCard.OpenSF__Column__c ||
            newCard.OpenSF__Priority__c != oldCard.OpenSF__Priority__c ||
            newCard.OpenSF__DueDate__c != oldCard.OpenSF__DueDate__c ||
            newCard.OpenSF__Assignee__c != oldCard.OpenSF__Assignee__c ||
            newCard.OpenSF__Color__c != oldCard.OpenSF__Color__c ||
            newCard.OpenSF__LexoRankPosition__c !=
            oldCard.OpenSF__LexoRankPosition__c ||
            newCard.OpenSF__Status__c != oldCard.OpenSF__Status__c ||
            newCard.OpenSF__StoryPoints__c != oldCard.OpenSF__StoryPoints__c ||
            newCard.OpenSF__NeedsRefinement__c !=
            oldCard.OpenSF__NeedsRefinement__c);

            // Only increment if not explicitly set and there's a real change
            if (
                hasChanged &&
                newCard.OpenSF__SequenceNumber__c ==
                oldCard.OpenSF__SequenceNumber__c
            ) {
                newCard.OpenSF__SequenceNumber__c = (oldCard.OpenSF__SequenceNumber__c !=
                    null
                    ? oldCard.OpenSF__SequenceNumber__c + 1
                    : 1);
            }
        }
    }

    /**
     * Publish platform events for card changes
     */
    private void publishCardEvents(
        List<OpenSF__Card__c> cards,
        String eventType
    ) {
        List<OpenSF__CardUpdateEvent__e> events = new List<OpenSF__CardUpdateEvent__e>();

        // Get card IDs for full query (to get related data)
        Set<Id> cardIds = new Set<Id>();
        for (OpenSF__Card__c card : cards) {
            cardIds.add(card.Id);
        }

        // Query cards with all relationships for complete DTO data
        Map<Id, OpenSF__Card__c> fullCardMap = new Map<Id, OpenSF__Card__c>();
        if (eventType != 'delete') {
            fullCardMap = new Map<Id, OpenSF__Card__c>(
                KanbanBoardSelector.getCardsByIds(new List<Id>(cardIds))
            );
        }

        // Create events with JSON payload
        for (OpenSF__Card__c card : cards) {
            try {
                String jsonPayload;

                if (eventType == 'delete') {
                    // For delete, create minimal payload from old data
                    jsonPayload = createDeletePayload(card);
                } else {
                    // For create/update, create full DTO payload
                    OpenSF__Card__c fullCard = fullCardMap.get(card.Id);
                    if (fullCard != null) {
                        KanbanBoardDTO.CardDTO cardDTO = new KanbanBoardDTO.CardDTO(
                            fullCard
                        );
                        jsonPayload = JSON.serialize(cardDTO);
                    } else {
                        continue; // Skip if card not found
                    }
                }

                // Get client request ID and sequence number from card record
                String clientRequestId = card.OpenSF__LastClientRequestId__c;
                Decimal sequenceNumber = card.OpenSF__SequenceNumber__c;
                String clientId = card.OpenSF__LastClientId__c;

                OpenSF__CardUpdateEvent__e event = new OpenSF__CardUpdateEvent__e(
                    OpenSF__EventType__c = eventType,
                    OpenSF__Payload__c = jsonPayload,
                    OpenSF__ClientRequestId__c = clientRequestId,
                    OpenSF__SequenceNumber__c = sequenceNumber,
                    ClientId__c = clientId
                );

                events.add(event);
            } catch (Exception e) {
                // Log error but continue processing other cards
                System.debug(
                    'Error creating event for card ' +
                        card.Id +
                        ': ' +
                        e.getMessage()
                );
            }
        }

        // Publish events
        if (!events.isEmpty()) {
            List<Database.SaveResult> results = EventBus.publish(events);

            // Log results
            Integer successCount = 0;
            Integer failureCount = 0;
            for (Integer i = 0; i < results.size(); i++) {
                if (results[i].isSuccess()) {
                    successCount++;
                } else {
                    failureCount++;
                }
            }
        } else {
        }
    }

    /**
     * Create minimal payload for delete events
     */
    private String createDeletePayload(OpenSF__Card__c card) {
        Map<String, Object> payload = new Map<String, Object>{
            'Id' => card.Id,
            'Name' => card.Name,
            'columnId' => card.OpenSF__Column__c
        };
        return JSON.serialize(payload);
    }

    /**
     * Update column card counts
     * Handles insert, update (column changes), delete, and undelete scenarios
     */
    private void updateColumnCounts(
        List<OpenSF__Card__c> newCards,
        Map<Id, OpenSF__Card__c> oldCardMap
    ) {
        updateColumnCounts(newCards, oldCardMap, null);
    }

    private void updateColumnCounts(
        List<OpenSF__Card__c> newCards,
        Map<Id, OpenSF__Card__c> oldCardMap,
        List<OpenSF__Card__c> deletedCards
    ) {
        Set<Id> affectedColumnIds = new Set<Id>();

        // Handle new/updated cards
        if (newCards != null) {
            for (OpenSF__Card__c card : newCards) {
                if (card.OpenSF__Column__c != null) {
                    affectedColumnIds.add(card.OpenSF__Column__c);
                }

                // If column changed, also update the old column
                if (oldCardMap != null && oldCardMap.containsKey(card.Id)) {
                    OpenSF__Card__c oldCard = oldCardMap.get(card.Id);
                    if (
                        oldCard.OpenSF__Column__c != null &&
                        oldCard.OpenSF__Column__c != card.OpenSF__Column__c
                    ) {
                        affectedColumnIds.add(oldCard.OpenSF__Column__c);
                    }
                }
            }
        }

        // Handle deleted cards
        if (deletedCards != null) {
            for (OpenSF__Card__c card : deletedCards) {
                if (card.OpenSF__Column__c != null) {
                    affectedColumnIds.add(card.OpenSF__Column__c);
                }
            }
        }

        // Update card counts for affected columns
        if (!affectedColumnIds.isEmpty()) {
            List<OpenSF__Column__c> columnsToUpdate = new List<OpenSF__Column__c>();

            // Query cards grouped by column to get accurate counts
            Map<Id, Integer> columnCardCounts = new Map<Id, Integer>();
            for (AggregateResult ar : [
                SELECT OpenSF__Column__c, COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c IN :affectedColumnIds
                GROUP BY OpenSF__Column__c
            ]) {
                Id columnId = (Id) ar.get('OpenSF__Column__c');
                Integer count = (Integer) ar.get('cardCount');
                columnCardCounts.put(columnId, count);
            }

            // Update each affected column
            for (Id columnId : affectedColumnIds) {
                Integer count = columnCardCounts.containsKey(columnId)
                    ? columnCardCounts.get(columnId)
                    : 0;
                columnsToUpdate.add(
                    new OpenSF__Column__c(
                        Id = columnId,
                        OpenSF__CardCount__c = count
                    )
                );
            }

            if (!columnsToUpdate.isEmpty()) {
                update columnsToUpdate;
            }
        }
    }
}
