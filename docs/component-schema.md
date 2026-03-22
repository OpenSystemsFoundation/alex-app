# LWC Component Schema

Quick reference for AI-assisted development. Documents public APIs, events, and data shapes.

Last updated: 2026-03-21

---

## Data Shapes

### CardDTO
| Field | Type | Description |
|-------|------|-------------|
| id | string | Record ID |
| name | string | Auto-number name |
| subject | string | Card title |
| description | string? | Rich text body |
| priority | string? | 'Blocking' \| 'High' \| 'Medium' \| 'Low' \| 'Trivial' |
| status | string? | Picklist value |
| cardType | string? | 'Story' \| 'Bug' \| 'Improvement' \| 'Spike' \| 'Task' \| 'Epic' |
| color | string? | Hex color code |
| dueDate | string? | ISO date |
| storyPoints | number? | Decimal |
| columnId | string | Parent column ID |
| boardId | string | Parent board ID |
| lexoRankPosition | string? | LexoRank position |
| sequenceNumber | number? | Optimistic concurrency version |
| locked | boolean? | Card is locked |
| needsRefinement | boolean? | Needs refinement flag |
| assignee | {id, name, photoUrl}? | Assigned user |
| peerReviewer | {id, name}? | Peer reviewer |
| epic | {id, subject}? | Parent epic |

### ColumnDTO
| Field | Type | Description |
|-------|------|-------------|
| id | string | Record ID |
| name | string | Column name |
| columnHeader | string | Display name |
| boardId | string | Parent board ID |
| lexoRankPosition | string? | Sort position |
| color | string? | Hex color |
| status | string? | Column status value |
| category | string? | 'To Do' \| 'In Progress' \| 'Done' \| 'Released' |
| cardCount | number? | Number of cards |

### SprintDTO
| Field | Type | Description |
|-------|------|-------------|
| id | string | Record ID |
| name | string | Auto-number (SP-0001) |
| boardId | string | Parent board ID |
| goal | string? | Sprint goal text |
| status | string | 'Planning' \| 'Active' \| 'Completed' |
| startDate | string? | ISO date |
| endDate | string? | ISO date |
| sprintNumber | number? | Sequential number |
| totalStoryPoints | number? | Sum of card points |
| completedStoryPoints | number? | Sum of completed points |
| velocity | number? | Completed points (after completion) |

### MenuItem (kanbanContextMenu)
| Field | Type | Description |
|-------|------|-------------|
| label | string | Display text |
| value | string | Action identifier |
| icon | string? | SLDS icon name |
| dividerBefore | boolean? | Show divider above this item |
| disabled | boolean? | Whether the item is disabled |
| submenu | MenuItem[]? | Nested submenu items |

### ConnectionStatusConfig (connectionStatusIndicator)
| Field | Type | Description |
|-------|------|-------------|
| status | string | 'connected' \| 'connecting' \| 'disconnected' \| 'error' \| 'polling' |
| eventCount | number | Platform events received |
| lastSyncTime | number? | Timestamp of last sync |
| syncState | string | 'idle' \| 'syncing' \| 'failed' |
| pendingOperationsCount | number | Pending save operations |
| lastSyncError | object? | Last error object |
| pollingUpdateDetected | any? | Truthy when polling found changes |

---

## Components

### kanbanBoard

Main orchestrator component. Manages store, subscriptions, drag-and-drop, and child components.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| recordId | string | undefined | Board record ID (set by Lightning page) |
| height | string | undefined | Optional fixed CSS height; omit for dynamic viewport fill |

**Events dispatched**: None (top-level component; delegates to child components and store).

**Key dependencies**: `c/kanbanStore` (createStore, selectors, moveCardToBacklogAsync), `c/kanbanCardPanel`, `c/kanbanBacklogView`, `c/kanbanContextMenu`, `c/kanbanSprintModal`, `c/kanbanSprintComplete`, `c/kanbanSprintHeader`, `c/kanbanSprintReports`, `c/subscriptionManager`, `c/connectionStatusIndicator`, `c/toastManager`, `c/navigationUtil`.

