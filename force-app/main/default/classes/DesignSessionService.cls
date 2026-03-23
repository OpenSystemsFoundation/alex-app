/**
 * DesignSessionService - Business logic for design thinking sessions.
 * Follows the Service pattern from the base package.
 */
public with sharing class DesignSessionService {

    /**
     * Create a new design session
     */
    public static DesignSessionDTO.SessionDTO createSession(Id boardId, String title) {
        // Validate board exists
        List<OpenSF__Board__c> boards = [
            SELECT Id FROM OpenSF__Board__c WHERE Id = :boardId WITH USER_MODE LIMIT 1
        ];
        if (boards.isEmpty()) {
            throw new AuraHandledException('Board not found: ' + boardId);
        }

        OpenSF__DesignSession__c session = new OpenSF__DesignSession__c(
            OpenSF__Board__c = boardId,
            OpenSF__Title__c = title,
            OpenSF__Status__c = DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.PLANNING),
            OpenSF__CurrentPhase__c = DesignEnums.designPhaseValue(DesignEnums.DesignPhase.EMPATHIZE),
            OpenSF__Facilitator__c = UserInfo.getUserId(),
            OpenSF__ParticipantCount__c = 1
        );

        List<OpenSF__DesignSession__c> stripped = (List<OpenSF__DesignSession__c>)
            Security.stripInaccessible(AccessType.CREATABLE, new List<OpenSF__DesignSession__c>{ session })
            .getRecords();
        insert stripped;

        return new DesignSessionDTO.SessionDTO(
            DesignSessionSelector.getSessionById(stripped[0].Id)
        );
    }

    /**
     * Start a session - transitions from Planning to Active
     */
    public static DesignSessionDTO.SessionDTO startSession(Id sessionId) {
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);

        String planningStatus = DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.PLANNING);
        if (session.OpenSF__Status__c != planningStatus) {
            throw new AuraHandledException('Only sessions in Planning status can be started.');
        }

        session.OpenSF__Status__c = DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.ACTIVE);
        session.OpenSF__StartedAt__c = DateTime.now();

        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__DesignSession__c>{ session }).getRecords();

        publishSessionEvent(sessionId, session.OpenSF__Board__c,
            DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.SESSION_STARTED),
            '{"sessionId":"' + sessionId + '"}', null);

        return new DesignSessionDTO.SessionDTO(
            DesignSessionSelector.getSessionById(sessionId)
        );
    }

    /**
     * End a session
     */
    public static void endSession(Id sessionId) {
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);

        session.OpenSF__Status__c = DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.COMPLETED);
        session.OpenSF__EndedAt__c = DateTime.now();

        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__DesignSession__c>{ session }).getRecords();

        publishSessionEvent(sessionId, session.OpenSF__Board__c,
            DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.SESSION_ENDED),
            '{"sessionId":"' + sessionId + '"}', null);
    }

    /**
     * Add a card to a session
     */
    public static DesignSessionDTO.SessionCardDTO addCardToSession(Id sessionId, Id cardId) {
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);

        // Check for duplicate
        List<OpenSF__DesignSessionCard__c> existing = [
            SELECT Id FROM OpenSF__DesignSessionCard__c
            WHERE OpenSF__DesignSession__c = :sessionId AND OpenSF__Card__c = :cardId
            WITH USER_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            throw new AuraHandledException('Card is already in this session.');
        }

        OpenSF__DesignSessionCard__c sc = new OpenSF__DesignSessionCard__c(
            OpenSF__DesignSession__c = sessionId,
            OpenSF__Card__c = cardId,
            OpenSF__PhaseAtEntry__c = session.OpenSF__CurrentPhase__c,
            OpenSF__AddedDate__c = DateTime.now(),
            OpenSF__Graduated__c = false
        );

        insert Security.stripInaccessible(AccessType.CREATABLE,
            new List<OpenSF__DesignSessionCard__c>{ sc }).getRecords();

        // Set the card's design phase and active session
        OpenSF__Card__c card = new OpenSF__Card__c(
            Id = cardId,
            OpenSF__DesignPhase__c = session.OpenSF__CurrentPhase__c,
            OpenSF__ActiveDesignSession__c = sessionId
        );
        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__Card__c>{ card }).getRecords();

        // Re-query to get relationship data
        List<OpenSF__DesignSessionCard__c> queried = DesignSessionSelector.getCardsBySessionId(sessionId);
        for (OpenSF__DesignSessionCard__c q : queried) {
            if (q.OpenSF__Card__c == cardId) {
                return new DesignSessionDTO.SessionCardDTO(q);
            }
        }
        return new DesignSessionDTO.SessionCardDTO(sc);
    }

    /**
     * Remove a card from a session
     */
    public static void removeCardFromSession(Id sessionId, Id cardId) {
        List<OpenSF__DesignSessionCard__c> scs = [
            SELECT Id FROM OpenSF__DesignSessionCard__c
            WHERE OpenSF__DesignSession__c = :sessionId AND OpenSF__Card__c = :cardId
            WITH USER_MODE LIMIT 1
        ];
        if (!scs.isEmpty()) {
            delete scs;
        }

        // Clear the card's active session
        OpenSF__Card__c card = new OpenSF__Card__c(
            Id = cardId,
            OpenSF__ActiveDesignSession__c = null
        );
        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__Card__c>{ card }).getRecords();
    }

    /**
     * Advance a card to the next design phase
     */
    public static void advanceCardPhase(Id cardId, String newPhase) {
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__DesignPhase__c, OpenSF__ActiveDesignSession__c, OpenSF__Board__c
            FROM OpenSF__Card__c WHERE Id = :cardId WITH USER_MODE LIMIT 1
        ];

        String currentPhase = card.OpenSF__DesignPhase__c;
        if (!DesignEnums.isValidPhaseAdvance(currentPhase, newPhase)) {
            throw new AuraHandledException(
                'Invalid phase advance from ' + currentPhase + ' to ' + newPhase
            );
        }

        card.OpenSF__DesignPhase__c = newPhase;

        // If graduating to Refined, clear the refinement flag
        if (newPhase == DesignEnums.designPhaseValue(DesignEnums.DesignPhase.REFINED)) {
            card.OpenSF__NeedsRefinement__c = false;
        }

        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__Card__c>{ card }).getRecords();

        if (card.OpenSF__ActiveDesignSession__c != null) {
            publishSessionEvent(card.OpenSF__ActiveDesignSession__c, card.OpenSF__Board__c,
                DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.CARD_PHASE_ADVANCED),
                JSON.serialize(new Map<String, Object>{
                    'cardId' => cardId, 'fromPhase' => currentPhase, 'toPhase' => newPhase
                }), null);
        }
    }

    /**
     * Return a card to an earlier phase
     */
    public static void returnCardToPhase(Id cardId, String targetPhase) {
        OpenSF__Card__c card = [
            SELECT Id, OpenSF__DesignPhase__c, OpenSF__ActiveDesignSession__c, OpenSF__Board__c
            FROM OpenSF__Card__c WHERE Id = :cardId WITH USER_MODE LIMIT 1
        ];

        String currentPhase = card.OpenSF__DesignPhase__c;
        if (!DesignEnums.isValidPhaseReturn(currentPhase, targetPhase)) {
            throw new AuraHandledException(
                'Invalid phase return from ' + currentPhase + ' to ' + targetPhase
            );
        }

        card.OpenSF__DesignPhase__c = targetPhase;
        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__Card__c>{ card }).getRecords();

        if (card.OpenSF__ActiveDesignSession__c != null) {
            publishSessionEvent(card.OpenSF__ActiveDesignSession__c, card.OpenSF__Board__c,
                DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.CARD_PHASE_RETURNED),
                JSON.serialize(new Map<String, Object>{
                    'cardId' => cardId, 'fromPhase' => currentPhase, 'toPhase' => targetPhase
                }), null);
        }
    }

    /**
     * Create a design note
     */
    public static DesignSessionDTO.NoteDTO createNote(
        Id sessionId, Id cardId, String text, String zone,
        String tool, String phase, Decimal posX, Decimal posY
    ) {
        OpenSF__DesignNote__c note = new OpenSF__DesignNote__c(
            OpenSF__DesignSession__c = sessionId,
            OpenSF__Card__c = cardId,
            OpenSF__Author__c = UserInfo.getUserId(),
            OpenSF__Text__c = text,
            OpenSF__Zone__c = zone,
            OpenSF__Tool__c = tool,
            OpenSF__Phase__c = phase,
            OpenSF__PositionX__c = posX,
            OpenSF__PositionY__c = posY,
            OpenSF__VoteCount__c = 0
        );

        List<OpenSF__DesignNote__c> stripped = (List<OpenSF__DesignNote__c>)
            Security.stripInaccessible(AccessType.CREATABLE, new List<OpenSF__DesignNote__c>{ note })
            .getRecords();
        insert stripped;

        // Re-query for author name
        OpenSF__DesignNote__c created = [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Author__c, OpenSF__Author__r.Name,
                   OpenSF__Text__c, OpenSF__Zone__c, OpenSF__Tool__c, OpenSF__Phase__c,
                   OpenSF__PositionX__c, OpenSF__PositionY__c, OpenSF__Color__c,
                   OpenSF__ParentNote__c, OpenSF__VoteCount__c,
                   OpenSF__Cluster__c, OpenSF__SortOrder__c
            FROM OpenSF__DesignNote__c
            WHERE Id = :stripped[0].Id
            WITH USER_MODE
            LIMIT 1
        ];

        DesignSessionDTO.NoteDTO dto = new DesignSessionDTO.NoteDTO(created);

        // Get board ID for event
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);
        publishSessionEvent(sessionId, session.OpenSF__Board__c,
            DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.NOTE_ADDED),
            JSON.serialize(dto), null);

        return dto;
    }

    /**
     * Update a design note
     */
    public static void updateNote(Id noteId, String text, String zone, Decimal posX, Decimal posY) {
        OpenSF__DesignNote__c note = [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Text__c, OpenSF__Zone__c,
                   OpenSF__PositionX__c, OpenSF__PositionY__c
            FROM OpenSF__DesignNote__c WHERE Id = :noteId WITH USER_MODE LIMIT 1
        ];

        if (text != null) note.OpenSF__Text__c = text;
        if (zone != null) note.OpenSF__Zone__c = zone;
        if (posX != null) note.OpenSF__PositionX__c = posX;
        if (posY != null) note.OpenSF__PositionY__c = posY;

        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__DesignNote__c>{ note }).getRecords();
    }

    /**
     * Delete a design note
     */
    public static void deleteNote(Id noteId) {
        OpenSF__DesignNote__c note = [
            SELECT Id FROM OpenSF__DesignNote__c WHERE Id = :noteId WITH USER_MODE LIMIT 1
        ];
        delete note;
    }

    /**
     * Cast a vote
     */
    public static void castVote(Id sessionId, Id noteId, String voteType, Integer score, Integer round) {
        // Check if already voted in this round
        Id userId = UserInfo.getUserId();
        List<OpenSF__DesignVote__c> existing = [
            SELECT Id FROM OpenSF__DesignVote__c
            WHERE OpenSF__DesignSession__c = :sessionId
                AND OpenSF__DesignNote__c = :noteId
                AND OpenSF__Voter__c = :userId
                AND OpenSF__Round__c = :round
            WITH USER_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            throw new AuraHandledException('You have already voted on this item in this round.');
        }

        OpenSF__DesignVote__c vote = new OpenSF__DesignVote__c(
            OpenSF__DesignSession__c = sessionId,
            OpenSF__DesignNote__c = noteId,
            OpenSF__Voter__c = userId,
            OpenSF__VoteType__c = voteType,
            OpenSF__Score__c = score,
            OpenSF__Round__c = round
        );

        insert Security.stripInaccessible(AccessType.CREATABLE,
            new List<OpenSF__DesignVote__c>{ vote }).getRecords();

        // Update denormalized vote count on the note
        recalculateVoteCount(noteId);

        // Publish event
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);
        publishSessionEvent(sessionId, session.OpenSF__Board__c,
            DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.VOTE_CAST),
            JSON.serialize(new Map<String, Object>{
                'noteId' => noteId, 'voterId' => userId, 'voteType' => voteType, 'round' => round
            }), null);
    }

    /**
     * Retract a vote
     */
    public static void retractVote(Id sessionId, Id noteId, Integer round) {
        Id userId = UserInfo.getUserId();
        List<OpenSF__DesignVote__c> votes = [
            SELECT Id FROM OpenSF__DesignVote__c
            WHERE OpenSF__DesignSession__c = :sessionId
                AND OpenSF__DesignNote__c = :noteId
                AND OpenSF__Voter__c = :userId
                AND OpenSF__Round__c = :round
            WITH USER_MODE LIMIT 1
        ];
        if (!votes.isEmpty()) {
            delete votes;
            recalculateVoteCount(noteId);
        }
    }

    /**
     * Save an artifact
     */
    public static DesignSessionDTO.ArtifactDTO saveArtifact(
        Id sessionId, Id cardId, String artifactType, String title,
        String content, String phase, String tool
    ) {
        OpenSF__DesignArtifact__c artifact = new OpenSF__DesignArtifact__c(
            OpenSF__DesignSession__c = sessionId,
            OpenSF__Card__c = cardId,
            OpenSF__Type__c = artifactType,
            OpenSF__Title__c = title,
            OpenSF__Content__c = content,
            OpenSF__Phase__c = phase,
            OpenSF__Tool__c = tool
        );

        List<OpenSF__DesignArtifact__c> stripped = (List<OpenSF__DesignArtifact__c>)
            Security.stripInaccessible(AccessType.CREATABLE, new List<OpenSF__DesignArtifact__c>{ artifact })
            .getRecords();
        insert stripped;

        OpenSF__DesignArtifact__c created = [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Type__c, OpenSF__Title__c, OpenSF__Content__c,
                   OpenSF__ExternalURL__c, OpenSF__Phase__c, OpenSF__Tool__c, CreatedDate
            FROM OpenSF__DesignArtifact__c WHERE Id = :stripped[0].Id WITH USER_MODE LIMIT 1
        ];

        return new DesignSessionDTO.ArtifactDTO(created);
    }

    /**
     * Change the session's current phase
     */
    public static void setSessionPhase(Id sessionId, String newPhase) {
        OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);
        session.OpenSF__CurrentPhase__c = newPhase;
        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__DesignSession__c>{ session }).getRecords();

        publishSessionEvent(sessionId, session.OpenSF__Board__c,
            DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.PHASE_CHANGED),
            '{"phase":"' + newPhase + '"}', null);
    }

    // ─── Private Helpers ───

    private static void recalculateVoteCount(Id noteId) {
        Integer count = [
            SELECT COUNT() FROM OpenSF__DesignVote__c
            WHERE OpenSF__DesignNote__c = :noteId
        ];
        OpenSF__DesignNote__c note = new OpenSF__DesignNote__c(
            Id = noteId,
            OpenSF__VoteCount__c = count
        );
        update Security.stripInaccessible(AccessType.UPDATABLE,
            new List<OpenSF__DesignNote__c>{ note }).getRecords();
    }

    private static void publishSessionEvent(
        Id sessionId, Id boardId, String eventType, String payload, String clientId
    ) {
        OpenSF__DesignSessionEvent__e evt = new OpenSF__DesignSessionEvent__e(
            OpenSF__EventType__c = eventType,
            OpenSF__Payload__c = payload,
            OpenSF__SessionId__c = sessionId,
            OpenSF__BoardId__c = boardId,
            OpenSF__ClientId__c = clientId,
            OpenSF__ClientRequestId__c = null
        );
        EventBus.publish(evt);
    }
}
