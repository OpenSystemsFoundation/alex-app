# Custom Instructions for GitHub Copilot

See [AGENTS.md](../AGENTS.md) for complete project instructions.

## Environment

You have access to:

- **Salesforce CLI (`sf`)** — Deploy, test, create scratch orgs, run Apex
- **Playwright MCP** — Control a headless Chromium browser to visually test the app
- **Node.js 22** with all project dependencies installed

## Salesforce CLI Cheat Sheet

```bash
# Create a scratch org
sf org create scratch --definition-file config/project-scratch-def.json --alias my-org --duration-days 1 --wait 10

# Deploy source code
sf project deploy start --target-org my-org --ignore-conflicts

# Assign permission set (required for app access)
sf org assign permset --name Alex_Admin --target-org my-org

# Run Apex tests
sf apex run test --target-org my-org --test-level RunLocalTests --result-format human --code-coverage

# Get a login URL for browser testing
sf org open --target-org my-org --url-only

# Run anonymous Apex
sf apex run --file scripts/apex/CreateBoard.apex --target-org my-org

# Delete a scratch org
sf org delete scratch --target-org my-org --no-prompt
```

## Dynamic Testing with Playwright MCP

You have a Playwright MCP server available. Use it to:

1. Get a scratch org login URL via `sf org open --target-org <alias> --url-only`
2. Navigate to the login URL in the browser
3. Navigate to the app at `/lightning/n/OpenSF__Alex`
4. Interact with the kanban board — create cards, drag columns, verify UI state

## Testing Workflow

When making changes, follow this flow:

1. **Deploy** your changes to a scratch org with `sf project deploy start`
2. **Run Apex tests** with `sf apex run test` to verify server-side logic
3. **Run LWC unit tests** with `npm run test:unit`
4. **Run E2E tests** with the Playwright MCP browser to verify the UI works end-to-end
5. **Report results** — summarize what passed/failed

## Namespace

This is a namespaced package (`OpenSF`). In metadata XML files, do NOT use the `OpenSF__` prefix. In Apex and LWC code, DO use `OpenSF__` for SObject/field references.
