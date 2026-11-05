import { test, expect } from '../fixtures';
import {
    createIsolatedBoard,
    scratchOrgOrigin,
    seedSprint,
    sfApexRun,
    sfQuery
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

/**
 * Create a backlog card (board reference, no column) via Apex,
 * mirroring KanbanCardService.createBacklogCard's field set.
 * Returns the new card's ID.
 */
function createBacklogCardViaApex(
    boardId: string,
    subject: string,
    priority: string
): string {
    const output = sfApexRun(`
OpenSF__Card__c card = new OpenSF__Card__c(
    OpenSF__Board__c = '${boardId}',
    OpenSF__Subject__c = '${subject.replace(/'/g, "\\'")}',
    OpenSF__Priority__c = '${priority}',
    OpenSF__NeedsRefinement__c = false,
    OpenSF__SequenceNumber__c = 1
);
insert card;
System.debug('E2E_CARD_ID:' + card.Id);
`);
    const match = output.match(/E2E_CARD_ID:([a-zA-Z0-9]{15,18})/);
    if (!match) {
        throw new Error(
            `Failed to parse card ID from Apex output: ${output.substring(0, 500)}`
        );
    }
    return match[1];
}

test.describe('Backlog View', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('switching to backlog tab shows backlog view', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.backlogTab).toBeVisible({
            timeout: SF_TIMEOUT
        });

        await boardPage.switchToBacklogTab();

        // The backlog filter bar's search input uses kanban-filter-bar__search-input
        const backlogSearch = boardPage.page.locator(
            '.kanban-filter-bar__search-input'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog tab badge shows card count', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await expect(boardPage.backlogTab).toBeVisible({
            timeout: SF_TIMEOUT
        });

        const badge = boardPage.page.locator(
            '[data-tab-id="backlog"] .tab-badge'
        );
        await expect(badge).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(badge).toHaveText(/\d+/);
    });

    test('empty backlog shows the empty state with a Create Card button', async ({
        boardPage
    }) => {
        // Fresh board: every seeded card sits in a column, so the backlog
        // is guaranteed empty (the shared worker board gains backlog cards)
        const board = createIsolatedBoard('backlog-empty');
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await expect(
            boardPage.page.locator('[data-tab-id="backlog"] .tab-badge')
        ).toHaveText('0', { timeout: SF_TIMEOUT });
        await boardPage.switchToBacklogTab();

        await expect(boardPage.page.getByText('No backlog cards')).toBeVisible({
            timeout: SF_TIMEOUT
        });
        const createButton = boardPage.page.getByRole('button', {
            name: 'Create Card'
        });
        await expect(createButton).toBeVisible();

        // Create Card opens the inline create form
        await createButton.click();
        await expect(
            boardPage.page.getByPlaceholder('What needs to be done?')
        ).toBeVisible();
    });

    test('New Card button is visible in toolbar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const newCardButton = boardPage.page.locator(
            'button:has-text("New Card")'
        );
        await expect(newCardButton).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('switching back to board tab shows the board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            '.kanban-filter-bar__search-input'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });

        await boardPage.switchToBoardTab();
        await expect(boardPage.boardGrid).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog search input is visible', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogSearch = boardPage.page.locator(
            '.kanban-filter-bar__search-input'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('backlog filter dropdowns are present', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // Wait for backlog toolbar to be visible
        const backlogSearch = boardPage.page.locator(
            '.kanban-filter-bar__search-input'
        );
        await expect(backlogSearch).toBeVisible({ timeout: SF_TIMEOUT });

        // The backlog uses native <select> elements with class kanban-filter-bar__select
        const selects = boardPage.page.locator(
            'select.kanban-filter-bar__select'
        );
        // There should be at least 3 selects: View, Priority, Type
        await expect(selects.first()).toBeVisible({ timeout: SF_TIMEOUT });

        const count = await selects.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('backlog section shows Backlog header with card count', async ({
        boardPage,
        boardData
    }) => {
        // The worker fixture assigns every card a column, so the backlog
        // starts empty and the ungrouped section header would not render —
        // seed our own backlog card to make it deterministic
        createBacklogCardViaApex(
            boardData.boardId,
            `E2E backlog header ${Date.now()}`,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogHeader = boardPage.page.locator('.backlog-header-row');
        await expect(backlogHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(backlogHeader.locator('strong')).toHaveText('Backlog');
        await expect(backlogHeader).toContainText(/\d+ cards/);
    });

    test('clicking backlog header collapses and expands section', async ({
        boardPage,
        boardData
    }) => {
        // The fixture cards all live in columns — seed a backlog card
        // so the ungrouped section has a row to collapse
        const cardId = createBacklogCardViaApex(
            boardData.boardId,
            `E2E collapse ${Date.now()}`,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const backlogHeader = boardPage.page.locator('.backlog-header-row');
        await expect(backlogHeader).toBeVisible({ timeout: SF_TIMEOUT });

        const rows = boardPage.page.locator(
            '.backlog-row:not(.backlog-row--header)'
        );
        await expect(
            boardPage.page.locator(`.backlog-row[data-card-id="${cardId}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        const countBefore = await rows.count();

        // The fixture board has no sprints, so the ungrouped section
        // holds every row and collapsing it empties the list
        await backlogHeader.click();
        await expect(rows).toHaveCount(0);

        // Click again to expand
        await backlogHeader.click();
        await expect(rows).toHaveCount(countBefore);
    });

    test('inline create form adds a card to the backlog list', async ({
        boardPage,
        boardData
    }) => {
        // Seed a backlog card so the row list renders and countBefore is
        // captured from a loaded, non-empty state (fixture backlog is empty)
        const seededId = createBacklogCardViaApex(
            boardData.boardId,
            `E2E inline seed ${Date.now()}`,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const rows = boardPage.page.locator(
            '.backlog-row:not(.backlog-row--header)'
        );
        await expect(
            boardPage.page.locator(`.backlog-row[data-card-id="${seededId}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        const countBefore = await rows.count();

        await boardPage.page.locator('button:has-text("New Card")').click();

        // Inline form from kanbanBacklogView: .backlog-view__create-form
        // wrapping the .create-input lightning-input
        const createForm = boardPage.page.locator(
            '.backlog-view__create-form:has(.create-input)'
        );
        await expect(createForm).toBeVisible({ timeout: 10_000 });

        const subject = `E2E inline create ${Date.now()}`;
        await createForm.locator('.create-input input').fill(subject);
        await createForm.locator('button:has-text("Save")').click();

        // The new row appears with the unique subject and the count grows
        const newRow = boardPage.page.locator(
            `.backlog-row:has(.backlog-cell--subject:has-text("${subject}"))`
        );
        await expect(newRow).toHaveCount(1, { timeout: SF_TIMEOUT });
        await expect(rows).toHaveCount(countBefore + 1);
    });

    test('bulk set priority updates selected rows only', async ({
        boardPage,
        boardData
    }) => {
        // Own records: bulk actions mutate data, so never touch the
        // shared fixture cards other tests read
        const stamp = Date.now();
        const cardA = createBacklogCardViaApex(
            boardData.boardId,
            `E2E bulk prio A ${stamp}`,
            'Low'
        );
        const cardB = createBacklogCardViaApex(
            boardData.boardId,
            `E2E bulk prio B ${stamp}`,
            'Low'
        );
        const cardC = createBacklogCardViaApex(
            boardData.boardId,
            `E2E bulk prio C ${stamp}`,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const rowA = boardPage.page.locator(
            `.backlog-row[data-card-id="${cardA}"]`
        );
        const rowB = boardPage.page.locator(
            `.backlog-row[data-card-id="${cardB}"]`
        );
        const rowC = boardPage.page.locator(
            `.backlog-row[data-card-id="${cardC}"]`
        );
        await expect(rowA).toBeVisible({ timeout: SF_TIMEOUT });

        // SLDS visually hides the native checkbox input, so click its label
        await rowA.locator('.backlog-cell--checkbox label').click();
        await rowB.locator('.backlog-cell--checkbox label').click();

        const bulkBar = boardPage.page.locator('.backlog-view__bulk-actions');
        await expect(bulkBar).toBeVisible({ timeout: 10_000 });
        await expect(bulkBar).toContainText('2 selected');

        // The Set Priority lightning-combobox is the only combobox in the
        // bulk bar (Move to Sprint needs planning sprints, which the
        // fixture board never has)
        await bulkBar.locator('.slds-combobox__input').click();
        await bulkBar.getByRole('option', { name: 'High' }).click();

        await expect(rowA.locator('.backlog-cell--priority')).toHaveText(
            'High',
            { timeout: SF_TIMEOUT }
        );
        await expect(rowB.locator('.backlog-cell--priority')).toHaveText(
            'High',
            { timeout: SF_TIMEOUT }
        );
        // Unselected row keeps its original priority
        await expect(rowC.locator('.backlog-cell--priority')).toHaveText('Low');
    });

    test('bulk delete removes the selected card', async ({
        boardPage,
        boardData
    }) => {
        const subject = `E2E bulk delete ${Date.now()}`;
        const cardId = createBacklogCardViaApex(
            boardData.boardId,
            subject,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const row = boardPage.page.locator(
            `.backlog-row[data-card-id="${cardId}"]`
        );
        await expect(row).toBeVisible({ timeout: SF_TIMEOUT });

        const rows = boardPage.page.locator(
            '.backlog-row:not(.backlog-row--header)'
        );
        const countBefore = await rows.count();

        await row.locator('.backlog-cell--checkbox label').click();

        const bulkBar = boardPage.page.locator('.backlog-view__bulk-actions');
        await expect(bulkBar).toBeVisible({ timeout: 10_000 });
        await expect(bulkBar).toContainText('1 selected');

        await bulkBar.locator('button:has-text("Delete")').click();

        await expect(row).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(
            boardPage.page.locator(
                `.backlog-cell--subject:has-text("${subject}")`
            )
        ).toHaveCount(0);
        await expect(rows).toHaveCount(countBefore - 1);
    });

    test('select all selects every row and clear resets selection', async ({
        boardPage,
        boardData
    }) => {
        // Seed a backlog card — select-all needs at least one row, and
        // the fixture board's cards all start in columns
        const cardId = createBacklogCardViaApex(
            boardData.boardId,
            `E2E select all ${Date.now()}`,
            'Low'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        const rows = boardPage.page.locator(
            '.backlog-row:not(.backlog-row--header)'
        );
        await expect(
            boardPage.page.locator(`.backlog-row[data-card-id="${cardId}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        const rowCount = await rows.count();

        // Header row select-all checkbox (label click, input is hidden)
        await boardPage.page
            .locator('.backlog-row--header .backlog-cell--checkbox label')
            .click();

        const bulkBar = boardPage.page.locator('.backlog-view__bulk-actions');
        await expect(bulkBar).toBeVisible({ timeout: 10_000 });
        await expect(bulkBar).toContainText(`${rowCount} selected`);
        await expect(
            rows
                .first()
                .locator('.backlog-cell--checkbox input[type="checkbox"]')
        ).toBeChecked();

        await bulkBar.locator('button:has-text("Clear")').click();

        // Bulk bar unrenders and every checkbox (rows + header) unchecks
        await expect(bulkBar).toHaveCount(0, { timeout: 10_000 });
        await expect(
            boardPage.page.locator(
                '.backlog-view__table input[type="checkbox"]:checked'
            )
        ).toHaveCount(0);
    });

    test('context menu shows Move to Column option', async ({ boardPage }) => {
        // "Move to Column" only renders when an active sprint exists
        // (contextMenuHandler.js), and sprints only load for Sprint-type
        // boards (boardThunks.js) — so provision a dedicated board
        const board = createIsolatedBoard('backlog-ctx', 'Sprint');
        const baseUrl = new URL(process.env.SCRATCH_ORG_URL || '').origin;
        sfApexRun(`
OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
    OpenSF__Board__c = '${board.boardId}',
    OpenSF__Goal__c = 'E2E backlog context menu',
    OpenSF__StartDate__c = Date.today(),
    OpenSF__EndDate__c = Date.today().addDays(14),
    OpenSF__Status__c = 'Active'
);
insert sprint;
`);
        // Isolated-board cards all live in columns, so seed a backlog
        // card to have a row to right-click
        const cardId = createBacklogCardViaApex(
            board.boardId,
            `E2E ctx menu ${Date.now()}`,
            'Low'
        );

        await boardPage.open(baseUrl, board.boardId);
        await boardPage.switchToBacklogTab();

        const row = boardPage.page.locator(
            `.backlog-row[data-card-id="${cardId}"]`
        );
        await expect(row).toBeVisible({ timeout: SF_TIMEOUT });

        // Right-click to open context menu
        await row.click({ button: 'right' });

        const contextMenu = boardPage.page.locator('.context-menu');
        await expect(contextMenu).toBeVisible({ timeout: 5000 });

        await expect(
            contextMenu.getByRole('menuitem', { name: 'Move to Column' })
        ).toBeVisible();
    });

    test('drag card to sprint header moves it to sprint', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('backlog-drag', 'Sprint');
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Drag target'
        });
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.switchToBacklogTab();

        const page = boardPage.page;
        const sprintHeader = page.locator(
            `.sprint-header-row[data-sprint-id="${sprintId}"]`
        );
        const sprintSection = page.locator('.backlog-section', {
            has: sprintHeader
        });
        await expect(
            sprintHeader.locator('.sprint-header__stats')
        ).toContainText('0 cards', { timeout: SF_TIMEOUT });
        // Drag the first Backlog row: it sits right under the sprint header,
        // so neither end of the drag needs scrolling
        const row = page
            .locator('.backlog-section', {
                has: page.locator(
                    '.sprint-header-row[data-sprint-id="ungrouped"]'
                )
            })
            .locator('.backlog-row[data-card-id]')
            .first();
        const cardId = (await row.getAttribute('data-card-id')) as string;
        expect(cardId).toBeTruthy();

        await row.dragTo(sprintHeader);

        await expect(
            sprintSection.locator(`.backlog-row[data-card-id="${cardId}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            sprintHeader.locator('.sprint-header__stats')
        ).toContainText('1 cards');
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT Id FROM OpenSF__SprintCard__c WHERE OpenSF__Sprint__c = '${sprintId}' AND OpenSF__Card__c = '${cardId}' AND OpenSF__RemovedDate__c = NULL`
                    ).length,
                { timeout: 45_000, intervals: [2_000, 3_000, 5_000] }
            )
            .toBe(1);
    });

    test('refinement toggle flags a card and the view filter shows only flagged cards', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('backlog-refine');
        const stamp = Date.now();
        const flagged = createBacklogCardViaApex(
            board.boardId,
            `Refine A ${stamp}`,
            'Low'
        );
        const other = createBacklogCardViaApex(
            board.boardId,
            `Refine B ${stamp}`,
            'Low'
        );
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.switchToBacklogTab();

        const page = boardPage.page;
        const flaggedRow = page.locator(
            `.backlog-row[data-card-id="${flagged}"]`
        );
        const otherRow = page.locator(`.backlog-row[data-card-id="${other}"]`);
        await expect(flaggedRow).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            flaggedRow.locator('.backlog-cell--refinement lightning-icon')
        ).toHaveClass(/refinement-inactive/);

        await flaggedRow.getByTitle('Toggle Refinement').click();
        await expect(
            flaggedRow.locator('.backlog-cell--refinement lightning-icon')
        ).toHaveClass(/refinement-active/, { timeout: SF_TIMEOUT });
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT OpenSF__NeedsRefinement__c FROM OpenSF__Card__c WHERE Id = '${flagged}'`
                    )[0].OpenSF__NeedsRefinement__c,
                { timeout: 45_000, intervals: [2_000, 3_000, 5_000] }
            )
            .toBe(true);

        const viewSelect = page.locator('select.kanban-filter-bar__select', {
            has: page.locator('option[value="refinement"]')
        });
        await viewSelect.selectOption('refinement');
        await expect(flaggedRow).toBeVisible();
        await expect(otherRow).toHaveCount(0);

        await viewSelect.selectOption('all');
        await expect(otherRow).toBeVisible();
    });

    test('context menu moves a card to the top and bottom of the backlog', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('backlog-order');
        const stamp = Date.now();
        const ids = ['One', 'Two', 'Three'].map((n) =>
            createBacklogCardViaApex(
                board.boardId,
                `Order ${n} ${stamp}`,
                'Low'
            )
        );
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.switchToBacklogTab();

        const page = boardPage.page;
        const rows = page.locator('.backlog-row[data-card-id]');
        await expect(rows).toHaveCount(3, { timeout: SF_TIMEOUT });
        const order = () =>
            rows.evaluateAll((els) =>
                els.map((el) => el.getAttribute('data-card-id'))
            );
        const initial = await order();
        expect([...initial].sort()).toEqual([...ids].sort());

        const menu = page.locator('.context-menu[role="menu"]');
        const last = initial[2] as string;
        await page
            .locator(`.backlog-row[data-card-id="${last}"]`)
            .click({ button: 'right' });
        await menu.getByRole('menuitem', { name: 'Move to Top' }).click();
        await expect.poll(order).toEqual([last, initial[0], initial[1]]);

        await page
            .locator(`.backlog-row[data-card-id="${last}"]`)
            .click({ button: 'right' });
        await menu.getByRole('menuitem', { name: 'Move to Bottom' }).click();
        await expect.poll(order).toEqual([initial[0], initial[1], last]);
    });

    test('new card form: Enter creates and stays open, Escape closes', async ({
        boardPage
    }) => {
        const board = createIsolatedBoard('backlog-keys');
        await boardPage.open(scratchOrgOrigin(), board.boardId);
        await boardPage.switchToBacklogTab();

        const page = boardPage.page;
        await page.getByRole('button', { name: 'New Card' }).click();
        const input = page.getByPlaceholder('What needs to be done?');
        await expect(input).toBeVisible();

        const stamp = Date.now();
        for (const n of [1, 2]) {
            await input.fill(`Keyboard card ${n} ${stamp}`);
            await input.press('Enter');
            await expect(
                page.locator('.backlog-row', {
                    hasText: `Keyboard card ${n} ${stamp}`
                })
            ).toBeVisible({ timeout: SF_TIMEOUT });
            // Form stays open with an empty input for the next card
            await expect(input).toHaveValue('');
        }

        await input.press('Escape');
        await expect(input).toHaveCount(0);
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Board__c = '${board.boardId}' AND OpenSF__Column__c = NULL AND OpenSF__Subject__c LIKE 'Keyboard card %${stamp}'`
                    ).length,
                { timeout: 45_000, intervals: [2_000, 3_000, 5_000] }
            )
            .toBe(2);
    });
});
