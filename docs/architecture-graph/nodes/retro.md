# retro

> Sprint retrospective board — collaborative retro sessions with categories, sticky notes, voting, and action items.

## Node Metadata
- **id**: retro
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | depends-on | Retrospective__c, RetroCard__c, RetroVote__c |
| real-time-sync | publishes-to | RetroUpdateEvent__e for real-time collaboration |
| sprint-management | depends-on | Sprint context (which sprint the retro is for) |

## Schema
- **Objects**: Retrospective__c, RetroCard__c, RetroVote__c
- **Events**: RetroUpdateEvent__e
- **Apex**: RetrospectiveController, RetrospectiveService, RetrospectiveDTO
- **LWC**: retroBoard
- **E2E**: retrospective.spec.ts

## Roadmap
### Now
- Retro board with category columns (What went well, What didn't, Action items)
- Anonymous card submission with reveal toggle
- Dot voting on retro cards

### Next
- Action item tracking with assignee and due date
- Retro templates (Mad/Sad/Glad, Start/Stop/Continue, 4Ls)

### Future
- AI-generated retro summaries and trend analysis across sprints
- Retro action items auto-created as Kanban cards

## Known Issues
- Vote count not updated in real-time for all participants (requires manual refresh)
- Anonymous mode can be bypassed by inspecting event payloads in browser DevTools
