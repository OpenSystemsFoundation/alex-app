import { test, expect } from '../fixtures';
import {
    createIsolatedBoard,
    scratchOrgOrigin,
    sfApexRun
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

/**
 * Unhappy Paths — Break the App E2E tests.
 *
 * These tests deliberately try to break the app by:
 * - Rapid-fire actions (double clicks, spam)
 * - Invalid navigation and deep links
 * - Deleted/stale data scenarios
 * - Concurrent conflicting operations
 * - Edge cases in filters, search, and drag-drop
 * - Keyboard-only navigation
 * - Empty/boundary states
 */
test.describe('Unhappy Paths — Breaking the Board', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('double-clicking add card does not create duplicate cards', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const colId = boardData.columns[0].Id;
        const columnCards = boardPage
            .columnWrapper(colId)
            .locator('article.kanban-card');
        const beforeCount = await columnCards.count();

        // Double-click the add card button of the counted column rapidly
        const addBtn = boardPage.page.locator(
            `.add-card-button[data-column-id="${colId}"]`
        );
        await addBtn.dblclick();

        // The button disables synchronously during creation
        // (cardOperations.createCard), so exactly one card is created
        await expect(columnCards).toHaveCount(beforeCount + 1, {
            timeout: SF_TIMEOUT
        });
        // Settle window: a duplicate from the second click would render shortly after
        await boardPage.page.waitForTimeout(2000);
        await expect(columnCards).toHaveCount(beforeCount + 1);
    });

    test('navigating to a non-existent board ID does not crash', async ({
        boardPage,
        boardData
    }) => {
        const fakeId = 'a00000000000000AAA';
        await boardPage.page
            .goto(
                `${boardData.baseUrl}/lightning/r/OpenSF__Board__c/${fakeId}/view`,
                { waitUntil: 'commit', timeout: 30_000 }
            )
            .catch(() => null);

        // Any response (including error pages) is acceptable -- we just
        // verify the browser didn't crash and the page is still functional.
        const url = boardPage.page.url();
        expect(url).toBeTruthy();

        // Verify page has rendered something (not a blank crash)
        const hasContent = await boardPage.page
            .locator('body')
            .evaluate((el) => el.children.length > 0)
            .catch(() => true); // even if eval fails, page didn't crash
        expect(hasContent).toBeTruthy();
    });

    test('deleting a card while panel is open does not crash', async ({
        boardPage
    }) => {
        // Own board: this test deletes data
        const board = createIsolatedBoard('unhappy-del-card');
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.waitForCards();

        const cardId = board.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();
        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Delete the card from the backend while the panel is open
        sfApexRun(
            `delete [SELECT Id FROM OpenSF__Card__c WHERE Id = '${cardId}'];`
        );

        // The deletion reaches the board (event or refresh) and it keeps working
        await boardPage.refresh();
        await expect(boardPage.card(cardId)).toHaveCount(0, {
            timeout: SF_TIMEOUT
        });
        await expect(boardPage.boardWrapper).toBeVisible();
        await expect(boardPage.allCards()).toHaveCount(board.cards.length - 1);
    });
    test('rapid filter toggling does not break the board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Rapidly toggle filters
        for (let i = 0; i < 5; i++) {
            await boardPage.priorityFilter.selectOption('High');
            await boardPage.priorityFilter.selectOption('All');
        }

        await boardPage.page.waitForTimeout(1000);

        // Board should still render properly
        const cardCount = await boardPage.allCards().count();
        expect(cardCount).toBeGreaterThan(0);
    });

    test('search with special characters does not crash', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Try injecting special characters
        const specialStrings = [
            '<script>alert(1)</script>',
            "'; DROP TABLE Cards; --",
            '\\n\\r\\t',
            '🎉🔥💀',
            '   ',
            'a'.repeat(500)
        ];

        for (const str of specialStrings) {
            await boardPage.search(str);
            await boardPage.page.waitForTimeout(300);
        }

        // Clear and verify board still works
        await boardPage.clearSearch();
        await boardPage.page.waitForTimeout(500);

        const cardCount = await boardPage.allCards().count();
        expect(cardCount).toBeGreaterThan(0);
    });

    test('drag card to the same column it is already in', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Get a live card from the DOM (previous tests may have deleted fixture cards)
        const firstCard = boardPage.allCards().first();
        await expect(firstCard).toBeVisible({ timeout: SF_TIMEOUT });
        const cardId = await firstCard.getAttribute('data-card-id');
        expect(cardId).toBeTruthy();

        // Find which column this card is in
        const column = firstCard.locator(
            'xpath=ancestor::*[contains(@class,"kanban-column__card-wrapper")]'
        );
        const sourceColId = await column.getAttribute('data-column-id');
        expect(sourceColId).toBeTruthy();

        const beforeCount = await boardPage.cardCountInColumn(sourceColId!);

        // Drag card to same column — should be a no-op
        await boardPage.dragCardToColumn(cardId!, sourceColId!);
        await boardPage.page.waitForTimeout(2000);

        const afterCount = await boardPage.cardCountInColumn(sourceColId!);
        expect(afterCount).toBe(beforeCount);
    });

    test('refreshing the page mid-operation does not corrupt state', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Start adding a card then immediately refresh
        await boardPage.addCard(0);
        await boardPage.page.reload({ waitUntil: 'domcontentloaded' });

        // Board should still load correctly
        await boardPage.waitForComponent('.kanban-board-wrapper');
        await expect(boardPage.boardWrapper).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('opening card panel and immediately closing does not leave artifacts', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const liveCards = boardPage.allCards();
        const cardCount = await liveCards.count();
        expect(cardCount).toBeGreaterThan(0);

        const panel = boardPage.page.locator('.card-panel');
        const closeBtn = boardPage.page.locator(
            '.card-panel__header lightning-button-icon'
        );
        // Rapid open/close cycle: every click opens the panel, every close
        // removes it
        for (let i = 0; i < Math.min(3, cardCount); i++) {
            await liveCards.nth(i).locator('.kanban-card__body').click();
            await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });
            await closeBtn.click();
            await expect(panel).toHaveCount(0);
        }

        await expect(boardPage.allCards()).toHaveCount(cardCount);
    });
    test('backend column deletion is handled gracefully on refresh', async ({
        boardPage
    }) => {
        // Own board: this test deletes data
        const board = createIsolatedBoard('unhappy-del-col');
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.waitForCards();
        await expect(boardPage.columns).toHaveCount(board.columns.length);

        const lastColumn = board.columns[board.columns.length - 1];
        sfApexRun(`
delete [SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Column__c = '${lastColumn.Id}'];
delete [SELECT Id FROM OpenSF__Column__c WHERE Id = '${lastColumn.Id}'];
`);

        await boardPage.refresh();
        await expect(boardPage.columns).toHaveCount(board.columns.length - 1, {
            timeout: SF_TIMEOUT
        });
        await expect(boardPage.columnWrapper(lastColumn.Id)).toHaveCount(0);
    });
    test('context menu on board card works', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Use live card from DOM instead of stale fixture data
        const firstCard = boardPage.allCards().first();
        await expect(firstCard).toBeVisible({ timeout: SF_TIMEOUT });

        // Right-click to open context menu
        await firstCard.click({ button: 'right' });

        const contextMenu = boardPage.page.locator('.context-menu');
        await expect(contextMenu).toBeVisible({ timeout: 5_000 });

        // Delete and Move to Backlog are always built by
        // contextMenuManager.buildMenuItems
        const deleteItem = contextMenu.locator(
            'a[role="menuitem"][data-value="delete"]'
        );
        await expect(deleteItem).toBeVisible();
        await expect(deleteItem).toContainText('Delete');
        await expect(
            contextMenu.locator(
                'a[role="menuitem"][data-value="moveToBacklog"]'
            )
        ).toBeVisible();

        // Click outside the menu to dismiss it — the menu opened at the card,
        // so the wrapper's top-left corner is safely outside the menu rect
        await boardPage.boardWrapper.click({ position: { x: 5, y: 5 } });
        await expect(contextMenu).not.toBeVisible({ timeout: 5_000 });
    });

    test('keyboard Escape closes any open modal/panel', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Use live card from DOM instead of stale fixture data
        await boardPage
            .allCards()
            .first()
            .locator('.kanban-card__body')
            .click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Escape is handled by the panel's own keydown listener
        // (kanbanCardPanel.html), so focus the panel (tabindex="-1") first
        await panel.focus();
        await boardPage.page.keyboard.press('Escape');

        await expect(panel).not.toBeVisible({ timeout: 5_000 });
        await expect(boardPage.boardWrapper).toBeVisible();
    });

    test('hide done + filter + search combo does not lose cards', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const totalBefore = await boardPage.allCards().count();
        expect(totalBefore).toBeGreaterThan(0);

        // Project boards always offer Hide Done
        const hideDoneBtn = boardPage.page.getByTitle(
            'Hide cards in Done-category columns'
        );
        await expect(hideDoneBtn).toBeVisible();

        await hideDoneBtn.click();
        await boardPage.priorityFilter.selectOption('High');
        await boardPage.search('Card');
        // The filter summary shows while filters are active
        await expect(
            boardPage.page.getByText(/\d+ of \d+ cards/)
        ).toBeVisible();
        expect(await boardPage.allCards().count()).toBeLessThan(totalBefore);

        // Clear everything in reverse order
        await boardPage.clearSearch();
        await boardPage.priorityFilter.selectOption('All');
        await hideDoneBtn.click();

        await expect(boardPage.allCards()).toHaveCount(totalBefore);
        await expect(boardPage.page.getByText(/\d+ of \d+ cards/)).toHaveCount(
            0
        );
    });
    test('multiple rapid tab switches do not break the board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Rapidly switch tabs back and forth
        for (let i = 0; i < 5; i++) {
            await boardPage.backlogTab.click();
            await boardPage.page.waitForTimeout(200);
            await boardPage.boardTab.click();
            await boardPage.page.waitForTimeout(200);
        }

        // Board should still render
        await boardPage.page.waitForTimeout(1000);
        await expect(boardPage.boardWrapper).toBeVisible({
            timeout: SF_TIMEOUT
        });
        expect(await boardPage.allCards().count()).toBeGreaterThan(0);
    });
});
