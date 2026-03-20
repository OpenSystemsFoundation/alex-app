// @ts-check
const { test, expect } = require('@playwright/test');
const {
    getSampleBoardData,
    createTestCards,
    sfUpdate
} = require('./helpers/sf-data');

/**
 * E2E tests for the Alex Kanban Board.
 *
 * Required environment variables:
 *   SCRATCH_ORG_URL  – frontdoor.jsp login URL from `sf org open --json`
 *
 * The CI workflow creates a scratch org, deploys, and creates sample data
 * via CreateBoard.apex before running these tests.
 */

const SF_TIMEOUT = 45_000;

/** @type {string} */
let baseUrl;
/** @type {string} */
let boardId;
/** @type {Array<{Id: string, header: string}>} */
let columns;
/** @type {string[]} */
let cardIds;

test.describe('Alex Kanban Board', () => {
    test.beforeAll(() => {
        const loginUrl = process.env.SCRATCH_ORG_URL;
        if (!loginUrl) return;

        // Get board and column data from the scratch org
        const data = getSampleBoardData();
        boardId = data.boardId;
        columns = data.columns;

        // Create test cards in the first column (Backlog)
        if (columns.length > 0) {
            cardIds = createTestCards(columns[0].Id, [
                'E2E-Card-Alpha',
                'E2E-Card-Beta',
                'E2E-Card-Gamma'
            ]);
        }

        const parsed = new URL(loginUrl);
        baseUrl = parsed.origin;
    });

    test.beforeEach(async ({ page }) => {
        const loginUrl = process.env.SCRATCH_ORG_URL;
        if (!loginUrl || !boardId) {
            test.skip(
                true,
                'SCRATCH_ORG_URL not set or no board found — skipping'
            );
            return;
        }

        // Login via frontdoor URL
        await page.goto(loginUrl, {
            waitUntil: 'networkidle',
            timeout: SF_TIMEOUT
        });
        await page.waitForSelector('one-app-nav-bar', {
            timeout: SF_TIMEOUT
        });
    });

    /** Navigate to the board record page */
    async function goToBoard(page) {
        await page.goto(
            `${baseUrl}/lightning/r/OpenSF__Board__c/${boardId}/view`,
            { waitUntil: 'networkidle', timeout: SF_TIMEOUT }
        );
        await page.waitForSelector('.kanban-board-wrapper', {
            timeout: SF_TIMEOUT
        });
    }

    test('board record page loads the kanban component', async ({ page }) => {
        await goToBoard(page);

        const board = page.locator('.kanban-board-wrapper');
        await expect(board).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('board displays all 6 columns', async ({ page }) => {
        await goToBoard(page);

        const cols = page.locator('.kanban-column');
        await expect(cols.first()).toBeVisible({ timeout: SF_TIMEOUT });
        expect(await cols.count()).toBe(6);
    });

    test('test cards appear in the first column', async ({ page }) => {
        await goToBoard(page);

        // Each card should be locatable by its data-card-id attribute
        for (const cardId of cardIds) {
            const card = page.locator(`[data-card-id="${cardId}"]`);
            await expect(card).toBeVisible({ timeout: SF_TIMEOUT });
        }
    });

    test('card links contain the record id', async ({ page }) => {
        await goToBoard(page);

        // The card name link should have a data-card-id matching the record
        const cardLink = page.locator(`a[data-card-id="${cardIds[0]}"]`);
        await expect(cardLink).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(cardLink).toHaveText('E2E-Card-Alpha');
    });

    test('drag card between columns', async ({ page }) => {
        await goToBoard(page);

        const sourceCard = page.locator(
            `article[data-card-id="${cardIds[0]}"]`
        );
        const targetColumn = page.locator(
            `.kanban-column__card-wrapper[data-column-id="${columns[1].Id}"]`
        );

        await expect(sourceCard).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(targetColumn).toBeVisible({ timeout: SF_TIMEOUT });

        // Perform drag and drop
        await sourceCard.dragTo(targetColumn);

        // After drag, the card should be in the target column
        const movedCard = targetColumn.locator(
            `[data-card-id="${cardIds[0]}"]`
        );
        await expect(movedCard).toBeVisible({ timeout: 15_000 });
    });

    test('backend update reflects in browser after refresh', async ({
        page
    }) => {
        await goToBoard(page);

        // Verify original subject is visible
        const card = page.locator(`[data-card-id="${cardIds[1]}"]`);
        await expect(card).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(card).toContainText('E2E-Card-Beta subject');

        // Update the card subject via SF CLI (backend)
        sfUpdate(
            'OpenSF__Card__c',
            cardIds[1],
            'OpenSF__Subject__c="Updated via CLI"'
        );

        // Click refresh button to reload board data
        const refreshBtn = page.locator('button[title="Refresh"]');
        await refreshBtn.click();

        // The updated subject should appear
        await expect(card).toContainText('Updated via CLI', {
            timeout: 15_000
        });
    });

    test('board tab and backlog tab switching', async ({ page }) => {
        await goToBoard(page);

        // Click the Backlog tab
        const backlogTab = page.locator('[data-tab-id="backlog"]');
        await expect(backlogTab).toBeVisible({ timeout: SF_TIMEOUT });
        await backlogTab.click();

        const backlogView = page.locator('c-kanban-backlog-view');
        await expect(backlogView).toBeVisible({ timeout: SF_TIMEOUT });

        // Switch back to Board tab
        const boardTab = page.locator('[data-tab-id="board"]');
        await boardTab.click();

        const boardGrid = page.locator('.kanban-board');
        await expect(boardGrid).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('add card button opens modal', async ({ page }) => {
        await goToBoard(page);

        const addButton = page.locator('.add-card-button').first();
        await expect(addButton).toBeVisible({ timeout: SF_TIMEOUT });
        await addButton.click();

        // Salesforce record create modal should appear
        const modal = page.locator('section[role="dialog"], .slds-modal');
        await expect(modal.first()).toBeVisible({ timeout: 15_000 });
    });

    test('search filter works', async ({ page }) => {
        await goToBoard(page);

        const searchInput = page.locator('.board-filter-search');
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });

        // Search for a specific card
        await searchInput.fill('E2E-Card-Gamma');

        // The matching card should be visible, others may be filtered out
        const gammaCard = page.locator(`[data-card-id="${cardIds[2]}"]`);
        await expect(gammaCard).toBeVisible({ timeout: 10_000 });
    });
});
