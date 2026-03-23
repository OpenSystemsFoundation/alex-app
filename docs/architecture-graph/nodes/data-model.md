# data-model

> Foundation layer — all custom objects, fields, platform events, custom metadata types, and relationships.

## Node Metadata
- **id**: data-model
- **status**: stable
- **package**: force-app (core objects), force-design-thinking (DT objects)

## Edges
(Foundation node — no outgoing dependencies. All other nodes depend on this.)

## Schema

### Core Objects (force-app)
| Object | Purpose |
|--------|---------|
| Board__c | Kanban board container |
| Column__c | Board columns (To Do, In Progress, Done, etc.) |
| Card__c | Work items (stories, bugs, tasks) with 23+ fields |
| CardComment__c | Card discussion comments |
| CardLink__c | Card-to-card relationships (blocks, relates to) |
| CardColumnHistory__c | Tracks card movement across columns |
| LinkedRecord__c | Links cards to external Salesforce records |
| Sprint__c | Sprint definitions with start/end dates |
| SprintCard__c | Junction: Card-to-Sprint assignment |
| SprintSnapshot__c | Daily burndown snapshots |
| Team__c | Team definitions |
| TeamMember__c | Team membership junction |
| Retrospective__c | Retro session definitions |
| RetroCard__c | Retro sticky notes |
| RetroVote__c | Retro dot votes |
| PokerSession__c | Planning poker session |
| PokerParticipant__c | Poker vote records |
| RoadmapItem__c | High-level roadmap entries |
| EpicDependency__c | Epic-to-epic dependency links |
| KanbanConfig__c | Board-level configuration |

### Platform Events
| Event | Publisher | Purpose |
|-------|----------|---------|
| CardUpdateEvent__e | CardTriggerHandler | Card created/updated/deleted |
| ColumnUpdateEvent__e | ColumnTriggerHandler | Column changes |
| SprintUpdateEvent__e | SprintCardTriggerHandler | Sprint card changes |
| LinkedRecordEvent__e | RecordLinkingService | Record link changes |
| RetroUpdateEvent__e | RetrospectiveService | Retro board changes |
| PokerEvent__e | PlanningPokerController | Poker vote/reveal events |

### Custom Metadata Types
| Type | Purpose |
|------|---------|
| KanbanBoardSettings__mdt | Global board defaults |
| CardCustomField__mdt | Dynamic card field configuration |
| CardTypeIcon__mdt | Icon mapping for card types |

### Design Thinking Objects (force-design-thinking)
| Object | Purpose |
|--------|---------|
| DesignSession__c | Design thinking session |
| DesignSessionCard__c | Cards linked to a session |
| DesignNote__c | Sticky notes and ideas |
| DesignVote__c | Dot votes on notes |
| DesignArtifact__c | Session artifacts (empathy maps, etc.) |
| DesignSessionEvent__e | Real-time session sync |

### Card__c Field Extensions (force-design-thinking)
- DesignPhase__c — Current design thinking phase
- HowMightWe__c — Associated HMW statement
- DesignScore__c — Design evaluation score
- ActiveDesignSession__c — Currently active DT session reference

## Roadmap
### Now
- Design thinking object deployment
- Card__c field extensions for DT

### Next
- Polymorphic card types (Story, Bug, Task, Epic as picklist → record types)
- Field history tracking on Card__c status changes

### Future
- External object integration (Jira, GitHub Issues)
- Data archival strategy for completed sprint data

## Known Issues
- Namespace prefix (OpenSF__) auto-applied on deployment — metadata source files must NOT include it
- Card__c has 23+ custom fields approaching metadata limits for future growth
- No cascade delete from Board__c to child records — requires manual cleanup
