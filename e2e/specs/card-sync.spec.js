// @ts-check
const { test, expect } = require('../fixtures/multi-user');

/**
 * Multi-user card synchronization tests.
 * Verifies that card operations by User A appear in real-time on User B's screen.
 */

const SYNC_TIMEOUT = 15_000;

test.describe('Card Sync — real-time collaboration', () => {
    test.beforeEach(async () => {
        if (!process.env.USER_A_LOGIN_URL || !process.env.USER_B_LOGIN_URL) {
            test.skip(true, 'Multi-user login URLs not set — skipping');
        }
    });

    test('card created by User A appears on User B screen', async ({
        userA,
        userB,
        boardData
    }) => {
        expect(boardData.columns.length).toBeGreaterThan(0);

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);
        await userA.board.waitForCards();
        await userB.board.waitForCards();

        const colId = boardData.columns[0].Id;
        const beforeCountB = await userB.board.cardCountInColumn(colId);

        // User A adds a card
        await userA.board.addCard(0);

        // User A sees it immediately (optimistic update)
        await expect(
            userA.board.columnWrapper(colId).locator('article.kanban-card')
        ).toHaveCount(beforeCountB + 1, { timeout: SYNC_TIMEOUT });

        // User B sees it via platform event
        await expect(
            userB.board.columnWrapper(colId).locator('article.kanban-card')
        ).toHaveCount(beforeCountB + 1, { timeout: SYNC_TIMEOUT });
    });

    test('card subject edited by User A updates on User B screen', async ({
        userA,
        userB,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);
        await userA.board.waitForCards();
        await userB.board.waitForCards();

        const cardId = boardData.cards[0].Id;

        // Verify both users see the card
        await expect(userA.board.card(cardId)).toBeVisible({
            timeout: SYNC_TIMEOUT
        });
        await expect(userB.board.card(cardId)).toBeVisible({
            timeout: SYNC_TIMEOUT
        });

        // User A clicks the card to open it, edits the subject
        await userA.board.cardLink(cardId).click();

        // Wait for the record page to load, then navigate back
        await userA.page.waitForURL('**/OpenSF__Card__c/**', {
            timeout: SYNC_TIMEOUT
        });

        // Navigate User A back to the board to verify sync
        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userA.board.waitForCards();

        // Both users should still see the card
        await expect(userA.board.card(cardId)).toBeVisible({
            timeout: SYNC_TIMEOUT
        });
        await expect(userB.board.card(cardId)).toBeVisible({
            timeout: SYNC_TIMEOUT
        });
    });
});
