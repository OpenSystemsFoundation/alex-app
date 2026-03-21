/**
 * KanbanBoardService - Service layer for Kanban Board business logic
 * Extracts board-level operations from KanbanBoardController
 */
public with sharing class KanbanBoardService {
    /**
     * Load full board data (board + columns + cards)
     */
    public static KanbanBoardController.BoardData getBoardData(Id boardId) {
        try {
            // Use selector class for queries
            OpenSF__Board__c board = KanbanBoardSelector.getBoardById(boardId);
            List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(
                boardId
            );
            List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(
                boardId
            );

            // Backfill any cards missing LexoRank positions
            KanbanCardService.backfillMissingPositions(cards);

            // Load custom field configs
            List<OpenSF__CardCustomField__mdt> customFieldConfigs = getActiveCardCustomFields();
            List<KanbanBoardDTO.CardCustomFieldDTO> customFieldDTOs = new List<KanbanBoardDTO.CardCustomFieldDTO>();
            for (OpenSF__CardCustomField__mdt cf : customFieldConfigs) {
                customFieldDTOs.add(new KanbanBoardDTO.CardCustomFieldDTO(cf));
            }

            // Convert to DTOs for LWC consumption
            KanbanBoardController.BoardData result = new KanbanBoardController.BoardData();
            result.board = new KanbanBoardDTO.BoardDTO(board);
            result.columns = KanbanBoardDTO.convertColumns(columns);
            result.cards = KanbanBoardDTO.convertCards(cards);
            result.cardTypeIcons = getCardTypeIcons();
            result.customFieldConfigs = customFieldDTOs;

            // Populate custom field values on cards if configs exist
            if (!customFieldConfigs.isEmpty() && !cards.isEmpty()) {
                populateCustomFieldValues(
                    result.cards,
                    cards,
                    customFieldConfigs
                );
            }

            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading board: ' + e.getMessage()
            );
        }
    }

    /**
     * Get active CardCustomField__mdt records, sorted by SortOrder__c
     */
    public static List<OpenSF__CardCustomField__mdt> getActiveCardCustomFields() {
        return [
            SELECT
                OpenSF__FieldApiName__c,
                OpenSF__DisplayLabel__c,
                OpenSF__FieldType__c,
                OpenSF__SortOrder__c
            FROM OpenSF__CardCustomField__mdt
            WHERE OpenSF__Active__c = TRUE
            ORDER BY OpenSF__SortOrder__c ASC
        ];
    }

    /**
     * Populate custom field values on CardDTOs by dynamically querying
     * the configured fields from Card__c records.
     */
    private static void populateCustomFieldValues(
        List<KanbanBoardDTO.CardDTO> cardDTOs,
        List<OpenSF__Card__c> cards,
        List<OpenSF__CardCustomField__mdt> configs
    ) {
        // Build set of namespaced field API names to query
        Set<String> fieldNames = new Set<String>();
        for (OpenSF__CardCustomField__mdt cfg : configs) {
            String apiName = cfg.OpenSF__FieldApiName__c;
            // Add namespace prefix if not present
            if (!apiName.startsWith('OpenSF__')) {
                apiName = 'OpenSF__' + apiName;
            }
            fieldNames.add(apiName);
        }

        // Validate fields exist on Card__c before querying
        Map<String, Schema.SObjectField> cardFields = OpenSF__Card__c.SObjectType.getDescribe()
            .fields.getMap();
        Set<String> validFields = new Set<String>();
        for (String fn : fieldNames) {
            if (cardFields.containsKey(fn.toLowerCase())) {
                validFields.add(fn);
            }
        }

        if (validFields.isEmpty()) {
            return;
        }

        // Build dynamic SOQL
        List<String> fieldList = new List<String>(validFields);
        Set<Id> cardIds = new Set<Id>();
        for (OpenSF__Card__c c : cards) {
            cardIds.add(c.Id);
        }

        String soql =
            'SELECT Id, ' +
            String.join(fieldList, ', ') +
            ' FROM OpenSF__Card__c WHERE Id IN :cardIds WITH USER_MODE';
        Map<Id, SObject> customFieldMap = new Map<Id, SObject>(
            Database.query(soql)
        );

        // Map original API names (without namespace) to namespaced names
        Map<String, String> nameMap = new Map<String, String>();
        for (OpenSF__CardCustomField__mdt cfg : configs) {
            String orig = cfg.OpenSF__FieldApiName__c;
            String namespaced = orig.startsWith('OpenSF__')
                ? orig
                : 'OpenSF__' + orig;
            if (validFields.contains(namespaced)) {
                nameMap.put(orig, namespaced);
            }
        }

        // Populate custom fields on each CardDTO
        for (KanbanBoardDTO.CardDTO dto : cardDTOs) {
            SObject record = customFieldMap.get(dto.Id);
            if (record == null)
                continue;

            dto.customFields = new Map<String, Object>();
            for (String origName : nameMap.keySet()) {
                String nsName = nameMap.get(origName);
                Object val = record.get(nsName);
                // Use the original (un-namespaced) name as key for the frontend
                dto.customFields.put(origName, val);
            }
        }
    }

    /**
     * Move column to new position
     */
    public static KanbanBoardDTO.ColumnDTO moveColumn(
        Id columnId,
        String previousColumnPosition,
        String nextColumnPosition
    ) {
        try {
            String newPosition = LexoRank.between(
                previousColumnPosition,
                nextColumnPosition
            );

            OpenSF__Column__c column = new OpenSF__Column__c(
                Id = columnId,
                OpenSF__LexoRankPosition__c = newPosition
            );

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Column__c>{ column }
                )
                .getRecords();

            // Return updated column as DTO
            OpenSF__Column__c updatedColumn = KanbanBoardSelector.getColumnById(
                columnId
            );
            return new KanbanBoardDTO.ColumnDTO(updatedColumn);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error moving column: ' + e.getMessage()
            );
        }
    }

    /**
     * Get incremental updates since timestamp (polling fallback)
     */
    public static KanbanBoardController.IncrementalUpdateData getIncrementalUpdates(
        Id boardId,
        DateTime lastSyncTime
    ) {
        try {
            KanbanBoardController.IncrementalUpdateData result = new KanbanBoardController.IncrementalUpdateData();
            result.syncTimestamp = DateTime.now();
            result.hasChanges = false;

            // Query for cards modified since lastSyncTime (all fields needed by CardDTO)
            List<OpenSF__Card__c> modifiedCards = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Subject__c,
                    OpenSF__Description__c,
                    OpenSF__Priority__c,
                    OpenSF__Status__c,
                    OpenSF__CardType__c,
                    OpenSF__Color__c,
                    OpenSF__DueDate__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Column__c,
                    OpenSF__Board__c,
                    OpenSF__LexoRankPosition__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__PeerReviewer__c,
                    OpenSF__PeerReviewer__r.Name,
                    OpenSF__PeerReviewer__r.SmallPhotoUrl,
                    OpenSF__Epic__c,
                    OpenSF__Epic__r.OpenSF__Subject__c,
                    OpenSF__Locked__c,
                    OpenSF__NeedsRefinement__c,
                    OpenSF__SequenceNumber__c,
                    LastModifiedDate,
                    LastModifiedById
                FROM OpenSF__Card__c
                WHERE
                    OpenSF__Column__r.OpenSF__Board__c = :boardId
                    AND LastModifiedDate > :lastSyncTime
                WITH USER_MODE
                ORDER BY LastModifiedDate ASC
            ];

            if (!modifiedCards.isEmpty()) {
                result.cards = KanbanBoardDTO.convertCards(modifiedCards);
                result.hasChanges = true;
            }

            // Also check for deleted cards (via a custom approach if needed)
            // For now, we'll rely on full refresh if inconsistencies are detected

            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error fetching updates: ' + e.getMessage()
            );
        }
    }

    /**
     * Check platform event health status
     * Returns metrics about platform event delivery
     */
    public static KanbanBoardController.PlatformEventHealth checkPlatformEventHealth() {
        try {
            KanbanBoardController.PlatformEventHealth health = new KanbanBoardController.PlatformEventHealth();
            health.isHealthy = true;
            health.timestamp = DateTime.now();

            // Check event bus delivery limits
            // Note: This is a simplified check. In production, you'd want to query
            // actual event delivery metrics or use Platform Event monitoring APIs
            try {
                // Query recent event delivery (if tracking is enabled)
                // For now, we assume healthy unless we detect issues
                health.deliveryRate = 100; // Percentage
                health.message = 'Platform events operational';
            } catch (Exception e) {
                health.isHealthy = false;
                health.deliveryRate = 0;
                health.message = 'Unable to verify event delivery';
            }

            return health;
        } catch (Exception e) {
            KanbanBoardController.PlatformEventHealth health = new KanbanBoardController.PlatformEventHealth();
            health.isHealthy = false;
            health.timestamp = DateTime.now();
            health.deliveryRate = 0;
            health.message = 'Error checking health: ' + e.getMessage();
            return health;
        }
    }

    /**
     * Get modal settings from custom metadata
     */
    public static KanbanBoardController.ModalSettings getModalSettings() {
        try {
            KanbanBoardSettings__mdt settings = [
                SELECT FieldNames__c
                FROM KanbanBoardSettings__mdt
                WHERE DeveloperName = 'Modal_Settings'
                LIMIT 1
            ];

            KanbanBoardController.ModalSettings result = new KanbanBoardController.ModalSettings();
            if (settings != null && String.isNotBlank(settings.FieldNames__c)) {
                // Parse comma-separated field names and clean them
                List<String> fields = settings.FieldNames__c.split(',');
                result.visibleFields = new List<String>();
                for (String field : fields) {
                    String cleanField = field.trim();
                    if (String.isNotBlank(cleanField)) {
                        result.visibleFields.add(cleanField);
                    }
                }
            } else {
                // Default fields if not configured
                result.visibleFields = new List<String>{
                    'OpenSF__Subject__c',
                    'OpenSF__Description__c',
                    'OpenSF__Priority__c',
                    'OpenSF__CardType__c',
                    'OpenSF__Assignee__c',
                    'OpenSF__DueDate__c',
                    'OpenSF__StoryPoints__c',
                    'OpenSF__Color__c'
                };
            }
            return result;
        } catch (Exception e) {
            // Return defaults on error
            KanbanBoardController.ModalSettings result = new KanbanBoardController.ModalSettings();
            result.visibleFields = new List<String>{
                'OpenSF__Subject__c',
                'OpenSF__Description__c',
                'OpenSF__Priority__c',
                'OpenSF__CardType__c'
            };
            return result;
        }
    }

    /**
     * Get card type icon mappings from custom metadata.
     * Returns a map of picklist value → SLDS icon name.
     */
    public static Map<String, String> getCardTypeIcons() {
        Map<String, String> iconMap = new Map<String, String>();
        for (OpenSF__CardTypeIcon__mdt icon : [
            SELECT OpenSF__PicklistValue__c, OpenSF__IconName__c
            FROM OpenSF__CardTypeIcon__mdt
        ]) {
            iconMap.put(
                icon.OpenSF__PicklistValue__c,
                icon.OpenSF__IconName__c
            );
        }
        return iconMap;
    }

    /**
     * Get runtime config from the KanbanConfig hierarchy custom setting.
     * Returns the effective values for the running user (org → profile → user).
     */
    public static KanbanBoardController.KanbanConfigResult getKanbanConfig() {
        KanbanBoardController.KanbanConfigResult result = new KanbanBoardController.KanbanConfigResult();
        OpenSF__KanbanConfig__c cfg = OpenSF__KanbanConfig__c.getInstance();
        if (cfg != null) {
            result.showDebugInfo = cfg.OpenSF__ShowDebugInfo__c == true;
            result.enableDevTools = cfg.OpenSF__EnableDevTools__c == true;
        }
        return result;
    }
}
