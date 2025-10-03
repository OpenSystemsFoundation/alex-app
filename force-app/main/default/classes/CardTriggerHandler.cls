/**
 * CardTriggerHandler - Handles Card__c trigger events
 * Publishes platform events for real-time updates with JSON payload
 */
public with sharing class CardTriggerHandler extends TriggerHandler {
    
    private List<OpenSF__Card__c> newCards;
    private List<OpenSF__Card__c> oldCards;
    private Map<Id, OpenSF__Card__c> newCardMap;
    private Map<Id, OpenSF__Card__c> oldCardMap;
    
    public CardTriggerHandler() {
        super();
    }
    
    protected override void afterInsert() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        System.debug('🎯 CardTrigger.afterInsert: Processing ' + this.newCards.size() + ' card(s)');
        publishCardEvents(this.newCards, 'create');
    }
    
    protected override void afterUpdate() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        this.oldCardMap = (Map<Id, OpenSF__Card__c>) this.oldMap;
        System.debug('🔄 CardTrigger.afterUpdate: Processing ' + this.newCards.size() + ' card(s)');
        publishCardEvents(this.newCards, 'update');
    }
    
    protected override void afterDelete() {
        this.oldCards = (List<OpenSF__Card__c>) this.oldList;
        System.debug('🗑️ CardTrigger.afterDelete: Processing ' + this.oldCards.size() + ' card(s)');
        publishCardEvents(this.oldCards, 'delete');
    }
    
    protected override void afterUndelete() {
        this.newCards = (List<OpenSF__Card__c>) this.newList;
        publishCardEvents(this.newCards, 'undelete');
    }
    
    /**
     * Publish platform events for card changes
     */
    private void publishCardEvents(List<OpenSF__Card__c> cards, String eventType) {
        System.debug('📡 publishCardEvents START: eventType=' + eventType + ', cards=' + cards.size());
        List<OpenSF__CardUpdateEvent__e> events = new List<OpenSF__CardUpdateEvent__e>();
        
        // Get card IDs for full query (to get related data)
        Set<Id> cardIds = new Set<Id>();
        for (OpenSF__Card__c card : cards) {
            cardIds.add(card.Id);
        }
        System.debug('📋 Card IDs to process: ' + cardIds);
        
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
                        KanbanBoardDTO.CardDTO cardDTO = new KanbanBoardDTO.CardDTO(fullCard);
                        jsonPayload = JSON.serialize(cardDTO);
                    } else {
                        continue; // Skip if card not found
                    }
                }
                
                OpenSF__CardUpdateEvent__e event = new OpenSF__CardUpdateEvent__e(
                    OpenSF__EventType__c = eventType,
                    OpenSF__Payload__c = jsonPayload
                );
                
                events.add(event);
                
            } catch (Exception e) {
                System.debug('Error creating event payload for card ' + card.Id + ': ' + e.getMessage());
            }
        }
        
        // Publish events
        if (!events.isEmpty()) {
            System.debug('🚀 Publishing ' + events.size() + ' CardUpdateEvent__e(s) to EventBus');
            List<Database.SaveResult> results = EventBus.publish(events);
            
            // Log results
            Integer successCount = 0;
            Integer failureCount = 0;
            for (Integer i = 0; i < results.size(); i++) {
                if (results[i].isSuccess()) {
                    successCount++;
                } else {
                    failureCount++;
                    System.debug('❌ Error publishing event for card: ' + 
                        results[i].getErrors()[0].getMessage());
                }
            }
            System.debug('✅ Platform events published: ' + successCount + ' success, ' + failureCount + ' failed');
        } else {
            System.debug('⚠️ No events to publish');
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
}
