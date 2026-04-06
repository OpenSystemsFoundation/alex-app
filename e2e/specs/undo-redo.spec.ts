import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Undo / Redo', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('undo and redo buttons are always visible (no DevTools required)', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        const redoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Redo"]'
        );

        await expect(undoBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(redoBtn).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('undo and redo buttons are disabled when stack is empty', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        const redoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Redo"]'
        );

        await expect(undoBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(undoBtn).toBeDisabled();
        await expect(redoBtn).toBeDisabled();
    });

    test('undo button enables after dragging a card', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find a column with a card and the next column as target
        let dragCardId = '';
        let targetColumnId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await boardPage.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                dragCardId =
                    (await boardPage
                        .columnWrapper(boardData.columns[i].Id)
                        .locator('article.kanban-card')
                        .first()
                        .getAttribute('data-card-id')) ?? '';
                targetColumnId = boardData.columns[i + 1].Id;
                break;
            }
        }
        expect(dragCardId).toBeTruthy();

        // Drag card to the next column
        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        // Undo button should become enabled
        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
    });

    test('undo moves card back to original column', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find source column with cards
        let dragCardId = '';
        let sourceColumnId = '';
        let targetColumnId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await boardPage.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                sourceColumnId = boardData.columns[i].Id;
                dragCardId =
                    (await boardPage
                        .columnWrapper(sourceColumnId)
                        .locator('article.kanban-card')
                        .first()
                        .getAttribute('data-card-id')) ?? '';
                targetColumnId = boardData.columns[i + 1].Id;
                break;
            }
        }
        expect(dragCardId).toBeTruthy();

        // Drag card to the next column
        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        // Verify card is now in target column
        const cardInTarget = boardPage
            .columnWrapper(targetColumnId)
            .locator(`article.kanban-card[data-card-id="${dragCardId}"]`);
        await expect(cardInTarget).toBeVisible({ timeout: SF_TIMEOUT });

        // Click undo
        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await undoBtn.click();

        // Card should move back to source column
        const cardInSource = boardPage
            .columnWrapper(sourceColumnId)
            .locator(`article.kanban-card[data-card-id="${dragCardId}"]`);
        await expect(cardInSource).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('redo restores card to target column after undo', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find source column with cards
        let dragCardId = '';
        let sourceColumnId = '';
        let targetColumnId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await boardPage.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                sourceColumnId = boardData.columns[i].Id;
                dragCardId =
                    (await boardPage
                        .columnWrapper(sourceColumnId)
                        .locator('article.kanban-card')
                        .first()
                        .getAttribute('data-card-id')) ?? '';
                targetColumnId = boardData.columns[i + 1].Id;
                break;
            }
        }
        expect(dragCardId).toBeTruthy();

        // Drag card → undo → redo
        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await undoBtn.click();

        // Wait for card to be back in source
        const cardInSource = boardPage
            .columnWrapper(sourceColumnId)
            .locator(`article.kanban-card[data-card-id="${dragCardId}"]`);
        await expect(cardInSource).toBeVisible({ timeout: SF_TIMEOUT });

        // Redo should now be enabled
        const redoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Redo"]'
        );
        await expect(redoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await redoBtn.click();

        // Card should be back in target column
        const cardInTarget = boardPage
            .columnWrapper(targetColumnId)
            .locator(`article.kanban-card[data-card-id="${dragCardId}"]`);
        await expect(cardInTarget).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('undo is disabled after board refresh', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Drag card to create an undo entry
        let dragCardId = '';
        let targetColumnId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await boardPage.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                dragCardId =
                    (await boardPage
                        .columnWrapper(boardData.columns[i].Id)
                        .locator('article.kanban-card')
                        .first()
                        .getAttribute('data-card-id')) ?? '';
                targetColumnId = boardData.columns[i + 1].Id;
                break;
            }
        }
        expect(dragCardId).toBeTruthy();

        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });

        // Refresh the board
        await boardPage.refresh();
        await boardPage.waitForCards();

        // Undo stack should be cleared after refresh
        await expect(undoBtn).toBeDisabled({ timeout: SF_TIMEOUT });
    });
});
