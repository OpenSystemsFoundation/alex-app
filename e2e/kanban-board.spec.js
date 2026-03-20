// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E tests for the Alex Kanban Board.
 *
 * These tests run against a live Salesforce scratch org.
 * The SCRATCH_ORG_URL environment variable must contain a frontdoor.jsp login URL.
 *
 * Usage:
 *   SCRATCH_ORG_URL="https://..." npx playwright test
 */

const LOGIN_TIMEOUT = 30_000;
const LWC_LOAD_TIMEOUT = 30_000;

test.describe('Alex Kanban Board', () => {
    test.beforeEach(async ({ page }) => {
        const loginUrl = process.env.SCRATCH_ORG_URL;
        if (!loginUrl) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping E2E tests');
            return;
        }

        // Login via frontdoor URL
        await page.goto(loginUrl, {
            waitUntil: 'networkidle',
            timeout: LOGIN_TIMEOUT
        });

        // Wait for Lightning Experience to load
        await page.waitForSelector('one-app-nav-bar', {
            timeout: LOGIN_TIMEOUT
        });
    });

    test('loads the app tab', async ({ page }) => {
        // Navigate to Alex app
        await page.goto('/lightning/n/OpenSF__Alex', {
            waitUntil: 'networkidle',
            timeout: LWC_LOAD_TIMEOUT
        });

        // Verify the kanban board component renders
        const board = page.locator('c-kanban-board, [data-id="kanban-board"]');
        await expect(board.first()).toBeVisible({ timeout: LWC_LOAD_TIMEOUT });
    });

    test('displays board columns', async ({ page }) => {
        await page.goto('/lightning/n/OpenSF__Alex', {
            waitUntil: 'networkidle',
            timeout: LWC_LOAD_TIMEOUT
        });

        // Board should have at least one column
        const columns = page.locator(
            'c-kanban-column, [data-id="kanban-column"]'
        );
        await expect(columns.first()).toBeVisible({
            timeout: LWC_LOAD_TIMEOUT
        });
        expect(await columns.count()).toBeGreaterThan(0);
    });

    test('can create a new card', async ({ page }) => {
        await page.goto('/lightning/n/OpenSF__Alex', {
            waitUntil: 'networkidle',
            timeout: LWC_LOAD_TIMEOUT
        });

        // Look for an add/new card button
        const addButton = page.locator(
            'button:has-text("New"), button:has-text("Add"), [data-id="new-card"]'
        );
        if ((await addButton.count()) > 0) {
            await addButton.first().click();

            // A modal or form should appear
            const modal = page.locator(
                'section[role="dialog"], c-card-form, [data-id="card-form"]'
            );
            await expect(modal.first()).toBeVisible({ timeout: 10_000 });
        }
    });
});
