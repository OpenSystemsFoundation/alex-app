/**
 * @description This class provides utility methods for creating test data for OpenSF__Board__c, OpenSF__Column__c, and OpenSF__Card__c records.
 * It is used to facilitate unit testing by generating the necessary data setup.
 * @author Open Systems Foundation
 * @date 13-Nov-2024
 */
@isTest
public class TestDataFactory {
    /**
     * @description Create a test OpenSF__Board__c record with the specified name.
     *
     * @param name The name of the board.
     * @return The created OpenSF__Board__c record.
     */
    public static OpenSF__Board__c createBoard(String name) {
        OpenSF__Board__c board = new OpenSF__Board__c(Name = name);
        insert board;
        return board;
    }

    /**
     * @description Create a test OpenSF__Column__c record for a specific board.
     *
     * @param boardId The Id of the board.
     * @return The created OpenSF__Column__c record.
     */
    public static OpenSF__Column__c createColumn(Id boardId) {
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__Board__c = boardId,
            OpenSF__Position__c = 1 // Set a default position
        );
        insert column;
        return column;
    }

    /**
     * @description Create multiple test OpenSF__Column__c records for a specific board.
     *
     * @param boardId The Id of the board.
     * @param count The number of columns to create.
     * @return A list of created OpenSF__Column__c records.
     */
    public static List<OpenSF__Column__c> createColumns(
        Id boardId,
        Integer count
    ) {
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        for (Integer i = 1; i <= count; i++) {
            columns.add(
                new OpenSF__Column__c(
                    OpenSF__Board__c = boardId,
                    OpenSF__Position__c = i
                )
            );
        }
        insert columns;
        return columns;
    }

    /**
     * @description Create a test OpenSF__Card__c record for a specific column with the specified position.
     *
     * @param columnId The Id of the column.
     * @param position The position of the card.
     * @return The created OpenSF__Card__c record.
     */
    public static OpenSF__Card__c createCard(Id columnId, Integer position) {
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Column__c = columnId,
            OpenSF__Position__c = position
        );
        insert card;
        return card;
    }

    /**
     * @description Create a test OpenSF__Card__c record of type 'Epic'.
     *
     * @return The created OpenSF__Card__c record of type 'Epic'.
     */
    public static OpenSF__Card__c createEpic() {
        OpenSF__Card__c epicCard = new OpenSF__Card__c(
            OpenSF__CardType__c = 'Epic'
        );
        insert epicCard;
        return epicCard;
    }

    /**
     * @description Create multiple test OpenSF__Card__c records for a specific column.
     *
     * @param columnId The Id of the column.
     * @param count The number of cards to create.
     * @return A list of created OpenSF__Card__c records.
     */
    public static List<OpenSF__Card__c> createCards(
        Id columnId,
        Integer count
    ) {
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        for (Integer i = 1; i <= count; i++) {
            cards.add(
                new OpenSF__Card__c(
                    OpenSF__Column__c = columnId,
                    OpenSF__Position__c = i
                )
            );
        }
        insert cards;
        return cards;
    }

    /**
     * @description Create a Standard Profile User and assign the AlexAdmin permission set.
     *
     * @return The created User record.
     */
    public static User createStandardUser() {
        Profile p = [
            SELECT Id
            FROM Profile
            WHERE UserLicense.Name = 'Salesforce'
            LIMIT 1
        ];
        User user = new User(
            Alias = 'stduser',
            Email = 'standarduser' +
                System.currentTimeMillis() +
                '@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'User',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'standarduser' +
                System.currentTimeMillis() +
                '@example.com'
        );
        insert user;

        PermissionSet ps = [
            SELECT Id
            FROM PermissionSet
            WHERE Name = 'Alex_Admin'
            LIMIT 1
        ];
        PermissionSetAssignment psa = new PermissionSetAssignment(
            AssigneeId = user.Id,
            PermissionSetId = ps.Id
        );
        insert psa;

        return user;
    }
}
