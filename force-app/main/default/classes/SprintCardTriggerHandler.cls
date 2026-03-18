/**
 * SprintCardTriggerHandler - Handles SprintCard__c trigger events
 * Publishes SprintUpdateEvent__e platform events on changes
 */
public with sharing class SprintCardTriggerHandler extends TriggerHandler {
    private List<OpenSF__SprintCard__c> newRecords;
    private List<OpenSF__SprintCard__c> oldRecords;
    private Map<Id, OpenSF__SprintCard__c> newMap;
    private Map<Id, OpenSF__SprintCard__c> oldMap;

    public SprintCardTriggerHandler() {
        super();
    }

    protected override void afterInsert() {
        this.newRecords = (List<OpenSF__SprintCard__c>) this.newList;
        publishEvents(this.newRecords, 'card_added');
    }

    protected override void afterUpdate() {
        this.newRecords = (List<OpenSF__SprintCard__c>) this.newList;
        this.oldMap = (Map<Id, OpenSF__SprintCard__c>) this.oldMap;
        publishEvents(this.newRecords, 'card_updated');
    }

    protected override void afterDelete() {
        this.oldRecords = (List<OpenSF__SprintCard__c>) this.oldList;
        publishEvents(this.oldRecords, 'card_removed');
    }

    private void publishEvents(List<OpenSF__SprintCard__c> records, String eventType) {
        List<OpenSF__SprintUpdateEvent__e> events = new List<OpenSF__SprintUpdateEvent__e>();

        // Collect sprint IDs to get board IDs
        Set<Id> sprintIds = new Set<Id>();
        for (OpenSF__SprintCard__c sc : records) {
            sprintIds.add(sc.OpenSF__Sprint__c);
        }

        // Get sprints with board IDs
        Map<Id, OpenSF__Sprint__c> sprintMap = new Map<Id, OpenSF__Sprint__c>([
            SELECT Id, OpenSF__Board__c FROM OpenSF__Sprint__c WHERE Id IN :sprintIds
        ]);

        for (OpenSF__SprintCard__c sc : records) {
            OpenSF__Sprint__c sprint = sprintMap.get(sc.OpenSF__Sprint__c);
            String boardId = sprint != null ? String.valueOf(sprint.OpenSF__Board__c) : '';

            Map<String, Object> payload = new Map<String, Object>{
                'sprintCardId' => sc.Id,
                'sprintId' => sc.OpenSF__Sprint__c,
                'cardId' => sc.OpenSF__Card__c
            };

            events.add(new OpenSF__SprintUpdateEvent__e(
                OpenSF__EventType__c = eventType,
                OpenSF__Payload__c = JSON.serialize(payload),
                OpenSF__BoardId__c = boardId
            ));
        }

        if (!events.isEmpty()) {
            EventBus.publish(events);
        }
    }
}
