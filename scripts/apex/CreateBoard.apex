// Create a test board with columns
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = 'Sample Board',
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false
);
insert board;

List<String> columnHeaders = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();

for (Integer i = 0; i < columnHeaders.size(); i++) {
    String position = generateLexorank(i, columnHeaders.size());
    columns.add(
        new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = columnHeaders[i],
            OpenSF__LexoRankPosition__c = position
        )
    );
}
insert columns;

System.debug('BOARD_ID:' + board.Id);

// Helper method to generate LexoRank positions
private static String generateLexorank(Integer index, Integer total) {
    if (total <= 1) {
        return '0|hzzzzz:';
    }

    String base36Chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    Integer increment = (Integer) (Math.pow(36, 5) / (total + 1));
    Integer positionValue = increment * (index + 1);

    String positionStr = '';
    Integer temp = positionValue;

    for (Integer i = 0; i < 5; i++) {
        positionStr =
            base36Chars.substring(Math.mod(temp, 36), Math.mod(temp, 36) + 1) +
            positionStr;
        temp = temp / 36;
    }

    return '0|h' + positionStr + ':';
}
