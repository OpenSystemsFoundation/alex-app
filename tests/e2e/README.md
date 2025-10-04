# E2E Testing with Playwright & Salesforce Scratch Orgs

This directory contains end-to-end (E2E) tests for the Kanban Board application using [Playwright](https://playwright.dev/) with TypeScript and Salesforce scratch orgs.

## 📁 Project Structure

```
tests/e2e/
├── fixtures/
│   └── test-fixtures-scratch.ts  # Custom fixtures with scratch org integration
├── helpers/
│   ├── salesforce-cli.ts         # SF CLI wrapper for org management
│   └── test-data-scratch.ts      # Test data generators
├── pages/
│   ├── KanbanBoardPage.ts        # Page Object Model for Kanban Board
│   └── SalesforceLoginPage.ts    # POM for Salesforce authentication
├── specs/
│   ├── add-card.spec.ts          # Tests for adding cards
│   ├── delete-card.spec.ts       # Tests for deleting cards via modal
│   ├── update-card.spec.ts       # Tests for updating card subject
│   ├── drag-card-to-column.spec.ts   # Tests for dragging cards between columns
│   └── drag-card-within-column.spec.ts # Tests for reordering cards
├── global-setup-scratch.ts       # Creates/reuses scratch org before tests
├── global-teardown.ts            # Cleans up test data after tests
└── .auth/                        # Stored authentication state (git-ignored)
```

## 🏗️ Architecture

### Scratch Org Testing Strategy

Tests use Salesforce scratch orgs for isolated, reproducible test environments:

- **Org Reuse**: When `PLAYWRIGHT_DEBUG_MODE=true`, the scratch org is reused across test runs (saves 2-3 minutes per run)
- **Fresh Data**: A new test board is created for each test run and cleaned up afterward
- **Zero Config**: No need to manually set up Salesforce credentials or board IDs

### Page Object Model (POM)

- **`KanbanBoardPage.ts`**: Encapsulates all Kanban board interactions (add, drag, update, delete)
- **`SalesforceLoginPage.ts`**: Handles Salesforce authentication workflows

### Test Organization

Each test file focuses on a single feature with simple, UI-based workflows:

- **add-card.spec.ts**: Click add button → verify card created
- **delete-card.spec.ts**: Add card → open modal → delete → confirm deletion
- **update-card.spec.ts**: Add card → open modal → update subject → save → verify
- **drag-card-to-column.spec.ts**: Add card → drag between columns → verify movement
- **drag-card-within-column.spec.ts**: Add cards → reorder within column → verify order

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Salesforce CLI** - Install from https://developer.salesforce.com/tools/sf cxcli
3. **Dev Hub** - Enabled in your Salesforce org

### Installation

```powershell
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Dev Hub Setup

1. Enable Dev Hub in your Salesforce org:
    - Setup → Dev Hub → Enable

2. Authenticate with Dev Hub:

    ```powershell
    sf org login web --set-default-dev-hub
    ```

3. Create `.env` file (optional - for debug mode):
    ```env
    PLAYWRIGHT_DEBUG_MODE=true
    ```

## 🧪 Running Tests

### Run All Tests (With Org Reuse)

```powershell
# Set debug mode to reuse scratch org
$env:PLAYWRIGHT_DEBUG_MODE="true"
npx playwright test --config=playwright.config.scratch.ts --project=chromium
```

### Run Specific Test

```powershell
# Run add card tests
npx playwright test tests/e2e/specs/add-card.spec.ts --config=playwright.config.scratch.ts --project=chromium

# Run delete tests
npx playwright test tests/e2e/specs/delete-card.spec.ts --config=playwright.config.scratch.ts --project=chromium
```

### Run Without Org Reuse (Fresh Org Each Time)

```powershell
npx playwright test --config=playwright.config.scratch.ts --project=chromium
```

### Debug Mode

```powershell
# Run with visible browser
npx playwright test --config=playwright.config.scratch.ts --project=chromium --headed

# Run in debug mode with pause
npx playwright test tests/e2e/specs/add-card.spec.ts --config=playwright.config.scratch.ts --debug
```

## 🔄 Org Reuse Benefits

When `PLAYWRIGHT_DEBUG_MODE=true`:

- ✅ **Scratch org is reused** across test runs
- ✅ **Test board is created fresh** each run
- ✅ **All test data is cleaned up** after tests complete
- ✅ **Saves 2-3 minutes** per test run (no org creation time)

Teardown behavior:

```
🗑️  Cleaning up test data...
✅ Test board and related data deleted successfully

🔄 PLAYWRIGHT_DEBUG_MODE is set, preserving scratch org
Board was deleted - a new board will be created on next test run
```

## 📊 Test Reports

View HTML report after tests:

```powershell
npx playwright show-report
```

Report includes:

- Pass/fail status for each test
- Screenshots on failure
- Video recordings
- Execution traces

## ✅ Current Test Coverage

| Test File                         | Tests | Description                                             |
| --------------------------------- | ----- | ------------------------------------------------------- |
| `add-card.spec.ts`                | 5     | Add single/multiple cards, verify counts, badges, order |
| `delete-card.spec.ts`             | 1     | Delete via modal with two-step confirmation             |
| `update-card.spec.ts`             | 1     | Update card subject field via modal                     |
| `drag-card-to-column.spec.ts`     | 1     | Drag card between columns, verify movement              |
| `drag-card-within-column.spec.ts` | 1     | Reorder cards within same column                        |

**Total: 9 passing tests**

## 🛠️ Troubleshooting

### Scratch Org Limit Reached

If you hit daily scratch org limits:

```powershell
# List all scratch orgs
sf org list

# Delete old test orgs
sf org delete scratch --target-org playwright-test --no-prompt
```

### Tests Failing Due to Stale Org

```powershell
# Delete the reused org and start fresh
sf org delete scratch --target-org playwright-test --no-prompt

# Run tests to create new org
npx playwright test --config=playwright.config.scratch.ts --project=chromium
```

### Clear Cached Authentication

```powershell
Remove-Item -Recurse -Force tests/e2e/.auth
```

## 📝 Writing New Tests

Example test structure:

```typescript
import { test, expect } from '../fixtures/test-fixtures-scratch';

test.describe('Feature Name', () => {
    test('should do something', async ({ authenticatedPage, orgInfo }) => {
        // Navigate to board
        await authenticatedPage.goto(orgInfo.boardId);

        // Perform actions
        await authenticatedPage.clickAddCard(0);

        // Verify results
        const count = await authenticatedPage.getCardCountInColumn(0);
        expect(count).toBe(1);
    });
});
```

Key points:

- Use `test-fixtures-scratch` for scratch org integration
- `authenticatedPage` provides pre-authenticated browser context
- `orgInfo` contains `boardId`, `instanceUrl`, `accessToken`
- Test data is automatically cleaned up after suite completes

## 🔗 Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Salesforce CLI Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/)
- [Scratch Orgs](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs.htm)

npm run test:e2e

# Run tests in headed mode (visible browser)

npm run test:e2e:headed

# Run tests in specific browser

npx playwright test --project=chromium

````

### Run specific test files

```powershell
# Run add card tests
npx playwright test add-card

# Run drag tests
npx playwright test drag-card

# Run integration tests
npx playwright test integration
````

### Run in debug mode

```powershell
# Debug a specific test
npx playwright test add-card --debug

# Debug with UI mode
npx playwright test --ui
```

### Run tests in parallel

```powershell
# Run with 4 workers
npx playwright test --workers=4
```

## 📊 Test Reports

After running tests, view the HTML report:

```powershell
npx playwright show-report
```

The report includes:

- Test results with pass/fail status
- Screenshots of failures
- Videos of failed tests
- Execution traces

## 🎯 Supported Browsers

Tests run on the following browsers by default:

- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5 emulation)
- **Mobile Safari** (iPhone 12 emulation)