---

### kanbanCardPanel

Slide-out detail panel for viewing/editing a single card. Uses `lightning-record-edit-form` with dynamically configured fields.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| card | CardDTO | undefined | Card data to display |
| store | Store | undefined | Redux-style store instance |
| isOpen | boolean | false | Whether the panel is visible |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| close | (none) | Panel close requested |
| cardupdated | `{ cardId: string }` | Card was saved successfully |
| carddeleted | `{ cardId: string }` | Card was deleted |
| navigatetocard | `{ cardId: string }` | User clicked card name link |

**Key dependencies**: `c/kanbanStore` (updateCardAsync, deleteCardAsync), `@salesforce/apex/KanbanBoardController.getModalSettings`.

---

### kanbanBacklogView

Table view for managing backlog cards. Supports selection, drag reorder, inline create, filtering, sprint planning sections, and context menu.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| store | Store | undefined | Redux-style store instance |
| showDebugInfo | boolean | false | Show debug information |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| cardclick | `{ cardId: string }` | Card row clicked (opens panel) |
| navigatetocard | `{ cardId: string }` | Card name link clicked |
| error | `{ message: string }` | Operation error occurred |

**Key dependencies**: `c/kanbanStore` (selectors, setSelectedBacklogCards, toggleBacklogCardSelection, createBacklogCardAsync, updateBacklogCardAsync, deleteBacklogCardsAsync, reorderBacklogCardAsync, moveCardsToSprintAsync, createSprintAsync, addCardsToBacklogSprintAsync, removeCardFromBacklogSprintAsync), `c/kanbanContextMenu`.

---

### kanbanSprintModal

Modal dialog for creating or editing a sprint. Defaults to a 2-week sprint starting today.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| store | Store | undefined | Redux-style store instance |
| boardId | string | undefined | Board ID for sprint creation |
| sprint | SprintDTO? | undefined | Sprint data for edit mode; null/undefined for create |
| isOpen | boolean | false | Whether the modal is visible |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| close | (none) | Modal close requested |
| sprintcreated | `{ sprint: SprintDTO }` | Sprint was created |
| sprintstarted | (none) | Sprint was started |

**Key dependencies**: `c/kanbanStore` (createSprintAsync, startSprintAsync).

---

### kanbanSprintComplete

Multi-step wizard for completing a sprint. Steps: summary, disposition of incomplete cards, confirmation.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| store | Store | undefined | Redux-style store instance |
| sprintId | string | undefined | ID of the sprint to complete |
| isOpen | boolean | false | Whether the wizard is visible |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| close | (none) | Wizard close requested |
| sprintcompleted | (none) | Sprint was completed |

**Key dependencies**: `c/kanbanStore` (selectors, completeSprintAsync).

---

### kanbanSprintHeader

Displays active sprint info: name, goal, date range, days remaining, progress bar.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| store | Store | undefined | Redux-style store instance |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| completesprint | `{ sprintId: string }` | Complete sprint button clicked |
| createsprint | (none) | Create sprint button clicked |
| showreports | `{ sprintId: string }` | Show reports button clicked |

**Key dependencies**: `c/kanbanStore` (selectors).

---

### kanbanSprintReports

Modal with burndown chart, velocity chart, and summary tab. Renders charts on HTML canvas.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| store | Store | undefined | Redux-style store instance |
| sprintId | string | undefined | Sprint ID for burndown data |
| boardId | string | undefined | Board ID for velocity data |
| isOpen | boolean | false | Whether the reports modal is visible |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| close | (none) | Reports modal close requested |

**Key dependencies**: `c/kanbanStore` (loadBurndownDataAsync, loadVelocityDataAsync).

---

### kanbanContextMenu

Generic right-click context menu with optional nested submenus.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| menuItems | MenuItem[] | [] | Menu items to render |

**@api methods**

