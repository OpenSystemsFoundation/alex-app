import { test, expect } from '../fixtures';
import { createIsolatedBoard, sfApexRun } from '../helpers/sf-data';

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

    test('empty backlog shows "No backlog cards" message', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // The empty state h3 text is "No backlog cards"
        const emptyMessage = boardPage.page.getByText('No backlog cards');
        // This may not be visible if there are backlog cards — use a short timeout
        const isEmpty = await emptyMessage
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!isEmpty) {
            test.skip(true, 'Backlog has cards — empty state not shown');
            return;
        }

        await expect(emptyMessage).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('empty backlog shows "Create Card" button', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // The "Create Card" button is a lightning-button in the empty state
        const createButton = boardPage.page.locator(
            'lightning-button[label="Create Card"]'
        );
        const isEmpty = await createButton
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!isEmpty) {
            test.skip(true, 'Backlog has cards — empty state not shown');
            return;
        }

        await expect(createButton).toBeVisible({ timeout: SF_TIMEOUT });
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
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // This test requires a sprint board with planning sprints
        const sprintHeader = boardPage.page
            .locator('.sprint-header-row:not(.backlog-header-row)')
            .first();
        const hasSprintHeader = await sprintHeader
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!hasSprintHeader) {
            test.skip(
                true,
                'No planning sprints available — skipping drag test'
            );
            return;
        }

        // Find a backlog card (ungrouped section)
        const backlogCard = boardPage.page
            .locator('.backlog-header-row ~ .backlog-row')
            .first();
        const hasBacklogCard = await backlogCard
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!hasBacklogCard) {
            test.skip(true, 'No ungrouped backlog cards — skipping');
            return;
        }

        // Get sprint card count before drag
        const statsText = await sprintHeader
            .locator('.sprint-header__stats')
            .textContent();
        const countBefore = parseInt(
            statsText?.match(/(\d+) cards/)?.[1] ?? '0',
            10
        );

        // Drag the backlog card to the sprint header
        await backlogCard.dragTo(sprintHeader);
        await boardPage.page.waitForTimeout(2000);

        // Sprint card count should increase
        const newStatsText = await sprintHeader
            .locator('.sprint-header__stats')
            .textContent();
        const countAfter = parseInt(
            newStatsText?.match(/(\d+) cards/)?.[1] ?? '0',
            10
        );
        expect(countAfter).toBe(countBefore + 1);
    });
});
