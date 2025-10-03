/**
 * @description Factory class for creating test data
 * Centralizes test data creation to ensure consistency across all test classes
 */
@isTest
public class TestFactory {
    
    /**
     * Creates a test Board with default or custom values
     * @param boardName The name of the board
     * @param status The status of the board (Draft, Published, Closed)
     * @param boardType The type of board (Project, Personal, Team)
     * @return The created Board record
     */
    public static OpenSF__Board__c createBoard(String boardName, String status, String boardType) {
        OpenSF__Board__c board = new OpenSF__Board__c(
            Name = boardName,
            OpenSF__Status__c = status,
            OpenSF__Type__c = boardType,
            OpenSF__Description__c = 'Test Description',
            OpenSF__Active__c = true,
            OpenSF__EmailNotifications__c = true,
            OpenSF__SalesforceNotifications__c = true
        );
        insert board;
        return board;
    }
    
    /**
     * Creates a test Board with default values (Published, Project)
     * @param boardName The name of the board
     * @return The created Board record
     */
    public static OpenSF__Board__c createBoard(String boardName) {
        return createBoard(boardName, 'Published', 'Project');
    }
    
    /**
     * Creates multiple test Boards
     * @param count Number of boards to create
     * @param status The status for all boards
     * @param boardType The type for all boards
     * @return List of created Board records
     */
    public static List<OpenSF__Board__c> createBoards(Integer count, String status, String boardType) {
        List<OpenSF__Board__c> boards = new List<OpenSF__Board__c>();
        for (Integer i = 0; i < count; i++) {
            boards.add(new OpenSF__Board__c(
                Name = 'Test Board ' + i,
                OpenSF__Status__c = status,
                OpenSF__Type__c = boardType,
                OpenSF__Description__c = 'Test Board Description ' + i,
                OpenSF__Active__c = true
            ));
        }
        insert boards;
        return boards;
    }
    
    /**
     * Creates a test Column with default or custom values
     * @param boardId The ID of the parent board
     * @param columnHeader The header text for the column
     * @param position The position of the column
     * @param color The color of the column (hex value)
     * @return The created Column record
     */
    public static OpenSF__Column__c createColumn(Id boardId, String columnHeader, String position, String color) {
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__Board__c = boardId,
            OpenSF__ColumnHeader__c = columnHeader,
            OpenSF__LexoRankPosition__c = position,
            OpenSF__Color__c = color,
            OpenSF__Status__c = columnHeader
        );
        insert column;
        return column;
    }
    
    /**
     * Creates a test Column with default values
     * @param boardId The ID of the parent board
     * @param columnHeader The header text for the column
     * @return The created Column record
     */
    public static OpenSF__Column__c createColumn(Id boardId, String columnHeader) {
        return createColumn(boardId, columnHeader, LexoRank.initial(), '#1B96FF');
    }
    
    /**
     * Creates multiple test Columns for a board
     * @param boardId The ID of the parent board
     * @param count Number of columns to create
     * @return List of created Column records
     */
    public static List<OpenSF__Column__c> createColumns(Id boardId, Integer count) {
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        String previousPosition = null;
        
        for (Integer i = 0; i < count; i++) {
            String position = LexoRank.between(previousPosition, null);
            String columnHeader = 'Column ' + i;
            columns.add(new OpenSF__Column__c(
                OpenSF__Board__c = boardId,
                OpenSF__ColumnHeader__c = columnHeader,
                OpenSF__LexoRankPosition__c = position,
                OpenSF__Color__c = '#1B96FF',
                OpenSF__Status__c = columnHeader
            ));
            previousPosition = position;
        }
        insert columns;
        return columns;
    }
    
    /**
     * Creates a test Card with default or custom values
     * @param columnId The ID of the parent column
     * @param subject The subject/title of the card
     * @param cardType The type of card (Story, Bug, Improvement, Spike, Task, Epic)
     * @param status The status of the card (Backlog, To Do, In Progress, etc.)
     * @param position The position of the card
     * @return The created Card record
     */
    public static OpenSF__Card__c createCard(Id columnId, String subject, String cardType, String status, String position) {
        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Column__c = columnId,
            OpenSF__Subject__c = subject,
            OpenSF__CardType__c = cardType,
            OpenSF__Status__c = status,
            OpenSF__LexoRankPosition__c = position,
            OpenSF__Description__c = 'Test card description',
            OpenSF__Priority__c = 'High'
        );
        insert card;
        return card;
    }
    
    /**
     * Creates a test Card with default values (Story type, To Do status)
     * @param columnId The ID of the parent column
     * @param subject The subject/title of the card
     * @return The created Card record
     */
    public static OpenSF__Card__c createCard(Id columnId, String subject) {
        return createCard(columnId, subject, 'Story', 'To Do', LexoRank.initial());
    }
    
    /**
     * Creates multiple test Cards for a column
     * @param columnId The ID of the parent column
     * @param count Number of cards to create
     * @param cardType The type for all cards
     * @param status The status for all cards
     * @return List of created Card records
     */
    public static List<OpenSF__Card__c> createCards(Id columnId, Integer count, String cardType, String status) {
        List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();
        String previousPosition = null;
        
        for (Integer i = 0; i < count; i++) {
            String position = LexoRank.between(previousPosition, null);
            cards.add(new OpenSF__Card__c(
                OpenSF__Column__c = columnId,
                OpenSF__Subject__c = 'Test Card ' + i,
                OpenSF__CardType__c = cardType,
                OpenSF__Status__c = status,
                OpenSF__LexoRankPosition__c = position,
                OpenSF__Description__c = 'Test card description ' + i,
                OpenSF__Priority__c = 'High'
            ));
            previousPosition = position;
        }
        insert cards;
        return cards;
    }
    
    /**
     * Creates multiple test Cards with default values
     * @param columnId The ID of the parent column
     * @param count Number of cards to create
     * @return List of created Card records
     */
    public static List<OpenSF__Card__c> createCards(Id columnId, Integer count) {
        return createCards(columnId, count, 'Story', 'To Do');
    }
    
    /**
     * Creates a complete test hierarchy: Board -> Columns -> Cards
     * @param boardName The name of the board
     * @param columnCount Number of columns to create
     * @param cardsPerColumn Number of cards per column
     * @return Map with 'board', 'columns', and 'cards' keys
     */
    public static Map<String, Object> createFullBoardHierarchy(String boardName, Integer columnCount, Integer cardsPerColumn) {
        OpenSF__Board__c board = createBoard(boardName);
        List<OpenSF__Column__c> columns = createColumns(board.Id, columnCount);
        List<OpenSF__Card__c> allCards = new List<OpenSF__Card__c>();
        
        for (OpenSF__Column__c column : columns) {
            allCards.addAll(createCards(column.Id, cardsPerColumn));
        }
        
        return new Map<String, Object>{
            'board' => board,
            'columns' => columns,
            'cards' => allCards
        };
    }
    
    /**
     * Creates a test User (standard user, not for DML)
     * @param firstName First name of the user
     * @param lastName Last name of the user
     * @param email Email of the user
     * @return User object (not inserted)
     */
    public static User createTestUser(String firstName, String lastName, String email) {
        // Note: User DML is restricted in tests, so this returns an object without inserting
        return new User(
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Username = email + '.test@example.com',
            Alias = firstName.substring(0, 1) + lastName.substring(0, 1),
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            ProfileId = UserInfo.getProfileId(),
            LanguageLocaleKey = 'en_US'
        );
    }
}
