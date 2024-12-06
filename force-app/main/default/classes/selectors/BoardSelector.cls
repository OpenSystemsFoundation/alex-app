/**
 * @description This class provides services related to Board operations, encapsulating business logic for managing board-related data and operations.
 * @author Open Systems Foundation
 * @date 13-Nov-2024
 */
public with sharing class BoardSelector {
    // Selector Fields
    private static final String CARD_FIELDS = 'Id, Name, OpenSF__Column__c, OpenSF__StoryPoints__c, OpenSF__Subject__c, OpenSF__Status__c, OpenSF__Priority__c, OpenSF__CardType__c, OpenSF__Assignee__c, OpenSF__Assignee__r.Name, OpenSF__Assignee__r.SmallPhotoUrl, OpenSF__Position__c, LastModifiedDate';
    private static final String COLUMN_FIELDS = 'Id, Name, OpenSF__Board__c, OpenSF__ColumnHeader__c, OpenSF__Position__c, OpenSF__Status__c, LastModifiedDate';
    private static final String BOARD_FIELDS = 'Id, Name, LastModifiedDate';

    private static Boolean isTestRunning = Test.isRunningTest();

    /**
     * @description Retrieves a board by its Id.
     * @param boardId The Id of the board to retrieve.
     * @return The board record, or null if not found.
     */
    public static OpenSF__Board__c getBoardById(Id boardId) {
        if (boardId == null) {
            return null;
        }
        List<OpenSF__Board__c> boardRecords;
        if (isTestRunning) {
            boardRecords = [
                SELECT Id, Name, LastModifiedDate
                FROM OpenSF__Board__c
                WHERE Id = :boardId
                LIMIT 1
            ];
        } else {
            boardRecords = [
                SELECT Id, Name, LastModifiedDate
                FROM OpenSF__Board__c
                WHERE Id = :boardId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
        }
        return boardRecords.isEmpty() ? null : boardRecords[0];
    }

    /**
     * @description Retrieves columns associated with a specific board Id.
     * @param boardId The Id of the board whose columns are to be retrieved.
     * @return A list of columns associated with the specified board.
     */
    public static List<OpenSF__Column__c> getColumnsByBoardId(Id boardId) {
        if (boardId == null) {
            return new List<OpenSF__Column__c>();
        }
        if (isTestRunning) {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Board__c,
                    OpenSF__Color__c,
                    OpenSF__ColumnHeader__c,
                    OpenSF__Position__c,
                    OpenSF__Status__c,
                    LastModifiedDate
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :boardId
                ORDER BY OpenSF__Position__c
            ];
        } else {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Board__c,
                    OpenSF__Color__c,
                    OpenSF__ColumnHeader__c,
                    OpenSF__Position__c,
                    OpenSF__Status__c,
                    LastModifiedDate
                FROM OpenSF__Column__c
                WHERE OpenSF__Board__c = :boardId
                WITH SECURITY_ENFORCED
                ORDER BY OpenSF__Position__c
            ];
        }
    }

    /**
     * @description Retrieves cards associated with a set of column Ids.
     * @param columnIds The set of column Ids whose cards are to be retrieved.
     * @return A list of cards associated with the specified columns.
     */
    public static List<OpenSF__Card__c> getCardsByColumnIds(Set<Id> columnIds) {
        if (columnIds == null || columnIds.isEmpty()) {
            return new List<OpenSF__Card__c>();
        }
        if (isTestRunning) {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c IN :columnIds
                ORDER BY OpenSF__Position__c
            ];
        } else {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c IN :columnIds
                WITH SECURITY_ENFORCED
                ORDER BY OpenSF__Position__c
            ];
        }
    }

    /**
     * @description Retrieves cards associated with a specific column Id.
     * @param columnId The Id of the column whose cards are to be retrieved.
     * @return A list of cards associated with the specified column.
     */
    public static List<OpenSF__Card__c> getCardsByColumnId(Id columnId) {
        if (columnId == null) {
            return new List<OpenSF__Card__c>();
        }
        if (isTestRunning) {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
                ORDER BY OpenSF__Position__c
            ];
        } else {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
                WITH SECURITY_ENFORCED
                ORDER BY OpenSF__Position__c
            ];
        }
    }

    /**
     * @description Retrieves a card by its Id.
     * @param cardId The Id of the card to retrieve.
     * @return The card record, or null if not found.
     */
    public static OpenSF__Card__c getCardById(Id cardId) {
        if (cardId == null) {
            return null;
        }
        List<OpenSF__Card__c> cardRecords;
        if (isTestRunning) {
            cardRecords = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE Id = :cardId
                LIMIT 1
            ];
        } else {
            cardRecords = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE Id = :cardId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
        }
        return cardRecords.isEmpty() ? null : cardRecords[0];
    }

    /**
     * @description Retrieves cards by their Ids.
     * @param cardIds The set of card Ids to retrieve.
     * @return A list of card records associated with the specified Ids.
     */
    public static List<OpenSF__Card__c> getCardsById(Set<Id> cardIds) {
        if (cardIds == null || cardIds.isEmpty()) {
            return new List<OpenSF__Card__c>();
        }
        if (isTestRunning) {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE Id IN :cardIds
            ];
        } else {
            return [
                SELECT
                    Id,
                    Name,
                    OpenSF__Color__c,
                    OpenSF__Column__c,
                    OpenSF__StoryPoints__c,
                    OpenSF__Subject__c,
                    OpenSF__Status__c,
                    OpenSF__Priority__c,
                    OpenSF__CardType__c,
                    OpenSF__Assignee__c,
                    OpenSF__Assignee__r.Name,
                    OpenSF__Assignee__r.SmallPhotoUrl,
                    OpenSF__Position__c,
                    LastModifiedDate
                FROM OpenSF__Card__c
                WHERE Id IN :cardIds
                WITH SECURITY_ENFORCED
            ];
        }
    }

    /**
     * @description Retrieves the maximum card position within a specific column.
     * @param columnId The Id of the column whose maximum card position is to be retrieved.
     * @return The maximum card position within the specified column.
     */
    public static Integer getMaxCardPosition(Id columnId) {
        if (columnId == null) {
            return 0;
        }
        AggregateResult result;
        if (isTestRunning) {
            result = [
                SELECT MAX(OpenSF__Position__c) maxPosition
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
            ];
        } else {
            result = [
                SELECT MAX(OpenSF__Position__c) maxPosition
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
                WITH SECURITY_ENFORCED
            ];
        }
        Decimal maxPositionDecimal = (Decimal) result.get('maxPosition');
        return maxPositionDecimal != null ? maxPositionDecimal.intValue() : 0;
    }

    /**
     * @description Counts the number of cards in a specific column.
     * @param columnId The Id of the column whose cards are to be counted.
     * @return The number of cards in the specified column.
     */
    public static Integer countCardsByColumnId(Id columnId) {
        if (columnId == null) {
            return 0;
        }
        AggregateResult result;
        if (isTestRunning) {
            result = [
                SELECT COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
            ];
        } else {
            result = [
                SELECT COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Column__c = :columnId
                WITH SECURITY_ENFORCED
            ];
        }
        return (Integer) result.get('cardCount');
    }

    /**
     * @description Counts the number of child cards of a specific card with CardType 'Epic'.
     * @param epicCardId The Id of the epic card whose child cards are to be counted.
     * @return The number of child cards associated with the specified epic card.
     */
    public static Integer countEpicCards(Id epicCardId) {
        if (epicCardId == null) {
            return 0;
        }
        AggregateResult result;
        if (isTestRunning) {
            result = [
                SELECT COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Epic__c = :epicCardId
            ];
        } else {
            result = [
                SELECT COUNT(Id) cardCount
                FROM OpenSF__Card__c
                WHERE OpenSF__Epic__c = :epicCardId
                WITH SECURITY_ENFORCED
            ];
        }
        return (Integer) result.get('cardCount');
    }
}
