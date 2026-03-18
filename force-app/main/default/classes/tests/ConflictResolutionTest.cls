/**
 * Test class for conflict resolution in real-time collaborative scenarios
 * Tests simultaneous edits, race conditions, and server conflict detection
 */
@isTest
private class ConflictResolutionTest {
    @testSetup
    static void setup() {
        // Create test board and columns
        OpenSF__Board__c board = new OpenSF__Board__c(
            Name = 'Test Board',
            OpenSF__Active__c = true
        );
        insert board;

        OpenSF__Column__c column1 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__LexoRankPosition__c = '0|100000:'
        );
        OpenSF__Column__c column2 = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'In Progress',
            OpenSF__Board__c = board.Id,
            OpenSF__LexoRankPosition__c = '0|200000:'
        );
        insert new List<OpenSF__Column__c>{ column1, column2 };
    }

    @isTest
    static void testMoveCard_NoConflict() {
        OpenSF__Column__c column1 = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        List<OpenSF__Column__c> columns = [SELECT Id FROM OpenSF__Column__c];
        OpenSF__Column__c column2 = columns[1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column1.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        // Move card with correct sequence number (no conflict)
        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCardWithConflictDetection(
            card.Id,
            column2.Id,
            null,
            null,
            'req-123',
            1 // Expected sequence matches current
        );
        Test.stopTest();

        // Verify no conflict
        System.assertEquals(true, result.success, 'Move should succeed');
        System.assertEquals(
            false,
            result.conflict,
            'Should not detect conflict'
        );
        System.assertNotEquals(
            null,
            result.serverSequenceNumber,
            'Should return server sequence'
        );
        System.assertEquals(
            2,
            result.serverSequenceNumber,
            'Sequence should increment to 2'
        );
    }

    @isTest
    static void testMoveCard_WithConflict() {
        List<OpenSF__Column__c> columns = [SELECT Id FROM OpenSF__Column__c];
        OpenSF__Column__c column1 = columns[0];
        OpenSF__Column__c column2 = columns[1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column1.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 5 // Already at sequence 5
        );
        insert card;

        // Attempt to move with stale sequence number (conflict)
        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCardWithConflictDetection(
            card.Id,
            column2.Id,
            null,
            null,
            'req-456',
            3 // Client thinks it's at 3, but server is at 5
        );
        Test.stopTest();

        // Verify conflict detected
        System.assertEquals(
            true,
            result.success,
            'Move should still succeed (server wins)'
        );
        System.assertEquals(true, result.conflict, 'Should detect conflict');
        System.assertNotEquals(
            null,
            result.conflictReason,
            'Should have conflict reason'
        );
        System.assert(
            result.conflictReason.contains('modified by another user'),
            'Should explain conflict'
        );
        System.assertEquals(
            6,
            result.serverSequenceNumber,
            'Sequence should increment from 5 to 6'
        );
    }

    @isTest
    static void testUpdateCard_NoConflict() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Original Subject',
            OpenSF__Description__c = 'Original Description',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        // Update with correct sequence
        Map<String, Object> updates = new Map<String, Object>{
            'subject' => 'Updated Subject',
            'description' => 'Updated Description'
        };

        Test.startTest();
        KanbanBoardController.CardUpdateResult result = KanbanBoardController.updateCardWithConflictDetection(
            card.Id,
            updates,
            1 // Expected sequence matches
        );
        Test.stopTest();

        // Verify no conflict
        System.assertEquals(true, result.success, 'Update should succeed');
        System.assertEquals(
            false,
            result.conflict,
            'Should not detect conflict'
        );
        System.assertEquals(
            'Updated Subject',
            result.card.subject,
            'Subject should be updated'
        );
        System.assertEquals(
            2,
            result.serverSequenceNumber,
            'Sequence should increment'
        );
    }

    @isTest
    static void testUpdateCard_WithConflict() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Original Subject',
            OpenSF__Description__c = 'Original Description',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 5 // Card is at sequence 5
        );
        insert card;

        // Update with stale sequence
        Map<String, Object> updates = new Map<String, Object>{
            'subject' => 'My Update',
            'description' => 'My Changes'
        };

        Test.startTest();
        KanbanBoardController.CardUpdateResult result = KanbanBoardController.updateCardWithConflictDetection(
            card.Id,
            updates,
            2 // Client thinks it's at 2, but server is at 5 (conflict!)
        );
        Test.stopTest();

        // Verify conflict detected but update still applied (server wins)
        System.assertEquals(true, result.success, 'Update should succeed');
        System.assertEquals(true, result.conflict, 'Should detect conflict');
        System.assertNotEquals(
            null,
            result.conflictReason,
            'Should have conflict reason'
        );
        System.assertEquals(
            'My Update',
            result.card.subject,
            'Update should be applied (last write wins)'
        );
        System.assertEquals(
            6,
            result.serverSequenceNumber,
            'Sequence should increment from 5 to 6'
        );
    }

    @isTest
    static void testSimultaneousMoves_RaceCondition() {
        List<OpenSF__Column__c> columns = [SELECT Id FROM OpenSF__Column__c];
        OpenSF__Column__c column1 = columns[0];
        OpenSF__Column__c column2 = columns[1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column1.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        Test.startTest();

        // User A moves card (with sequence 1)
        KanbanBoardController.CardMoveResult resultA = KanbanBoardController.moveCardWithConflictDetection(
            card.Id,
            column2.Id,
            null,
            null,
            'userA-req',
            1
        );

        // User B tries to move card (still thinks it's at sequence 1, but it's now 2)
        // This simulates User B's request arriving after User A's
        KanbanBoardController.CardMoveResult resultB = KanbanBoardController.moveCardWithConflictDetection(
            card.Id,
            column1.Id, // Moving back
            null,
            null,
            'userB-req',
            1 // Stale sequence number
        );

        Test.stopTest();

        // Verify User A succeeded without conflict
        System.assertEquals(
            false,
            resultA.conflict,
            'User A should not have conflict'
        );
        System.assertEquals(
            2,
            resultA.serverSequenceNumber,
            'User A should get sequence 2'
        );

        // Verify User B detected conflict
        System.assertEquals(
            true,
            resultB.conflict,
            'User B should detect conflict'
        );
        System.assertEquals(
            3,
            resultB.serverSequenceNumber,
            'User B should get sequence 3'
        );

        // Verify final state: User B's move wins (last write wins)
        OpenSF__Card__c finalCard = [
            SELECT OpenSF__Column__c, OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            column1.Id,
            finalCard.OpenSF__Column__c,
            'Card should be in column1 (User B won)'
        );
        System.assertEquals(
            3,
            finalCard.OpenSF__SequenceNumber__c,
            'Final sequence should be 3'
        );
    }

    @isTest
    static void testLegacyMoveCard_BackwardCompatibility() {
        List<OpenSF__Column__c> columns = [SELECT Id FROM OpenSF__Column__c];
        OpenSF__Column__c column1 = columns[0];
        OpenSF__Column__c column2 = columns[1];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column1.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        // Use legacy moveCard (no sequence number)
        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            card.Id,
            column2.Id,
            null,
            null,
            'legacy-req'
        );
        Test.stopTest();

        // Verify works without conflict detection
        System.assertEquals(true, result.success, 'Legacy move should succeed');
        System.assertEquals(
            false,
            result.conflict,
            'Should not detect conflict (no expected sequence)'
        );
        System.assertNotEquals(
            null,
            result.serverSequenceNumber,
            'Should still return server sequence'
        );
    }

    @isTest
    static void testConflictResolution_ServerStateCapture() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // Create card with specific values
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Server State Subject',
            OpenSF__Description__c = 'Server State Description',
            OpenSF__Priority__c = 'High',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|100000:',
            OpenSF__SequenceNumber__c = 10
        );
        insert card;

        // Client tries to update with stale data
        Map<String, Object> updates = new Map<String, Object>{
            'subject' => 'Client Update',
            'priority' => 'Low'
        };

        Test.startTest();
        KanbanBoardController.CardUpdateResult result = KanbanBoardController.updateCardWithConflictDetection(
            card.Id,
            updates,
            5 // Very stale (server is at 10)
        );
        Test.stopTest();

        // Verify conflict detected with server state captured
        System.assertEquals(true, result.conflict, 'Should detect conflict');
        System.assertNotEquals(
            null,
            result.serverState,
            'Should capture server state'
        );

        // Check if conflicting fields are captured
        if (result.serverState != null && result.serverState.size() > 0) {
            System.assert(
                result.serverState.containsKey('subject') ||
                result.serverState.containsKey('priority'),
                'Should capture conflicting field states'
            );
        }
    }
}
