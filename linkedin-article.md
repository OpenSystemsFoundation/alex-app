# LinkedIn Call-to-Action Post

---

**I built a Redux DevTools layer for Salesforce LWC — with time-travel debugging, undo/redo, and a Chrome console bridge. All running inside LockerService.**

Nobody has done this before. Not the community lwc-redux libraries (all abandoned since 2021). Not Salesforce's own @lwc/state beta.

Here's why it matters and how it works. Full technical breakdown in the article below.

[LINK TO ARTICLE]

#Salesforce #LWC #Redux #JavaScript #StateManagement #DevTools #OpenSource

---

# Article: Redux Inside Salesforce LWC — Time-Travel Debugging, Undo/Redo, and a Chrome DevTools Bridge That Actually Works Behind LockerService

## The Problem Nobody Solved

Every existing Redux-for-LWC library — `chandrakiran-dev/lwc-redux` (53 stars, last commit 2021), `greg-adams/lwc-redux`, `prashantk0001/lwc-redux` — they're all thin binding layers. They load Redux as a static resource, give you `mapStateToProps`, and call it a day. None of them built the tooling that makes Redux actually powerful: action history, time-travel debugging, undo/redo, state diffing, or DevTools integration.

Salesforce's own `@lwc/state` beta? Different paradigm entirely (signals/atoms), still not GA, and no debugging tools either.

The reason is simple: **LockerService/Lightning Web Security kills browser extensions at the sandbox boundary.** Redux DevTools can't reach your store. So everyone just... gave up.

We didn't.

## The Architecture

Here's our custom Redux store. No external libraries. No static resources. Pure ES modules inside an LWC service component:

```
kanbanStore/
├── core/
│   ├── store.js              // KanbanStore class (dispatch, subscribe, getState)
│   └── actionTypes.js        // 70 action type constants
├── state/
│   ├── actions.js            // 40+ action creators
│   ├── reducers.js           // rootReducer + 8 domain reducers
│   └── selectors.js          // 50+ selector functions
├── middleware/
│   ├── thunkMiddleware.js    // Async dispatch (functions as actions)
│   ├── loggingMiddleware.js  // Action/state logging
│   └── devToolsMiddleware.js // ** Action history + time-travel + undo/redo **
├── devtools/
│   └── devToolsBridge.js     // ** Chrome console integration **
├── thunks/
│   ├── boardThunks.js        // Board data loading
│   ├── cardThunks.js         // Card CRUD with optimistic updates
│   └── sprintThunks.js       // Full Scrum sprint lifecycle
└── utils/
    ├── stateHelpers.js       // Immutable state transformations
    ├── dataProcessors.js     // Card/column enrichment
    └── positionCalculator.js // Lexorank positioning
```

This powers a real-time collaborative Kanban board with drag-and-drop, sprint management, backlog grooming, and multi-user sync — all on Salesforce.

## The Store Core

The store implementation follows Redux conventions but is built for LWC's reactivity model. Components subscribe and receive frozen state snapshots:

```javascript
class KanbanStore {
    constructor(middlewares = []) {
        this._state = { ...initialState };
        this._subscribers = new Set();
        this._dispatchChain = this._buildDispatchChain();
    }

    getState() {
        return Object.freeze({ ...this._state });
    }

    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    dispatch(action) {
        return this._dispatchChain(action);
    }

    _buildDispatchChain() {
        const baseDispatch = this._baseDispatch.bind(this);
        return this._middlewares.reduceRight(
            (next, middleware) => middleware(this)(next),
            baseDispatch
        );
    }

    _baseDispatch(action) {
        const result = rootReducer(this._state, action);
        this._state = result.state;
        this._notifySubscribers();
    }
}
```

`Object.freeze` on every `getState()` call. No accidental mutations. The middleware chain is built right-to-left, exactly like Redux — thunk intercepts functions, devtools records snapshots, logging prints to console.

## The Middleware That Records Everything

