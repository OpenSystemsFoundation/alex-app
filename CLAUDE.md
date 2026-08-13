# CLAUDE.md — Entry Point for Claude Code

For the full type universe of agent instructions, see [AGENTS.md](AGENTS.md).

## CRITICAL: Namespace — OpenSF__

This is a namespaced scratch org (`OpenSF`). The prefix is added AUTOMATICALLY during deployment.

```
Metadata (XML, flows, flexipages):  NEVER prefix OpenSF__
Runtime (Apex, LWC, SOQL):         ALWAYS prefix OpenSF__
```

```
DO:  objects/Sprint__c/fields/Status__c.field-meta.xml    <fullName>Status__c</fullName>
NOT: objects/OpenSF__Sprint__c/fields/OpenSF__Status__c.field-meta.xml

DO:  OpenSF__Sprint__c sprint = [SELECT OpenSF__Status__c FROM OpenSF__Sprint__c];
DO:  import STATUS from '@salesforce/schema/OpenSF__Sprint__c.OpenSF__Status__c';
```

## Type Safety

- Apex: Use `KanbanEnums` for all status values, event types, column categories — never string literals
- Apex: Use `CardUpdateRequest.fromMap()` to convert `Map<String, Object>` to typed requests
- LWC: JSDoc `@type` on `@api` properties, `@typedef` for event payloads
- E2E: TypeScript strict mode — run `npm run type-check:e2e` to validate

## API v67 & Security (see AGENTS.md for the full list)

- All metadata is API **67.0** — `WITH SECURITY_ENFORCED` no longer compiles; use `WITH USER_MODE`
- User-initiated DML: `stripInaccessible` + `Database.<op>(..., AccessLevel.USER_MODE)`
- Never re-send a non-reparentable master-detail field on `update` (breaks tests in namespaced orgs)
- LWC confirmations: `lightning/confirm`, never `window.confirm`

## CLI

Use `sf` directly (`/opt/node22/bin/sf`). Set `SFDX_DISABLE_DNS_CHECK=true` if DNS fails.

## Code Style

- prettier-plugin-apex pinned to v2.1.5 (v2.2.6 breaks SOQL formatting)

## E2E Debug Loop (C→K Conjunction)

```
1. Write/update tests in e2e/specs/
2. Push to claude/* branch → triggers chromium-e2e-debug.yml
3. Read results: gh api repos/OpenSystemsFoundation/alex-app/commits/$(git rev-parse HEAD)/comments --jq '.[].body'
4. Fix bugs found
5. Repeat until tests pass (concept collapses into knowledge)
```
