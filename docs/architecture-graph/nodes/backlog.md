# backlog

> Backlog view for unassigned and future-sprint cards with drag-to-sprint, priority ranking, and filtering.

## Node Metadata
- **id**: backlog
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| card-system | depends-on | Card queries and card CRUD |
| kanban-store | depends-on | Backlog state slice (backlogReducer) |
| sprint-management | reads-from | Sprint card mapping for assignment |

## Schema
- **LWC**: kanbanBacklogView
- **Store**: backlogReducer.js (in kanbanStore/state/reducers/)

## Roadmap
### Now
- Backlog ranking with LexoRank ordering
- Drag cards from backlog into sprint columns

### Next
- Backlog grooming mode with inline estimation
- Backlog-to-sprint bulk assignment

### Future
- AI-powered backlog prioritization suggestions
- Backlog health score (staleness, estimation coverage)

## Known Issues
- Large backlogs (200+ cards) can cause slow initial render
- LexoRank rebalancing not yet triggered automatically on sequence collisions
