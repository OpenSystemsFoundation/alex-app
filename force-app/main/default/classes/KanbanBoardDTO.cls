/**
 * KanbanBoardDTO - Data Transfer Objects for Kanban Board
 * Maps namespaced objects to plain objects for LWC consumption
 */
public with sharing class KanbanBoardDTO {
    /**
     * Board DTO
     */
    public class BoardDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public String description;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String type;
        @AuraEnabled
        public Boolean active;
        @AuraEnabled
        public Boolean emailNotifications;
        @AuraEnabled
        public Boolean salesforceNotifications;
        @AuraEnabled
        public Id activeSprintId;
        @AuraEnabled
        public Decimal doneCardRetentionDays;

        public BoardDTO(OpenSF__Board__c board) {
            this.Id = board.Id;
            this.Name = board.Name;
            this.description = board.OpenSF__Description__c;
            this.status = board.OpenSF__Status__c;
            this.type = board.OpenSF__Type__c;
            this.active = board.OpenSF__Active__c;
            this.emailNotifications = board.OpenSF__EmailNotifications__c;
            this.salesforceNotifications = board.OpenSF__SalesforceNotifications__c;
            // Sprint field may not always be queried
            try {
                this.activeSprintId = board.OpenSF__ActiveSprint__c;
            } catch (Exception e) {
                this.activeSprintId = null;
            }
            try {
                this.doneCardRetentionDays = board.OpenSF__DoneCardRetentionDays__c;
            } catch (Exception e) {
                this.doneCardRetentionDays = 7;
            }
        }
    }

    /**
     * Column DTO
     */
    public class ColumnDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public String columnHeader;
        @AuraEnabled
        public String position;
        @AuraEnabled
        public String color;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public Decimal cardCount;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public String category;

        public ColumnDTO(OpenSF__Column__c column) {
            this.Id = column.Id;
            this.Name = column.Name;
            this.columnHeader = column.OpenSF__ColumnHeader__c;
            this.position = column.OpenSF__LexoRankPosition__c;
            this.color = column.OpenSF__Color__c;
            this.status = column.OpenSF__Status__c;
            this.cardCount = column.OpenSF__CardCount__c;
            this.boardId = column.OpenSF__Board__c;
            this.category = column.OpenSF__Category__c;
        }
    }

    /**
     * Card DTO with nested User DTO
     */
    public class CardDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public String subject;
        @AuraEnabled
        public String description;
        @AuraEnabled
        public Id columnId;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public String position;
        @AuraEnabled
        public String color;
        @AuraEnabled
        public String priority;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String cardType;
        @AuraEnabled
        public Date dueDate;
        @AuraEnabled
        public Decimal storyPoints;
        @AuraEnabled
        public Id assigneeId;
        @AuraEnabled
        public UserDTO assignee;
        @AuraEnabled
        public Id peerReviewerId;
        @AuraEnabled
        public UserDTO peerReviewer;
        @AuraEnabled
        public Id epicId;
        @AuraEnabled
        public EpicDTO epic;
        @AuraEnabled
        public Boolean locked;
        @AuraEnabled
        public DateTime lastModifiedDate;
        @AuraEnabled
        public Id lastModifiedById;
        @AuraEnabled
        public Decimal sequenceNumber;
        @AuraEnabled
        public Boolean needsRefinement;
        @AuraEnabled
        public Map<String, Object> customFields;

        public CardDTO(OpenSF__Card__c card) {
            this.Id = card.Id;
            this.Name = card.Name;
            this.subject = card.OpenSF__Subject__c;
            this.description = card.OpenSF__Description__c;
            this.columnId = card.OpenSF__Column__c;
            this.boardId = card.OpenSF__Board__c;
            this.position = card.OpenSF__LexoRankPosition__c;
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
            this.lastModifiedById = card.LastModifiedById;
            this.sequenceNumber = card.OpenSF__SequenceNumber__c;
            this.needsRefinement = card.OpenSF__NeedsRefinement__c;

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
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String photoUrl;

        public UserDTO(User user) {
            this.name = user.Name;
            // SmallPhotoUrl may not be available in test context
            try {
                this.photoUrl = user.SmallPhotoUrl;
            } catch (Exception e) {
                this.photoUrl = null;
            }
        }
    }

    /**
     * Epic DTO for related epic cards
     */
    public class EpicDTO {
        @AuraEnabled
        public String subject;

        public EpicDTO(OpenSF__Card__c epic) {
            this.subject = epic.OpenSF__Subject__c;
        }
    }

    /**
     * Sprint DTO
     */
    public class SprintDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public String goal;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public Date startDate;
        @AuraEnabled
        public Date endDate;
        @AuraEnabled
        public Decimal sprintNumber;
        @AuraEnabled
        public Decimal totalStoryPoints;
        @AuraEnabled
        public Decimal completedStoryPoints;
        @AuraEnabled
        public Decimal velocity;

        public SprintDTO(OpenSF__Sprint__c sprint) {
            this.Id = sprint.Id;
            this.Name = sprint.Name;
            this.boardId = sprint.OpenSF__Board__c;
            this.goal = sprint.OpenSF__Goal__c;
            this.status = sprint.OpenSF__Status__c;
            this.startDate = sprint.OpenSF__StartDate__c;
            this.endDate = sprint.OpenSF__EndDate__c;
            this.sprintNumber = sprint.OpenSF__SprintNumber__c;
            this.totalStoryPoints = sprint.OpenSF__TotalStoryPoints__c;
            this.completedStoryPoints = sprint.OpenSF__CompletedStoryPoints__c;
            this.velocity = sprint.OpenSF__Velocity__c;
        }
    }

    /**
     * Sprint Card DTO (junction)
     */
    public class SprintCardDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id sprintId;
        @AuraEnabled
        public Id cardId;
        @AuraEnabled
        public DateTime addedDate;
        @AuraEnabled
        public DateTime removedDate;
        @AuraEnabled
        public Decimal storyPointsAtAdd;
        @AuraEnabled
        public Boolean completedInSprint;
        @AuraEnabled
        public DateTime completedDate;
        @AuraEnabled
        public String position;
        @AuraEnabled
        public CardDTO card;

        public SprintCardDTO(OpenSF__SprintCard__c sc) {
            this.Id = sc.Id;
            this.Name = sc.Name;
            this.sprintId = sc.OpenSF__Sprint__c;
            this.cardId = sc.OpenSF__Card__c;
            this.addedDate = sc.OpenSF__AddedDate__c;
            this.removedDate = sc.OpenSF__RemovedDate__c;
            this.storyPointsAtAdd = sc.OpenSF__StoryPointsAtAdd__c;
            this.completedInSprint = sc.OpenSF__CompletedInSprint__c;
            this.completedDate = sc.OpenSF__CompletedDate__c;
            this.position = sc.OpenSF__Position__c;
        }
    }

    /**
     * Sprint Snapshot DTO
     */
    public class SprintSnapshotDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public Id sprintId;
        @AuraEnabled
        public Date snapshotDate;
        @AuraEnabled
        public Decimal totalPoints;
        @AuraEnabled
        public Decimal remainingPoints;
        @AuraEnabled
        public Decimal completedPoints;
        @AuraEnabled
        public Decimal cardCount;
        @AuraEnabled
        public Decimal completedCardCount;

        public SprintSnapshotDTO(OpenSF__SprintSnapshot__c snap) {
            this.Id = snap.Id;
            this.sprintId = snap.OpenSF__Sprint__c;
            this.snapshotDate = snap.OpenSF__SnapshotDate__c;
            this.totalPoints = snap.OpenSF__TotalPoints__c;
            this.remainingPoints = snap.OpenSF__RemainingPoints__c;
            this.completedPoints = snap.OpenSF__CompletedPoints__c;
            this.cardCount = snap.OpenSF__CardCount__c;
            this.completedCardCount = snap.OpenSF__CompletedCardCount__c;
        }
    }

    /**
     * Card Custom Field configuration DTO
     */
    public class CardCustomFieldDTO {
        @AuraEnabled
        public String fieldApiName;
        @AuraEnabled
        public String displayLabel;
        @AuraEnabled
        public String fieldType;
        @AuraEnabled
        public Decimal sortOrder;

        public CardCustomFieldDTO() {
        }

        public CardCustomFieldDTO(OpenSF__CardCustomField__mdt field) {
            this.fieldApiName = field.OpenSF__FieldApiName__c;
            this.displayLabel = String.isNotBlank(field.OpenSF__DisplayLabel__c)
                ? field.OpenSF__DisplayLabel__c
                : field.OpenSF__FieldApiName__c.replace('__c', '');
            this.fieldType = field.OpenSF__FieldType__c;
            this.sortOrder = field.OpenSF__SortOrder__c;
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
    public static List<ColumnDTO> convertColumns(
        List<OpenSF__Column__c> columns
    ) {
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

    /**
     * Convert list of sprints
     */
    public static List<SprintDTO> convertSprints(
        List<OpenSF__Sprint__c> sprints
    ) {
        List<SprintDTO> result = new List<SprintDTO>();
        for (OpenSF__Sprint__c sprint : sprints) {
            result.add(new SprintDTO(sprint));
        }
        return result;
    }

    /**
     * Convert list of sprint cards
     */
    public static List<SprintCardDTO> convertSprintCards(
        List<OpenSF__SprintCard__c> sprintCards
    ) {
        List<SprintCardDTO> result = new List<SprintCardDTO>();
        for (OpenSF__SprintCard__c sc : sprintCards) {
            result.add(new SprintCardDTO(sc));
        }
        return result;
    }

    /**
     * Convert list of sprint snapshots
     */
    public static List<SprintSnapshotDTO> convertSnapshots(
        List<OpenSF__SprintSnapshot__c> snapshots
    ) {
        List<SprintSnapshotDTO> result = new List<SprintSnapshotDTO>();
        for (OpenSF__SprintSnapshot__c snap : snapshots) {
            result.add(new SprintSnapshotDTO(snap));
        }
        return result;
    }
}
