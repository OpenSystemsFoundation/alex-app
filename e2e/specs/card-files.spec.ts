import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Card File Attachments', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('files section is visible in card panel', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Files section header should be visible
        const filesHeader = panel.locator('.card-panel__files h3');
        await expect(filesHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(filesHeader).toContainText('Files');
    });

    test('files section shows upload component', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // File upload component should be present
        const fileUpload = panel.locator('lightning-file-upload');
        await expect(fileUpload).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('files section shows "No files attached" when empty', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Should show "No files attached" for a fresh card
        const noFilesMsg = panel.locator(
            '.card-panel__files p.slds-text-color_weak'
        );
        await expect(noFilesMsg).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(noFilesMsg).toContainText('No files attached');
    });

    test('files section can be collapsed and expanded', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const fileUpload = panel.locator('lightning-file-upload');
        await expect(fileUpload).toBeVisible({ timeout: SF_TIMEOUT });

        // Click the toggle button to collapse
        const toggleBtn = panel.locator(
            '.card-panel__files button[title="Toggle files section"]'
        );
        await toggleBtn.click();

        // Upload should now be hidden
        await expect(fileUpload).not.toBeVisible({ timeout: 5_000 });

        // Click again to expand
        await toggleBtn.click();
        await expect(fileUpload).toBeVisible({ timeout: 5_000 });
    });

    test('switching cards reloads the files section', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Open first card
        const firstCardId = boardData.cards[0].Id;
        await boardPage.card(firstCardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const noFilesMsg = panel.locator(
            '.card-panel__files p.slds-text-color_weak'
        );
        await expect(noFilesMsg).toBeVisible({ timeout: SF_TIMEOUT });

        // Open second card
        const secondCardId = boardData.cards[1].Id;
        await boardPage
            .card(secondCardId)
            .locator('.kanban-card__body')
            .click();

        // Files section should still be present for the new card
        const filesHeader = panel.locator('.card-panel__files h3');
        await expect(filesHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(filesHeader).toContainText('Files');
    });
});
