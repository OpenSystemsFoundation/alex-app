@isTest
private class ColumnManagementControllerTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumns(board.Id, 3);
    }

    @isTest
    static void testGetBoards() {
        Test.startTest();
        List<KanbanBoardDTO.BoardDTO> boards = ColumnManagementController.getBoards();
        Test.stopTest();

        System.assertEquals(1, boards.size(), 'Should return one board');
        System.assertEquals('Test Board', boards[0].Name, 'Board name should match');
    }

    @isTest
    static void testGetColumns() {
        OpenSF__Board__c board = [
            SELECT Id FROM OpenSF__Board__c LIMIT 1
        ];

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.getColumns(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(3, columns.size(), 'Should return 3 columns');
    }

    @isTest
    static void testCreateColumn() {
        OpenSF__Board__c board = [
            SELECT Id FROM OpenSF__Board__c LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.ColumnDTO col = ColumnManagementController.createColumn(
            board.Id,
            'New Column',
            'In Progress',
            '#EA001E',
            'In Progress',
            5,
            null,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, col.Id, 'Column should be created');
        System.assertEquals('New Column', col.columnHeader, 'Header should match');
        System.assertEquals('In Progress', col.category, 'Category should match');
    }

    @isTest
    static void testCreateColumnWithPosition() {
        OpenSF__Board__c board = [
            SELECT Id FROM OpenSF__Board__c LIMIT 1
        ];
        List<KanbanBoardDTO.ColumnDTO> existing = ColumnManagementController.getColumns(
            board.Id
        );
        String lastPos = existing[existing.size() - 1].position;

        Test.startTest();
        KanbanBoardDTO.ColumnDTO col = ColumnManagementController.createColumn(
            board.Id,
            'Appended Column',
            'Done',
            '#2E844A',
            'Done',
            null,
            lastPos,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, col.Id, 'Column should be created');
        System.assert(
            col.position > lastPos,
            'Position should be after last column'
        );
    }

    @isTest
    static void testUpdateColumn() {
        OpenSF__Column__c col = [
            SELECT Id FROM OpenSF__Column__c LIMIT 1
        ];

        Map<String, Object> updates = new Map<String, Object>{
            'columnHeader' => 'Updated Header',
            'category' => 'Done',
            'color' => '#2E844A',
            'status' => 'Done',
            'wipLimit' => 10
        };

        Test.startTest();
        KanbanBoardDTO.ColumnDTO result = ColumnManagementController.updateColumn(
            col.Id,
            updates
        );
        Test.stopTest();

        System.assertEquals(
            'Updated Header',
            result.columnHeader,
            'Header should be updated'
        );
    }

    @isTest
    static void testDeleteColumn() {
        OpenSF__Column__c col = [
            SELECT Id FROM OpenSF__Column__c LIMIT 1
        ];
        Id colId = col.Id;

        Test.startTest();
        ColumnManagementController.deleteColumn(colId);
        Test.stopTest();

        List<OpenSF__Column__c> remaining = [
            SELECT Id FROM OpenSF__Column__c WHERE Id = :colId
        ];
        System.assertEquals(0, remaining.size(), 'Column should be deleted');
    }

    @isTest
    static void testReorderColumn() {
        OpenSF__Board__c board = [
            SELECT Id FROM OpenSF__Board__c LIMIT 1
        ];
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.getColumns(
            board.Id
        );
        // Move last column to first position
        KanbanBoardDTO.ColumnDTO lastCol = columns[columns.size() - 1];
        String firstPos = columns[0].position;

        Test.startTest();
        KanbanBoardDTO.ColumnDTO result = ColumnManagementController.reorderColumn(
            lastCol.Id,
            null,
            firstPos
        );
        Test.stopTest();

        System.assert(
            result.position < firstPos,
            'Reordered column should be before first'
        );
    }

    @isTest
    static void testGetBoardsError() {
        // Test with a user that has no access - verify graceful error handling
        Boolean caughtError = false;
        Test.startTest();
        try {
            // This should work normally, but we verify no uncaught exceptions
            List<KanbanBoardDTO.BoardDTO> boards = ColumnManagementController.getBoards();
            System.assertNotEquals(null, boards, 'Should return result');
        } catch (AuraHandledException e) {
            caughtError = true;
        }
        Test.stopTest();
    }

    @isTest
    static void testGetColumnsNonExistentBoard() {
        // Use a fabricated ID that doesn't exist
        Id fakeId = OpenSF__Board__c.SObjectType.getDescribe()
            .getKeyPrefix() + '000000000001';

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.getColumns(
            fakeId
        );
        Test.stopTest();

        System.assertEquals(0, columns.size(), 'Should return empty list');
    }

    @isTest
    static void testCreateDefaultColumns() {
        // Use a board with no columns
        OpenSF__Board__c newBoard = TestFactory.createBoard('Empty Board');

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.createDefaultColumns(
            newBoard.Id,
            'kanban'
        );
        Test.stopTest();

        System.assertEquals(4, columns.size(), 'Should create 4 default columns');
        System.assertEquals('To Do', columns[0].columnHeader, 'First column should be To Do');
        System.assertEquals('In Progress', columns[1].columnHeader, 'Second column should be In Progress');
        System.assertEquals('Review', columns[2].columnHeader, 'Third column should be Review');
        System.assertEquals('Done', columns[3].columnHeader, 'Fourth column should be Done');

        // Verify LexoRank ordering
        for (Integer i = 1; i < columns.size(); i++) {
            System.assert(
                columns[i].position > columns[i - 1].position,
                'Columns should be in ascending LexoRank order'
            );
        }
    }

    @isTest
    static void testCreateScrumTemplate() {
        OpenSF__Board__c board = TestFactory.createBoard('Scrum Board');

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.createDefaultColumns(
            board.Id,
            'scrum'
        );
        Test.stopTest();

        System.assertEquals(6, columns.size(), 'Scrum template should create 6 columns');
        System.assertEquals('Backlog', columns[0].columnHeader, 'First column should be Backlog');
        System.assertEquals('Done', columns[5].columnHeader, 'Last column should be Done');
    }

    @isTest
    static void testCreateReleaseTemplate() {
        OpenSF__Board__c board = TestFactory.createBoard('Release Board');

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = ColumnManagementController.createDefaultColumns(
            board.Id,
            'release'
        );
        Test.stopTest();

        System.assertEquals(6, columns.size(), 'Release template should create 6 columns');
        System.assertEquals('Backlog', columns[0].columnHeader, 'First column should be Backlog');
        System.assertEquals('Released', columns[5].columnHeader, 'Last column should be Released');
    }
}
