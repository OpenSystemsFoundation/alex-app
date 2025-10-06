import { test, expect } from '../fixtures/test-fixtures';

/**
 * E2E Tests for Moving Cards Within the Same Column
 *
 * Tests cover:
 * - Dragging a card to a different position within the same column
 * - Moving a card from top to bottom of a column
 * - Moving a card from bottom to top of a column
 * - Moving a card to the middle of a column
 * - Verifying card order after reordering
 *
 * Each test gets its own isolated board that is automatically cleaned up.
 */
test.describe('Kanban Board - Move Card Within Column', () => {
    test('should move a card down within the same column', async ({
        authenticatedPage,
        browserName,
        testBoard,
        sfCli
    }) => {
        // Skip for Firefox/WebKit due to drag-drop coordinate calculation differences
        test.skip(
            browserName !== 'chromium',
            'Drag-down behavior differs in Firefox/WebKit'
        );

        await authenticatedPage.waitForBoardToLoad();

        // Create three cards via Apex (faster and doesn't test the add button)
        const columnId = testBoard.columnIds[0]; // First column (To Do)
        await sfCli.createTestCards(columnId, 3);

        // Reload page to see the new cards
        await authenticatedPage.page.reload();
        await authenticatedPage.waitForBoardToLoad();
        await authenticatedPage.page.waitForTimeout(2000);

        // Get the card IDs in order (cards are sorted by LexoRank position)
        const card0 = authenticatedPage.getCardInColumn(0, 0);
        const card1 = authenticatedPage.getCardInColumn(0, 1);
        const card2 = authenticatedPage.getCardInColumn(0, 2);

        const card0Id = await card0.getAttribute('data-card-id');
        const card1Id = await card1.getAttribute('data-card-id');
        const card2Id = await card2.getAttribute('data-card-id');

        // Move the first card to the third position (after card2)
        await authenticatedPage.dragCardWithinColumn(0, 0, 2);
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify card count hasn't changed
        const cardCount = await authenticatedPage.getCardCountInColumn(0);
        expect(cardCount).toBe(3);

        // Get the new order by card IDs
        const newCard0 = authenticatedPage.getCardInColumn(0, 0);
        const newCard1 = authenticatedPage.getCardInColumn(0, 1);
        const newCard2 = authenticatedPage.getCardInColumn(0, 2);

        const newCard0Id = await newCard0.getAttribute('data-card-id');
        const newCard1Id = await newCard1.getAttribute('data-card-id');
        const newCard2Id = await newCard2.getAttribute('data-card-id');

        // After moving card0 to position 2, the order should be: card1, card2, card0
        expect(newCard0Id).toBe(card1Id);
        expect(newCard1Id).toBe(card2Id);
        expect(newCard2Id).toBe(card0Id);
    });

    test('should move a card up within the same column', async ({
        authenticatedPage
    }) => {
        await authenticatedPage.waitForBoardToLoad();

        // Add three cards to the first column
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);

        // Get the card IDs in order
        const card0 = authenticatedPage.getCardInColumn(0, 0);
        const card1 = authenticatedPage.getCardInColumn(0, 1);
        const card2 = authenticatedPage.getCardInColumn(0, 2);

        const card0Id = await card0.getAttribute('data-card-id');
        const card1Id = await card1.getAttribute('data-card-id');
        const card2Id = await card2.getAttribute('data-card-id');

        // Move the last card to the first position
        await authenticatedPage.dragCardWithinColumn(0, 2, 0);
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify card count hasn't changed
        const cardCount = await authenticatedPage.getCardCountInColumn(0);
        expect(cardCount).toBe(3);

        // Get the new order by card IDs
        const newCard0 = authenticatedPage.getCardInColumn(0, 0);
        const newCard1 = authenticatedPage.getCardInColumn(0, 1);
        const newCard2 = authenticatedPage.getCardInColumn(0, 2);

        const newCard0Id = await newCard0.getAttribute('data-card-id');
        const newCard1Id = await newCard1.getAttribute('data-card-id');
        const newCard2Id = await newCard2.getAttribute('data-card-id');

        // After moving card2 to position 0, the order should be: card2, card0, card1
        expect(newCard0Id).toBe(card2Id);
        expect(newCard1Id).toBe(card0Id);
        expect(newCard2Id).toBe(card1Id);
    });

    test('should move a card to the middle position within a column', async ({
        authenticatedPage
    }) => {
        await authenticatedPage.waitForBoardToLoad();

        // Add four cards to have a clear middle position
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);

        // Get the card IDs
        const card0 = authenticatedPage.getCardInColumn(0, 0);
        const card1 = authenticatedPage.getCardInColumn(0, 1);
        const card2 = authenticatedPage.getCardInColumn(0, 2);
        const card3 = authenticatedPage.getCardInColumn(0, 3);

        const card0Id = await card0.getAttribute('data-card-id');
        const card1Id = await card1.getAttribute('data-card-id');
        const card2Id = await card2.getAttribute('data-card-id');
        const card3Id = await card3.getAttribute('data-card-id');

        // Move the first card to the middle (position 2)
        await authenticatedPage.dragCardWithinColumn(0, 0, 2);
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify card count hasn't changed
        const cardCount = await authenticatedPage.getCardCountInColumn(0);
        expect(cardCount).toBe(4);

        // Get the new order by card IDs
        const newCard0 = authenticatedPage.getCardInColumn(0, 0);
        const newCard1 = authenticatedPage.getCardInColumn(0, 1);
        const newCard2 = authenticatedPage.getCardInColumn(0, 2);
        const newCard3 = authenticatedPage.getCardInColumn(0, 3);

        const newCard0Id = await newCard0.getAttribute('data-card-id');
        const newCard1Id = await newCard1.getAttribute('data-card-id');
        const newCard2Id = await newCard2.getAttribute('data-card-id');
        const newCard3Id = await newCard3.getAttribute('data-card-id');

        // After moving card0 to position 2, the order should be: card1, card2, card0, card3
        expect(newCard0Id).toBe(card1Id);
        expect(newCard1Id).toBe(card2Id);
        expect(newCard2Id).toBe(card0Id);
        expect(newCard3Id).toBe(card3Id);
    });

    test('should maintain card data after reordering within column', async ({
        authenticatedPage
    }) => {
        await authenticatedPage.waitForBoardToLoad();

        // Add two cards
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(2000);

        // Get the first card ID and title
        const firstCard = authenticatedPage.getCardInColumn(0, 0);
        await expect(firstCard).toBeVisible();

        const originalId = await firstCard.getAttribute('data-card-id');
        const originalTitle = await firstCard
            .locator('.slds-truncate span')
            .textContent();

        // Move the first card to the second position
        await authenticatedPage.dragCardWithinColumn(0, 0, 1);
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify the card is now at position 1 and has the same ID and title
        const movedCard = authenticatedPage.getCardInColumn(0, 1);
        const newId = await movedCard.getAttribute('data-card-id');
        const newTitle = await movedCard
            .locator('.slds-truncate span')
            .textContent();

        expect(newId).toBe(originalId);
        expect(newTitle).toBe(originalTitle);
        await expect(movedCard).toBeVisible();
    });
});
