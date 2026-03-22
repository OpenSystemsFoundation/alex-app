# Timeline / Gantt View
**Date:** 2026-03-22
**Status:** Proposed

## Problem
Kanban boards show *what's happening now* but not *when things are due*. Teams juggling deadlines need a time-based view to spot scheduling conflicts, overlapping work, and approaching due dates. Today, the only date visibility is the `DueDate__c` field buried inside the card detail panel — there is no at-a-glance temporal view.

## Solution
Add a **Timeline tab** alongside the existing Board, Backlog, Sprint, and Analytics tabs. The timeline renders cards as horizontal bars on a scrollable time axis, grouped by column, assignee, or epic.

### Visual Layout

```
 Grouping: [Column ▾]    Zoom: [Week ▾]    ◀  March 2026  ▶

             Mon 16  Tue 17  Wed 18  Thu 19  Fri 20  Mon 23  Tue 24
 ─────────────────────────────────────────────────────────────────────
 To Do
   CA-042   ╠══════════════════╣
   CA-051            ╠════════════════════════╣
 In Progress
   CA-038   ╠════╣
   CA-044         ╠══════════════════════════════════════╣  ⚠ overdue
 Review
   CA-039              ╠════╣
 ─────────────────────────────────────────────────────────────────────
              ▲ today
```

### Interaction Model
- **Click** a bar to open the card detail panel
- **Drag** bar edges to adjust start/due dates (writes back to Card__c)
- **Drag** entire bar to reschedule (shifts both dates)
- **Hover** shows tooltip with subject, assignee, story points, days remaining
- **Overdue indicator** (⚠) on bars past their due date
- **Today line** — vertical red line marking the current date
- **Sprint boundaries** — shaded regions showing sprint start/end dates

### Grouping Options
| Group By | Row Headers | Use Case |
|----------|-------------|----------|
| Column | Column names | See work distribution across statuses |
| Assignee | User avatars + names | Spot individual overload |
| Epic | Epic subjects | Track feature-level timelines |
| Priority | Priority labels | Focus on urgent items first |
| None (flat) | Card names | Simple chronological view |

### Zoom Levels
| Zoom | Column Width | Visible Range | Best For |
|------|-------------|---------------|----------|
| Day | 80px | ~2 weeks | Daily standups |
| Week | 120px | ~2 months | Sprint planning |
| Month | 100px | ~6 months | Roadmap reviews |

## Data Model

### New Fields on Card__c

| Field API Name | Type | Purpose |
|----------------|------|---------|
| `StartDate__c` | Date | When work begins (optional, defaults to column entry date) |

> `DueDate__c` already exists. Together with `StartDate__c`, these define the bar's horizontal span on the timeline.

### Derived Data (No New Fields)
- **Card duration** = `DueDate__c - StartDate__c` (calculated in LWC)
- **Days remaining** = `DueDate__c - TODAY()` (calculated in LWC)
- **Sprint boundaries** = `Sprint__c.StartDate__c` / `Sprint__c.EndDate__c` (already exist)
- **Column entry date** = `CardColumnHistory__c.EnteredAt__c` (already exists, used as StartDate fallback)

## Key Screens
- Timeline tab in the main kanbanBoard component (new tab alongside Board/Backlog/Sprint/Analytics)
- Date range picker with keyboard navigation (arrow keys to pan, +/- to zoom)
- Group-by selector in the timeline toolbar
- Inline date editing via bar drag (optimistic UI with conflict detection)

## Implementation

### Frontend (LWC)

| Component | Purpose |
|-----------|---------|
| `kanbanTimeline` | New top-level tab component with scroll container, time axis, and grouping logic |
| `kanbanTimelineBar` | Individual card bar — renders position/width from dates, handles drag resize |
| `kanbanTimelineHeader` | Date axis header with zoom-responsive labels (days, weeks, months) |

### Store Changes

| File | Changes |
|------|---------|
| `actionTypes.js` | Add `SET_TIMELINE_ZOOM`, `SET_TIMELINE_GROUP_BY`, `SET_TIMELINE_RANGE` |
| `reducers.js` | Add `timelineReducer` for zoom/group/scroll state |
| `selectors.js` | Add `getTimelineCards` selector (filters cards with dates, sorts by start date) |

### Apex Changes

| Layer | File | Changes |
|-------|------|---------|
| **Selector** | `KanbanBoardSelector.cls` | Add `getCardsWithDates(Id boardId)` — optimized query returning only date-relevant fields |
| **Controller** | `KanbanBoardController.cls` | Add `updateCardDates(Id cardId, Date startDate, Date dueDate)` for inline drag updates |
| **DTO** | `KanbanBoardDTO.cls` | Add `startDate` to `CardDTO` |

### Real-time Sync
- Date changes publish `CardUpdateEvent__e` via existing trigger (no new events needed)
- Timeline subscribes to same platform event channel as the board view
- Bar positions update in real-time when other users change dates

## Dependencies
- Existing `DueDate__c` field on Card__c
- Existing `CardColumnHistory__c` for start date fallback
- Existing Sprint date fields for boundary rendering

## Salesforce Advantage
Calendar and date handling are native to the platform. The timeline can leverage `UserInfo.getTimeZone()` for timezone-aware rendering and `BusinessHours` for working-day calculations — features that external tools need separate configuration for.

## Risks

| Risk | Mitigation |
|------|-----------|
| Cards without dates clutter the view | Filter to cards with at least one date; show "unscheduled" count badge |
| Large boards (200+ cards) cause slow rendering | Virtual scrolling for rows; only render bars in the visible viewport |
| Drag-to-resize conflicts with touch scrolling on mobile | Use long-press to enter resize mode on touch devices |
| Timezone differences between users | Render in user's local timezone; store dates as Date (not DateTime) |
