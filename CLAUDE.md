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

## Dynamic E2E Debugging (AI-Assisted Development Loop)

This project uses an AI-driven E2E testing feedback loop:

1. **Write tests** — Create/update E2E specs in `e2e/specs/` based on git log of recent features
2. **Push to `claude/*` branch** — Triggers the `chromium-e2e-debug.yml` GitHub Action automatically
3. **Read results via `gh` CLI** — Use `gh api repos/OWNER/REPO/commits/SHA/comments` to read test output posted as commit comments
4. **Fix bugs found** — Update app code or test code based on failures
5. **Repeat** — Push again, the action re-runs, read new results

### Key Commands
```bash
# Read commit comments (test results) after push
gh api repos/OpenSystemsFoundation/alex-app/commits/$(git rev-parse HEAD)/comments --jq '.[].body'

# Check workflow run status
gh run list --workflow=chromium-e2e-debug.yml --limit=3

# View specific run output
gh run view <run-id> --log
```

### Test Categories
- **Happy paths** — Core feature flows (board, backlog, filters, drag-drop, card panel)
- **Unhappy paths** — Rapid actions, stale data, special characters, concurrent edits
- **Feature tests** — Admin management, sprint lifecycle, analytics, retro, planning poker
- **Multi-user tests** — Real-time sync between two browser contexts (requires `USER_A_LOGIN_URL` + `USER_B_LOGIN_URL`)
