@isTest
private class AdminControllerTest {
    @TestSetup
    static void setup() {
        TestSettings.reset();
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
        System.assertEquals('Project', board.type, 'Type should match');
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
        System.assertEquals(
            'Updated description',
            result.description,
            'Description should be updated'
        );
        System.assertEquals(false, result.active, 'Board should be inactive');
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

        System.assertEquals(true, status.hasBoardsCreated, 'Board should exist');
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

    @isTest
    static void testGetCardCustomFields() {
        Test.startTest();
        List<KanbanBoardDTO.CardCustomFieldDTO> fields = AdminController.getCardCustomFields();
        Test.stopTest();

        System.assertNotEquals(null, fields, 'Fields list should not be null');
    }

    @isTest
    static void testGetAvailableCardFields() {
        Test.startTest();
        List<AdminController.FieldOption> fields = AdminController.getAvailableCardFields();
        Test.stopTest();

        System.assert(fields.size() > 0, 'Should return available card fields');
        System.assertNotEquals(
            null,
            fields[0].apiName,
            'Field API name should be populated'
        );
        System.assertNotEquals(
            null,
            fields[0].label,
            'Field label should be populated'
        );
    }
}
