import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Board Filters', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('priority filter - select High shows only high priority cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        await boardPage.priorityFilter.selectOption('High');
        await boardPage.page.waitForTimeout(500);

        const visibleCards = boardPage.allCards();
        const count = await visibleCards.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            await expect(visibleCards.nth(i)).toContainText('HIGH', {
                timeout: SF_TIMEOUT
            });
        }

        // Filtered count should be less than or equal to total
        expect(count).toBeLessThanOrEqual(allCardsBefore);
    });

    test('priority filter - All Priorities restores all cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        // Filter to High first
        await boardPage.priorityFilter.selectOption('High');
        await boardPage.page.waitForTimeout(500);

        const filteredCount = await boardPage.allCards().count();
        expect(filteredCount).toBeLessThanOrEqual(allCardsBefore);

        // Reset to All Priorities
        await boardPage.priorityFilter.selectOption('All Priorities');
        await boardPage.page.waitForTimeout(500);

        const restoredCount = await boardPage.allCards().count();
        expect(restoredCount).toBe(allCardsBefore);
    });

    test('type filter - select Story shows only story cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        await boardPage.typeFilter.selectOption('Story');
        await boardPage.page.waitForTimeout(500);

        const visibleCards = boardPage.allCards();
        const count = await visibleCards.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            await expect(visibleCards.nth(i)).toContainText('Story', {
                timeout: SF_TIMEOUT
            });
        }

        expect(count).toBeLessThanOrEqual(allCardsBefore);
    });

    test('type filter - All Types restores all cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        // Filter to Story first
        await boardPage.typeFilter.selectOption('Story');
        await boardPage.page.waitForTimeout(500);

        const filteredCount = await boardPage.allCards().count();
        expect(filteredCount).toBeLessThanOrEqual(allCardsBefore);

        // Reset to All Types
        await boardPage.typeFilter.selectOption('All Types');
        await boardPage.page.waitForTimeout(500);

        const restoredCount = await boardPage.allCards().count();
        expect(restoredCount).toBe(allCardsBefore);
    });

    test('Hide Done button toggles done column visibility', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const hideDoneBtn = boardPage.page.locator('button.filter-toggle');
        await expect(hideDoneBtn).toBeVisible({ timeout: SF_TIMEOUT });

        const columnsBefore = await boardPage.columns.count();

        // Click Hide Done — should hide the done column
        await hideDoneBtn.click();
        await boardPage.page.waitForTimeout(500);

        const columnsAfterHide = await boardPage.columns.count();
        expect(columnsAfterHide).toBeLessThan(columnsBefore);

        // Click again to show done column
        await hideDoneBtn.click();
        await boardPage.page.waitForTimeout(500);

        const columnsAfterShow = await boardPage.columns.count();
        expect(columnsAfterShow).toBe(columnsBefore);
    });

    test('combined filters - priority and type together', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        // Apply priority filter
        await boardPage.priorityFilter.selectOption('High');
        await boardPage.page.waitForTimeout(500);

        const afterPriority = await boardPage.allCards().count();
        expect(afterPriority).toBeLessThanOrEqual(allCardsBefore);

        // Apply type filter on top of priority
        await boardPage.typeFilter.selectOption('Story');
        await boardPage.page.waitForTimeout(500);

        const afterBoth = await boardPage.allCards().count();
        expect(afterBoth).toBeLessThanOrEqual(afterPriority);

        // Every visible card should match both filters
        const visibleCards = boardPage.allCards();
        const count = await visibleCards.count();
        for (let i = 0; i < count; i++) {
            await expect(visibleCards.nth(i)).toContainText('HIGH', {
                timeout: SF_TIMEOUT
            });
            await expect(visibleCards.nth(i)).toContainText('Story', {
                timeout: SF_TIMEOUT
            });
        }
    });

    test('search and filter combination works', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        // Apply a type filter first
        await boardPage.typeFilter.selectOption('Story');
        await boardPage.page.waitForTimeout(500);

        const afterFilter = await boardPage.allCards().count();
        expect(afterFilter).toBeLessThanOrEqual(allCardsBefore);
        expect(afterFilter).toBeGreaterThan(0);

        // Now search for a specific card's subject within the filtered results
        const storyCards = boardPage.allCards();
        const firstStoryText = await storyCards.first().textContent();

        // Pick a search term from the visible card text (first few chars of subject)
        const searchCard = boardData.cards[boardData.cards.length - 1];
        await boardPage.search(searchCard.Subject);
        await boardPage.page.waitForTimeout(500);

        const afterSearch = await boardPage.allCards().count();
        expect(afterSearch).toBeLessThanOrEqual(afterFilter);

        // Clear search, count should return to filter-only level
        await boardPage.clearSearch();
        await boardPage.page.waitForTimeout(500);

        const afterClear = await boardPage.allCards().count();
        expect(afterClear).toBe(afterFilter);
    });
});
