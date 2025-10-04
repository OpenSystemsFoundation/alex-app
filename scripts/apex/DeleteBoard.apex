// Delete a specific board by ID
OpenSF__Board__c board = [
    SELECT Id
    FROM OpenSF__Board__c
    WHERE Id = '{{BOARD_ID}}'
    LIMIT 1
];
delete board;
System.debug('Board deleted: {{BOARD_ID}}');
