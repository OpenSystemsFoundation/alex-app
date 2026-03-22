# Customer Types: Two Paths Into Alex

_Date: 2026-03-21_

Alex serves two distinct customer types. Every roadmap decision should clearly benefit one or both.

---

## Type 1 — Engineering Teams (Agile-First)

**Who:** Dev teams, scrum masters, engineering managers.
**Why Alex over Jira/Linear:** It lives inside Salesforce — no context-switching, no integration tax, no per-seat licensing on a third-party tool.

**Core value:** Kanban board + sprint planning + real-time collaboration.

**Features that serve this customer:**
- Core board (shipped)
- Sprint lifecycle & analytics (shipped)
- Backlog management (shipped)
- Dependency Mapping & Cross-Team Coordination (planned)
- Capacity Planning (planned)
- Flow-Driven Automation Engine (planned)

**Object model impact:** None beyond what exists today. These customers use Board, Sprint, Card, SprintCard. New objects: `CardDependency__c`, `BoardMember__c`.

**Adoption path:** Install from AppExchange or GitHub → create a Board → start planning sprints. Zero configuration needed.

---

## Type 2 — Support-Connected Teams (ServiceDesk)

**Who:** Teams where engineering work is driven by customer pain — support escalations, feature requests from accounts, SLA-bound commitments.
**Why Alex over competitors:** Native access to Cases, Entitlements, Accounts, and Opportunities. No sync, no middleware, no stale data.

**Core value:** Everything from Type 1, plus a bridge from customer support into the sprint backlog.

**Features that serve this customer:**
- Everything Type 1 gets
- Case-Driven Development Pipeline (planned)
- SLA-Aware Prioritization (planned)
- Impact Mapping — Link Work to Revenue (planned)
- Stakeholder Visibility (planned)

**Object model impact:** Adds `CaseCard__c`, `CaseTheme__c`, `CaseThemeCase__c`, `CardObjectLink__c`. These are junction/bridge objects — they extend the core model without changing it.

**Adoption path:** Same as Type 1 to start. ServiceDesk features activate when you link your first Case to a Card. No upfront configuration — the bridge objects are dormant until used.

---

## Design Principle: Additive, Not Forked

The two types share one codebase, one package, one board. ServiceDesk features are **additive layers**, not a separate product.

| Concern | Rule |
|---|---|
| **Object model** | ServiceDesk objects reference core objects via lookups. Core objects never reference ServiceDesk objects. |
| **UI** | ServiceDesk context (SLA badges, case counts) appears on cards only when data exists. No empty-state clutter for Type 1. |
| **Permissions** | ServiceDesk fields/objects get their own Permission Set (`Alex_ServiceDesk`). Type 1 users never see them. |
| **Testing** | Core tests must pass with zero ServiceDesk data. ServiceDesk tests extend core fixtures. |
| **Apex** | ServiceDesk logic lives in its own selector/service classes. Core controllers stay untouched. |

---

## Naming the ServiceDesk Object

The primary ServiceDesk object (the thing a support agent or customer submits that becomes trackable work) should **not** be called Ticket or Case. Working candidates:

| Name | Pros | Cons |
|---|---|---|
| `ServiceRequest__c` | Clear intent, distinct from Case | Verbose |
| `SupportItem__c` | Short, self-explanatory | Slightly generic |
| `Intake__c` | Conveys "work coming in" | Might confuse non-native speakers |
| `Escalation__c` | Familiar in support orgs | Implies urgency — not all requests are escalations |

**Current recommendation: `ServiceRequest__c`** — clearly different from Case, self-documenting, and honest about what it represents.

---

## What This Means for the Roadmap

**Phase 1 (now):** Ship core features that serve Type 1. Dependency mapping, capacity planning, flow automation.

**Phase 2 (next):** Layer on ServiceDesk features for Type 2. Case-driven pipeline, SLA badges, impact mapping.

**Phase 3 (later):** Stakeholder visibility, cross-team coordination, revenue dashboards — these serve both types.

This sequencing lets us ship value for the larger audience first (every Salesforce team can use agile boards) and then differentiate with the ServiceDesk bridge (something only a Salesforce-native tool can do well).
