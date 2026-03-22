# Release Planning Timeline
**Date:** 2026-03-22
**Status:** Proposed

## Problem
Teams plan releases across multiple sprints, but there is no way to visualize how sprints, epics, and milestones connect into a release schedule. Release planning happens in slide decks and spreadsheets that go stale within days. Product managers need a living roadmap view that stays in sync with actual board progress.

## Solution
A **Release Planning** view that layers sprints, epics, milestones, and releases onto a single timeline. This is a higher-level planning tool than the card-level timeline — it shows the big picture across weeks or months.

### Visual Layout

```
Release: v2.1 — Target: Apr 15, 2026
═══════════════════════════════════════════════════════════════════

         Mar 9-20        Mar 23-Apr 3      Apr 7-18
        Sprint 4          Sprint 5          Sprint 6
       ┌──────────┐     ┌──────────┐     ┌──────────┐
       │ 21 pts   │     │ 18 pts   │     │ ? pts    │
       │ planned  │     │ planned  │     │ unplanned│
       └──────────┘     └──────────┘     └──────────┘

Epics:
 Auth Redesign  ╠═══════════════════════╣  (12/15 pts done)
 API v3         ╠═══════════════════════════════════════╣  (3/20 pts done)
 Mobile Polish       ╠══════════════╣  (0/8 pts done)

Milestones:
       ◆ Demo Day          ◆ Beta              ◆ GA Release
       (Mar 20)            (Apr 2)             (Apr 15)

Velocity:   ──────── 19 avg ────────
Forecast:   ██████████████████░░░░░░  68% confidence to hit Apr 15
```

### Key Capabilities
- **Release container** — groups sprints, epics, and milestones under a named release
- **Epic swim lanes** — show epic progress across sprint boundaries
- **Velocity-based forecasting** — project completion dates using rolling average velocity
- **Confidence intervals** — Monte Carlo simulation using historical velocity variance
- **What-if scenarios** — drag epic bars to explore schedule trade-offs without saving

## Data Model

### New Object: Release__c

| Field API Name | Type | Purpose |
|----------------|------|---------|
| `Name` | Auto Number (REL-{0000}) | Unique release identifier |
| `Subject__c` | Text(255) | Release name (e.g., "v2.1 — Mobile Launch") |
| `Description__c` | Long Text Area | Release notes, goals, scope |
| `Board__c` | Master-Detail(Board__c) | Board this release belongs to |
| `TargetDate__c` | Date | Planned release date |
| `ActualDate__c` | Date | Actual release date (set on completion) |
| `Status__c` | Picklist | Planning / Active / Released / Cancelled |
| `StartDate__c` | Date | Release development start date |

### New Junction Object: ReleaseSprint__c

| Field API Name | Type | Purpose |
|----------------|------|---------|
| `Name` | Auto Number | Junction record identifier |
| `Release__c` | Master-Detail(Release__c) | Parent release |
| `Sprint__c` | Lookup(Sprint__c) | Sprint included in this release |
| `Order__c` | Number | Sprint sequence within the release |

### Existing Objects Leveraged
- **Sprint__c** — `StartDate__c`, `EndDate__c`, `TotalStoryPoints__c`, `CompletedStoryPoints__c`, `Velocity__c`
- **Card__c** — `Epic__c`, `StoryPoints__c`, `DueDate__c`, `StartDate__c` (from Timeline feature)
- **SprintSnapshot__c** — historical velocity data for forecasting
- **Milestone__c** — milestone markers (from Milestone Tracking feature)

## Key Screens

### Release Planning Tab
- New tab in the kanbanBoard component (Board / Backlog / Sprint / Analytics / **Releases**)
- Horizontal timeline with sprint blocks, epic bars, and milestone markers
- Zoom levels: Sprint (2-week columns), Month, Quarter
- Release selector dropdown when multiple releases exist

### Release Manager Modal
- Create/edit releases with target date, description
- Assign sprints to the release (drag or checkbox)
- Link milestones to release checkpoints
- Show release health: scope (total points), velocity trend, forecast