This is the core innovation. Every dispatched action gets recorded with a full before/after state snapshot and a computed diff:

```javascript
export const createDevToolsMiddleware = (recorder) => {
    return (store) => (next) => (action) => {
        if (typeof action === 'function' || !action?.type) {
            return next(action);
        }

        const prevState = store.getState();
        const result = next(action);
        const nextState = store.getState();

        recorder.record(action, prevState, nextState);

        return result;
    };
};
```

The recorder maintains an array of history entries. Each entry stores:

```javascript
{
    id: 42,
    action: { type: 'MOVE_CARD', payload: { cardId, targetColumnId, targetIndex } },
    prevState: { /* full state snapshot */ },
    nextState: { /* full state snapshot */ },
    diff: {
        columns: { prev: [...], next: [...] },
        isDragging: { prev: true, next: false }
    },
    timestamp: 1710892800000,
    undoable: true
}
```

The `diff` is computed automatically — only keys that actually changed between `prevState` and `nextState` appear. When you're debugging "why did my card disappear?", you search for `MOVE_CARD` or `DELETE_CARD` actions and look at exactly which state keys changed.

## Time-Travel: Jump to Any Point in History

```javascript
jumpTo(id) {
    const idx = history.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    cursor = idx;
    return history[idx].nextState;
}
```

When you jump, the store calls `_applyState()` which directly replaces the internal state and notifies all subscribers. The UI re-renders to show the app exactly as it was at that point in time.

The cursor tracks where you are in the timeline. If you jump backwards and then dispatch a new action, the future entries are discarded (the timeline forks):

```javascript
if (cursor < history.length - 1) {
    history.splice(cursor + 1); // Fork the timeline
}
```

## Undo/Redo That Skips the Noise

Not all actions should be undoable. Drag position updates fire dozens of times per second. Loading flags and sync operations are internal bookkeeping. We classify these as transient:

```javascript
const TRANSIENT_ACTIONS = new Set([
    'UPDATE_DRAG_POSITION',
    'SET_LOADING',
    'START_OPERATION',
    'COMPLETE_OPERATION',
    'FAIL_OPERATION',
    'SET_SYNC_STATE',
    'SET_SUBSCRIPTION_STATUS',
    'POLLING_UPDATE_DETECTED'
]);
```

Undo walks backwards through the history, skipping transient entries, and restores the `prevState` of the first meaningful action it finds:

```javascript
undo() {
    for (let i = cursor; i >= 0; i--) {
        if (history[i].undoable) {
            cursor = i - 1;
            return history[i].prevState;
        }
    }
    return null;
}
```

So when a user moves a card to the wrong column, `undo()` skips past the 40 drag position updates and the sync operations, straight back to the state before the move.

The Kanban board also has dedicated undo/redo buttons in the toolbar with keyboard shortcuts: **Ctrl+Z / Ctrl+Y** on Windows/Linux, **Cmd+Z / Cmd+Shift+Z** on Mac. The buttons are visually disabled when there's nothing to undo or redo, and the tooltips show the platform-appropriate shortcut.

## The Chrome DevTools Bridge (The LWS Workaround)

Here's what makes this hard: **Lightning Web Security (LWS) sandboxes each namespace into its own JavaScript realm.** That means:

- **`window` is sandboxed.** Properties you set on `window` inside your LWC are invisible from the Chrome console. The console runs in the host page's realm, your code runs in the LWS sandbox. `window.__KANBAN_DEVTOOLS__` simply doesn't exist from the console's perspective.
- **`sessionStorage` is sandboxed.** We tried a command-queue approach where the console writes a command to `sessionStorage` and the LWC polls for it. LWS gives each namespace its own isolated storage. The commands never cross.
- **Browser extensions can't reach your store.** The Redux DevTools Chrome extension has no path into the sandbox.

So how do you bridge the gap? **The DOM is shared.** Custom events dispatched on `document` from the Chrome console _are_ visible to event listeners registered inside the LWS sandbox. That's the key insight.

