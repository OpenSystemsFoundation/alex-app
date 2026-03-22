# Atlassian Competitive Analysis — Part 2: Jira Software Feature Comparison

**Date:** March 22, 2026
**Series:** Atlassian Competitive Analysis (Part 2 of 5)
**Author:** Architecture review by Claude (Opus 4.6)

---

## Boards & Views

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Scrum Boards | **Alex Has** | Kanban board with sprint support, columns, drag-and-drop |
| Kanban Boards | **Alex Has** | Core feature — Redux store, LexoRank positioning, real-time sync |
| Column customization | **Alex Has** | Add/rename/reorder/delete columns |
| Card coloring | **Not yet** | Worth building — visual categorization by priority, type, or epic |
| Swimlanes | **Alex Planned** | Grouped by epic, assignee, priority, or card type |
| WIP Limits | **Alex Planned** | `WipLimit__c` on Column — warn/enforce when exceeded |
| Quick filters | **Not yet** | Worth building — filter board by assignee, label, priority without leaving the view |
| Board-level estimation | **Alex Has** | Story points on cards, visible on board |
| Kanplan (Kanban + Backlog) | **Alex Has** | Backlog view alongside board |
| List View | **Not yet** | Lower priority — table of cards with inline editing |
| Calendar View | **Not yet** | Medium priority — date-based card visualization |
| Timeline / Roadmap View | **Alex Planned** | Gantt-style timeline with dependency arrows (see timeline-gantt-view.md) |
| Summary View | **Not yet** | Dashboard-style project overview |

### Assessment
Alex covers the core board experience well. The gaps — swimlanes, WIP limits, quick filters, card coloring — are all planned or straightforward to build. Timeline view is already designed. Calendar and list views are nice-to-haves, not blockers.

---

## Backlog Management

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Drag-and-drop prioritization | **Alex Has** | LexoRank fractional indexing, same algorithm as Jira |
| Backlog refinement | **Partial** | Can reorder; no bulk edit or split stories |
| Epic-based grouping | **Alex Has** | Cards grouped by epic in backlog |
| Quick filters on backlog | **Not yet** | Worth building alongside board quick filters |
| Inline estimation | **Alex Has** | Story points editable on cards |
| Backlog-to-sprint drag | **Alex Has** | Drag cards from backlog into active sprint |

### Assessment
Backlog is solid. Bulk operations (multi-select, bulk assign, bulk move) would be the highest-impact addition.

---

## Sprints

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Sprint creation & naming | **Alex Has** | Sprint management with dates |
| Sprint planning (drag from backlog) | **Alex Has** | Core workflow supported |
| Sprint start / complete | **Alex Has** | Lifecycle management |
| Scope change tracking | **Not yet** | Worth building — track cards added/removed mid-sprint |
| Sprint goals | **Not yet** | Simple text field on Sprint — easy to add |
| Velocity tracking | **Alex Has** | Sprint analytics dashboard |
| Estimation (story points) | **Alex Has** | Story points with planning poker |
| Estimation (ideal hours, custom) | **Not yet** | Lower priority — story points are the standard |

### Assessment
Sprint management is mature. Sprint goals and scope change tracking would round it out. Both are low-effort additions.

---

## Issue / Work Item Types

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Epics | **Alex Has** | Epic management and grouping |
| Stories / Tasks | **Alex Has** | Card__c is the primary work item |
| Sub-tasks | **Alex Planned** | Design doc exists (subtask-implementation.md) |
| Bugs (distinct type) | **Not yet** | Card Type field exists — could add Bug as a type value |
| Custom issue types | **Not yet** | Worth building — configurable card type picklist |
| Issue linking (blocks, relates to) | **Alex Planned** | Entangled card dependencies (entangled-card-dependencies.md) |
| Parent/child hierarchy | **Alex Planned** | Via subtasks |

### Assessment
The main gap is subtasks and dependency linking, both already designed. Custom card types would be a simple metadata addition. Alex doesn't need Jira's complex issue type scheme system — a configurable picklist on Card__c is sufficient.

