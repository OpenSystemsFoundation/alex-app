/**
 * AdminController - Controller for the Admin Management page
 * Handles board CRUD, card field management, and onboarding status
 */
public with sharing class AdminController {
    /**
     * Get all boards with their column counts
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.BoardDTO> getBoards() {
        try {
            return KanbanBoardDTO.convertBoards(BoardSelector.getAllBoards());
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
            Database.insert(boardsToInsert, AccessLevel.USER_MODE);
            board.Id = boardsToInsert[0].Id;

            // Re-query to get all fields
            OpenSF__Board__c created = BoardSelector.getBoardWithListFields(
                board.Id
            );
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

            Database.update(
                Security.stripInaccessible(
                        AccessType.UPDATABLE,
                        new List<OpenSF__Board__c>{ board }
                    )
                    .getRecords(),
                AccessLevel.USER_MODE
            );

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
            Database.delete(board, AccessLevel.USER_MODE);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting board: ' + e.getMessage()
            );
        }
    }

    /**
     * Get onboarding status - checks what setup steps have been completed
     */
    @AuraEnabled
    public static OnboardingStatus getOnboardingStatus() {
        try {
            return BoardSelector.getOnboardingStatus();
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error checking onboarding status: ' + e.getMessage()
            );
        }
    }

    /**
     * Post-upgrade steps the package upgrade could not apply (missing picklist
     * values, retired flows still active). Empty when the org is up to date.
     */
    @AuraEnabled
    public static List<UpgradeCheckService.UpgradeIssue> getUpgradeIssues() {
        try {
            return UpgradeCheckService.getIssues();
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error checking upgrade status: ' + e.getMessage()
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
            Database.insert(boardsToCreate, AccessLevel.USER_MODE);
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
            List<String> statuses = new List<String>{
                'To Do',
                'In Progress',
                'Review',
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
                        OpenSF__Status__c = statuses[i]
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
            Database.insert(colsToCreate, AccessLevel.USER_MODE);

            // Re-query board with list fields
            OpenSF__Board__c created = BoardSelector.getBoardWithListFields(
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
        requireCardFieldManagePermission();
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
        requireCardFieldManagePermission();
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
            Map<String, Schema.SObjectField> fieldMap = OpenSF__Card__c.SObjectType.getDescribe(
                    SObjectDescribeOptions.DEFERRED
                )
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

    /**
     * Metadata deployments run in system context, so gate them behind an
     * explicit custom permission (granted by the Alex_Admin permission set)
     * instead of relying on Apex class access alone.
     */
    private static void requireCardFieldManagePermission() {
        if (!FeatureManagement.checkPermission('ManageCardFields')) {
            throw new AuraHandledException(
                'You do not have permission to manage card custom fields.'
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