### Forecasting Panel
- **Deterministic forecast**: remaining points / avg velocity = sprints remaining
- **Monte Carlo forecast**: sample from historical velocity distribution, run 1000 simulations, show confidence intervals
  - "68% chance of completing by Apr 12"
  - "95% chance of completing by Apr 22"
- **Scope creep indicator**: points added after release planning vs. original scope

### Epic Progress Bars
- Horizontal bars spanning the sprints where epic cards are scheduled
- Fill percentage based on completed story points vs. total
- Color-coded: green (on track), amber (behind), red (at risk based on forecast)

## Implementation

### Apex Changes

| Layer | File | Changes |
|-------|------|---------|
| **Controller** | `ReleaseController.cls` (new) | `getReleases`, `createRelease`, `updateRelease`, `assignSprintToRelease`, `getReleaseForecasting` |
| **Service** | `ReleaseService.cls` (new) | Release CRUD, sprint assignment, scope calculation, velocity aggregation |
| **Service** | `ForecastingService.cls` (new) | Monte Carlo simulation, confidence interval calculation, scope creep tracking |
| **Selector** | `ReleaseSelector.cls` (new) | Release queries with sprint and epic rollups |
| **DTO** | `KanbanBoardDTO.cls` | Add `ReleaseDTO`, `ForecastDTO` inner classes |

### Forecasting Algorithm (Apex)

```
getReleaseForecasting(Id releaseId):
  1. Calculate remaining story points across all release sprints
  2. Query last 6 completed sprint velocities
  3. Deterministic: remaining / mean(velocities) = sprints remaining
  4. Monte Carlo (1000 iterations):
     - Sample velocity from historical distribution (normal approx)
     - Accumulate until remaining points exhausted
     - Record completion sprint number
  5. Return percentile dates: P50, P68, P80, P95
```

### Frontend (LWC)

| Component | Purpose |
|-----------|---------|
| `kanbanReleasePlanning` | Release timeline view with sprint blocks and epic bars |
| `kanbanReleaseModal` | Create/edit release, assign sprints |
| `kanbanForecastPanel` | Confidence interval visualization, scope creep chart |

### Store Changes

| File | Changes |
|------|---------|
| `actionTypes.js` | Add `LOAD_RELEASES`, `SET_ACTIVE_RELEASE`, `UPDATE_RELEASE_FORECAST` |
| `reducers.js` | Add `releaseReducer` for release and forecast state |
| `selectors.js` | Add `getActiveRelease`, `getReleaseSprints`, `getReleaseEpics`, `getReleaseForecast` |
| `releaseThunks.js` (new) | Async operations for release CRUD and forecasting |

### Dependencies on Other Features
- **Timeline/Gantt View** — shares the horizontal time axis rendering logic and `StartDate__c` field
- **Milestone Tracking** — milestone markers rendered on the release timeline
- **Sprint Management** — sprint date ranges and velocity data (already built)
- **Analytics** — velocity trend data (already built)

## Salesforce Advantage
Release planning data lives alongside the CRM — product managers can link releases to Opportunities ("v2.1 enables $500K in pipeline"), use Flows to auto-notify stakeholders on release status changes, and build Reports & Dashboards combining release progress with business metrics. No external roadmap tool needed.

## Risks

| Risk | Mitigation |
|------|-----------|
| Forecasting accuracy with few sprints | Require minimum 3 completed sprints; show confidence level prominently |
| Scope creep not captured | Track points added/removed after release creation; alert on >20% growth |
| Release spanning many sprints overwhelms the view | Collapsible sprint blocks; zoom to quarter level for long releases |
| Multiple releases with overlapping sprints | Supported by junction object; sprint can belong to multiple releases (e.g., maintenance + feature) |
| Monte Carlo performance in Apex | Cap at 1000 iterations; cache results with TTL; recalculate only on sprint completion |