---

## Custom Fields

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Text, number, date fields | **Not yet** | Worth building — custom fields on cards |
| Select / multi-select | **Not yet** | Worth building |
| User picker | **Not yet** | Worth building — additional assignees beyond primary |
| Labels / tags | **Not yet** | Worth building — lightweight categorization |
| Custom field contexts | **Not Relevant** | Jira enterprise complexity; Alex doesn't need this |
| Field configuration schemes | **Not Relevant** | Over-engineered for Alex's audience |

### Assessment
Custom fields on cards is a significant gap. Alex should support a configurable set of additional fields (text, number, date, picklist) without replicating Jira's elaborate field configuration system. A custom metadata approach with dynamic field rendering would work well on Salesforce.

---

## Workflows

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Visual workflow editor | **Not yet** | Medium priority — columns are implicit workflows today |
| Statuses & transitions | **Partial** | Columns serve as statuses; no formal transitions |
| Conditions & validators | **Not yet** | Worth building — e.g., "can't move to Done without assignee" |
| Approval steps | **Alex Planned** | Approval gates in columns (PRODUCT_VISION.md) |
| Workflow schemes | **Not Relevant** | Enterprise Jira complexity; unnecessary for Alex |
| Automation-triggered transitions | **Not yet** | Could integrate with Salesforce Flow |

### Assessment
Alex's column-based approach is simpler and more intuitive than Jira's workflow engine for the target audience. The key additions are: transition validation rules (conditions for moving between columns) and approval gates. A full visual workflow editor is over-engineering for Alex's use case — columns *are* the workflow.

---

## Automation

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| No-code automation builder | **Not yet** | **Salesforce Covers** — Flow Builder is more powerful |
| Triggers (created, updated, transitioned) | **Partial** | Platform event triggers exist; Apex triggers handle DML |
| Actions (assign, notify, transition) | **Not yet** | **Salesforce Covers** — Flow actions, Process Builder |
| Cross-project automation | **Not yet** | **Salesforce Covers** — Flows can operate across objects |
| Scheduled automation | **Not yet** | **Salesforce Covers** — Scheduled Flows |
| Webhook / external actions | **Not yet** | **Salesforce Covers** — HTTP callouts in Flow |

### Assessment
This is where Salesforce's platform advantage is massive. Jira built its own automation engine because it had to. Alex gets Flow Builder, Process Builder, Apex triggers, and platform events for free. Alex should expose its objects and events cleanly so admins can build automations using tools they already know — not build a separate automation UI.

**Recommendation:** Don't build an automation engine. Instead, document common automation patterns using Salesforce Flow (e.g., "auto-assign cards based on type," "notify Slack when card moves to Done," "create card from Case") and ship Flow templates.

---

## Reports & Analytics

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Burndown Chart | **Alex Has** | Sprint analytics |
| Burnup Chart | **Not yet** | Worth building — shows scope changes |
| Sprint Report | **Alex Has** | Completed vs. incomplete at sprint end |
| Velocity Chart | **Alex Has** | Commitment vs. delivered per sprint |
| Epic Report | **Not yet** | Medium priority — epic progress across sprints |
| Cumulative Flow Diagram | **Alex Planned** | Card counts per column over time |
| Control Chart (cycle/lead time) | **Alex Planned** | Via ColumnEnteredAt__c tracking |
| Created vs. Resolved | **Not yet** | **Salesforce Covers** — standard Salesforce reports |
| Time Tracking Report | **Not yet** | Lower priority — story points are primary metric |
| User Workload Report | **Not yet** | Medium priority — cards per assignee |
| Dashboards with gadgets | **Not yet** | **Salesforce Covers** — Salesforce dashboards + report types |

### Assessment
Alex has the core sprint analytics. The planned additions (CFD, cycle time) are the right priorities. For everything else, Alex should create **Salesforce report types** for Card, Sprint, Column, and Epic objects so admins can build their own reports and dashboards using the native Salesforce reporting engine. This is far more powerful than anything Alex could build custom.

