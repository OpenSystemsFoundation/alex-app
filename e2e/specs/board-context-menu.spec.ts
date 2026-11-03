import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures';
import type { BoardPage } from '../pages';
import {
    createIsolatedBoard,
    scratchOrgOrigin,
    sfQuery,
    type BoardData
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;
// Each poll attempt shells out to the sf CLI -- keep intervals coarse
const SF_POLL = { timeout: 45_000, intervals: [2_000, 3_000, 5_000] };

/**
 * Board card context menu -- E2E tests.
 *
 * Right-clicking a card on the Board tab offers Move to Column, Move to
 * Backlog and Delete. Each test uses its own Project board because every
 * action changes card data.
 */

async function openBoard(boardPage: BoardPage, board: BoardData) {
    await boardPage.open(scratchOrgOrigin(), board.boardId);
    await boardPage.waitForCards();
}

async function openCardMenu(
    boardPage: BoardPage,
    cardId: string
): Promise<Locator> {
    await boardPage.card(cardId).click({ button: 'right' });
    const menu = boardPage.page.locator('.context-menu[role="menu"]');
    await expect(menu).toBeVisible();
    return menu;
}

function cardRow(cardId: string) {
    return sfQuery(
        `SELECT OpenSF__Column__c, OpenSF__Status__c FROM OpenSF__Card__c WHERE Id = '${cardId}'`
    )[0];
}

test.describe('Board Card Context Menu', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set -- skipping');
        }
    });

    test('menu lists the card actions and closes on Escape', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('ctx-items');
        await openBoard(boardPage, board);

        const menu = await openCardMenu(boardPage, board.cards[0].Id);
        await expect(menu.getByRole('menuitem')).toHaveText([
            /Move to Column/,
            /Move to Backlog/,
            /Delete/
        ]);

        // The submenu lists the other columns
        await menu.getByRole('menuitem', { name: 'Move to Column' }).click();
        const submenu = menu.locator('.context-submenu');
        await expect(submenu).toBeVisible();
        for (const column of board.columns.slice(1)) {
            await expect(
                submenu.getByRole('menuitem', {
                    name: column.header,
                    exact: true
                })
            ).toBeVisible();
        }

        await boardPage.page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
    });

    test('Move to Column moves the card and takes the column status', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('ctx-move');
        const card = board.cards.find((c) => c.Subject === 'Backlog Card 2');
        const target = board.columns.find((c) => c.header === 'Testing');
        if (!card || !target) throw new Error('Seeded data missing');
        await openBoard(boardPage, board);

        const menu = await openCardMenu(boardPage, card.Id);
        await menu.getByRole('menuitem', { name: 'Move to Column' }).click();
        await menu
            .getByRole('menuitem', { name: 'Testing', exact: true })
            .click();

        await expect(
            boardPage
                .columnWrapper(target.Id)
                .locator(`article[data-card-id="${card.Id}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            boardPage
                .columnWrapper(card.ColumnId)
                .locator(`article[data-card-id="${card.Id}"]`)
        ).toHaveCount(0);
        await expect
            .poll(() => cardRow(card.Id), SF_POLL)
            .toMatchObject({
                OpenSF__Column__c: target.Id,
                OpenSF__Status__c: 'Testing'
            });
    });

    test('Move to Backlog takes the card off the board', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('ctx-backlog');
        const card = board.cards[4];
        await openBoard(boardPage, board);

        const badge = boardPage.page.locator(
            '[data-tab-id="backlog"] .tab-badge'
        );
        await expect(badge).toHaveText('0');

        const menu = await openCardMenu(boardPage, card.Id);
        await menu.getByRole('menuitem', { name: 'Move to Backlog' }).click();

        await expect(boardPage.card(card.Id)).toHaveCount(0, {
            timeout: SF_TIMEOUT
        });
        await expect(badge).toHaveText('1');
        await expect
            .poll(() => cardRow(card.Id)?.OpenSF__Column__c, SF_POLL)
            .toBeNull();

        await boardPage.switchToBacklogTab();
        await expect(
            boardPage.page.locator(`.backlog-row[data-card-id="${card.Id}"]`)
        ).toBeVisible();
    });

    test('Delete removes the card immediately', async ({ boardPage }) => {
        const board = createIsolatedBoard('ctx-delete');
        const card = board.cards[2];
        await openBoard(boardPage, board);
        await expect(boardPage.allCards()).toHaveCount(board.cards.length);

        const menu = await openCardMenu(boardPage, card.Id);
        await menu.getByRole('menuitem', { name: 'Delete' }).click();

        await expect(boardPage.card(card.Id)).toHaveCount(0, {
            timeout: SF_TIMEOUT
        });
        await expect(boardPage.allCards()).toHaveCount(board.cards.length - 1);
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT Id FROM OpenSF__Card__c WHERE Id = '${card.Id}'`
                    ).length,
                SF_POLL
            )
            .toBe(0);
    });
});
