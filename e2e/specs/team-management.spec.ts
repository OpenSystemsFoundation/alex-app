import { test, expect } from '../fixtures';
import { sfApexRun, sfQuery } from '../helpers/sf-data';

/**
 * Team Management — E2E tests.
 *
 * Tests the Team__c and TeamMember__c data layer via Apex execution
 * to validate the LeSS multi-team foundation deployed to the scratch org.
 *
 * NOTE: Anonymous Apex in a namespaced org requires the OpenSF. prefix
 * on all class references (e.g., OpenSF.TeamService, OpenSF.KanbanBoardDTO).
 *
 * Tests run serially and use low allocation values (10%) to avoid
 * allocation conflicts from leftover data across test runs.
 */
test.describe('Team Management', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('TeamService.createTeam creates a team with correct fields', async () => {
        const teamName = `E2E-Team-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'E2E test team description',
    '#FF5733'
);
System.debug('E2E_TEAM_ID:' + team.Id);
System.debug('E2E_TEAM_NAME:' + team.Name);
System.debug('E2E_TEAM_STATUS:' + team.status);
System.debug('E2E_TEAM_COLOR:' + team.avatarColor);
`);

        expect(output).toContain('E2E_TEAM_ID:');
        expect(output).toContain(`E2E_TEAM_NAME:${teamName}`);
        expect(output).toContain('E2E_TEAM_STATUS:Active');
        expect(output).toContain('E2E_TEAM_COLOR:#FF5733');

        // Verify via SOQL query
        const teams = sfQuery(
            `SELECT Id, Name, OpenSF__Status__c, OpenSF__AvatarColor__c, OpenSF__Description__c FROM OpenSF__Team__c WHERE Name = '${teamName}' LIMIT 1`
        );
        expect(teams.length).toBe(1);
        expect(teams[0].OpenSF__Status__c).toBe('Active');
        expect(teams[0].OpenSF__AvatarColor__c).toBe('#FF5733');
        expect(teams[0].OpenSF__Description__c).toBe(
            'E2E test team description'
        );
    });

    test('TeamService.addTeamMember adds a member with role and allocation', async () => {
        const teamName = `E2E-Member-Team-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'For member tests',
    '#3366FF'
);
Id userId = UserInfo.getUserId();
OpenSF.KanbanBoardDTO.TeamMemberDTO member = OpenSF.TeamService.addTeamMember(
    team.Id,
    userId,
    'Scrum Master',
    10
);
System.debug('E2E_MEMBER_ID:' + member.Id);
System.debug('E2E_MEMBER_ROLE:' + member.role);
System.debug('E2E_MEMBER_ALLOC:' + member.allocation);
System.debug('E2E_MEMBER_STATUS:' + member.status);

// Cleanup via service method
OpenSF.TeamService.removeTeamMember(member.Id);
`);

        expect(output).toContain('E2E_MEMBER_ID:');
        expect(output).toContain('E2E_MEMBER_ROLE:Scrum Master');
        expect(output).toContain('E2E_MEMBER_ALLOC:10');
        expect(output).toContain('E2E_MEMBER_STATUS:Active');
    });

    test('TeamService.addTeamMember rejects duplicate active membership', async () => {
        const teamName = `E2E-Dup-Team-${Date.now()}`;

        // First: add a member successfully
        const setupOutput = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'For duplicate test',
    '#33FF57'
);
Id userId = UserInfo.getUserId();
OpenSF.KanbanBoardDTO.TeamMemberDTO first = OpenSF.TeamService.addTeamMember(team.Id, userId, 'Developer', 5);
System.debug('E2E_TEAM_ID:' + team.Id);
System.debug('E2E_MEMBER_ID:' + first.Id);
`);
        expect(setupOutput).toContain('E2E_TEAM_ID:');
        const teamIdMatch = setupOutput.match(
            /E2E_TEAM_ID:([a-zA-Z0-9]{15,18})/
        );
        const memberIdMatch = setupOutput.match(
            /E2E_MEMBER_ID:([a-zA-Z0-9]{15,18})/
        );
        expect(teamIdMatch).toBeTruthy();
        expect(memberIdMatch).toBeTruthy();

        // Second: try to add duplicate — expect sf apex run to fail
        let duplicateFailed = false;
        try {
            sfApexRun(`
OpenSF.TeamService.addTeamMember('${teamIdMatch![1]}', UserInfo.getUserId(), 'QA', 5);
`);
        } catch {
            duplicateFailed = true;
        }
        expect(duplicateFailed).toBe(true);

        // Cleanup
        sfApexRun(`
OpenSF.TeamService.removeTeamMember('${memberIdMatch![1]}');
`);
    });

    test('TeamService.removeTeamMember soft-deletes by setting Inactive status', async () => {
        const teamName = `E2E-Remove-Team-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'For removal test',
    '#5733FF'
);
Id userId = UserInfo.getUserId();
OpenSF.KanbanBoardDTO.TeamMemberDTO member = OpenSF.TeamService.addTeamMember(
    team.Id,
    userId,
    'Developer',
    10
);

