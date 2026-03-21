/**
 * RecordLinkingService - Service class for linking Kanban cards to Salesforce records
 * Handles CRUD operations, record search, and bidirectional status sync
 */
public with sharing class RecordLinkingService {
    // Sync echo prevention: skip sync if last sync was within this window
    private static final Integer SYNC_ECHO_WINDOW_SECONDS = 5;

    /**
     * Get all linked records for a card
     */
    public static List<KanbanBoardDTO.LinkedRecordDTO> getLinkedRecords(
        Id cardId
    ) {
        List<OpenSF__LinkedRecord__c> records = [
            SELECT
                Id,
                Name,
                OpenSF__Card__c,
                OpenSF__RecordId__c,
                OpenSF__RecordName__c,
                OpenSF__SObjectType__c,
                OpenSF__SyncEnabled__c,
                OpenSF__StatusMapping__c,
                OpenSF__LastSyncDate__c
            FROM OpenSF__LinkedRecord__c
            WHERE OpenSF__Card__c = :cardId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
        List<KanbanBoardDTO.LinkedRecordDTO> dtos = new List<KanbanBoardDTO.LinkedRecordDTO>();
        for (OpenSF__LinkedRecord__c rec : records) {
            dtos.add(new KanbanBoardDTO.LinkedRecordDTO(rec));
        }
        return dtos;
    }

    /**
     * Link a Salesforce record to a card
     */
    public static KanbanBoardDTO.LinkedRecordDTO linkRecord(
        Id cardId,
        String recordId,
        String sObjectType,
        Boolean syncEnabled,
        String statusMapping
    ) {
        // Validate the record exists and get its name
        String recordName = getRecordName(recordId, sObjectType);

        OpenSF__LinkedRecord__c link = new OpenSF__LinkedRecord__c(
            OpenSF__Card__c = cardId,
            OpenSF__RecordId__c = recordId,
            OpenSF__RecordName__c = recordName,
            OpenSF__SObjectType__c = sObjectType,
            OpenSF__SyncEnabled__c = syncEnabled,
            OpenSF__StatusMapping__c = statusMapping
        );

        List<OpenSF__LinkedRecord__c> stripped = (List<OpenSF__LinkedRecord__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__LinkedRecord__c>{ link }
            )
            .getRecords();
        insert stripped;
        link.Id = stripped[0].Id;

        // Publish event
        publishLinkEvent(cardId, recordId, 'link_created', null);

        // Re-query for full DTO
        OpenSF__LinkedRecord__c created = [
            SELECT
                Id,
                Name,
                OpenSF__Card__c,
                OpenSF__RecordId__c,
                OpenSF__RecordName__c,
                OpenSF__SObjectType__c,
                OpenSF__SyncEnabled__c,
                OpenSF__StatusMapping__c,
                OpenSF__LastSyncDate__c
            FROM OpenSF__LinkedRecord__c
            WHERE Id = :link.Id
            WITH USER_MODE
            LIMIT 1
        ];
        return new KanbanBoardDTO.LinkedRecordDTO(created);
    }

    /**
     * Unlink a record from a card
     */
    public static void unlinkRecord(Id linkedRecordId) {
        // Get before delete for event
        OpenSF__LinkedRecord__c link = [
            SELECT OpenSF__Card__c, OpenSF__RecordId__c
            FROM OpenSF__LinkedRecord__c
            WHERE Id = :linkedRecordId
            WITH USER_MODE
            LIMIT 1
        ];

        if (!Schema.sObjectType.OpenSF__LinkedRecord__c.isDeletable()) {
            throw new AuraHandledException(
                'Insufficient access to delete linked records.'
            );
        }
        delete new OpenSF__LinkedRecord__c(Id = linkedRecordId);

        publishLinkEvent(
            link.OpenSF__Card__c,
            link.OpenSF__RecordId__c,
            'link_removed',
            null
        );
    }

    /**
     * Search for Salesforce records to link
     * Supports Case, Opportunity, Account, Contact, Lead, and custom objects
     */
    public static List<RecordSearchResult> searchRecords(
        String searchTerm,
        String sObjectType
    ) {
        List<RecordSearchResult> results = new List<RecordSearchResult>();

        if (String.isBlank(searchTerm) || searchTerm.length() < 2) {
            return results;
        }

        // Validate the SObject type exists
        Schema.SObjectType targetType = Schema.getGlobalDescribe()
            .get(sObjectType);
        if (targetType == null) {
            throw new AuraHandledException(
                'Invalid SObject type: ' + sObjectType
            );
        }

        Schema.DescribeSObjectResult describe = targetType.getDescribe();
        if (!describe.isAccessible()) {
            throw new AuraHandledException(
                'Insufficient access to ' + sObjectType
            );
        }

        // Determine the name field
        String nameField = 'Name';
        if (sObjectType == 'Case') {
            nameField = 'Subject';
        }

        // Build and execute SOQL query with sanitized input
        String sanitizedTerm =
            '%' +
            String.escapeSingleQuotes(searchTerm) +
            '%';
        String query =
            'SELECT Id, ' +
            String.escapeSingleQuotes(nameField) +
            ' FROM ' +
            String.escapeSingleQuotes(sObjectType) +
            ' WHERE ' +
            String.escapeSingleQuotes(nameField) +
            ' LIKE :sanitizedTerm' +
            ' WITH USER_MODE' +
            ' ORDER BY ' +
            String.escapeSingleQuotes(nameField) +
            ' ASC LIMIT 20';

        List<SObject> records = Database.query(query);

        for (SObject rec : records) {
            RecordSearchResult result = new RecordSearchResult();
            result.recordId = rec.Id;
            result.name = (String) rec.get(nameField);
            result.sObjectType = sObjectType;
            results.add(result);
        }

        return results;
    }

    /**
     * Sync card status to linked record (card → record direction)
     * Called when a card's status changes
     */
    public static void syncCardStatusToLinkedRecords(
        Id cardId,
        String newStatus
    ) {
        List<OpenSF__LinkedRecord__c> links = [
            SELECT
                Id,
                OpenSF__RecordId__c,
                OpenSF__SObjectType__c,
                OpenSF__SyncEnabled__c,
                OpenSF__StatusMapping__c,
                OpenSF__LastSyncDate__c
            FROM OpenSF__LinkedRecord__c
            WHERE OpenSF__Card__c = :cardId AND OpenSF__SyncEnabled__c = TRUE
            WITH USER_MODE
        ];

        if (links.isEmpty()) {
            return;
        }

        List<SObject> recordsToUpdate = new List<SObject>();
        List<OpenSF__LinkedRecord__c> linksToUpdate = new List<OpenSF__LinkedRecord__c>();

        for (OpenSF__LinkedRecord__c link : links) {
            // Skip if within echo window
            if (isWithinEchoWindow(link.OpenSF__LastSyncDate__c)) {
                continue;
            }

            String mappedStatus = getMappedStatus(
                link.OpenSF__StatusMapping__c,
                newStatus,
                'card_to_record'
            );
            if (mappedStatus == null) {
                continue;
            }

            // Get the status field for this SObject type
            String statusField = getStatusField(link.OpenSF__SObjectType__c);
            if (statusField == null) {
                continue;
            }

            // Build the record update
            Id recordId = Id.valueOf(link.OpenSF__RecordId__c);
            Schema.SObjectType sObjType = recordId.getSobjectType();
            SObject record = sObjType.newSObject(recordId);
            record.put(statusField, mappedStatus);
            recordsToUpdate.add(record);

            // Update last sync date
            linksToUpdate.add(
                new OpenSF__LinkedRecord__c(
                    Id = link.Id,
                    OpenSF__LastSyncDate__c = DateTime.now()
                )
            );
        }

        if (!recordsToUpdate.isEmpty()) {
            update recordsToUpdate;
        }
        if (!linksToUpdate.isEmpty()) {
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    linksToUpdate
                )
                .getRecords();
        }

        // Publish sync events
        for (OpenSF__LinkedRecord__c link : links) {
            publishLinkEvent(
                cardId,
                link.OpenSF__RecordId__c,
                'card_status_changed',
                newStatus
            );
        }
    }

    /**
     * Sync linked record status back to card (record → card direction)
     * Called by a trigger/flow on the external object
     */
    public static void syncRecordStatusToCard(
        String recordId,
        String newRecordStatus
    ) {
        List<OpenSF__LinkedRecord__c> links = [
            SELECT
                Id,
                OpenSF__Card__c,
                OpenSF__RecordId__c,
                OpenSF__SObjectType__c,
                OpenSF__SyncEnabled__c,
                OpenSF__StatusMapping__c,
                OpenSF__LastSyncDate__c
            FROM OpenSF__LinkedRecord__c
            WHERE
                OpenSF__RecordId__c = :recordId
                AND OpenSF__SyncEnabled__c = TRUE
            WITH USER_MODE
        ];

        if (links.isEmpty()) {
            return;
        }

        List<OpenSF__Card__c> cardsToUpdate = new List<OpenSF__Card__c>();
        List<OpenSF__LinkedRecord__c> linksToUpdate = new List<OpenSF__LinkedRecord__c>();

        for (OpenSF__LinkedRecord__c link : links) {
            // Skip if within echo window
            if (isWithinEchoWindow(link.OpenSF__LastSyncDate__c)) {
                continue;
            }

            String mappedStatus = getMappedStatus(
                link.OpenSF__StatusMapping__c,
                newRecordStatus,
                'record_to_card'
            );
            if (mappedStatus == null) {
                continue;
            }

            cardsToUpdate.add(
                new OpenSF__Card__c(
                    Id = link.OpenSF__Card__c,
                    OpenSF__Status__c = mappedStatus
                )
            );

            linksToUpdate.add(
                new OpenSF__LinkedRecord__c(
                    Id = link.Id,
                    OpenSF__LastSyncDate__c = DateTime.now()
                )
            );
        }

        if (!cardsToUpdate.isEmpty()) {
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    cardsToUpdate
                )
                .getRecords();
        }
        if (!linksToUpdate.isEmpty()) {
            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    linksToUpdate
                )
                .getRecords();
        }

        // Publish sync events
        for (OpenSF__LinkedRecord__c link : links) {
            publishLinkEvent(
                link.OpenSF__Card__c,
                link.OpenSF__RecordId__c,
                'record_status_changed',
                newRecordStatus
            );
        }
    }

    /**
     * Get the name of a record by its ID
     */
    public static String getRecordName(String recordId, String sObjectType) {
        String nameField = 'Name';
        if (sObjectType == 'Case') {
            nameField = 'Subject';
        }

        String query =
            'SELECT ' +
            String.escapeSingleQuotes(nameField) +
            ' FROM ' +
            String.escapeSingleQuotes(sObjectType) +
            ' WHERE Id = :recordId' +
            ' WITH USER_MODE LIMIT 1';
        List<SObject> records = Database.query(query);
        if (records.isEmpty()) {
            throw new AuraHandledException(
                sObjectType + ' record not found: ' + recordId
            );
        }
        return (String) records[0].get(nameField);
    }

    /**
     * Get the status field name for common SObject types
     */
    public static String getStatusField(String sObjectType) {
        Map<String, String> statusFields = new Map<String, String>{
            'Case' => 'Status',
            'Opportunity' => 'StageName',
            'Lead' => 'Status',
            'Task' => 'Status',
            'WorkOrder' => 'Status'
        };
        return statusFields.get(sObjectType);
    }

    /**
     * Map a status value using the JSON status mapping
     * Direction: 'card_to_record' maps card status → record status
     * Direction: 'record_to_card' maps record status → card status (reverse lookup)
     */
    @TestVisible
    private static String getMappedStatus(
        String statusMappingJson,
        String sourceStatus,
        String direction
    ) {
        if (String.isBlank(statusMappingJson) || String.isBlank(sourceStatus)) {
            return null;
        }

        try {
            Map<String, Object> mapping = (Map<String, Object>) JSON.deserializeUntyped(
                statusMappingJson
            );

            if (direction == 'card_to_record') {
                // Direct lookup: card status → record status
                Object mapped = mapping.get(sourceStatus);
                return mapped != null ? String.valueOf(mapped) : null;
            } else {
                // Reverse lookup: record status → card status
                for (String cardStatus : mapping.keySet()) {
                    if (
                        String.valueOf(mapping.get(cardStatus)) == sourceStatus
                    ) {
                        return cardStatus;
                    }
                }
                return null;
            }
        } catch (Exception e) {
            System.debug('Error parsing status mapping: ' + e.getMessage());
            return null;
        }
    }

    /**
     * Check if we're within the echo prevention window
     */
    private static Boolean isWithinEchoWindow(DateTime lastSyncDate) {
        if (lastSyncDate == null) {
            return false;
        }
        Long secondsSinceLastSync =
            (DateTime.now().getTime() - lastSyncDate.getTime()) / 1000;
        return secondsSinceLastSync < SYNC_ECHO_WINDOW_SECONDS;
    }

    /**
     * Publish a linked record event
     */
    private static void publishLinkEvent(
        Id cardId,
        String linkedRecordId,
        String eventType,
        String newStatus
    ) {
        OpenSF__LinkedRecordEvent__e event = new OpenSF__LinkedRecordEvent__e(
            OpenSF__CardId__c = cardId,
            OpenSF__LinkedRecordId__c = linkedRecordId,
            OpenSF__EventType__c = eventType,
            OpenSF__NewStatus__c = newStatus
        );
        EventBus.publish(event);
    }

    /**
     * Search result wrapper
     */
    public class RecordSearchResult {
        @AuraEnabled
        public String recordId;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String sObjectType;
    }
}
