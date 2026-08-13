import { test, expect } from '../fixtures/multi-user';
import { sfUpdate } from '../helpers/sf-data';

/**
 * Multi-user card synchronization tests.
 * Each test creates its own isolated board — no shared state.
 */

const SYNC_TIMEOUT = 30_000;

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

        // User A adds a card to the first column
        await userA.board.addCard(0);

        // User A sees it immediately (optimistic update)
        await expect(
            userA.page.locator('article.kanban-card:has-text("New Card")')
        ).toBeVisible({ timeout: SYNC_TIMEOUT });

        // User B sees the new card via platform event — no refresh fallback;
        // this test intentionally fails if platform events are down.
        await expect(
            userB.page.locator('article.kanban-card:has-text("New Card")')
        ).toBeVisible({ timeout: SYNC_TIMEOUT });
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

        // User A edits the subject via the API (CLI runs as User A's org user);
        // CardTriggerHandler publishes a CARD_UPDATE platform event.
        const newSubject = `E2E-Sync-Edit-${Date.now()}`;
        sfUpdate('OpenSF__Card__c', cardId, `OpenSF__Subject__c=${newSubject}`);

        // User B receives the update via platform event — no refresh fallback;
        // this test intentionally fails if platform events are down.
        await expect(userB.board.card(cardId)).toContainText(newSubject, {
            timeout: SYNC_TIMEOUT
        });

        // User A's board rides the same event pipeline (the edit came from
        // the API, not this browser window, so it is not an optimistic update)
        await expect(userA.board.card(cardId)).toContainText(newSubject, {
            timeout: SYNC_TIMEOUT
        });
    });
});
