/**
 * DesignSessionSelector - SOQL queries for design thinking objects.
 * Follows the Selector pattern from the base package.
 */
public with sharing class DesignSessionSelector {

    public static OpenSF__DesignSession__c getSessionById(Id sessionId) {
        List<OpenSF__DesignSession__c> sessions = [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Title__c, OpenSF__Status__c,
                   OpenSF__CurrentPhase__c, OpenSF__Facilitator__c, OpenSF__Facilitator__r.Name,
                   OpenSF__ScheduledDate__c, OpenSF__StartedAt__c, OpenSF__EndedAt__c,
                   OpenSF__ParticipantCount__c, OpenSF__Notes__c, CreatedDate
            FROM OpenSF__DesignSession__c
            WHERE Id = :sessionId
            WITH USER_MODE
            LIMIT 1
        ];
        if (sessions.isEmpty()) {
            throw new AuraHandledException('Design session not found: ' + sessionId);
        }
        return sessions[0];
    }

    public static List<OpenSF__DesignSession__c> getSessionsByBoardId(Id boardId) {
        return [
            SELECT Id, Name, OpenSF__Board__c, OpenSF__Title__c, OpenSF__Status__c,
                   OpenSF__CurrentPhase__c, OpenSF__Facilitator__c, OpenSF__Facilitator__r.Name,
                   OpenSF__ScheduledDate__c, OpenSF__StartedAt__c, OpenSF__EndedAt__c,
                   OpenSF__ParticipantCount__c, CreatedDate
            FROM OpenSF__DesignSession__c
            WHERE OpenSF__Board__c = :boardId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }

    public static List<OpenSF__DesignSessionCard__c> getCardsBySessionId(Id sessionId) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Card__r.Name, OpenSF__Card__r.OpenSF__Subject__c,
                   OpenSF__Card__r.OpenSF__DesignPhase__c,
                   OpenSF__PhaseAtEntry__c, OpenSF__PhaseAtExit__c,
                   OpenSF__AddedDate__c, OpenSF__Graduated__c
            FROM OpenSF__DesignSessionCard__c
            WHERE OpenSF__DesignSession__c = :sessionId
            WITH USER_MODE
            ORDER BY OpenSF__AddedDate__c ASC
        ];
    }

    public static List<OpenSF__DesignNote__c> getNotesBySessionAndTool(Id sessionId, String tool, String phase) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Author__c, OpenSF__Author__r.Name,
                   OpenSF__Text__c, OpenSF__Zone__c, OpenSF__Tool__c, OpenSF__Phase__c,
                   OpenSF__PositionX__c, OpenSF__PositionY__c, OpenSF__Color__c,
                   OpenSF__ParentNote__c, OpenSF__VoteCount__c,
                   OpenSF__Cluster__c, OpenSF__SortOrder__c, CreatedDate
            FROM OpenSF__DesignNote__c
            WHERE OpenSF__DesignSession__c = :sessionId
                AND OpenSF__Tool__c = :tool
                AND OpenSF__Phase__c = :phase
            WITH USER_MODE
            ORDER BY OpenSF__SortOrder__c ASC, CreatedDate ASC
        ];
    }

    public static List<OpenSF__DesignNote__c> getNotesBySession(Id sessionId) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Author__c, OpenSF__Author__r.Name,
                   OpenSF__Text__c, OpenSF__Zone__c, OpenSF__Tool__c, OpenSF__Phase__c,
                   OpenSF__PositionX__c, OpenSF__PositionY__c, OpenSF__Color__c,
                   OpenSF__ParentNote__c, OpenSF__VoteCount__c,
                   OpenSF__Cluster__c, OpenSF__SortOrder__c, CreatedDate
            FROM OpenSF__DesignNote__c
            WHERE OpenSF__DesignSession__c = :sessionId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT 2000
        ];
    }

    public static List<OpenSF__DesignVote__c> getVotesBySessionAndRound(Id sessionId, Integer round) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__DesignNote__c,
                   OpenSF__Voter__c, OpenSF__Voter__r.Name,
                   OpenSF__VoteType__c, OpenSF__Score__c, OpenSF__Round__c
            FROM OpenSF__DesignVote__c
            WHERE OpenSF__DesignSession__c = :sessionId
                AND OpenSF__Round__c = :round
            WITH USER_MODE
        ];
    }

    public static List<OpenSF__DesignArtifact__c> getArtifactsByCardId(Id cardId) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Type__c, OpenSF__Title__c, OpenSF__Content__c,
                   OpenSF__ExternalURL__c, OpenSF__Phase__c, OpenSF__Tool__c,
                   CreatedDate
            FROM OpenSF__DesignArtifact__c
            WHERE OpenSF__Card__c = :cardId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
    }

    public static List<OpenSF__DesignArtifact__c> getArtifactsBySessionId(Id sessionId) {
        return [
            SELECT Id, OpenSF__DesignSession__c, OpenSF__Card__c,
                   OpenSF__Type__c, OpenSF__Title__c, OpenSF__Content__c,
                   OpenSF__ExternalURL__c, OpenSF__Phase__c, OpenSF__Tool__c,
                   CreatedDate
            FROM OpenSF__DesignArtifact__c
            WHERE OpenSF__DesignSession__c = :sessionId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
    }

    public static Map<String, Integer> getPhaseCountsByBoardId(Id boardId) {
        Map<String, Integer> counts = new Map<String, Integer>();
        for (AggregateResult ar : [
            SELECT OpenSF__DesignPhase__c phase, COUNT(Id) cnt
            FROM OpenSF__Card__c
            WHERE OpenSF__Board__c = :boardId
                AND OpenSF__DesignPhase__c != null
            GROUP BY OpenSF__DesignPhase__c
        ]) {
            counts.put((String) ar.get('phase'), (Integer) ar.get('cnt'));
        }
        return counts;
    }
}
