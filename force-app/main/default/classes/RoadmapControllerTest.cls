@isTest
private class RoadmapControllerTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Roadmap Test Board');
        List<OpenSF__Column__c> columns = TestFactory.createColumns(
            board.Id,
            3
        );
        // Create epic cards
        TestFactory.createCard(
            columns[0].Id,
            'Epic Alpha',
            'Epic',
            'To Do',
            LexoRank.initial()
        );
        TestFactory.createCard(
            columns[0].Id,
            'Epic Beta',
            'Epic',
            'In Progress',
            LexoRank.between(LexoRank.initial(), null)
        );
        TestFactory.createCard(
            columns[1].Id,
            'Epic Gamma',
            'Epic',
            'To Do',
            LexoRank.initial()
        );
        // Create a non-epic card
        TestFactory.createCard(columns[0].Id, 'Regular Story');
    }

    static OpenSF__Board__c getBoard() {
        return [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Roadmap Test Board'
            LIMIT 1
        ];
    }

    static List<OpenSF__Card__c> getEpics() {
        return [
            SELECT Id, OpenSF__Subject__c
            FROM OpenSF__Card__c
            WHERE OpenSF__CardType__c = 'Epic'
            ORDER BY OpenSF__Subject__c ASC
        ];
    }

    @isTest
    static void testGetRoadmapItemsEmpty() {
        OpenSF__Board__c board = getBoard();

        Test.startTest();
        List<RoadmapController.RoadmapItemDTO> items = RoadmapController.getRoadmapItems(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(0, items.size(), 'Should have no roadmap items');
    }

    @isTest
    static void testGetAvailableEpics() {
        OpenSF__Board__c board = getBoard();

        Test.startTest();
        List<RoadmapController.EpicSummaryDTO> epics = RoadmapController.getAvailableEpics(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(
            3,
            epics.size(),
            'Should find 3 epic cards (not the Story)'
        );
    }

    @isTest
    static void testCreateRoadmapItem() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        Test.startTest();
        RoadmapController.RoadmapItemDTO item = RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            Date.today(),
            Date.today().addDays(30),
            null,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, item.Id, 'Should have an Id');
        System.assertEquals('Now', item.horizon, 'Horizon should be Now');
        System.assertEquals(
            'On Track',
            item.status,
            'Default status should be On Track'
        );
        System.assertEquals(
            'Epic Alpha',
            item.epicSubject,
            'Should have epic subject'
        );
    }

    @isTest
    static void testCreateRoadmapItemQuarterly() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        Test.startTest();
        RoadmapController.RoadmapItemDTO item = RoadmapController.createRoadmapItem(
            board.Id,
            epics[1].Id,
            null,
            'Q2',
            2026,
            Date.today(),
            Date.today().addDays(90),
            null,
            null
        );
        Test.stopTest();

        System.assertEquals('Q2', item.quarter, 'Quarter should be Q2');
        System.assertEquals(2026, item.year, 'Year should be 2026');
    }

    @isTest
    static void testUpdateRoadmapItem() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        RoadmapController.RoadmapItemDTO created = RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            Date.today(),
            Date.today().addDays(30),
            null,
            null
        );

        Test.startTest();
        Map<String, Object> updates = new Map<String, Object>{
            'horizon' => 'Next',
            'status' => 'At Risk'
        };
        RoadmapController.RoadmapItemDTO updated = RoadmapController.updateRoadmapItem(
            created.Id,
            updates
        );
        Test.stopTest();

        System.assertEquals('Next', updated.horizon, 'Horizon should be Next');
        System.assertEquals(
            'At Risk',
            updated.status,
            'Status should be At Risk'
        );
    }

    @isTest
    static void testDeleteRoadmapItem() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        RoadmapController.RoadmapItemDTO created = RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        RoadmapController.deleteRoadmapItem(created.Id);
        Test.stopTest();

        List<OpenSF__RoadmapItem__c> remaining = [
            SELECT Id
            FROM OpenSF__RoadmapItem__c
            WHERE Id = :created.Id
        ];
        System.assertEquals(0, remaining.size(), 'Item should be deleted');
    }

    @isTest
    static void testMoveRoadmapItem() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        RoadmapController.RoadmapItemDTO created = RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        RoadmapController.RoadmapItemDTO moved = RoadmapController.moveRoadmapItem(
            created.Id,
            'Future',
            null,
            null,
            null
        );
        Test.stopTest();

        System.assertEquals(
            'Future',
            moved.horizon,
            'Horizon should be Future after move'
        );
    }

    @isTest
    static void testGetRoadmapItemsWithData() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        // Add 2 items
        RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            null,
            null,
            null,
            null
        );
        RoadmapController.createRoadmapItem(
            board.Id,
            epics[1].Id,
            'Next',
            null,
            null,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        List<RoadmapController.RoadmapItemDTO> items = RoadmapController.getRoadmapItems(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(2, items.size(), 'Should have 2 roadmap items');
    }

    @isTest
    static void testAvailableEpicsExcludesRoadmapItems() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        // Add one epic to roadmap
        RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        List<RoadmapController.EpicSummaryDTO> available = RoadmapController.getAvailableEpics(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(
            2,
            available.size(),
            'Should only show 2 available epics (one is on roadmap)'
        );
    }

    // =========================================================================
    // Dependency Tests
    // =========================================================================

    @isTest
    static void testCreateDependency() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        Test.startTest();
        RoadmapController.EpicDependencyDTO dep = RoadmapController.createDependency(
            board.Id,
            epics[0].Id,
            epics[1].Id,
            'Blocks'
        );
        Test.stopTest();

        System.assertNotEquals(null, dep.Id, 'Should have an Id');
        System.assertEquals(
            'Blocks',
            dep.dependencyType,
            'Type should be Blocks'
        );
        System.assertEquals(
            epics[0].Id,
            dep.sourceEpicId,
            'Source should match'
        );
        System.assertEquals(
            epics[1].Id,
            dep.targetEpicId,
            'Target should match'
        );
    }

    @isTest
    static void testGetDependencies() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        RoadmapController.createDependency(
            board.Id,
            epics[0].Id,
            epics[1].Id,
            'Blocks'
        );
        RoadmapController.createDependency(
            board.Id,
            epics[1].Id,
            epics[2].Id,
            'Related To'
        );

        Test.startTest();
        List<RoadmapController.EpicDependencyDTO> deps = RoadmapController.getDependencies(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(2, deps.size(), 'Should have 2 dependencies');
    }

    @isTest
    static void testDeleteDependency() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        RoadmapController.EpicDependencyDTO dep = RoadmapController.createDependency(
            board.Id,
            epics[0].Id,
            epics[1].Id,
            'Blocks'
        );

        Test.startTest();
        RoadmapController.deleteDependency(dep.Id);
        Test.stopTest();

        List<OpenSF__EpicDependency__c> remaining = [
            SELECT Id
            FROM OpenSF__EpicDependency__c
            WHERE Id = :dep.Id
        ];
        System.assertEquals(
            0,
            remaining.size(),
            'Dependency should be deleted'
        );
    }

    @isTest
    static void testGetTimelineData() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> epics = getEpics();

        // Create roadmap items with dates
        RoadmapController.createRoadmapItem(
            board.Id,
            epics[0].Id,
            'Now',
            null,
            null,
            Date.today(),
            Date.today().addDays(30),
            null,
            null
        );
        RoadmapController.createRoadmapItem(
            board.Id,
            epics[1].Id,
            'Next',
            null,
            null,
            Date.today().addDays(15),
            Date.today().addDays(60),
            null,
            null
        );

        // Create dependency
        RoadmapController.createDependency(
            board.Id,
            epics[0].Id,
            epics[1].Id,
            'Blocks'
        );

        Test.startTest();
        RoadmapController.TimelineData data = RoadmapController.getTimelineData(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(
            2,
            data.items.size(),
            'Should have 2 timeline items'
        );
        System.assertEquals(
            1,
            data.dependencies.size(),
            'Should have 1 dependency'
        );
    }
}
