List<OpenSF__Column__c> columns = [SELECT Id FROM OpenSF__Column__c];
Database.delete(columns, false);
