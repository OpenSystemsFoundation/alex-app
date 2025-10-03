// Test the getBoardData method directly
Id boardId = 'a00JX00000Qv7DwYAJ';

KanbanBoardController.BoardData result = KanbanBoardController.getBoardData(boardId);

System.debug('Board: ' + result.board);
System.debug('Board Name: ' + result.board.Name);
System.debug('Columns count: ' + result.columns.size());
System.debug('Cards count: ' + result.cards.size());

if (result.columns != null && result.columns.size() > 0) {
    System.debug('First column: ' + result.columns[0].Name);
    for (Column__c col : result.columns) {
        System.debug('  Column: ' + col.ColumnHeader__c + ' (Status: ' + col.Status__c + ')');
    }
} else {
    System.debug('NO COLUMNS RETURNED!');
    
    // Check if columns exist
    List<Column__c> directQuery = [
        SELECT Id, Name, ColumnHeader__c, Status__c, Board__c
        FROM Column__c
        WHERE Board__c = :boardId
    ];
    System.debug('Direct query found ' + directQuery.size() + ' columns');
    for (Column__c col : directQuery) {
        System.debug('  Direct: ' + col.Name + ' - ' + col.ColumnHeader__c + ' (Status: ' + col.Status__c + ')');
    }
}