| Method | Parameters | Description |
|--------|------------|-------------|
| show(x, y) | x: number, y: number | Display menu at screen coordinates; auto-adjusts to stay in viewport |
| hide() | (none) | Hide the menu and clean up listeners |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| select | `{ value: string, subValue?: string }` | Menu item selected. `subValue` present for submenu picks. |

---

### subscriptionManager

Manages platform event (EMP API) subscriptions with retry logic and health monitoring. Automatically falls back to polling mode.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| channelName | string | undefined | Platform event channel (e.g. `/event/OpenSF__CardUpdateEvent__e`) |
| autoSubscribe | boolean | false | Auto-subscribe when channelName and boardId are set |
| boardId | string | undefined | Board ID (required for auto-subscribe) |

**@api methods**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| subscribe() | (none) | Promise | Subscribe to the platform event channel |
| unsubscribe() | (none) | void | Unsubscribe and stop health monitoring |
| registerErrorListener() | (none) | void | Register EMP API error handler (called automatically in connectedCallback) |
| isConnected() | (none) | boolean | Check if currently connected |
| getStatus() | (none) | string | Get current status string |
| getStatusIcon() | (none) | string | Get SLDS icon name for current status |
| getStatusVariant() | (none) | string | Get toast variant for current status |
| getStatusText() | (none) | string | Get human-readable status text |
| getStatusClass() | (none) | string | Get CSS class for current status |

**Events dispatched**

| Event | Detail | Description |
|-------|--------|-------------|
| message | `{ payload: object }` | Platform event received (payload is `data.payload`) |
| statuschange | `{ status: string }` | Connection status changed |
| statusmessage | `{ variant, title, message }` | Toast-style status notification |
| pollingrequired | `{ reason: string, error?: object }` | Fallback to polling needed |

---

### connectionStatusIndicator

Displays connection status dot and sync state (saving/saved/failed). Auto-fades "Saved" indicator after 3 seconds.

**@api properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| config | ConnectionStatusConfig | `{ status: 'disconnected', eventCount: 0, ... }` | All status properties as a single config object |

**@api getters**

| Getter | Returns | Description |
|--------|---------|-------------|
| detailedStatus | string | Human-readable detailed status string for tooltip |

**Events dispatched**: None.

---

### toastManager

Utility component for showing Salesforce toast notifications with convenience methods.

**@api methods**

| Method | Parameters | Description |
|--------|------------|-------------|
| showSuccess(message, mode?) | message: string, mode: string = 'dismissible' | Show success toast |
| showInfo(message, mode?) | message: string, mode: string = 'dismissible' | Show info toast |
| showWarning(message, mode?) | message: string, mode: string = 'dismissible' | Show warning toast |
| showError(title, error) | title: string, error: object\|string | Show sticky error toast; extracts message from error.body.message or error.message |
| showSubscriptionStatus(title, message, variant?) | title: string, message: string, variant: string = 'info' | Show subscription status toast |
| showToast(title, message, variant?, mode?) | title: string, message: string, variant: string = 'info', mode: string = 'dismissible' | Show custom toast |

**Events dispatched**: Dispatches `ShowToastEvent` internally (standard Lightning toast).

---

### navigationUtil

Utility component for Salesforce navigation. Handles both standard and console (workspace) apps. Opens records as subtabs in console app.

**@api methods**

| Method | Parameters | Description |
|--------|------------|-------------|
| navigateToRecord(recordId, objectApiName) | recordId: string, objectApiName: string | Navigate to a record page. In console apps, opens as a subtab. |
| navigateToPage(pageReference) | pageReference: object | Navigate using a Lightning page reference. In console apps, opens as a subtab. |

**Events dispatched**: None (uses NavigationMixin internally).

**Key dependencies**: `lightning/navigation` (NavigationMixin), `lightning/platformWorkspaceApi` (IsConsoleNavigation, openTab, getFocusedTabInfo).

---

## kanbanStore (State Management Module)

Redux-style state management. Not a visual component -- imported as `c/kanbanStore`.

