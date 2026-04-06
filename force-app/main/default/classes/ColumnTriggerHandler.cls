/**
 * ColumnTriggerHandler - Handles Column__c trigger events
 * Publishes platform events for column changes with JSON payload
 */
public with sharing class ColumnTriggerHandler extends TriggerHandler {
    private List<OpenSF__Column__c> newColumns;
    private List<OpenSF__Column__c> oldColumns;
    private Map<Id, OpenSF__Column__c> newColumnMap;
    private Map<Id, OpenSF__Column__c> oldColumnMap;

    public ColumnTriggerHandler() {
        super();
    }

    protected override void afterInsert() {
        this.newColumns = (List<OpenSF__Column__c>) this.newList;
        publishColumnEvents(
            this.newColumns,
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_CREATE
            )
        );
    }

    protected override void afterUpdate() {
        this.newColumns = (List<OpenSF__Column__c>) this.newList;
        this.oldColumnMap = (Map<Id, OpenSF__Column__c>) this.oldMap;
        publishColumnEvents(
            this.newColumns,
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_UPDATE
            )
        );
    }

    protected override void afterDelete() {
        this.oldColumns = (List<OpenSF__Column__c>) this.oldList;
        publishColumnEvents(
            this.oldColumns,
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_DELETE
            )
        );
    }

    /**
     * Publish platform events for column changes
     */
    private void publishColumnEvents(
        List<OpenSF__Column__c> columns,
        String eventType
    ) {
        List<OpenSF__ColumnUpdateEvent__e> events = new List<OpenSF__ColumnUpdateEvent__e>();

        for (OpenSF__Column__c column : columns) {
            try {
                String jsonPayload;

                if (
                    eventType ==
                    KanbanEnums.columnEventTypeValue(
                        KanbanEnums.ColumnEventType.COLUMN_DELETE
                    )
                ) {
                    // Minimal payload for delete
                    jsonPayload = createDeletePayload(column);
                } else {
                    // Full DTO payload
                    KanbanBoardDTO.ColumnDTO columnDTO = new KanbanBoardDTO.ColumnDTO(
                        column
                    );
                    jsonPayload = JSON.serialize(columnDTO);
                }

                OpenSF__ColumnUpdateEvent__e event = new OpenSF__ColumnUpdateEvent__e(
                    OpenSF__EventType__c = eventType,
                    OpenSF__Payload__c = jsonPayload
                );

                events.add(event);
            } catch (Exception e) {
                System.debug(
                    LoggingLevel.ERROR,
                    'Error creating event for column ' +
                        column.Id +
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
    private String createDeletePayload(OpenSF__Column__c column) {
        Map<String, Object> payload = new Map<String, Object>{
            'Id' => column.Id,
            'Name' => column.Name,
            'boardId' => column.OpenSF__Board__c
        };
        return JSON.serialize(payload);
    }
}
