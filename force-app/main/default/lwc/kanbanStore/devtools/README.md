# Kanban Store DevTools

Redux-style DevTools for the Kanban LWC store, providing time-travel debugging, undo/redo, and a Chrome console bridge -- all running inside Salesforce's Lightning Web Security (LWS) sandbox.

## Overview

The DevTools layer records every dispatched action with full before/after state snapshots and computed diffs. This gives you:

- **Action history** -- see every action that was dispatched, in order
- **Time-travel debugging** -- jump to any point in the action timeline and the UI re-renders to match
- **Undo/Redo** -- revert or reapply meaningful actions, automatically skipping transient noise (drag updates, loading flags)
- **State diffing** -- see exactly which state keys changed for any action
- **Live logging** -- watch actions as they fire in real time
- **Chrome console bridge** -- interact with all of the above from the browser console, even inside the LWS sandbox
- **Export** -- dump full action history as JSON for sharing or offline analysis

## Architecture

Two modules work together:

### `middleware/devToolsMiddleware.js` -- Recording Layer

This module provides:

1. **`createDevToolsRecorder()`** -- A standalone recorder object that stores action history, manages the time-travel cursor, and implements undo/redo logic. It is deliberately separated from the middleware so the Chrome bridge can access it independently.

2. **`createDevToolsMiddleware(recorder)`** -- A Redux-style middleware function `(store) => (next) => (action) => {}` that intercepts every dispatched action, captures the before/after state, computes a diff, and writes the entry to the recorder.

Each history entry contains:

```javascript
{
    id: 42,                    // Auto-incrementing ID
    action: { type, payload }, // The dispatched action
    prevState: { ... },        // Full state snapshot before
    nextState: { ... },        // Full state snapshot after
    diff: { key: { prev, next } },  // Only keys that changed
    timestamp: 1710892800000,  // When the action was dispatched
    undoable: true             // Whether undo/redo should consider this action
}
```

### `devtools/devToolsBridge.js` -- Console Bridge

The bridge exposes the recorder's capabilities to the Chrome DevTools console. It installs two access strategies:

1. **`window.__KANBAN_DEVTOOLS__`** -- Direct object on `window` (works when LWS allows it)
2. **DOM CustomEvent bridge** -- The primary strategy that works in both LockerService and LWS (see below)

## How It Crosses the LWS Boundary

### The Problem

Lightning Web Security (LWS) sandboxes each namespace into its own JavaScript realm. This means:

