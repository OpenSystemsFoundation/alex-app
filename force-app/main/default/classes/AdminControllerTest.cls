@isTest
private class AdminControllerTest {
    @TestSetup
    static void setup() {
        TestSettings.enableTriggers();
    }

    @isTest
    static void testGetBoards() {
        TestFactory.createBoard('Board A');
        TestFactory.createBoard('Board B');

        Test.startTest();
        List<KanbanBoardDTO.BoardDTO> boards = AdminController.getBoards();
        Test.stopTest();

        System.assertEquals(2, boards.size(), 'Should return 2 boards');
    }

    @isTest
    static void testCreateBoard() {
        Test.startTest();
        KanbanBoardDTO.BoardDTO board = AdminController.createBoard(
            'New Board',
            'A test board',
            'Project'
        );
        Test.stopTest();

        System.assertNotEquals(null, board.Id, 'Board should have an Id');
        System.assertEquals('New Board', board.Name, 'Name should match');
    }

    @isTest
    static void testUpdateBoard() {
        OpenSF__Board__c board = TestFactory.createBoard('Original');

        Map<String, Object> updates = new Map<String, Object>{
            'name' => 'Updated Board',
            'description' => 'Updated description',
            'active' => false
        };

        Test.startTest();
        KanbanBoardDTO.BoardDTO result = AdminController.updateBoard(
            board.Id,
            updates
        );
        Test.stopTest();

        System.assertEquals(
            'Updated Board',
            result.Name,
            'Name should be updated'
        );
    }

    @isTest
    static void testDeleteBoard() {
        OpenSF__Board__c board = TestFactory.createBoard('ToDelete');

        Test.startTest();
        AdminController.deleteBoard(board.Id);
        Test.stopTest();

        List<OpenSF__Board__c> remaining = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Id = :board.Id
        ];
        System.assertEquals(0, remaining.size(), 'Board should be deleted');
    }

    @isTest
    static void testGetColumns() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumns(board.Id, 3);

        Test.startTest();
        List<KanbanBoardDTO.ColumnDTO> columns = AdminController.getColumns(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(3, columns.size(), 'Should return 3 columns');
    }

    @isTest
    static void testCreateColumn() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');

        Test.startTest();
        KanbanBoardDTO.ColumnDTO column = AdminController.createColumn(
            board.Id,
            'New Column',
            'To Do',
            '#FF0000',
            null,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, column.Id, 'Column should have an Id');
        System.assertEquals(
            'New Column',
            column.columnHeader,
            'Header should match'
        );
    }

    @isTest
    static void testUpdateColumn() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestFactory.createColumn(board.Id, 'Old');

        Map<String, Object> updates = new Map<String, Object>{
            'columnHeader' => 'Updated Header',
            'color' => '#00FF00'
        };

        Test.startTest();
        KanbanBoardDTO.ColumnDTO result = AdminController.updateColumn(
            column.Id,
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
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        OpenSF__Column__c column = TestFactory.createColumn(
            board.Id,
            'ToDelete'
        );

        Test.startTest();
        AdminController.deleteColumn(column.Id);
        Test.stopTest();

        List<OpenSF__Column__c> remaining = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE Id = :column.Id
        ];
        System.assertEquals(0, remaining.size(), 'Column should be deleted');
    }

    @isTest
    static void testReorderColumn() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        List<OpenSF__Column__c> columns = TestFactory.createColumns(
            board.Id,
            3
        );

        Test.startTest();
        KanbanBoardDTO.ColumnDTO result = AdminController.reorderColumn(
            columns[2].Id,
            columns[0].OpenSF__LexoRankPosition__c,
            columns[1].OpenSF__LexoRankPosition__c
        );
        Test.stopTest();

        System.assertNotEquals(
            null,
            result.position,
            'Position should be set'
        );
    }

    @isTest
    static void testGetOnboardingStatus() {
        Test.startTest();
        AdminController.OnboardingStatus status = AdminController.getOnboardingStatus();
        Test.stopTest();

        System.assertEquals(
            false,
            status.hasBoardsCreated,
            'No boards should exist initially'
        );
    }

    @isTest
    static void testGetOnboardingStatusWithData() {
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumns(board.Id, 3);

        Test.startTest();
        AdminController.OnboardingStatus status = AdminController.getOnboardingStatus();
        Test.stopTest();

        System.assertEquals(
            true,
            status.hasBoardsCreated,
            'Board should exist'
        );
        System.assertEquals(
            true,
            status.hasColumnsConfigured,
            'Columns should exist'
        );
    }

    @isTest
    static void testCreateBoardWithDefaultColumns() {
        Test.startTest();
        KanbanBoardDTO.BoardDTO board = AdminController.createBoardWithDefaultColumns(
            'Quick Board',
            'Quick setup',
            'Project'
        );
        Test.stopTest();

        System.assertNotEquals(null, board.Id, 'Board should have an Id');

        List<OpenSF__Column__c> columns = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__Board__c = :board.Id
        ];
        System.assertEquals(
            4,
            columns.size(),
            'Should create 4 default columns'
        );
    }
}
