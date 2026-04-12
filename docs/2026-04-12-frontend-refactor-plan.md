# Frontend Refactor Plan — 2026-04-12

## Problem

Many frontend interactions (backlog drag-drop, sprint management, board card moves) fail with runtime errors. Only 2 unit tests exist (4 total assertions) covering 2 of 17 LWC components. No coverage infrastructure.

## Current State

- **Runtime errors**: `kanbanBacklogView.js` throws `Uncaught (in promise) #<Object>` on card interactions
- **Unit tests**: 2 files, 4 tests (filterManager, connectionStatusIndicator)
- **E2E tests**: 22 spec files exist but many rely on interactions that are broken
- **Missing mocks**: `lightning/navigation` mock referenced in jest.config.js doesn't exist
- **Coverage threshold**: 80% configured but never enforced

## Bugs Identified (Code Review)

| Severity | File | Issue |
|----------|------|-------|
| **HIGH** | `backlogView/dragDropHandler.js` L175-183 | Cross-section drag uses stale state — card not found after async move |
| **HIGH** | `backlogReducer.js` L5-11 | `SET_BACKLOG_CARDS` silently dropped during sync; stuck `backlogSyncing` = permanent stale data |
| **MEDIUM** | `board/dragDropHandler.js` L42 | Drag image appended to `document.body` leaks if `handleDragEnd` never fires |
| **MEDIUM** | `board/dragDropHandler.js` L155 | `loadBoardData()` after backlog-to-board drop overwrites optimistic state |
| **MEDIUM** | `cardThunks.js` L356-386 | Bulk reorder partial failure reverts all optimistic state but server has partial updates |
| **MEDIUM** | `cardThunks.js` L230-240 | `deleteBacklogCardsAsync` partial failure leaves UI/server mismatch |

## Plan

### Phase 1: E2E Debug — Discover All Broken Interactions

Use Playwright against the live scratch org to systematically find what's broken.

| Task | Scope |
|------|-------|
| 1.1 Backlog drag-drop | Reorder within sprint, cross-sprint move, drag to top/bottom, multi-select drag |
| 1.2 Board drag-drop | Column-to-column move, backlog-to-board drop, drag cancel, placeholder rendering |
| 1.3 Sprint interactions | Create sprint, complete sprint, sprint header, progress bar, card assignment |
| 1.4 Card panel/CRUD | Open panel, edit fields, create card, delete card, inline backlog create |

**Approach**: Interactive Playwright scripts against live org, capture console errors + visual state throught the integrated browser tool.

### Phase 2: Fix Broken Code

Fix bugs found in Phase 1 + code review, re-verify with E2E after each fix. if needed, refactor where possible to also optimize the architecture to prevent and guard against issues. clean code principles apply here. long files are a main issue in the app currently.

| Bug | Fix |
|-----|-----|
| Cross-section drag stale state | Await state update before reorder, or read updated state from store |
| `backlogSyncing` stuck flag | Add timeout safeguard; ensure all error paths clear syncing |
| Drag image DOM leak | Add cleanup in `disconnectedCallback` |
| `loadBoardData()` overwrites optimistic | Remove redundant reload, trust optimistic + platform event |
| Bulk reorder partial failure | Track partial success; only revert failed cards |
| Delete partial failure | Handle partial success same pattern |

### Phase 3: Unit Test Infrastructure + Tests

| Task | Parallel? | Details |
|------|-----------|---------|
| 3.0 Mock infrastructure | First | `lightning/navigation` mock, Apex wire mocks, `lightning/empApi` mock, shared test factories |
| 3.1 Store reducers | Yes | `backlogReducer`, `cardsReducer`, `dragReducer`, `columnsReducer` — pure functions |
| 3.2 Store thunks | Yes | `cardThunks`, `boardThunks` — mock Apex + dispatch, verify action sequences |
| 3.3 Utils | Yes | `stateHelpers`, `positionCalculator`, `dataProcessors` — pure functions |
| 3.4 Backlog drag handler | Yes | Mock host + store, test all drag paths |
| 3.5 Board drag handler | Yes | Mock DOM + store, test all drag paths |
| 3.6 kanbanBacklogView | After mocks | Full LWC tests — rendering, interactions, store integration |
| 3.7 Sprint components | After mocks | `kanbanSprintHeader`, `kanbanSprintModal`, `kanbanSprintComplete` |

**Parallelism**: Tasks 3.1–3.5 are independent — subagents write them in parallel after 3.0. optimize the unit test architecture where possible. refactor where needed.

### Phase 4: Promote E2E Happy Paths to CI

Once interactions are stable, move working debug scripts into `e2e/specs/` as proper tests:
- Board load + column rendering
- Card drag column-to-column
- Backlog reorder within sprint
- Sprint create + complete lifecycle
- Card CRUD (create, edit, delete)

These run in `e2e-tests.yml` on every PR. improve the overall architecture of the tests and refactor where possible to adhere to best practices of playwright tests.

## Execution Order

```
Phase 1.1–1.4  →  parallel via browser     →  failure catalog
Phase 2        →  sequential fixes          →  re-verify with E2E
Phase 3.0      →  mock infra               →  then 3.1–3.5 parallel via subagents
Phase 3.6–3.7  →  after mocks              →  full component tests
Phase 4        →  after stable              →  promote to CI
```

## Key Files

| Area | Files |
|------|-------|
| Backlog view | `lwc/kanbanBacklogView/kanbanBacklogView.js`, `handlers/dragDropHandler.js`, `handlers/contextMenuHandler.js` |
| Board drag | `lwc/kanbanBoard/handlers/dragDropHandler.js`, `handlers/cardOperations.js` |
| Store - reducers | `lwc/kanbanStore/state/reducers/backlogReducer.js`, `cardsReducer.js`, `dragReducer.js` |
| Store - thunks | `lwc/kanbanStore/thunks/cardThunks.js`, `boardThunks.js` |
| Store - utils | `lwc/kanbanStore/utils/stateHelpers.js`, `positionCalculator.js`, `dataProcessors.js` |
| Sprint | `lwc/kanbanSprintHeader/`, `kanbanSprintModal/`, `kanbanSprintComplete/` |
| Card panel | `lwc/kanbanCardPanel/` |
| Apex backend | `classes/KanbanBoardController.cls`, `KanbanCardService.cls`, `KanbanBoardService.cls` |
