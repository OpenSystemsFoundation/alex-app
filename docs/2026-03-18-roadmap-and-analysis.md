# Alex Kanban Board — Roadmap & Architecture Analysis

**Date:** March 18, 2026
**Author:** Architecture review by Claude (Opus 4.6)

---

## Executive Summary

Alex is a real-time collaborative Kanban board built natively on Salesforce using Lightning Web Components. The architecture is strong — Redux-style state management, LexoRank for drag-and-drop ordering, and platform events for realtime sync — but the realtime collaboration system has 3 critical bugs that silently break multi-user scenarios. This document covers the current state, architectural analysis, improvement plan, and product roadmap.

---

## Current State of the Project

### Branch Status

| Branch           | Status                                   | Key Work                                                                 |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `main`           | stable release                           | Last merge from develop                                                  |
| `refactor`       | current checkout                         | Redux store, platform events, DTOs, event handlers, selectors            |
| `optimize-fixes` | **most advanced** (16 ahead of refactor) | Multi-window tracking, sequence numbers, namespace cleanup, mise tooling |
| `backlog-board`  | stale                                    | Ghost drag-and-drop, optimistic UI (superseded)                          |
| `agentforce`     | stale                                    | Copilot instructions (superseded)                                        |
| `develop`        | stale                                    | Old, behind main                                                         |

**Action needed:** Merge `optimize-fixes` → `refactor` → `main`, delete stale branches.

### What's Been Built

- Redux-style store with middleware (thunk, logging), frozen immutable state
- Platform events for real-time multi-user sync (CardUpdateEvent, ColumnUpdateEvent)
- Echo prevention via clientRequestId UUID tracking
- Connection status indicator with graceful degradation (connected → polling → offline)
- LexoRank fractional indexing for O(1) drag-and-drop ordering
- Selector pattern for Apex SOQL queries
- DTO layer for clean data serialization
- Request tracker for pending operation management
- Health monitoring with polling fallback
- Reducer queue with intelligent operation coalescing
- Jest unit tests + Playwright e2e tests

---

## Architecture Analysis

### What's Genuinely Well Done

**1. Redux-style store in LWC**
Rare in the Salesforce ecosystem. Most LWC apps scatter state across components with `@wire` and imperative Apex calls. Alex has a proper unidirectional data flow: actions → reducers → selectors → UI. The store uses `Object.freeze()` for immutability, supports middleware chaining, and has a clean subscriber/unsubscribe pattern. This is production-grade frontend architecture.

**2. LexoRank for positioning**
Same algorithm Jira uses. O(1) inserts without renumbering entire columns. Positions are strings like `0|hzzzzz:` that allow infinite insertions between any two items. Server-side calculation via `LexoRank.cls` with character code math. This scales well for collaborative drag-and-drop.

**3. Platform Events + echo prevention + polling fallback**
Three-layer realtime system:

- Platform events via EMP API (primary, ~1s latency)
- Polling fallback via `getIncrementalUpdates` (when firewalls block CometD)
- Manual refresh (last resort)

Echo prevention uses clientRequestId UUIDs: each user's changes carry a UUID, and the client ignores events matching its own UUIDs. This prevents the infinite echo loop that plagues naive realtime implementations.

**4. Separate dragState**
During drag, a `dragState` copy of columns is created and visually updated without touching the committed `columns` state. On drop, `dragState` replaces `columns`. On cancel, `dragState` is discarded. No flickering, no premature server calls, easy rollback.

**5. Reducer queue with operation coalescing**
Rapid operations on the same card are intelligently merged: move + move = one move, update + update = merged updates. This prevents overwhelming the server during rapid interactions.

**6. Selector pattern in Apex**
`KanbanBoardSelector` encapsulates all SOQL queries behind named methods. Clean separation from the controller, easy to optimize and test independently.

### What Concerns Me

**1. Three critical bugs silently break multi-user realtime**

