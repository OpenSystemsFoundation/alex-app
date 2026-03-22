/**
 * PerformanceBenchmarkTest - Apex governor limit benchmark suite
 *
 * Measures SOQL queries, DML statements, CPU time, and heap size
 * for all critical service operations. Results are output via
 * System.debug with a structured format that CI can parse.
 *
 * Run manually via GitHub Action: benchmark-apex.yml
 */
@isTest
public class PerformanceBenchmarkTest {
    // ─── Helpers ───────────────────────────────────────────────

    private static Map<String, Object> snapshot() {
        return new Map<String, Object>{
            'queries' => Limits.getQueries(),
            'dml' => Limits.getDmlStatements(),
            'cpu' => Limits.getCpuTime(),
            'heap' => Limits.getHeapSize(),
            'rows' => Limits.getQueryRows()
        };
    }

    private static void logBenchmark(
        String operation,
        Map<String, Object> before,
        Map<String, Object> after
    ) {
        Integer queries = (Integer) after.get('queries') -
            (Integer) before.get('queries');
        Integer dml = (Integer) after.get('dml') -
            (Integer) before.get('dml');
        Integer cpu = (Integer) after.get('cpu') -
            (Integer) before.get('cpu');
        Integer heap = (Integer) after.get('heap') -
            (Integer) before.get('heap');
        Integer rows = (Integer) after.get('rows') -
            (Integer) before.get('rows');

        // Structured line that CI parses
        System.debug(
            'BENCHMARK|' +
                operation +
                '|queries=' +
                queries +
                '|dml=' +
                dml +
                '|cpu=' +
                cpu +
                'ms|heap=' +
                heap +
                '|rows=' +
                rows
        );

        // Also log limits headroom
        System.debug(
            'HEADROOM|' +
                operation +
                '|queries=' +
                Limits.getQueries() +
                '/' +
                Limits.getLimitQueries() +
                '|dml=' +
                Limits.getDmlStatements() +
                '/' +
                Limits.getLimitDmlStatements() +
                '|cpu=' +
                Limits.getCpuTime() +
                '/' +
                Limits.getLimitCpuTime() +
                'ms|heap=' +
                Limits.getHeapSize() +
                '/' +
                Limits.getLimitHeapSize()
        );
    }

    // ─── Test Data Setup ───────────────────────────────────────

