/**
 * ColumnTriggerHandler - Handles Column__c trigger events
 * Publishes platform events for column changes with JSON payload
 */
public with sharing class ColumnTriggerHandler extends TriggerHandler {
    /** Platform events that failed to publish in this transaction. */
    @TestVisible
    private static Integer publishFailures = 0;

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
                    // Required fields kept from 1.1.1 (force-app/deprecated):
                    // the event can't be published without them
                    OpenSF__BoardId__c = column.OpenSF__Board__c,
                    OpenSF__ColumnId__c = column.Id,
                    OpenSF__ColumnName__c = column.Name != null
                        ? column.Name
                        : String.valueOf(column.Id),
                    OpenSF__LastModifiedDate__c = column.LastModifiedDate !=
                        null
                        ? column.LastModifiedDate
                        : Datetime.now(),
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

            // A failed publish never reaches other clients; don't fail the
            // user's DML for it, but make it visible
            for (Database.SaveResult result : results) {
                if (!result.isSuccess()) {
                    publishFailures++;
                    System.debug(
                        LoggingLevel.ERROR,
                        'ColumnUpdateEvent__e publish failed: ' +
                        result.getErrors()
                    );
                }
            }
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
