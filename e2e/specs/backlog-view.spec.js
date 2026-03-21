// @ts-check
const { test, expect } = require('../fixtures');

const SF_TIMEOUT = 45_000;

test.describe('Backlog View', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('switching to backlog tab shows backlog view', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.backlogTab).toBeVisible({
            timeout: SF_TIMEOUT
        });

        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            'input[placeholder="Search backlog..."]'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog tab badge shows card count', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.backlogTab).toBeVisible({
            timeout: SF_TIMEOUT
        });

        const badge = boardPage.page.locator(
            '[data-tab-id="backlog"] .tab-badge'
        );
        await expect(badge).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(badge).toHaveText(/\d+/);
    });

    test('empty backlog shows "No backlog cards" message', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const emptyMessage = boardPage.page.getByText('No backlog cards');
        await expect(emptyMessage).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('empty backlog shows "Create Card" button', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const createButton = boardPage.page.getByRole('button', {
            name: 'Create Card'
        });
        await expect(createButton).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('New Card button is visible in toolbar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const newCardButton = boardPage.page.getByRole('button', {
            name: /New Card/
        });
        await expect(newCardButton).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('switching back to board tab shows the board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            'input[placeholder="Search backlog..."]'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });

        await boardPage.switchToBoardTab();
        await expect(boardPage.boardGrid).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog search input is visible', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            'input[placeholder="Search backlog..."]'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog filter dropdowns are present', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // Wait for backlog toolbar to be visible
        const backlogSearch = boardPage.page.locator(
            'input[placeholder="Search backlog..."]'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });

        // View mode dropdown (first select)
        const selects = boardPage.page.locator('select');
        await expect(selects.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Priority filter — select with "All Priorities" option
        const priorityFilter = boardPage.page.locator(
            'select:has(option:text("All Priorities"))'
        );
        await expect(priorityFilter).toBeVisible({ timeout: SF_TIMEOUT });

        // Type filter — select with "All Types" option
        const typeFilter = boardPage.page.locator(
            'select:has(option:text("All Types"))'
        );
        await expect(typeFilter).toBeVisible({ timeout: SF_TIMEOUT });
    });
});