We register a listener inside the LWC sandbox:

```javascript
const CMD_EVENT_TYPE = '__kdt_exec__';

document.addEventListener(CMD_EVENT_TYPE, (event) => {
    const command = event.detail; // e.g. 'history', 'inspect:42'
    executeCommand(bridge, command);
});
```

From the Chrome console, you dispatch a `CustomEvent` with the command as the `detail` string:

```javascript
// View state summary as a table
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'state' }));

// List every action that was dispatched
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'history' }));

// Inspect a specific action (full state snapshots + diff)
document.dispatchEvent(
    new CustomEvent('__kdt_exec__', { detail: 'inspect:42' })
);

// Search actions by type
document.dispatchEvent(
    new CustomEvent('__kdt_exec__', { detail: 'search:MOVE_CARD' })
);

// Time-travel to a specific point
document.dispatchEvent(
    new CustomEvent('__kdt_exec__', { detail: 'jumpTo:15' })
);

// Undo / Redo
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'undo' }));
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'redo' }));

// Live action log (prints every action as it fires)
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'livelog' }));

// Export full history as JSON
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'export' }));
```

The bridge parses the command string, executes it against the recorder, and prints results to the console using `console.log` and `console.table` — which _are_ visible across the boundary.

16 commands: state, history, stats, inspect, diff, search, jumpTo, undo, redo, livelog, stoplive, pause, resume, export, clear, help. State inspection, action history, time-travel, undo/redo, diff viewing, live logging, search, export. All from the Chrome console. No browser extension needed.

This is also a game-changer for **AI-assisted development with tools like Claude Code**. When Claude Code needs to debug state issues in a deployed Salesforce org, it can read the action history, inspect diffs, and understand exactly what happened — without relying on console.log statements scattered through the codebase.

## Optimistic Updates With Operation Tracking

Our thunks implement optimistic updates with full operation tracking. When you update a card, the UI changes immediately, then persists to the server:

```javascript
export const updateCardAsync = (cardId, updates) => {
    return async (dispatch, getState) => {
        // Optimistic: update state immediately
        dispatch(updateCardAction(cardId, updates));
        dispatch(startOperation({ id: opId, type: 'updateCard', cardId }));

        try {
            await updateCardApex({ cardId, ...updates });
            dispatch(completeOperation({ id: opId }));
        } catch (error) {
            // Revert on failure
            dispatch(failOperation({ id: opId, error: error.message }));
            throw error;
        }
    };
};
```

The `START_OPERATION` / `COMPLETE_OPERATION` / `FAIL_OPERATION` cycle gives us a sync status UI ("Saving 3 changes...") and the operation tracking integrates with the DevTools — you can see exactly which server calls are in flight, which completed, and which failed.

## The Drag State Isolation Pattern

This pattern took several architecture iterations to get right. During a drag, we don't modify the real `columns` state. Instead, we maintain a parallel `dragState` that contains the visual preview:

```javascript
case 'START_DRAG':
    return {
        ...state,
        isDragging: true,
        dragSource: action.payload.source,
        dragState: structuredClone(state.columns)  // Snapshot
    };

case 'UPDATE_DRAG_POSITION':
    return {
        ...state,
        dragState: calculateDragState(state, targetColumnId, targetIndex)
    };

case 'COMMIT_DRAG':
    return {
        ...state,
        columns: structuredClone(state.dragState),  // Promote to real state
        isDragging: false,
        dragState: null
    };
```

The `getColumns()` selector transparently returns `dragState` during a drag and `columns` otherwise:

```javascript
export const getColumns = (state) => {
    if (state.isDragging && state.dragState) {
        return state.dragState;
    }
    return state.columns || [];
};
```

Components don't know or care whether they're rendering a drag preview or committed state. The selector abstracts it. And because `CANCEL_DRAG` simply discards `dragState` and keeps `columns` unchanged, canceling a drag is instantaneous with zero state corruption.