To run specific browsers:

```powershell
# Run only on Chromium
npx playwright test --project=chromium

# Run on Firefox and WebKit
npx playwright test --project=firefox --project=webkit
```

## ✅ Test Coverage

### Add Card Tests

- ✅ Add single card to column
- ✅ Add multiple cards to different columns
- ✅ Validate required fields
- ✅ Update badge counts
- ✅ Add card with optional description

### Update Card Tests

- ✅ Open card detail modal
- ✅ Update card title
- ✅ Update card description
- ✅ Update both fields simultaneously
- ✅ Close without saving
- ✅ Persist changes after refresh
- ✅ Handle special characters

### Delete Card Tests

- ✅ Delete single card
- ✅ Delete multiple cards
- ✅ Update badge counts
- ✅ Verify card removal after refresh
- ✅ Close modal after deletion
- ✅ Maintain card order after deletion

### Drag Within Column Tests

- ✅ Drag to different position
- ✅ Drag to top of column
- ✅ Drag to bottom of column
- ✅ Maintain card count
- ✅ Show visual placeholder

### Drag Between Columns Tests

- ✅ Drag to another column
- ✅ Drag to empty column
- ✅ Drag to specific position
- ✅ Update badge counts in both columns
- ✅ Drag multiple cards sequentially
- ✅ Drag across multiple columns

