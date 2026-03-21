# Subtask Implementation — Exploration & Design

**Date:** 2026-03-21
**Status:** Exploration
**Author:** Jeff Kroon / Claude (pair)

## Context

The Alex kanban board currently supports a flat card hierarchy with one exception: Epics. An Epic is a Card whose `CardType__c = 'Epic'`, and other cards reference it via a `Card__c.Epic__c` lookup. A denormalized `EpicCardsCount__c` field and a validation rule (`CannotChangeEpicType`) protect the relationship.

We want to explore adding **subtasks** — lightweight child items that live beneath a parent card — to support breaking work into smaller pieces without leaving the board.

## Why Not Standard Salesforce Tasks?

Using the standard `Task` (Activity) object was considered and rejected for the following reasons:

1. **Schema mismatch** — Standard Task uses polymorphic `WhatId`/`WhoId` and participates in the Activity timeline. It does not fit the Card-centric data model.
2. **No custom ordering** — We cannot add `LexoRankPosition__c` to standard Task in a way that integrates with drag-and-drop reordering.
3. **No real-time sync** — Our board relies on `CardUpdateEvent__e` with echo prevention (`LastClientRequestId__c` / `LastClientId__c`). Standard Tasks do not participate in this event flow.
4. **Query complexity** — Mixing Activity queries (`SELECT ... FROM Task WHERE WhatId = ...`) with Card selectors would complicate the DTO and selector layers significantly.
5. **Namespace constraints** — Standard Task fields cannot be namespaced consistently with the rest of the `OpenSF` package.

## Recommended Approach: Self-Referential Lookup on Card__c

Follow the existing **Epic → Card** pattern. Subtasks are just Cards whose `CardType__c = 'Subtask'` with a lookup to their parent Card.

### New Fields on Card__c

| Field API Name             | Type                  | Purpose                                         |
|----------------------------|-----------------------|-------------------------------------------------|
| `ParentCard__c`            | Lookup(Card__c)       | Points to the parent card                       |
| `SubtaskCount__c`          | Number(3,0)           | Denormalized count of child cards               |
| `CompletedSubtaskCount__c` | Number(3,0)           | Denormalized count of completed child cards     |

> Per namespace rules: metadata files must **not** include the `OpenSF__` prefix. Apex and LWC runtime references **do** use the prefix.

### Validation Rules

| Rule Name                       | Condition                                                              | Message                                          |
|---------------------------------|------------------------------------------------------------------------|--------------------------------------------------|
| `CannotNestSubtasks`            | `ParentCard__c != null AND ParentCard__r.ParentCard__c != null`        | Subtasks cannot have subtasks (max 2-level depth) |
| `CannotChangeTypeIfSubtasks`    | `SubtaskCount__c > 0 AND CardType__c != PRIORVALUE(CardType__c)`      | Cannot change type when card has subtasks         |
| `SubtaskMustShareBoard`         | `ParentCard__c != null AND Column__r.Board__c != ParentCard__r.Column__r.Board__c` | Subtask must belong to the same board as parent   |

### Trigger Logic (CardTriggerHandler)

On Card insert / update / delete / undelete:

- If `ParentCard__c` is populated, recalculate the parent's `SubtaskCount__c` and `CompletedSubtaskCount__c` via a rollup query.
- Publish `CardUpdateEvent__e` for real-time sync (existing pattern).

### Apex Changes

| Layer              | File                        | Changes                                                  |
|--------------------|-----------------------------|----------------------------------------------------------|
| **DTO**            | `KanbanBoardDTO.cls`        | Add `subtaskCount`, `completedSubtaskCount`, `parentCardId`, optional `subtasks` list to `CardDTO` |
| **Selector**       | `KanbanBoardSelector.cls`   | Add `getSubtasksByParentId(Id parentCardId)` method      |
| **Service**        | `KanbanCardService.cls`     | Add `createSubtask`, handle subtask-specific move logic  |
| **Trigger**        | `CardTriggerHandler.cls`    | Rollup subtask counts to parent on DML                   |

### Frontend Changes (LWC)

| Area                  | Component                | Changes                                                      |
|-----------------------|--------------------------|--------------------------------------------------------------|
| **Board view**        | `kanbanBoard` / `kanbanCard` | Show progress indicator on parent cards (e.g., "3/5")     |
| **Card detail panel** | `kanbanCardPanel`        | Add subtask section — list, create, inline edit              |
| **Store**             | `kanbanStore`            | Add `parentCardId`, `subtaskCount`, `subtasks` to card state |
| **Reducers**          | `kanbanStore/state/reducers` | Handle subtask CRUD actions                              |

### Sprint Considerations

- Subtasks inherit sprint membership through their parent's `SprintCard__c` junction record (subtasks are not independently assigned to sprints).
- `CompletedSubtaskCount__c` can optionally feed into burndown/velocity reporting later.

## Out of Scope (for now)

- Subtask-level story points (points stay on the parent card)
- Cross-board subtask linking
- Subtask-specific swimlanes or columns
- Keyboard shortcut for quick subtask creation

## Summary

The self-referential lookup pattern is the simplest path. It reuses the Epic relationship pattern already in the codebase, requires no new objects, and slots cleanly into the existing DTO / selector / trigger / platform-event architecture.
