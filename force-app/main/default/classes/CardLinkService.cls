/**
 * CardLinkService - Service layer for card-to-card linking operations.
 * Handles creating, querying, and deleting card relationships.
 */
public with sharing class CardLinkService {
    /**
     * Get all links for a card (both as source and target).
     * Returns links normalized to the viewing card's perspective.
     */
    @AuraEnabled
    public static List<KanbanBoardDTO.CardLinkDTO> getCardLinks(Id cardId) {
        List<OpenSF__CardLink__c> links = [
            SELECT
                Id,
                OpenSF__SourceCard__c,
                OpenSF__SourceCard__r.Name,
                OpenSF__SourceCard__r.OpenSF__Subject__c,
                OpenSF__SourceCard__r.OpenSF__Status__c,
                OpenSF__SourceCard__r.OpenSF__CardType__c,
                OpenSF__TargetCard__c,
                OpenSF__TargetCard__r.Name,
                OpenSF__TargetCard__r.OpenSF__Subject__c,
                OpenSF__TargetCard__r.OpenSF__Status__c,
                OpenSF__TargetCard__r.OpenSF__CardType__c,
                OpenSF__LinkType__c
            FROM OpenSF__CardLink__c
            WHERE
                OpenSF__SourceCard__c = :cardId
                OR OpenSF__TargetCard__c = :cardId
            ORDER BY CreatedDate DESC
        ];
        return KanbanBoardDTO.convertCardLinks(links, cardId);
    }

    /**
     * Create a link between two cards.
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardLinkDTO createCardLink(
        Id sourceCardId,
        Id targetCardId,
        String linkType
    ) {
        if (sourceCardId == targetCardId) {
            throw new AuraHandledException('Cannot link a card to itself.');
        }

        // Check for existing link between these two cards (in either direction)
        List<OpenSF__CardLink__c> existing = [
            SELECT Id
            FROM OpenSF__CardLink__c
            WHERE
                (OpenSF__SourceCard__c = :sourceCardId
                AND OpenSF__TargetCard__c = :targetCardId)
                OR (OpenSF__SourceCard__c = :targetCardId
                AND OpenSF__TargetCard__c = :sourceCardId)
            LIMIT 1
        ];
        if (!existing.isEmpty()) {
            throw new AuraHandledException(
                'A link already exists between these cards.'
            );
        }

        OpenSF__CardLink__c link = new OpenSF__CardLink__c(
            OpenSF__SourceCard__c = sourceCardId,
            OpenSF__TargetCard__c = targetCardId,
            OpenSF__LinkType__c = linkType
        );

        List<OpenSF__CardLink__c> toInsert = (List<OpenSF__CardLink__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__CardLink__c>{ link }
            )
            .getRecords();
        insert toInsert;

        // Re-query to get related fields
        link = [
            SELECT
                Id,
                OpenSF__SourceCard__c,
                OpenSF__SourceCard__r.Name,
                OpenSF__SourceCard__r.OpenSF__Subject__c,
                OpenSF__SourceCard__r.OpenSF__Status__c,
                OpenSF__SourceCard__r.OpenSF__CardType__c,
                OpenSF__TargetCard__c,
                OpenSF__TargetCard__r.Name,
                OpenSF__TargetCard__r.OpenSF__Subject__c,
                OpenSF__TargetCard__r.OpenSF__Status__c,
                OpenSF__TargetCard__r.OpenSF__CardType__c,
                OpenSF__LinkType__c
            FROM OpenSF__CardLink__c
            WHERE Id = :toInsert[0].Id
        ];

        return new KanbanBoardDTO.CardLinkDTO(link, sourceCardId);
    }

    /**
     * Delete a card link.
     */
    @AuraEnabled
    public static void deleteCardLink(Id cardLinkId) {
        OpenSF__CardLink__c link = new OpenSF__CardLink__c(Id = cardLinkId);
        delete link;
    }

    /**
     * Search cards on the same board for linking.
     * Excludes the current card and cards already linked.
     */
    @AuraEnabled
    public static List<CardSearchResult> searchCardsForLinking(
        Id cardId,
        String searchTerm
    ) {
        // Get the board for the current card
        OpenSF__Card__c currentCard = [
            SELECT OpenSF__Board__c
            FROM OpenSF__Card__c
            WHERE Id = :cardId
            LIMIT 1
        ];

        // Get already-linked card IDs
        Set<Id> linkedCardIds = new Set<Id>{ cardId };
        for (OpenSF__CardLink__c link : [
            SELECT OpenSF__SourceCard__c, OpenSF__TargetCard__c
            FROM OpenSF__CardLink__c
            WHERE
                OpenSF__SourceCard__c = :cardId
                OR OpenSF__TargetCard__c = :cardId
        ]) {
            linkedCardIds.add(link.OpenSF__SourceCard__c);
            linkedCardIds.add(link.OpenSF__TargetCard__c);
        }

        String likeSearch = '%' + String.escapeSingleQuotes(searchTerm) + '%';

        List<OpenSF__Card__c> cards = [
            SELECT
                Id,
                Name,
                OpenSF__Subject__c,
                OpenSF__Status__c,
                OpenSF__CardType__c
            FROM OpenSF__Card__c
            WHERE
                OpenSF__Board__c = :currentCard.OpenSF__Board__c
                AND Id NOT IN :linkedCardIds
                AND (OpenSF__Subject__c LIKE :likeSearch
                OR Name LIKE :likeSearch)
            ORDER BY OpenSF__Subject__c
            LIMIT 10
        ];

        List<CardSearchResult> results = new List<CardSearchResult>();
        for (OpenSF__Card__c card : cards) {
            CardSearchResult r = new CardSearchResult();
            r.Id = card.Id;
            r.Name = card.Name;
            r.subject = card.OpenSF__Subject__c;
            r.status = card.OpenSF__Status__c;
            r.cardType = card.OpenSF__CardType__c;
            results.add(r);
        }
        return results;
    }

    public class CardSearchResult {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public String subject;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String cardType;
    }
}