## 885 Tests. Zero External Dependencies.

The entire state management layer — store, reducers, selectors, middleware, thunks, devtools — runs 885 unit tests. The Redux implementation has zero npm runtime dependencies (no `redux`, no `react-redux`, no `reselect`). It's pure JavaScript running inside Salesforce's LWC engine.

Test coverage spans:

- Every reducer branch for all 70 action types
- Selector logic including drag state transitions
- Thunk async flows with Apex mock calls
- Store middleware chain composition
- Position calculator (lexorank) edge cases
- Multi-user sync scenarios
- Platform event integration

## The State Shape

For the curious, here's the full state tree this manages:

```javascript
{
    columns: [],                    // Column definitions with nested cards
    board: null,                    // Board metadata
    boardId: null,                  // Active board ID
    dragState: null,                // Visual preview during drag
    isDragging: false,              // Drag in progress
    dragSource: null,               // Original drag position
    isLoading: false,
    error: null,
    subscriptionStatus: 'disconnected',
    syncState: 'idle',              // 'idle' | 'syncing' | 'failed'
    pendingOperations: [],          // In-flight server calls
    lastSyncTime: null,
    lastSyncError: null,
    activeSprint: null,             // Current sprint object
    sprints: [],                    // All sprints
    sprintCards: [],                // Cards in active sprint
    backlogCards: [],               // Unassigned cards
    backlogSyncing: false,          // Optimistic reorder guard
    backlogVisible: false,
    selectedBacklogCards: []         // Multi-select state
}
```

One state tree. Eight domain reducers. Fifty selectors. Full Scrum lifecycle — sprints, backlog grooming, burndown charts, velocity tracking — managed through the same dispatch/reduce/select cycle.

---

## The Backstory (For Those Who Like a Good Origin Story)

This project started about 2.5 years ago as my first real development project. I had just passed my PD1 certification and knew some basic JavaScript. The tooling? ChatGPT in a browser tab — copy-pasting code into the chat interface, copying responses back into VS Code. No CLI integration. No context awareness. No codebase understanding.

It took 4-6 months to build the first working version. Brutal doesn't begin to describe it.

The core problem was always the same: **Salesforce's standard reactivity doesn't work for a real-time collaborative Kanban board.** Wire adapters re-fetch on their own schedule. Lightning Data Service doesn't support cross-user updates. Platform events arrive, but reconciling them with optimistic local state was a nightmare of race conditions and stale renders.

I iterated through the architecture multiple times. Tried pure wire adapters. Tried imperative Apex with manual refresh cycles. Tried event-driven patterns with LMS. Each one solved one problem and created three more.

Then I built the custom Redux layer. One state tree. Predictable updates. Middleware for async. Selectors for derived data. It solved the core reactivity problems because the state transitions became explicit and traceable.

About a year ago, I attempted to optimize the drag-and-drop UX — real-time visual feedback as you drag over positions, not just the standard "drop on a column" behavior. It meant maintaining a parallel drag state, computing visual previews on every mouse move, and reconciling with server state on commit. I got partway there but the complexity was getting out of hand. I shelved it.

Then Claude Opus 4.6 happened. With Claude Code's codebase understanding and multi-file editing, we were able to:

- Complete the real-time drag-and-drop preview system (the drag state isolation pattern described above)
- Build full Scrum features: sprint planning, backlog management, burndown charts, velocity tracking
- Achieve 885 unit tests across the entire state management layer
- Design and implement the Redux DevTools with time-travel, undo/redo, and the Chrome bridge

What took months of copy-pasting 2.5 years ago now happens in focused sessions with an AI that actually understands the codebase architecture.

The code is open source: [github.com/OpenSystemsFoundation/alex-app](https://github.com/OpenSystemsFoundation/alex-app)

---

_If you're building complex LWC apps and fighting Salesforce's reactivity model, look at the Redux pattern. And if you want the debugging tools that come with it — the time-travel, the undo/redo, the Chrome console — the code is right there._
