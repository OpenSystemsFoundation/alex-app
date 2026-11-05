import { test, expect } from '../fixtures';
import { sfUpdate } from '../helpers/sf-data';
import { BoardPage } from '../pages';

const SF_TIMEOUT = 60_000;

test.describe('Alex Kanban Board', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('board record page loads the kanban component', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.boardWrapper).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('board displays all 6 columns', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.columns.first()).toBeVisible({
            timeout: SF_TIMEOUT
        });
        expect(await boardPage.columns.count()).toBe(6);
    });

    test('cards appear on the board', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        await expect(boardPage.card(boardData.cards[0].Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('card links contain the record id', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        await expect(boardPage.cardLink(boardData.cards[0].Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('drag card between columns', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        expect(boardData.columns.length).toBeGreaterThanOrEqual(2);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find the first non-last column that has a card
        let sourceColIdx = -1;
        let dragCardId = '';
        for (let i = 0; i < boardData.columns.length - 1; i++) {
            const count = await boardPage.cardCountInColumn(
                boardData.columns[i].Id
            );
            if (count > 0) {
                sourceColIdx = i;
                dragCardId =
                    (await boardPage
                        .columnWrapper(boardData.columns[i].Id)
                        .locator('article.kanban-card')
                        .first()
                        .getAttribute('data-card-id')) ?? '';
                break;
            }
        }
        expect(
            sourceColIdx,
            'Expected at least one non-last column to contain cards'
        ).toBeGreaterThanOrEqual(0);

        const targetIdx = sourceColIdx + 1;
        await boardPage.dragCardToColumn(
            dragCardId,
            boardData.columns[targetIdx].Id
        );

        const movedCard = boardPage
            .columnWrapper(boardData.columns[targetIdx].Id)
            .locator(`article[data-card-id="${dragCardId}"]`);
        await expect(movedCard).toBeVisible({ timeout: 15_000 });
    });

    test('backend update reflects in browser after refresh', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const card = boardPage.card(boardData.cards[0].Id);
        await expect(card).toBeVisible({ timeout: SF_TIMEOUT });

        const newSubject = `E2E-Updated-${Date.now()}`;
        sfUpdate(
            'OpenSF__Card__c',
            boardData.cards[0].Id,
            `OpenSF__Subject__c=${newSubject}`
        );

        await boardPage.refresh();
        await expect(card).toContainText(newSubject, { timeout: 15_000 });
    });

    test('board tab and backlog tab switching', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        await expect(boardPage.backlogTab).toBeVisible({ timeout: SF_TIMEOUT });
        await boardPage.switchToBacklogTab();
        await expect(boardPage.boardGrid).not.toBeVisible({
            timeout: SF_TIMEOUT
        });

        await boardPage.switchToBoardTab();
        await expect(boardPage.boardGrid).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('add card button creates a new card', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const colId = boardData.columns[0].Id;
        const beforeCount = await boardPage.cardCountInColumn(colId);

        await boardPage.addCard(0);

        await expect(
            boardPage.columnWrapper(colId).locator('article.kanban-card')
        ).toHaveCount(beforeCount + 1, { timeout: 15_000 });
    });

    test('search filter works', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        // Use the last card — earlier tests may have modified cards[0]'s subject
        const searchCard = boardData.cards[boardData.cards.length - 1];

        await expect(boardPage.searchInput).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await boardPage.search(searchCard.Subject);

        // Wait for search debounce to settle before asserting
        await boardPage.page.waitForTimeout(500);

        await expect(boardPage.card(searchCard.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('board loads in Standard app (non-console)', async ({
        boardPage,
        boardData
    }) => {
        // Navigate via the Standard app URL instead of Console
        await boardPage.goto(
            `${boardData.baseUrl}/lightning/app/OpenSF__Alex/r/OpenSF__Board__c/${boardData.boardId}/view`
        );
        await boardPage.waitForComponent('.kanban-board-wrapper');

        await expect(boardPage.boardWrapper).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect(boardPage.columns.first()).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('board loads in the Alex Console app', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.goto(
            `${boardData.baseUrl}/lightning/app/OpenSF__AlexConsole/r/OpenSF__Board__c/${boardData.boardId}/view`
        );
        await boardPage.waitForComponent('.kanban-board-wrapper');

        await expect(boardPage.columns).toHaveCount(boardData.columns.length, {
            timeout: SF_TIMEOUT
        });
        await expect(boardPage.card(boardData.cards[0].Id)).toBeVisible();
        // Console navigation opens the board in a workspace tab
        await expect(
            boardPage.page.getByRole('tab', { name: /e2e-/ }).first()
        ).toBeVisible();
    });

    test('an idle board stays real-time and still receives changes', async ({
        boardPage,
        boardData
    }) => {
        // The board used to treat about a minute without events as a broken
        // connection and fall back to polling
        test.setTimeout(240_000);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();
        await boardPage.waitForRealtime();

        // Stay idle for longer than the old threshold (two 30 s checks)
        await boardPage.page.waitForTimeout(75_000);
        const status = boardPage.page.locator('.kanban-topbar .status-text');
        await expect(status).toHaveText('Real-time');

        // A change made elsewhere arrives live, without a refresh
        const card = boardData.cards[boardData.cards.length - 1];
        const subject = `Idle-Live-${Date.now()}`;
        sfUpdate('OpenSF__Card__c', card.Id, `OpenSF__Subject__c=${subject}`);
        await expect(boardPage.card(card.Id)).toContainText(subject, {
            timeout: 30_000
        });
        await expect(status).toHaveText('Real-time');
    });

    test('a card moved in one tab moves in another tab without a refresh', async ({
        boardPage,
        boardData
    }) => {
        const tabB = new BoardPage(await boardPage.page.context().newPage());
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await tabB.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();
        await tabB.waitForCards();
        await boardPage.waitForRealtime();
        await tabB.waitForRealtime();

        // Use a seeded card that no sibling test moves
        const card = boardData.cards[2];
        const target = boardData.columns[4];
        await boardPage.card(card.Id).click({ button: 'right' });
        const menu = boardPage.page.locator('.context-menu[role="menu"]');
        await menu.getByRole('menuitem', { name: 'Move to Column' }).click();
        await menu
            .getByRole('menuitem', { name: target.header, exact: true })
            .click();

        await expect(
            tabB
                .columnWrapper(target.Id)
                .locator(`article[data-card-id="${card.Id}"]`)
        ).toBeVisible({ timeout: 30_000 });
    });
});