| Bug                                   | File                 | Line | Impact                                     |
| ------------------------------------- | -------------------- | ---- | ------------------------------------------ |
| Wrong action type `'card/updated'`    | `boardDataLoader.js` | 72   | Polling fallback completely non-functional |
| Wrong action type `'REMOVE_CARD'`     | `eventHandler.js`    | 222  | Deletes from other users silently dropped  |
| Wrong payload key `card` vs `updates` | `eventHandler.js`    | 194  | Updates from other users silently ignored  |

These mean that the entire realtime collaboration system — the app's core differentiator — is broken for receiving other users' changes. The code paths are all there, but action types and payload shapes don't match what the reducers expect. The store silently ignores unrecognized actions (by design for Redux, but catastrophic when it's a typo).

**2. No error/loading state in the Redux store**
The store has `columns`, `board`, `boardId`, `dragState`, `isDragging`, `dragSource` — but no `isLoading`, `error`, or `subscriptionStatus`. These live as local component properties (`kanbanBoard.js` lines 29-30), which means they're lost on re-render, can't be shared across components, and can't be set from thunks or event handlers.

**3. Apex backend is a monolith**
`KanbanBoardController.cls` has 8 `@AuraEnabled` methods doing input validation, business logic, data transformation, and orchestration in one class. There's no service layer. This won't scale when adding sprints, backlog, planning poker, and analytics — each feature will add more methods to an already bloated controller.

**4. Commit hygiene**
Half the commits say "updates" or "update". The git history doesn't tell the story of the architecture decisions that were made. For a project this sophisticated, each commit should explain _why_, not just _what_.

**5. Silent error handling throughout**

- Store subscriber errors are swallowed silently (`store.js` lines 55-60)
- Incremental update failures log to console but don't notify the user
- Event handler errors return `true` (triggering a refresh) but don't explain what happened
- No retry mechanism for failed card operations

---

## Critical Bug Details

### Bug 1: Polling Fallback Broken

```javascript
// boardDataLoader.js:70-75
updates.cards.forEach((card) => {
    this.component.store.dispatch({
        type: 'card/updated', // ← This action type doesn't exist
        payload: card // ← Payload shape wrong too (needs {cardId, updates})
    });
});
```

**Impact:** When platform events are unavailable (corporate firewalls, network issues), the polling fallback kicks in but its updates are silently dropped. The board appears frozen to the user.

**Fix:** Use `UPDATE_CARD` action type with `{ cardId: card.Id, updates: card }` payload.

### Bug 2: Remote Deletes Silently Dropped

```javascript
// eventHandler.js:220-224
_removeCard(cardId, store) {
    store.dispatch({
        type: 'REMOVE_CARD',  // ← Should be 'DELETE_CARD'
        payload: { cardId }
    });
}
```

**Impact:** When another user deletes a card, the platform event is received and processed, but the dispatch uses a non-existent action type. The card remains visible in all other users' browsers until they manually refresh.

**Fix:** Change to `DELETE_CARD`.

### Bug 3: Remote Updates Silently Ignored

```javascript
// eventHandler.js:187-196
_updateCard(cardDTO, store) {
    const enrichedCard = enrichCardData(cardDTO);
    store.dispatch({
        type: 'UPDATE_CARD',
        payload: {
            cardId: cardDTO.Id,
            card: enrichedCard  // ← Reducer expects 'updates', not 'card'
        }
    });
}
```

The reducer does `{ ...existingCard, ...updates }` — when `updates` is `undefined`, the spread is a no-op.

**Impact:** When another user updates a card (title, description, assignee, etc.), the change is received via platform event but silently ignored. The card shows stale data until manual refresh.

**Fix:** Change `card:` to `updates:`.

---

## Improvement Plan (Phased)

### Phase 1: Critical Bug Fixes

Fix the 3 action type/payload bugs. Add console.error for silent subscriber failures. **~30 minutes, 3 files, ~15 line changes.**

### Phase 2: Error Handling & Store Resilience

Add `isLoading`, `error`, `subscriptionStatus` to Redux store. Implement window focus handler. Add request timeout handling. **~2-3 hours.**

### Phase 3: Event Handler Robustness

Fix race conditions in change tracking (delete-after-move should always win). Fix board membership check for create events. Add sequence number validation. **~1-2 hours.**

### Phase 4: Performance & Cleanup

