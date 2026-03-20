# Production-Grade Undo/Redo — Implementation Plan

**Date:** 2026-03-20
**Status:** Planned (not started)
**Priority:** Future enhancement — current undo/redo is dev-only, gated behind EnableDevTools\_\_c

---

## 1. Architecture Overview

The current undo/redo is tightly coupled to the DevTools recorder and only reverts client state via `_applyState()`. The production design replaces this with a **command-based undo stack** that lives as a first-class module in the store, independent of DevTools. Each undo entry stores the minimal context needed to construct a **reverse thunk** that persists the undo to the server.

The key architectural insight: instead of replaying full state snapshots (which get overwritten by platform events), we record **reversible commands** that describe what happened and how to undo it, then execute the reverse operation as a normal thunk (optimistic local update + Apex call).

---

## 2. New Files to Create

### A. `kanbanStore/undo/undoManager.js`

The core undo/redo module. A standalone object (not middleware) that maintains a command stack.

**Data structure:**

```javascript
UndoEntry = {
    id: number,
    timestamp: number,
    description: string, // Human-readable: "Moved card to Done"
    actionType: string, // Original action type
    reverseContext: Object, // Data needed to build the reverse operation
    forwardContext: Object // Data needed to redo the operation
};
```

**API:**

- `push(entry)` — add entry, truncate redo future, enforce max 10 limit
- `canUndo() / canRedo()` — boolean checks
- `peekUndo() / peekRedo()` — return the entry without popping (for tooltip text)
- `popUndo() / popRedo()` — return the entry and shift cursor
- `clear()` — reset stack (called after board reload)
- `subscribe(fn)` — notify UI of canUndo/canRedo changes
- `pause() / resume()` — suppress recording during undo/redo execution

### B. `kanbanStore/undo/undoableActions.js`

A registry mapping action types to their undo/redo metadata. For each undoable action, provides:

1. `captureContext(prevState, action, nextState)` — extracts reverse/forward context
2. `buildReverseThunk(reverseContext, store)` — thunk that undoes the operation
3. `buildForwardThunk(forwardContext, store)` — thunk that redoes the operation
4. `describe(action, context)` — human-readable description for tooltips

### C. `kanbanStore/middleware/undoMiddleware.js`

Intercepts dispatched actions, calls `captureContext` for undoable types, pushes to undoManager. Placed after thunk middleware, independent of devToolsMiddleware.

---

## 3. Undo Entry Schemas Per Action Type

### MOVE_CARD (column change or reorder)

```javascript
reverseContext: {
    (cardId, sourceColumnId, sourceIndex);
}
forwardContext: {
    (cardId, targetColumnId, targetIndex);
}
```

- Reverse: `dispatch(moveCardAsync(cardId, sourceColumnId, sourceIndex))`
- Forward: `dispatch(moveCardAsync(cardId, targetColumnId, targetIndex))`

### ADD_CARD (undo = delete)

```javascript
reverseContext: {
    (cardId, columnId);
}
forwardContext: {
    (columnId, subject);
}
```

- Reverse: `dispatch(deleteCardAsync(cardId))`
- Forward: `dispatch(createCardAsync(columnId, subject))` — note: produces new ID

### DELETE_CARD (undo = re-create)

```javascript
reverseContext: { card: { ...fullCardObject }, columnId, index }
forwardContext: { cardId }
```

- Reverse: `dispatch(createCardAsync(columnId, card.Subject))` + restore position
- **Note:** Hardest case — re-created card gets new ID. Consider dedicated `restoreCard` Apex method.
- **Simplification for v1:** Exclude DELETE_CARD from undoable actions.

### UPDATE_CARD (field edits)

```javascript
reverseContext: { cardId, previousValues: { field: oldVal } }
forwardContext: { cardId, updates: { field: newVal } }
```

- Reverse: `dispatch(updateCardAsync(cardId, previousValues))`
- Forward: `dispatch(updateCardAsync(cardId, updates))`

---

## 4. Existing Files to Modify

| File               | Changes                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `store.js`         | Always instantiate undoManager, add undo middleware, add `store.performUndo()` / `performRedo()`, expose `store.undoManager` |
| `kanbanBoard.html` | Remove `lwc:if={hasDevTools}` gate from undo/redo buttons                                                                    |
| `kanbanBoard.js`   | Wire handlers to `store.performUndo()`, remove DevTools guard from keyboard handler, add error toast on failure              |
| `eventHandler.js`  | Call `undoManager.markStale(cardId)` when platform events from other clients arrive                                          |
| `kanbanStore.js`   | Export new public APIs                                                                                                       |

---

## 5. Edge Cases

### Undo a delete

Store full card snapshot before deletion. Re-create via Apex. New card gets different ID — update undo entries referencing old ID. **v1 simplification: skip delete undo.**

### Real-time subscription conflicts

Platform events from other clients mark undo entries as **stale** via `undoManager.markStale(cardId)`. Attempting to undo a stale entry shows toast: "Cannot undo — card was modified by another user."

### Undo limit (10 entries)

Enforced in `undoManager.push()`. Oldest entry discarded when limit exceeded. New action after undo truncates redo future (standard fork behavior).

### Undo during in-flight operations

Queue the undo thunk through the existing `operationQueue` (ReducerQueue) to serialize with normal operations.

### Rapid undo (multiple Ctrl+Z)

Each press queues sequentially through the operation queue. Optimistic local updates give instant visual feedback.

### Board refresh / tab switch

`undoManager.clear()` on board reload. Intentional — undo context may be stale after full refresh.

---

## 6. Why Server-Side Undo Works (Subscription Conflict Solved)

The command-based approach eliminates the snapshot overwrite problem because:

1. Undo dispatches a real thunk (e.g., `moveCardAsync`) with a genuine Apex call
2. Server state is updated to reflect the undo
3. The platform event echo is filtered by `requestTracker` (same clientId)
4. Other clients see a legitimate platform event and update accordingly

**The server is always in sync with the client.**

---

## 7. Testing Strategy

### Unit Tests

- `undoManager.test.js` — push, undo, redo, cursor, max limit, clear, pause/resume, stale marking, subscribe
- `undoableActions.test.js` — captureContext, buildReverseThunk, buildForwardThunk, describe for each action type
- `undoMiddleware.test.js` — records undoable actions, skips transient, pauses correctly

### Integration Tests

- `store.performUndo.test.js` — move+undo, move+undo+redo, create+undo, update+undo, Apex mock verification, pause during execution

### Manual QA

- Move card → Ctrl+Z → verify moves back on screen AND in Salesforce
- Create card → Ctrl+Z → verify deleted from board and SF
- Two browser tabs → move in A → undo in A → verify B sees both
- Move in A → edit in B → undo in A → verify stale toast
- 12 actions → undo 10 → verify 11th is disabled

---

## 8. Implementation Sequence

1. Create `undoManager.js` (standalone, no dependencies)
2. Create `undoableActions.js` (action registry)
3. Create `undoMiddleware.js` (middleware integration)
4. Modify `store.js` (wire undoManager, add performUndo/performRedo)
5. Modify `kanbanBoard.js` / `.html` (rewire handlers, remove DevTools gate)
6. Modify `eventHandler.js` (markStale for external events)
7. Write unit tests
8. Write integration tests
9. Manual QA

---

## 9. Estimated Scope

- **New modules:** 3 files (~400-500 lines total)
- **Modified files:** 5 files
- **New tests:** ~100-150 test cases
- **Risk:** Medium-high (server-side undo + multi-user sync)
- **Recommendation:** Start with MOVE_CARD only (most common "oops"), add other actions incrementally
