/**
 * TeamService - Business logic for team management
 */
public with sharing class TeamService {
    /**
     * Create a new team
     */
    public static KanbanBoardDTO.TeamDTO createTeam(
        String name,
        String description,
        String avatarColor
    ) {
        OpenSF__Team__c team = new OpenSF__Team__c(
            Name = name,
            OpenSF__Description__c = description,
            OpenSF__AvatarColor__c = avatarColor,
            OpenSF__Status__c = KanbanEnums.teamStatusValue(
                KanbanEnums.TeamStatus.ACTIVE
            )
        );
        List<OpenSF__Team__c> strippedTeams = (List<OpenSF__Team__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__Team__c>{ team }
            )
            .getRecords();
        insert strippedTeams;

        OpenSF__Team__c created = TeamSelector.getTeamById(strippedTeams[0].Id);
        return new KanbanBoardDTO.TeamDTO(created);
    }

    /**
     * Update an existing team
     */
    public static KanbanBoardDTO.TeamDTO updateTeam(
        Id teamId,
        Map<String, Object> updates
    ) {
        OpenSF__Team__c team = TeamSelector.getTeamById(teamId);

        if (updates.containsKey('name')) {
            team.Name = (String) updates.get('name');
        }
        if (updates.containsKey('description')) {
            team.OpenSF__Description__c = (String) updates.get('description');
        }
        if (updates.containsKey('avatarColor')) {
            team.OpenSF__AvatarColor__c = (String) updates.get('avatarColor');
        }
        if (updates.containsKey('status')) {
            team.OpenSF__Status__c = (String) updates.get('status');
        }
        if (updates.containsKey('defaultVelocity')) {
            team.OpenSF__DefaultVelocity__c = (Decimal) updates.get(
                'defaultVelocity'
            );
        }
        if (updates.containsKey('teamLeadId')) {
            team.OpenSF__TeamLead__c = (Id) updates.get('teamLeadId');
        }

        List<OpenSF__Team__c> strippedTeams = (List<OpenSF__Team__c>) Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__Team__c>{ team }
            )
            .getRecords();
        strippedTeams[0].Id = teamId;
        update strippedTeams;

        OpenSF__Team__c updated = TeamSelector.getTeamById(teamId);
        return new KanbanBoardDTO.TeamDTO(updated);
    }

    /**
     * Add a member to a team
     */
    public static KanbanBoardDTO.TeamMemberDTO addTeamMember(
        Id teamId,
        Id userId,
        String role,
        Decimal allocation
    ) {
        // Check for existing active membership
        List<OpenSF__TeamMember__c> existing = TeamSelector.getExistingMembership(
            teamId,
            userId
        );
        if (!existing.isEmpty()) {
            AuraHandledException ex = new AuraHandledException(
                'User is already an active member of this team.'
            );
            ex.setMessage('User is already an active member of this team.');
            throw ex;
        }

        // Validate total allocation does not exceed 100%
        List<OpenSF__TeamMember__c> userMemberships = TeamSelector.getMembershipsByUserId(
            userId
        );
        Decimal totalAllocation = allocation != null ? allocation : 100;
        for (OpenSF__TeamMember__c m : userMemberships) {
            if (
                m.OpenSF__Status__c ==
                KanbanEnums.teamMemberStatusValue(
                    KanbanEnums.TeamMemberStatus.ACTIVE
                ) &&
                m.OpenSF__Allocation__c != null
            ) {
                totalAllocation += m.OpenSF__Allocation__c;
            }
        }
        if (totalAllocation > 100) {
            throw new AuraHandledException(
                'Total allocation across all teams would exceed 100%. Current allocation: ' +
                    (totalAllocation -
                    (allocation != null ? allocation : 100)) +
                    '%'
            );
        }

        OpenSF__TeamMember__c member = new OpenSF__TeamMember__c(
            OpenSF__Team__c = teamId,
            OpenSF__Member__c = userId,
            OpenSF__Role__c = role != null
                ? role
                : KanbanEnums.teamMemberRoleValue(
                      KanbanEnums.TeamMemberRole.DEVELOPER
                  ),
            OpenSF__Allocation__c = allocation != null ? allocation : 100,
            OpenSF__JoinDate__c = Date.today(),
            OpenSF__Status__c = KanbanEnums.teamMemberStatusValue(
                KanbanEnums.TeamMemberStatus.ACTIVE
            ),
            OpenSF__WeeklyCapacityHours__c = 40
        );
        List<OpenSF__TeamMember__c> strippedMembers = (List<OpenSF__TeamMember__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<OpenSF__TeamMember__c>{ member }
            )
            .getRecords();
        insert strippedMembers;

        // Re-query to get relationship fields
        List<OpenSF__TeamMember__c> members = TeamSelector.getTeamMembers(
            teamId
        );
        for (OpenSF__TeamMember__c m : members) {
            if (m.Id == strippedMembers[0].Id) {
                return new KanbanBoardDTO.TeamMemberDTO(m);
            }
        }
        // Fallback — return basic DTO
        return new KanbanBoardDTO.TeamMemberDTO(strippedMembers[0]);
    }

    /**
     * Remove a member from a team (soft delete — sets status to Inactive)
     */
    public static void removeTeamMember(Id memberId) {
        OpenSF__TeamMember__c member = [
            SELECT Id, OpenSF__Status__c
            FROM OpenSF__TeamMember__c
            WHERE Id = :memberId
            WITH USER_MODE
            LIMIT 1
        ];
        member.OpenSF__Status__c = KanbanEnums.teamMemberStatusValue(
            KanbanEnums.TeamMemberStatus.INACTIVE
        );
        List<OpenSF__TeamMember__c> strippedMembers = (List<OpenSF__TeamMember__c>) Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<OpenSF__TeamMember__c>{ member }
            )
            .getRecords();
        strippedMembers[0].Id = memberId;
        update strippedMembers;
    }

    /**
     * Get all teams with their members
     */
    public static List<KanbanBoardDTO.TeamDTO> getActiveTeams() {
        List<OpenSF__Team__c> teams = TeamSelector.getActiveTeams();
        List<KanbanBoardDTO.TeamDTO> result = new List<KanbanBoardDTO.TeamDTO>();
        for (OpenSF__Team__c team : teams) {
            result.add(new KanbanBoardDTO.TeamDTO(team));
        }
        return result;
    }

    /**
     * Get team details with members
     */
    public static KanbanBoardDTO.TeamDTO getTeamWithMembers(Id teamId) {
        OpenSF__Team__c team = TeamSelector.getTeamById(teamId);
        KanbanBoardDTO.TeamDTO dto = new KanbanBoardDTO.TeamDTO(team);

        List<OpenSF__TeamMember__c> members = TeamSelector.getTeamMembers(
            teamId
        );
        dto.members = new List<KanbanBoardDTO.TeamMemberDTO>();
        for (OpenSF__TeamMember__c m : members) {
            dto.members.add(new KanbanBoardDTO.TeamMemberDTO(m));
        }
        return dto;
    }

    /**
     * Deactivate a team
     */
    public static void deactivateTeam(Id teamId) {
        Map<String, Object> updates = new Map<String, Object>();
        updates.put(
            'status',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.INACTIVE)
        );
        updateTeam(teamId, updates);
    }
}
