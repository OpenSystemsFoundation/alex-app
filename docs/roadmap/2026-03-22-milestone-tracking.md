# Milestone Tracking
**Date:** 2026-03-22
**Status:** Proposed

## Problem
Teams need to mark and track key delivery dates — release deadlines, demo days, stakeholder reviews, go-live dates. Currently there is no concept of a milestone in Alex. Teams track these in external calendars or spreadsheets, disconnected from the actual work on the board.

## Solution
Introduce **Milestones** as first-class objects tied to boards. Milestones appear as diamond markers on the timeline view and as deadline indicators on the board and sprint views.

### Visual Representation

```
Timeline View:
             Mar 16    Mar 23    Mar 30    Apr 6
 ─────────────────────────────────────────────────
   ◆ Sprint 4 Demo (Mar 20)
   CA-042  ╠══════════╣
   CA-051       ╠════════════╣
                                    ◆ Beta Release (Apr 2)
   CA-038  ╠════════════════════════╣
 ─────────────────────────────────────────────────

Board View:
 ┌─────────────────────────────────────────────┐
 │  ◆ Sprint 4 Demo — Mar 20 (2 days away)     │
 │  3 of 5 linked cards complete                │
 └─────────────────────────────────────────────┘
```

### Milestone States
| State | Condition | Visual |
|-------|-----------|--------|
| On Track | All linked cards on schedule | ◆ green |
| At Risk | ≥1 linked card overdue or blocked | ◆ amber |
| Missed | Target date passed with incomplete cards | ◆ red |
| Completed | All linked cards done before target date | ◆ grey with checkmark |

## Data Model

### New Object: Milestone__c

| Field API Name | Type | Purpose |
|----------------|------|---------|
| `Name` | Auto Number (MS-{0000}) | Unique milestone identifier |
| `Subject__c` | Text(255) | Milestone title |
| `Description__c` | Long Text Area | Details and acceptance criteria |
| `Board__c` | Master-Detail(Board__c) | Board this milestone belongs to |
| `TargetDate__c` | Date | When the milestone should be achieved |
| `Status__c` | Picklist | On Track / At Risk / Missed / Completed |
| `CompletedDate__c` | Date | Actual completion date |
| `Color__c` | Text(7) | Hex color for visual grouping |

### New Junction Object: MilestoneCard__c

| Field API Name | Type | Purpose |
|----------------|------|---------|
| `Name` | Auto Number | Junction record identifier |
| `Milestone__c` | Master-Detail(Milestone__c) | Parent milestone |
| `Card__c` | Lookup(Card__c) | Linked card |
| `Required__c` | Checkbox | Whether this card must complete for milestone success |

### Derived Fields (Apex Rollup)
- **Total linked cards** — count of MilestoneCard__c records
- **Completed linked cards** — count where Card.Status = Done
- **Completion percentage** — completed / total

## Key Screens

### Milestone Manager Modal
- Create/edit milestones with target date, description, and color
- Link cards via search or drag from backlog
- Progress bar showing completion percentage
- Auto-status calculation based on linked card states and target date

### Timeline Integration
- Diamond markers (◆) rendered at target dates on the timeline
- Hover tooltip shows milestone name, progress, and linked cards
- Click opens the milestone manager modal

### Board Header Banner
- Optional milestone countdown banner above the board
- Shows the next upcoming milestone with days remaining and progress
- Color-coded by milestone status (green/amber/red)

### Sprint View Integration
- Milestones within the sprint date range shown in the sprint header
- Sprint completion modal flags milestones affected by carry-over cards

## Implementation

### Apex Changes

| Layer | File | Changes |
|-------|------|---------|
| **Controller** | `KanbanBoardController.cls` | Add `getMilestones`, `createMilestone`, `updateMilestone`, `deleteMilestone`, `linkCardToMilestone`, `unlinkCardFromMilestone` |
| **Service** | `MilestoneService.cls` (new) | Milestone CRUD, status calculation, card linking logic |
| **Selector** | `MilestoneSelector.cls` (new) | Queries for milestones by board, with linked card rollups |
| **DTO** | `KanbanBoardDTO.cls` | Add `MilestoneDTO` inner class with linked card summary |
| **Trigger** | `MilestoneTriggerHandler.cls` (new) | Publish milestone events for real-time sync |

### Scheduled Apex
- **MilestoneStatusScheduler** — daily job to auto-update milestone statuses:
  - If target date passed and incomplete cards remain → Status = Missed
  - If all required cards complete → Status = Completed
  - If any linked card is blocked or overdue → Status = At Risk

### Frontend (LWC)

| Component | Purpose |
|-----------|---------|
| `kanbanMilestoneModal` | Create/edit milestone with card linking |
| `kanbanMilestoneBanner` | Board header countdown display |

### Store Changes

| File | Changes |
|------|---------|
| `actionTypes.js` | Add `LOAD_MILESTONES`, `ADD_MILESTONE`, `UPDATE_MILESTONE`, `DELETE_MILESTONE` |
| `reducers.js` | Add `milestoneReducer` for milestone state management |
| `selectors.js` | Add `getMilestonesByBoard`, `getNextMilestone`, `getMilestoneProgress` |
| `milestoneThunks.js` (new) | Async operations for milestone CRUD |

### Platform Events
- Add milestone fields to existing `CardUpdateEvent__e` payload, or create a new `MilestoneUpdateEvent__e` if payload size is a concern
- Real-time milestone status updates when linked cards change state

## Salesforce Advantage
Milestones can trigger Flows and Process Builder actions — email alerts when a milestone is at risk, Chatter posts when milestones are completed, Task creation for milestone owners. The scheduled Apex status checker integrates with the platform's built-in scheduling infrastructure.

## Risks

| Risk | Mitigation |
|------|-----------|
| Too many milestones cluttering the timeline | Collapsible milestone row; filter by date range |
| Status calculation lag (daily scheduled job) | Also recalculate on card status change events for near-real-time updates |
| Cards linked to multiple milestones | Supported by the junction object; UI shows all milestone badges on the card |
| Milestone deletion with linked cards | Soft delete or confirmation dialog; cascade delete junction records |
