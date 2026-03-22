# LeSS (Large-Scale Scrum) Framework Implementation Guide for Alex

**Date:** 2026-03-22
**Version:** 1.0
**Status:** Proposal

---

## Table of Contents

1. [Overview](#overview)
2. [What is LeSS?](#what-is-less)
3. [Why LeSS for Alex?](#why-less-for-alex)
4. [Current State Assessment](#current-state-assessment)
5. [LeSS Implementation Plan](#less-implementation-plan)
6. [Data Model Changes](#data-model-changes)
7. [UI/UX Changes](#uiux-changes)
8. [Backend Changes](#backend-changes)
9. [Multi-Team Coordination Features](#multi-team-coordination-features)
10. [Rollout Strategy](#rollout-strategy)
11. [LeSS Huge Considerations](#less-huge-considerations)

---

## Overview

This document describes how to implement the LeSS (Large-Scale Scrum) framework in the Alex Kanban/Scrum application to support scaled agile delivery across multiple teams working on a single product. LeSS extends the single-team Scrum process Alex already supports into a coherent multi-team model while preserving simplicity.

---

## What is LeSS?

LeSS is a framework for scaling Scrum to multiple teams (2-8 teams) working together on a single product. Core principles:

- **One Product Backlog** — A single prioritized backlog for the entire product, managed by one Product Owner.
- **One Product Owner** — A single person responsible for backlog prioritization across all teams.
- **One Definition of Done** — Shared quality standards across all teams.
- **One Potentially Shippable Product Increment** — All teams integrate into a single deliverable each sprint.
- **Common Sprint** — All teams share the same sprint cadence and boundaries.
- **Cross-functional, Feature Teams** — Each team can work on any part of the product, avoiding component-team silos.

### LeSS vs. LeSS Huge

| Aspect | LeSS (Basic) | LeSS Huge |
|--------|--------------|-----------|
| Teams | 2-8 | 8+ |
| Product Owners | 1 | 1 (with Area Product Owners) |
| Backlogs | 1 | 1 product + area backlogs |
| Coordination | Cross-team meetings | Requirement Areas |

---

## Why LeSS for Alex?

Alex currently supports single-team Scrum with boards, sprints, backlogs, and analytics. Many organizations using Salesforce operate at scale with multiple development or delivery teams. Adding LeSS support enables:

1. **Multi-team sprint planning** — Multiple teams pull from a shared backlog within a common sprint.
2. **Cross-team visibility** — One board showing all teams' progress toward the shared increment.
3. **Integrated analytics** — Velocity, burndown, and flow metrics aggregated across teams.
4. **Coordination without overhead** — Lightweight ceremonies (cross-team refinement, overall retrospective) built into the tooling.

---

## Current State Assessment

### What Alex Already Has

| LeSS Requirement | Current Alex Feature | Gap |
|-----------------|---------------------|-----|
| Product Backlog | `Card__c` with `NeedsRefinement__c`, `StoryPoints__c`, backlog view | Need team assignment, multi-team filtering |
| Sprint Management | `Sprint__c` with lifecycle, `SprintCard__c` junction | Need shared sprints across teams |
| Board Visualization | `Board__c` with columns, drag-drop, real-time sync | Need multi-team board view with team swimlanes |
| Analytics | Burndown, velocity, daily snapshots | Need cross-team aggregation |
| Story Points | Per-card, per-sprint tracking | Ready — no changes needed |
| Planning Poker | `PokerSession__c` (in progress) | Need multi-team estimation sessions |
| Retrospectives | `Retrospective__c` (in progress) | Need overall retro support |
| Real-time Sync | Platform Events with polling fallback | Ready — scales to multi-team |
| LexoRank Ordering | Fractional indexing for card positioning | Ready — no changes needed |

### Key Gaps to Fill

1. **Team entity** — No concept of a team within a board
2. **Shared sprint** — Sprints are board-scoped, not product-scoped
3. **Multi-team board view** — No swimlane-by-team visualization
4. **Cross-team ceremonies** — No tooling for joint refinement, sprint planning, or overall retrospectives
5. **Product-level analytics** — Analytics are per-sprint only, not cross-team

---

## Data Model Changes

### New Custom Objects

#### Team__c

Represents an agile team within a product/board.

| Field | Type | Description |
|-------|------|-------------|
| `Name` | Text(80) | Team name (e.g., "Team Alpha") |
| `Board__c` | Master-Detail(Board) | The board/product this team belongs to |
| `Description__c` | Long Text Area | Team purpose and focus |
| `Color__c` | Text(7) | Hex color for swimlane/avatar display |
| `Active__c` | Checkbox | Whether the team is currently active |
| `MaxCapacity__c` | Number | Story points capacity per sprint |
| `SprintCadence__c` | Number | Default sprint length in days |

#### TeamMember__c

Junction object linking users to teams.

| Field | Type | Description |
|-------|------|-------------|
| `Team__c` | Master-Detail(Team) | The team |
| `User__c` | Lookup(User) | The team member |
| `Role__c` | Picklist | Role within team (Developer, Scrum Master, Product Owner, Tester, Designer) |
| `Active__c` | Checkbox | Current active membership |

#### RequirementArea__c (LeSS Huge Only)

Groups related backlog items for large-scale organization.

| Field | Type | Description |
|-------|------|-------------|
| `Name` | Text(80) | Area name (e.g., "Payments", "User Management") |
| `Board__c` | Master-Detail(Board) | Parent product |
| `AreaProductOwner__c` | Lookup(User) | Area Product Owner |
| `Description__c` | Long Text Area | Scope of this requirement area |
| `Color__c` | Text(7) | Visual identifier |

### Modified Existing Objects

#### Card__c (Additional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `Team__c` | Lookup(Team) | Team assigned to this card during sprint planning |
| `RequirementArea__c` | Lookup(RequirementArea) | Requirement area grouping (LeSS Huge) |

#### Sprint__c (Additional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `IsSharedSprint__c` | Checkbox | Whether this sprint is shared across teams (LeSS mode) |
| `ParticipatingTeams__c` | Number | Count of teams participating (rollup or calculated) |

#### SprintCard__c (Additional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `Team__c` | Lookup(Team) | Which team owns this card within the sprint |

#### Board__c (Additional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `ScalingMode__c` | Picklist | None / LeSS / LeSS Huge |
| `ProductOwner__c` | Lookup(User) | Explicit Product Owner for the product |

#### Retrospective__c (Additional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `RetroScope__c` | Picklist | Team / Overall |
| `Team__c` | Lookup(Team) | Null for overall retros; set for team-specific retros |

### Entity Relationship Summary

```
Board__c (Product)
  ├── Team__c (1..8 teams)
  │     └── TeamMember__c (junction → User)
  ├── Column__c (workflow stages, shared by all teams)
  ├── Card__c (single product backlog)
  │     ├── Team__c (assigned during sprint planning)
  │     └── RequirementArea__c (LeSS Huge grouping)
  ├── Sprint__c (shared sprint, common cadence)
  │     └── SprintCard__c (includes Team__c for per-team tracking)
  ├── RequirementArea__c (LeSS Huge only)
  └── Retrospective__c (team-level + overall)
```

---

## UI/UX Changes

### 1. Board Scaling Mode Toggle

Add a setting in Admin Management to enable LeSS mode on a board:

- **None** — Current single-team behavior (default)
- **LeSS** — Enables multi-team features (2-8 teams)
- **LeSS Huge** — Enables requirement areas (8+ teams)

When LeSS mode is enabled, the following UI changes activate.

### 2. Team Management Panel

New section in Admin Management:

- Create/edit/deactivate teams
- Assign members to teams with roles
- Set team color and capacity
- View team membership across the product

### 3. Multi-Team Board View (Swimlanes)

Extend `kanbanBoard` to support a team swimlane view:

```
┌─────────────────────────────────────────────────────────┐
│  Sprint SP-0042  │  Mar 10 - Mar 24  │  3 Teams Active  │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│          │ To Do    │ In Prog  │ Review   │ Done        │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│ Team     │          │          │          │             │
│ Alpha    │ [Card-1] │ [Card-3] │          │ [Card-5]    │
│ (12 pts) │ [Card-2] │          │          │             │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│ Team     │          │ [Card-7] │ [Card-8] │             │
│ Beta     │ [Card-6] │          │          │             │
│ (8 pts)  │          │          │          │             │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│ Team     │ [Card-9] │ [Card-10]│          │ [Card-11]   │
│ Gamma    │          │          │          │             │
│ (10 pts) │          │          │          │             │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

- Toggle between flat view (current) and team swimlane view
- Each swimlane shows team name, color, and sprint point total
- Drag cards between swimlanes to reassign teams
- Filter board by team

### 4. Shared Backlog with Team Column

Extend `kanbanBacklogView`:

- Add "Team" column showing team assignment (blank = unassigned)
- Add "Requirement Area" column (LeSS Huge mode)
- Filter by team or requirement area
- Bulk-assign cards to teams during sprint planning
- Visual indicator for team capacity vs. committed points

### 5. Multi-Team Sprint Planning View

New component for LeSS sprint planning (two-part planning):

**Sprint Planning One (All Teams)**
- Product Owner presents highest-priority items
- Teams collaboratively select items from the shared backlog
- Each team claims cards by assigning `Team__c`
- Real-time capacity tracking per team
- Visual indicator when a team approaches capacity

**Sprint Planning Two (Per Team)**
- Each team breaks down their selected items
- Standard task breakdown and estimation
- Uses existing Planning Poker for estimation

### 6. Cross-Team Analytics Dashboard

Extend `kanbanAnalytics`:

- **Product Burndown** — Aggregated across all teams
- **Per-Team Burndown** — Overlaid lines per team
- **Team Velocity Comparison** — Side-by-side velocity charts
- **Sprint Summary** — Per-team and total story points
- **Dependency Heat Map** — Visual indicator of cross-team card dependencies

### 7. Overall Retrospective View

Extend `retroBoard`:

- Support "Overall" retro scope (all teams together)
- Pre-populated with insights from team-level retros
- Action items assignable to specific teams or product-wide

---

## Backend Changes

### New Apex Classes

#### TeamService.cls

```
- createTeam(Board__c boardId, String name, String color) → Team__c
- addTeamMember(Team__c teamId, User userId, String role) → TeamMember__c
- removeTeamMember(TeamMember__c membershipId)
- getTeamsForBoard(Board__c boardId) → List<TeamDTO>
- getTeamCapacity(Team__c teamId, Sprint__c sprintId) → CapacityDTO
- deactivateTeam(Team__c teamId)
```

#### LessCoordinationService.cls

```
- assignCardToTeam(Card__c cardId, Team__c teamId) → void
- bulkAssignCardsToTeam(List<Card__c> cardIds, Team__c teamId) → void
- getSprintPlanningData(Sprint__c sprintId) → SprintPlanningDTO
- getTeamSprintCommitment(Team__c teamId, Sprint__c sprintId) → CommitmentDTO
- getCrossTeamDependencies(Sprint__c sprintId) → List<DependencyDTO>
```

#### LessAnalyticsService.cls

```
- getProductBurndown(Sprint__c sprintId) → BurndownDTO
- getTeamBurndowns(Sprint__c sprintId) → Map<Team__c, BurndownDTO>
- getTeamVelocityComparison(Board__c boardId, Integer sprintCount) → List<TeamVelocityDTO>
- getProductVelocity(Board__c boardId, Integer sprintCount) → VelocityDTO
```

### Modified Apex Classes

#### KanbanBoardController.cls

- Add `getTeams()` method for board team retrieval
- Modify `getBoardData()` to include team information when LeSS mode is enabled

#### SprintService.cls

- Update `startSprint()` to validate all participating teams
- Update `completeSprint()` to generate per-team completion metrics
- Add `getTeamSprintCards()` for team-filtered sprint views

#### KanbanBoardDTO.cls

- Add `TeamDTO` inner class (Id, Name, Color, MemberCount, Capacity)
- Add `TeamMemberDTO` inner class (UserId, Name, Role)
- Add team field to `SprintCardDTO`

### New Platform Event Fields

#### CardUpdateEvent__e

- Add `Team__c` field to propagate team assignment changes in real-time

#### SprintUpdateEvent__e

- Add `Team__c` field for team-specific sprint events

### Enum Additions (KanbanEnums.cls)

```apex
public enum ScalingMode { NONE, LESS, LESS_HUGE }
public enum TeamRole { DEVELOPER, SCRUM_MASTER, PRODUCT_OWNER, TESTER, DESIGNER }
public enum RetroScope { TEAM, OVERALL }
```

---

## Multi-Team Coordination Features

### 1. Cross-Team Refinement

LeSS prescribes multi-team backlog refinement. Support this with:

- **Refinement mode** on the backlog view — enables collaborative refinement with multiple teams
- **Team interest flags** — teams can flag backlog items they may want to work on
- **Refinement notes** on cards — shared notes from multi-team refinement sessions
- Use existing `NeedsRefinement__c` flag to track refinement status

### 2. Cross-Team Sprint Review

All teams demo together in one sprint review. Support with:

- **Sprint review dashboard** — aggregated view of all "Done" cards across teams
- **Demo order** — configurable presentation order by team
- **Stakeholder feedback capture** — notes on reviewed cards

### 3. Dependency Tracking

Cross-team dependencies are a scaling risk. Support with:

- **Card linking** — extend existing `LinkedRecord__c` or add `CardDependency__c` to link cards that depend on each other across teams
- **Dependency visualization** — show blocked/blocking relationships on the board
- **Dependency alerts** — platform event notifications when a blocking card status changes

### 4. Community of Practice Support

LeSS encourages communities of practice (CoPs) for knowledge sharing:

- Tag cards with technical domains (e.g., "API", "UI", "Security")
- Filter across teams by domain to find related work
- Optional: link CoP discussions to card comments

---

## Rollout Strategy

### Phase 1: Foundation (Sprints 1-2)

1. Create `Team__c` and `TeamMember__c` objects
2. Add `Team__c` lookup to `Card__c` and `SprintCard__c`
3. Add `ScalingMode__c` to `Board__c`
4. Build Team Management panel in Admin Management
5. Implement `TeamService.cls`

### Phase 2: Multi-Team Board (Sprints 3-4)

1. Build team swimlane view in `kanbanBoard`
2. Add team filtering to backlog view
3. Update `SprintService` for shared sprints with team tracking
4. Implement `LessCoordinationService.cls`
5. Update Platform Events with team fields

### Phase 3: Scaled Ceremonies (Sprints 5-6)

1. Build Sprint Planning One view (multi-team item selection)
2. Extend retrospective for Overall scope
3. Build sprint review dashboard
4. Add cross-team dependency tracking

### Phase 4: Analytics and Polish (Sprints 7-8)

1. Implement `LessAnalyticsService.cls`
2. Build product-level burndown and velocity charts
3. Add team velocity comparison
4. Implement dependency heat map
5. Performance testing with 8 teams, 500+ cards

### Phase 5: LeSS Huge (Future)

1. Create `RequirementArea__c` object
2. Add Area Product Owner role
3. Implement area backlog filtering
4. Scale analytics to requirement area level

---

## LeSS Huge Considerations

For organizations with 8+ teams, LeSS Huge adds Requirement Areas:

- **Requirement Areas** group related features/capabilities (e.g., "Payments", "User Management")
- Each area has an **Area Product Owner** who manages that slice of the product backlog
- Teams are dynamically allocated to requirement areas based on demand
- The single Product Owner still owns overall prioritization

### Impact on Alex

- `RequirementArea__c` object with Area Product Owner lookup
- Cards tagged with requirement areas for filtered backlog views
- Area-level analytics in addition to team and product-level
- Area backlog view showing cards filtered by requirement area
- Support for teams moving between areas across sprints

---

## Key LeSS Principles to Preserve in Implementation

1. **Simplicity over process** — Do not over-engineer coordination tooling. LeSS succeeds through direct team communication, not complex workflows.
2. **Transparency** — All teams see the same board, same backlog, same sprint. No hidden queues or team-specific silos.
3. **Whole product focus** — Analytics should emphasize the product increment, not individual team performance metrics that encourage local optimization.
4. **Voluntary coordination** — Cross-team sync should be opt-in and lightweight. Avoid mandating synchronization ceremonies through the tool.
5. **Feature teams over component teams** — The team assignment model should support any team taking any card, not restrict cards to specific teams.

---

## References

- [LeSS Framework Official Site](https://less.works)
- [Large-Scale Scrum by Craig Larman & Bas Vodde](https://less.works/less/rules)
- Alex App [ARCHITECTURE.md](ARCHITECTURE.md) for current system design
- Alex App [PRODUCT_VISION.md](PRODUCT_VISION.md) for roadmap alignment