OpenSF.TeamService.removeTeamMember(member.Id);

OpenSF__TeamMember__c updated = [
    SELECT OpenSF__Status__c
    FROM OpenSF__TeamMember__c
    WHERE Id = :member.Id
];
System.debug('E2E_REMOVED_STATUS:' + updated.OpenSF__Status__c);
`);

        expect(output).toContain('E2E_REMOVED_STATUS:Inactive');
    });

    test('TeamService.updateTeam modifies team properties', async () => {
        const teamName = `E2E-Update-Team-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'Original description',
    '#AABBCC'
);

Map<String, Object> updates = new Map<String, Object>();
updates.put('name', '${teamName}-Updated');
updates.put('description', 'Updated description');
updates.put('defaultVelocity', 42);

OpenSF.KanbanBoardDTO.TeamDTO updated = OpenSF.TeamService.updateTeam(team.Id, updates);
System.debug('E2E_UPDATED_NAME:' + updated.Name);
System.debug('E2E_UPDATED_DESC:' + updated.description);
System.debug('E2E_UPDATED_VEL:' + updated.defaultVelocity);
`);

        expect(output).toContain(`E2E_UPDATED_NAME:${teamName}-Updated`);
        expect(output).toContain('E2E_UPDATED_DESC:Updated description');
        expect(output).toContain('E2E_UPDATED_VEL:42');
    });

    test('TeamService.deactivateTeam sets status to Inactive', async () => {
        const teamName = `E2E-Deactivate-Team-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'To be deactivated',
    '#DDDDDD'
);
OpenSF.TeamService.deactivateTeam(team.Id);

OpenSF__Team__c result = [
    SELECT OpenSF__Status__c
    FROM OpenSF__Team__c
    WHERE Id = :team.Id
];
System.debug('E2E_DEACTIVATED_STATUS:' + result.OpenSF__Status__c);
`);

        expect(output).toContain('E2E_DEACTIVATED_STATUS:Inactive');
    });

    test('TeamService.getTeamWithMembers returns team with member list', async () => {
        const teamName = `E2E-WithMembers-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'Team with members',
    '#EEEEFF'
);
Id userId = UserInfo.getUserId();
OpenSF.KanbanBoardDTO.TeamMemberDTO member = OpenSF.TeamService.addTeamMember(team.Id, userId, 'Tech Lead', 10);

OpenSF.KanbanBoardDTO.TeamDTO result = OpenSF.TeamService.getTeamWithMembers(team.Id);
System.debug('E2E_TEAM_NAME:' + result.Name);
System.debug('E2E_MEMBER_COUNT:' + result.members.size());
System.debug('E2E_MEMBER_ROLE:' + result.members[0].role);

// Cleanup
OpenSF.TeamService.removeTeamMember(member.Id);
`);

        expect(output).toContain(`E2E_TEAM_NAME:${teamName}`);
        expect(output).toContain('E2E_MEMBER_COUNT:1');
        expect(output).toContain('E2E_MEMBER_ROLE:Tech Lead');
    });

    test('TeamService.getActiveTeams returns only active teams', async () => {
        const ts = Date.now();
        const output = sfApexRun(`
OpenSF.TeamService.createTeam('E2E-Active-${ts}', 'Active team', '#111111');
OpenSF.KanbanBoardDTO.TeamDTO inactive = OpenSF.TeamService.createTeam('E2E-Inactive-${ts}', 'Inactive team', '#222222');
OpenSF.TeamService.deactivateTeam(inactive.Id);

List<OpenSF.KanbanBoardDTO.TeamDTO> teams = OpenSF.TeamService.getActiveTeams();
Boolean foundActive = false;
Boolean foundInactive = false;
for (OpenSF.KanbanBoardDTO.TeamDTO t : teams) {
    if (t.Name == 'E2E-Active-${ts}') foundActive = true;
    if (t.Name == 'E2E-Inactive-${ts}') foundInactive = true;
}
System.debug('E2E_FOUND_ACTIVE:' + foundActive);
System.debug('E2E_FOUND_INACTIVE:' + foundInactive);
`);

        expect(output).toContain('E2E_FOUND_ACTIVE:true');
        expect(output).toContain('E2E_FOUND_INACTIVE:false');
    });

    test('Board__c.Team__c lookup associates board with team', async ({
        boardData
    }) => {
        const teamName = `E2E-BoardTeam-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'Board association test',
    '#FFAA00'
);

OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c WHERE Id = '${boardData.boardId}'];
board.OpenSF__Team__c = team.Id;
update board;

OpenSF__Board__c updated = [SELECT OpenSF__Team__c, OpenSF__Team__r.Name FROM OpenSF__Board__c WHERE Id = '${boardData.boardId}'];
System.debug('E2E_BOARD_TEAM_ID:' + updated.OpenSF__Team__c);
System.debug('E2E_BOARD_TEAM_NAME:' + updated.OpenSF__Team__r.Name);

