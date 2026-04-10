/**
 * ColumnManagementController - Controller for the Column Management page
 * Handles column CRUD, reordering, and board listing for the column manager UI.
 * Follows Controller → Service → Selector → DTO layering.
 */
public with sharing class ColumnManagementController {
    /**
     * Get all boards for the board selector dropdown
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
     * Get columns for a board ordered by LexoRank position
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
     * Create a new column on a board using LexoRank positioning
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO createColumn(
        Id boardId,
        String columnHeader,
        String category,
        String color,
        String status,
        Decimal wipLimit,
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
                OpenSF__Status__c = status,
                OpenSF__WipLimit__c = wipLimit,
                OpenSF__LexoRankPosition__c = position
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
     * Update column properties
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
            if (updates.containsKey('wipLimit')) {
                column.OpenSF__WipLimit__c = (Decimal) updates.get('wipLimit');
            }

            List<OpenSF__Column__c> colsToUpdate = Security.stripInaccessible(
                    AccessType.UPDATABLE,
                    new List<OpenSF__Column__c>{ column }
                )
                .getRecords();
            // Re-apply Id field (stripped by Security.stripInaccessible)
            for (OpenSF__Column__c c : colsToUpdate) {
                c.Id = columnId;
            }
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
     * Reorder a column using LexoRank positioning
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO reorderColumn(
        Id columnId,
        String previousPosition,
        String nextPosition
    ) {
        try {
            return KanbanBoardService.moveColumn(
                columnId,
                previousPosition,
                nextPosition
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error reordering column: ' + e.getMessage()
            );
        }
    }

    /**
     * Create columns from a named template
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.ColumnDTO> createDefaultColumns(
        Id boardId,
        String templateName
    ) {
        try {
            String[][] templates = getTemplateColumns(templateName);

            String prevPosition = null;
            List<OpenSF__Column__c> columnsToInsert = new List<OpenSF__Column__c>();

            for (String[] t : templates) {
                String position = LexoRank.between(prevPosition, null);
                columnsToInsert.add(
                    new OpenSF__Column__c(
                        OpenSF__Board__c = boardId,
                        OpenSF__ColumnHeader__c = t[0],
                        OpenSF__Category__c = t[1],
                        OpenSF__Status__c = t[2],
                        OpenSF__Color__c = t[3],
                        OpenSF__LexoRankPosition__c = position
                    )
                );
                prevPosition = position;
            }

            List<OpenSF__Column__c> secureColumns = Security.stripInaccessible(
                    AccessType.CREATABLE,
                    columnsToInsert
                )
                .getRecords();
            for (Integer i = 0; i < secureColumns.size(); i++) {
                secureColumns[i].OpenSF__Board__c = boardId;
            }
            insert secureColumns;

            return KanbanBoardDTO.convertColumns(
                KanbanBoardSelector.getColumnsByBoardId(boardId)
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating template columns: ' + e.getMessage()
            );
        }
    }

    private static String[][] getTemplateColumns(String templateName) {
        if (templateName == 'kanban') {
            return new List<String[]>{
                new List<String>{ 'To Do', 'To Do', 'To Do', '#1B96FF' },
                new List<String>{
                    'In Progress',
                    'In Progress',
                    'In Progress',
                    '#06A59A'
                },
                new List<String>{ 'Review', 'Review', 'Review', '#9050E9' },
                new List<String>{ 'Done', 'Done', 'Done', '#2E844A' }
            };
        } else if (templateName == 'scrum') {
            return new List<String[]>{
                new List<String>{
                    'Backlog',
                    'Backlog',
                    'Backlog',
                    '#3A49DA'
                },
                new List<String>{ 'To Do', 'To Do', 'To Do', '#1B96FF' },
                new List<String>{
                    'In Progress',
                    'In Progress',
                    'In Progress',
                    '#06A59A'
                },
                new List<String>{
                    'Testing',
                    'Testing',
                    'Testing',
                    '#FCC003'
                },
                new List<String>{ 'Review', 'Review', 'Review', '#9050E9' },
                new List<String>{ 'Done', 'Done', 'Done', '#2E844A' }
            };
        } else if (templateName == 'release') {
            return new List<String[]>{
                new List<String>{
                    'Backlog',
                    'Backlog',
                    'Backlog',
                    '#3A49DA'
                },
                new List<String>{
                    'Development',
                    'In Progress',
                    'In Progress',
                    '#06A59A'
                },
                new List<String>{
                    'Code Review',
                    'Review',
                    'Review',
                    '#9050E9'
                },
                new List<String>{ 'QA', 'Testing', 'Testing', '#FCC003' },
                new List<String>{
                    'Staging',
                    'Release',
                    'Release',
                    '#F38303'
                },
                new List<String>{
                    'Released',
                    'Released',
                    'Done',
                    '#2E844A'
                }
            };
        }
        // Default fallback = kanban
        return new List<String[]>{
            new List<String>{ 'To Do', 'To Do', 'To Do', '#1B96FF' },
            new List<String>{
                'In Progress',
                'In Progress',
                'In Progress',
                '#06A59A'
            },
            new List<String>{ 'Review', 'Review', 'Review', '#9050E9' },
            new List<String>{ 'Done', 'Done', 'Done', '#2E844A' }
        };
    }
}
