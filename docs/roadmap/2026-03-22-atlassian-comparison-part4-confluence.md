# Atlassian Competitive Analysis — Part 4: Confluence Feature Comparison

**Date:** March 22, 2026
**Series:** Atlassian Competitive Analysis (Part 4 of 5)
**Author:** Architecture review by Claude (Opus 4.6)

---

## Context: Alex Is Not a Wiki

Confluence is a full collaboration and documentation platform. Alex is an agile project management tool. Alex should **not** build a wiki, CMS, or document editor. However, certain Confluence capabilities map to lightweight features that would enhance Alex's project management workflow.

This analysis focuses on the narrow intersection where documentation supports agile execution.

---

## Pages & Content Creation

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Rich text editor (WYSIWYG) | **Partial** | Card descriptions support rich text editing |
| Real-time collaborative editing | **Not Relevant** | Alex isn't a document editor |
| Page templates | **Not Relevant** | Not Alex's domain |
| Version history | **Partial** | Card history via Field History Tracking |
| Inline comments | **Not yet** | Card comments exist; inline commenting on descriptions could be useful |
| @mentions | **Not yet** | Worth building — mention team members in card comments |
| Page export (PDF, Word) | **Not yet** | Sprint report export would be valuable |

### Assessment
Alex's card description editor is sufficient for work item documentation. The useful additions are @mentions in comments and sprint report export. Full document editing is out of scope.

---

## Spaces & Content Organization

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Team/project spaces | **Alex Has** | Boards serve as project spaces |
| Nested page hierarchy | **Not Relevant** | Not Alex's domain |
| Labels / tags | **Not yet** | Worth building — card labels (see Part 2) |
| Favorites / starred | **Not yet** | Low priority — favorite boards |
| Watch for notifications | **Partial** | Card assignment notifications exist; watching specific cards is not yet built |

### Assessment
Alex's board-per-project model is the right abstraction. No need for Confluence-style spaces.

---

## Whiteboards

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Freeform visual canvas | **Not Relevant** | Not Alex's domain — use Miro, FigJam |
| Sticky notes → Jira issues | **Interesting parallel** | Alex's retro cards → kanban cards already does this |
| AI on whiteboards | **Not Relevant** | — |
| Brainstorming templates | **Partial** | Alex's retro templates (Start/Stop/Continue, Mad/Sad/Glad, 4Ls) serve this purpose for sprint retrospectives |

### Assessment
Alex's retrospective feature already covers the most valuable whiteboard use case: collecting team feedback, voting, and converting action items into kanban cards. No need for a general-purpose whiteboard.

---

## Databases

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Structured data tables | **Not Relevant** | Salesforce is literally a database platform |
| Real-time sync with Jira | **Not Relevant** | Alex *is* the project tool — no sync needed |
| Filtered views | **Not Relevant** | Salesforce list views and reports |

### Assessment
Confluence Databases exist because Confluence needed structured data capabilities. Salesforce *is* structured data. Zero relevance.

---

## Macros & Embeds

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Jira Issues macro (embed live issue lists) | **Interesting parallel** | A "Board Summary" Lightning component for Salesforce record pages could be valuable |
| Code Block | **Not Relevant** | Not Alex's domain |
| Table of Contents | **Not Relevant** | Document feature |
| Status lozenge | **Alex Has** | Card status pills/badges on the board |
| Chart macro | **Not Relevant** | **Salesforce Covers** — Salesforce charts and dashboards |

### Assessment
The one interesting idea: a lightweight "Board Summary" or "My Cards" Lightning component that can be embedded on any Salesforce record page, home page, or app page. This would give Alex presence throughout the Salesforce UI, not just on the dedicated board page.

**Recommendation:** Build a compact "My Cards" Lightning component showing a user's assigned cards across boards with status indicators. Embed it on the Salesforce Home page. This is Confluence's "Jira Issues macro" equivalent — surfacing project data where people already are.

---

## Search

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Full-text search | **Partial** | Card search exists; could improve with cross-board search |
| Advanced search filters | **Not yet** | Worth building — search across all boards by keyword, assignee, epic |
| AI-powered search | **Alex Planned** | Agentforce — natural language queries about cards and sprints |

