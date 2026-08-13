import { test, expect, type BoardDataFixture } from '../fixtures';
import type { BoardPage } from '../pages';

const SF_TIMEOUT = 60_000;

// Verified against kanbanBoard.html/.js: buttons always carry
// class "topbar-icon-btn" (undoButtonClass/redoButtonClass) and a title
// starting with "Undo (" / "Redo (" (undoTooltip/redoTooltip).
const UNDO_BTN = 'button.topbar-icon-btn[title*="Undo"]';
const REDO_BTN = 'button.topbar-icon-btn[title*="Redo"]';

interface DragSource {
    dragCardId: string;
    sourceIndex: number;
    sourceColumnId: string;
    targetColumnId: string;
}

/**
 * Find the first column that has a card and at least `columnsAhead`
 * columns after it, so the card can be dragged forward that many times.
 */
async function findDragSource(
    boardPage: BoardPage,
    boardData: BoardDataFixture,
    columnsAhead: number = 1
): Promise<DragSource> {
    for (let i = 0; i + columnsAhead < boardData.columns.length; i++) {
        const count = await boardPage.cardCountInColumn(
            boardData.columns[i].Id
        );
        if (count > 0) {
            const dragCardId =
                (await boardPage
                    .columnWrapper(boardData.columns[i].Id)
                    .locator('article.kanban-card')
                    .first()
                    .getAttribute('data-card-id')) ?? '';
            return {
                dragCardId,
                sourceIndex: i,
                sourceColumnId: boardData.columns[i].Id,
                targetColumnId: boardData.columns[i + 1].Id
            };
        }
    }
    return {
        dragCardId: '',
        sourceIndex: -1,
        sourceColumnId: '',
        targetColumnId: ''
    };
}

function cardInColumn(boardPage: BoardPage, columnId: string, cardId: string) {
    return boardPage
        .columnWrapper(columnId)
        .locator(`article.kanban-card[data-card-id="${cardId}"]`);
}

test.describe('Undo / Redo', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('undo and redo buttons are visible', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        const redoBtn = boardPage.page.locator(REDO_BTN);

        await expect(undoBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(redoBtn).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('undo and redo buttons are disabled when stack is empty', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        const redoBtn = boardPage.page.locator(REDO_BTN);

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

        const { dragCardId, targetColumnId } = await findDragSource(
            boardPage,
            boardData
        );
        expect(dragCardId).toBeTruthy();

        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        const undoBtn = boardPage.page.locator(UNDO_BTN);
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

        const { dragCardId, sourceColumnId, targetColumnId } =
            await findDragSource(boardPage, boardData);
        expect(dragCardId).toBeTruthy();

        await boardPage.dragCardToColumn(dragCardId, targetColumnId);
        await expect(
            cardInColumn(boardPage, targetColumnId, dragCardId)
        ).toBeVisible({ timeout: SF_TIMEOUT });

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await undoBtn.click();

        await expect(
            cardInColumn(boardPage, sourceColumnId, dragCardId)
        ).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('redo restores card to target column after undo', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const { dragCardId, sourceColumnId, targetColumnId } =
            await findDragSource(boardPage, boardData);
        expect(dragCardId).toBeTruthy();

        // Drag card → undo → redo
        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await undoBtn.click();

        await expect(
            cardInColumn(boardPage, sourceColumnId, dragCardId)
        ).toBeVisible({ timeout: SF_TIMEOUT });

        const redoBtn = boardPage.page.locator(REDO_BTN);
        await expect(redoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
        await redoBtn.click();

        await expect(
            cardInColumn(boardPage, targetColumnId, dragCardId)
        ).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('undo is disabled after board refresh', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const { dragCardId, targetColumnId } = await findDragSource(
            boardPage,
            boardData
        );
        expect(dragCardId).toBeTruthy();

        await boardPage.dragCardToColumn(dragCardId, targetColumnId);

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });

        // loadBoardData clears the undo stack (kanbanBoard.js — "Clear
        // undo/redo history after load")
        await boardPage.refresh();
        await boardPage.waitForCards();

        await expect(undoBtn).toBeDisabled({ timeout: SF_TIMEOUT });
    });

    test('undo stack drains back to disabled after undoing all operations', async ({
        boardPage,
        boardData
    }) => {
        // MAX_UNDO_ENTRIES is 10 (kanbanStore/undo/undoManager.js). Filling
        // it with 11+ server-persisted drags is too slow for CI, so we assert
        // the bounded-stack drain: N operations → N undos → undo disabled.
        const DRAGS = 3;
        expect(boardData.columns.length).toBeGreaterThan(DRAGS);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const { dragCardId, sourceIndex } = await findDragSource(
            boardPage,
            boardData,
            DRAGS
        );
        expect(sourceIndex).toBeGreaterThanOrEqual(0);
        expect(dragCardId).toBeTruthy();

        const undoBtn = boardPage.page.locator(UNDO_BTN);
        const redoBtn = boardPage.page.locator(REDO_BTN);
        await expect(undoBtn).toBeDisabled({ timeout: SF_TIMEOUT });

        // Drag the same card forward through DRAGS consecutive columns,
        // waiting for each move to land before starting the next.
        for (let step = 1; step <= DRAGS; step++) {
            const targetColumnId = boardData.columns[sourceIndex + step].Id;
            await boardPage.dragCardToColumn(dragCardId, targetColumnId);
            await expect(
                cardInColumn(boardPage, targetColumnId, dragCardId)
            ).toBeVisible({ timeout: SF_TIMEOUT });
        }

        // Undo each drag; the card walks back one column per undo.
        for (let step = DRAGS - 1; step >= 0; step--) {
            await expect(undoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
            await undoBtn.click();
            await expect(
                cardInColumn(
                    boardPage,
                    boardData.columns[sourceIndex + step].Id,
                    dragCardId
                )
            ).toBeVisible({ timeout: SF_TIMEOUT });
        }

        // Stack fully drained — undo disabled again, redo available.
        await expect(undoBtn).toBeDisabled({ timeout: SF_TIMEOUT });
        await expect(redoBtn).toBeEnabled({ timeout: SF_TIMEOUT });
    });
});
