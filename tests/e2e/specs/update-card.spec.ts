import { test, expect } from '../fixtures/test-fixtures-scratch';

/**
 * E2E Tests for Updating Cards in Kanban Board
 *
 * Tests cover:
 * - Adding a card via UI
 * - Opening card detail modal
 * - Updating card subject field
 * - Saving changes
 * - Verifying the card name is updated on the board
 */
test.describe('Kanban Board - Update Card', () => {
    // Clean up all cards after each test
    test.afterEach(async ({ authenticatedPage, orgInfo }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();
        await authenticatedPage.deleteAllCardsViaApi();
    });

    test('should update card subject and save through the modal', async ({
        authenticatedPage,
        orgInfo
    }) => {
        await authenticatedPage.goto(orgInfo.boardId);
        await authenticatedPage.waitForBoardToLoad();

        // Get initial card count (should be 0 in new board)
        const initialCount = await authenticatedPage.getCardCountInColumn(0);

        // Add one card to update
        await authenticatedPage.clickAddCard(0);
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify card was added
        const countAfterAdd = await authenticatedPage.getCardCountInColumn(0);
        expect(countAfterAdd).toBe(initialCount + 1);

        // Get the card element
        const card = authenticatedPage.getCardsInColumn(0).first();
        await expect(card).toBeVisible();

        // Get the original card name from the card element
        const cardNameElement = card.locator('.slds-truncate span');
        const originalCardName = await cardNameElement.textContent();

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
        expect(modalCardName).toBe(originalCardName);

        // Find the Subject input field by name attribute
        const subjectInput = modal.locator('input[name="OpenSF__Subject__c"]');
        await expect(subjectInput).toBeVisible();

        // Clear and fill with new value
        await subjectInput.click();
        await subjectInput.fill('');

        // Enter new subject
        const newSubject = `Updated Card ${Date.now()}`;
        await subjectInput.fill(newSubject);

        // Click the Save button by its text
        const saveButton = modal.getByText('Save');
        await expect(saveButton).toBeVisible();
        await saveButton.click();

        // Wait for save to complete and modal to close
        await authenticatedPage.page.waitForTimeout(3000);

        // Verify modal is closed
        await expect(modalTitle).not.toBeVisible();

        // Verify card count is still the same
        const finalCount = await authenticatedPage.getCardCountInColumn(0);
        expect(finalCount).toBe(countAfterAdd);

        // Verify the Subject was updated on the card in the board
        const updatedSubjectText = authenticatedPage.page.getByText(newSubject);
        await expect(updatedSubjectText).toBeVisible();
    });
});