### Integration Tests

- ✅ Complete CRUD workflow
- ✅ Bulk operations
- ✅ Board state consistency
- ✅ Badge count accuracy
- ✅ State persistence after refresh
- ✅ Rapid successive operations

## 🔧 Writing New Tests

### Example Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { generateTestCard, getTestBoardId } from '../helpers/test-data';

test.describe('Feature Name', () => {
    let boardId: string;

    test.beforeEach(async () => {
        boardId = getTestBoardId();
    });

    test('should do something', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(boardId);

        // Your test logic here
        const testCard = generateTestCard('Test Title');
        await authenticatedPage.createCard(0, testCard.title);

        // Assertions
        const card = authenticatedPage.getCardByTitle(testCard.title);
        await expect(card).toBeVisible();

        // Cleanup
        await authenticatedPage.deleteCard(card);
    });
});
```

### Best Practices

1. **Use Page Objects**: Always interact with the UI through page object methods
2. **Generate Unique Data**: Use `generateTestCard()` to avoid conflicts
3. **Clean Up**: Delete test data after each test
4. **Wait Appropriately**: Use `waitFor` methods instead of fixed timeouts when possible
5. **Verify State**: Check both UI and badge counts after operations
6. **Handle Errors**: Use try-catch for cleanup in case of test failures

## 🐛 Debugging

### Visual Debugging

```powershell
# Run with --debug flag
npx playwright test --debug

# Or use UI mode
npx playwright test --ui
```

### Trace Viewer

If a test fails, open the trace:

```powershell
npx playwright show-trace test-results/path-to-trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots (in `test-results/`)
- Videos (in `test-results/`)

## 📝 Environment Variables

| Variable            | Description                | Required | Example                               |
| ------------------- | -------------------------- | -------- | ------------------------------------- |
| `SF_INSTANCE_URL`   | Salesforce org URL         | Yes      | `https://example.lightning.force.com` |
| `SF_USERNAME`       | Salesforce username        | Yes      | `user@example.com`                    |
| `SF_PASSWORD`       | Salesforce password        | Yes      | `your-password`                       |
| `SF_SECURITY_TOKEN` | Salesforce security token  | Yes      | `abc123...`                           |
| `SF_BOARD_ID`       | Default board ID for tests | Yes      | `a00XXXXXXXXXX`                       |
| `HEADLESS`          | Run in headless mode       | No       | `true` or `false`                     |
| `SLOW_MO`           | Slow down operations (ms)  | No       | `100`                                 |

## 🔐 Authentication

The test framework uses persistent authentication to avoid logging in for every test:

1. First test run logs in and saves auth state to `tests/e2e/.auth/user.json`
2. Subsequent tests reuse the saved authentication
3. Delete `.auth/` directory to force re-authentication

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: '18'

            - name: Install dependencies
              run: npm ci

            - name: Install Playwright Browsers
              run: npx playwright install --with-deps

            - name: Run E2E tests
              env:
                  SF_INSTANCE_URL: ${{ secrets.SF_INSTANCE_URL }}
                  SF_USERNAME: ${{ secrets.SF_USERNAME }}
                  SF_PASSWORD: ${{ secrets.SF_PASSWORD }}
                  SF_SECURITY_TOKEN: ${{ secrets.SF_SECURITY_TOKEN }}
                  SF_BOARD_ID: ${{ secrets.SF_BOARD_ID }}
              run: npm run test:e2e

            - name: Upload test results
              if: always()
              uses: actions/upload-artifact@v3
              with:
                  name: playwright-report
                  path: playwright-report/
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Debugging Tests](https://playwright.dev/docs/debug)

## 🆘 Troubleshooting

### Tests fail with "SF_BOARD_ID is not set"

- Ensure `.env` file exists and contains valid `SF_BOARD_ID`

### Authentication fails

- Verify credentials in `.env`
- Check if security token is required for API access
- Delete `.auth/` directory and try again

### Drag and drop doesn't work

- Ensure page is fully loaded before dragging
- Check that cards are visible and interactable
- Increase wait times if needed

### Tests are flaky

- Add appropriate waits for animations
- Use `waitForLoadState('networkidle')` after navigation
- Verify test data cleanup is working correctly

## 📄 License

MIT
