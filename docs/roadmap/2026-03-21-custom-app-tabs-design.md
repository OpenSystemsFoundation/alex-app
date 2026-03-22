# Custom App Tabs — Design Document

**Date:** 2026-03-21
**Goal:** Eliminate the triple-tab problem (record page tabs + LWC tabs + console workspace tabs) by absorbing all functionality into custom tabs inside the `kanbanBoard` LWC, maximizing screen real estate for the board.

---

## The Problem: Three Layers of Tabs

```
┌─────────────────────────────────────────────────────────┐
│ Console Workspace Tabs (Board__c, Card__c, ...)        │  ← Layer 1
├─────────────────────────────────────────────────────────┤
│ Record Page Tabs (Board | Columns | Details | Related  │
│                   | Activity | Collaborate)             │  ← Layer 2
├─────────────────────────────────────────────────────────┤
│ LWC Tabs (Backlog | Board)                             │  ← Layer 3
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Kanban Board Content                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Each tab layer consumes vertical space and creates navigation confusion. Users see ~3 rows of tabs before reaching actual content.

---

## The Solution: Single Custom Tab Bar

Collapse all useful tab content into the existing `kanbanBoard` topbar. The record page becomes a single full-bleed component with no Salesforce tabset wrapper.

```
┌─────────────────────────────────────────────────────────┐
│ Backlog | Board | Columns | Details    [Sprint] [Actions]│  ← One unified bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Full-height content area                   │
│              (board, backlog, columns, or details)      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Changes Required

### 1. Flexipage: Board Record Page

**Current:** Uses `flexipage:recordHomeSimpleViewTemplate` with a `flexipage:tabset` containing 6 tabs (Board, Columns, Detail, Related Lists, Activity, Collaborate).

**New:** Use `flexipage:recordHomeSingleColNoHeaderTemplateDesktop` (or similar full-width template) with the `kanbanBoard` LWC as the **only** component, no tabset wrapper.

- Remove: `flexipage:tabset` and all `flexipage:tab` entries
- Remove: Columns related list facet, detail panel facet, related list container facet, activity panel facet, chatter feed facet
- Keep: `force:highlightsPanel` (the record header with action buttons — Edit, Create Column, etc.) — this stays above the LWC

**Result:** The record page is just: highlights panel + kanbanBoard LWC. No Salesforce tabs.

### 2. App Configuration: Switch from Console to Standard Nav

**Current:** `AlexConsole.app` uses `<navType>Console</navType>` which adds workspace tabs for every record you open.

**New:** Switch to `<navType>Standard</navType>` (or keep Console but configure it to minimize tab clutter). Switching to Standard nav eliminates the workspace tab bar entirely. Records open as full pages instead of tabs.

**Trade-off:** Console nav lets users open multiple boards as tabs. If that's desired, we keep Console nav but set `isNavAutoTempTabsDisabled=true` and `isNavTabPersistenceDisabled=true` to reduce tab noise. The decision is yours — the custom tabs work either way.

### 3. kanbanBoard LWC: Add New Tab Views

**Current tabs:** `board`, `backlog`

**New tabs to add:**

| Tab | Content | Source |
|-----|---------|--------|
| `board` | Kanban board (existing) | Already built |
| `backlog` | Backlog view (existing) | Already built |
| `columns` | Column management list | Currently in record page "Columns" tab — `lst:dynamicRelatedList` for `Columns__r` |
| `details` | Board record detail form | Currently in record page "Details" tab — `force:detailPanel` |

**Dropped tabs (not moving into LWC):**
- **Related Lists** — generic catch-all, not useful for the board workflow
- **Activity** — low usage for board records; accessible via standard Salesforce nav if needed
- **Collaborate (Chatter)** — low usage for board records; accessible via standard Salesforce nav if needed

> If Activity or Chatter are needed later, they can be added as tabs. For now, removing them maximizes space.

### 4. New Tab: Columns View

Render the Columns related list inside the LWC. Two options:

