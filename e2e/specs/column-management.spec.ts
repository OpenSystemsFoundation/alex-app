import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import type { BoardDataFixture } from '../fixtures';
import type { BoardPage } from '../pages';
import { sfApexRun, sfQuery, sfUpdate } from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;
// Each poll attempt shells out to the sf CLI -- keep intervals coarse
const SF_POLL = { timeout: 30_000, intervals: [2_000, 3_000, 5_000] };

/**
 * Open the board record page and wait for cards, so the shared store
 * is fully loaded before switching to the Columns tab.
 */
async function openBoard(
    boardPage: BoardPage,
    boardData: BoardDataFixture
): Promise<Page> {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();
    return boardPage.page;
}

/** Switch to the Columns tab and wait for the column manager to render. */
async function openColumnsTab(page: Page): Promise<void> {
    const columnsTab = page.locator('[data-tab-id="columns"]');
    await columnsTab.click();
    await expect(columnsTab).toHaveClass(/topbar-tab--active/, {
        timeout: 15_000
    });
    await expect(page.locator('.column-mgmt-container')).toBeVisible({
        timeout: SF_TIMEOUT
    });
    await expect(columnRows(page).first()).toBeVisible({
        timeout: SF_TIMEOUT
    });
}

/** Switch back to the Board tab and wait for the board grid. */
async function openBoardTab(page: Page): Promise<void> {
    await page.locator('[data-tab-id="board"]').click();
    await expect(page.locator('.kanban-board')).toBeVisible({
        timeout: SF_TIMEOUT
    });
}

/** All real column rows in the manager (excludes the Add Column placeholder). */
function columnRows(page: Page): Locator {
    return page.locator('.column-item[data-column-id]');
}

/** Column manager row for a specific column record ID. */
function columnRow(page: Page, columnId: string): Locator {
    return page.locator(`.column-item[data-column-id="${columnId}"]`);
}

/** Board-tab column div for a specific column record ID. */
function boardColumn(page: Page, columnId: string): Locator {
    return page.locator(`.kanban-column[data-column-id="${columnId}"]`);
}

/** Server-side WIP limit for a column (null when unset). */
function getWipLimit(columnId: string): number | null {
    const rec = sfQuery(
        `SELECT OpenSF__WipLimit__c FROM OpenSF__Column__c WHERE Id = '${columnId}'`
    )[0];
    const value = rec?.OpenSF__WipLimit__c;
    return value === null || value === undefined ? null : Number(value);
}

/** Server-side column header for a column. */
function getColumnHeader(columnId: string): string | null {
    const rec = sfQuery(
        `SELECT OpenSF__ColumnHeader__c FROM OpenSF__Column__c WHERE Id = '${columnId}'`
    )[0];
    return (rec?.OpenSF__ColumnHeader__c as string) ?? null;
}

