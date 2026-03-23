# sprint-management

> Sprint lifecycle management — creation, planning, execution tracking, completion, and velocity reporting.

## Node Metadata
- **id**: sprint-management
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| card-system | depends-on | SprintCard__c junction links cards to sprints |
| data-model | depends-on | Sprint__c, SprintCard__c, SprintSnapshot__c |
| real-time-sync | publishes-to | SprintUpdateEvent__e on sprint state changes |
| kanban-store | reads-from | Sprint state slice (sprintReducer, sprintThunks) |

## Schema
- **Objects**: Sprint__c, SprintCard__c, SprintSnapshot__c
- **Apex**: SprintService, SprintSelector, SprintSnapshotScheduler
- **LWC**: kanbanSprintHeader, kanbanSprintModal, kanbanSprintComplete, kanbanSprintReports
- **Events**: SprintUpdateEvent__e
- **Flows**: Column_Setup (auto-creates columns on board init)
- **Store**: sprintReducer.js, sprintThunks.js

## Roadmap
### Now
- Sprint completion summary with carry-over cards
- Snapshot scheduler for burndown data

### Next
- Sprint goals with acceptance criteria
- Sprint comparison reports

### Future
- Multi-team sprint coordination
- Predictive sprint capacity based on historical velocity

## Known Issues
- SprintSnapshot scheduler must be manually deployed and scheduled in production
- Sprint complete flow does not yet handle cards with open blockers gracefully
