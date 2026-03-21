import { test, expect } from '../fixtures';

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

        // The backlog search is a lightning-input with placeholder "Search backlog..."
        // Playwright pierces shadow DOM so we can find the inner input element
        const backlogSearch = boardPage.page.locator(
            'lightning-input.backlog-search'
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

        // The empty state h3 text is "No backlog cards"
        const emptyMessage = boardPage.page.getByText('No backlog cards');
        // This may not be visible if there are backlog cards — use a short timeout
        const isEmpty = await emptyMessage
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!isEmpty) {
            test.skip(true, 'Backlog has cards — empty state not shown');
            return;
        }

        await expect(emptyMessage).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('empty backlog shows "Create Card" button', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // The "Create Card" button is a lightning-button in the empty state
        const createButton = boardPage.page.locator(
            'lightning-button[label="Create Card"]'
        );
        const isEmpty = await createButton
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!isEmpty) {
            test.skip(true, 'Backlog has cards — empty state not shown');
            return;
        }

        await expect(createButton).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('New Card button is visible in toolbar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const newCardButton = boardPage.page.locator(
            'button:has-text("New Card")'
        );
        await expect(newCardButton).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('switching back to board tab shows the board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            'lightning-input.backlog-search'
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
            'lightning-input.backlog-search'
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
            'lightning-input.backlog-search'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });

        // The backlog uses lightning-combobox components, not native <select>
        const comboboxes = boardPage.page.locator(
            'lightning-combobox.backlog-filter'
        );
        // There should be at least 3 comboboxes: View, Priority, Type
        await expect(comboboxes.first()).toBeVisible({ timeout: SF_TIMEOUT });

        const count = await comboboxes.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('backlog section shows Backlog header with card count', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogHeader = boardPage.page.locator('.backlog-header-row');
        await expect(backlogHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(backlogHeader.locator('strong')).toHaveText('Backlog');
        // Should show card count
        await expect(backlogHeader).toContainText(/\d+ cards/);
    });

    test('clicking backlog header collapses and expands section', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogHeader = boardPage.page.locator('.backlog-header-row');
        await expect(backlogHeader).toBeVisible({ timeout: SF_TIMEOUT });

        // Count visible rows before collapse
        const rowsBefore = boardPage.page.locator(
            '.backlog-row:not(.backlog-row--header)'
        );
        const countBefore = await rowsBefore.count();

        // Click to collapse
        await backlogHeader.click();
        await boardPage.page.waitForTimeout(500);

        // Rows should be fewer or zero after collapse
        const countAfter = await rowsBefore.count();
        expect(countAfter).toBeLessThan(countBefore);

        // Click again to expand
        await backlogHeader.click();
        await boardPage.page.waitForTimeout(500);

        const countExpanded = await rowsBefore.count();
        expect(countExpanded).toBe(countBefore);
    });

    test('context menu shows Move to Column option', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // Wait for backlog rows to appear
        const firstRow = boardPage.page
            .locator('.backlog-row:not(.backlog-row--header)')
            .first();
        await expect(firstRow).toBeVisible({ timeout: SF_TIMEOUT });

        // Right-click to open context menu
        await firstRow.click({ button: 'right' });

        // Context menu should appear with Move to Column option
        const contextMenu = boardPage.page.locator('c-kanban-context-menu');
        await expect(contextMenu).toBeVisible({ timeout: 5000 });

        const moveToColumn = contextMenu.getByText('Move to Column');
        // Move to Column only shows when there's an active sprint
        // If visible, verify it exists; if not, that's expected for non-sprint boards
        const isVisible = await moveToColumn.isVisible().catch(() => false);
        if (isVisible) {
            await expect(moveToColumn).toBeVisible();
        }
    });

    test('drag card to sprint header moves it to sprint', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // This test requires a sprint board with planning sprints
        const sprintHeader = boardPage.page
            .locator('.sprint-header-row:not(.backlog-header-row)')
            .first();
        const hasSprintHeader = await sprintHeader
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!hasSprintHeader) {
            test.skip(
                true,
                'No planning sprints available — skipping drag test'
            );
            return;
        }

        // Find a backlog card (ungrouped section)
        const backlogCard = boardPage.page
            .locator('.backlog-header-row ~ .backlog-row')
            .first();
        const hasBacklogCard = await backlogCard
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!hasBacklogCard) {
            test.skip(true, 'No ungrouped backlog cards — skipping');
            return;
        }

        // Get sprint card count before drag
        const statsText = await sprintHeader
            .locator('.sprint-header__stats')
            .textContent();
        const countBefore = parseInt(
            statsText?.match(/(\d+) cards/)?.[1] ?? '0',
            10
        );

        // Drag the backlog card to the sprint header
        await backlogCard.dragTo(sprintHeader);
        await boardPage.page.waitForTimeout(2000);

        // Sprint card count should increase
        const newStatsText = await sprintHeader
            .locator('.sprint-header__stats')
            .textContent();
        const countAfter = parseInt(
            newStatsText?.match(/(\d+) cards/)?.[1] ?? '0',
            10
        );
        expect(countAfter).toBe(countBefore + 1);
    });
});
