/**
 * DesignSessionDTO - Data Transfer Objects for Design Thinking sessions.
 * Maps namespaced objects to plain objects for LWC consumption.
 */
public with sharing class DesignSessionDTO {

    public class SessionDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String boardId;
        @AuraEnabled public String title;
        @AuraEnabled public String status;
        @AuraEnabled public String currentPhase;
        @AuraEnabled public String facilitatorId;
        @AuraEnabled public String facilitatorName;
        @AuraEnabled public Datetime scheduledDate;
        @AuraEnabled public Datetime startedAt;
        @AuraEnabled public Datetime endedAt;
        @AuraEnabled public Integer participantCount;
        @AuraEnabled public String notes;
        @AuraEnabled public List<SessionCardDTO> cards;

        public SessionDTO() {}

        public SessionDTO(OpenSF__DesignSession__c session) {
            this.id = session.Id;
            this.name = session.Name;
            this.boardId = session.OpenSF__Board__c;
            this.title = session.OpenSF__Title__c;
            this.status = session.OpenSF__Status__c;
            this.currentPhase = session.OpenSF__CurrentPhase__c;
            this.facilitatorId = session.OpenSF__Facilitator__c;
            try {
                this.facilitatorName = session.OpenSF__Facilitator__r.Name;
            } catch (Exception e) {
                this.facilitatorName = null;
            }
            this.scheduledDate = session.OpenSF__ScheduledDate__c;
            this.startedAt = session.OpenSF__StartedAt__c;
            this.endedAt = session.OpenSF__EndedAt__c;
            this.participantCount = session.OpenSF__ParticipantCount__c != null
                ? session.OpenSF__ParticipantCount__c.intValue() : 0;
            this.notes = session.OpenSF__Notes__c;
            this.cards = new List<SessionCardDTO>();
        }
    }

    public class SessionCardDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String cardId;
        @AuraEnabled public String cardName;
        @AuraEnabled public String cardSubject;
        @AuraEnabled public String phaseAtEntry;
        @AuraEnabled public String phaseAtExit;
        @AuraEnabled public Datetime addedDate;
        @AuraEnabled public Boolean graduated;

        public SessionCardDTO() {}

        public SessionCardDTO(OpenSF__DesignSessionCard__c sc) {
            this.id = sc.Id;
            this.sessionId = sc.OpenSF__DesignSession__c;
            this.cardId = sc.OpenSF__Card__c;
            try {
                this.cardName = sc.OpenSF__Card__r.Name;
                this.cardSubject = sc.OpenSF__Card__r.OpenSF__Subject__c;
            } catch (Exception e) {
                this.cardName = null;
                this.cardSubject = null;
            }
            this.phaseAtEntry = sc.OpenSF__PhaseAtEntry__c;
            this.phaseAtExit = sc.OpenSF__PhaseAtExit__c;
            this.addedDate = sc.OpenSF__AddedDate__c;
            this.graduated = sc.OpenSF__Graduated__c;
        }
    }

    public class NoteDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String cardId;
        @AuraEnabled public String authorId;
        @AuraEnabled public String authorName;
        @AuraEnabled public String text;
        @AuraEnabled public String zone;
        @AuraEnabled public String tool;
        @AuraEnabled public String phase;
        @AuraEnabled public Decimal positionX;
        @AuraEnabled public Decimal positionY;
        @AuraEnabled public String color;
        @AuraEnabled public String parentNoteId;
        @AuraEnabled public Integer voteCount;
        @AuraEnabled public String cluster;
        @AuraEnabled public Integer sortOrder;

        public NoteDTO() {}

        public NoteDTO(OpenSF__DesignNote__c note) {
            this.id = note.Id;
            this.sessionId = note.OpenSF__DesignSession__c;
            this.cardId = note.OpenSF__Card__c;
            this.authorId = note.OpenSF__Author__c;
            try {
                this.authorName = note.OpenSF__Author__r.Name;
            } catch (Exception e) {
                this.authorName = null;
            }
            this.text = note.OpenSF__Text__c;
            this.zone = note.OpenSF__Zone__c;
            this.tool = note.OpenSF__Tool__c;
            this.phase = note.OpenSF__Phase__c;
            this.positionX = note.OpenSF__PositionX__c;
            this.positionY = note.OpenSF__PositionY__c;
            this.color = note.OpenSF__Color__c;
            this.parentNoteId = note.OpenSF__ParentNote__c;
            this.voteCount = note.OpenSF__VoteCount__c != null
                ? note.OpenSF__VoteCount__c.intValue() : 0;
            this.cluster = note.OpenSF__Cluster__c;
            this.sortOrder = note.OpenSF__SortOrder__c != null
                ? note.OpenSF__SortOrder__c.intValue() : 0;
        }
    }

    public class VoteDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String noteId;
        @AuraEnabled public String voterId;
        @AuraEnabled public String voterName;
        @AuraEnabled public String voteType;
        @AuraEnabled public Integer score;
        @AuraEnabled public Integer round;

        public VoteDTO() {}

        public VoteDTO(OpenSF__DesignVote__c vote) {
            this.id = vote.Id;
            this.sessionId = vote.OpenSF__DesignSession__c;
            this.noteId = vote.OpenSF__DesignNote__c;
            this.voterId = vote.OpenSF__Voter__c;
            try {
                this.voterName = vote.OpenSF__Voter__r.Name;
            } catch (Exception e) {
                this.voterName = null;
            }
            this.voteType = vote.OpenSF__VoteType__c;
            this.score = vote.OpenSF__Score__c != null
                ? vote.OpenSF__Score__c.intValue() : 0;
            this.round = vote.OpenSF__Round__c != null
                ? vote.OpenSF__Round__c.intValue() : 1;
        }
    }

    public class ArtifactDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String cardId;
        @AuraEnabled public String artifactType;
        @AuraEnabled public String title;
        @AuraEnabled public String content;
        @AuraEnabled public String externalUrl;
        @AuraEnabled public String phase;
        @AuraEnabled public String tool;
        @AuraEnabled public Datetime createdDate;

        public ArtifactDTO() {}

        public ArtifactDTO(OpenSF__DesignArtifact__c artifact) {
            this.id = artifact.Id;
            this.sessionId = artifact.OpenSF__DesignSession__c;
            this.cardId = artifact.OpenSF__Card__c;
            this.artifactType = artifact.OpenSF__Type__c;
            this.title = artifact.OpenSF__Title__c;
            this.content = artifact.OpenSF__Content__c;
            this.externalUrl = artifact.OpenSF__ExternalURL__c;
            this.phase = artifact.OpenSF__Phase__c;
            this.tool = artifact.OpenSF__Tool__c;
            this.createdDate = artifact.CreatedDate;
        }
    }
}