- **`window` is sandboxed** -- properties set on `window` inside your LWC are not visible from the Chrome console (which runs in the host page's realm).
- **`sessionStorage` is sandboxed** -- each namespace gets its own isolated storage. An earlier strategy used sessionStorage as a command queue, but commands written from the console were invisible to the LWC code.
- **Browser extensions cannot reach your store** -- the Redux DevTools Chrome extension cannot access JavaScript objects inside the LWS sandbox.

### The Solution: DOM CustomEvent Bridge

The DOM `document` object **is shared** across the LWS boundary. Custom events dispatched on `document` from the Chrome console are visible to event listeners registered inside the LWC sandbox.

The bridge registers a listener on `document` for the `__kdt_exec__` event type. From the Chrome console, you dispatch a CustomEvent with the command as the `detail` string:

```javascript
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'help' }));
```

The bridge parses the command, executes it against the recorder, and prints the results to the console. This works because:

1. The console dispatches the event on the real `document`
2. LWS allows `document.addEventListener` to receive events from outside the sandbox
3. `console.log` / `console.table` output from inside the sandbox is visible in the Chrome DevTools console

## Enabling DevTools

DevTools are gated behind a custom setting on the `KanbanConfig__c` custom metadata object:

1. Create or update the `KanbanConfig__c` record
2. Set the `EnableDevTools__c` field to `true`
3. Reload the page

When enabled, you will see this in the Chrome console:

```
 Kanban DevTools enabled
Try: document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'help' }))
```

When disabled, no middleware is attached and no history is recorded -- zero performance overhead.

## Command Reference

All commands are available via the DOM event bridge. Usage:

```javascript
document.dispatchEvent(new CustomEvent('__kdt_exec__', { detail: 'COMMAND' }));
```

| Command        | Description                                                                             |
| -------------- | --------------------------------------------------------------------------------------- |
| `state`        | Show current state summary as a table (columns, cards, sync status, etc.)               |
| `history`      | List all recorded actions with ID, type, undoable flag, changed keys, timestamp         |
| `stats`        | Show total action count, cursor position, undo/redo availability, action type breakdown |
| `inspect:ID`   | Inspect a specific action by ID -- full payload, state diff, before/after snapshots     |
| `diff:ID`      | Show only the state diff for a specific action (which keys changed, prev/next values)   |
| `search:QUERY` | Search actions by type (case-insensitive). Example: `search:MOVE_CARD`                  |
| `jumpTo:ID`    | Time-travel to a specific action -- the UI re-renders to show the app at that point     |
| `undo`         | Undo the last undoable action (skips transient actions)                                 |
| `redo`         | Redo the next undoable action                                                           |
| `livelog`      | Start live logging -- prints every action to the console as it fires                    |
| `stoplive`     | Stop live logging                                                                       |
| `pause`        | Pause recording (actions are dispatched but not recorded)                               |
| `resume`       | Resume recording                                                                        |
| `export`       | Export full history as JSON (printed to console)                                        |
| `clear`        | Clear all history and reset the cursor                                                  |
| `help`         | Print the command reference table to the console                                        |

## Undo/Redo

### Keyboard Shortcuts

| Platform        | Undo   | Redo        |
| --------------- | ------ | ----------- |
| Windows / Linux | Ctrl+Z | Ctrl+Y      |
| macOS           | Cmd+Z  | Cmd+Shift+Z |

The Kanban board also renders dedicated undo/redo buttons in the toolbar. The buttons show the keyboard shortcut in their tooltip and are visually disabled when there is nothing to undo or redo.

### Transient Actions (Skipped for Undo)

Not all actions are meaningful for undo. The following action types are classified as **transient** -- they are recorded in history for inspection but skipped by undo/redo:

| Action Type               | Reason                                       |
| ------------------------- | -------------------------------------------- |
| `UPDATE_DRAG_POSITION`    | Fires dozens of times per second during drag |
| `SET_LOADING`             | Internal loading flag                        |
| `START_OPERATION`         | Optimistic update bookkeeping                |
| `COMPLETE_OPERATION`      | Optimistic update bookkeeping                |
| `FAIL_OPERATION`          | Optimistic update bookkeeping                |
| `SET_SYNC_STATE`          | Sync status indicator                        |
| `SET_SUBSCRIPTION_STATUS` | Platform event subscription state            |
| `POLLING_UPDATE_DETECTED` | Background polling notification              |

When you press Ctrl+Z, the undo logic walks backwards through history, skipping transient entries, and restores the `prevState` of the first meaningful (undoable) action it finds. So undoing a card move skips past the 40+ drag position updates that preceded the commit.

## Max History

The recorder keeps a maximum of **200 entries**. When the limit is reached, the oldest entry is removed. This prevents unbounded memory growth during long sessions while keeping enough history for meaningful debugging.

## Reusing This Pattern in Other LWC Projects

The DevTools layer is designed to be portable. To adapt it for another LWC project with a Redux-style store:

1. **Copy the two files:**
    - `middleware/devToolsMiddleware.js` -- the recorder and middleware
    - `devtools/devToolsBridge.js` -- the console bridge

2. **Wire the middleware into your store's dispatch chain:**

    ```javascript
    import {
        createDevToolsRecorder,
        createDevToolsMiddleware
    } from './middleware/devToolsMiddleware';
    import { installDevToolsBridge } from './devtools/devToolsBridge';

    const recorder = createDevToolsRecorder();
    const middleware = createDevToolsMiddleware(recorder);
    // Add `middleware` to your store's middleware array
    ```

3. **Install the bridge after store initialization:**

    ```javascript
    const bridge = installDevToolsBridge(store, recorder);
    // Store a reference so you can call bridge.destroy() on cleanup
    ```

4. **Update the `TRANSIENT_ACTIONS` set** in `devToolsMiddleware.js` to match your application's noisy action types.

5. **Implement `store._applyState(state)`** -- a method on your store that directly replaces the internal state and notifies subscribers. This is required for time-travel and undo/redo to work.

6. **Gate behind a feature flag** -- use a custom setting, feature flag, or environment check so DevTools are never active in production. The middleware records full state snapshots on every action, which has memory and performance implications.

The DOM CustomEvent bridge pattern (`__kdt_exec__`) works for any LWC project running under LWS. The event type name can be changed by updating the `CMD_EVENT_TYPE` constant in `devToolsBridge.js`.