### Store API (core/store.js)

```js
import { createStore } from 'c/kanbanStore';
const store = createStore(options?);
```

| Method | Returns | Description |
|--------|---------|-------------|
| getState() | object | Frozen copy of current state |
| dispatch(action) | any | Dispatch action object or thunk function |
| subscribe(callback) | () => void | Subscribe to state changes; returns unsubscribe function |
| enableDevTools() | void | Hot-plug undo/redo and Chrome console bridge |

### Action Creators (state/actions.js)

All are pure functions returning `{ type, payload }`.

**Board**
- `setBoard(board)` -- Set entire board object
- `setBoardId(boardId)` -- Set board ID

**Columns**
- `setColumns(columns)` -- Replace all columns
- `updateColumns(columns)` -- Alias for setColumns

**Cards**
- `addCard(card, columnId)` -- Add card to column
- `updateCard(cardId, updates)` -- Update card fields
- `deleteCard(cardId)` -- Delete card
- `moveCard(cardId, targetColumnId, targetIndex)` -- Move card to position

**Drag & Drop**
- `startDrag(source)` -- source: `{ cardId, columnId, cardIndex }`
- `updateDragPosition(targetColumnId, targetIndex)` -- Visual placeholder update
- `commitDrag()` -- Apply drag result
- `cancelDrag()` -- Revert to pre-drag state

**Loading/Error**
- `setLoading(isLoading)` -- Set loading flag
- `setError(error)` -- Set error state
- `clearError()` -- Clear error
- `setSubscriptionStatus(status)` -- 'connected' | 'connecting' | 'polling' | 'error' | 'disconnected'

**Sync**
- `setSyncState(state)` -- 'idle' | 'syncing' | 'failed'
- `startOperation(id, type, cardId)` -- Track operation start
- `completeOperation(id)` -- Mark operation complete
- `failOperation(id, error)` -- Mark operation failed

**Sprint**
- `setSprint(sprint)` -- Set active sprint
- `setSprints(sprints)` -- Set all sprints
- `updateSprint(sprintId, updates)` -- Update sprint fields

**Backlog**
- `setBacklogCards(cards)` -- Replace all backlog cards
- `addBacklogCard(card)` -- Add single backlog card
- `removeBacklogCard(cardId)` -- Remove backlog card
- `updateBacklogCard(cardId, updates)` -- Update backlog card
- `reorderBacklog(cardId, newIndex)` -- Move card to index
- `setBacklogSyncing(syncing)` -- Set syncing flag

**Sprint Cards**
- `setSprintCards(sprintCards)` -- Set sprint-card associations
- `moveCardToSprint(cardId, sprintId)` -- Associate card with sprint
- `moveCardToBacklog(cardId)` -- Remove card from sprint

**Planning Sprint Cards**
- `setPlanningSprintCards(cards)` -- Set planning sprint associations
- `addPlanningSprintCard(sprintCard)` -- Add card to planning sprint
- `removePlanningSprintCard(cardId, sprintId)` -- Remove card from planning sprint

**Backlog UI**
- `setBacklogVisible(visible)` -- Toggle backlog panel visibility
- `setSelectedBacklogCards(cardIds)` -- Set selected card IDs
- `toggleBacklogCardSelection(cardId)` -- Toggle single card selection

**Other**
- `reset()` -- Reset store to initial state

### Thunks (Async Action Creators)

All thunks return Promises. Dispatch them via `store.dispatch(thunkFn(...))`.

**Board**
- `loadBoardData(boardId)` -- Load full board with columns, cards, sprints, backlog

**Cards**
- `moveCardAsync(cardId, targetColumnId, targetIndex, lexoRank)` -- Move card + persist
- `createCardAsync(columnId)` -- Create new card in column
- `updateCardAsync(cardId, updates)` -- Update card fields + persist
- `deleteCardAsync(cardId)` -- Delete card + persist
- `createBacklogCardAsync(boardId, { subject })` -- Create card in backlog
- `updateBacklogCardAsync(cardId, updates)` -- Update backlog card + persist
- `deleteBacklogCardsAsync(cardIds)` -- Bulk delete backlog cards
- `reorderBacklogCardAsync(cardId, newIndex)` -- Reorder + persist position

