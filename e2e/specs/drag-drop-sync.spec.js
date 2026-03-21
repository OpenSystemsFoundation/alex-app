// @ts-check
const { test, expect } = require('../fixtures/multi-user');

/**
 * Multi-user drag-and-drop synchronization tests.
 * Verifies that card moves by one user appear in real-time for the other.
 */

const SYNC_TIMEOUT = 30_000;
const SF_TIMEOUT = 45_000;

test.describe.serial('Drag & Drop Sync — real-time collaboration', () => {
    test.beforeEach(async () => {
        if (!process.env.USER_A_LOGIN_URL || !process.env.USER_B_LOGIN_URL) {
            test.skip(true, 'Multi-user login URLs not set — skipping');
        }
    });

    test('card moved by User A updates column on User B screen', async ({
        userA,
        userB,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);
        await userA.board.waitForCards();
        await userB.board.waitForCards();

        // Find a card in a non-last column on User A's screen
        let sourceColIdx = -1;
        let dragCardId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await userA.board.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                sourceColIdx = i;
                dragCardId = await userA.board
                    .columnWrapper(boardData.columns[i].Id)
                    .locator('article.kanban-card')
                    .first()
                    .getAttribute('data-card-id');
                break;
            }
        }
        expect(sourceColIdx).toBeGreaterThanOrEqual(0);

        const targetColId = boardData.columns[sourceColIdx + 1].Id;

        // Verify User B sees the card in the source column
        await expect(userB.board.card(dragCardId)).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // User A drags the card to the next column
        await userA.board.dragCardToColumn(dragCardId, targetColId);

        // User A sees it in the target column (optimistic)
        await expect(
            userA.board
                .columnWrapper(targetColId)
                .locator(`article[data-card-id="${dragCardId}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });

        // User B sees the card in the new column via platform event
        await expect(
            userB.board
                .columnWrapper(targetColId)
                .locator(`article[data-card-id="${dragCardId}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });
    });

    test('simultaneous moves by both users do not conflict', async ({
        userA,
        userB,
        boardData
    }) => {
        // Need at least 2 cards and 3 columns
        expect(boardData.cards.length).toBeGreaterThanOrEqual(2);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(3);

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);
        await userA.board.waitForCards();
        await userB.board.waitForCards();

        // Find two different cards
        const cardsInCol0 = [];
        for (let i = 0; i < boardData.columns.length - 2; i++) {
            const col = userA.board.columnWrapper(boardData.columns[i].Id);
            const cards = await col.locator('article.kanban-card').all();
            for (const card of cards) {
                const id = await card.getAttribute('data-card-id');
                cardsInCol0.push({ id, colIdx: i });
                if (cardsInCol0.length >= 2) break;
            }
            if (cardsInCol0.length >= 2) break;
        }
        expect(cardsInCol0.length).toBeGreaterThanOrEqual(2);

        const cardA = cardsInCol0[0];
        const cardB = cardsInCol0[1];
        const targetA = boardData.columns[cardA.colIdx + 1].Id;
        const targetB = boardData.columns[cardB.colIdx + 1].Id;

        // Both users drag different cards simultaneously
        await Promise.all([
            userA.board.dragCardToColumn(cardA.id, targetA),
            userB.board.dragCardToColumn(cardB.id, targetB)
        ]);

        // Both cards should end up in their target columns for both users
        await expect(
            userA.board
                .columnWrapper(targetA)
                .locator(`article[data-card-id="${cardA.id}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });

        await expect(
            userA.board
                .columnWrapper(targetB)
                .locator(`article[data-card-id="${cardB.id}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });

        await expect(
            userB.board
                .columnWrapper(targetA)
                .locator(`article[data-card-id="${cardA.id}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });

        await expect(
            userB.board
                .columnWrapper(targetB)
                .locator(`article[data-card-id="${cardB.id}"]`)
        ).toBeVisible({ timeout: SYNC_TIMEOUT });
    });
});
