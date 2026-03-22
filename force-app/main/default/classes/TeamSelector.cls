/**
 * TeamSelector - Selector class for Team-related queries
 */
public with sharing class TeamSelector {
    /**
     * Get Team by Id
     */
    public static OpenSF__Team__c getTeamById(Id teamId) {
        List<OpenSF__Team__c> teams = [
            SELECT
                Id,
                Name,
                OpenSF__Description__c,
                OpenSF__Status__c,
                OpenSF__TeamLead__c,
                OpenSF__TeamLead__r.Name,
                OpenSF__DefaultVelocity__c,
                OpenSF__AvatarColor__c
            FROM OpenSF__Team__c
            WHERE Id = :teamId
            WITH USER_MODE
            LIMIT 1
        ];
        if (teams.isEmpty()) {
            throw new AuraHandledException('Team not found: ' + teamId);
        }
        return teams[0];
    }

    /**
     * Get all active Teams
     */
    public static List<OpenSF__Team__c> getActiveTeams() {
        String activeStatus = KanbanEnums.teamStatusValue(
            KanbanEnums.TeamStatus.ACTIVE
        );
        return [
            SELECT
                Id,
                Name,
                OpenSF__Description__c,
                OpenSF__Status__c,
                OpenSF__TeamLead__c,
                OpenSF__TeamLead__r.Name,
                OpenSF__DefaultVelocity__c,
                OpenSF__AvatarColor__c
            FROM OpenSF__Team__c
            WHERE OpenSF__Status__c = :activeStatus
            WITH USER_MODE
            ORDER BY Name ASC
        ];
    }

    /**
     * Get Teams associated with a Board
     */
    public static List<OpenSF__Team__c> getTeamsByBoardId(Id boardId) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Description__c,
                OpenSF__Status__c,
                OpenSF__TeamLead__c,
                OpenSF__TeamLead__r.Name,
                OpenSF__DefaultVelocity__c,
                OpenSF__AvatarColor__c
            FROM OpenSF__Team__c
            WHERE
                Id IN (
                    SELECT OpenSF__Team__c
                    FROM OpenSF__Board__c
                    WHERE Id = :boardId
                )
            WITH USER_MODE
            ORDER BY Name ASC
        ];
    }

    /**
     * Get Team Members for a Team
     */
    public static List<OpenSF__TeamMember__c> getTeamMembers(Id teamId) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Team__c,
                OpenSF__Member__c,
                OpenSF__Member__r.Name,
                OpenSF__Member__r.SmallPhotoUrl,
                OpenSF__Role__c,
                OpenSF__Allocation__c,
                OpenSF__JoinDate__c,
                OpenSF__Status__c,
                OpenSF__WeeklyCapacityHours__c
            FROM OpenSF__TeamMember__c
            WHERE OpenSF__Team__c = :teamId
            WITH USER_MODE
            ORDER BY OpenSF__Member__r.Name ASC
        ];
    }

    /**
     * Get active Team Members for a Team
     */
    public static List<OpenSF__TeamMember__c> getActiveTeamMembers(Id teamId) {
        String activeStatus = KanbanEnums.teamMemberStatusValue(
            KanbanEnums.TeamMemberStatus.ACTIVE
        );
        return [
            SELECT
                Id,
                Name,
                OpenSF__Team__c,
                OpenSF__Member__c,
                OpenSF__Member__r.Name,
                OpenSF__Member__r.SmallPhotoUrl,
                OpenSF__Role__c,
                OpenSF__Allocation__c,
                OpenSF__JoinDate__c,
                OpenSF__Status__c,
                OpenSF__WeeklyCapacityHours__c
            FROM OpenSF__TeamMember__c
            WHERE
                OpenSF__Team__c = :teamId
                AND OpenSF__Status__c = :activeStatus
            WITH USER_MODE
            ORDER BY OpenSF__Member__r.Name ASC
        ];
    }

    /**
     * Get all team memberships for a User across all teams
     */
    public static List<OpenSF__TeamMember__c> getMembershipsByUserId(
        Id userId
    ) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Team__c,
                OpenSF__Team__r.Name,
                OpenSF__Member__c,
                OpenSF__Role__c,
                OpenSF__Allocation__c,
                OpenSF__Status__c
            FROM OpenSF__TeamMember__c
            WHERE OpenSF__Member__c = :userId
            WITH USER_MODE
            ORDER BY OpenSF__Team__r.Name ASC
        ];
    }

    /**
     * Check if a user is already an active member of a team
     */
    public static List<OpenSF__TeamMember__c> getExistingMembership(
        Id teamId,
        Id userId
    ) {
        String activeStatus = KanbanEnums.teamMemberStatusValue(
            KanbanEnums.TeamMemberStatus.ACTIVE
        );
        return [
            SELECT Id
            FROM OpenSF__TeamMember__c
            WHERE
                OpenSF__Team__c = :teamId
                AND OpenSF__Member__c = :userId
                AND OpenSF__Status__c = :activeStatus
            WITH USER_MODE
            LIMIT 1
        ];
    }
}
