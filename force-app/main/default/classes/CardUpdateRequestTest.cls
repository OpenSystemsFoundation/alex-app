/**
 * Tests for CardUpdateRequest — fromMap parsing, applyTo field mapping,
 * and getProvidedFields flag tracking.
 */
@isTest
private class CardUpdateRequestTest {
    @isTest
    static void testFromMapNullAndEmpty() {
        CardUpdateRequest fromNull = CardUpdateRequest.fromMap(null);
        System.assertEquals(
            0,
            fromNull.getProvidedFields().size(),
            'null map provides no fields'
        );

        CardUpdateRequest fromEmpty = CardUpdateRequest.fromMap(
            new Map<String, Object>()
        );
        System.assertEquals(
            0,
            fromEmpty.getProvidedFields().size(),
            'empty map provides no fields'
        );
        System.assertEquals(
            false,
            fromEmpty.hasSubject,
            'hasSubject stays false when key absent'
        );
    }

    @isTest
    static void testFromMapAllFields() {
        Id fakeUserId = UserInfo.getUserId();
        Map<String, Object> updates = new Map<String, Object>{
            'subject' => 'New subject',
            'description' => 'New description',
            'priority' => 'High',
            'color' => '#FF0000',
            'dueDate' => '2026-09-01',
            'storyPoints' => 5,
            'assigneeId' => (String) fakeUserId,
            'status' => 'In Progress',
            'cardType' => 'Story',
            'epicId' => null,
            'peerReviewerId' => (String) fakeUserId,
            'needsRefinement' => true,
            'columnId' => null,
            'lexoRankPosition' => '0|hzzzzz:'
        };

        CardUpdateRequest req = CardUpdateRequest.fromMap(updates);

        System.assertEquals('New subject', req.subject, 'subject parsed');
        System.assertEquals(
            'New description',
            req.description,
            'description parsed'
        );
        System.assertEquals('High', req.priority, 'priority parsed');
        System.assertEquals('#FF0000', req.color, 'color parsed');
        System.assertEquals('2026-09-01', req.dueDate, 'dueDate parsed');
        System.assertEquals(5, req.storyPoints, 'storyPoints parsed');
        System.assertEquals(fakeUserId, req.assigneeId, 'assigneeId parsed');
        System.assertEquals('In Progress', req.status, 'status parsed');
        System.assertEquals('Story', req.cardType, 'cardType parsed');
        System.assertEquals(null, req.epicId, 'null epicId stays null');
        System.assertEquals(
            fakeUserId,
            req.peerReviewerId,
            'peerReviewerId parsed'
        );
        System.assertEquals(
            true,
            req.needsRefinement,
            'needsRefinement parsed'
        );
        System.assertEquals(
            '0|hzzzzz:',
            req.lexoRankPosition,
            'lexoRankPosition parsed'
        );

        Set<String> provided = req.getProvidedFields();
        System.assertEquals(14, provided.size(), 'all 14 fields provided');
        System.assert(provided.contains('subject'), 'subject flagged');
        System.assert(
            provided.contains('epicId'),
            'epicId flagged even when null'
        );
    }

    @isTest
    static void testFromMapStoryPointsVariants() {
        CardUpdateRequest fromString = CardUpdateRequest.fromMap(
            new Map<String, Object>{ 'storyPoints' => '8' }
        );
        System.assertEquals(
            8,
            fromString.storyPoints,
            'string storyPoints coerced to Decimal'
        );

        CardUpdateRequest fromBlank = CardUpdateRequest.fromMap(
            new Map<String, Object>{ 'storyPoints' => '' }
        );
        System.assertEquals(
            null,
            fromBlank.storyPoints,
            'blank storyPoints becomes null'
        );
        System.assertEquals(
            true,
            fromBlank.hasStoryPoints,
            'blank storyPoints still marks field provided'
        );

        CardUpdateRequest fromNull = CardUpdateRequest.fromMap(
            new Map<String, Object>{ 'storyPoints' => null }
        );
        System.assertEquals(
            null,
            fromNull.storyPoints,
            'null storyPoints stays null'
        );
    }

