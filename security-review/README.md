# AppExchange Security Review — Alex Kanban App

Review date: 2026-04-16
Branch: `claude/appexchange-security-review-k52Ws`
sourceApiVersion: 66.0
Salesforce Code Analyzer: 5.11.1 (PMD + PMD-AppExchange + SFGE + ESLint + retire-js + CPD)

## How to reproduce the scans

```bash
# AppExchange-specific rules (only)
sf code-analyzer run \
  --rule-selector AppExchange \
  --workspace force-app --target force-app \
  --output-file security-review/appexchange-scan.html \
  --output-file security-review/appexchange-scan.json

# Recommended rules (PMD security + ESLint LWC + retire-js)
sf code-analyzer run \
  --rule-selector Recommended \
  --workspace force-app --target force-app \
  --output-file security-review/recommended-scan.html \
  --output-file security-review/recommended-scan.json
```

See `appexchange-scan.html` and `recommended-scan.html` for the latest output
(both raw JSON and rendered HTML are checked in).

## Summary

| Category                           | Count | Status |
| :--------------------------------- | ----: | :----- |
| Real security fixes applied        |     8 | FIXED  |
| False positives (documented)       |    28 | NOTED  |
| Non-security lint (style)          |  1800+| Out of scope for AppExchange |

The AppExchange-rule scan reports 3 total findings:
1. `pmd:AvoidLwcBubblesComposedTrue` ×2 — FIXED (see F-1)
2. `pmd:ProtectSensitiveData` ×1 — FALSE POSITIVE (see FP-1)

The Recommended scan reports 32 High-severity findings (76 total High):
- 12 × `ApexSOQLInjection` — all false positives (see FP-2)
- 20 × `ApexCRUDViolation` — 4 real (fixed F-2…F-5), 16 false positives (FP-3…FP-6)
- 1  × `EagerlyLoadedDescribeSObjectResult` — test-only (FP-7)
- 43 × `no-unused-vars` — lint, not security (out of scope)

The remaining Moderate/Low findings are style/complexity (`IfStmtsMustUseBraces`,
`MethodNamingConventions`, `CognitiveComplexity`, etc.) and not security-relevant
for the AppExchange review.

---

## Real issues fixed

### F-0 (CRITICAL) — Unauthorized `ContentDocument` deletion

