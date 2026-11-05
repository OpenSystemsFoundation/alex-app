import { test, expect } from '../fixtures';
import { seedCard, sfQuery } from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

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

    test('uploading a file attaches it to the card', async ({
        boardPage,
        boardData
    }) => {
        const card = seedCard({
            boardId: boardData.boardId,
            columnId: boardData.columns[2].Id,
            status: boardData.columns[2].header,
            subject: `Files-Upload-${Date.now()}`
        });
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();
        await boardPage.card(card.Id).locator('.kanban-card__body').click();
        const panel = boardPage.page.locator('.card-panel');
        await expect(panel.getByText('No files attached')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        const fileName = `e2e-notes-${Date.now()}.txt`;
        await panel
            .locator('lightning-file-upload input[type="file"]')
            .setInputFiles({
                name: fileName,
                mimeType: 'text/plain',
                buffer: Buffer.from('Alex E2E upload')
            });
        // lightning-file-upload reports progress in its own dialog
        const uploadDialog = boardPage.page.getByRole('dialog', {
            name: 'Upload Files'
        });
        await uploadDialog
            .getByRole('button', { name: 'Done' })
            .click({ timeout: SF_TIMEOUT });

        const title = fileName.replace(/\.txt$/, '');
        await expect(
            panel.locator('.card-file-item', { hasText: title })
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panel.getByText('No files attached')).toHaveCount(0);
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT ContentDocument.Title FROM ContentDocumentLink WHERE LinkedEntityId = '${card.Id}'`
                    ).map((r) => r.ContentDocument.Title),
                { timeout: 45_000, intervals: [2_000, 3_000, 5_000] }
            )
            .toEqual([title]);
    });
});
