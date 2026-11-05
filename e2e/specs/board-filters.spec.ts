import { test, expect } from '../fixtures';

const SF_TIMEOUT = 60_000;

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

        // card.priority renders as "High" (title-case), not uppercase
        for (let i = 0; i < count; i++) {
            await expect(visibleCards.nth(i)).toContainText('High', {
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
        await boardPage.priorityFilter.selectOption('All');
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

        // Reset to All Types (value is 'All', not 'All Types')
        await boardPage.typeFilter.selectOption('All');
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

        const hideDoneBtn = boardPage.page.locator(
            'button.filter-toggle[title="Hide cards in Done-category columns"]'
        );
        await expect(hideDoneBtn).toBeVisible({ timeout: SF_TIMEOUT });

        // Hide Done does not remove columns from DOM; it empties their cards
        // and sets isHidden. Count total cards instead.
        const cardsBefore = await boardPage.allCards().count();

        // Click Hide Done — should hide cards in done-category columns
        await hideDoneBtn.click();
        await boardPage.page.waitForTimeout(500);

        // The button should gain the active class
        await expect(hideDoneBtn).toHaveClass(/filter-toggle--active/, {
            timeout: SF_TIMEOUT
        });

        const cardsAfterHide = await boardPage.allCards().count();
        // Cards should be equal or fewer (fewer if there were cards in Done columns)
        expect(cardsAfterHide).toBeLessThanOrEqual(cardsBefore);

        // Click again to show done column cards
        await hideDoneBtn.click();
        await boardPage.page.waitForTimeout(500);

        const cardsAfterShow = await boardPage.allCards().count();
        expect(cardsAfterShow).toBe(cardsBefore);
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
            // Priority renders as "High" (title-case)
            await expect(visibleCards.nth(i)).toContainText('High', {
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

        // Pick a search term from a known card's subject
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

    test('filter summary counts cards and the clear button resets every filter', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();
        const total = await boardPage.allCards().count();
        const page = boardPage.page;
        const clear = page.getByTitle('Clear all filters');
        await expect(clear).toHaveCount(0);

        await boardPage.priorityFilter.selectOption('High');
        await boardPage.typeFilter.selectOption('Story');
        const shown = await boardPage.allCards().count();
        expect(shown).toBeGreaterThan(0);
        expect(shown).toBeLessThan(total);
        await expect(
            page.getByText(`${shown} of ${total} cards`)
        ).toBeVisible();

        await clear.click();
        await expect(boardPage.allCards()).toHaveCount(total);
        await expect(boardPage.priorityFilter).toHaveValue('All');
        await expect(boardPage.typeFilter).toHaveValue('All');
        await expect(clear).toHaveCount(0);
    });

    test('search matches the card number', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();
        const card = boardData.cards[3];

        await boardPage.search(card.Name);
        await expect(boardPage.allCards()).toHaveCount(1);
        await expect(boardPage.card(card.Id)).toBeVisible();
    });
});