**Recommendation:** Ship custom report types and a sample dashboard package. Let Salesforce's reporting engine do the heavy lifting.

---

## Search & Filtering

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| JQL (structured query language) | **Not Relevant** | Salesforce has SOQL and list view filters |
| Basic search with filters | **Partial** | Search exists; advanced filtering is limited |
| Saved filters | **Not yet** | **Salesforce Covers** — list views are saved filters |
| Quick filters on boards | **Not yet** | Worth building — toggleable board-level filters |
| Filter subscriptions (email alerts) | **Not yet** | **Salesforce Covers** — report subscriptions |

### Assessment
Alex should build quick filters on the board (filter by assignee, epic, priority, type with toggles). For saved searches and complex queries, Salesforce list views and reports already exist. No need to build JQL.

---

## DevOps & Developer Tools

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Git integration (branch/PR visibility) | **Not yet** | Worth building for developer-focused teams |
| CI/CD pipeline visibility | **Not yet** | Could integrate with Salesforce DevOps Center |
| Feature flag integration | **Not Relevant** | Niche; not aligned with Alex's audience |
| Deployment tracking | **Not yet** | Could leverage Salesforce deployment metadata |

### Assessment
DevOps integration is lower priority for Alex's primary audience (admins, BAs, consultants). For developer-focused teams, a lightweight GitHub/Bitbucket integration showing branch and PR status on cards would be valuable but is not a near-term priority.

---

## AI Features

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| AI-generated summaries | **Alex Planned** | Agentforce integration |
| Natural language to query | **Alex Planned** | Agentforce — "show me blocked cards" |
| AI-suggested descriptions | **Alex Planned** | Agentforce — card content generation |
| Duplicate detection | **Not yet** | Worth building with Agentforce |
| Sprint planning suggestions | **Alex Planned** | Agentforce — capacity-aware planning |
| Risk identification | **Alex Planned** | Agentforce — stale card detection, SLA warnings |

### Assessment
Alex's Agentforce integration is a genuine differentiator. Jira's "Atlassian Intelligence" is bolted on; Alex's AI runs on the same platform as the customer's CRM data, Cases, Opportunities, and business context. The AI can reason about business impact, not just project metrics.

---

## Permissions & Security

| Jira Feature | Alex Status | Notes |
|-------------|-------------|-------|
| Role-based access | **Partial** | Board Admin vs. Member roles |
| Permission schemes | **Not Relevant** | **Salesforce Covers** — profiles, permission sets, sharing rules |
| Issue-level security | **Not yet** | **Salesforce Covers** — record-level sharing |
| SSO / SCIM | **Not Relevant** | **Salesforce Covers** — platform-level SSO |
| Audit log | **Not yet** | **Salesforce Covers** — Field History Tracking, Setup Audit Trail |
| Data residency | **Not Relevant** | **Salesforce Covers** — Hyperforce |

### Assessment
Security and access control is entirely handled by the Salesforce platform. Alex inherits enterprise-grade security (SSO, MFA, IP restrictions, field-level security, record-level sharing) without building anything. This is a significant advantage over Jira, which has to build and maintain its own security infrastructure.

---

## Overall Jira Software Comparison Summary

| Category | Count | Examples |
|----------|-------|---------|
| **Alex Has** | 18 | Boards, backlog, sprints, planning poker, retros, analytics |
| **Alex Planned** | 12 | Swimlanes, WIP limits, subtasks, dependencies, timeline, CFD, Agentforce |
| **Worth Building** | 10 | Quick filters, card coloring, labels, custom fields, bulk operations, scope tracking |
| **Salesforce Covers** | 14 | Automation, reporting, permissions, SSO, audit, search |
| **Not Relevant** | 8 | Workflow schemes, field configs, JQL, feature flags |

**Bottom line:** Alex covers the core agile workflow. The remaining gaps are mostly table-stakes features (swimlanes, WIP limits, custom fields, quick filters) that are individually small efforts. The biggest strategic gap is custom fields on cards — without it, teams can't adapt Alex to their specific processes. Everything else is incremental.
