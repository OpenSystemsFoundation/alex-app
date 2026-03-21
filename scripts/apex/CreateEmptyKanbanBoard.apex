// Creates an empty Kanban board with 6 columns, no cards
private static String generateLexorank(Integer idx, Integer total) {
    if (total <= 1)
        return '0|hzzzzz:';
    String chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    Integer inc = (Integer) (Math.pow(36, 5) / (total + 1));
    Integer val = inc * (idx + 1);
    String pos = '';
    Integer tmp = val;
    for (Integer i = 0; i < 5; i++) {
        pos = chars.substring(Math.mod(tmp, 36), Math.mod(tmp, 36) + 1) + pos;
        tmp = tmp / 36;
    }
    return '0|h' + pos + ':';
}

OpenSF__Board__c board = new OpenSF__Board__c(
    Name = 'Empty Kanban Board',
    OpenSF__Status__c = 'Published',
    OpenSF__Type__c = 'Project',
    OpenSF__Active__c = true,
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false,
    OpenSF__Description__c = 'An empty kanban board ready for use.'
);
insert board;

List<String> headers = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<String> statuses = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<String> categories = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<String> colors = new List<String>{
    '#3A49DA',
    '#1B96FF',
    '#F38303',
    '#9050E9',
    '#06A59A',
    '#2E844A'
};
List<Integer> wipLimits = new List<Integer>{ null, 5, 3, 3, 2, null };

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
for (Integer i = 0; i < headers.size(); i++) {
    OpenSF__Column__c col = new OpenSF__Column__c(
        OpenSF__Board__c = board.Id,
        OpenSF__ColumnHeader__c = headers[i],
        OpenSF__Status__c = statuses[i],
        OpenSF__Category__c = categories[i],
        OpenSF__Color__c = colors[i],
        OpenSF__LexoRankPosition__c = generateLexorank(i, headers.size())
    );
    if (wipLimits[i] != null) {
        col.OpenSF__WipLimit__c = wipLimits[i];
    }
    columns.add(col);
}
insert columns;

System.debug('CREATED Empty Kanban Board: ' + board.Id);
