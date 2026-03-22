# admin

> Board administration — team management, board settings, column configuration, and member permissions.

## Node Metadata
- **id**: admin
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | reads-from | Board__c, Team__c, TeamMember__c, KanbanConfig__c |
| apex-services | depends-on | AdminController for team and board operations |

## Schema
- **Objects**: Board__c (settings), Team__c, TeamMember__c, KanbanConfig__c, KanbanBoardSettings__mdt
- **Apex**: AdminController, TeamService, TeamSelector
- **LWC**: adminManagement
- **E2E**: admin-management.spec.ts, team-management.spec.ts

## Roadmap
### Now
- Team member invite and role management
- Board column configuration (add, reorder, rename, delete)

### Next
- Board-level permission sets (viewer, editor, admin)
- Board archival and restore

### Future
- Audit log for board configuration changes
- Board templates marketplace

## Known Issues
- Column reordering requires full page refresh to reflect in other tabs
- Team member removal does not reassign their open cards automatically
