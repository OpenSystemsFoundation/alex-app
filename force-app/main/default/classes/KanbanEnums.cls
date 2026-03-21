/**
 * KanbanEnums - Strongly typed constants for the Alex Kanban application.
 * Replaces scattered string literals with compiler-enforced enums.
 */
public class KanbanEnums {
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
        TODO,
        IN_PROGRESS,
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
            when TODO {
                return 'To Do';
            }
            when IN_PROGRESS {
                return 'In Progress';
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
