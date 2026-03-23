# card-system

> Card CRUD, detail panel, comments, file attachments, linking, and drag-drop positioning.

## Node Metadata
- **id**: card-system
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | depends-on | Card__c, Column__c, CardComment__c, CardLink__c, LinkedRecord__c |
| real-time-sync | publishes-to | CardUpdateEvent__e, ColumnUpdateEvent__e, LinkedRecordEvent__e |
| kanban-store | reads-from | Card state via selectors |
| kanban-store | writes-to | Card actions dispatched via thunks |

## Schema
- **Objects**: Card__c, Column__c, CardComment__c, CardLink__c, LinkedRecord__c, CardColumnHistory__c
- **Events**: CardUpdateEvent__e, ColumnUpdateEvent__e, LinkedRecordEvent__e
- **Apex**: KanbanCardService, CardCommentService, CardFileService, CardLinkService, RecordLinkingService, CardUpdateRequest, CardTriggerHandler, ColumnTriggerHandler, LexoRank
- **LWC**: kanbanCardPanel, cardLinkedCards, kanbanContextMenu
- **Triggers**: CardTrigger, ColumnTrigger

## Roadmap
### Now
- Card type icons via CardTypeIcon__mdt
- Custom fields via CardCustomField__mdt

### Next
- Card templates (repeatable card patterns)
- Bulk card operations (multi-select move, assign, label)

### Future
- Card subtasks with checklist progress
- Card dependency graph visualization

## Known Issues
- LexoRank rebalancing needed when position gaps exhaust key space
- CardColumnHistory__c tracking does not capture cross-board moves
