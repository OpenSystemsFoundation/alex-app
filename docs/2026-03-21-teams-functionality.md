# Teams Functionality Design

**Date:** 2026-03-21
**Status:** Planning
**Author:** Claude (pair)

## Context

Alex is currently work-centric — boards, cards, and sprints are first-class concepts, but the *people* doing the work are represented only by User lookup fields (Assignee, Peer Reviewer) on individual cards. There is no concept of a team, team membership, capacity, or workload visibility.

This document outlines how Alex will introduce **Teams** as a first-class entity, enabling human-resource-oriented features like capacity planning, workload balancing, skills tracking, and availability management — all within the existing Salesforce architecture.

## Goals

1. **Team identity** — Model teams as named groups of users with roles, so boards can be team-owned rather than individual-owned
2. **Capacity planning** — Let scrum masters and team leads see how much work a team can take on in a sprint
3. **Workload visibility** — Surface per-member workload so work can be distributed evenly
4. **Skills & expertise** — Track what each team member is good at to inform assignment decisions
5. **Availability management** — Account for leave, holidays, and part-time schedules when planning sprints
6. **Team analytics** — Provide velocity, throughput, and contribution metrics at the team level

## Non-Goals

- Replacing Salesforce HR Cloud or a full HRIS system
- Payroll, compensation, or benefits management
- Org-chart / reporting-line hierarchy (may come later)
- Cross-org (Experience Cloud) team management in this phase

---

## Data Model

### New Custom Objects

#### `Team__c`

The core team entity. A team owns one or more boards.

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Name | `Name` | Text(80) | Team name (e.g., "Platform Team") |
| Description | `Description__c` | Long Text Area | Team purpose / charter |
| Status | `Status__c` | Picklist | `Active`, `Inactive`, `Archived` |
| Team Lead | `TeamLead__c` | Lookup(User) | Primary team lead |
| Default Velocity | `DefaultVelocity__c` | Number(4,0) | Baseline story points per sprint |
| Avatar Color | `AvatarColor__c` | Text(7) | Hex color for UI badges |

#### `TeamMember__c`

Junction object between `Team__c` and `User`. Supports multiple team memberships.

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Team | `Team__c` | Master-Detail(Team__c) | Parent team |
| User | `User__c` | Lookup(User) | The team member |
| Role | `Role__c` | Picklist | `Developer`, `QA`, `Designer`, `Scrum Master`, `Product Owner`, `Tech Lead` |
| Allocation | `Allocation__c` | Percent | % of time allocated to this team (supports shared resources) |
| Join Date | `JoinDate__c` | Date | When the member joined the team |
| Status | `Status__c` | Picklist | `Active`, `On Leave`, `Inactive` |
| Weekly Capacity Hours | `WeeklyCapacityHours__c` | Number(3,1) | Available hours per week (default 40) |

#### `TeamSkill__c`

Tracks skills and expertise per team member for smarter assignment.

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Team Member | `TeamMember__c` | Master-Detail(TeamMember__c) | Parent member record |
| Skill Name | `SkillName__c` | Text(80) | e.g., "Apex", "LWC", "Integration" |
| Proficiency | `Proficiency__c` | Picklist | `Beginner`, `Intermediate`, `Advanced`, `Expert` |

#### `Availability__c`

Tracks time-off and reduced capacity periods for sprint planning.

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Team Member | `TeamMember__c` | Master-Detail(TeamMember__c) | Parent member record |
| Start Date | `StartDate__c` | Date | First day of absence/reduced capacity |
| End Date | `EndDate__c` | Date | Last day |
| Type | `Type__c` | Picklist | `PTO`, `Holiday`, `Training`, `Reduced Hours`, `Sick Leave` |
| Capacity Override | `CapacityOverride__c` | Percent | 0% = fully out, 50% = half capacity |
| Notes | `Notes__c` | Text(255) | Optional context |

### Modified Existing Objects

#### `Board__c` — New Fields

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Team | `Team__c` | Lookup(Team__c) | Owning team (optional — personal boards remain valid) |

#### `Card__c` — New Fields

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Required Skills | `RequiredSkills__c` | Text(255) | Comma-separated skill names for smart assignment suggestions |

### Entity Relationship Summary

```
Team__c
  │
  ├── 1:N ── TeamMember__c ── N:1 ── User
  │              │
  │              ├── 1:N ── TeamSkill__c
  │              │
  │              └── 1:N ── Availability__c
  │
  └── 1:N ── Board__c
                │
                └── (existing Board → Column → Card hierarchy)
```

---

## Feature Breakdown

### Phase 1 — Team Foundation

Core team CRUD and board association.

**Scope:**

