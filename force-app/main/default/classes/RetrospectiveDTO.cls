/**
 * RetrospectiveDTO - Data Transfer Objects for Retrospective Board
 * Maps namespaced objects to plain objects for LWC consumption
 */
public with sharing class RetrospectiveDTO {
    /**
     * Retrospective DTO
     */
    public class RetroDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id sprintId;
        @AuraEnabled
        public String sprintName;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public String boardName;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String template;
        @AuraEnabled
        public Boolean showAlways;
        @AuraEnabled
        public Boolean revealed;
        @AuraEnabled
        public Decimal maxVotesPerUser;

        public RetroDTO(OpenSF__Retrospective__c retro) {
            this.Id = retro.Id;
            this.Name = retro.Name;
            this.status = retro.OpenSF__Status__c;
            this.template = retro.OpenSF__Template__c;
            this.showAlways = retro.OpenSF__ShowAlways__c;
            this.revealed = retro.OpenSF__Revealed__c;
            this.maxVotesPerUser = retro.OpenSF__MaxVotesPerUser__c;
            try {
                this.sprintId = retro.OpenSF__Sprint__c;
                this.sprintName = retro.OpenSF__Sprint__r?.Name;
            } catch (Exception e) {
                this.sprintId = null;
            }
            try {
                this.boardId = retro.OpenSF__Board__c;
                this.boardName = retro.OpenSF__Board__r?.Name;
            } catch (Exception e) {
                this.boardId = null;
            }
        }
    }

    /**
     * Retro Card DTO
     */
    public class RetroCardDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id retrospectiveId;
        @AuraEnabled
        public String category;
        @AuraEnabled
        public String text;
        @AuraEnabled
        public Id authorId;
        @AuraEnabled
        public String authorName;
        @AuraEnabled
        public String authorPhotoUrl;
        @AuraEnabled
        public Decimal voteCount;
        @AuraEnabled
        public Decimal position;
        @AuraEnabled
        public Boolean hasVoted;
        @AuraEnabled
        public Id actionItemCardId;
        @AuraEnabled
        public String actionItemCardName;

        public RetroCardDTO(OpenSF__RetroCard__c card) {
            this.Id = card.Id;
            this.Name = card.Name;
            this.retrospectiveId = card.OpenSF__Retrospective__c;
            this.category = card.OpenSF__Category__c;
            this.text = card.OpenSF__Text__c;
            this.authorId = card.OpenSF__Author__c;
            this.voteCount = card.OpenSF__VoteCount__c != null
                ? card.OpenSF__VoteCount__c
                : 0;
            this.position = card.OpenSF__Position__c;
            this.hasVoted = false; // Set by service layer

            if (card.OpenSF__Author__r != null) {
                this.authorName = card.OpenSF__Author__r.Name;
                try {
                    this.authorPhotoUrl = card.OpenSF__Author__r.SmallPhotoUrl;
                } catch (Exception e) {
                    this.authorPhotoUrl = null;
                }
            }

            try {
                this.actionItemCardId = card.OpenSF__ActionItemCard__c;
                this.actionItemCardName = card.OpenSF__ActionItemCard__r?.Name;
            } catch (Exception e) {
                this.actionItemCardId = null;
            }
        }
    }

    /**
     * Template categories configuration
     */
    public static List<String> getCategoriesForTemplate(String template) {
        if (template == null) {
            template = 'Start_Stop_Continue';
        }
        switch on template {
            when 'Start_Stop_Continue' {
                return new List<String>{ 'Start', 'Stop', 'Continue' };
            }
            when 'Mad_Sad_Glad' {
                return new List<String>{ 'Mad', 'Sad', 'Glad' };
            }
            when 'Four_Ls' {
                return new List<String>{
                    'Liked',
                    'Learned',
                    'Lacked',
                    'Longed For'
                };
            }
            when 'Went_Well_Improve' {
                return new List<String>{
                    'Went Well',
                    'To Improve',
                    'Action Items'
                };
            }
            when else {
                return new List<String>{ 'Start', 'Stop', 'Continue' };
            }
        }
    }
}
