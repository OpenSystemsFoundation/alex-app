public with sharing class PlanningPokerController {
    // Centralized field lists to avoid missing-field SOQL errors
    private static final String SESSION_FIELDS =
        'Id, Name, OpenSF__SessionName__c, OpenSF__Status__c, ' +
        'OpenSF__VotingSystem__c, OpenSF__AutoReveal__c, ' +
        'OpenSF__AllowReactions__c, OpenSF__ShowClearPermission__c, ' +
        'CreatedById, CreatedDate';

    private static final String PARTICIPANT_FIELDS =
        'Id, Name, OpenSF__UserId__c, OpenSF__Avatar__c, ' +
        'OpenSF__Role__c, OpenSF__Vote__c, OpenSF__HasVoted__c, ' +
        'OpenSF__IsActive__c, OpenSF__Reaction__c';

    private static final String PARTICIPANT_SUBQUERY =
        '(SELECT ' +
        PARTICIPANT_FIELDS +
        ' FROM OpenSF__Participants__r' +
        ' WHERE OpenSF__IsActive__c = TRUE' +
        ' ORDER BY CreatedDate ASC)';

    @AuraEnabled
    public static List<SessionDTO> getActiveSessions() {
        String query =
            'SELECT ' +
            SESSION_FIELDS +
            ', ' +
            PARTICIPANT_SUBQUERY +
            ' FROM OpenSF__PokerSession__c' +
            ' WHERE OpenSF__Status__c != \'Closed\'' +
            ' ORDER BY CreatedDate DESC' +
            ' LIMIT 50';

        List<SessionDTO> result = new List<SessionDTO>();
        for (OpenSF__PokerSession__c s : Database.query(query)) {
            result.add(new SessionDTO(s));
        }
        return result;
    }

    @AuraEnabled
    public static SessionDTO createSession(
        String sessionName,
        String votingSystem,
        String showClearPermission,
        Boolean autoReveal,
        Boolean allowReactions,
        String displayName,
        String avatar,
        String role
    ) {
        OpenSF__PokerSession__c session = new OpenSF__PokerSession__c(
            OpenSF__SessionName__c = sessionName,
            OpenSF__VotingSystem__c = votingSystem,
            OpenSF__ShowClearPermission__c = showClearPermission,
            OpenSF__AutoReveal__c = autoReveal,
            OpenSF__AllowReactions__c = allowReactions,
            OpenSF__Status__c = 'Voting'
        );
        insert session;

        OpenSF__PokerParticipant__c participant = new OpenSF__PokerParticipant__c(
            Name = displayName,
            OpenSF__Session__c = session.Id,
            OpenSF__UserId__c = UserInfo.getUserId(),
            OpenSF__Avatar__c = avatar,
            OpenSF__Role__c = role,
            OpenSF__IsActive__c = true
        );
        insert participant;

        publishEvent(
            session.Id,
            'SESSION_CREATED',
            JSON.serialize(new Map<String, Object>{ 'sessionId' => session.Id })
        );

        return getSession(session.Id);
    }

    @AuraEnabled
    public static SessionDTO joinSession(
        String sessionId,
        String displayName,
        String avatar,
        String role
    ) {
        String userId = UserInfo.getUserId();

        List<OpenSF__PokerParticipant__c> existing = [
            SELECT Id
            FROM OpenSF__PokerParticipant__c
            WHERE
                OpenSF__Session__c = :sessionId
                AND OpenSF__UserId__c = :userId
            LIMIT 1
        ];

        if (!existing.isEmpty()) {
            OpenSF__PokerParticipant__c p = existing[0];
            p.Name = displayName;
            p.OpenSF__Avatar__c = avatar;
            p.OpenSF__Role__c = role;
            p.OpenSF__IsActive__c = true;
            update p;
        } else {
            OpenSF__PokerParticipant__c participant = new OpenSF__PokerParticipant__c(
                Name = displayName,
                OpenSF__Session__c = sessionId,
                OpenSF__UserId__c = userId,
                OpenSF__Avatar__c = avatar,
                OpenSF__Role__c = role,
                OpenSF__IsActive__c = true
            );
            insert participant;
        }

        publishEvent(
            sessionId,
            'PARTICIPANT_JOINED',
            JSON.serialize(
                new Map<String, Object>{
                    'displayName' => displayName,
                    'avatar' => avatar,
                    'role' => role,
                    'userId' => userId
                }
            )
        );

        return getSession(sessionId);
    }

    @AuraEnabled
    public static void leaveSession(String sessionId) {
        String userId = UserInfo.getUserId();
        List<OpenSF__PokerParticipant__c> participants = [
            SELECT Id
            FROM OpenSF__PokerParticipant__c
            WHERE
                OpenSF__Session__c = :sessionId
                AND OpenSF__UserId__c = :userId
            LIMIT 1
        ];

        if (!participants.isEmpty()) {
            OpenSF__PokerParticipant__c p = participants[0];
            p.OpenSF__IsActive__c = false;
            update p;

            publishEvent(
                sessionId,
                'PARTICIPANT_LEFT',
                JSON.serialize(new Map<String, Object>{ 'userId' => userId })
            );

            destroyIfEmpty(sessionId);
        }
    }

    @AuraEnabled
    public static void castVote(String sessionId, String vote) {
        String userId = UserInfo.getUserId();
        List<OpenSF__PokerParticipant__c> participants = [
            SELECT Id
            FROM OpenSF__PokerParticipant__c
            WHERE
                OpenSF__Session__c = :sessionId
                AND OpenSF__UserId__c = :userId
            LIMIT 1
        ];

        if (!participants.isEmpty()) {
            OpenSF__PokerParticipant__c p = participants[0];
            p.OpenSF__Vote__c = vote;
            p.OpenSF__HasVoted__c = true;
            update p;

            publishEvent(
                sessionId,
                'VOTE_CAST',
                JSON.serialize(
                    new Map<String, Object>{
                        'userId' => userId,
                        'hasVoted' => true
                    }
                )
            );

            checkAutoReveal(sessionId);
        }
    }

    @AuraEnabled
    public static SessionDTO revealVotes(String sessionId) {
        OpenSF__PokerSession__c session = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
            LIMIT 1
        ];
        session.OpenSF__Status__c = 'Revealed';
        update session;

        publishEvent(sessionId, 'VOTES_REVEALED', '{}');

        return getSession(sessionId);
    }

    @AuraEnabled
    public static SessionDTO clearVotes(String sessionId) {
        OpenSF__PokerSession__c session = [
            SELECT Id
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
            LIMIT 1
        ];
        session.OpenSF__Status__c = 'Voting';
        update session;

        List<OpenSF__PokerParticipant__c> participants = [
            SELECT Id
            FROM OpenSF__PokerParticipant__c
            WHERE OpenSF__Session__c = :sessionId AND OpenSF__IsActive__c = TRUE
        ];
        for (OpenSF__PokerParticipant__c p : participants) {
            p.OpenSF__Vote__c = null;
            p.OpenSF__HasVoted__c = false;
            p.OpenSF__Reaction__c = null;
        }
        if (!participants.isEmpty()) {
            update participants;
        }

        publishEvent(sessionId, 'VOTES_CLEARED', '{}');

        return getSession(sessionId);
    }

    @AuraEnabled
    public static SessionDTO getSession(String sessionId) {
        String query =
            'SELECT ' +
            SESSION_FIELDS +
            ', ' +
            PARTICIPANT_SUBQUERY +
            ' FROM OpenSF__PokerSession__c' +
            ' WHERE Id = :sessionId' +
            ' LIMIT 1';

        OpenSF__PokerSession__c session = Database.query(query);
        return new SessionDTO(session);
    }

    @AuraEnabled
    public static void setReaction(String sessionId, String reaction) {
        String userId = UserInfo.getUserId();
        List<OpenSF__PokerParticipant__c> participants = [
            SELECT Id
            FROM OpenSF__PokerParticipant__c
            WHERE
                OpenSF__Session__c = :sessionId
                AND OpenSF__UserId__c = :userId
            LIMIT 1
        ];

        if (!participants.isEmpty()) {
            OpenSF__PokerParticipant__c p = participants[0];
            p.OpenSF__Reaction__c = reaction;
            update p;

            publishEvent(
                sessionId,
                'REACTION',
                JSON.serialize(
                    new Map<String, Object>{
                        'userId' => userId,
                        'reaction' => reaction
                    }
                )
            );
        }
    }

    @AuraEnabled
    public static void closeSession(String sessionId) {
        publishEvent(sessionId, 'SESSION_CLOSED', '{}');
        delete [
            SELECT Id
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static String getCurrentUserId() {
        return UserInfo.getUserId();
    }

    private static void checkAutoReveal(String sessionId) {
        OpenSF__PokerSession__c session = [
            SELECT Id, OpenSF__AutoReveal__c, OpenSF__Status__c
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
            LIMIT 1
        ];

        if (
            !session.OpenSF__AutoReveal__c ||
            session.OpenSF__Status__c == 'Revealed'
        ) {
            return;
        }

        List<OpenSF__PokerParticipant__c> voters = [
            SELECT Id, OpenSF__HasVoted__c
            FROM OpenSF__PokerParticipant__c
            WHERE
                OpenSF__Session__c = :sessionId
                AND OpenSF__IsActive__c = TRUE
                AND OpenSF__Role__c = 'Voter'
        ];

        Boolean allVoted = true;
        for (OpenSF__PokerParticipant__c v : voters) {
            if (!v.OpenSF__HasVoted__c) {
                allVoted = false;
                break;
            }
        }

        if (allVoted && !voters.isEmpty()) {
            session.OpenSF__Status__c = 'Revealed';
            update session;
            publishEvent(sessionId, 'VOTES_REVEALED', '{}');
        }
    }

    private static void destroyIfEmpty(String sessionId) {
        Integer activeCount = [
            SELECT COUNT()
            FROM OpenSF__PokerParticipant__c
            WHERE OpenSF__Session__c = :sessionId AND OpenSF__IsActive__c = TRUE
        ];

        if (activeCount == 0) {
            publishEvent(sessionId, 'SESSION_CLOSED', '{}');
            delete [
                SELECT Id
                FROM OpenSF__PokerSession__c
                WHERE Id = :sessionId
            ];
        }
    }

    private static void publishEvent(
        String sessionId,
        String eventType,
        String payload
    ) {
        OpenSF__PokerEvent__e evt = new OpenSF__PokerEvent__e(
            OpenSF__SessionId__c = sessionId,
            OpenSF__EventType__c = eventType,
            OpenSF__Payload__c = payload,
            OpenSF__SenderId__c = UserInfo.getUserId()
        );
        EventBus.publish(evt);
    }

    public class SessionDTO {
        @AuraEnabled
        public String id;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String sessionName;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String votingSystem;
        @AuraEnabled
        public Boolean autoReveal;
        @AuraEnabled
        public Boolean allowReactions;
        @AuraEnabled
        public String showClearPermission;
        @AuraEnabled
        public String createdById;
        @AuraEnabled
        public Datetime createdDate;
        @AuraEnabled
        public List<ParticipantDTO> participants;

        public SessionDTO(OpenSF__PokerSession__c session) {
            this.id = session.Id;
            this.name = session.Name;
            this.sessionName = session.OpenSF__SessionName__c;
            this.status = session.OpenSF__Status__c;
            this.votingSystem = session.OpenSF__VotingSystem__c;
            this.autoReveal = session.OpenSF__AutoReveal__c;
            this.allowReactions = session.OpenSF__AllowReactions__c;
            this.showClearPermission = session.OpenSF__ShowClearPermission__c;
            this.createdById = session.CreatedById;
            this.createdDate = session.CreatedDate;
            this.participants = new List<ParticipantDTO>();
            if (session.OpenSF__Participants__r != null) {
                for (
                    OpenSF__PokerParticipant__c p : session.OpenSF__Participants__r
                ) {
                    this.participants.add(new ParticipantDTO(p));
                }
            }
        }
    }

    public class ParticipantDTO {
        @AuraEnabled
        public String id;
        @AuraEnabled
        public String displayName;
        @AuraEnabled
        public String userId;
        @AuraEnabled
        public String avatar;
        @AuraEnabled
        public String role;
        @AuraEnabled
        public String vote;
        @AuraEnabled
        public Boolean hasVoted;
        @AuraEnabled
        public Boolean isActive;
        @AuraEnabled
        public String reaction;

        public ParticipantDTO(OpenSF__PokerParticipant__c p) {
            this.id = p.Id;
            this.displayName = p.Name;
            this.userId = p.OpenSF__UserId__c;
            this.avatar = p.OpenSF__Avatar__c;
            this.role = p.OpenSF__Role__c;
            this.vote = p.OpenSF__Vote__c;
            this.hasVoted = p.OpenSF__HasVoted__c;
            this.isActive = p.OpenSF__IsActive__c;
            this.reaction = p.OpenSF__Reaction__c;
        }
    }
}
