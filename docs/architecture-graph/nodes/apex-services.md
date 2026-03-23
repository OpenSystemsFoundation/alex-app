# apex-services

> Server-side service layer — controllers, services, selectors, DTOs, trigger handlers, and shared utilities.

## Node Metadata
- **id**: apex-services
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | reads-from | SOQL via selector classes |
| data-model | writes-to | DML via service classes |
| real-time-sync | publishes-to | Trigger handlers publish platform events |

## Schema
- **Controllers**: KanbanBoardController, AdminController, PlanningPokerController, RetrospectiveController, RoadmapController
- **Services**: KanbanBoardService, KanbanCardService, SprintService, CardCommentService, CardFileService, CardLinkService, RecordLinkingService, EpicService, TeamService, AnalyticsService, RoadmapService, RetrospectiveService
- **Selectors**: KanbanBoardSelector, BoardSelector, SprintSelector, TeamSelector
- **DTOs**: KanbanBoardDTO, RetrospectiveDTO, CardUpdateRequest
- **Trigger Framework**: TriggerHandler (base), TriggerContext, CardTriggerHandler, ColumnTriggerHandler, SprintCardTriggerHandler
- **Utilities**: KanbanEnums, LexoRank
- **Schedulable**: SprintSnapshotScheduler
- **Test Infrastructure**: TestFactory, TestSettings
- **Flows**: Auto_Create_Card_from_Case, Card_Email_Notifications, Card_Notifications, Column_Setup, Feedback_Reporting

## Roadmap
### Now
- Design thinking controller and service layer (in force-agentforce package)
- Selector pattern enforcement for all SOQL

### Next
- Unit of Work pattern for complex multi-object DML
- Apex REST API for external integrations

### Future
- Async processing for bulk operations via Queueable
- Governor limit monitoring and circuit breaker pattern

## Known Issues
- Some services mix SOQL inline instead of using dedicated selectors
- CardUpdateRequest.fromMap() silently ignores unknown keys — no validation warning
- prettier-plugin-apex must stay pinned to v2.1.5 (v2.2.6 breaks SOQL formatting)
