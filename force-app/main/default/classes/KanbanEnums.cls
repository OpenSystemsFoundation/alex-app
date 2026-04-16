/**
 * KanbanEnums - Strongly typed constants for the Alex Kanban application.
 * Replaces scattered string literals with compiler-enforced enums.
 */
public inherited sharing class KanbanEnums {
    /**
     * Sprint lifecycle status values
     */
    public enum SprintStatus {
        PLANNING,
        ACTIVE,
        COMPLETED
    }

    /**
     * Column semantic categories for burndown and auto-completion logic
     */
    public enum ColumnCategory {
        BACKLOG,
        TODO,
        IN_PROGRESS,
        TESTING,
        REVIEW,
        DONE,
        RELEASED
    }

    /**
     * Platform event types for CardUpdateEvent__e
     */
    public enum CardEventType {
        CARD_CREATE,
        CARD_UPDATE,
        CARD_DELETE,
        CARD_UNDELETE
    }

    /**
     * Platform event types for ColumnUpdateEvent__e
     */
    public enum ColumnEventType {
        COLUMN_CREATE,
        COLUMN_UPDATE,
        COLUMN_DELETE
    }

    /**
     * Card link relationship types
     */
    public enum CardLinkType {
        BLOCKS,
        IS_BLOCKED_BY,
        RELATES_TO,
        DUPLICATES,
        IS_DUPLICATED_BY
    }

    /**
     * Convert CardLinkType enum to picklist API value
     */
    public static String cardLinkTypeValue(CardLinkType linkType) {
        switch on linkType {
            when BLOCKS {
                return 'Blocks';
            }
            when IS_BLOCKED_BY {
                return 'Is Blocked By';
            }
            when RELATES_TO {
                return 'Relates To';
            }
            when DUPLICATES {
                return 'Duplicates';
            }
            when IS_DUPLICATED_BY {
                return 'Is Duplicated By';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Get the inverse link type for bidirectional display
     */
    public static String inverseLinkType(String linkType) {
        if (linkType == 'Blocks') {
            return 'Is Blocked By';
        }
        if (linkType == 'Is Blocked By') {
            return 'Blocks';
        }
        if (linkType == 'Duplicates') {
            return 'Is Duplicated By';
        }
        if (linkType == 'Is Duplicated By') {
            return 'Duplicates';
        }
        return 'Relates To';
    }

    /**
     * Platform event types for SprintUpdateEvent__e
     */
    public enum SprintEventType {
        SPRINT_STARTED,
        SPRINT_COMPLETED,
        CARDS_ADDED,
        CARD_REMOVED,
        CARD_ADDED,
        CARD_UPDATED
    }

    /**
     * Convert SprintStatus enum to the picklist API value stored in the database
     */
    public static String sprintStatusValue(SprintStatus status) {
        switch on status {
            when PLANNING {
                return 'Planning';
            }
            when ACTIVE {
                return 'Active';
            }
            when COMPLETED {
                return 'Completed';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert ColumnCategory enum to the picklist API value stored in the database
     */
    public static String columnCategoryValue(ColumnCategory category) {
        switch on category {
            when BACKLOG {
                return 'Backlog';
            }
            when TODO {
                return 'To Do';
            }
            when IN_PROGRESS {
                return 'In Progress';
            }
            when TESTING {
                return 'Testing';
            }
            when REVIEW {
                return 'Review';
            }
            when DONE {
                return 'Done';
            }
            when RELEASED {
                return 'Released';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert CardEventType enum to the string stored in platform event fields
     */
    public static String cardEventTypeValue(CardEventType eventType) {
        switch on eventType {
            when CARD_CREATE {
                return 'create';
            }
            when CARD_UPDATE {
                return 'update';
            }
            when CARD_DELETE {
                return 'delete';
            }
            when CARD_UNDELETE {
                return 'undelete';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert ColumnEventType enum to the string stored in platform event fields
     */
    public static String columnEventTypeValue(ColumnEventType eventType) {
        switch on eventType {
            when COLUMN_CREATE {
                return 'create';
            }
            when COLUMN_UPDATE {
                return 'update';
            }
            when COLUMN_DELETE {
                return 'delete';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Team status values
     */
    public enum TeamStatus {
        ACTIVE,
        INACTIVE,
        ARCHIVED
    }

    /**
     * Team member role values
     */
    public enum TeamMemberRole {
        DEVELOPER,
        QA,
        DESIGNER,
        SCRUM_MASTER,
        PRODUCT_OWNER,
        TECH_LEAD
    }

    /**
     * Team member status values
     */
    public enum TeamMemberStatus {
        ACTIVE,
        ON_LEAVE,
        INACTIVE
    }

    /**
     * Convert TeamStatus enum to the picklist API value stored in the database
     */
    public static String teamStatusValue(TeamStatus status) {
        switch on status {
            when ACTIVE {
                return 'Active';
            }
            when INACTIVE {
                return 'Inactive';
            }
            when ARCHIVED {
                return 'Archived';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert TeamMemberRole enum to the picklist API value stored in the database
     */
    public static String teamMemberRoleValue(TeamMemberRole role) {
        switch on role {
            when DEVELOPER {
                return 'Developer';
            }
            when QA {
                return 'QA';
            }
            when DESIGNER {
                return 'Designer';
            }
            when SCRUM_MASTER {
                return 'Scrum Master';
            }
            when PRODUCT_OWNER {
                return 'Product Owner';
            }
            when TECH_LEAD {
                return 'Tech Lead';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert TeamMemberStatus enum to the picklist API value stored in the database
     */
    public static String teamMemberStatusValue(TeamMemberStatus status) {
        switch on status {
            when ACTIVE {
                return 'Active';
            }
            when ON_LEAVE {
                return 'On Leave';
            }
            when INACTIVE {
                return 'Inactive';
            }
            when else {
                return null;
            }
        }
    }

    /**
     * Convert SprintEventType enum to the string stored in platform event fields
     */
    public static String sprintEventTypeValue(SprintEventType eventType) {
        switch on eventType {
            when SPRINT_STARTED {
                return 'sprint_started';
            }
            when SPRINT_COMPLETED {
                return 'sprint_completed';
            }
            when CARDS_ADDED {
                return 'cards_added';
            }
            when CARD_REMOVED {
                return 'card_removed';
            }
            when CARD_ADDED {
                return 'card_added';
            }
            when CARD_UPDATED {
                return 'card_updated';
            }
            when else {
                return null;
            }
        }
    }
}
