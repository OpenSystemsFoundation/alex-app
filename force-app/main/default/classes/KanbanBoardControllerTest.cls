@isTest
private class KanbanBoardControllerTest {
    @testSetup
    static void setup() {
        // Create test board
        OpenSF__Board__c board = TestFactory.createBoard(
            'Test Board',
            'Published',
            'Project'
        );

        // Create columns with explicit status values
        OpenSF__Column__c todoColumn = TestFactory.createColumn(
            board.Id,
            'To Do',
            '0|h00000:',
            '#1B96FF',
            'To Do' // Explicit status
        );
        OpenSF__Column__c inProgressColumn = TestFactory.createColumn(
            board.Id,
            'In Progress',
            '0|hzzzzz:',
            '#1B96FF',
            'In Progress' // Explicit status
        );

        // Create cards
        TestFactory.createCard(
            todoColumn.Id,
            'Test Card 1',
            'Story',
            'To Do',
            '0|h00000:'
        );
        TestFactory.createCard(
            todoColumn.Id,
            'Test Card 2',
            'Bug',
            'To Do',
            '0|h00001:'
        );
    }

    @isTest
    static void testGetBoardData() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];

        Test.startTest();
        KanbanBoardController.BoardData data = KanbanBoardController.getBoardData(
            board.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, data, 'Board data should not be null');
        System.assertNotEquals(null, data.board, 'Board should not be null');
        System.assertEquals(2, data.columns.size(), 'Should have 2 columns');
        System.assertEquals(2, data.cards.size(), 'Should have 2 cards');
    }

    @isTest
    static void testMoveCard() {
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Subject__c = 'Test Card 1'
            LIMIT 1
        ];
        OpenSF__Column__c targetColumn = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'In Progress'
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            card.Id,
            targetColumn.Id,
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        System.assert(result.success, 'Move should be successful');
        System.assertEquals(
            targetColumn.Id,
            result.columnId,
            'Card should be in target column'
        );
        System.assertNotEquals(
            null,
            result.newPosition,
            'New position should not be null'
        );
    }

    @isTest
    static void testMoveCardUpdatesStatus() {
        // Test that moving a card to a column with a status updates the card's status
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Subject__c = 'Test Card 1'
            LIMIT 1
        ];
        OpenSF__Column__c targetColumn = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'In Progress'
            LIMIT 1
        ];

        String initialStatus = card.OpenSF__Status__c;

        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            card.Id,
            targetColumn.Id,
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        // Verify the card was moved successfully
        System.assert(result.success, 'Move should be successful');

        // Query the card to verify its status was updated
        OpenSF__Card__c updatedCard = [
            SELECT Id, OpenSF__Status__c, OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            targetColumn.Id,
            updatedCard.OpenSF__Column__c,
            'Card should be in target column'
        );
        System.assertEquals(
            targetColumn.OpenSF__Status__c,
            updatedCard.OpenSF__Status__c,
            'Card status should match column status'
        );
        System.assertNotEquals(
            initialStatus,
            updatedCard.OpenSF__Status__c,
            'Card status should have changed'
        );
    }

    @isTest
    static void testMoveCardWithSameStatus() {
        // Test that moving a card to a column with the same status doesn't cause unnecessary status updates
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__Status__c, OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE OpenSF__Subject__c = 'Test Card 1'
            LIMIT 1
        ];
        OpenSF__Column__c sourceColumn = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__Column__c
            WHERE Id = :card.OpenSF__Column__c
            LIMIT 1
        ];

        // Create a new column with the same status as the card's current status
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Column__c targetColumn = new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = 'Same Status Column',
            OpenSF__LexoRankPosition__c = '0|m00000:',
            OpenSF__Color__c = '#1B96FF',
            OpenSF__Status__c = card.OpenSF__Status__c // Use the same status as the card
        );
        insert targetColumn;

        String initialStatus = card.OpenSF__Status__c;

        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            card.Id,
            targetColumn.Id,
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        // Verify the card was moved successfully
        System.assert(result.success, 'Move should be successful');

        // Query the card to verify its status remained the same
        OpenSF__Card__c updatedCard = [
            SELECT Id, OpenSF__Status__c, OpenSF__Column__c
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(
            targetColumn.Id,
            updatedCard.OpenSF__Column__c,
            'Card should be in target column'
        );
        System.assertEquals(
            initialStatus,
            updatedCard.OpenSF__Status__c,
            'Card status should remain the same'
        );
        System.assertEquals(
            targetColumn.OpenSF__Status__c,
            updatedCard.OpenSF__Status__c,
            'Card status should match column status'
        );
    }

    @isTest
    static void testCreateCard() {
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        Test.startTest();
        KanbanBoardDTO.CardDTO newCard = KanbanBoardController.createCard(
            column.Id,
            'New Test Card',
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, newCard, 'Card should be created');
        System.assertEquals(
            'New Test Card',
            newCard.subject,
            'Subject should match'
        );
        System.assertEquals(column.Id, newCard.columnId, 'Column should match');
    }

    @isTest
    static void testCreateCardInheritsColumnStatus() {
        // Test that creating a card in a column with a status sets the card's status
        OpenSF__Column__c column = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'To Do'
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.CardDTO newCard = KanbanBoardController.createCard(
            column.Id,
            'New Card with Status',
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        System.assertNotEquals(null, newCard, 'Card should be created');
        System.assertEquals(
            'New Card with Status',
            newCard.subject,
            'Subject should match'
        );
        System.assertEquals(column.Id, newCard.columnId, 'Column should match');
        System.assertEquals(
            column.OpenSF__Status__c,
            newCard.status,
            'Card status should inherit from column'
        );
    }

    @isTest
    static void testUpdateCard() {
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];

        Map<String, Object> updates = new Map<String, Object>();
        updates.put('subject', 'Updated Subject');
        updates.put('description', 'Updated Description');
        updates.put('priority', 'Low');

        Test.startTest();
        KanbanBoardDTO.CardDTO updatedCard = KanbanBoardController.updateCard(
            card.Id,
            updates,
            null
        );
        Test.stopTest();

        System.assertEquals(
            'Updated Subject',
            updatedCard.subject,
            'Subject should be updated'
        );
        System.assertEquals(
            'Updated Description',
            updatedCard.description,
            'Description should be updated'
        );
        System.assertEquals(
            'Low',
            updatedCard.priority,
            'Priority should be updated'
        );
    }

    @isTest
    static void testDeleteCard() {
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];

        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;

        Test.startTest();
        KanbanBoardController.deleteCard(card.Id);
        Test.stopTest();

        List<OpenSF__Card__c> cards = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE Id = :card.Id
        ];
        System.assertEquals(0, cards.size(), 'Card should be deleted');
    }

    @isTest
    static void testMoveColumn() {
        OpenSF__Column__c column = [
            SELECT Id, OpenSF__LexoRankPosition__c
            FROM OpenSF__Column__c
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardDTO.ColumnDTO movedColumn = KanbanBoardController.moveColumn(
            column.Id,
            null,
            '0|zzzzzz:'
        );
        Test.stopTest();

        System.assertNotEquals(
            column.OpenSF__LexoRankPosition__c,
            movedColumn.position,
            'Position should be updated'
        );
    }

    @isTest
    static void testSearchUsers() {
        Test.startTest();
        List<User> users = KanbanBoardController.searchUsers('test');
        Test.stopTest();

        System.assertNotEquals(null, users, 'Users list should not be null');
    }

    @isTest
    static void testGetModalSettings() {
        // Test that modal settings are retrieved from custom metadata
        Test.startTest();
        KanbanBoardController.ModalSettings settings = KanbanBoardController.getModalSettings();
        Test.stopTest();

        System.assertNotEquals(
            null,
            settings,
            'Modal settings should not be null'
        );
        System.assertNotEquals(
            null,
            settings.visibleFields,
            'Visible fields should not be null'
        );
        System.assert(
            settings.visibleFields.size() > 0,
            'Should have at least one visible field'
        );

        // Verify common fields are included (based on custom metadata configuration)
        Boolean hasSubject = false;
        Boolean hasDescription = false;
        for (String field : settings.visibleFields) {
            if (field == 'OpenSF__Subject__c')
                hasSubject = true;
            if (field == 'OpenSF__Description__c')
                hasDescription = true;
        }
        System.assert(
            hasSubject || hasDescription,
            'Should include Subject or Description field'
        );
    }

    @isTest
    static void testGetModalSettingsWithDefaults() {
        // Test that default fields are returned if metadata is not configured
        // This simulates the catch block behavior
        Test.startTest();
        KanbanBoardController.ModalSettings settings = KanbanBoardController.getModalSettings();
        Test.stopTest();

        System.assertNotEquals(
            null,
            settings,
            'Should return settings even if metadata is missing'
        );
        System.assertNotEquals(
            null,
            settings.visibleFields,
            'Should have default visible fields'
        );

        // Verify the settings are cacheable for performance
        KanbanBoardController.ModalSettings cachedSettings = KanbanBoardController.getModalSettings();
        System.assertNotEquals(
            null,
            cachedSettings,
            'Cached settings should be available'
        );
    }

    @isTest
    static void testMoveCardWithPositioning() {
        // Create additional cards for position testing
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        cards.add(
            new OpenSF__Card__c(
                OpenSF__Subject__c = 'Card A',
                OpenSF__Column__c = column.Id,
                OpenSF__LexoRankPosition__c = '0|h00000:',
                OpenSF__Status__c = 'To Do',
                OpenSF__CardType__c = 'Story'
            )
        );
        cards.add(
            new OpenSF__Card__c(
                OpenSF__Subject__c = 'Card B',
                OpenSF__Column__c = column.Id,
                OpenSF__LexoRankPosition__c = '0|h00002:',
                OpenSF__Status__c = 'To Do',
                OpenSF__CardType__c = 'Story'
            )
        );
        insert cards;

        OpenSF__Column__c targetColumn = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE Id != :column.Id
            LIMIT 1
        ];

        Test.startTest();
        KanbanBoardController.CardMoveResult result = KanbanBoardController.moveCard(
            cards[0].Id,
            targetColumn.Id,
            null,
            null,
            null,
            null
        );
        Test.stopTest();

        System.assert(result.success, 'Move should be successful');
        System.assertNotEquals(
            null,
            result.newPosition,
            'Position should be calculated'
        );
    }

    @isTest
    static void testGetBoardDataError() {
        // Test with non-existent board ID
        Id fakeBoardId = '001000000000000AAA';

        Test.startTest();
        try {
            KanbanBoardController.getBoardData(fakeBoardId);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }

    @isTest
    static void testMoveCardError() {
        Id fakeCardId = '001000000000000AAA';
        OpenSF__Column__c column = [SELECT Id FROM OpenSF__Column__c LIMIT 1];

        Test.startTest();
        try {
            KanbanBoardController.moveCard(
                fakeCardId,
                column.Id,
                null,
                null,
                null,
                null
            );
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }

    @isTest
    static void testCreateCardError() {
        Id fakeColumnId = '001000000000000AAA';

        Test.startTest();
        try {
            KanbanBoardController.createCard(
                fakeColumnId,
                'Test',
                null,
                null,
                null,
                null
            );
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }

    @isTest
    static void testUpdateCardError() {
        Id fakeCardId = '001000000000000AAA';

        Test.startTest();
        try {
            KanbanBoardController.updateCard(
                fakeCardId,
                new Map<String, Object>(),
                null
            );
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }

    @isTest
    static void testDeleteCardError() {
        Id fakeCardId = '001000000000000AAA';

        Test.startTest();
        try {
            KanbanBoardController.deleteCard(fakeCardId);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }

    @isTest
    static void testGetIncrementalUpdates() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c LIMIT 1];

        // Set a baseline timestamp
        DateTime baselineTime = DateTime.now().addMinutes(-5);

        // Update the card to simulate a recent change
        card.OpenSF__Subject__c = 'Updated Card for Incremental Test';
        update card;

        Test.startTest();
        KanbanBoardController.IncrementalUpdateData updates = KanbanBoardController.getIncrementalUpdates(
            board.Id,
            baselineTime
        );
        Test.stopTest();

        System.assertNotEquals(
            null,
            updates,
            'Incremental update data should not be null'
        );
        System.assertNotEquals(
            null,
            updates.syncTimestamp,
            'Sync timestamp should not be null'
        );
        System.assertEquals(true, updates.hasChanges, 'Should detect changes');
        System.assertNotEquals(
            null,
            updates.cards,
            'Cards list should not be null'
        );
        System.assertEquals(
            1,
            updates.cards.size(),
            'Should return the updated card'
        );

        // Verify the card DTO includes the Name field
        KanbanBoardDTO.CardDTO cardDTO = updates.cards[0];
        System.assertNotEquals(
            null,
            cardDTO.Name,
            'Card Name field should be populated'
        );
        System.assertEquals(
            'Updated Card for Incremental Test',
            cardDTO.subject,
            'Card subject should match'
        );
    }

    @isTest
    static void testGetIncrementalUpdatesNoChanges() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];

        // Use a timestamp in the future so no changes are detected
        DateTime futureTime = DateTime.now().addMinutes(5);

        Test.startTest();
        KanbanBoardController.IncrementalUpdateData updates = KanbanBoardController.getIncrementalUpdates(
            board.Id,
            futureTime
        );
        Test.stopTest();

        System.assertNotEquals(
            null,
            updates,
            'Incremental update data should not be null'
        );
        System.assertEquals(
            false,
            updates.hasChanges,
            'Should not detect changes'
        );
        System.assertEquals(
            null,
            updates.cards,
            'Cards list should be null when no changes'
        );
    }

    @isTest
    static void testMoveColumnError() {
        Id fakeColumnId = '001000000000000AAA';

        Test.startTest();
        try {
            KanbanBoardController.moveColumn(fakeColumnId, null, null);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assertNotEquals(null, e, 'Should throw an exception');
        }
        Test.stopTest();
    }
}