test.describe('Column Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('columns tab opens the column manager with one row per column', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.columns.length).toBe(6);
        const page = await openBoard(boardPage, boardData);

        await openColumnsTab(page);

        await expect(columnRows(page)).toHaveCount(6, { timeout: SF_TIMEOUT });
        for (const col of boardData.columns) {
            const row = columnRow(page, col.Id);
            await expect(row).toBeVisible();
            await expect(row.locator('a.column-name-link')).toHaveText(
                col.header
            );
        }
        // The Add Column placeholder renders after the rows
        await expect(page.locator('.column-item--add')).toBeVisible();
    });

    test('WIP limit round-trip shows and clears the over-limit badge', async ({
        boardPage,
        boardData
    }) => {
        // Pick the column with the most cards from live data — earlier tests
        // on this worker board may have moved or added cards.
        const agg = sfQuery(
            `SELECT OpenSF__Column__c colId, COUNT(Id) cnt FROM OpenSF__Card__c ` +
                `WHERE OpenSF__Board__c = '${boardData.boardId}' AND OpenSF__Column__c != null ` +
                `GROUP BY OpenSF__Column__c ORDER BY COUNT(Id) DESC LIMIT 1`
        );
        expect(agg.length).toBe(1);
        const colId = agg[0].colId as string;
        const cardCount = Number(agg[0].cnt);
        // Fixture board seeds 3 cards per column
        expect(cardCount).toBeGreaterThanOrEqual(3);

        const page = await openBoard(boardPage, boardData);
        const column = boardColumn(page, colId);
        await expect(column).toBeVisible({ timeout: SF_TIMEOUT });

        // No WIP limit set on the fixture board yet
        await expect(column.locator('.wip-badge')).toHaveCount(0);

        try {
            await openColumnsTab(page);
            const wipInput = columnRow(page, colId).locator(
                '[data-field="wipLimit"] input'
            );
            await expect(wipInput).toBeVisible({ timeout: SF_TIMEOUT });
            await wipInput.fill('1');
            // Column manager saves inline edits on blur
            await wipInput.blur();
            await expect.poll(() => getWipLimit(colId), SF_POLL).toBe(1);

            await openBoardTab(page);
            await expect(column).toHaveClass(/kanban-column--over-wip/, {
                timeout: SF_TIMEOUT
            });
            const badge = column.locator('.wip-badge');
            await expect(badge).toHaveClass(/wip-badge--over/);
            await expect(badge).toHaveText(`${cardCount}/1`);

            // Clear the limit via the same control (leave shared state clean)
            await openColumnsTab(page);
            await wipInput.fill('');
            await wipInput.blur();
            await expect.poll(() => getWipLimit(colId), SF_POLL).toBeNull();

            await openBoardTab(page);
            await expect(column).not.toHaveClass(/kanban-column--over-wip/);
            await expect(column.locator('.wip-badge')).toHaveCount(0);
        } finally {
            // Safety net: other specs assume no WIP limits on the fixture board
            sfApexRun(`
OpenSF__Column__c col = new OpenSF__Column__c(Id = '${colId}');
col.OpenSF__WipLimit__c = null;
update col;
`);
        }
    });

    test('renaming a column updates the board column header', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.columns.length).toBeGreaterThan(1);
        const column = boardData.columns[1];
        const originalName = column.header;
        const newName = `E2E Renamed ${Date.now()}`;

        const page = await openBoard(boardPage, boardData);
        const header = boardColumn(page, column.Id).locator(
            '.kanban-column__header'
        );
        await expect(header).toContainText(originalName, {
            timeout: SF_TIMEOUT
        });

        try {
            await openColumnsTab(page);
            const row = columnRow(page, column.Id);
            const nameInput = row.locator('[data-field="columnHeader"] input');
            await expect(nameInput).toBeVisible({ timeout: SF_TIMEOUT });
            await nameInput.fill(newName);
            // Column manager saves inline edits on blur
            await nameInput.blur();
            await expect(row.locator('a.column-name-link')).toHaveText(
                newName,
                { timeout: SF_TIMEOUT }
            );
            await expect
                .poll(() => getColumnHeader(column.Id), SF_POLL)
                .toBe(newName);

            await openBoardTab(page);
            await expect(header).toContainText(newName, {
                timeout: SF_TIMEOUT
            });

            // Rename back so parallel/subsequent tests see the standard board
            await openColumnsTab(page);
            await nameInput.fill(originalName);
            await nameInput.blur();
            await expect(row.locator('a.column-name-link')).toHaveText(
                originalName,
                { timeout: SF_TIMEOUT }
            );
            await expect
                .poll(() => getColumnHeader(column.Id), SF_POLL)
                .toBe(originalName);

            await openBoardTab(page);
            await expect(header).toContainText(originalName, {
                timeout: SF_TIMEOUT
            });
        } finally {
            // Safety net: restore the header even if an assertion failed mid-test
            sfUpdate(
                'OpenSF__Column__c',
                column.Id,
                `OpenSF__ColumnHeader__c='${originalName}'`
            );
        }
    });

    test('adding and deleting a column updates the board', async ({
        boardPage,
        boardData
    }) => {
        const page = await openBoard(boardPage, boardData);

        try {
            await openColumnsTab(page);
            await expect(columnRows(page)).toHaveCount(6, {
                timeout: SF_TIMEOUT
            });

            // Add — creates a column named 'New Column' via the server
            await page.locator('.column-item--add').click();
            await expect(columnRows(page)).toHaveCount(7, {
                timeout: SF_TIMEOUT
            });

            const created = sfQuery(
                `SELECT Id FROM OpenSF__Column__c WHERE OpenSF__Board__c = '${boardData.boardId}' ` +
                    `AND OpenSF__ColumnHeader__c = 'New Column' ORDER BY CreatedDate DESC LIMIT 1`
            );
            expect(created.length).toBe(1);
            const newColumnId = created[0].Id as string;

            await openBoardTab(page);
            await expect(page.locator('.kanban-column')).toHaveCount(7, {
                timeout: SF_TIMEOUT
            });
            await expect(
                boardColumn(page, newColumnId).locator('.kanban-column__header')
            ).toContainText('New Column');

            // Delete via the row's delete control + confirm modal
            await openColumnsTab(page);
            await columnRow(page, newColumnId)
                .getByRole('button', { name: 'Delete column' })
                .click();

            const dialog = page.locator(
                '.column-mgmt-container section[role="dialog"]'
            );
            await expect(dialog).toBeVisible({ timeout: 15_000 });
            await expect(dialog).toContainText('Confirm Delete');
            await dialog
                .getByRole('button', { name: 'Delete', exact: true })
                .click();

            await expect(dialog).not.toBeVisible({ timeout: SF_TIMEOUT });
            await expect(columnRows(page)).toHaveCount(6, {
                timeout: SF_TIMEOUT
            });
            await expect
                .poll(
                    () =>
                        sfQuery(
                            `SELECT Id FROM OpenSF__Column__c WHERE Id = '${newColumnId}'`
                        ).length,
                    SF_POLL
                )
                .toBe(0);

            await openBoardTab(page);
            await expect(page.locator('.kanban-column')).toHaveCount(6, {
                timeout: SF_TIMEOUT
            });
        } finally {
            // Safety net: other specs assert exactly 6 columns on this board
            sfApexRun(`
List<OpenSF__Column__c> leftovers = [
    SELECT Id
    FROM OpenSF__Column__c
    WHERE OpenSF__Board__c = '${boardData.boardId}'
    AND OpenSF__ColumnHeader__c = 'New Column'
];
if (!leftovers.isEmpty()) {
    delete leftovers;
}
`);
        }
    });
});
