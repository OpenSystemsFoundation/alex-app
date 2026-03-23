# real-time-sync

> Platform event subscription layer — empathy/streaming API bridge that keeps all connected clients in sync.

## Node Metadata
- **id**: real-time-sync
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| kanban-store | publishes-to | Dispatches actions when platform events arrive |
| data-model | depends-on | Platform event SObject definitions |
| card-system | subscribes-to | CardUpdateEvent__e, ColumnUpdateEvent__e, LinkedRecordEvent__e |
| sprint-management | subscribes-to | SprintUpdateEvent__e |
| design-thinking | subscribes-to | DesignSessionEvent__e |

## Schema
- **Events consumed**: CardUpdateEvent__e, ColumnUpdateEvent__e, SprintUpdateEvent__e, LinkedRecordEvent__e, RetroUpdateEvent__e, PokerEvent__e, DesignSessionEvent__e
- **LWC**: subscriptionManager, connectionStatusIndicator
- **Board handler**: subscriptionEventHandler.js (in kanbanBoard/handlers/)
- **Store integration**: Event payloads are translated to store actions and dispatched

## Roadmap
### Now
- Connection status indicator (connected/reconnecting/disconnected)
- Client ID filtering (ignore own events)

### Next
- Reconnection backoff with event replay from last replay ID
- Presence indicators (who is viewing the board)

### Future
- Change Data Capture integration for richer field-level diffs
- Cross-tab event deduplication via BroadcastChannel API

## Known Issues
- Empathy API has 24-hour subscription timeout; requires periodic resubscribe
- High-frequency card moves (rapid drag-drop) can cause event ordering issues
- No replay guarantee if client disconnects for more than 24 hours
