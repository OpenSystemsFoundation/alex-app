/**
 * AdminController - Controller for the Admin Management page
 * Handles board CRUD, column management, and onboarding status
 */
public with sharing class AdminController {
    /**
     * Get all boards with their column counts
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.BoardDTO> getBoards() {
        try {
            List<OpenSF__Board__c> boards = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Description__c,
                    OpenSF__Status__c,
                    OpenSF__Type__c,
                    OpenSF__Active__c,
                    OpenSF__EmailNotifications__c,
                    OpenSF__SalesforceNotifications__c,
                    OpenSF__ActiveSprint__c,
                    OpenSF__ColumnCount__c
                FROM OpenSF__Board__c
                WITH USER_MODE
                ORDER BY Name ASC
            ];
            return KanbanBoardDTO.convertBoards(boards);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading boards: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new board
     */
    @AuraEnabled
    public static KanbanBoardDTO.BoardDTO createBoard(
        String name,
        String description,
        String boardType
    ) {
        try {
            OpenSF__Board__c board = new OpenSF__Board__c(
                Name = name,
                OpenSF__Description__c = description,
                OpenSF__Type__c = boardType,
                OpenSF__Status__c = 'Active',
                OpenSF__Active__c = true
            );
            List<OpenSF__Board__c> boardsToInsert = Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__Board__c>{ board }
                )
                .getRecords();
            insert boardsToInsert;
            board.Id = boardsToInsert[0].Id;

            // Re-query to get all fields
            OpenSF__Board__c created = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Description__c,
                    OpenSF__Status__c,
                    OpenSF__Type__c,
                    OpenSF__Active__c,
                    OpenSF__EmailNotifications__c,
                    OpenSF__SalesforceNotifications__c,
                    OpenSF__ActiveSprint__c
                FROM OpenSF__Board__c
                WHERE Id = :board.Id
                WITH USER_MODE
                LIMIT 1
            ];
            return new KanbanBoardDTO.BoardDTO(created);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating board: ' + e.getMessage()
            );
        }
    }

    /**
     * Update board settings
     */
    @AuraEnabled
    public static KanbanBoardDTO.BoardDTO updateBoard(
        Id boardId,
        Map<String, Object> updates
    ) {
        try {
            OpenSF__Board__c board = new OpenSF__Board__c(Id = boardId);

            if (updates.containsKey('name')) {
                board.Name = (String) updates.get('name');
            }
            if (updates.containsKey('description')) {
                board.OpenSF__Description__c = (String) updates.get(
                    'description'
                );
            }
            if (updates.containsKey('type')) {
                board.OpenSF__Type__c = (String) updates.get('type');
            }
            if (updates.containsKey('status')) {
                board.OpenSF__Status__c = (String) updates.get('status');
            }
            if (updates.containsKey('active')) {
                board.OpenSF__Active__c = (Boolean) updates.get('active');
            }
            if (updates.containsKey('emailNotifications')) {
                board.OpenSF__EmailNotifications__c = (Boolean) updates.get(
                    'emailNotifications'
                );
            }
            if (updates.containsKey('salesforceNotifications')) {
                board.OpenSF__SalesforceNotifications__c = (Boolean) updates.get(
                    'salesforceNotifications'
                );
            }

            update Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Board__c>{ board }
                )
                .getRecords();

            OpenSF__Board__c updated = KanbanBoardSelector.getBoardById(
                boardId
            );
            return new KanbanBoardDTO.BoardDTO(updated);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating board: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a board
     */
    @AuraEnabled
    public static void deleteBoard(Id boardId) {
        try {
            OpenSF__Board__c board = new OpenSF__Board__c(Id = boardId);
            delete board;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting board: ' + e.getMessage()
            );
        }
    }

    /**
     * Get columns for a board ordered by position
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.ColumnDTO> getColumns(Id boardId) {
        try {
            List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(
                boardId
            );
            return KanbanBoardDTO.convertColumns(columns);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading columns: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new column for a board
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO createColumn(
        Id boardId,
        String columnHeader,
        String category,
        String color,
        String previousPosition,
        String nextPosition
    ) {
        try {
            String position = LexoRank.between(previousPosition, nextPosition);

            OpenSF__Column__c column = new OpenSF__Column__c(
                OpenSF__Board__c = boardId,
                OpenSF__ColumnHeader__c = columnHeader,
                OpenSF__Category__c = category,
                OpenSF__Color__c = color,
                OpenSF__LexoRankPosition__c = position,
                OpenSF__Status__c = 'Active'
            );

            List<OpenSF__Column__c> colsToInsert = Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__Column__c>{ column }
                )
                .getRecords();
            // Re-apply master-detail field (stripped by Security.stripInaccessible)
            for (OpenSF__Column__c c : colsToInsert) {
                c.OpenSF__Board__c = boardId;
            }
            insert colsToInsert;

            OpenSF__Column__c created = KanbanBoardSelector.getColumnById(
                colsToInsert[0].Id
            );
            return new KanbanBoardDTO.ColumnDTO(created);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating column: ' + e.getMessage()
            );
        }
    }

    /**
     * Update a column
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO updateColumn(
        Id columnId,
        Map<String, Object> updates
    ) {
        try {
            OpenSF__Column__c column = new OpenSF__Column__c(Id = columnId);

            if (updates.containsKey('columnHeader')) {
                column.OpenSF__ColumnHeader__c = (String) updates.get(
                    'columnHeader'
                );
            }
            if (updates.containsKey('category')) {
                column.OpenSF__Category__c = (String) updates.get('category');
            }
            if (updates.containsKey('color')) {
                column.OpenSF__Color__c = (String) updates.get('color');
            }
            if (updates.containsKey('status')) {
                column.OpenSF__Status__c = (String) updates.get('status');
            }

            List<OpenSF__Column__c> colsToUpdate = Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Column__c>{ column }
                )
                .getRecords();
            update colsToUpdate;

            OpenSF__Column__c updated = KanbanBoardSelector.getColumnById(
                columnId
            );
            return new KanbanBoardDTO.ColumnDTO(updated);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating column: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a column
     */
    @AuraEnabled
    public static void deleteColumn(Id columnId) {
        try {
            OpenSF__Column__c column = new OpenSF__Column__c(Id = columnId);
            delete column;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting column: ' + e.getMessage()
            );
        }
    }

    /**
     * Reorder a column using LexoRank
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO reorderColumn(
        Id columnId,
        String previousPosition,
        String nextPosition
    ) {
        return KanbanBoardService.moveColumn(
            columnId,
            previousPosition,
            nextPosition
        );
    }

    /**
     * Get onboarding status - checks what setup steps have been completed
     */
    @AuraEnabled
    public static OnboardingStatus getOnboardingStatus() {
        try {
            OnboardingStatus status = new OnboardingStatus();

            // Check if any boards exist
            Integer boardCount = [
                SELECT COUNT()
                FROM OpenSF__Board__c
                WITH USER_MODE
            ];
            status.hasBoardsCreated = boardCount > 0;

            // Check if any board has columns
            Integer columnsCount = [
                SELECT COUNT()
                FROM OpenSF__Column__c
                WITH USER_MODE
            ];
            status.hasColumnsConfigured = columnsCount > 0;

            // Check if permission sets are assigned
            Integer permSetCount = [
                SELECT COUNT()
                FROM PermissionSetAssignment
                WHERE
                    PermissionSet.Name IN (
                        'OpenSF__Alex_Admin',
                        'OpenSF__Alex_User'
                    )
                    AND AssigneeId != :UserInfo.getUserId()
                WITH USER_MODE
            ];
            status.hasUsersAssigned = permSetCount > 0;

            // Check if any cards exist
            Integer cardCount = [
                SELECT COUNT()
                FROM OpenSF__Card__c
                WITH USER_MODE
            ];
            status.hasCardsCreated = cardCount > 0;

            status.isComplete =
                status.hasBoardsCreated &&
                status.hasColumnsConfigured &&
                status.hasUsersAssigned;

            return status;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error checking onboarding status: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a board with default columns for quick setup
     */
    @AuraEnabled
    public static KanbanBoardDTO.BoardDTO createBoardWithDefaultColumns(
        String name,
        String description,
        String boardType
    ) {
        try {
            // Create the board
            OpenSF__Board__c board = new OpenSF__Board__c(
                Name = name,
                OpenSF__Description__c = description,
                OpenSF__Type__c = boardType,
                OpenSF__Status__c = 'Active',
                OpenSF__Active__c = true
            );
            List<OpenSF__Board__c> boardsToCreate = Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__Board__c>{ board }
                )
                .getRecords();
            insert boardsToCreate;
            board.Id = boardsToCreate[0].Id;

            // Create default columns
            List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
            List<String> headers = new List<String>{
                'To Do',
                'In Progress',
                'In Review',
                'Done'
            };
            List<String> categories = new List<String>{
                'To Do',
                'In Progress',
                'In Progress',
                'Done'
            };

            String position = null;
            for (Integer i = 0; i < headers.size(); i++) {
                String newPosition = LexoRank.between(position, null);
                columns.add(
                    new OpenSF__Column__c(
                        OpenSF__Board__c = board.Id,
                        OpenSF__ColumnHeader__c = headers[i],
                        OpenSF__Category__c = categories[i],
                        OpenSF__LexoRankPosition__c = newPosition,
                        OpenSF__Status__c = 'Active'
                    )
                );
                position = newPosition;
            }

            List<OpenSF__Column__c> colsToCreate = Security.stripInaccessible(
                    AccessType.CREATABLE,
                    columns
                )
                .getRecords();
            // Re-apply master-detail field (stripped by Security.stripInaccessible)
            for (OpenSF__Column__c c : colsToCreate) {
                c.OpenSF__Board__c = board.Id;
            }
            insert colsToCreate;

            // Re-query board
            OpenSF__Board__c created = KanbanBoardSelector.getBoardById(
                board.Id
            );
            return new KanbanBoardDTO.BoardDTO(created);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating board with columns: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // Card Custom Field Operations
    // =========================================================================

    /**
     * Get all card custom field configurations
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.CardCustomFieldDTO> getCardCustomFields() {
        try {
            List<OpenSF__CardCustomField__mdt> fields = [
                SELECT
                    DeveloperName,
                    MasterLabel,
                    OpenSF__FieldApiName__c,
                    OpenSF__DisplayLabel__c,
                    OpenSF__FieldType__c,
                    OpenSF__SortOrder__c,
                    OpenSF__Active__c
                FROM OpenSF__CardCustomField__mdt
                ORDER BY OpenSF__SortOrder__c ASC
            ];
            List<KanbanBoardDTO.CardCustomFieldDTO> result = new List<KanbanBoardDTO.CardCustomFieldDTO>();
            for (OpenSF__CardCustomField__mdt f : fields) {
                CardCustomFieldAdminDTO dto = new CardCustomFieldAdminDTO();
                dto.developerName = f.DeveloperName;
                dto.masterLabel = f.MasterLabel;
                dto.fieldApiName = f.OpenSF__FieldApiName__c;
                dto.displayLabel = String.isNotBlank(f.OpenSF__DisplayLabel__c)
                    ? f.OpenSF__DisplayLabel__c
                    : f.OpenSF__FieldApiName__c.replace('__c', '');
                dto.fieldType = f.OpenSF__FieldType__c;
                dto.sortOrder = f.OpenSF__SortOrder__c;
                dto.active = f.OpenSF__Active__c;
                result.add(dto);
            }
            return result;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading card custom fields: ' + e.getMessage()
            );
        }
    }

    /**
     * Save a card custom field configuration via Metadata API deployment.
     * Creates or updates a CardCustomField__mdt record.
     */
    @AuraEnabled
    public static String saveCardCustomField(Map<String, Object> fieldConfig) {
        try {
            String devName = (String) fieldConfig.get('developerName');
            String label = (String) fieldConfig.get('masterLabel');
            String fieldApiName = (String) fieldConfig.get('fieldApiName');
            String displayLabel = (String) fieldConfig.get('displayLabel');
            String fieldType = (String) fieldConfig.get('fieldType');
            Decimal sortOrder = fieldConfig.containsKey('sortOrder')
                ? (Decimal) fieldConfig.get('sortOrder')
                : 0;
            Boolean active = fieldConfig.containsKey('active')
                ? (Boolean) fieldConfig.get('active')
                : true;

            Metadata.CustomMetadata cmd = new Metadata.CustomMetadata();
            cmd.fullName = 'OpenSF__CardCustomField__mdt.' + devName;
            cmd.label = label;

            cmd.values = new List<Metadata.CustomMetadataValue>();
            cmd.values.add(
                buildMetadataValue('OpenSF__FieldApiName__c', fieldApiName)
            );
            cmd.values.add(
                buildMetadataValue('OpenSF__DisplayLabel__c', displayLabel)
            );
            cmd.values.add(
                buildMetadataValue('OpenSF__FieldType__c', fieldType)
            );
            cmd.values.add(
                buildMetadataValue('OpenSF__SortOrder__c', sortOrder)
            );
            cmd.values.add(buildMetadataValue('OpenSF__Active__c', active));

            Metadata.DeployContainer container = new Metadata.DeployContainer();
            container.addMetadata(cmd);
            Id jobId = Metadata.Operations.enqueueDeployment(container, null);
            return String.valueOf(jobId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error saving card custom field: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a card custom field by setting it inactive.
     * Custom metadata cannot be deleted via Apex — we deactivate instead.
     */
    @AuraEnabled
    public static String deactivateCardCustomField(String developerName) {
        try {
            Metadata.CustomMetadata cmd = new Metadata.CustomMetadata();
            cmd.fullName = 'OpenSF__CardCustomField__mdt.' + developerName;
            cmd.label = developerName;

            cmd.values = new List<Metadata.CustomMetadataValue>();
            cmd.values.add(buildMetadataValue('OpenSF__Active__c', false));

            Metadata.DeployContainer container = new Metadata.DeployContainer();
            container.addMetadata(cmd);
            Id jobId = Metadata.Operations.enqueueDeployment(container, null);
            return String.valueOf(jobId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deactivating card custom field: ' + e.getMessage()
            );
        }
    }

    /**
     * Get available Card__c fields that can be configured as custom card fields
     */
    @AuraEnabled
    public static List<FieldOption> getAvailableCardFields() {
        try {
            List<FieldOption> options = new List<FieldOption>();
            Map<String, Schema.SObjectField> fieldMap = OpenSF__Card__c.SObjectType.getDescribe()
                .fields.getMap();

            // Exclude system/standard fields and relationship fields
            Set<String> excludedFields = new Set<String>{
                'id',
                'name',
                'createddate',
                'createdbyid',
                'lastmodifieddate',
                'lastmodifiedbyid',
                'systemmodstamp',
                'isdeleted',
                'ownerid',
                'opensfboard__c',
                'opensf__board__c',
                'opensfcolumn__c',
                'opensf__column__c',
                'opensflexorankposition__c',
                'opensf__lexorankposition__c',
                'opensfsequencenumber__c',
                'opensf__sequencenumber__c'
            };

            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult dfr = fieldMap.get(fieldName)
                    .getDescribe();
                if (
                    excludedFields.contains(fieldName.toLowerCase()) ||
                    !dfr.isAccessible() ||
                    dfr.isCalculated()
                ) {
                    continue;
                }

                FieldOption opt = new FieldOption();
                opt.apiName = dfr.getName();
                // Strip namespace prefix for display
                opt.label = dfr.getLabel();
                opt.fieldType = String.valueOf(dfr.getType());
                options.add(opt);
            }

            options.sort();
            return options;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading available fields: ' + e.getMessage()
            );
        }
    }

    private static Metadata.CustomMetadataValue buildMetadataValue(
        String fieldName,
        Object value
    ) {
        Metadata.CustomMetadataValue cmv = new Metadata.CustomMetadataValue();
        cmv.field = fieldName;
        cmv.value = value;
        return cmv;
    }

    // =========================================================================
    // Wrapper Classes
    // =========================================================================

    public class OnboardingStatus {
        @AuraEnabled
        public Boolean hasBoardsCreated = false;
        @AuraEnabled
        public Boolean hasColumnsConfigured = false;
        @AuraEnabled
        public Boolean hasUsersAssigned = false;
        @AuraEnabled
        public Boolean hasCardsCreated = false;
        @AuraEnabled
        public Boolean isComplete = false;
    }

    public class CardCustomFieldAdminDTO extends KanbanBoardDTO.CardCustomFieldDTO {
        @AuraEnabled
        public String developerName;
        @AuraEnabled
        public String masterLabel;
        @AuraEnabled
        public Boolean active;

        public CardCustomFieldAdminDTO() {
            super();
        }
    }

    public class FieldOption implements Comparable {
        @AuraEnabled
        public String apiName;
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String fieldType;

        public Integer compareTo(Object other) {
            return this.label.compareTo(((FieldOption) other).label);
        }
    }
}
