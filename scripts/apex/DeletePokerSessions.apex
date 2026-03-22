List<OpenSF__PokerSession__c> sessions = [
    SELECT Id
    FROM OpenSF__PokerSession__c
];
Database.delete(sessions, false);
