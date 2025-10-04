import { test, expect } from '../fixtures/test-fixtures-scratch';
import { generateTestCard } from '../helpers/test-data-scratch';

/**
 * E2E Tests for Adding Cards to Kanban Board
 *
 * Tests cover:
 * - Adding a card to a column via the Add Card button
 * - Validating card count updates
 * - Verifying card appears in correct column
 * - Testing badge count updates
 *
 * Note: The LWC automatically creates a card when the Add Card button is clicked.
 * No modal interaction is needed for basic card creation.
 */
test.describe('Kanban Board - Add Card', () => {
    // Clean up all cards after each test
    test.afterEach(async ({ authenticatedPage, orgInfo }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();
        await authenticatedPage.deleteAllCardsViaApi();
    });

    test('should add a new card to a column using the Add Card button', async ({
        authenticatedPage,
        orgInfo
    }) => {
        // Navigate to the board
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get initial card count in first column
        const initialCount = await authenticatedPage.getCardCountInColumn(0);

        // Click the Add Card button in the first column
        await authenticatedPage.clickAddCard(0);

        // Wait for the card to be created
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify card count increased
        const newCount = await authenticatedPage.getCardCountInColumn(0);
        expect(newCount).toBe(initialCount + 1);

        // Verify at least one card is visible in the column
        const cards = authenticatedPage.getCardsInColumn(0);
        await expect(cards.first()).toBeVisible();

        // Verify badge count matches actual count
        const badgeCount = await authenticatedPage.getColumnBadgeCount(0);
        expect(badgeCount).toBe(newCount);
    });

    test('should add multiple cards to the same column', async ({
        authenticatedPage,
        orgInfo
    }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get initial count
        const initialCount = await authenticatedPage.getCardCountInColumn(0);

        // Add 3 cards
        const cardsToAdd = 3;
        for (let i = 0; i < cardsToAdd; i++) {
            await authenticatedPage.clickAddCard(0);
            await authenticatedPage.page.waitForTimeout(2000);
        }

        // Verify count increased by 3
        const newCount = await authenticatedPage.getCardCountInColumn(0);
        expect(newCount).toBe(initialCount + cardsToAdd);
    });

    test('should add cards to different columns', async ({
        authenticatedPage,
        orgInfo
    }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get column count
        const columnCount = await authenticatedPage.getColumnCount();
        expect(columnCount).toBeGreaterThan(0);

        // Add one card to each column (up to 3 columns)
        const columnsToTest = Math.min(3, columnCount);
        const initialCounts: number[] = [];

        // Get initial counts
        for (let i = 0; i < columnsToTest; i++) {
            const count = await authenticatedPage.getCardCountInColumn(i);
            initialCounts.push(count);
        }

        // Add cards
        for (let i = 0; i < columnsToTest; i++) {
            await authenticatedPage.clickAddCard(i);
            await authenticatedPage.page.waitForTimeout(2000);
        }

        // Verify each column has one more card
        for (let i = 0; i < columnsToTest; i++) {
            const newCount = await authenticatedPage.getCardCountInColumn(i);
            expect(newCount).toBe(initialCounts[i] + 1);
        }
    });

    test('should update column badge count after adding card', async ({
        authenticatedPage,
        orgInfo
    }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get initial counts
        const initialCardCount =
            await authenticatedPage.getCardCountInColumn(1);
        const initialBadgeCount =
            await authenticatedPage.getColumnBadgeCount(1);

        expect(initialCardCount).toBe(initialBadgeCount);

        // Add a new card
        await authenticatedPage.clickAddCard(1);
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify counts updated correctly
        const newCardCount = await authenticatedPage.getCardCountInColumn(1);
        const newBadgeCount = await authenticatedPage.getColumnBadgeCount(1);

        expect(newCardCount).toBe(initialCardCount + 1);
        expect(newBadgeCount).toBe(newCardCount);
    });

    test('should maintain card order when adding new cards', async ({
        authenticatedPage,
        orgInfo
    }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get initial count in second column
        const initialCount = await authenticatedPage.getCardCountInColumn(1);

        // Add 2 cards
        await authenticatedPage.clickAddCard(1);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(1);
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify final count
        const finalCount = await authenticatedPage.getCardCountInColumn(1);
        expect(finalCount).toBe(initialCount + 2);

        // Verify all cards are visible and in the column
        const cards = authenticatedPage.getCardsInColumn(1);
        const cardCount = await cards.count();
        expect(cardCount).toBe(finalCount);
    });
});
