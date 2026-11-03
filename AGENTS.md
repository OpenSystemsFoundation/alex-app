# AGENTS.md

Instructions for AI coding agents (and humans) working in this repository.
Architecture details live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project

**Alex** is a real-time, collaborative Kanban and sprint board built natively
on Salesforce: LWC front end with a Redux-style store, Apex back end, Platform
Events for live sync, LexoRank ordering. Distributed as a managed 2GP package
with namespace `OpenSF`.

```
force-app/main/default/   Salesforce source (Apex, LWC, objects, permission sets, ...)
e2e/                      Playwright E2E tests (TypeScript, strict)
scripts/apex/             Anonymous Apex for sample/test data
config/                   Scratch org definitions
docs/                     Architecture, quick start, user guide
```

## Commands

| Task | Command |
| :--- | :--- |
| Install | `npm ci` |
| Format / check | `npm run prettier` / `npm run prettier:verify` |
| Lint | `npm run lint` |
| LWC unit tests | `npm run test:unit` |
| E2E type-check | `npm run type-check:e2e` |
| Deploy to default org | `npm run deploy` |
| Apex tests (default org) | `npm run test:apex` |
| E2E (scratch org) | `npm run test:e2e` — see [E2E tests](#e2e-tests) |

## Rules

### 1. Namespace `OpenSF__`

The prefix is added automatically on deploy.

- **Metadata source** (XML, directory and file names, `<fullName>`,
  `<referenceTo>`, flows, flexipages, permission sets): **never** prefix.
- **Runtime code** (Apex, SOQL, LWC JavaScript, `@salesforce/schema` imports):
  **always** prefix.

```
DO:  objects/Sprint__c/fields/Status__c.field-meta.xml  →  <fullName>Status__c</fullName>
DO:  [SELECT OpenSF__Status__c FROM OpenSF__Sprint__c]
DO:  import STATUS from '@salesforce/schema/OpenSF__Sprint__c.OpenSF__Status__c';
```

Prefixed metadata deploys as "Unchanged" and the component is never created.

### 2. Security (API 67.0)

- All metadata stays on API **67.0**.
- SOQL: `WITH USER_MODE` (`WITH SECURITY_ENFORCED` doesn't compile at v67).
  Exceptions: `__mdt` queries and `ContentDocumentLink` (enforce access via the parent record).
- User-initiated DML: `Security.stripInaccessible(...)` **and**
  `Database.<op>(..., AccessLevel.USER_MODE)`.
- System-mode bookkeeping (rollups, column history) only with an inline
  `SYSTEM_MODE rationale` comment.
- Every class declares sharing (`with sharing`; `inherited sharing` for utilities/DTOs).
- `Metadata.Operations` calls require the `ManageCardFields` custom permission.
- On `update`, never re-send a non-reparentable master-detail field — send `Id` plus changed fields only.
- LWC confirmations use `lightning/confirm`, never `window.confirm`. No `innerHTML`.

### 3. Types

- Status values, event types, column categories: `KanbanEnums`, never string literals.
- `Map<String, Object>` from LWC → `CardUpdateRequest.fromMap()` before the service layer.
- LWC: JSDoc `@type` on `@api` properties, `@typedef` for event payloads.

### 4. Public repository

This repo is public. Never commit org usernames or emails, auth/frontdoor
URLs, access tokens, scan reports, or maintainer/business notes. Keep local
material in the gitignored `.claude/` folder.

## Architecture

**Apex:** `Controller (@AuraEnabled) → Service → Selector (SOQL) → DTO`.
No SOQL in controllers, no business logic in selectors. Trigger handlers
extend `TriggerHandler` and publish `CardUpdateEvent__e`,
`ColumnUpdateEvent__e`, `SprintUpdateEvent__e`.

**LWC:** all state changes go through the `kanbanStore`
(actions → pure reducers → selectors; side effects in thunks; state frozen).

**Real-time flow:**

```
user action → thunk → Apex → DML → trigger → Platform Event
→ every client's subscriptionManager → echo check (clientRequestId) → store → re-render
```

Key components: `kanbanBoard` (container), `kanbanStore`, `subscriptionManager`,
`kanbanCardPanel`, `kanbanBacklogView`, `kanbanFilterBar`, sprint components
(`kanbanSprint*`), `kanbanAnalytics`, `adminManagement`, `columnManagement`.

## Testing

- **Apex:** test class next to the class (`SprintServiceTest.cls`); assert
  exact values, cover bulk (200+ records) and permission scenarios. Coverage ≥ 75%.
- **Jest:** specs in `lwc/**/__tests__/`; every test asserts something.
- **E2E:** see below. Both app shells matter: `Alex` (standard) and `Alex Console`.
- Run the relevant tests yourself while working; don't ask first.

### E2E tests

Run locally against a scratch org — never in CI.

```bash
sf org create scratch -f config/project-scratch-def.json -a e2e-test -y 7
sf project deploy start -o e2e-test
sf org assign permset -n Alex_Admin -o e2e-test
export SF_TARGET_ORG=e2e-test
export SCRATCH_ORG_URL="$(sf org open -o e2e-test --url-only)"
npx playwright test e2e/specs/<suite>.spec.ts --project=chromium
```

- Never land a Playwright change you haven't run against a real org.
- No `isVisible().catch(() => false)` / `if (visible)` guards around assertions — they hide failures.
- In a namespaced org, component tags render as `opensf-…`, not `c-…`; prefer role and `data-*` locators.
- Don't refresh the page to make a real-time sync test pass.

## CI

`.github/workflows/ci.yml` runs static checks only: Prettier, ESLint, E2E
type-check, Jest, Salesforce Code Analyzer v5 (AppExchange rules gate), and
`npm audit`. Do not add workflows that create orgs or need secrets.

## Conventions

- **Commits / PR titles:** Conventional Commits — `feat:`, `fix:`, `perf:`,
  `refactor:`, `test:`, `docs:`, `chore:`, `ci:`; `!` for breaking changes.
- **Formatting:** Prettier. `prettier-plugin-apex` is pinned to **2.1.5** —
  newer versions rewrite SOQL and test-class visibility.
- **Docs:** don't add documentation files unless asked.
- **Releases:** maintainers only, done locally (beta → test install → promote).
