# agentforce

> Salesforce Agentforce integration — invocable Apex actions that expose Kanban operations to AI agents via GenAI functions.

## Node Metadata
- **id**: agentforce
- **status**: active-development
- **package**: force-agentforce

## Edges
| Target | Type | Description |
|--------|------|-------------|
| apex-services | depends-on | Delegates to KanbanCardService, SprintService, etc. |
| card-system | depends-on | Card CRUD via AgentCreateCard, AgentUpdateCard, AgentDeleteCard |
| sprint-management | depends-on | Sprint ops via AgentCreateSprint, AgentStartSprint, AgentCompleteSprint |
| data-model | reads-from | Queries all core objects for agent responses |

## Schema
- **Apex (Card Actions)**: AgentCreateCard, AgentUpdateCard, AgentDeleteCard, AgentMoveCard, AgentAssignCard, AgentSearchCards, AgentGetCardDetails
- **Apex (Sprint Actions)**: AgentCreateSprint, AgentStartSprint, AgentCompleteSprint, AgentAddCardsToSprint, AgentRemoveCardFromSprint, AgentGetSprintStatus
- **Apex (Board Actions)**: AgentGetBoardLayout, AgentGetBoardSummary, AgentGetBacklog
- **Apex (Analytics)**: AgentGetVelocity, AgentGetBurndown, AgentAnalyzeSprintCapacity, AgentGetUserWorkload, AgentEstimateStoryPoints
- **Apex (Utility)**: AgentSearchUsers
- **Tests**: AgentCardActionsTest, AgentSprintActionsTest, AgentBoardActionsTest, AgentAssignmentActionsTest, AgentEstimationActionsTest
- **Metadata**: genAiFunctions/, genAiPlugins/, genAiPlannerBundles/, bots/, botVersions/, aiAuthoringBundles/

## Roadmap
### Now
- Core CRUD actions for cards, sprints, and board queries
- Estimation and workload analysis actions
- GenAI function registration for Agentforce

### Next
- Conversational sprint planning (agent suggests cards for sprint based on capacity)
- Natural language card search with fuzzy matching

### Future
- Agent-driven retro facilitation
- Proactive agent notifications (blocked cards, overdue items, sprint at risk)

## Known Issues
- Agent actions share the running user's permissions — no elevation for cross-team queries
- GenAI function descriptions must be kept under 1000 chars for Agentforce compatibility
- Dual-org test workflow (agentforce-dual-org-tests.yml) requires separate scratch orgs for base + extension
