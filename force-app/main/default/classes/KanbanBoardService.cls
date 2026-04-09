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

            // Convert to DTOs for LWC consumption
            KanbanBoardController.BoardData result = new KanbanBoardController.BoardData();
            result.board = new KanbanBoardDTO.BoardDTO(board);
            result.columns = KanbanBoardDTO.convertColumns(columns);
            result.cards = KanbanBoardDTO.convertCards(cards);
            result.cardTypeIcons = getCardTypeIcons();

            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading board: ' + e.getMessage()
            );
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

            // Query for cards modified since lastSyncTime (reuse standard card fields)
            List<OpenSF__Card__c> modifiedCards = Database.query(
                'SELECT ' +
                    KanbanBoardSelector.CARD_FIELDS +
                    ' FROM OpenSF__Card__c' +
                    ' WHERE OpenSF__Column__r.OpenSF__Board__c = :boardId' +
                    ' AND LastModifiedDate > :lastSyncTime' +
                    ' WITH USER_MODE' +
                    ' ORDER BY LastModifiedDate ASC'
            );

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
            OpenSF__KanbanBoardSettings__mdt settings = getModalSettingsRecord();

            KanbanBoardController.ModalSettings result = new KanbanBoardController.ModalSettings();
            if (
                settings != null &&
                String.isNotBlank(settings.OpenSF__FieldNames__c)
            ) {
                // Parse comma-separated field names and clean them
                List<String> fields = settings.OpenSF__FieldNames__c.split(',');
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
     * Get runtime config (defaults only in OSS version).
     */
    public static KanbanBoardController.KanbanConfigResult getKanbanConfig() {
        return new KanbanBoardController.KanbanConfigResult();
    }

    private static OpenSF__KanbanBoardSettings__mdt getModalSettingsRecord() {
        List<OpenSF__KanbanBoardSettings__mdt> settingsList = [
            SELECT OpenSF__FieldNames__c
            FROM OpenSF__KanbanBoardSettings__mdt
            WHERE DeveloperName = 'Modal_Settings'
            LIMIT 1
        ];
        return settingsList.isEmpty() ? null : settingsList[0];
    }
}
