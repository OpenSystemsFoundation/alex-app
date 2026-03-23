# analytics

> Sprint analytics — burndown charts, velocity tracking, cumulative flow diagrams, and sprint reports.

## Node Metadata
- **id**: analytics
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| sprint-management | reads-from | Velocity and burndown data from SprintSnapshot__c |
| data-model | reads-from | SprintSnapshot__c aggregate queries |
| kanban-store | depends-on | Analytics state via analyticsThunks |

## Schema
- **Apex**: AnalyticsService
- **LWC**: kanbanAnalytics, kanbanCumulativeFlowDiagram, kanbanSprintReports
- **Store**: analyticsThunks.js
- **Reports/Dashboards**: force-app/main/default/reports/, force-app/main/default/dashboards/

## Roadmap
### Now
- Cumulative flow diagram
- Sprint velocity chart across last N sprints

### Next
- Cycle time and lead time tracking per card
- Team workload distribution charts

### Future
- Predictive analytics (sprint completion likelihood)
- Custom metric builder

## Known Issues
- CFD chart requires at least 2 sprints of snapshot data to render meaningfully
- Analytics tab loading can be slow on boards with 10+ completed sprints
