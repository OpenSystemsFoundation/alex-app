/**
 * KanbanBoardDTO - Data Transfer Objects for Kanban Board
 * Maps namespaced objects to plain objects for LWC consumption
 */
public with sharing class KanbanBoardDTO {
    
    /**
     * Board DTO
     */
    public class BoardDTO {
        @AuraEnabled public Id Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String description;
        @AuraEnabled public String status;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean active;
        @AuraEnabled public Boolean emailNotifications;
        @AuraEnabled public Boolean salesforceNotifications;
        
        public BoardDTO(OpenSF__Board__c board) {
            this.Id = board.Id;
            this.Name = board.Name;
            this.description = board.OpenSF__Description__c;
            this.status = board.OpenSF__Status__c;
            this.type = board.OpenSF__Type__c;
            this.active = board.OpenSF__Active__c;
            this.emailNotifications = board.OpenSF__EmailNotifications__c;
            this.salesforceNotifications = board.OpenSF__SalesforceNotifications__c;
        }
    }
    
    /**
     * Column DTO
     */
    public class ColumnDTO {
        @AuraEnabled public Id Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String columnHeader;
        @AuraEnabled public String position;
        @AuraEnabled public String color;
        @AuraEnabled public String status;
        @AuraEnabled public Decimal cardCount;
        @AuraEnabled public Id boardId;
        
        public ColumnDTO(OpenSF__Column__c column) {
            this.Id = column.Id;
            this.Name = column.Name;
            this.columnHeader = column.OpenSF__ColumnHeader__c;
            this.position = column.OpenSF__Position__c;
            this.color = column.OpenSF__Color__c;
            this.status = column.OpenSF__Status__c;
            this.cardCount = column.OpenSF__CardCount__c;
            this.boardId = column.OpenSF__Board__c;
        }
    }
    
    /**
     * Card DTO with nested User DTO
     */
    public class CardDTO {
        @AuraEnabled public Id Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String subject;
        @AuraEnabled public String description;
        @AuraEnabled public Id columnId;
        @AuraEnabled public String position;
        @AuraEnabled public String color;
        @AuraEnabled public String priority;
        @AuraEnabled public String status;
        @AuraEnabled public String cardType;
        @AuraEnabled public Date dueDate;
        @AuraEnabled public Decimal storyPoints;
        @AuraEnabled public Id assigneeId;
        @AuraEnabled public UserDTO assignee;
        @AuraEnabled public Id peerReviewerId;
        @AuraEnabled public UserDTO peerReviewer;
        @AuraEnabled public Id epicId;
        @AuraEnabled public EpicDTO epic;
        @AuraEnabled public Boolean locked;
        @AuraEnabled public DateTime lastModifiedDate;
        
        public CardDTO(OpenSF__Card__c card) {
            this.Id = card.Id;
            this.Name = card.Name;
            this.subject = card.OpenSF__Subject__c;
            this.description = card.OpenSF__Description__c;
            this.columnId = card.OpenSF__Column__c;
            this.position = card.OpenSF__Position__c;
            this.color = card.OpenSF__Color__c;
            this.priority = card.OpenSF__Priority__c;
            this.status = card.OpenSF__Status__c;
            this.cardType = card.OpenSF__CardType__c;
            this.dueDate = card.OpenSF__DueDate__c;
            this.storyPoints = card.OpenSF__StoryPoints__c;
            this.assigneeId = card.OpenSF__Assignee__c;
            this.peerReviewerId = card.OpenSF__PeerReviewer__c;
            this.epicId = card.OpenSF__Epic__c;
            this.locked = card.OpenSF__Locked__c;
            this.lastModifiedDate = card.LastModifiedDate;
            
            // Map nested relationships
            if (card.OpenSF__Assignee__r != null) {
                this.assignee = new UserDTO(card.OpenSF__Assignee__r);
            }
            if (card.OpenSF__PeerReviewer__r != null) {
                this.peerReviewer = new UserDTO(card.OpenSF__PeerReviewer__r);
            }
            if (card.OpenSF__Epic__r != null) {
                this.epic = new EpicDTO(card.OpenSF__Epic__r);
            }
        }
    }
    
    /**
     * User DTO for related users
     */
    public class UserDTO {
        @AuraEnabled public String name;
        @AuraEnabled public String photoUrl;
        
        public UserDTO(User user) {
            this.name = user.Name;
            this.photoUrl = user.SmallPhotoUrl;
        }
    }
    
    /**
     * Epic DTO for related epic cards
     */
    public class EpicDTO {
        @AuraEnabled public String subject;
        
        public EpicDTO(OpenSF__Card__c epic) {
            this.subject = epic.OpenSF__Subject__c;
        }
    }
    
    /**
     * Convert list of boards
     */
    public static List<BoardDTO> convertBoards(List<OpenSF__Board__c> boards) {
        List<BoardDTO> result = new List<BoardDTO>();
        for (OpenSF__Board__c board : boards) {
            result.add(new BoardDTO(board));
        }
        return result;
    }
    
    /**
     * Convert list of columns
     */
    public static List<ColumnDTO> convertColumns(List<OpenSF__Column__c> columns) {
        List<ColumnDTO> result = new List<ColumnDTO>();
        for (OpenSF__Column__c column : columns) {
            result.add(new ColumnDTO(column));
        }
        return result;
    }
    
    /**
     * Convert list of cards
     */
    public static List<CardDTO> convertCards(List<OpenSF__Card__c> cards) {
        List<CardDTO> result = new List<CardDTO>();
        for (OpenSF__Card__c card : cards) {
            result.add(new CardDTO(card));
        }
        return result;
    }
}
