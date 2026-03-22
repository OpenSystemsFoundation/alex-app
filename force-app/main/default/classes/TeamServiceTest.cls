/**
 * @description Test class for TeamService and TeamSelector
 */
@isTest
public class TeamServiceTest {
    @TestSetup
    static void setupTestData() {
        // Create a test board
        TestFactory.createBoard('Team Test Board');
    }

    @isTest
    static void testCreateTeam() {
        Test.startTest();
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Alpha Team',
            'The Alpha development team',
            '#FF5733'
        );
        Test.stopTest();

        System.assertNotEquals(null, team.Id, 'Team should be created');
        System.assertEquals('Alpha Team', team.Name, 'Team name should match');
        System.assertEquals(
            'The Alpha development team',
            team.description,
            'Description should match'
        );
        System.assertEquals('#FF5733', team.avatarColor, 'Color should match');
        System.assertEquals('Active', team.status, 'Status should be Active');
    }

    @isTest
    static void testUpdateTeam() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Beta Team',
            'Initial description',
            '#3366FF'
        );

        Map<String, Object> updates = new Map<String, Object>();
        updates.put('name', 'Beta Team Updated');
        updates.put('description', 'Updated description');
        updates.put('defaultVelocity', 42);

        Test.startTest();
        KanbanBoardDTO.TeamDTO updated = TeamService.updateTeam(
            team.Id,
            updates
        );
        Test.stopTest();

        System.assertEquals(
            'Beta Team Updated',
            updated.Name,
            'Name should be updated'
        );
        System.assertEquals(
            'Updated description',
            updated.description,
            'Description should be updated'
        );
        System.assertEquals(
            42,
            updated.defaultVelocity,
            'Velocity should be updated'
        );
    }

    @isTest
    static void testAddTeamMember() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Gamma Team',
            'Test team',
            '#33FF57'
        );
        Id userId = UserInfo.getUserId();

        Test.startTest();
        KanbanBoardDTO.TeamMemberDTO member = TeamService.addTeamMember(
            team.Id,
            userId,
            KanbanEnums.teamMemberRoleValue(
                KanbanEnums.TeamMemberRole.DEVELOPER
            ),
            100
        );
        Test.stopTest();

        System.assertNotEquals(null, member.Id, 'Member should be created');
        System.assertEquals(
            userId,
            member.userId,
            'User ID should match'
        );
        System.assertEquals(
            'Developer',
            member.role,
            'Role should be Developer'
        );
        System.assertEquals(
            100,
            member.allocation,
            'Allocation should be 100'
        );
        System.assertEquals(
            'Active',
            member.status,
            'Status should be Active'
        );
    }

    @isTest
    static void testAddDuplicateTeamMemberThrowsException() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Delta Team',
            'Test team',
            '#5733FF'
        );
        Id userId = UserInfo.getUserId();

        TeamService.addTeamMember(team.Id, userId, 'Developer', 50);

        Test.startTest();
        try {
            TeamService.addTeamMember(team.Id, userId, 'QA', 50);
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('already an active member'),
                'Should indicate duplicate membership'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testRemoveTeamMember() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Epsilon Team',
            'Test team',
            '#FF3357'
        );
        Id userId = UserInfo.getUserId();
        KanbanBoardDTO.TeamMemberDTO member = TeamService.addTeamMember(
            team.Id,
            userId,
            'Developer',
            100
        );

        Test.startTest();
        TeamService.removeTeamMember(member.Id);
        Test.stopTest();

        OpenSF__TeamMember__c updated = [
            SELECT OpenSF__Status__c
            FROM OpenSF__TeamMember__c
            WHERE Id = :member.Id
        ];
        System.assertEquals(
            'Inactive',
            updated.OpenSF__Status__c,
            'Status should be Inactive after removal'
        );
    }

    @isTest
    static void testGetActiveTeams() {
        TeamService.createTeam('Team One', 'First team', '#111111');
        TeamService.createTeam('Team Two', 'Second team', '#222222');

        Test.startTest();
        List<KanbanBoardDTO.TeamDTO> teams = TeamService.getActiveTeams();
        Test.stopTest();

        System.assert(teams.size() >= 2, 'Should have at least 2 active teams');
    }

    @isTest
    static void testGetTeamWithMembers() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Full Team',
            'Team with members',
            '#AABBCC'
        );
        Id userId = UserInfo.getUserId();
        TeamService.addTeamMember(team.Id, userId, 'Scrum Master', 100);

        Test.startTest();
        KanbanBoardDTO.TeamDTO result = TeamService.getTeamWithMembers(
            team.Id
        );
        Test.stopTest();

        System.assertEquals('Full Team', result.Name, 'Team name should match');
        System.assertNotEquals(
            null,
            result.members,
            'Members list should not be null'
        );
        System.assertEquals(
            1,
            result.members.size(),
            'Should have 1 member'
        );
        System.assertEquals(
            'Scrum Master',
            result.members[0].role,
            'Member role should match'
        );
    }

    @isTest
    static void testDeactivateTeam() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Temp Team',
            'To be deactivated',
            '#DDDDDD'
        );

        Test.startTest();
        TeamService.deactivateTeam(team.Id);
        Test.stopTest();

        OpenSF__Team__c updated = [
            SELECT OpenSF__Status__c
            FROM OpenSF__Team__c
            WHERE Id = :team.Id
        ];
        System.assertEquals(
            'Inactive',
            updated.OpenSF__Status__c,
            'Team should be Inactive'
        );
    }

    @isTest
    static void testTeamEnums() {
        System.assertEquals(
            'Active',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.ACTIVE),
            'Active status should match'
        );
        System.assertEquals(
            'Inactive',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.INACTIVE),
            'Inactive status should match'
        );
        System.assertEquals(
            'Archived',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.ARCHIVED),
            'Archived status should match'
        );
        System.assertEquals(
            'Developer',
            KanbanEnums.teamMemberRoleValue(
                KanbanEnums.TeamMemberRole.DEVELOPER
            ),
            'Developer role should match'
        );
        System.assertEquals(
            'Scrum Master',
            KanbanEnums.teamMemberRoleValue(
                KanbanEnums.TeamMemberRole.SCRUM_MASTER
            ),
            'Scrum Master role should match'
        );
        System.assertEquals(
            'On Leave',
            KanbanEnums.teamMemberStatusValue(
                KanbanEnums.TeamMemberStatus.ON_LEAVE
            ),
            'On Leave status should match'
        );
    }

    @isTest
    static void testTeamSelectorGetActiveTeamMembers() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'Selector Team',
            'For selector tests',
            '#EEEEEE'
        );
        Id userId = UserInfo.getUserId();
        TeamService.addTeamMember(team.Id, userId, 'Tech Lead', 100);

        Test.startTest();
        List<OpenSF__TeamMember__c> activeMembers = TeamSelector.getActiveTeamMembers(
            team.Id
        );
        Test.stopTest();

        System.assertEquals(
            1,
            activeMembers.size(),
            'Should have 1 active member'
        );
    }

    @isTest
    static void testTeamSelectorGetMembershipsByUserId() {
        KanbanBoardDTO.TeamDTO team = TeamService.createTeam(
            'User Team',
            'For user lookup',
            '#FFFFFF'
        );
        Id userId = UserInfo.getUserId();
        TeamService.addTeamMember(team.Id, userId, 'Developer', 50);

        Test.startTest();
        List<OpenSF__TeamMember__c> memberships = TeamSelector.getMembershipsByUserId(
            userId
        );
        Test.stopTest();

        System.assert(
            memberships.size() >= 1,
            'Should have at least 1 membership'
        );
    }
}