// Clean up
board.OpenSF__Team__c = null;
update board;
`);

        expect(output).toContain(`E2E_BOARD_TEAM_NAME:${teamName}`);
    });

    test('Card__c.Team__c lookup assigns card to team', async ({
        boardData
    }) => {
        const teamName = `E2E-CardTeam-${Date.now()}`;
        const cardId = boardData.cards[0].Id;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'Card assignment test',
    '#00AAFF'
);

OpenSF__Card__c card = [SELECT Id FROM OpenSF__Card__c WHERE Id = '${cardId}'];
card.OpenSF__Team__c = team.Id;
update card;

OpenSF__Card__c updated = [SELECT OpenSF__Team__c, OpenSF__Team__r.Name FROM OpenSF__Card__c WHERE Id = '${cardId}'];
System.debug('E2E_CARD_TEAM_NAME:' + updated.OpenSF__Team__r.Name);

// Clean up
card.OpenSF__Team__c = null;
update card;
`);

        expect(output).toContain(`E2E_CARD_TEAM_NAME:${teamName}`);
    });

    test('KanbanEnums team values are correct', async () => {
        const output = sfApexRun(`
System.debug('E2E_TS_ACTIVE:' + OpenSF.KanbanEnums.teamStatusValue(OpenSF.KanbanEnums.TeamStatus.ACTIVE));
System.debug('E2E_TS_INACTIVE:' + OpenSF.KanbanEnums.teamStatusValue(OpenSF.KanbanEnums.TeamStatus.INACTIVE));
System.debug('E2E_TS_ARCHIVED:' + OpenSF.KanbanEnums.teamStatusValue(OpenSF.KanbanEnums.TeamStatus.ARCHIVED));
System.debug('E2E_MR_DEV:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.DEVELOPER));
System.debug('E2E_MR_SM:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.SCRUM_MASTER));
System.debug('E2E_MR_PO:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.PRODUCT_OWNER));
System.debug('E2E_MR_TL:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.TECH_LEAD));
System.debug('E2E_MR_QA:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.QA));
System.debug('E2E_MR_DES:' + OpenSF.KanbanEnums.teamMemberRoleValue(OpenSF.KanbanEnums.TeamMemberRole.DESIGNER));
System.debug('E2E_MS_ACTIVE:' + OpenSF.KanbanEnums.teamMemberStatusValue(OpenSF.KanbanEnums.TeamMemberStatus.ACTIVE));
System.debug('E2E_MS_LEAVE:' + OpenSF.KanbanEnums.teamMemberStatusValue(OpenSF.KanbanEnums.TeamMemberStatus.ON_LEAVE));
System.debug('E2E_MS_INACTIVE:' + OpenSF.KanbanEnums.teamMemberStatusValue(OpenSF.KanbanEnums.TeamMemberStatus.INACTIVE));
`);

        expect(output).toContain('E2E_TS_ACTIVE:Active');
        expect(output).toContain('E2E_TS_INACTIVE:Inactive');
        expect(output).toContain('E2E_TS_ARCHIVED:Archived');
        expect(output).toContain('E2E_MR_DEV:Developer');
        expect(output).toContain('E2E_MR_SM:Scrum Master');
        expect(output).toContain('E2E_MR_PO:Product Owner');
        expect(output).toContain('E2E_MR_TL:Tech Lead');
        expect(output).toContain('E2E_MR_QA:QA');
        expect(output).toContain('E2E_MR_DES:Designer');
        expect(output).toContain('E2E_MS_ACTIVE:Active');
        expect(output).toContain('E2E_MS_LEAVE:On Leave');
        expect(output).toContain('E2E_MS_INACTIVE:Inactive');
    });

    test('TeamSelector.getActiveTeamMembers filters by active status', async () => {
        const teamName = `E2E-ActiveMembers-${Date.now()}`;
        const output = sfApexRun(`
OpenSF.KanbanBoardDTO.TeamDTO team = OpenSF.TeamService.createTeam(
    '${teamName}',
    'Active member filter test',
    '#AABB00'
);
Id userId = UserInfo.getUserId();
OpenSF.KanbanBoardDTO.TeamMemberDTO member = OpenSF.TeamService.addTeamMember(
    team.Id, userId, 'Developer', 10
);

// Check active count before removal
List<OpenSF__TeamMember__c> activeBefore = OpenSF.TeamSelector.getActiveTeamMembers(team.Id);
System.debug('E2E_ACTIVE_BEFORE:' + activeBefore.size());

// Soft-delete the member
OpenSF.TeamService.removeTeamMember(member.Id);

// Check active count after removal
List<OpenSF__TeamMember__c> activeAfter = OpenSF.TeamSelector.getActiveTeamMembers(team.Id);
System.debug('E2E_ACTIVE_AFTER:' + activeAfter.size());

// All members (including inactive)
List<OpenSF__TeamMember__c> allMembers = OpenSF.TeamSelector.getTeamMembers(team.Id);
System.debug('E2E_ALL_MEMBERS:' + allMembers.size());
`);

        expect(output).toContain('E2E_ACTIVE_BEFORE:1');
        expect(output).toContain('E2E_ACTIVE_AFTER:0');
        expect(output).toContain('E2E_ALL_MEMBERS:1');
    });
});
