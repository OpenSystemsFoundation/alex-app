List<OpenSF__Sprint__c> sprints = [SELECT Id FROM OpenSF__Sprint__c];
Database.delete(sprints, false);
