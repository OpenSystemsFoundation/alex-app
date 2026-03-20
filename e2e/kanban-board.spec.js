// @ts-check
const { test, expect } = require('@playwright/test');
const { getSampleBoardData, sfUpdate } = require('./helpers/sf-data');

/**
 * E2E tests for the Alex Kanban Board.
 *
 * Required environment variables:
 *   SCRATCH_ORG_URL  – frontdoor.jsp login URL from `sf org open --json`
 *
 * The CI workflow creates a scratch org, deploys, and creates sample data
 * via CreateFilledKanbanBoard.apex before running these tests.
 * Tests use existing board data — no record creation needed.
 */

const SF_TIMEOUT = 45_000;

/** @type {string} */
let baseUrl;
/** @type {string} */
let boardId;
/** @type {Array<{Id: string, header: string}>} */
let columns;
/** @type {Array<{Id: string, Name: string, Subject: string, ColumnId: string}>} */
let cards;

test.describe('Alex Kanban Board', () => {
    test.beforeAll(() => {
        const loginUrl = process.env.SCRATCH_ORG_URL;
        if (!loginUrl) return;

        const data = getSampleBoardData();
        boardId = data.boardId;
        columns = data.columns;
        cards = data.cards;

        const parsed = new URL(loginUrl);
        baseUrl = parsed.origin;
    });

    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL || !boardId) {
            test.skip(
                true,
                'SCRATCH_ORG_URL not set or no board found — skipping'
            );
        }
    });

    /** Navigate to the board record page */
    async function goToBoard(page) {
        await page.goto(
            `${baseUrl}/lightning/r/OpenSF__Board__c/${boardId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
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

    test('cards appear on the board', async ({ page }) => {
        expect(cards.length).toBeGreaterThan(0);
        await goToBoard(page);

        const card = page.locator(`article[data-card-id="${cards[0].Id}"]`);
        await expect(card).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('card links contain the record id', async ({ page }) => {
        expect(cards.length).toBeGreaterThan(0);
        await goToBoard(page);

        const cardLink = page.locator(`a[data-card-id="${cards[0].Id}"]`);
        await expect(cardLink).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('drag card between columns', async ({ page }) => {
        expect(cards.length).toBeGreaterThan(0);
        expect(columns.length).toBeGreaterThanOrEqual(2);
        await goToBoard(page);

        // Wait for at least one card to render in the board
        await page
            .locator('article.kanban-card')
            .first()
            .waitFor({ state: 'visible', timeout: SF_TIMEOUT });

        // Find the first column that has a visible card
        let sourceColIdx = -1;
        let dragCardId = '';
        for (let i = 0; i < columns.length - 1; i++) {
            const col = page.locator(
                `.kanban-column__card-wrapper[data-column-id="${columns[i].Id}"]`
            );
            const cardCount = await col.locator('article.kanban-card').count();
            if (cardCount > 0) {
                sourceColIdx = i;
                dragCardId = await col
                    .locator('article.kanban-card')
                    .first()
                    .getAttribute('data-card-id');
                break;
            }
        }
        expect(
            sourceColIdx,
            'Expected at least one non-last column to contain cards'
        ).toBeGreaterThanOrEqual(0);

        // Target is the next column
        const targetIdx =
            sourceColIdx + 1 < columns.length ? sourceColIdx + 1 : 0;

        const sourceCard = page.locator(
            `article[data-card-id="${dragCardId}"]`
        );
        const targetColumn = page.locator(
            `.kanban-column__card-wrapper[data-column-id="${columns[targetIdx].Id}"]`
        );

        await expect(sourceCard).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(targetColumn).toBeVisible({ timeout: SF_TIMEOUT });

        await sourceCard.dragTo(targetColumn);

        const movedCard = targetColumn.locator(
            `article[data-card-id="${dragCardId}"]`
        );
        await expect(movedCard).toBeVisible({ timeout: 15_000 });
    });

    test('backend update reflects in browser after refresh', async ({
        page
    }) => {
        expect(cards.length).toBeGreaterThan(0);
        await goToBoard(page);

        const card = page.locator(`article[data-card-id="${cards[0].Id}"]`);
        await expect(card).toBeVisible({ timeout: SF_TIMEOUT });

        const newSubject = `E2E-Updated-${Date.now()}`;
        sfUpdate(
            'OpenSF__Card__c',
            cards[0].Id,
            `OpenSF__Subject__c=${newSubject}`
        );

        const refreshBtn = page.locator(
            'button.topbar-icon-btn:has(lightning-icon.slds-icon-utility-refresh)'
        );
        await refreshBtn.click();

        await expect(card).toContainText(newSubject, { timeout: 15_000 });
    });

    test('board tab and backlog tab switching', async ({ page }) => {
        await goToBoard(page);

        const backlogTab = page.locator('[data-tab-id="backlog"]');
        await expect(backlogTab).toBeVisible({ timeout: SF_TIMEOUT });
        await backlogTab.click();

        const boardGrid = page.locator('.kanban-board');
        await expect(boardGrid).not.toBeVisible({ timeout: SF_TIMEOUT });

        const boardTab = page.locator('[data-tab-id="board"]');
        await boardTab.click();
        await expect(boardGrid).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('add card button creates a new card', async ({ page }) => {
        await goToBoard(page);

        const firstColWrapper = page.locator(
            `.kanban-column__card-wrapper[data-column-id="${columns[0].Id}"]`
        );
        await expect(firstColWrapper).toBeVisible({ timeout: SF_TIMEOUT });
        const beforeCount = await firstColWrapper
            .locator('article.kanban-card')
            .count();

        const addButton = page.locator('.add-card-button').first();
        await addButton.click();

        await expect(
            firstColWrapper.locator('article.kanban-card')
        ).toHaveCount(beforeCount + 1, { timeout: 15_000 });
    });

    test('search filter works', async ({ page }) => {
        expect(cards.length).toBeGreaterThan(0);
        await goToBoard(page);

        const searchInput = page.locator('.board-filter-search');
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });

        await searchInput.fill(cards[0].Subject);

        const matchCard = page.locator(
            `article[data-card-id="${cards[0].Id}"]`
        );
        await expect(matchCard).toBeVisible({ timeout: 15_000 });
    });
});
