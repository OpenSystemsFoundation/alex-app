/**
 * Tests for KanbanEnums — verifies every enum-to-picklist-value mapping.
 */
@isTest
private class KanbanEnumsTest {
    @isTest
    static void testSprintStatusValues() {
        System.assertEquals(
            'Planning',
            KanbanEnums.sprintStatusValue(KanbanEnums.SprintStatus.PLANNING),
            'PLANNING maps to Planning'
        );
        System.assertEquals(
            'Active',
            KanbanEnums.sprintStatusValue(KanbanEnums.SprintStatus.ACTIVE),
            'ACTIVE maps to Active'
        );
        System.assertEquals(
            'Completed',
            KanbanEnums.sprintStatusValue(KanbanEnums.SprintStatus.COMPLETED),
            'COMPLETED maps to Completed'
        );
        System.assertEquals(
            null,
            KanbanEnums.sprintStatusValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testColumnCategoryValues() {
        Map<KanbanEnums.ColumnCategory, String> expected = new Map<KanbanEnums.ColumnCategory, String>{
            KanbanEnums.ColumnCategory.BACKLOG => 'Backlog',
            KanbanEnums.ColumnCategory.TODO => 'To Do',
            KanbanEnums.ColumnCategory.IN_PROGRESS => 'In Progress',
            KanbanEnums.ColumnCategory.TESTING => 'Testing',
            KanbanEnums.ColumnCategory.REVIEW => 'Review',
            KanbanEnums.ColumnCategory.DONE => 'Done',
            KanbanEnums.ColumnCategory.RELEASED => 'Released'
        };
        for (KanbanEnums.ColumnCategory cat : expected.keySet()) {
            System.assertEquals(
                expected.get(cat),
                KanbanEnums.columnCategoryValue(cat),
                'Category ' + cat + ' maps to ' + expected.get(cat)
            );
        }
        System.assertEquals(
            null,
            KanbanEnums.columnCategoryValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testCardEventTypeValues() {
        System.assertEquals(
            'create',
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_CREATE
            ),
            'CARD_CREATE maps to create'
        );
        System.assertEquals(
            'update',
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_UPDATE
            ),
            'CARD_UPDATE maps to update'
        );
        System.assertEquals(
            'delete',
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_DELETE
            ),
            'CARD_DELETE maps to delete'
        );
        System.assertEquals(
            'undelete',
            KanbanEnums.cardEventTypeValue(
                KanbanEnums.CardEventType.CARD_UNDELETE
            ),
            'CARD_UNDELETE maps to undelete'
        );
        System.assertEquals(
            null,
            KanbanEnums.cardEventTypeValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testColumnEventTypeValues() {
        System.assertEquals(
            'create',
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_CREATE
            ),
            'COLUMN_CREATE maps to create'
        );
        System.assertEquals(
            'update',
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_UPDATE
            ),
            'COLUMN_UPDATE maps to update'
        );
        System.assertEquals(
            'delete',
            KanbanEnums.columnEventTypeValue(
                KanbanEnums.ColumnEventType.COLUMN_DELETE
            ),
            'COLUMN_DELETE maps to delete'
        );
        System.assertEquals(
            null,
            KanbanEnums.columnEventTypeValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testSprintEventTypeValues() {
        Map<KanbanEnums.SprintEventType, String> expected = new Map<KanbanEnums.SprintEventType, String>{
            KanbanEnums.SprintEventType.SPRINT_STARTED => 'sprint_started',
            KanbanEnums.SprintEventType.SPRINT_COMPLETED => 'sprint_completed',
            KanbanEnums.SprintEventType.CARDS_ADDED => 'cards_added',
            KanbanEnums.SprintEventType.CARD_REMOVED => 'card_removed',
            KanbanEnums.SprintEventType.CARD_ADDED => 'card_added',
            KanbanEnums.SprintEventType.CARD_UPDATED => 'card_updated'
        };
        for (KanbanEnums.SprintEventType t : expected.keySet()) {
            System.assertEquals(
                expected.get(t),
                KanbanEnums.sprintEventTypeValue(t),
                'Event ' + t + ' maps to ' + expected.get(t)
            );
        }
        System.assertEquals(
            null,
            KanbanEnums.sprintEventTypeValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testCardLinkTypeValues() {
        Map<KanbanEnums.CardLinkType, String> expected = new Map<KanbanEnums.CardLinkType, String>{
            KanbanEnums.CardLinkType.BLOCKS => 'Blocks',
            KanbanEnums.CardLinkType.IS_BLOCKED_BY => 'Is Blocked By',
            KanbanEnums.CardLinkType.RELATES_TO => 'Relates To',
            KanbanEnums.CardLinkType.DUPLICATES => 'Duplicates',
            KanbanEnums.CardLinkType.IS_DUPLICATED_BY => 'Is Duplicated By'
        };
        for (KanbanEnums.CardLinkType t : expected.keySet()) {
            System.assertEquals(
                expected.get(t),
                KanbanEnums.cardLinkTypeValue(t),
                'Link type ' + t + ' maps to ' + expected.get(t)
            );
        }
        System.assertEquals(
            null,
            KanbanEnums.cardLinkTypeValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testInverseLinkTypes() {
        System.assertEquals(
            'Is Blocked By',
            KanbanEnums.inverseLinkType('Blocks'),
            'Blocks inverts to Is Blocked By'
        );
        System.assertEquals(
            'Blocks',
            KanbanEnums.inverseLinkType('Is Blocked By'),
            'Is Blocked By inverts to Blocks'
        );
        System.assertEquals(
            'Is Duplicated By',
            KanbanEnums.inverseLinkType('Duplicates'),
            'Duplicates inverts to Is Duplicated By'
        );
        System.assertEquals(
            'Duplicates',
            KanbanEnums.inverseLinkType('Is Duplicated By'),
            'Is Duplicated By inverts to Duplicates'
        );
        System.assertEquals(
            'Relates To',
            KanbanEnums.inverseLinkType('Relates To'),
            'Relates To is symmetric'
        );
        System.assertEquals(
            'Relates To',
            KanbanEnums.inverseLinkType('Anything Else'),
            'Unknown types default to Relates To'
        );
    }

    @isTest
    static void testTeamStatusValues() {
        System.assertEquals(
            'Active',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.ACTIVE),
            'ACTIVE maps to Active'
        );
        System.assertEquals(
            'Inactive',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.INACTIVE),
            'INACTIVE maps to Inactive'
        );
        System.assertEquals(
            'Archived',
            KanbanEnums.teamStatusValue(KanbanEnums.TeamStatus.ARCHIVED),
            'ARCHIVED maps to Archived'
        );
        System.assertEquals(
            null,
            KanbanEnums.teamStatusValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testTeamMemberRoleValues() {
        Map<KanbanEnums.TeamMemberRole, String> expected = new Map<KanbanEnums.TeamMemberRole, String>{
            KanbanEnums.TeamMemberRole.DEVELOPER => 'Developer',
            KanbanEnums.TeamMemberRole.QA => 'QA',
            KanbanEnums.TeamMemberRole.DESIGNER => 'Designer',
            KanbanEnums.TeamMemberRole.SCRUM_MASTER => 'Scrum Master',
            KanbanEnums.TeamMemberRole.PRODUCT_OWNER => 'Product Owner',
            KanbanEnums.TeamMemberRole.TECH_LEAD => 'Tech Lead'
        };
        for (KanbanEnums.TeamMemberRole r : expected.keySet()) {
            System.assertEquals(
                expected.get(r),
                KanbanEnums.teamMemberRoleValue(r),
                'Role ' + r + ' maps to ' + expected.get(r)
            );
        }
        System.assertEquals(
            null,
            KanbanEnums.teamMemberRoleValue(null),
            'null maps to null'
        );
    }

    @isTest
    static void testTeamMemberStatusValues() {
        System.assertEquals(
            'Active',
            KanbanEnums.teamMemberStatusValue(
                KanbanEnums.TeamMemberStatus.ACTIVE
            ),
            'ACTIVE maps to Active'
        );
        System.assertEquals(
            'On Leave',
            KanbanEnums.teamMemberStatusValue(
                KanbanEnums.TeamMemberStatus.ON_LEAVE
            ),
            'ON_LEAVE maps to On Leave'
        );
        System.assertEquals(
            'Inactive',
            KanbanEnums.teamMemberStatusValue(
                KanbanEnums.TeamMemberStatus.INACTIVE
            ),
            'INACTIVE maps to Inactive'
        );
        System.assertEquals(
            null,
            KanbanEnums.teamMemberStatusValue(null),
            'null maps to null'
        );
    }
}
