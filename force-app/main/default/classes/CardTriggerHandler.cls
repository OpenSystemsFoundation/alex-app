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
        updateEpicCardCounts(this.newCards, null);
        publishCardEvents(
            this.newCards,
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_CREATE
            )
        );
    }

    protected override void afterUpdate() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        this.oldCardMap = (Map<Id, OpenSF__Card__c>) this.oldMap;
        updateColumnCounts(this.newCards, this.oldCardMap);
        updateEpicCardCounts(this.newCards, this.oldCardMap);
        publishCardEvents(
            this.newCards,
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_UPDATE
            )
        );
    }

    protected override void afterDelete() {
        this.oldCards = (List<OpenSF__Card__c>) this.oldList;
        updateColumnCounts(null, null, this.oldCards);
        updateEpicCardCounts(null, (Map<Id, OpenSF__Card__c>) this.oldMap);
        publishCardEvents(
            this.oldCards,
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_DELETE
            )
        );
    }

    protected override void afterUndelete() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        updateColumnCounts(this.newCards, null);
        publishCardEvents(
            this.newCards,
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_UNDELETE
            )
        );
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
        if (
            eventType !=
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_DELETE
            )
        ) {
            fullCardMap = new Map<Id, OpenSF__Card__c>(
                KanbanBoardSelector.getCardsByIds(new List<Id>(cardIds))
            );
        }

        // Create events with JSON payload
        for (OpenSF__Card__c card : cards) {
            try {
                String jsonPayload;

                if (
                    eventType ==
                    KanbanEnums.cardEventTypeValue(
                        KanbanEnums.CardEventType.CARD_DELETE
                    )
                ) {
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
     * Update EpicCardsCount__c on parent epic cards when child cards
     * are inserted, updated (epic reassigned), or deleted.
     */
    private void updateEpicCardCounts(
        List<OpenSF__Card__c> newCards,
        Map<Id, OpenSF__Card__c> oldCardMap
    ) {
        Set<Id> affectedEpicIds = new Set<Id>();

        if (newCards != null) {
            for (OpenSF__Card__c card : newCards) {
                if (card.OpenSF__Epic__c != null) {
                    affectedEpicIds.add(card.OpenSF__Epic__c);
                }
                // If epic changed, also update the old epic
                if (oldCardMap != null && oldCardMap.containsKey(card.Id)) {
                    Id oldEpicId = oldCardMap.get(card.Id).OpenSF__Epic__c;
                    if (
                        oldEpicId != null &&
                        oldEpicId != card.OpenSF__Epic__c
                    ) {
                        affectedEpicIds.add(oldEpicId);
                    }
                }
            }
        }

        // Handle deleted cards — old values come from oldCardMap
        if (newCards == null && oldCardMap != null) {
            for (OpenSF__Card__c oldCard : oldCardMap.values()) {
                if (oldCard.OpenSF__Epic__c != null) {
                    affectedEpicIds.add(oldCard.OpenSF__Epic__c);
                }
            }
        }

        if (affectedEpicIds.isEmpty()) {
            return;
        }

        // Count children for each affected epic.
        //
        // SYSTEM_MODE rationale (AppExchange security review):
        //   EpicCardsCount__c is an app-managed rollup. It must be
        //   kept consistent when any user edits a child card, even
        //   if the user lacks FLS on the rollup field itself. The
        //   trigger is app-internal bookkeeping, not user intent.
        //   Sharing is still enforced (the trigger itself is WITH
        //   SHARING); only FLS/CRUD on the rollup column is bypassed.
        Map<Id, Integer> epicChildCounts = new Map<Id, Integer>();
        for (Id epicId : affectedEpicIds) {
            epicChildCounts.put(epicId, 0);
        }
        for (AggregateResult ar : [
            SELECT OpenSF__Epic__c, COUNT(Id) childCount
            FROM OpenSF__Card__c
            WHERE OpenSF__Epic__c IN :affectedEpicIds
            WITH SYSTEM_MODE
            GROUP BY OpenSF__Epic__c
        ]) {
            Id epicId = (Id) ar.get('OpenSF__Epic__c');
            Integer count = (Integer) ar.get('childCount');
            epicChildCounts.put(epicId, count);
        }

        List<OpenSF__Card__c> epicsToUpdate = new List<OpenSF__Card__c>();
        for (Id epicId : affectedEpicIds) {
            Integer count = epicChildCounts.get(epicId);
            epicsToUpdate.add(
                new OpenSF__Card__c(
                    Id = epicId,
                    OpenSF__EpicCardsCount__c = count
                )
            );
        }

        if (!epicsToUpdate.isEmpty()) {
            // Bypass this trigger to prevent recursion since epics are also Card__c
            TriggerHandler.bypass('CardTriggerHandler');
            Database.update(epicsToUpdate, AccessLevel.SYSTEM_MODE);
            TriggerHandler.clearBypass('CardTriggerHandler');
        }
    }

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

            // Query cards grouped by column to get accurate counts.
            //
            // SYSTEM_MODE rationale (AppExchange security review):
            //   CardCount__c is an app-managed rollup kept consistent
            //   by the trigger. User-initiated card changes must
            //   update the column's count even if the user lacks
            //   FLS on CardCount__c. The trigger itself is WITH
            //   SHARING so record-level access is still enforced.
            Map<Id, Integer> columnCardCounts = new Map<Id, Integer>();
            for (AggregateResult ar : [
                SELECT OpenSF__Column__c, COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c IN :affectedColumnIds
                WITH SYSTEM_MODE
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
                Database.update(columnsToUpdate, AccessLevel.SYSTEM_MODE);
            }
        }
    }
}