### Assessment
Cross-board search (find cards across all boards by keyword, assignee, status, or epic) would be valuable. Agentforce will eventually power natural language search. For now, a basic global search is the pragmatic addition.

---

## AI Features

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| AI-generated summaries | **Alex Planned** | Agentforce — sprint summaries, retro summaries |
| AI catch-up (changes since last visit) | **Worth building** | "What changed on my boards since yesterday?" via Agentforce |
| Natural language Q&A | **Alex Planned** | Agentforce — "which cards are blocked?" |
| AI content creation | **Not Relevant** | Document generation is not Alex's domain |

### Assessment
The "AI catch-up" concept is compelling: when a user opens Alex, show a brief AI-generated summary of what changed since their last visit. This is achievable with Agentforce + card history data and would be a strong differentiator.

---

## Templates

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| 75+ built-in templates | **Partial** | Alex has retro templates; board templates are worth building |
| Meeting notes, retrospectives | **Alex Has** | Retrospective feature with multiple templates |
| Project plans, status reports | **Not yet** | Sprint reports serve this purpose |
| Custom template creation | **Not yet** | Board templates — pre-configured column layouts for common workflows |

### Assessment
Board templates would be valuable: pre-configured board layouts for common workflows (Scrum: Backlog → To Do → In Progress → Review → Done, Kanban: To Do → Doing → Done, Support Triage: New → Investigating → Waiting → Resolved). This reduces setup friction for new boards.

---

## Collaboration

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Real-time co-editing | **Alex Has** | Real-time board sync via platform events |
| Inline comments | **Not yet** | Card comments exist; inline on descriptions not needed |
| @mentions | **Not yet** | Worth building — mention users in comments |
| Task assignment | **Alex Has** | Card assignment with user picker |
| Notification preferences | **Partial** | Basic notifications; granular preferences not yet built |

### Assessment
Alex's real-time collaboration on boards is already strong. @mentions in comments and better notification controls would round out the collaboration experience.

---

## Permissions & Administration

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Space-level permissions | **Alex Has** | Board-level access (Admin vs. Member) |
| Page-level restrictions | **Not yet** | Card-level visibility not needed for most use cases |
| Guest access | **Alex Planned** | Experience Cloud board sharing |
| Anonymous access | **Not Relevant** | Security risk on Salesforce |
| Audit log | **Not Relevant** | **Salesforce Covers** — Setup Audit Trail |

### Assessment
Board-level permissions are sufficient. Experience Cloud integration will handle external guest access.

---

## Integrations

| Confluence Feature | Alex Status | Notes |
|-------------------|-------------|-------|
| Jira two-way linking | **Alex Has** | Alex *is* the project tool — no external linking needed |
| Slack integration | **Not yet** | Worth building — card updates in Slack channels |
| Google Drive / Figma embeds | **Not yet** | Card file attachments exist; embedding external content is lower priority |
| REST API | **Partial** | Apex REST endpoints exist for Agentforce; public API not yet exposed |
| Marketplace apps | **Not Relevant** | AppExchange is the Salesforce equivalent |

### Assessment
Slack integration (post card updates, create cards from Slack) would be the highest-impact integration. A public REST API would enable custom integrations but is a future consideration.

---

## Overall Confluence Comparison Summary

| Category | Count | Examples |
|----------|-------|---------|
| **Alex Has** | 6 | Real-time collaboration, retro templates, board permissions, card descriptions |
| **Alex Planned** | 4 | Agentforce AI, Experience Cloud sharing, natural language search |
| **Worth Building** | 7 | @mentions, board templates, "My Cards" component, cross-board search, sprint export, Slack integration, AI catch-up |
| **Salesforce Covers** | 5 | Search, charts, audit, structured data, marketplace |
| **Not Relevant** | 18 | Wiki pages, whiteboards, databases, code blocks, nested hierarchies |

**Bottom line:** Confluence is not a competitor — it's a different product category. The actionable takeaways are: build board templates, add @mentions, create a "My Cards" Lightning component for the Salesforce Home page, and implement cross-board search. The AI catch-up feature ("what changed since yesterday") is a compelling Agentforce use case.
