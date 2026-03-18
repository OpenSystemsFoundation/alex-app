import { test, expect } from '../fixtures/test-fixtures';

/**
 * E2E Test for Dragging Cards Between Columns
 *
 * Simple test: Add a card to column 0, drag it to column 1, verify it moved
 *
 * Each test gets its own isolated board that is automatically cleaned up.
 */
test.describe('Kanban Board - Drag Card to Another Column', () => {
    test('should drag a card from column 0 to column 1', async ({
        authenticatedPage,
        testBoard,
        sfCli
    }) => {
        await authenticatedPage.waitForBoardToLoad();

        // Get initial card counts
        const initialCountCol0 =
            await authenticatedPage.getCardCountInColumn(0);
        const initialCountCol1 =
            await authenticatedPage.getCardCountInColumn(1);

        // Create one card via Apex in column 0
        const columnId = testBoard.columnIds[0];
        await sfCli.createTestCards(columnId, 1);
        await authenticatedPage.page.reload();
        await authenticatedPage.waitForBoardToLoad();
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify card was added to column 0
        const countAfterAdd = await authenticatedPage.getCardCountInColumn(0);
        expect(countAfterAdd).toBe(initialCountCol0 + 1);

        // Get the card that was just added (first card in column 0)
        const card = authenticatedPage.getCardsInColumn(0).first();
        await expect(card).toBeVisible();

        // Get the card's name for verification later
        const cardNameElement = card.locator('.slds-truncate span');
        const cardName = await cardNameElement.textContent();

        // Drag the card from column 0 to column 1
        await authenticatedPage.dragCardToColumn(0, 0, 1);
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify card counts updated
        const finalCountCol0 = await authenticatedPage.getCardCountInColumn(0);
        const finalCountCol1 = await authenticatedPage.getCardCountInColumn(1);

        expect(finalCountCol0).toBe(initialCountCol0); // Back to original count
        expect(finalCountCol1).toBe(initialCountCol1 + 1); // Increased by 1

        // Verify the card is now visible in column 1 by finding its name
        const cardInColumn1 = authenticatedPage.page.getByText(cardName!);
        await expect(cardInColumn1).toBeVisible();
    });
});
