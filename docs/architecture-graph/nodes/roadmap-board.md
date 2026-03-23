# roadmap-board

> High-level roadmap visualization — timeline view of roadmap items with sprint alignment and dependency tracking.

## Node Metadata
- **id**: roadmap-board
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | depends-on | RoadmapItem__c |
| sprint-management | reads-from | Sprint timeline for alignment overlay |

## Schema
- **Objects**: RoadmapItem__c
- **Apex**: RoadmapController, RoadmapService
- **LWC**: roadmapBoard

## Roadmap
### Now
- Roadmap item CRUD with timeline bars
- Sprint overlay on timeline

### Next
- Roadmap item dependencies (finish-to-start links)
- Drag-to-resize timeline bars

### Future
- Roadmap-to-epic linking (drill down from roadmap to epic to cards)
- Multi-team roadmap aggregation view

## Known Issues
- Timeline zoom levels limited to quarter/month/week — no day-level granularity
- Roadmap items without dates render at the end of the timeline without visual indication