- `Team__c` and `TeamMember__c` objects, fields, and validation rules
- New LWC: `teamManager` — create/edit teams, add/remove members, assign roles
- New LWC: `teamSelector` — dropdown on board settings to associate a board with a team
- Board header shows team name and avatar color badge when team-linked
- Filter board assignee picklist to team members when a board is team-linked
- Permission set updates: `Alex_Admin` gets full Team CRUD; `Alex_User` gets read access + edit own membership
- Apex service: `TeamService.cls` — CRUD operations, membership validation, duplicate prevention
- Apex selector: `TeamSelector.cls` — queries for teams, members, and user-team lookups

**Validation Rules:**

- A user cannot be an active member of the same team twice
- Team must have at least one member with role `Scrum Master` or `Tech Lead` to be `Active`
- Allocation across all active teams for a user must not exceed 100%

### Phase 2 — Capacity & Availability

Sprint planning informed by real capacity data.

**Scope:**

- `Availability__c` object and fields
- `WeeklyCapacityHours__c` on `TeamMember__c`
- New LWC: `teamCapacityPanel` — shows per-member and total team capacity for a sprint date range
- Sprint modal enhancement: display team capacity alongside sprint goal and committed points
- Apex service: `CapacityService.cls` — calculate available capacity for a sprint based on member hours, allocation %, and availability records
- Capacity formula: `Available Points = Σ (member weekly hours × allocation % × weeks in sprint × capacity override) / hours-per-point`
- Visual capacity bar on sprint header: committed vs. available (green/yellow/red thresholds)

**Capacity Calculation Example:**

```
Sprint: 2 weeks
Member: 40 hrs/week, 100% allocation, 3 days PTO in week 2

Week 1: 40 × 1.0 = 40 hrs
Week 2: 40 × 1.0 × (2/5) = 16 hrs  (3 of 5 days off → 40% capacity)
Total: 56 hrs available

If 1 story point ≈ 4 hrs → ~14 points capacity
```

### Phase 3 — Skills & Smart Assignment

Surface expertise data to help assign the right person to each card.

**Scope:**

- `TeamSkill__c` object and fields
- `RequiredSkills__c` on `Card__c`
- New LWC: `skillsEditor` — manage skills per team member (inline editable table)
- Card panel enhancement: when assigning a card, show a "Suggested Assignees" list ranked by skill match and current workload
- Apex service: `SkillMatchService.cls` — score team members against card required skills, factoring in proficiency level and current card count

**Matching Algorithm (v1 — simple weighted scoring):**

```
Score = Σ (skill match × proficiency weight) − (current card count × load penalty)

Proficiency weights: Beginner=1, Intermediate=2, Advanced=3, Expert=4
Load penalty: 0.5 per assigned card in the current sprint
```

### Phase 4 — Team Analytics

Aggregate metrics at the team and member level.

**Scope:**

- New LWC: `teamAnalyticsDashboard` — team-level reports and charts
- **Team velocity chart** — velocity trend across sprints for the team (extends existing sprint velocity chart)
- **Member contribution breakdown** — stacked bar showing story points completed per member per sprint
- **Workload distribution** — current sprint card count and point total per member (bar chart with capacity line overlay)
- **Skills coverage heatmap** — matrix of team members vs. skills, colored by proficiency
- Apex service: `TeamAnalyticsService.cls` — aggregate queries across `SprintCard__c`, `Card__c`, and `TeamMember__c`

---

## Security Model

### Object-Level Security

| Object | Alex_Admin | Alex_User |
|--------|-----------|-----------|
| `Team__c` | CRUD | Read |
| `TeamMember__c` | CRUD | Read + Edit (own records) |
| `TeamSkill__c` | CRUD | Read + Edit (own records) |
| `Availability__c` | CRUD | Read + Create/Edit (own records) |

### Field-Level Security

- All fields readable by `Alex_User`
- `Team__c.Status__c` and `Team__c.TeamLead__c` editable only by `Alex_Admin`
- Members can edit their own `WeeklyCapacityHours__c`, skills, and availability

### Sharing Model

- `Team__c` OWD: `Public Read Only` — all users can see all teams
- `TeamMember__c` inherits from `Team__c` (Master-Detail)
- Board-level sharing unchanged — team association is informational, not a security boundary in Phase 1

---

## UI Integration Points

### Board Header

```
┌──────────────────────────────────────────────────────────────┐
│  [●] Platform Team          Sprint SP-0012 (Active)    ...  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Capacity: ████████████░░░░ 34/42 pts  |  5 members online  │
└──────────────────────────────────────────────────────────────┘
```

### Card Assignment Panel

