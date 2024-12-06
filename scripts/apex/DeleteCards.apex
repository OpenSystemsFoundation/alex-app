List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
Database.delete(cards, false);
