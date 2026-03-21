# Editable Card Description — Solution Outline

## Current State (What's Done)

**Commit:** `c62b67c` — "Add description templates per card type in the card panel"

### Implemented

1. **Description templates** — `DESCRIPTION_TEMPLATES` map in `kanbanCardPanel.js` (lines 21–82)
    - Templates for all 6 card types: Story, Bug, Improvement, Spike, Task, Epic
    - Each template uses structured HTML headings, lists, and placeholders

2. **"Apply Template" button** — in the card detail side panel (kanbanCardPanel.html lines 91–101)
    - Conditionally rendered when a card type is set and a template exists
    - Populates `lightning-input-field` value for `Description__c` via DOM query
    - Styled as a `base` variant button with `utility:paste` icon

3. **Description field separation** — `descriptionField` / `regularFields` getters (lines 168–178)
    - Description is rendered separately from other form fields for custom layout
    - Gets its own full-width section with the template button header

### Files Changed

- `lwc/kanbanCardPanel/kanbanCardPanel.js` — +100 lines (templates, getters, handler)
- `lwc/kanbanCardPanel/kanbanCardPanel.html` — +20 lines (description section with template button)
- `lwc/kanbanCardPanel/kanbanCardPanel.css` — +4 lines (`.template-btn` style)

---

## Remaining Work

### Phase 1: Description Preview on Board Cards

**Goal:** Show a truncated plain-text description snippet on Kanban board cards.

**Files to modify:**

- `lwc/kanbanBoard/kanbanBoard.html` — Add description snippet below `{card.subject}` (around line 374)
- `lwc/kanbanBoard/kanbanBoard.js` — Add `descriptionSnippet` computed property to card enrichment
- `lwc/kanbanBoard/kanbanBoard.css` — Add styles for description snippet (muted text, line clamp)

**Implementation:**

```html
<!-- After card.subject, before card icons -->
<template lwc:if="{card.descriptionSnippet}">
    <p
        class="slds-text-body_small slds-text-color_weak card-description-snippet"
    >
        {card.descriptionSnippet}
    </p>
</template>
```

**Card enrichment logic:**

- Strip HTML tags from `Description__c`
- Truncate to ~80 chars with ellipsis
- CSS: `line-clamp: 2; overflow: hidden; -webkit-line-clamp: 2;`

---

### Phase 2: Inline Description Editing (Board Card Quick-Edit)

**Goal:** Allow editing description directly from the board card (click-to-edit).

**Option A — Panel-based (recommended, lower complexity):**

- Current panel already works. Clicking a card opens the side panel with full rich-text editing.
- Enhancement: auto-scroll to the description field when card is opened from a "description" click.
- Add a small edit icon on the description snippet that opens the panel focused on description.

**Option B — Inline rich text (higher complexity, not recommended for MVP):**

- Would require a custom LWC wrapping `lightning-input-rich-text`
- Inline editing on the board card itself is complex (focus management, save/cancel, conflict detection)
- Better suited for a future phase

---

### Phase 3: Description in Backlog View

**Goal:** Show description content in the backlog table view.

**Files to modify:**

- `lwc/kanbanBacklogView/kanbanBacklogView.html` — Add expandable description row or tooltip
- `lwc/kanbanBacklogView/kanbanBacklogView.js` — Add description snippet logic
- `lwc/kanbanBacklogView/kanbanBacklogView.css` — Expandable row styles

**Implementation options:**

1. **Expandable row** — Click a chevron to expand a full-width row below the card showing rich description
2. **Tooltip/popover** — Hover over a description icon to see preview (lighter weight)
3. **Column** — Add a "Description" column with truncated text (simplest but cluttered)

**Recommended:** Expandable row — gives full rich-text preview without leaving the backlog.

---

### Phase 4: Tests

**Goal:** Unit test coverage for the new functionality.

**Files to create:**

- `lwc/kanbanCardPanel/__tests__/kanbanCardPanel.test.js`

**Test cases:**

1. `descriptionField` getter returns the correct field from `formFields`
2. `regularFields` getter excludes `Description__c`
3. `hasTemplate` returns `true` for known card types
4. `hasTemplate` returns `false` for null/unknown card types
5. `descriptionIsEmpty` returns `true` for null, empty string, HTML-only strings
6. `descriptionIsEmpty` returns `false` for strings with text content
7. `showApplyTemplate` returns `true` when card type has template and description field exists
8. `handleApplyTemplate` sets the `lightning-input-field` value to the correct template
9. Template content matches expected structure for each card type (Story, Bug, etc.)

**Existing test suite:**

- No existing tests for `kanbanCardPanel` — this is net new

---

### Phase 5: Polish & Edge Cases

1. **Template overwrite warning** — When description already has content, confirm before applying template
    - Add a confirmation step: "Description already has content. Replace with template?"
    - Simple boolean toggle like the existing `deleteConfirmState` pattern

2. **Card type change detection** — When user changes card type in the panel, update template availability
    - Wire up `onchange` on the `CardType__c` input field
    - Re-evaluate `hasTemplate` / `showApplyTemplate` reactively

3. **Empty state** — Show a subtle "No description" placeholder on board cards when description is blank
    - Use muted italic text: _"Add a description..."_

---

## Architecture Notes

### Data Flow (Current)

```
DB (Card__c.Description__c, Html type, 32K chars)
  → KanbanBoardSelector.getCardsByBoardId() [SOQL]
  → KanbanBoardDTO.convertCards() [DTO mapping → card.description]
  → LWC card data object
  → kanbanCardPanel: lightning-input-field (rich text editor)
  → Form submit → KanbanCardService.updateCard()
  → DB
```

### No Apex Changes Needed

- Description is already queried in `KanbanBoardSelector.cls` (lines 61, 99, 137)
- Already mapped in `KanbanBoardDTO.cls` (line 140)
- Already saved via `lightning-record-edit-form` submit
- All changes are LWC-only

### Key Constraints

- `Description__c` is an `Html` field type — must strip tags for plain-text preview
- 32K max length — truncation is essential for card previews
- Namespace `OpenSF__` required in LWC/Apex but NOT in metadata XML files
- Optimistic updates with conflict detection via `SequenceNumber__c` — description changes go through the same save path

---

## Priority Order

| Phase                         | Effort | Impact | Priority  |
| ----------------------------- | ------ | ------ | --------- |
| 1. Board card preview         | Small  | High   | Do first  |
| 4. Tests                      | Small  | Medium | Do second |
| 5. Polish (overwrite warning) | Small  | Medium | Do third  |
| 3. Backlog view               | Medium | Low    | Optional  |
| 2. Inline editing             | Large  | Low    | Future    |
