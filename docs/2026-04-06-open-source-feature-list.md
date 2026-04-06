# Alex — Open Source vs Paid Feature List

**Date:** 2026-04-06
**Status:** Draft — pending discussion

## Overview

Two separate listings, two separate repos:

| | Alex (Open Source) | Alexandra (Paid) |
|---|---|---|
| **Repo** | `OpenSystemsFoundation/alex-app` (public) | `elgeffe/alexandra` (private) |
| **Listing** | AppExchange Free | AppExchange Paid |
| **License** | MIT | Proprietary |
| **Namespace** | OpenSF | OpenSF |

---

## Feature Comparison

| Feature | Alex OSS (Free) | Alexandra (Paid) |
|---|:---:|:---:|
| **Core Kanban Board** | | |
| Multiple boards with custom columns | ✅ | ✅ |
| Drag-and-drop cards (LexoRank ordering) | ✅ | ✅ |
| Card detail panel (title, desc, type, priority, assignee) | ✅ | ✅ |
| Column WIP limits | ✅ | ✅ |
| Column categories (Backlog → Released) | ✅ | ✅ |
| Card type icons | ✅ | ✅ |
| Context menu (quick actions) | ✅ | ✅ |
| Undo / Redo | ✅ | ✅ |
| **Sprint Management** | | |
| Create / start / complete sprints | ✅ | ✅ |
| Sprint header with goal & progress bar | ✅ | ✅ |
| Backlog view with drag-to-sprint | ✅ | ✅ |
| Sprint completion wizard | ✅ | ✅ |
| Story point tracking | ✅ | ✅ |
| Sprint snapshots (burndown data) | — | ✅ |
| Sprint reports & velocity trending | — | ✅ |
| Scheduled snapshot jobs | — | ✅ |
| **Card Features** | | |
| Card comments | ✅ | ✅ |
| Epic cards with child progress | ✅ | ✅ |
| Card file attachments | — | ✅ |
| Card-to-card linking (blocks, duplicates, etc.) | — | ✅ |
| Linked Salesforce records (bidirectional sync) | — | ✅ |
| Card custom fields (metadata-driven) | — | ✅ |
| **Real-time Collaboration** | | |
| Platform events (card & column sync) | ✅ | ✅ |
| Multi-user live board updates | ✅ | ✅ |
| Connection status indicator | ✅ | ✅ |
| Conflict detection & resolution | ✅ | ✅ |
| Sprint / retro / design / poker events | — | ✅ |
| **Board Features** | | |
| Board filters (priority, status, assignee, type) | ✅ | ✅ |
| Swimlanes (by assignee, epic, etc.) | — | ✅ |
| Hidden boards | — | ✅ |
| Console app layout | — | ✅ |
| **Teams & Admin** | | |
| Basic permission sets (User / Admin) | ✅ | ✅ |
| Team management (members, roles, allocation) | — | ✅ |
| Admin management panel | — | ✅ |
| Design Thinking permission set | — | ✅ |
| **Analytics & Reporting** | | |
| Cumulative flow diagram | — | ✅ |
| Cycle time / lead time / throughput | — | ✅ |
| Workload by assignee | — | ✅ |
| Standard reports (7) & dashboard | — | ✅ |
| **Planning Poker** | — | ✅ |
| **Retrospectives** | — | ✅ |
| **Design Thinking** | | |
| 6-phase sessions, 13 tools | — | ✅ |
| Sticky canvas, empathy maps, brainstorm, etc. | — | ✅ |
| Dot voting, card pipeline | — | ✅ |
| **Roadmap** | | |
| Roadmap board (Now/Next/Later horizons) | — | ✅ |
| Epic dependencies | — | ✅ |
| **Automation (Flows)** | | |
| Auto-create cards from Cases | — | ✅ |
| Email & in-app notifications | — | ✅ |
| Column auto-setup | ✅ | ✅ |
| **AI (Agentforce)** | | |
| Natural language sprint/card management | — | ✅ |
| Smart assignment & capacity analysis | — | ✅ |
| Story point estimation | — | ✅ |
| Board insights & burndown queries | — | ✅ |

---

## Design Philosophy

### OSS (Free) — "A complete Kanban board that actually works"

Comparable to free Trello or a basic Jira board. Ships with everything needed to run a real team's workflow:

- Boards, columns, cards, drag-and-drop
- Sprints with backlog and completion
- Comments and epics
- Real-time multi-user sync
- Filters and undo/redo
- Basic permissions

### Paid — "The enterprise & team collaboration layer"

Everything in OSS, plus the features that justify a paid listing:

- Analytics (CFD, cycle time, velocity, reports, dashboards)
- Planning Poker (estimation sessions)
- Retrospectives (voting, templates)
- Design Thinking (6 phases, 13 tools, sticky canvases)
- Roadmap planning (horizons, epic dependencies)
- Advanced card features (file attachments, linking, custom fields, linked records)
- Team management (roles, allocation, capacity)
- Swimlanes and hidden boards
- Flow automations (Case→Card, notifications)
- Agentforce AI assistant
- Console app layout
- Admin management panel

---

## Paid-Only Object & Component Inventory

These are **excluded** from the OSS package:

### Objects
- `SprintSnapshot__c`, `CardColumnHistory__c`
- `CardLink__c`, `LinkedRecord__c`, `CardCustomField__mdt`
- `DesignSession__c`, `DesignSessionCard__c`, `DesignNote__c`, `DesignVote__c`, `DesignArtifact__c`
- `PokerSession__c`, `PokerParticipant__c`
- `Retrospective__c`, `RetroCard__c`, `RetroVote__c`
- `RoadmapItem__c`, `EpicDependency__c`
- `Team__c`, `TeamMember__c`
- `DesignSessionEvent__e`, `PokerEvent__e`, `RetroUpdateEvent__e`, `LinkedRecordEvent__e`
- `KanbanConfig__c`

### LWC Components
- `kanbanAnalytics`, `kanbanCumulativeFlowDiagram`
- `kanbanSprintReports`
- `planningPoker`
- `retroBoard`
- `designThinkingView`, `designSessionList`, `designSessionBoard`, `designPhaseNav`, `designToolPicker`, `designToolCanvas`
- `designStickyCanvas`, `designStickyNote`, `designBrainstormCanvas`, `designEmpathyMap`, `designFeedbackGrid`, `designHmwBuilder`, `designCardPipeline`, `designDotVoting`, `designTimer`, `designParticipantBar`
- `roadmapBoard`
- `adminManagement`
- `cardLinkedCards`

### Apex Classes
- `AnalyticsService`, `SprintSnapshotScheduler`
- `PlanningPokerController`
- `RetrospectiveController`, `RetrospectiveService`, `RetrospectiveDTO`
- `DesignSessionController`, `DesignSessionService`, `DesignSessionSelector`, `DesignSessionDTO`, `DesignEnums`
- `RoadmapController`, `RoadmapService`
- `RecordLinkingService`, `CardLinkService`, `CardFileService`
- `TeamService`, `TeamSelector`
- `AdminController`

### Flows
- `Auto_Create_Card_from_Case`, `Card_Email_Notifications`, `Card_Notifications`, `Feedback_Reporting`

### Agentforce (entire extension package)
- All `Agent*` Apex classes, GenAI plugins, bot definitions, authoring bundles
