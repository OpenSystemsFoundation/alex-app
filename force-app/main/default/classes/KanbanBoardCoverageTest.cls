/**
 * @description Tests for KanbanBoardController endpoints and KanbanBoardService
 * helpers not covered elsewhere: sprint delete/reorder, analytics endpoints,
 * card files, platform-event health, modal settings, card custom-field values,
 * and error handling (exceptions surface as AuraHandledException).
 */
@isTest
private class KanbanBoardCoverageTest {
    @TestSetup
    static void setup() {
        Map<String, Object> hierarchy = TestFactory.createFullBoardHierarchy(
            'Coverage Board',
            2,
            2
        );
        OpenSF__Board__c board = (OpenSF__Board__c) hierarchy.get('board');

        OpenSF__Sprint__c first = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        OpenSF__Sprint__c second = TestFactory.createSprint(
            board.Id,
            'Planning'
        );
        // Minimal sObjects: never re-send the master-detail Board__c on update
        update new List<OpenSF__Sprint__c>{
            new OpenSF__Sprint__c(
                Id = first.Id,
                OpenSF__SprintNumber__c = 1,
                OpenSF__SortOrder__c = 1
            ),
            new OpenSF__Sprint__c(
                Id = second.Id,
                OpenSF__SprintNumber__c = 2,
                OpenSF__SortOrder__c = 2
            )
        };
    }

    private static OpenSF__Board__c board() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    private static OpenSF__Card__c anyCard() {
        return [SELECT Id, OpenSF__Column__c FROM OpenSF__Card__c LIMIT 1];
    }

    private static OpenSF__Sprint__c sprintNumber(Integer n) {
        return [
            SELECT Id
            FROM OpenSF__Sprint__c
            WHERE OpenSF__SprintNumber__c = :n
            LIMIT 1
        ];
    }

    /** Id of a card that no longer exists. */
    private static Id deletedCardId() {
        OpenSF__Card__c card = TestFactory.createCard(
            anyCard().OpenSF__Column__c,
            'Deleted card'
        );
        delete card;
        return card.Id;
    }

    @isTest
    static void reorderSprintMovesSprintUp() {
        Id boardId = board().Id;
        Id secondId = sprintNumber(2).Id;

        Test.startTest();
        List<KanbanBoardDTO.SprintDTO> ordered = KanbanBoardController.reorderSprint(
            secondId,
            'up'
        );
        Test.stopTest();

        Assert.isFalse(ordered.isEmpty(), 'Reorder returns the sprint list');
        Assert.areEqual(
            secondId,
            ordered[0].Id,
            'Sprint 2 is first after moving up'
        );
    }

    @isTest
    static void deleteSprintRemovesPlanningSprint() {
        Id sprintId = sprintNumber(1).Id;

        Test.startTest();
        KanbanBoardController.deleteSprint(sprintId);
        Test.stopTest();

        Assert.areEqual(
            0,
            [SELECT COUNT() FROM OpenSF__Sprint__c WHERE Id = :sprintId],
            'Planning sprint is deleted'
        );
    }