**Sprints**
- `loadSprintDataAsync(boardId)` -- Load sprint data for board
- `createSprintAsync(boardId, goal, startDate, endDate)` -- Create new sprint
- `startSprintAsync(sprintId)` -- Activate a planning sprint
- `completeSprintAsync(sprintId, dispositions)` -- Complete sprint with card dispositions
- `addCardsToSprintAsync(sprintId, cardIds)` -- Add cards to active sprint
- `removeCardFromSprintAsync(sprintId, cardId)` -- Remove card from sprint
- `moveCardToBacklogAsync(sprintId, cardId)` -- Move board card to backlog
- `moveCardsToSprintAsync(sprintId, cardIds)` -- Move backlog cards to active sprint (board)
- `addCardsToBacklogSprintAsync(sprintId, cardIds)` -- Associate backlog cards with planning sprint
- `removeCardFromBacklogSprintAsync(sprintId, cardId)` -- Remove association
- `loadBurndownDataAsync(sprintId)` -- Load burndown chart data
- `loadVelocityDataAsync(boardId, count)` -- Load velocity chart data

### Selectors (state/selectors.js)

All are pure functions: `selector(state) => value` or `selector(state, arg) => value`.

**Board**
- `getBoard(state)` -> object | null
- `getBoardId(state)` -> string | null

**Columns & Cards**
- `getColumns(state)` -> Column[] (returns drag preview during drag)
- `getEnrichedColumns(state)` -> Column[] (alias with computed UI props)
- `getCardsByColumnMap(state)` -> `{ [columnId]: Card[] }`
- `findCard(state, cardId)` -> Card | null
- `findColumn(state, columnId)` -> Column | null
- `getCardsByColumn(state, columnId)` -> Card[]
- `getTotalCardCount(state)` -> number
- `getColumnCount(state)` -> number

**Drag**
- `isDragging(state)` -> boolean
- `getDragSource(state)` -> `{ cardId, columnId, cardIndex }` | null
- `getDragState(state)` -> Column[] | null

**Loading/Error**
- `getIsLoading(state)` -> boolean
- `getError(state)` -> object | string | null
- `getSubscriptionStatus(state)` -> string

**Sync**
- `getSyncState(state)` -> 'idle' | 'syncing' | 'failed'
- `getPendingOperations(state)` -> Operation[]
- `getPendingOperationsForCard(state, cardId)` -> Operation[]
- `hasPendingOperations(state)` -> boolean
- `cardHasPendingOperations(state, cardId)` -> boolean
- `getLastSyncTime(state)` -> number | null
- `getLastSyncError(state)` -> object | null
- `getSyncStatusMessage(state)` -> string

**Sprint**
- `getActiveSprint(state)` -> SprintDTO | null
- `getSprints(state)` -> SprintDTO[]
- `getSprintCards(state)` -> SprintCard[]
- `isSprintBoard(state)` -> boolean
- `getSprintProgress(state)` -> number (0-100)
- `getSprintDaysRemaining(state)` -> number | null

**Backlog**
- `getBacklogCards(state)` -> CardDTO[]
- `isBacklogVisible(state)` -> boolean
- `getSelectedBacklogCards(state)` -> string[]
- `getBacklogCardCount(state)` -> number
- `getBacklogCardById(state, cardId)` -> CardDTO | null
- `getUnrefinedBacklogCards(state)` -> CardDTO[]
- `isBacklogSyncing(state)` -> boolean
- `getPlanningSprintCards(state)` -> `{ sprintId, cardId }[]`
- `getPlanningSprints(state)` -> SprintDTO[] (status === 'Planning')
- `getCardSprintId(state, cardId)` -> string | null
