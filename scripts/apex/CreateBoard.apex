// Create a test board with columns
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = '{{BOARD_NAME}}'
);
insert board;

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
{{COLUMNS}}
insert columns;

System.debug('BOARD_ID:' + board.Id);