Replace `JSON.parse(JSON.stringify())` with `structuredClone()`. Delete `.old` test file. **~30 minutes.**

### Phase 5: Testing Strategy

- Expand Jest unit tests for event handler (correct action types, payload shapes, race conditions)
- Create API-driven realtime test script (`scripts/js/test-realtime.js`) for development testing
- Optionally remove Playwright after above is solid

### Phase 6: Apex Backend Refactor

Extract service layer: `KanbanCardService`, `KanbanBoardService`, `KanbanEventService`. Controller becomes thin facade. **Pre-requisite for all new features.**

---

## Product Roadmap

### Priority 1: Foundation (do these first)

1. **Branch consolidation** — merge `optimize-fixes` → `refactor` → `main`
2. **Bug fixes** (Phase 1 above) — the realtime system must actually work
3. **Apex service layer** (Phase 6 above) — unblocks everything below
4. **Data model: Sprint\_\_c** — start/end dates, velocity, board relationship
5. **Remove Playwright** — replace with Jest + API-driven testing

### Priority 2: Core Features

6. **Backlog management** — new backlog view using LexoRank for fast reordering, cross-board drag into sprint columns, long scrollable list with virtual rendering
7. **Sprint management** — sprint creation, start/end, card assignment, sprint board vs backlog view, completion with carry-over
8. **Planning Poker** — real-time voting via platform events, card reveal animation, consensus detection. Consider G-Counter CRDT for concurrent votes (simple, ~50 lines of code)

### Priority 3: Insights & Collaboration

9. **Analytics dashboard** — throughput (cards/sprint), cycle time (column-to-column duration), cumulative flow diagram, rolling averages. Requires adding `ColumnEnteredAt__c` timestamp to Card for column transition tracking.
10. **Retro tool (Start/Stop/Continue)** — three-column board type, anonymous card creation, voting, timer. Could be implemented as a new board type within existing architecture.

### Priority 4: Premium Features

11. **Agentforce integration** — smart card suggestions, auto-assignment, sprint planning assistance, retrospective summarization. Paid add-on package due to Agentforce per-conversation costs.

### Architecture Considerations for New Features

- **Planning Poker:** Use G-Counter CRDT for votes (each user's vote = separate record, merge = collect all). Platform events for reveal/re-vote. No need for Yjs — this is a simple CRDT.
- **Backlog:** Extend LexoRank to a flat list view. Consider virtual scrolling for 500+ item backlogs.
- **Analytics:** Add `ColumnEnteredAt__c` and `ColumnExitedAt__c` to Card\_\_c. Calculate cycle time as exit - entry per column. Store historical data for rolling averages.
- **Retro:** Anonymous mode needs a different auth approach — cards without `CreatedById` linkage. Timer via platform events for synchronization.
- **Sprints:** Sprint**c master-detail to Board**c. Cards get an optional Sprint lookup. Backlog = cards without a sprint. Sprint board = filtered view.

---

## Realtime Testing Strategy

### The Problem

Testing realtime updates requires manually opening 2 browser windows and performing actions in both. This is tedious and error-prone.

### Recommended Solution

**1. Expand Jest unit tests** (fast, deterministic, no org needed):

- Test eventHandler dispatches correct action types with correct payload shapes
- Test reducer handles all action types correctly
- Test edge cases: delete-after-move, concurrent creates, out-of-order events
- Run with `npm test`

**2. API-driven realtime test script** (tests actual platform event pipeline):

- Node.js script that uses Salesforce REST API to create/update/move/delete cards
- Developer opens board in browser, runs script, watches updates arrive live
- Script can also poll board state to verify convergence
- Run with `npm run test:realtime -- --boardId <id>`

**3. CRDT considerations for future:**

- LexoRank is already a CRDT for ordering (commutative, idempotent inserts)
- Planning poker votes → G-Counter (trivial CRDT, ~50 lines)
- Card fields → last-write-wins register + presence indicators (simpler than Yjs)
- Rich text collaboration → skip for now, solve socially ("X is editing...")

---

**Document Version:** 1.0
**Maintainer:** Open Systems Foundation
