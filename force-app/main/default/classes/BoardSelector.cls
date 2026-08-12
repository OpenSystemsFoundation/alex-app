/**
 * BoardSelector - Centralized selector for Board__c queries.
 * Extracts board SOQL from AdminController and provides reusable query methods.
 */
public with sharing class BoardSelector {
    /**
     * Fields queried for board list views and admin pages.
     */
    private static final String BOARD_LIST_FIELDS =
        'Id, Name, OpenSF__Description__c, ' +
        'OpenSF__Status__c, OpenSF__Type__c, OpenSF__Active__c, ' +
        'OpenSF__EmailNotifications__c, OpenSF__SalesforceNotifications__c, ' +
        'OpenSF__ActiveSprint__c, OpenSF__ColumnCount__c';

    /**
     * Get all boards ordered by name (for admin listing).
     */
    public static List<OpenSF__Board__c> getAllBoards() {
        return Database.query(
            'SELECT ' +
                BOARD_LIST_FIELDS +
                ' FROM OpenSF__Board__c' +
                ' WITH USER_MODE' +
                ' ORDER BY Name ASC'
        );
    }

    /**
     * Get a single board by Id with list fields (for re-query after create/update).
     */
    public static OpenSF__Board__c getBoardWithListFields(Id boardId) {
        List<OpenSF__Board__c> boards = Database.query(
            'SELECT ' +
                BOARD_LIST_FIELDS +
                ' FROM OpenSF__Board__c' +
                ' WHERE Id = :boardId' +
                ' WITH USER_MODE' +
                ' LIMIT 1'
        );
        return boards.isEmpty() ? null : boards[0];
    }

    /**
     * Get onboarding status counts (boards, columns, cards, permission sets).
     */
    public static AdminController.OnboardingStatus getOnboardingStatus() {
        AdminController.OnboardingStatus status = new AdminController.OnboardingStatus();

        status.hasBoardsCreated =
            [SELECT COUNT() FROM OpenSF__Board__c WITH USER_MODE] > 0;

        status.hasColumnsConfigured =
            [SELECT COUNT() FROM OpenSF__Column__c WITH USER_MODE] > 0;

        // PermissionSet.Name never includes the namespace prefix — the
        // namespace lives in PermissionSet.NamespacePrefix.
        status.hasUsersAssigned =
            [
                SELECT COUNT()
                FROM PermissionSetAssignment
                WHERE
                    PermissionSet.Name IN ('Alex_Admin', 'Alex_User')
                    AND AssigneeId != :UserInfo.getUserId()
                WITH USER_MODE
            ] > 0;

        status.hasCardsCreated =
            [SELECT COUNT() FROM OpenSF__Card__c WITH USER_MODE] > 0;

        status.isComplete =
            status.hasBoardsCreated &&
            status.hasColumnsConfigured &&
            status.hasUsersAssigned;

        return status;
    }
}