    @TestSetup
    static void setupBenchmarkData() {
        TestSettings.skipPlatformEvents();

        // Large board: 6 columns x 50 cards = 300 cards
        OpenSF__Board__c board = TestFactory.createBoard(
            'Benchmark Board',
            'Published',
            'Project'
        );
        List<OpenSF__Column__c> columns = TestFactory.createColumns(
            board.Id,
            6
        );
        for (OpenSF__Column__c col : columns) {
            TestFactory.createCards(col.Id, 50);
        }

        // Sprint with cards
        OpenSF__Sprint__c sprint = TestFactory.createSprint(
            board.Id,
            'Active'
        );
        List<OpenSF__Card__c> firstColCards = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :columns[0].Id
            LIMIT 20
        ];
        List<OpenSF__SprintCard__c> sprintCards = new List<OpenSF__SprintCard__c>();
        String prevPos = null;
        for (OpenSF__Card__c c : firstColCards) {
            String pos = LexoRank.between(prevPos, null);
            sprintCards.add(
                new OpenSF__SprintCard__c(
                    OpenSF__Sprint__c = sprint.Id,
                    OpenSF__Card__c = c.Id,
                    OpenSF__AddedDate__c = DateTime.now(),
                    OpenSF__Position__c = pos
                )
            );
            prevPos = pos;
        }
        insert sprintCards;
    }

    // ─── Board Load Benchmarks ─────────────────────────────────

    @isTest
    static void benchmark_getBoardData_300Cards() {
        OpenSF__Board__c board = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Benchmark Board'
            LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanBoardController.BoardData data = KanbanBoardService.getBoardData(
            board.Id
        );

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('getBoardData_300cards', before, after);

        System.assertNotEquals(null, data.board, 'Board should load');
        System.assertEquals(6, data.columns.size(), 'Should have 6 columns');
        System.assertEquals(300, data.cards.size(), 'Should have 300 cards');
    }

    @isTest
    static void benchmark_getIncrementalUpdates() {
        OpenSF__Board__c board = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Benchmark Board'
            LIMIT 1
        ];
        DateTime syncTime = DateTime.now().addMinutes(-5);

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanBoardService.getIncrementalUpdates(board.Id, syncTime);

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('getIncrementalUpdates_300cards', before, after);
    }

    // ─── Card Operations Benchmarks ────────────────────────────

    @isTest
    static void benchmark_moveCard() {
        List<OpenSF__Column__c> columns = [
            SELECT Id
            FROM OpenSF__Column__c
            ORDER BY OpenSF__LexoRankPosition__c ASC
        ];
        OpenSF__Card__c card = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :columns[0].Id
            LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.moveCard(
            card.Id,
            columns[1].Id,
            null,
            null,
            'bench-req-1',
            null,
            'bench-client'
        );

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('moveCard', before, after);
    }

    @isTest
    static void benchmark_createCard() {
        OpenSF__Column__c col = [
            SELECT Id
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.createCard(
            col.Id,
            'Benchmark Card',
            null,
            null,
            'bench-req-2',
            'bench-client'
        );

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('createCard', before, after);
    }

    @isTest
    static void benchmark_updateCard() {
        OpenSF__Card__c card = [
            SELECT Id
            FROM OpenSF__Card__c
            LIMIT 1
        ];

        Map<String, Object> updates = new Map<String, Object>{
            'subject' => 'Updated Subject',
            'priority' => 'Critical',
            'description' => 'Updated description for benchmark'
        };

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.updateCard(card.Id, updates, null, 'bench-client');

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('updateCard', before, after);
    }

    @isTest
    static void benchmark_deleteCard() {
        OpenSF__Card__c card = [
            SELECT Id
            FROM OpenSF__Card__c
            LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.deleteCard(card.Id);

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('deleteCard', before, after);
    }

    // ─── Backlog Benchmarks ────────────────────────────────────

    @isTest
    static void benchmark_createBacklogCard() {
        OpenSF__Board__c board = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Benchmark Board'
            LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.createBacklogCard(
            board.Id,
            'Backlog Benchmark Card',
            'Story',
            'High',
            5
        );

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('createBacklogCard', before, after);
    }

    // ─── Selector Benchmarks ───────────────────────────────────

    @isTest
    static void benchmark_selectorQueries() {
        OpenSF__Board__c board = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Benchmark Board'
            LIMIT 1
        ];
        OpenSF__Column__c col = [
            SELECT Id
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        Test.startTest();

        // getCardsByBoardId
        Map<String, Object> before = snapshot();
        KanbanBoardSelector.getCardsByBoardId(board.Id);
        Map<String, Object> after = snapshot();
        logBenchmark('selector_getCardsByBoardId', before, after);

        // getColumnsByBoardId
        before = snapshot();
        KanbanBoardSelector.getColumnsByBoardId(board.Id);
        after = snapshot();
        logBenchmark('selector_getColumnsByBoardId', before, after);

        // getBacklogCardsByBoardId
        before = snapshot();
        KanbanBoardSelector.getBacklogCardsByBoardId(board.Id);
        after = snapshot();
        logBenchmark('selector_getBacklogCardsByBoardId', before, after);

        // getCardsByColumnId
        before = snapshot();
        KanbanBoardSelector.getCardsByColumnId(col.Id);
        after = snapshot();
        logBenchmark('selector_getCardsByColumnId', before, after);

        Test.stopTest();
    }

    // ─── Sprint Benchmarks ─────────────────────────────────────

    @isTest
    static void benchmark_sprintOperations() {
        OpenSF__Board__c board = [
            SELECT Id
            FROM OpenSF__Board__c
            WHERE Name = 'Benchmark Board'
            LIMIT 1
        ];
        OpenSF__Sprint__c sprint = [
            SELECT Id
            FROM OpenSF__Sprint__c
            WHERE OpenSF__Board__c = :board.Id
            LIMIT 1
        ];

        Test.startTest();

        Map<String, Object> before = snapshot();
        SprintService.recalculateSprintPointsPublic(sprint.Id);
        Map<String, Object> after = snapshot();
        logBenchmark('recalculateSprintPoints', before, after);

        Test.stopTest();
    }

    // ─── Bulk Operations Benchmark ─────────────────────────────

    @isTest
    static void benchmark_backfillMissingPositions() {
        // Create cards without positions
        OpenSF__Column__c col = [
            SELECT Id
            FROM OpenSF__Column__c
            LIMIT 1
        ];
        TriggerHandler.bypass('CardTriggerHandler');
        TriggerHandler.bypass('ColumnTriggerHandler');
        List<OpenSF__Card__c> noPositionCards = new List<OpenSF__Card__c>();
        for (Integer i = 0; i < 100; i++) {
            noPositionCards.add(
                new OpenSF__Card__c(
                    OpenSF__Column__c = col.Id,
                    OpenSF__Subject__c = 'No Position ' + i,
                    OpenSF__CardType__c = 'Story',
                    OpenSF__Status__c = 'To Do'
                    // Intentionally no LexoRankPosition
                )
            );
        }
        insert noPositionCards;
        TriggerHandler.clearBypass('CardTriggerHandler');
        TriggerHandler.clearBypass('ColumnTriggerHandler');

        // Re-query to include the null position cards
        List<OpenSF__Card__c> allCards = [
            SELECT Id, OpenSF__LexoRankPosition__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :col.Id
            ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
        ];

        Test.startTest();
        Map<String, Object> before = snapshot();

        KanbanCardService.backfillMissingPositions(allCards);

        Map<String, Object> after = snapshot();
        Test.stopTest();

        logBenchmark('backfillMissingPositions_100cards', before, after);
    }

    // ─── Comment Operations Benchmark ──────────────────────────

    @isTest
    static void benchmark_commentOperations() {
        OpenSF__Card__c card = [
            SELECT Id
            FROM OpenSF__Card__c
            LIMIT 1
        ];

        Test.startTest();

        // Add comment
        Map<String, Object> before = snapshot();
        KanbanBoardDTO.CardCommentDTO dto = CardCommentService.addComment(
            card.Id,
            'Benchmark comment body'
        );
        Map<String, Object> after = snapshot();
        logBenchmark('addComment', before, after);

        // Get comments
        before = snapshot();
        CardCommentService.getComments(card.Id);
        after = snapshot();
        logBenchmark('getComments', before, after);

        Test.stopTest();
    }
}
