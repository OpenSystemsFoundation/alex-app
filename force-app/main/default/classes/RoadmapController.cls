/**
 * RoadmapController - Thin facade for Roadmap and Timeline LWC components.
 * Delegates business logic to RoadmapService.
 */
public with sharing class RoadmapController {
    // =========================================================================
    // Roadmap Item Methods
    // =========================================================================

    /**
     * Get all roadmap items for a board
     */
    @AuraEnabled
    public static List<RoadmapItemDTO> getRoadmapItems(Id boardId) {
        try {
            return RoadmapService.getRoadmapItems(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading roadmap items: ' + e.getMessage()
            );
        }
    }

    /**
     * Get available epics that can be added to the roadmap
     */
    @AuraEnabled
    public static List<EpicSummaryDTO> getAvailableEpics(Id boardId) {
        try {
            return RoadmapService.getAvailableEpics(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading available epics: ' + e.getMessage()
            );
        }
    }

    /**
     * Create a new roadmap item
     */
    @AuraEnabled
    public static RoadmapItemDTO createRoadmapItem(
        Id boardId,
        Id cardId,
        String horizon,
        String quarter,
        Decimal year,
        Date startDate,
        Date targetDate,
        String previousPosition,
        String nextPosition
    ) {
        try {
            return RoadmapService.createRoadmapItem(
                boardId,
                cardId,
                horizon,
                quarter,
                year,
                startDate,
                targetDate,
                previousPosition,
                nextPosition
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating roadmap item: ' + e.getMessage()
            );
        }
    }

    /**
     * Update a roadmap item
     */
    @AuraEnabled
    public static RoadmapItemDTO updateRoadmapItem(
        Id itemId,
        Map<String, Object> updates
    ) {
        try {
            return RoadmapService.updateRoadmapItem(itemId, updates);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error updating roadmap item: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete a roadmap item
     */
    @AuraEnabled
    public static void deleteRoadmapItem(Id itemId) {
        try {
            RoadmapService.deleteRoadmapItem(itemId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting roadmap item: ' + e.getMessage()
            );
        }
    }

    /**
     * Move a roadmap item to a new bucket with position
     */
    @AuraEnabled
    public static RoadmapItemDTO moveRoadmapItem(
        Id itemId,
        String horizon,
        String quarter,
        String previousPosition,
        String nextPosition
    ) {
        try {
            return RoadmapService.moveRoadmapItem(
                itemId,
                horizon,
                quarter,
                previousPosition,
                nextPosition
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error moving roadmap item: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // Epic Dependency Methods
    // =========================================================================

    /**
     * Get all epic dependencies for a board
     */
    @AuraEnabled
    public static List<EpicDependencyDTO> getDependencies(Id boardId) {
        try {
            return RoadmapService.getDependencies(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading dependencies: ' + e.getMessage()
            );
        }
    }

    /**
     * Create an epic dependency
     */
    @AuraEnabled
    public static EpicDependencyDTO createDependency(
        Id boardId,
        Id sourceEpicId,
        Id targetEpicId,
        String dependencyType
    ) {
        try {
            return RoadmapService.createDependency(
                boardId,
                sourceEpicId,
                targetEpicId,
                dependencyType
            );
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error creating dependency: ' + e.getMessage()
            );
        }
    }

    /**
     * Delete an epic dependency
     */
    @AuraEnabled
    public static void deleteDependency(Id dependencyId) {
        try {
            RoadmapService.deleteDependency(dependencyId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error deleting dependency: ' + e.getMessage()
            );
        }
    }

    /**
     * Get full timeline data (items + dependencies) for Gantt view
     */
    @AuraEnabled
    public static TimelineData getTimelineData(Id boardId) {
        try {
            return RoadmapService.getTimelineData(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Error loading timeline data: ' + e.getMessage()
            );
        }
    }

    // =========================================================================
    // DTO Classes
    // =========================================================================

    public class RoadmapItemDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public Id cardId;
        @AuraEnabled
        public String epicSubject;
        @AuraEnabled
        public String epicDescription;
        @AuraEnabled
        public String epicStatus;
        @AuraEnabled
        public String epicPriority;
        @AuraEnabled
        public Decimal epicStoryPoints;
        @AuraEnabled
        public String epicColor;
        @AuraEnabled
        public Decimal epicChildCount;
        @AuraEnabled
        public String epicAssigneeName;
        @AuraEnabled
        public String horizon;
        @AuraEnabled
        public String quarter;
        @AuraEnabled
        public Decimal year;
        @AuraEnabled
        public Date startDate;
        @AuraEnabled
        public Date targetDate;
        @AuraEnabled
        public String position;
        @AuraEnabled
        public String status;

        public RoadmapItemDTO(OpenSF__RoadmapItem__c item) {
            this.Id = item.Id;
            this.Name = item.Name;
            this.boardId = item.OpenSF__Board__c;
            this.cardId = item.OpenSF__Card__c;
            this.horizon = item.OpenSF__Horizon__c;
            this.quarter = item.OpenSF__Quarter__c;
            this.year = item.OpenSF__Year__c;
            this.startDate = item.OpenSF__StartDate__c;
            this.targetDate = item.OpenSF__TargetDate__c;
            this.position = item.OpenSF__Position__c;
            this.status = item.OpenSF__Status__c;

            if (item.OpenSF__Card__r != null) {
                this.epicSubject = item.OpenSF__Card__r.OpenSF__Subject__c;
                this.epicDescription = item.OpenSF__Card__r.OpenSF__Description__c;
                this.epicStatus = item.OpenSF__Card__r.OpenSF__Status__c;
                this.epicPriority = item.OpenSF__Card__r.OpenSF__Priority__c;
                this.epicStoryPoints = item.OpenSF__Card__r.OpenSF__StoryPoints__c;
                this.epicColor = item.OpenSF__Card__r.OpenSF__Color__c;
                try {
                    this.epicChildCount = item.OpenSF__Card__r.OpenSF__EpicCardsCount__c;
                } catch (Exception e) {
                    this.epicChildCount = 0;
                }
                try {
                    if (item.OpenSF__Card__r.OpenSF__Assignee__r != null) {
                        this.epicAssigneeName = item.OpenSF__Card__r.OpenSF__Assignee__r.Name;
                    }
                } catch (Exception e) {
                    this.epicAssigneeName = null;
                }
            }
        }
    }

    public class EpicSummaryDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String subject;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String priority;
        @AuraEnabled
        public Decimal storyPoints;
        @AuraEnabled
        public String color;
        @AuraEnabled
        public Decimal childCount;
        @AuraEnabled
        public String assigneeName;

        public EpicSummaryDTO(OpenSF__Card__c epic) {
            this.Id = epic.Id;
            this.subject = epic.OpenSF__Subject__c;
            this.status = epic.OpenSF__Status__c;
            this.priority = epic.OpenSF__Priority__c;
            this.storyPoints = epic.OpenSF__StoryPoints__c;
            this.color = epic.OpenSF__Color__c;
            try {
                this.childCount = epic.OpenSF__EpicCardsCount__c;
            } catch (Exception e) {
                this.childCount = 0;
            }
            try {
                if (epic.OpenSF__Assignee__r != null) {
                    this.assigneeName = epic.OpenSF__Assignee__r.Name;
                }
            } catch (Exception e) {
                this.assigneeName = null;
            }
        }
    }

    public class EpicDependencyDTO {
        @AuraEnabled
        public Id Id;
        @AuraEnabled
        public String Name;
        @AuraEnabled
        public Id boardId;
        @AuraEnabled
        public Id sourceEpicId;
        @AuraEnabled
        public String sourceEpicSubject;
        @AuraEnabled
        public Id targetEpicId;
        @AuraEnabled
        public String targetEpicSubject;
        @AuraEnabled
        public String dependencyType;

        public EpicDependencyDTO(OpenSF__EpicDependency__c dep) {
            this.Id = dep.Id;
            this.Name = dep.Name;
            this.boardId = dep.OpenSF__Board__c;
            this.sourceEpicId = dep.OpenSF__SourceEpic__c;
            this.targetEpicId = dep.OpenSF__TargetEpic__c;
            this.dependencyType = dep.OpenSF__DependencyType__c;
            try {
                this.sourceEpicSubject = dep.OpenSF__SourceEpic__r.OpenSF__Subject__c;
            } catch (Exception e) {
                this.sourceEpicSubject = null;
            }
            try {
                this.targetEpicSubject = dep.OpenSF__TargetEpic__r.OpenSF__Subject__c;
            } catch (Exception e) {
                this.targetEpicSubject = null;
            }
        }
    }

    public class TimelineData {
        @AuraEnabled
        public List<RoadmapItemDTO> items;
        @AuraEnabled
        public List<EpicDependencyDTO> dependencies;
    }
}
