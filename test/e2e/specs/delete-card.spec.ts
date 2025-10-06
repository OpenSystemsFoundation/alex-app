import { test, expect } from '../fixtures/test-fixtures';

/**
 * E2E Tests for Deleting Cards from Kanban Board
 *
 * Tests cover:
 * - Clicking on a card to open modal
 * - Confirming modal opens
 * - Clicking delete button (changes to "Confirm?")
 * - Clicking confirm button to delete
 * - Verifying card is removed from UI
 * - Verifying column count updates
 *
 * Delete workflow:
 * 1. Click card -> Modal opens
 * 2. Click "Delete" button -> Button changes to "Confirm?" (destructive variant)
 * 3. Click "Confirm?" button -> Card is deleted, modal closes
 *
 * Each test gets its own isolated board that is automatically cleaned up.
 */
test.describe('Kanban Board - Delete Card', () => {
    test('should delete a card using the modal delete workflow', async ({
        authenticatedPage,
        testBoard,
        sfCli
    }) => {
        await authenticatedPage.waitForBoardToLoad();

        // Get initial card count (should be 0 in new board)
        const initialCount = await authenticatedPage.getCardCountInColumn(0);

        // Create one card via Apex
        const columnId = testBoard.columnIds[0];
        await sfCli.createTestCards(columnId, 1);
        await authenticatedPage.page.reload();
        await authenticatedPage.waitForBoardToLoad();
        await authenticatedPage.page.waitForTimeout(2000);

        // Verify card was added
        const countAfterAdd = await authenticatedPage.getCardCountInColumn(0);
        expect(countAfterAdd).toBe(initialCount + 1);

        // Get the card element
        const card = authenticatedPage.getCardsInColumn(0).first();
        await expect(card).toBeVisible();

        // Get the card name from the card element
        const cardNameElement = card.locator('.slds-truncate span');
        const cardName = await cardNameElement.textContent();

        // Click on the card to open the modal
        await authenticatedPage.clickCard(card);
        await authenticatedPage.page.waitForTimeout(1000);

        // Verify modal is open by checking if modal title is visible
        const modal = authenticatedPage.getCardDetailModal();
        const modalTitle = modal.locator(
            '.slds-modal__title span.slds-text-color_brand'
        );
        await expect(modalTitle).toBeVisible();

        // Verify the modal shows the same card name
        const modalCardName = await modalTitle.textContent();
        expect(modalCardName).toBe(cardName);

        // Find the delete button in the modal footer - it's the first button
        const modalFooter = modal.locator('.slds-modal__footer');
        const deleteButton = modalFooter.locator('button').first();
        await expect(deleteButton).toBeVisible();

        // Click the Delete button (first time)
        await deleteButton.click();
        await authenticatedPage.page.waitForTimeout(1000);

        // After clicking, verify the button text changed to "Confirm?"
        const buttonTextAfterClick = await deleteButton.innerText();
        expect(buttonTextAfterClick).toContain('Confirm');

        // Click the button again (second time) to confirm deletion
        await deleteButton.click();
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify modal is closed (modal title is no longer visible)
        await expect(modalTitle).not.toBeVisible();

        // Verify card count is back to initial count
        const finalCount = await authenticatedPage.getCardCountInColumn(0);
        expect(finalCount).toBe(initialCount);
    });
});
