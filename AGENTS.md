# Custom Instructions for AI Agents

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical architecture and design patterns.

## Response Style

- Be concise and action-oriented
- Execute code changes immediately without lengthy explanations
- Only provide explanations when explicitly asked

## Summary Format

After completing operations, provide a **short, scannable summary on very high level** with bullet points:

- Use bullet points for each major change or action
- Keep each bullet point to one line when possible
- Group related changes together
- User can ask for details on specific items if needed

## Documentation Policy

**NEVER** create documentation files unless explicitly requested. This includes:

- README files
- API documentation
- Inline documentation
- Architecture docs
- Diagrams
- Summaries

After completing code changes, **stop and ask**: "Would you like me to create documentation for these changes?"

## Testing Policy

**During Development & Debugging:**

- Automatically run tests after creating or modifying test files
- Run tests immediately when debugging test failures
- No need to ask permission when actively developing tests

**After Completing Development Work:**

- Always ask the user to run tests after completing feature/fix development
- **Example:** "I've completed the changes. Would you like to run the tests now?"

## Deployment Policy

Always run `npm run deploy` after completing development work to deploy changes to Salesforce.

## Communication Style

- Use emojis sparingly for emphasis only
- Avoid overusing emojis in code, comments, or logs
- Occasional programmer jokes are fine to make development enjoyable

**Good:** "Found the bug in the reducer"
**Bad:** "Found the bug in the reducer"

## Project Context

Salesforce Lightning Web Component (LWC) Kanban board application called "Alex" — a real-time collaborative Kanban board built on the Salesforce platform.

**Stack:**

- Salesforce DX
- Lightning Web Components (LWC)
- Apex backend (Controller → Selector → DTO pattern)
- Platform Events for real-time collaboration
- Redux-style state management (store, reducers, actions, selectors, thunks)
- LexoRank for drag-and-drop ordering
- TypeScript for test files
- Jest for unit testing
- Playwright for end-to-end testing
- mise for Node.js version management

## Current Project State (March 2026)

### Branch Summary

| Branch | Status | Description |
|---|---|---|
| `main` | stable | Last release merge, behind active development |
| `refactor` | current checkout | Redux store, platform events, DTO pattern, event handlers |
| `optimize-fixes` | **most advanced** (16 commits ahead of refactor) | Multi-window tracking, sequence numbers, namespace cleanup, spinner removal, mise tooling, script updates |
| `backlog-board` | stale | Same as agentforce — ghost drag-and-drop, optimistic UI |
| `agentforce` | stale | Copilot instructions, optimistic UI work |
| `develop` | stale | Old branch, behind main |

### What Was Done (refactor branch)

- Redux-style store with middleware (thunk, logging)
- Platform events for real-time multi-user sync (CardUpdateEvent, ColumnUpdateEvent)
- Echo prevention via clientRequestId tracking
- Connection status indicator with graceful degradation (connected → polling → offline)
- LexoRank positioning for efficient drag-and-drop
- Selector pattern for Apex SOQL queries
- DTO layer for clean data transfer
- Request tracker for pending operation management
- Health monitoring with polling fallback
- Comprehensive test suite (unit + e2e)

### What Was Done (optimize-fixes branch, on top of refactor)

- Sequence numbers for better event ordering
- Multi-window tracking (clientId per browser tab)
- Removed loading spinner (smoother feel)
- Removed OpenSF namespace from code
- Removed Apex tests (moved or cleaned up)
- Added mise as Node.js version manager
- Updated scripts and scratch org configs
- Various bug fixes

### What Still Needs Doing

The commit message "still need to refactor apex backend" on optimize-fixes indicates the Apex layer needs cleanup to match the frontend refactoring that was done.

## Architecture Overview

### Frontend Layers

```
kanbanBoard (container LWC)
├── handlers/        → eventHandler, dragDropHandler, cardOperations, subscriptionEventHandler
├── helpers/         → clientIdGenerator, reducerQueue, requestTracker
├── managers/        → lifecycleManager, boardDataLoader
kanbanStore (state management)
├── core/            → store, actionTypes
├── state/           → actions, reducers, selectors
├── middleware/      → thunkMiddleware, loggingMiddleware
├── thunks/          → boardThunks, cardThunks
├── utils/           → dataProcessors, stateHelpers, positionCalculator
subscriptionManager  → EMP API wrapper, retryManager, eventHealthMonitor
connectionStatusIndicator → real-time connection status UI
kanbanCardDetail     → card detail modal
```

### Backend Layers

```
KanbanBoardController.cls  → @AuraEnabled API endpoints (8 methods)
KanbanBoardSelector.cls    → SOQL query abstraction
KanbanBoardDTO.cls         → BoardDTO, ColumnDTO, CardDTO, UserDTO, EpicDTO
CardTriggerHandler.cls     → publishes CardUpdateEvent__e platform events
ColumnTriggerHandler.cls   → publishes ColumnUpdateEvent__e platform events
LexoRank.cls               → fractional indexing for drag-and-drop ordering
TriggerHandler.cls         → base class with recursion control
```

### Real-time Data Flow

```
User action → dispatch thunk → Apex controller → DB update → Trigger fires
→ Platform Event published → all clients receive → eventHandler processes
→ echo prevention check → store dispatch → UI re-renders
```

### Key Design Decisions

1. **LexoRank** — O(1) insert ordering without renumbering (same as Jira)
2. **Separate dragState** — visual preview during drag without polluting main state
3. **clientRequestId UUIDs** — prevents echo loops in multi-user realtime
4. **Polling fallback** — graceful degradation when platform events blocked by firewalls
5. **Trigger-based event publishing** — captures all DML sources (API, UI, batch)
6. **Object.freeze()** — immutable state prevents accidental mutations

## Coding Standards

- Follow Salesforce best practices for LWC development
- Use TypeScript for test files
- Maintain consistent code formatting
- Write clear and descriptive commit messages
- Place Apex test classes in `force-app/main/default/classes/tests/`
- Use the Redux pattern for all state mutations (actions → reducers → selectors)
- Keep reducers pure — side effects belong in thunks
