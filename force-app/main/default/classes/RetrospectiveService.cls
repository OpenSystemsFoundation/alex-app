/**
 * RetrospectiveService - Business logic for retrospective boards
 * Handles CRUD operations, voting, author reveal, and action item creation
 */
public with sharing class RetrospectiveService {
    /**
     * Full retro data payload returned to the LWC
     */
    public class RetroData {
        @AuraEnabled
        public RetrospectiveDTO.RetroDTO retro;
        @AuraEnabled
        public List<RetrospectiveDTO.RetroCardDTO> cards;
        @AuraEnabled
        public List<String> categories;
        @AuraEnabled
        public Decimal currentUserVoteCount;
    }

    /**
     * Load all data for a retrospective
     */
    public static RetroData getRetroData(Id retroId) {
        OpenSF__Retrospective__c retro = [
            SELECT
                Id,
                Name,
                OpenSF__Sprint__c,
                OpenSF__Sprint__r.Name,
                OpenSF__Board__c,
                OpenSF__Board__r.Name,
                OpenSF__Status__c,
                OpenSF__Template__c,
                OpenSF__ShowAlways__c,
                OpenSF__Revealed__c,
                OpenSF__MaxVotesPerUser__c
            FROM OpenSF__Retrospective__c
            WHERE Id = :retroId
            WITH SECURITY_ENFORCED
        ];

        List<OpenSF__RetroCard__c> cards = [
            SELECT
                Id,
                Name,
                OpenSF__Retrospective__c,
                OpenSF__Category__c,
                OpenSF__Text__c,
                OpenSF__Author__c,
                OpenSF__Author__r.Name,
                OpenSF__Author__r.SmallPhotoUrl,
                OpenSF__VoteCount__c,
                OpenSF__Position__c,
                OpenSF__ActionItemCard__c,
                OpenSF__ActionItemCard__r.Name
            FROM OpenSF__RetroCard__c
            WHERE OpenSF__Retrospective__c = :retroId
            WITH SECURITY_ENFORCED
            ORDER BY OpenSF__VoteCount__c DESC, OpenSF__Position__c ASC
        ];

        // Get current user's votes for this retro
        Id currentUserId = UserInfo.getUserId();
        Set<Id> votedCardIds = new Set<Id>();
        for (OpenSF__RetroVote__c vote : [
            SELECT OpenSF__RetroCard__c
            FROM OpenSF__RetroVote__c
            WHERE
                OpenSF__RetroCard__r.OpenSF__Retrospective__c = :retroId
                AND OpenSF__Voter__c = :currentUserId
            WITH SECURITY_ENFORCED
        ]) {
            votedCardIds.add(vote.OpenSF__RetroCard__c);
        }

        List<RetrospectiveDTO.RetroCardDTO> cardDtos = new List<RetrospectiveDTO.RetroCardDTO>();
        for (OpenSF__RetroCard__c card : cards) {
            RetrospectiveDTO.RetroCardDTO dto = new RetrospectiveDTO.RetroCardDTO(
                card
            );
            dto.hasVoted = votedCardIds.contains(card.Id);
            cardDtos.add(dto);
        }

        RetroData data = new RetroData();
        data.retro = new RetrospectiveDTO.RetroDTO(retro);
        data.cards = cardDtos;
        data.categories = RetrospectiveDTO.getCategoriesForTemplate(
            retro.OpenSF__Template__c
        );
        data.currentUserVoteCount = votedCardIds.size();
        return data;
    }

    /**
     * Create a new retro card
     */
    public static RetrospectiveDTO.RetroCardDTO createRetroCard(
        Id retroId,
        String category,
        String text
    ) {
        // Get next position
        List<AggregateResult> maxPos = [
            SELECT MAX(OpenSF__Position__c) maxP
            FROM OpenSF__RetroCard__c
            WHERE
                OpenSF__Retrospective__c = :retroId
                AND OpenSF__Category__c = :category
        ];
        Decimal nextPosition = 0;
        if (
            !maxPos.isEmpty() &&
            maxPos[0].get('maxP') != null
        ) {
            nextPosition = (Decimal) maxPos[0].get('maxP') + 1;
        }

        OpenSF__RetroCard__c card = new OpenSF__RetroCard__c(
            OpenSF__Retrospective__c = retroId,
            OpenSF__Category__c = category,
            OpenSF__Text__c = text,
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Position__c = nextPosition
        );

        insert Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__RetroCard__c>{ card }
            )
            .getRecords();

        // Re-query to get all fields including author
        OpenSF__RetroCard__c created = [
            SELECT
                Id,
                Name,
                OpenSF__Retrospective__c,
                OpenSF__Category__c,
                OpenSF__Text__c,
                OpenSF__Author__c,
                OpenSF__Author__r.Name,
                OpenSF__Author__r.SmallPhotoUrl,
                OpenSF__VoteCount__c,
                OpenSF__Position__c,
                OpenSF__ActionItemCard__c
            FROM OpenSF__RetroCard__c
            WHERE Id = :card.Id
            WITH SECURITY_ENFORCED
        ];

        // Publish platform event
        publishRetroEvent(retroId, 'CARD_CREATED', card.Id);

        return new RetrospectiveDTO.RetroCardDTO(created);
    }

    /**
     * Toggle vote on a retro card (vote or unvote)
     */
    public static RetrospectiveDTO.RetroCardDTO toggleVote(Id cardId) {
        Id currentUserId = UserInfo.getUserId();

        // Check if user already voted
        List<OpenSF__RetroVote__c> existingVotes = [
            SELECT Id
            FROM OpenSF__RetroVote__c
            WHERE
                OpenSF__RetroCard__c = :cardId
                AND OpenSF__Voter__c = :currentUserId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];

        // Get the retro for this card to check max votes
        OpenSF__RetroCard__c cardForRetro = [
            SELECT
                OpenSF__Retrospective__c,
                OpenSF__Retrospective__r.OpenSF__MaxVotesPerUser__c
            FROM OpenSF__RetroCard__c
            WHERE Id = :cardId
            WITH SECURITY_ENFORCED
        ];

        if (!existingVotes.isEmpty()) {
            // Unvote
            delete existingVotes;
        } else {
            // Check vote limit
            Decimal maxVotes = cardForRetro.OpenSF__Retrospective__r.OpenSF__MaxVotesPerUser__c;
            if (maxVotes != null && maxVotes > 0) {
                Integer currentVotes = [
                    SELECT COUNT()
                    FROM OpenSF__RetroVote__c
                    WHERE
                        OpenSF__RetroCard__r.OpenSF__Retrospective__c = :cardForRetro.OpenSF__Retrospective__c
                        AND OpenSF__Voter__c = :currentUserId
                ];
                if (currentVotes >= maxVotes) {
                    throw new AuraHandledException(
                        'You have reached the maximum number of votes (' +
                            maxVotes.intValue() +
                            ')'
                    );
                }
            }

            // Vote
            OpenSF__RetroVote__c vote = new OpenSF__RetroVote__c(
                OpenSF__RetroCard__c = cardId,
                OpenSF__Voter__c = currentUserId
            );
            insert Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<OpenSF__RetroVote__c>{ vote }
                )
                .getRecords();
        }

        // Re-query card with updated vote count
        OpenSF__RetroCard__c updated = [
            SELECT
                Id,
                Name,
                OpenSF__Retrospective__c,
                OpenSF__Category__c,
                OpenSF__Text__c,
                OpenSF__Author__c,
                OpenSF__Author__r.Name,
                OpenSF__Author__r.SmallPhotoUrl,
                OpenSF__VoteCount__c,
                OpenSF__Position__c,
                OpenSF__ActionItemCard__c
            FROM OpenSF__RetroCard__c
            WHERE Id = :cardId
            WITH SECURITY_ENFORCED
        ];

        // Publish event
        publishRetroEvent(
            cardForRetro.OpenSF__Retrospective__c,
            'VOTE_CHANGED',
            cardId
        );

        RetrospectiveDTO.RetroCardDTO dto = new RetrospectiveDTO.RetroCardDTO(
            updated
        );
        dto.hasVoted = existingVotes.isEmpty(); // If was empty, we just voted
        return dto;
    }

    /**
     * Reveal all card authors
     */
    public static void revealAuthors(Id retroId) {
        OpenSF__Retrospective__c retro = new OpenSF__Retrospective__c(
            Id = retroId,
            OpenSF__Revealed__c = true
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Retrospective__c>{ retro }
            )
            .getRecords();

        publishRetroEvent(retroId, 'AUTHORS_REVEALED', null);
    }

    /**
     * Update retrospective status
     */
    public static RetrospectiveDTO.RetroDTO updateRetroStatus(
        Id retroId,
        String status
    ) {
        OpenSF__Retrospective__c retro = new OpenSF__Retrospective__c(
            Id = retroId,
            OpenSF__Status__c = status
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Retrospective__c>{ retro }
            )
            .getRecords();

        publishRetroEvent(retroId, 'STATUS_CHANGED', null);

        return new RetrospectiveDTO.RetroDTO(
            [
                SELECT
                    Id,
                    Name,
                    OpenSF__Sprint__c,
                    OpenSF__Sprint__r.Name,
                    OpenSF__Board__c,
                    OpenSF__Board__r.Name,
                    OpenSF__Status__c,
                    OpenSF__Template__c,
                    OpenSF__ShowAlways__c,
                    OpenSF__Revealed__c,
                    OpenSF__MaxVotesPerUser__c
                FROM OpenSF__Retrospective__c
                WHERE Id = :retroId
                WITH SECURITY_ENFORCED
            ]
        );
    }

    /**
     * Delete a retro card (only author or admin can delete)
     */
    public static void deleteRetroCard(Id cardId) {
        OpenSF__RetroCard__c card = [
            SELECT Id, OpenSF__Retrospective__c, OpenSF__Author__c
            FROM OpenSF__RetroCard__c
            WHERE Id = :cardId
            WITH SECURITY_ENFORCED
        ];

        Id retroId = card.OpenSF__Retrospective__c;
        delete card;

        publishRetroEvent(retroId, 'CARD_DELETED', cardId);
    }

    /**
     * Create action item card on a kanban board from a retro card
     */
    public static RetrospectiveDTO.RetroCardDTO createActionItem(
        Id retroCardId,
        Id boardId,
        Id assigneeId,
        String destination
    ) {
        // Get the retro card text
        OpenSF__RetroCard__c retroCard = [
            SELECT Id, OpenSF__Text__c, OpenSF__Retrospective__c
            FROM OpenSF__RetroCard__c
            WHERE Id = :retroCardId
            WITH SECURITY_ENFORCED
        ];

        Id targetColumnId = null;
        if (destination == 'first_column') {
            // Get first column of the board
            List<OpenSF__Column__c> columns = [
                SELECT Id
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :boardId
                WITH SECURITY_ENFORCED
                ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
                LIMIT 1
            ];
            if (!columns.isEmpty()) {
                targetColumnId = columns[0].Id;
            }
        }
        // If destination is 'backlog', targetColumnId stays null (backlog = no column)

        OpenSF__Card__c newCard = new OpenSF__Card__c(
            OpenSF__Subject__c = retroCard.OpenSF__Text__c?.left(255),
            OpenSF__Board__c = boardId,
            OpenSF__Column__c = targetColumnId,
            OpenSF__Assignee__c = assigneeId,
            OpenSF__CardType__c = 'Task',
            OpenSF__Status__c = 'To Do',
            OpenSF__Priority__c = 'Medium'
        );

        insert Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__Card__c>{ newCard }
            )
            .getRecords();

        // Link the action item card back to the retro card
        OpenSF__RetroCard__c updateRetroCard = new OpenSF__RetroCard__c(
            Id = retroCardId,
            OpenSF__ActionItemCard__c = newCard.Id
        );
        update Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__RetroCard__c>{ updateRetroCard }
            )
            .getRecords();

        // Re-query to get full data
        OpenSF__RetroCard__c updated = [
            SELECT
                Id,
                Name,
                OpenSF__Retrospective__c,
                OpenSF__Category__c,
                OpenSF__Text__c,
                OpenSF__Author__c,
                OpenSF__Author__r.Name,
                OpenSF__Author__r.SmallPhotoUrl,
                OpenSF__VoteCount__c,
                OpenSF__Position__c,
                OpenSF__ActionItemCard__c,
                OpenSF__ActionItemCard__r.Name
            FROM OpenSF__RetroCard__c
            WHERE Id = :retroCardId
            WITH SECURITY_ENFORCED
        ];

        publishRetroEvent(
            retroCard.OpenSF__Retrospective__c,
            'ACTION_ITEM_CREATED',
            retroCardId
        );

        return new RetrospectiveDTO.RetroCardDTO(updated);
    }

    /**
     * Get boards for action item destination picker
     */
    public static List<KanbanBoardDTO.BoardDTO> getBoards() {
        List<OpenSF__Board__c> boards = [
            SELECT
                Id,
                Name,
                OpenSF__Description__c,
                OpenSF__Status__c,
                OpenSF__Type__c,
                OpenSF__Active__c,
                OpenSF__EmailNotifications__c,
                OpenSF__SalesforceNotifications__c,
                OpenSF__ActiveSprint__c
            FROM OpenSF__Board__c
            WHERE OpenSF__Active__c = TRUE
            WITH SECURITY_ENFORCED
            ORDER BY Name ASC
        ];
        return KanbanBoardDTO.convertBoards(boards);
    }

    /**
     * Publish a retro update platform event
     */
    private static void publishRetroEvent(
        Id retroId,
        String eventType,
        Id relatedId
    ) {
        OpenSF__RetroUpdateEvent__e evt = new OpenSF__RetroUpdateEvent__e(
            OpenSF__RetroId__c = retroId,
            OpenSF__EventType__c = eventType,
            OpenSF__Payload__c = relatedId != null
                ? String.valueOf(relatedId)
                : ''
        );
        EventBus.publish(evt);
    }
}