```
Assignee: [Select...]

  Suggested (by skill match):
  ┌─────────────────────────────────────────┐
  │  ★★★★ Jane S. — Apex Expert, 3 cards   │
  │  ★★★  Bob T.  — Apex Advanced, 5 cards │
  │  ★★   New Dev — Apex Intermediate, 1   │
  └─────────────────────────────────────────┘
```

### Team Manager (standalone page)

```
┌─────────────────────────────────────────────────────────────┐
│  Team: Platform Team                        [Edit] [Archive]│
│  Lead: Jane Smith          Status: Active                   │
│  Default Velocity: 42 pts  Boards: 2                        │
├─────────────────────────────────────────────────────────────┤
│  Members (5)                              [+ Add Member]    │
│  ┌──────────┬───────────┬──────────┬────────┬────────────┐  │
│  │ Name     │ Role      │ Alloc.   │ Status │ Capacity   │  │
│  ├──────────┼───────────┼──────────┼────────┼────────────┤  │
│  │ Jane S.  │ Tech Lead │ 100%     │ Active │ 40 hrs/wk  │  │
│  │ Bob T.   │ Developer │ 80%      │ Active │ 32 hrs/wk  │  │
│  │ Carol R. │ QA        │ 50%      │ Active │ 20 hrs/wk  │  │
│  │ Dave M.  │ Developer │ 100%     │ On Leave│ 0 hrs/wk  │  │
│  │ Eve L.   │ Designer  │ 100%     │ Active │ 40 hrs/wk  │  │
│  └──────────┴───────────┴──────────┴────────┴────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Skills Coverage                                            │
│  ┌──────────┬──────┬─────┬─────────┬───────┐               │
│  │          │ Apex │ LWC │ Integr. │ Tests │               │
│  │ Jane S.  │ ████ │ ███ │ ██      │ ████  │               │
│  │ Bob T.   │ ███  │ ████│ ████    │ ███   │               │
│  │ Carol R. │ █    │ █   │         │ ████  │               │
│  │ Eve L.   │      │ ████│ █       │ ██    │               │
│  └──────────┴──────┴─────┴─────────┴───────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### Architecture Alignment

All new functionality follows the existing patterns documented in [ARCHITECTURE.md](ARCHITECTURE.md):

- **Apex layers:** Controller → Service → Selector → DTO (no business logic in controllers)
- **LWC patterns:** Redux-style store actions for team state, platform events for real-time membership changes
- **Testing:** Apex tests with `@TestSetup`, Jest unit tests for all new LWC components, Playwright E2E for team manager flow
- **Namespace:** All metadata files use unprefixed API names; Apex/LWC code uses `OpenSF__` prefix at runtime

### Phased Rollout

| Phase | Features | Dependencies |
|-------|----------|-------------|
| **1 — Foundation** | Team CRUD, membership, board association | None |
| **2 — Capacity** | Availability tracking, sprint capacity calculation | Phase 1 |
| **3 — Skills** | Skill profiles, smart assignment suggestions | Phase 1 |
| **4 — Analytics** | Team velocity, workload distribution, skills heatmap | Phases 1-3 |

Each phase ships as an independent increment — later phases enhance but do not break earlier ones.

### New Apex Classes (Estimated)

| Class | Layer | Phase |
|-------|-------|-------|
| `TeamService.cls` | Service | 1 |
| `TeamSelector.cls` | Selector | 1 |
| `TeamDTO.cls` | DTO | 1 |
| `CapacityService.cls` | Service | 2 |
| `SkillMatchService.cls` | Service | 3 |
| `TeamAnalyticsService.cls` | Service | 4 |
| + corresponding test classes | Test | All |

### New LWC Components (Estimated)

| Component | Phase |
|-----------|-------|
| `teamManager` | 1 |
| `teamSelector` | 1 |
| `teamCapacityPanel` | 2 |
| `skillsEditor` | 3 |
| `teamAnalyticsDashboard` | 4 |

---

## Open Questions

1. **Hours-per-point ratio** — Should this be configurable per team, or use a global default? Recommendation: per-team setting on `Team__c`.
2. **Multi-team boards** — Should a board support multiple owning teams (e.g., cross-functional projects)? Recommendation: single team per board in Phase 1, revisit later.
3. **Historical membership** — Should we track when members join/leave for historical analytics, or is current state sufficient? Recommendation: `JoinDate__c` + soft-delete (`Status = Inactive`) in Phase 1; full audit trail later if needed.
4. **Agentforce integration** — The roadmap mentions an AI sprint planning assistant. Should smart assignment (Phase 3) be built as an Agentforce action from the start? Recommendation: build as Apex service first, wrap as Agentforce action later.
