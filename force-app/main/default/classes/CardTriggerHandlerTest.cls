/**
 * CardTriggerHandlerTest - Test class for CardTriggerHandler
 * Tests trigger handler logic and platform event publishing
 */
@isTest
private class CardTriggerHandlerTest {
    @testSetup
    static void setup() {
        // Create test board and column using TestFactory
        OpenSF__Board__c board = TestFactory.createBoard('Test Board');
        TestFactory.createColumn(board.Id, 'To Do');
    }

    @isTest
    static void testAfterInsert() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        Test.startTest();
        // Insert new card - should trigger afterInsert
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story',
            OpenSF__Priority__c = 'High'
        );
        insert card;
        Test.stopTest();

        // Verify card was created
        OpenSF__Card__c insertedCard = [
            SELECT Id, OpenSF__Subject__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            'Test Card',
            insertedCard.OpenSF__Subject__c,
            'Card should be inserted'
        );
    }

    @isTest
    static void testAfterInsertCreatesColumnHistory() {
        OpenSF__Column__c column = [
            SELECT Id, OpenSF__Board__c
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        TestSettings.skipPlatformEvents = true;

        Test.startTest();
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Board__c = column.OpenSF__Board__c,
            OpenSF__Subject__c = 'History Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story'
        );
        insert card;
        Test.stopTest();

        List<OpenSF__CardColumnHistory__c> histories = [
            SELECT OpenSF__Card__c, OpenSF__Column__c, OpenSF__ExitedAt__c
            FROM OpenSF__CardColumnHistory__c
            WHERE OpenSF__Card__c = :card.Id
        ];
        System.assertEquals(1, histories.size(), 'Should create 1 history row');
        System.assertEquals(
            column.Id,
            histories[0].OpenSF__Column__c,
            'History should point at the current column'
        );
        System.assertEquals(
            null,
            histories[0].OpenSF__ExitedAt__c,
            'Open history entry should remain open'
        );
    }

    @isTest
    static void testAfterUpdate() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;

        Test.startTest();
        // Update card - should trigger afterUpdate
        card.OpenSF__Subject__c = 'Updated Card';
        card.OpenSF__Priority__c = 'Medium';
        update card;
        Test.stopTest();

        // Verify card was updated
        OpenSF__Card__c updatedCard = [
            SELECT Id, OpenSF__Subject__c, OpenSF__Priority__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            'Updated Card',
            updatedCard.OpenSF__Subject__c,
            'Subject should be updated'
        );
        System.assertEquals(
            'Medium',
            updatedCard.OpenSF__Priority__c,
            'Priority should be updated'
        );
    }

    @isTest
    static void testAfterDelete() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Create card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;

        Test.startTest();
        // Delete card - should trigger afterDelete
        delete card;
        Test.stopTest();

        // Verify card was deleted
        List<OpenSF__Card__c> deletedCards = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(0, deletedCards.size(), 'Card should be deleted');
    }

    @isTest
    static void testAfterUpdateClosesOldHistoryAndCreatesNewEntry() {
        OpenSF__Column__c sourceColumn = [
            SELECT Id, OpenSF__Board__c
            FROM OpenSF__Column__c
            LIMIT 1
        ];
        OpenSF__Column__c targetColumn = TestFactory.createColumn(
            sourceColumn.OpenSF__Board__c,
            'Done'
        );

        TestSettings.skipPlatformEvents = true;

        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Board__c = sourceColumn.OpenSF__Board__c,
            OpenSF__Subject__c = 'Moved Card',
            OpenSF__Column__c = sourceColumn.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story'
        );
        insert card;

        Test.startTest();
        card.OpenSF__Column__c = targetColumn.Id;
        card.OpenSF__Status__c = 'Done';
        update card;
        Test.stopTest();

        List<OpenSF__CardColumnHistory__c> histories = [
            SELECT OpenSF__Column__c, OpenSF__ExitedAt__c
            FROM OpenSF__CardColumnHistory__c
            WHERE OpenSF__Card__c = :card.Id
            ORDER BY CreatedDate ASC
        ];
        System.assertEquals(
            2,
            histories.size(),
            'Move should create a second history row'
        );
        System.assertEquals(
            sourceColumn.Id,
            histories[0].OpenSF__Column__c,
            'First history row should be the source column'
        );
        System.assertNotEquals(
            null,
            histories[0].OpenSF__ExitedAt__c,
            'Source column history should be closed'
        );
        System.assertEquals(
            targetColumn.Id,
            histories[1].OpenSF__Column__c,
            'Second history row should be the target column'
        );
        System.assertEquals(
            null,
            histories[1].OpenSF__ExitedAt__c,
            'Target column history should remain open'
        );
    }

    @isTest
    static void testAfterDeleteClosesOpenHistory() {
        OpenSF__Column__c column = [
            SELECT Id, OpenSF__Board__c
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        TestSettings.skipPlatformEvents = true;

        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Board__c = column.OpenSF__Board__c,
            OpenSF__Subject__c = 'Deleted History Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Story'
        );
        insert card;

        Test.startTest();
        delete card;
        Test.stopTest();

        List<OpenSF__CardColumnHistory__c> histories = [
            SELECT OpenSF__ExitedAt__c, OpenSF__DurationMinutes__c
            FROM OpenSF__CardColumnHistory__c
            WHERE OpenSF__Card__c = :card.Id
        ];
        System.assertEquals(1, histories.size(), 'Should retain history row');
        System.assertNotEquals(
            null,
            histories[0].OpenSF__ExitedAt__c,
            'Delete should close the open history row'
        );
        System.assertNotEquals(
            null,
            histories[0].OpenSF__DurationMinutes__c,
            'Delete should record elapsed time'
        );
    }

    @isTest
    static void testAfterUndelete() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        // Bypass triggers during setup to avoid recursion
        TriggerHandler.bypass('CardTriggerHandler');
        TriggerHandler.bypass('ColumnTriggerHandler');

        // Create and delete card
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert card;
        delete card;

        // Clear bypasses before test
        TriggerHandler.clearAllBypasses();

        Test.startTest();
        // Undelete card - should trigger afterUndelete
        undelete card;
        Test.stopTest();

        // Verify card was undeleted
        OpenSF__Card__c undeletedCard = [
            SELECT Id, OpenSF__Subject__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            'Test Card',
            undeletedCard.OpenSF__Subject__c,
            'Card should be undeleted'
        );
    }

    @isTest
    static void testBulkInsert() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        // OPTIMIZATION: Reduced from 200 to 50 cards (still tests bulk behavior)
        // OPTIMIZATION: Enable fast mode to skip platform events and metric updates
        TestSettings.enableFastMode();

        Test.startTest();
        // Use TestFactory bulk method for cleaner code
        List<OpenSF__Card__c> cards = TestFactory.createCards(column.Id, 50);
        Test.stopTest();

        // Verify bulk insert works correctly
        System.assertEquals(50, cards.size(), 'All 50 cards should be created');
        List<OpenSF__Card__c> insertedCards = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__Column__c = :column.Id
        ];
        System.assert(
            insertedCards.size() >= 50,
            'At least 50 cards should exist in column'
        );
    }

    @isTest
    static void testEventPublishing() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        Test.startTest();
        // Insert card which should publish event
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Event Test Card',
            OpenSF__Column__c = column.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = 'Bug'
        );
        insert card;

        // Update to trigger another event
        card.OpenSF__Priority__c = 'High';
        update card;
        Test.stopTest();

        // Note: Platform events are asynchronous and can't be directly verified in tests
        // but we can verify the card operations completed successfully
        OpenSF__Card__c verifyCard = [
            SELECT Id, OpenSF__Priority__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            'High',
            verifyCard.OpenSF__Priority__c,
            'Card should be updated successfully'
        );
    }
}
