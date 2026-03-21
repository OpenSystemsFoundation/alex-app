// @ts-check
const { test, expect } = require('../fixtures');

/**
 * Visual regression tests — screenshot comparisons against baselines.
 *
 * Playwright compares each screenshot pixel-by-pixel against a stored
 * baseline in e2e/specs/visual-regression.spec.js-snapshots/.
 *
 * First run creates the baselines. Subsequent runs detect pixel shifts.
 * Update baselines with: npx playwright test --update-snapshots
 *
 * maxDiffPixelRatio controls sensitivity (0.01 = 1% pixel tolerance).
 */

const SF_TIMEOUT = 45_000;

test.describe('Visual Regression', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('board view — full board layout', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        await expect(boardPage.page).toHaveScreenshot('board-full-layout.png', {
            fullPage: false,
            maxDiffPixelRatio: 0.01
        });
    });

    test('board view — column headers', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Snapshot just the column header row
        const firstCol = boardPage.columns.first();
        await expect(firstCol).toBeVisible({ timeout: SF_TIMEOUT });

        for (let i = 0; i < 6; i++) {
            const col = boardPage.columns.nth(i);
            await expect(col).toHaveScreenshot(`column-header-${i}.png`, {
                maxDiffPixelRatio: 0.01
            });
        }
    });

    test('board view — card anatomy', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Snapshot the first card to detect card layout changes
        const card = boardPage.card(boardData.cards[0].Id);
        await expect(card).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(card).toHaveScreenshot('card-anatomy.png', {
            maxDiffPixelRatio: 0.01
        });
    });

    test('board view — filter bar', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        await expect(boardPage.searchInput).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Snapshot the filter bar area
        const filterBar = boardPage.page.locator('.board-filter-bar');
        await expect(filterBar).toHaveScreenshot('filter-bar.png', {
            maxDiffPixelRatio: 0.01
        });
    });

    test('board view — top bar with tabs', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const topbar = boardPage.page.locator('.kanban-topbar');
        await expect(topbar).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(topbar).toHaveScreenshot('topbar-tabs.png', {
            maxDiffPixelRatio: 0.01
        });
    });

    test('backlog view — tab content', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        await boardPage.switchToBacklogTab();

        // Wait for backlog to render
        const backlog = boardPage.page.locator('.backlog-table, .backlog-view');
        await expect(backlog.first()).toBeVisible({ timeout: SF_TIMEOUT });

        await expect(boardPage.page).toHaveScreenshot('backlog-view.png', {
            fullPage: false,
            maxDiffPixelRatio: 0.01
        });
    });

    test('board view — search active state', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        await boardPage.search(boardData.cards[0].Subject);
        await boardPage.page.waitForTimeout(500);

        await expect(boardPage.page).toHaveScreenshot(
            'board-search-active.png',
            {
                fullPage: false,
                maxDiffPixelRatio: 0.01
            }
        );
    });
});
