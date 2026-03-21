# Alex - Product Vision & Roadmap

## What Alex Is

Alex isn't just a Kanban board — it's becoming a **full agile development tool on Salesforce**. Kanban is the core, but the platform is expanding to support the complete agile workflow: sprint planning, retrospectives, estimation, and analytics.

## Why Alex Exists

Salesforce customers pay **$150–300/user/month**. They're locked in. They trust AppExchange. They do **NOT** want to pay for Jira ($8–16/user/month extra) on top of that. Or Monday. Or Linear. Or any tool that:

- Lives outside their ecosystem
- Requires another SSO integration
- Doesn't talk to their Cases, Opportunities, or custom objects
- Needs another security review
- Is another vendor to manage

**Alex is free agile project management on the platform they already have and already trust.** That's the pitch. That's why it wins.

## Who Uses Alex

Not just developers — Salesforce teams are admins, business analysts, consultants, and implementation partners. They manage:

- Salesforce implementations and rollouts
- Configuration projects (clicks, not code)
- Support case triage and prioritization
- Release management across orgs
- Business process changes

These people live in Salesforce all day. Asking them to context-switch to Jira is friction. Alex is right there.

---

## Feature Roadmap

### High-Impact Features That Competitors Charge Serious Money For

#### 1. Planning Poker *(planned)*
Real-time estimation with platform events. Alex already has the infrastructure — this is low effort, high value. Teams that estimate together ship better.

#### 2. Retrospectives — Start/Stop/Continue Board with Anonymous Voting *(in progress)*
Three-column board with anonymous card creation, voting, and author reveal. Alex already has the board/column/card architecture — this is a different board type. Every sprint ends with a retro; right now teams leave Alex to do it elsewhere.

**Features:**
- Multiple templates: Start/Stop/Continue, Mad/Sad/Glad, 4Ls, Went Well/Improve/Actions
- Anonymous card creation (authors hidden until facilitator reveals)
- "Show Always" toggle for non-anonymous retros
- Voting with configurable max votes per user
- Action items → create kanban cards directly on any board (first column or backlog)
- Real-time sync via platform events
- Status progression: Draft → Active → Voting → Reviewing → Completed

#### 3. Cycle Time & Lead Time Analytics
Add `ColumnEnteredAt__c` to `Card__c`. Track how long cards spend in each column. This is the data that engineering managers actually care about — "how long does it take us to ship things?" Burndown shows sprint health; cycle time shows process health. This separates toy tools from real ones.

#### 4. WIP Limits
Add a `WipLimit__c` field to `Column__c`. Enforce or warn when a column exceeds its limit. This is core Kanban methodology — without it, you're just a task board. Visual indicator when a column is at/over capacity. Simple to build, fundamental to the methodology.

#### 5. Swimlanes
Group cards horizontally by epic, assignee, priority, or card type. Every serious Kanban tool has this. It transforms a flat board into something that scales for larger teams.

#### 6. Cumulative Flow Diagram
Alex already has sprint snapshots. Extend to track card counts per column over time. CFDs show bottlenecks at a glance — if "In Review" keeps growing while "Done" stays flat, you have a review bottleneck. This is the chart that Kanban practitioners look for first.

---

### Differentiators — Things Competitors Don't Do Well on Salesforce

#### 7. Native Salesforce Record Linking
Let cards link to Cases, Opportunities, or any SObject. "Fix the billing bug" links to the actual Case. "Build proposal feature" links to the Opportunity that requested it. This is Alex's **unfair advantage** — it's on Salesforce already. Jira can't do this natively.

#### 8. Agentforce Integration *(planned)*
AI-assisted intelligence for project management:
- "Which cards are blocked and why?" — agent reads card history and comments
- "Summarize this sprint for the stakeholder meeting" — agent writes the report
- "We have 40 backlog items and 3 sprints before go-live, suggest a plan" — agent does sprint planning
- "This card has been in Review for 5 days, notify the reviewer" — agent enforces SLAs
- Auto-link cards to Salesforce records: "This card mentions Case #00041234" → link it
- Retrospective summarization: "Here's what the team said, here are the patterns"

#### 9. Approval Gates in Columns
Column transitions that require approval — e.g., moving from "Dev Complete" to "Released" requires a manager sign-off. Salesforce already has approval processes; wire them into column moves. Enterprise teams need this.

---

### The Customer-Facing Unlock: Experience Cloud

**Salesforce is where the customer's customers are.** Alex isn't just an internal tool — it can be a **customer-facing project board**.

Salesforce customers already pay for Experience Cloud (communities). Their customers log in to a portal to see cases, orders, and knowledge articles. Now imagine:

> Your customer logs into their community portal and sees a board tracking their implementation project. No other Kanban tool can do this.

**Use cases:**
- **Implementation partners** — Client sees "Your Salesforce Implementation" board with columns: Discovery → Config → Testing → Go-Live
- **Support escalation** — Customer sees simplified status: Received → Working on it → Resolved. Internal team sees full triage board.
- **Feature requests** — Customers submit and vote on feature requests through the portal. Product team manages the backlog.

**What Alex needs for this:**
- Board-level sharing: Internal Only / Community Visible
- Column-level visibility: hide internal columns from community users
- Card-level field visibility: customer sees Subject, Status, Due Date — not internal notes, story points
- Comment visibility: internal vs. customer-facing (like Case comments)
- Community LWC component that works in Experience Cloud
- Auto-create cards from Cases via Flow

**This is the moat:** "Alex is the only agile project management tool that lets you share project visibility with your customers — inside the Salesforce portal they already use. No extra logins, no extra licenses, no extra vendors."

---

## Prioritized Roadmap

### Now
- CI/CD pipeline
- WIP limits
- Cycle time tracking

### Next
- Planning Poker
- **Retrospectives** *(in progress)*
- Swimlanes
- Cumulative flow diagram
- Salesforce record linking (Cases/Opportunities)

### Future
- Approval gates
- Agentforce integration
- Experience Cloud board sharing
- Reports & Dashboards (Salesforce-native)
- Custom card fields
- Mobile companion

---

## Architecture Note

Alex is built as a **Salesforce-native managed package** (namespace: `OpenSF`). It uses:
- **Lightning Web Components** with Redux-style state management
- **Platform Events** for real-time collaboration (with polling fallback)
- **LexoRank** fractional indexing for O(1) drag-and-drop positioning
- **Trigger-based event publishing** to capture all DML sources

The retrospective feature adds three new custom objects (`Retrospective__c`, `RetroCard__c`, `RetroVote__c`) and a platform event (`RetroUpdateEvent__e`), following the same architecture patterns as the kanban board.
