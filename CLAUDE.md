# CLAUDE.md — Project Instructions for Claude Code

For full project context, architecture, coding standards, and communication style, see [AGENTS.md](AGENTS.md).

## Namespace Warning

**CRITICAL: This is a namespaced scratch org (namespace: `OpenSF`). The namespace prefix is added AUTOMATICALLY during deployment.**

- **Metadata source files** (object XMLs, field XMLs, flows, flexipages, custom metadata, permission sets) must NEVER have the `OpenSF__` prefix in directory names, file names, `<fullName>`, `<referenceTo>`, or `<relationshipName>` values.
    - Correct: `objects/Sprint__c/fields/Status__c.field-meta.xml` with `<fullName>Status__c</fullName>`
    - Wrong: `objects/OpenSF__Sprint__c/fields/OpenSF__Status__c.field-meta.xml`

- **Apex code** (.cls, .trigger) DOES use the `OpenSF__` prefix when referencing SObjects and fields at runtime. This is correct — Apex uses the full namespaced API name.

- **LWC code** also uses `OpenSF__` prefix in field references (e.g., `OpenSF__Subject__c`). This is correct.

If you create new custom objects, custom fields, platform events, or any metadata — do NOT prefix them with `OpenSF__`.

## CLI Usage

Use `sf` directly to run Salesforce CLI commands. The SF CLI is available at `/opt/node22/bin/sf`.

For scratch org operations, set `SFDX_DISABLE_DNS_CHECK=true` if DNS resolution fails in CI or cloud environments.

## Code Style

- prettier-plugin-apex pinned to v2.1.5 (v2.2.6 breaks SOQL formatting and test class visibility)

## Type Safety

- Apex: Use `KanbanEnums` for all status values, event types, and column categories — never raw string literals
- Apex: Use `CardUpdateRequest.fromMap()` to convert `Map<String, Object>` to typed requests in service methods
- LWC: Add JSDoc `@type` annotations to `@api` properties and `@typedef` for event payloads
- E2E: TypeScript strict mode enabled via `e2e/tsconfig.json` — run `npm run type-check:e2e` to validate
