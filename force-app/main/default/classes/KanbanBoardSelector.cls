/**
 * KanbanBoardSelector - Selector class for Kanban Board queries
 * Follows the Selector pattern for SOQL query organization
 */
public with sharing class KanbanBoardSelector {
    /**
     * Standard card field list used across all card queries.
     * Update this single constant when adding new Card fields.
     */
    public static final String CARD_FIELDS = String.join(
        new List<String>{
            'Id',
            'Name',
            'OpenSF__Subject__c',
            'OpenSF__Description__c',
            'OpenSF__Column__c',
            'OpenSF__Board__c',
            'OpenSF__LexoRankPosition__c',
            'OpenSF__Color__c',
            'OpenSF__Priority__c',
            'OpenSF__Status__c',
            'OpenSF__CardType__c',
            'OpenSF__DueDate__c',
            'OpenSF__StoryPoints__c',
            'OpenSF__Assignee__c',
            'OpenSF__Assignee__r.Name',
            'OpenSF__Assignee__r.SmallPhotoUrl',
            'OpenSF__PeerReviewer__c',
            'OpenSF__PeerReviewer__r.Name',
            'OpenSF__Epic__c',
            'OpenSF__Epic__r.OpenSF__Subject__c',
            'OpenSF__Epic__r.OpenSF__Color__c',
            'OpenSF__Locked__c',
            'OpenSF__NeedsRefinement__c',
            'OpenSF__SequenceNumber__c',
            'OpenSF__DoneDate__c',
            'LastModifiedDate',
            'LastModifiedById'
        },
        ', '
    );

    /**
     * Standard column field list used across column queries.
     */
    public static final String COLUMN_FIELDS = String.join(
        new List<String>{
            'Id',
            'Name',
            'OpenSF__ColumnHeader__c',
            'OpenSF__LexoRankPosition__c',
            'OpenSF__Color__c',
            'OpenSF__Status__c',
            'OpenSF__CardCount__c',
            'OpenSF__Board__c',
            'OpenSF__Category__c',
            'OpenSF__WipLimit__c'
        },
        ', '
    );

    /**
     * Get Board by Id
     */
    public static OpenSF__Board__c getBoardById(Id boardId) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Description__c,
                OpenSF__Status__c,
                OpenSF__Type__c,
                OpenSF__Active__c,
                OpenSF__EmailNotifications__c,
                OpenSF__SalesforceNotifications__c,
                OpenSF__ActiveSprint__c,
                OpenSF__DoneCardRetentionDays__c
            FROM OpenSF__Board__c
            WHERE Id = :boardId
            WITH USER_MODE
            LIMIT 1
        ];
    }

    /**
     * Get Columns for a Board
     * Returns all columns (Status__c filter removed as columns don't have Active status)
     */
    public static List<OpenSF__Column__c> getColumnsByBoardId(Id boardId) {
        return Database.query(
            'SELECT ' +
                COLUMN_FIELDS +
                ' FROM OpenSF__Column__c' +
                ' WHERE OpenSF__Board__c = :boardId' +
                ' WITH USER_MODE' +
                ' ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST'
        );
    }

    /**
     * Get Cards for a Board
     * Filters out Done/Release cards (adjust as needed)
     */
    public static List<OpenSF__Card__c> getCardsByBoardId(Id boardId) {
        return Database.query(
            'SELECT ' +
                CARD_FIELDS +
                ' FROM OpenSF__Card__c' +
                ' WHERE OpenSF__Column__r.OpenSF__Board__c = :boardId' +
                ' WITH USER_MODE' +
                ' ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST'
        );
    }

    /**
     * Get Card by Id with full details
     */
    public static OpenSF__Card__c getCardById(Id cardId) {
        return Database.query(
            'SELECT ' +
                CARD_FIELDS +
                ' FROM OpenSF__Card__c' +
                ' WHERE Id = :cardId' +
                ' WITH USER_MODE' +
                ' LIMIT 1'
        );
    }

    /**
     * Get Cards by Column Id
     */
    public static List<OpenSF__Card__c> getCardsByColumnId(Id columnId) {
        return Database.query(
            'SELECT ' +
                CARD_FIELDS +
                ' FROM OpenSF__Card__c' +
                ' WHERE OpenSF__Column__c = :columnId' +
                ' WITH USER_MODE' +
                ' ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST'
        );
    }

    /**
     * Get Column by Id
     */
    public static OpenSF__Column__c getColumnById(Id columnId) {
        return Database.query(
            'SELECT ' +
                COLUMN_FIELDS +
                ' FROM OpenSF__Column__c' +
                ' WHERE Id = :columnId' +
                ' WITH USER_MODE' +
                ' LIMIT 1'
        );
    }

    /**
     * Get Card Status by Id (lightweight query for status check)
     */
    public static OpenSF__Card__c getCardStatusById(Id cardId) {
        return [
            SELECT Id, OpenSF__Status__c, OpenSF__SequenceNumber__c
            FROM OpenSF__Card__c
            WHERE Id = :cardId
            WITH USER_MODE
            LIMIT 1
        ];
    }

    /**
     * Get Cards by Ids (for bulk operations)
     */
    public static List<OpenSF__Card__c> getCardsByIds(List<Id> cardIds) {
        return Database.query(
            'SELECT ' +
                CARD_FIELDS +
                ' FROM OpenSF__Card__c' +
                ' WHERE Id IN :cardIds' +
                ' WITH USER_MODE'
        );
    }

    /**
     * Get backlog cards for a board (cards without a column assignment)
     */
    public static List<OpenSF__Card__c> getBacklogCardsByBoardId(Id boardId) {
        return Database.query(
            'SELECT ' +
                CARD_FIELDS +
                ' FROM OpenSF__Card__c' +
                ' WHERE OpenSF__Board__c = :boardId AND OpenSF__Column__c = NULL' +
                ' WITH USER_MODE' +
                ' ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST'
        );
    }

    /**
     * Get all Epic-type cards for a board (board cards + backlog cards)
     */
    public static List<OpenSF__Card__c> getEpicsByBoardId(Id boardId) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Subject__c,
                OpenSF__Color__c,
                OpenSF__Status__c,
                OpenSF__EpicCardsCount__c
            FROM OpenSF__Card__c
            WHERE
                (OpenSF__Column__r.OpenSF__Board__c = :boardId
                OR (OpenSF__Board__c = :boardId
                AND OpenSF__Column__c = NULL))
                AND OpenSF__CardType__c = 'Epic'
            WITH USER_MODE
            ORDER BY OpenSF__Subject__c ASC NULLS LAST
        ];
    }

    /**
     * Get child cards of a specific epic with column category info
     */
    public static List<OpenSF__Card__c> getChildCardsByEpicId(Id epicId) {
        return [
            SELECT
                Id,
                Name,
                OpenSF__Subject__c,
                OpenSF__Status__c,
                OpenSF__CardType__c,
                OpenSF__Priority__c,
                OpenSF__StoryPoints__c,
                OpenSF__Column__r.OpenSF__Category__c,
                OpenSF__Assignee__r.Name
            FROM OpenSF__Card__c
            WHERE OpenSF__Epic__c = :epicId
            WITH USER_MODE
            ORDER BY OpenSF__LexoRankPosition__c ASC NULLS LAST
        ];
    }

    /**
     * Search Users for assignment
     */
    public static List<User> searchUsers(String searchTerm) {
        String searchPattern =
            '%' +
            String.escapeSingleQuotes(searchTerm) +
            '%';
        return [
            SELECT Id, Name, Email, SmallPhotoUrl
            FROM User
            WHERE
                IsActive = TRUE
                AND (Name LIKE :searchPattern
                OR Email LIKE :searchPattern)
            WITH USER_MODE
            ORDER BY Name
            LIMIT 10
        ];
    }
}