    @isTest
    static void testFromMapBlankIdStringsBecomeNull() {
        Map<String, Object> updates = new Map<String, Object>{
            'assigneeId' => '',
            'epicId' => '',
            'peerReviewerId' => ''
        };
        CardUpdateRequest req = CardUpdateRequest.fromMap(updates);
        System.assertEquals(null, req.assigneeId, 'blank assigneeId → null');
        System.assertEquals(null, req.epicId, 'blank epicId → null');
        System.assertEquals(
            null,
            req.peerReviewerId,
            'blank peerReviewerId → null'
        );
        System.assertEquals(
            true,
            req.hasAssigneeId && req.hasEpicId && req.hasPeerReviewerId,
            'blank ids still mark fields provided (clear-field semantics)'
        );
    }

    @isTest
    static void testApplyToSetsOnlyProvidedFields() {
        Id fakeUserId = UserInfo.getUserId();
        CardUpdateRequest req = CardUpdateRequest.fromMap(
            new Map<String, Object>{
                'subject' => 'Applied subject',
                'description' => 'Applied description',
                'priority' => 'Low',
                'color' => '#00FF00',
                'dueDate' => '2026-12-31',
                'storyPoints' => 3,
                'assigneeId' => (String) fakeUserId,
                'status' => 'Done',
                'cardType' => 'Bug',
                'needsRefinement' => false,
                'lexoRankPosition' => '0|aaaaaa:'
            }
        );

        OpenSF__Card__c card = new OpenSF__Card__c();
        req.applyTo(card);

        System.assertEquals(
            'Applied subject',
            card.OpenSF__Subject__c,
            'subject applied'
        );
        System.assertEquals(
            'Applied description',
            card.OpenSF__Description__c,
            'description applied'
        );
        System.assertEquals(
            'Low',
            card.OpenSF__Priority__c,
            'priority applied'
        );
        System.assertEquals('#00FF00', card.OpenSF__Color__c, 'color applied');
        System.assertEquals(
            Date.newInstance(2026, 12, 31),
            card.OpenSF__DueDate__c,
            'dueDate applied as Date'
        );
        System.assertEquals(
            3,
            card.OpenSF__StoryPoints__c,
            'storyPoints applied'
        );
        System.assertEquals(
            fakeUserId,
            card.OpenSF__Assignee__c,
            'assignee applied'
        );
        System.assertEquals('Done', card.OpenSF__Status__c, 'status applied');
        System.assertEquals(
            'Bug',
            card.OpenSF__CardType__c,
            'cardType applied'
        );
        System.assertEquals(
            false,
            card.OpenSF__NeedsRefinement__c,
            'needsRefinement applied'
        );
        System.assertEquals(
            '0|aaaaaa:',
            card.OpenSF__LexoRankPosition__c,
            'lexoRankPosition applied'
        );
        System.assertEquals(
            null,
            card.OpenSF__Epic__c,
            'unprovided epic not touched'
        );
    }

    @isTest
    static void testApplyToClearsDueDateWhenBlank() {
        CardUpdateRequest req = CardUpdateRequest.fromMap(
            new Map<String, Object>{ 'dueDate' => '' }
        );
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__DueDate__c = Date.today()
        );
        req.applyTo(card);
        System.assertEquals(
            null,
            card.OpenSF__DueDate__c,
            'blank dueDate clears the field'
        );
    }

    @isTest
    static void testApplyToUntouchedWhenNothingProvided() {
        CardUpdateRequest req = CardUpdateRequest.fromMap(
            new Map<String, Object>()
        );
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Original',
            OpenSF__Status__c = 'To Do'
        );
        req.applyTo(card);
        System.assertEquals(
            'Original',
            card.OpenSF__Subject__c,
            'subject untouched'
        );
        System.assertEquals(
            'To Do',
            card.OpenSF__Status__c,
            'status untouched'
        );
    }
}
