# kanban-board

> Container LWC that orchestrates the entire Kanban board experience.

## Node Metadata
- **id**: kanban-board
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| kanban-store | depends-on | All state management |
| card-system | depends-on | Card rendering and operations |
| real-time-sync | subscribes-to | Platform event subscriptions |
| sprint-management | extends | Sprint header, sprint views |
| backlog | extends | Backlog tab view |
| analytics | extends | Analytics tab view |
| admin | extends | Admin tab view |
| design-thinking | extends | Design thinking tab view |

## Schema
- **LWC**: kanbanBoard (+ handlers/, helpers/, managers/ subdirs)
- **Key Files**: kanbanBoard.js, kanbanBoard.html, kanbanBoard.css

## Roadmap
### Now
- Design thinking tab integration
- Multi-board navigation

### Next
- Custom board layouts (swimlanes, timeline)
- Board templates

### Future
- Cross-board card linking
- Board federation (multi-org)

## Known Issues
- Mobile drag-drop limited to Chrome (WebKit workaround needed)
- Board tab state not persisted across page refreshes
