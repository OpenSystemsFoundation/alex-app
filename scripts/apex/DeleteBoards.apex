List<OpenSF__Board__c> boards = [SELECT Id FROM OpenSF__Board__c];
Database.delete(boards, false);
