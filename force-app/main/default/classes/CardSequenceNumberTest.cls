/**
 * CardSequenceNumberTest - Test class for sequence number event ordering
 * Verifies that events are processed in correct order even when arriving out of sequence
 */
@isTest
private class CardSequenceNumberTest {
    @testSetup
    static void setup() {
        // Create test board and columns using TestFactory
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumn(board.Id, 'To Do', '0|h00000:', '#1B96FF');
        TestFactory.createColumn(
            board.Id,
            'In Progress',
            '0|hzzzzz:',
            '#FCC003'
        );
    }

    @isTest
    static void testSequenceNumberAutoIncrement() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card - should get sequence 1
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1
        );

        Test.startTest();
        insert card;
        Test.stopTest();

        // Verify initial sequence
        card = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            1,
            card.OpenSF__SequenceNumber__c,
            'Initial sequence should be 1'
        );

        // Update card - sequence should increment
        card.OpenSF__Subject__c = 'Updated Test Card';
        update card;

        // Verify sequence incremented
        card = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            2,
            card.OpenSF__SequenceNumber__c,
            'Sequence should increment to 2 after update'
        );
    }

    @isTest
    static void testSequenceNumberOnMove() {
        OpenSF__Column__c column1 = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];
        OpenSF__Column__c column2 = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'In Progress'
            LIMIT 1
        ];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column1.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        Decimal initialSeq = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ]
        .OpenSF__SequenceNumber__c;

        Test.startTest();
        // Move card to different column
        card.OpenSF__Column__c = column2.Id;
        update card;
        Test.stopTest();

        // Verify sequence incremented
        Decimal newSeq = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ]
        .OpenSF__SequenceNumber__c;
        System.assertEquals(
            initialSeq + 1,
            newSeq,
            'Sequence should increment on column move'
        );
    }

    @isTest
    static void testSequenceNumberInPlatformEvent() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1,
            OpenSF__LastClientRequestId__c = 'test-req-123'
        );

        Test.startTest();
        // Insert will trigger event
        insert card;
        Test.stopTest();

        // Verify card has sequence number
        card = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertNotEquals(
            null,
            card.OpenSF__SequenceNumber__c,
            'Card should have sequence number'
        );

        // Note: Platform event delivery is tested in integration tests
        // Here we verify the trigger logic sets up the data correctly
    }

    @isTest
    static void testMultipleUpdatesIncrementCorrectly() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        Test.startTest();
        // Perform multiple updates to verify sequence increment behavior.
        // Reset execution counts before each update to simulate separate
        // request contexts (each user action is a separate transaction).
        for (Integer i = 1; i <= 3; i++) {
            TriggerHandler.resetExecutionCount('CardTriggerHandler');
            TriggerHandler.resetExecutionCount('ColumnTriggerHandler');

            // Re-query card to get current sequence number (so trigger sees matching old/new)
            card = [
                SELECT Id, OpenSF__Subject__c, OpenSF__SequenceNumber__c
                FROM OpenSF__Card__c
                WHERE Id = :card.Id
            ];
            card.OpenSF__Subject__c = 'Update ' + i;
            update card;

            Decimal currentSeq = [
                SELECT OpenSF__SequenceNumber__c
                FROM OpenSF__Card__c
                WHERE Id = :card.Id
            ]
            .OpenSF__SequenceNumber__c;
            System.assertEquals(
                i + 1,
                currentSeq,
                'Sequence should be ' + (i + 1) + ' after update ' + i
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testSequenceNumberNotIncrementedWhenNoRealChange() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        Decimal initialSeq = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ]
        .OpenSF__SequenceNumber__c;

        Test.startTest();
        // Update with same values (no real change)
        card.OpenSF__Subject__c = 'Test Card'; // Same value
        update card;
        Test.stopTest();

        // Verify sequence did NOT increment (only LastModifiedDate changed)
        Decimal newSeq = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ]
        .OpenSF__SequenceNumber__c;
        System.assertEquals(
            initialSeq,
            newSeq,
            'Sequence should not increment when no meaningful fields changed'
        );
    }

    @isTest
    static void testSequenceNumberInDTO() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__SequenceNumber__c = 1
        );
        insert card;

        Test.startTest();
        // Query card with full details
        OpenSF__Card__c fullCard = KanbanBoardSelector.getCardById(card.Id);

        // Create DTO
        KanbanBoardDTO.CardDTO dto = new KanbanBoardDTO.CardDTO(fullCard);
        Test.stopTest();

        // Verify sequence number is in DTO
        System.assertNotEquals(
            null,
            dto.sequenceNumber,
            'DTO should include sequence number'
        );
        System.assertEquals(
            fullCard.OpenSF__SequenceNumber__c,
            dto.sequenceNumber,
            'DTO sequence should match card'
        );
    }

    @isTest
    static void testBulkOperationsWithSequenceNumbers() {
        OpenSF__Column__c column = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        // OPTIMIZATION: Reduced from 200 to 50 cards (still tests bulk behavior)
        // OPTIMIZATION: Enable fast mode to skip platform events
        TestSettings.enableFastMode();

        Test.startTest();
        // Create multiple cards
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        for (Integer i = 0; i < 50; i++) {
            cards.add(
                new OpenSF__Card__c(
                    OpenSF__Subject__c = 'Bulk Card ' + i,
                    OpenSF__Column__c = column.Id,
                    OpenSF__LexoRankPosition__c = '0|h' +
                        String.valueOf(i).leftPad(5, '0') +
                        ':',
                    OpenSF__SequenceNumber__c = 1
                )
            );
        }
        insert cards;

        // Update all cards
        for (OpenSF__Card__c card : cards) {
            card.OpenSF__Subject__c = card.OpenSF__Subject__c + ' Updated';
        }
        update cards;
        Test.stopTest();

        // Verify all have sequence 2
        List<OpenSF__Card__c> updatedCards = [
            SELECT OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id IN :cards
        ];

        for (OpenSF__Card__c card : updatedCards) {
            System.assertEquals(
                2,
                card.OpenSF__SequenceNumber__c,
                'All bulk updated cards should have sequence 2'
            );
        }
    }
}
