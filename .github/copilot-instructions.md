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

# Create sample board data
sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org my-org

# Run Apex tests
sf apex run test --target-org my-org --test-level RunLocalTests --result-format human --code-coverage

# Get a login URL for browser testing (one-time use)
sf org open --target-org my-org --url-only

# Delete a scratch org
sf org delete scratch --target-org my-org --no-prompt
```

## Interactive PR Testing with Playwright MCP

You have a Playwright MCP server that gives you a headless Chromium browser. When reviewing or testing a PR that changes LWC components, use this flow:

### 1. Set up a scratch org with the PR code

```bash
sf org create scratch --definition-file config/project-scratch-def.json --alias pr-test --duration-days 1 --wait 10
sf project deploy start --target-org pr-test --ignore-conflicts
sf org assign permset --name Alex_Admin --target-org pr-test
sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org pr-test
```

### 2. Get a login URL and open the app in the browser

```bash
sf org open --target-org pr-test --url-only
```

Use the Playwright MCP to navigate to the returned URL, then go to the board:

- Login URL → authenticates the session
- Navigate to `/lightning/r/OpenSF__Board__c/<boardId>/view` to see the kanban board
- Or navigate to the Boards list at `/lightning/o/OpenSF__Board__c/list`

### 3. Verify the UI based on what changed

- **LWC template changes** → verify the component renders correctly, check layout
- **CSS changes** → check visual appearance, spacing, colors
- **JS logic changes** → interact with the board (click, drag, type) and verify behavior
- **Apex changes** → verify data loads correctly, test CRUD operations via the UI

### 4. Run the E2E test suite

```bash
SCRATCH_ORG_URL="<login-url>" npx playwright test --project=chromium --retries=0 --grep-invert="Visual Regression"
```

### 5. Clean up

```bash
sf org delete scratch --target-org pr-test --no-prompt
```

### 6. Report findings

Comment on the PR with:

- Screenshots of the UI (if relevant)
- E2E test results
- Any issues found

## Key UI elements for testing

The kanban board uses these data attributes for reliable selectors:

- `data-card-id` — on card articles and card name links
- `data-column-id` — on columns and column wrappers
- `data-tab-id` — on tab buttons ("board", "backlog")
- `.kanban-board-wrapper` — the main board container
- `.kanban-column` — individual columns
- `article.kanban-card` — card elements
- `.board-filter-search` — search input
- `.add-card-button` — add card buttons per column

## Namespace

This is a namespaced package (`OpenSF`). In metadata XML files, do NOT use the `OpenSF__` prefix. In Apex and LWC code, DO use `OpenSF__` for SObject/field references.