**Option A — `lightning-datatable` with Apex query (Recommended)**
- Query columns via existing store data (already loaded) or a lightweight Apex call
- Render in a `lightning-datatable` showing: Name, Column Header, LexoRank Position, Status, Card Count
- Add inline "New Column" button
- Consistent styling with the rest of the app

**Option B — `lightning-record-view-form` / related list component**
- Use `lightning-related-list` standard component
- Less control over styling, but zero new code

### 5. New Tab: Details View

Render the board record detail inside the LWC:

- Use `lightning-record-form` or `lightning-record-edit-form` with `object-api-name="OpenSF__Board__c"` and `record-id={recordId}`
- Display key board fields (Name, Description, Type, Status, Owner, etc.)
- Supports inline editing like the standard detail panel
- Styled to match the app's visual language

### 6. Updated Tab Bar UI

The existing topbar already has the tab structure. We extend it:

```html
<div class="kanban-topbar__tabs">
    <button class={backlogTabButtonClass} data-tab-id="backlog" onclick={handleTabClick}>
        Backlog <span class="tab-badge">{backlogCardCount}</span>
    </button>
    <button class={boardTabButtonClass} data-tab-id="board" onclick={handleTabClick}>
        Board
    </button>
    <button class={columnsTabButtonClass} data-tab-id="columns" onclick={handleTabClick}>
        Columns
    </button>
    <button class={detailsTabButtonClass} data-tab-id="details" onclick={handleTabClick}>
        Details
    </button>
</div>
```

The sprint header, connection status, undo/redo, and refresh button remain in the topbar — they are contextually relevant across all tabs.

### 7. Dynamic Height

The existing `initializeDynamicHeight()` already calculates available viewport height. With the record page tabs removed, the `rect.top` value will be smaller, automatically giving the board more vertical space. No changes needed to the height logic.

---

## Files to Modify

| File | Change |
|------|--------|
| `flexipages/Board_Record_Page.flexipage-meta.xml` | Strip tabset, use single-column template with only highlights panel + kanbanBoard |
| `lwc/kanbanBoard/kanbanBoard.html` | Add `columns` and `details` tab buttons + conditional content sections |
| `lwc/kanbanBoard/kanbanBoard.js` | Add tab state getters, button class getters for new tabs |
| `lwc/kanbanBoard/kanbanBoard.css` | Minor tweaks if needed (tab styling already exists) |
| `applications/AlexConsole.app-meta.xml` | Optionally switch navType or adjust tab persistence settings |

## New Files (potentially)

| File | Purpose |
|------|---------|
| None required if using `lightning-record-form` for Details and `lightning-datatable` for Columns inline | — |
| `lwc/kanbanColumnsView/*` | Only if we want a dedicated child component for the Columns tab (recommended for separation of concerns) |

---

## Screen Space Gains

**Before (estimated vertical space consumed by tabs):**
- Console workspace tab bar: ~40px
- Record page highlights panel: ~60px
- Record page tab strip: ~40px
- LWC topbar (board/backlog tabs): ~36px
- **Total overhead: ~176px**

**After:**
- Record page highlights panel: ~60px (kept — has record name + action buttons)
- LWC topbar (unified tabs): ~36px
- **Total overhead: ~96px**

**Net gain: ~80px** of vertical space for the board content — roughly 2-3 extra kanban cards visible per column.

---

## Migration Notes

- No data migration required — this is purely a UI/layout change
- Users who bookmarked specific record page tabs will land on the Board tab (default)
- All existing functionality (board, backlog, sprint, card panel) is unchanged
- The Columns and Details tabs are additive — they bring in what was previously on separate record page tabs

---

## Open Questions

1. **Console vs Standard nav?** Console gives multi-board workspace tabs. Standard gives cleaner single-page experience. Recommendation: try Standard first, switch back to Console if users miss workspace tabs.
2. **Should Columns tab use existing store data or a separate query?** Store already has column data — we can reuse it for zero additional server calls.
3. **Include Activity/Chatter tabs?** Excluded for now to maximize simplicity. Can add later if needed.