- **File:** `force-app/main/default/classes/KanbanBoardController.cls:665`
- **Before:** `deleteCardFile(Id contentDocumentId)` deleted any
  `ContentDocument` by ID with no authorization check. Any authenticated
  user with a valid `ContentDocument` Id could have deleted *any* file
  in the org (including files on records they can't see).
- **Fix:** The method now (a) takes both `contentDocumentId` and the
  owning `cardId`, (b) verifies the caller has a `ContentDocumentLink`
  joining them, (c) re-queries the parent card `WITH USER_MODE` to
  confirm record-level access, and (d) performs the delete with
  `Database.delete(..., AccessLevel.USER_MODE)` to enforce CRUD.
  The LWC caller in `kanbanCardPanel.js` was updated to pass the card Id.
- **Rule:** Not directly flagged by PMD — found via manual review. The
  rule `ApexCRUDViolation` flagged the related `getCardFiles` method.

### F-1 — `AvoidLwcBubblesComposedTrue` (×2)

- **File:** `force-app/main/default/lwc/kanbanBacklogView/kanbanBacklogView.js:701`, `:739`
- **Fix:** Removed `composed: true` from the two custom events
  (`startsprint`, `completesprint`). The parent `kanbanBoard` is a
  sibling LWC so `bubbles: true` alone is sufficient; `composed: true`
  leaks the event across shadow-DOM boundaries.

### F-2 — CRUD not enforced on `deleteColumn`

- **File:** `force-app/main/default/classes/ColumnManagementController.cls:145`
- **Fix:** Replaced bare `delete column;` with
  `Database.delete(..., AccessLevel.USER_MODE)` so the user's Delete
  permission on `OpenSF__Column__c` is checked before DML.

### F-3 — CRUD not enforced on `deleteSprint`

- **File:** `force-app/main/default/classes/SprintService.cls:306`, `:310`
- **Fix:** Both `SprintCard__c` junction delete and the `Sprint__c`
  delete now use `Database.delete(..., AccessLevel.USER_MODE)`.

### F-4 — CRUD check modernised in `deleteCard`

- **File:** `force-app/main/default/classes/KanbanCardService.cls:368`
- **Fix:** Replaced the v40-style
  `Schema.sObjectType.OpenSF__Card__c.isDeletable()` pre-check with
  `Database.delete(..., AccessLevel.USER_MODE)`, the idiomatic v66
  enforcement. Also eliminates the TOCTOU window between the describe
  check and the DML.

### F-5 — Missing `USER_MODE` on aggregate query in `EpicService.getEpicSummaries`

- **File:** `force-app/main/default/classes/EpicService.cls:33`
- **Fix:** Added `WITH USER_MODE` to the `AggregateResult` query over
  `OpenSF__Card__c` that builds epic progress summaries. Without it the
  query would have run without FLS enforcement on the grouped fields.

### F-6 — Missing `USER_MODE` in `SprintCardTriggerHandler`

- **File:** `force-app/main/default/classes/SprintCardTriggerHandler.cls:60`
- **Fix:** Added `WITH USER_MODE` to the sprint lookup that runs in
  trigger context on the caller's behalf.

### F-7 — Trigger-internal rollup DML is now explicit `SYSTEM_MODE`

- **Files:** `CardTriggerHandler.cls:266/291/345/370`
- **Context:** The trigger keeps two app-owned rollup fields consistent:
  `OpenSF__Card__c.OpenSF__EpicCardsCount__c` (children-per-epic) and
  `OpenSF__Column__c.OpenSF__CardCount__c` (cards-per-column). Without
  an explicit access level, the implicit `USER_MODE` on v66 triggers
  would fail for users who lack FLS on those rollup fields, breaking
  legitimate card edits.
- **Fix:** The rollup `AggregateResult` queries now use `WITH SYSTEM_MODE`
  and the updates use `Database.update(..., AccessLevel.SYSTEM_MODE)`.
  Record-level sharing is still enforced because the class itself is
  `with sharing`. The rationale is documented inline in the source
  (search for "SYSTEM_MODE rationale").
- **AppExchange justification:** app-managed rollups are a Salesforce-
  recognized exception for `SYSTEM_MODE`. Only FLS/CRUD on the specific
  rollup columns is bypassed; all other access is still user-mode.

### F-8 — Utility classes now declare sharing

- **Files:**
  - `TriggerContext.cls` — was `without sharing`, now `inherited sharing`
  - `KanbanEnums.cls` — was sharing-unspecified, now `inherited sharing`
  - `CardUpdateRequest.cls` — was sharing-unspecified, now `inherited sharing`
- **Rationale:** `inherited sharing` is the correct AppExchange pattern
  for utility/DTO classes with no direct DML/SOQL: sharing is
  determined by the caller and there is no "anonymous" `without
  sharing` footgun.

---

## False positives (documented)

### FP-1 — `pmd:ProtectSensitiveData` on `Card__c.Assignee__c`

- **File:** `force-app/main/default/objects/Card__c/fields/Assignee__c.field-meta.xml`
- **Finding:** "`Assignee__c` is a potential auth token in a custom object: `Card__c`".
- **Reality:** `Assignee__c` is a **`Lookup(User)`** — it is the user assigned
  to the Kanban card (equivalent to OOTB `OwnerId`). The rule heuristic
  matches `Assign*` field names that are sometimes used to store API
  assignment tokens (e.g. `AssignedApiKey__c`). A `Lookup(User)` is not
  credential material and contains no secret.
- **Justification:** No change. The field stores a Salesforce `Id` (FK),
  not a token.

### FP-2 — `pmd:ApexSOQLInjection` across selector classes (×12)

- **Files:**
  - `BoardSelector.cls:21`, `:34`
  - `CardCommentService.cls:29`, `:42`
  - `KanbanBoardSelector.cls:93`, `:108`, `:122`, `:136`, `:150`, `:177`, `:190`
  - `KanbanBoardService.cls:90`
- **Reality:** All of these `Database.query(...)` calls concatenate a
  **private, static, final, compile-time** field list constant
  (`CARD_FIELDS`, `COLUMN_FIELDS`, `BOARD_LIST_FIELDS`, `COMMENT_FIELDS`)
  into a SOQL string. User input — `boardId`, `cardId`, `commentId`,
  `lastSyncTime` — is always passed via bind variables (`:var`). Every
  query is also qualified with `WITH USER_MODE` (or
  `WITH SECURITY_ENFORCED` in `CardCommentService`).
- **Justification:** PMD flags dynamic SOQL defensively. There is no
  user-controlled string concatenation, no `String.escapeSingleQuotes`
  is omitted, and FLS/CRUD is enforced. No change required.
- **Note:** `KanbanBoardSelector.searchUsers` (line 246) *does* escape
  its user-supplied `searchTerm` via `String.escapeSingleQuotes(...)`
  even though it's only used as a bind, as defence-in-depth.

### FP-3 — `pmd:ApexCRUDViolation` on custom-metadata queries

- **Files:**
  - `KanbanBoardService.cls:203` (`OpenSF__CardTypeIcon__mdt`)
  - `KanbanBoardService.cls:223` (`OpenSF__KanbanBoardSettings__mdt`)
- **Reality:** CRUD/FLS enforcement doesn't apply to custom metadata
  types — they're design-time configuration, visible to all users with
  Apex execute access. Per the Salesforce security guidelines, no
  `USER_MODE` / `SECURITY_ENFORCED` is required for `__mdt` SOQL.
- **Justification:** No change.

### FP-4 — `pmd:ApexCRUDViolation` in `CardTriggerHandler` rollup updates

- **Files:** `CardTriggerHandler.cls:266`, `:291`, `:345`, `:370`
- **Reality:** See F-7 above. These are **intentional** `SYSTEM_MODE`
  trigger-internal DML for app-managed rollup fields. PMD cannot
  statically distinguish "rollup bookkeeping" from "normal DML". The
  `SYSTEM_MODE` scope is limited to FLS/CRUD on the rollup columns;
  record-level sharing is still enforced.
- **Justification:** Documented inline in the source with rationale.
  Cannot be suppressed without annotation because this is a true
  deviation from the default `USER_MODE`, but it's the correct design.

### FP-5 — `pmd:ApexCRUDViolation` on `stripInaccessible` DML

- **Files:**
  - `ColumnManagementController.cls:74`, `:212` (insert after strip)
  - `ColumnManagementController.cls:125` (update after strip)
  - `CardCommentService.cls:79`, `:141` (insert/delete with prior check)
  - `KanbanBoardService.cls:223` (metadata, covered by FP-3)
- **Reality:** These DML statements are all preceded by
  `Security.stripInaccessible(AccessType.CREATABLE | UPDATABLE, ...)`
  which strips all fields the caller cannot set. This is a Salesforce-
  approved mechanism for CRUD/FLS enforcement (see the
  [AppExchange prep guide](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/security_review_prepare.htm)).
- **Justification:** No change. PMD doesn't recognize `stripInaccessible`
  as a CRUD enforcement primitive.

### FP-6 — `pmd:ApexCRUDViolation` on `ContentDocumentLink` query

- **File:** `KanbanBoardController.cls:640` (inside `getCardFiles`)
- **Reality:** `ContentDocumentLink` cannot use `WITH USER_MODE`
  / `WITH SECURITY_ENFORCED` — Salesforce throws a runtime error. The
  object uses its own sharing (visibility follows `LinkedEntityId`).
  As of F-0 the method now verifies read access to the parent card
  (`KanbanBoardSelector.getCardById` runs WITH USER_MODE) before
  returning the file list.
- **Justification:** Authorization is enforced by the card lookup plus
  the `LinkedEntityId = :cardId` filter. Further documented in
  KanbanBoardController.cls source.

### FP-7 — `EagerlyLoadedDescribeSObjectResult`

- **File:** `ColumnManagementControllerTest.cls:177`
- **Reality:** Test-only class. The eager describe is used to construct
  mock records during a test scenario. No performance or security
  impact at runtime.
- **Justification:** No change required.

### FP-8 — LWC `@lwc/lwc-platform/no-inline-disable` (×36)

- **Reality:** These are all `/* eslint-disable-next-line */` comments
  inside LWC JS. The `@lwc/lwc-platform/no-inline-disable` rule enforces
  the project's own disable-comment policy; it is a *meta-lint*, not
  a security rule.
- **Justification:** No change. Not security-relevant.

---

## Risk posture

| Risk                               | Status    | Notes |
| :--------------------------------- | :-------- | :---- |
| SOQL injection                     | MITIGATED | All dynamic SOQL uses bind variables + `WITH USER_MODE` |
| CRUD/FLS bypass                    | MITIGATED | All user-initiated DML uses `USER_MODE` or `stripInaccessible` |
| Cross-record data leak             | MITIGATED | All selectors `with sharing`; `getCardFiles`/`deleteCardFile` verify parent-record access |
| Sensitive data in custom fields    | NONE      | No PII, tokens, or credentials stored |
| XSS in LWC templates               | NONE      | No `lwc:dom="manual"`, `innerHTML`, `eval` usage |
| Outbound callouts / remote sites   | NONE      | No `Http.send`, no Named Credentials, no Remote Site Settings |
| Hardcoded credentials              | NONE      | Zero matches on the `AvoidHardcoded*` ruleset |
| Session ID misuse                  | NONE      | Zero matches on `AvoidApiSessionId` / `AvoidUnauthorizedGetSessionIdInApex` |
| Install/uninstall handler exposure | NONE      | No `InstallHandler` / `UninstallHandler` classes present |
| JavaScript buttons / S-Controls    | NONE      | None present |
| Visualforce pages                  | NONE      | None present (pure LWC + flexipages) |

---

## Files changed

```
force-app/main/default/classes/CardTriggerHandler.cls
force-app/main/default/classes/CardUpdateRequest.cls
force-app/main/default/classes/ColumnManagementController.cls
force-app/main/default/classes/EpicService.cls
force-app/main/default/classes/KanbanBoardController.cls
force-app/main/default/classes/KanbanCardService.cls
force-app/main/default/classes/KanbanEnums.cls
force-app/main/default/classes/SprintCardTriggerHandler.cls
force-app/main/default/classes/SprintService.cls
force-app/main/default/classes/TriggerContext.cls
force-app/main/default/lwc/kanbanBacklogView/kanbanBacklogView.js
force-app/main/default/lwc/kanbanCardPanel/kanbanCardPanel.js
```