    @isTest
    static void deleteSprintRejectsActiveSprint() {
        Id sprintId = sprintNumber(1).Id;
        update new OpenSF__Sprint__c(
            Id = sprintId,
            OpenSF__Status__c = 'Active'
        );

        Boolean threw = false;
        Test.startTest();
        try {
            KanbanBoardController.deleteSprint(sprintId);
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();

        Assert.isTrue(threw, 'Only Planning sprints can be deleted');
        Assert.areEqual(
            1,
            [SELECT COUNT() FROM OpenSF__Sprint__c WHERE Id = :sprintId],
            'Active sprint is kept'
        );
    }

    @isTest
    static void analyticsEndpointsReturnData() {
        Id boardId = board().Id;

        Test.startTest();
        KanbanBoardDTO.CycleTimeResult cycle = KanbanBoardController.getCycleTimeAnalytics(
            boardId,
            30
        );
        List<KanbanBoardDTO.CumulativeFlowDataPoint> flow = KanbanBoardController.getCumulativeFlowData(
            boardId,
            30
        );
        Test.stopTest();

        Assert.isNotNull(cycle, 'Cycle time result is returned');
        Assert.isNotNull(flow, 'Cumulative flow data is returned');
    }

    @isTest
    static void cardFilesCanBeListedAndDeleted() {
        OpenSF__Card__c card = anyCard();
        insert new ContentVersion(
            Title = 'Spec',
            PathOnClient = 'spec.txt',
            VersionData = Blob.valueOf('hello'),
            FirstPublishLocationId = card.Id
        );

        Test.startTest();
        List<KanbanBoardController.CardFileDTO> files = KanbanBoardController.getCardFiles(
            card.Id
        );
        Assert.areEqual(1, files.size(), 'The attached file is listed');
        Assert.areEqual('Spec', files[0].title, 'File title is returned');
        Assert.areEqual('txt', files[0].fileExtension, 'Extension is returned');

        KanbanBoardController.deleteCardFile(
            files[0].contentDocumentId,
            card.Id
        );
        Test.stopTest();

        Assert.areEqual(
            0,
            [
                SELECT COUNT()
                FROM ContentDocument
                WHERE Id = :files[0].contentDocumentId
            ],
            'File is deleted'
        );
    }

    @isTest
    static void deleteCardFileValidatesInput() {
        OpenSF__Card__c card = anyCard();
        ContentVersion other = new ContentVersion(
            Title = 'Other',
            PathOnClient = 'other.txt',
            VersionData = Blob.valueOf('x')
        );
        insert other;
        Id otherDocId = [
            SELECT ContentDocumentId
            FROM ContentVersion
            WHERE Id = :other.Id
        ]
        .ContentDocumentId;

        Integer rejected = 0;
        Test.startTest();
        try {
            KanbanBoardController.deleteCardFile(null, card.Id);
        } catch (AuraHandledException e) {
            rejected++;
        }
        try {
            // File exists but is not attached to this card
            KanbanBoardController.deleteCardFile(otherDocId, card.Id);
        } catch (AuraHandledException e) {
            rejected++;
        }
        Test.stopTest();

        Assert.areEqual(
            2,
            rejected,
            'Missing ids and unlinked files are rejected'
        );
        Assert.areEqual(
            1,
            [SELECT COUNT() FROM ContentDocument WHERE Id = :otherDocId],
            'Unlinked file is not deleted'
        );
    }

    @isTest
    static void healthAndModalSettingsReturnDefaults() {
        Test.startTest();
        KanbanBoardController.PlatformEventHealth health = KanbanBoardController.checkPlatformEventHealth();
        KanbanBoardController.ModalSettings settings = KanbanBoardController.getModalSettings();
        Test.stopTest();

        Assert.isTrue(health.isHealthy, 'Health check reports healthy');
        Assert.areEqual(100, health.deliveryRate, 'Delivery rate is 100');
        Assert.isNotNull(health.timestamp, 'Health check is timestamped');
        Assert.isFalse(
            settings.visibleFields.isEmpty(),
            'Modal settings list visible fields'
        );
    }

    @isTest
    static void customFieldValuesAreMappedOntoCards() {
        Id boardId = board().Id;
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(
            boardId
        );
        update new OpenSF__Card__c(
            Id = cards[0].Id,
            OpenSF__StoryPoints__c = 8
        );
        cards = KanbanBoardSelector.getCardsByBoardId(boardId);
        List<KanbanBoardDTO.CardDTO> dtos = KanbanBoardDTO.convertCards(cards);

        List<OpenSF__CardCustomField__mdt> configs = new List<OpenSF__CardCustomField__mdt>{
            // unprefixed and prefixed names are both accepted
            new OpenSF__CardCustomField__mdt(
                OpenSF__FieldApiName__c = 'StoryPoints__c'
            ),
            new OpenSF__CardCustomField__mdt(
                OpenSF__FieldApiName__c = 'OpenSF__Priority__c'
            ),
            // unknown fields are ignored
            new OpenSF__CardCustomField__mdt(
                OpenSF__FieldApiName__c = 'NotAField__c'
            )
        };

        Test.startTest();
        KanbanBoardService.populateCustomFieldValues(dtos, cards, configs);
        Test.stopTest();

        KanbanBoardDTO.CardDTO pointed;
        for (KanbanBoardDTO.CardDTO dto : dtos) {
            Assert.isNotNull(dto.customFields, 'Every card gets custom fields');
            Assert.areEqual(
                new Set<String>{ 'StoryPoints__c', 'OpenSF__Priority__c' },
                dto.customFields.keySet(),
                'Only valid fields are mapped, keyed by configured name'
            );
            if (dto.Id == cards[0].Id) {
                pointed = dto;
            }
        }
        Assert.areEqual(
            8,
            pointed.customFields.get('StoryPoints__c'),
            'Field values come from the card record'
        );
    }

    @isTest
    static void customFieldValuesSkipWhenNoValidFields() {
        List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(
            board().Id
        );
        List<KanbanBoardDTO.CardDTO> dtos = KanbanBoardDTO.convertCards(cards);

        Test.startTest();
        KanbanBoardService.populateCustomFieldValues(
            dtos,
            cards,
            new List<OpenSF__CardCustomField__mdt>{
                new OpenSF__CardCustomField__mdt(
                    OpenSF__FieldApiName__c = 'NotAField__c'
                )
            }
        );
        Test.stopTest();

        Assert.isNull(dtos[0].customFields, 'No valid fields: nothing mapped');
    }

    @isTest
    static void missingRecordsSurfaceAsAuraHandledException() {
        Id missingCard = deletedCardId();
        OpenSF__Card__c card = anyCard();

        Integer handled = 0;
        Test.startTest();
        try {
            KanbanBoardController.moveCardWithConflictDetection(
                missingCard,
                card.OpenSF__Column__c,
                null,
                null,
                null,
                null,
                null
            );
        } catch (AuraHandledException e) {
            handled++;
        }
        try {
            KanbanBoardController.reorderBacklogCard(missingCard, null, null);
        } catch (AuraHandledException e) {
            handled++;
        }
        try {
            KanbanBoardController.addCardComment(missingCard, 'Hello');
        } catch (AuraHandledException e) {
            handled++;
        }
        try {
            KanbanBoardController.updateCardComment(missingCard, 'Hello');
        } catch (AuraHandledException e) {
            handled++;
        }
        try {
            KanbanBoardController.deleteCardComment(missingCard);
        } catch (AuraHandledException e) {
            handled++;
        }
        Test.stopTest();

        Assert.areEqual(
            5,
            handled,
            'Each endpoint wraps failures in AuraHandledException'
        );
    }
}
