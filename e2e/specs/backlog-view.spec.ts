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
});
