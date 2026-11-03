import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import type { BoardPage } from '../pages';
import {
    createIsolatedBoard,
    scratchOrgOrigin,
    seedCard,
    seedSprint,
    sfQuery,
    type BoardData
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;
// Each poll attempt shells out to the sf CLI -- keep intervals coarse
const SF_POLL = { timeout: 45_000, intervals: [2_000, 3_000, 5_000] };

/**
 * Sprint lifecycle -- E2E tests.
 *
 * Covers the flows a Scrum team runs on a Sprint board: planning cards
 * into a sprint, starting it, tracking progress on the board, completing
 * it through the wizard and deleting planned sprints. Every test builds
 * its own Sprint board so sprint state never leaks between tests.
 */

function newSprintBoard(label: string): BoardData {
    return createIsolatedBoard(label, 'Sprint');
}

function sprintName(sprintId: string): string {
    const rows = sfQuery(
        `SELECT Name FROM OpenSF__Sprint__c WHERE Id = '${sprintId}'`
    );
    return rows[0].Name as string;
}

function sprintStatus(sprintId: string): string | null {
    const rows = sfQuery(
        `SELECT OpenSF__Status__c FROM OpenSF__Sprint__c WHERE Id = '${sprintId}'`
    );
    return rows.length ? (rows[0].OpenSF__Status__c as string) : null;
}

/** Card ids currently attached (not removed) to a sprint. */
function sprintCardIds(sprintId: string): string[] {
    return sfQuery(
        `SELECT OpenSF__Card__c FROM OpenSF__SprintCard__c WHERE OpenSF__Sprint__c = '${sprintId}' AND OpenSF__RemovedDate__c = NULL`
    ).map((r) => r.OpenSF__Card__c as string);
}

async function openSprintBoard(
    boardPage: BoardPage,
    board: BoardData
): Promise<Page> {
    await boardPage.open(scratchOrgOrigin(), board.boardId);
    await expect(boardPage.page.locator('.sprint-inline')).toBeVisible({
        timeout: SF_TIMEOUT
    });
    // Sprint progress and sprint state changes arrive as platform events
    await boardPage.waitForRealtime();
    return boardPage.page;
}

async function openBacklog(
    boardPage: BoardPage,
    board: BoardData
): Promise<Page> {
    const page = await openSprintBoard(boardPage, board);
    await boardPage.switchToBacklogTab();
    return page;
}

/** Backlog section header for a sprint (or 'ungrouped' for the Backlog). */
function sectionHeader(page: Page, sprintId: string): Locator {
    return page.locator(`.sprint-header-row[data-sprint-id="${sprintId}"]`);
}

function backlogRow(page: Page, cardId: string): Locator {
    return page.locator(`.backlog-row[data-card-id="${cardId}"]`);
}

/** A card's row inside a given section ('ungrouped' = Backlog section). */
function rowInSection(page: Page, sectionId: string, cardId: string): Locator {
    return page
        .locator('.backlog-section', { has: sectionHeader(page, sectionId) })
        .locator(`.backlog-row[data-card-id="${cardId}"]`);
}

/** Tick a row's checkbox (SLDS hides the native input behind its label). */
async function selectRow(row: Locator): Promise<void> {
    await row.locator('.backlog-cell--checkbox label').click();
}

/** The context menu that is currently open. */
function contextMenu(page: Page): Locator {
    return page.locator('.context-menu[role="menu"]');
}

test.describe('Sprint Lifecycle', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set -- skipping');
        }
    });

    test('board without an active sprint links to the backlog', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-none');
        const page = await openSprintBoard(boardPage, board);

        await expect(
            page.getByRole('heading', { name: 'No Active Sprint' })
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(boardPage.columns).toHaveCount(0);

        await page.getByRole('button', { name: 'Go to Backlog' }).click();
        await expect(boardPage.backlogTab).toHaveClass(/topbar-tab--active/);
        await expect(page.locator('.backlog-view')).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'New Sprint' })
        ).toBeVisible();
    });

    test('starting a planned sprint makes it the active sprint', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-start');
        const goal = `Start goal ${Date.now()}`;
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal,
            cardIds: [board.cards[0].Id, board.cards[1].Id]
        });
        const page = await openBacklog(boardPage, board);

        const header = sectionHeader(page, sprintId);
        await expect(header).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(header.locator('.sprint-status-badge')).toHaveText(
            'Planning'
        );
        await expect(header.locator('.sprint-header__stats')).toContainText(
            '2 cards'
        );

        await header.getByRole('button', { name: 'Start Sprint' }).click();
        const dialog = page.locator('section[role="dialog"]', {
            has: page.locator('h2', { hasText: 'Edit Sprint' })
        });
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await dialog
            .locator('.slds-modal__footer')
            .getByRole('button', { name: 'Start Sprint' })
            .click();
        await expect(dialog).toHaveCount(0, { timeout: SF_TIMEOUT });

        // Top bar switches to the started sprint
        const inline = page.locator('.sprint-inline');
        await expect(inline.locator('.sprint-inline__goal')).toHaveText(goal, {
            timeout: SF_TIMEOUT
        });
        await expect(
            inline.getByRole('button', { name: 'Complete' })
        ).toBeVisible();
        // The planned section becomes the (single) active sprint section
        await expect(header).toHaveCount(1, { timeout: SF_TIMEOUT });
        await expect(header.locator('.sprint-status-badge')).toHaveText(
            'Active'
        );

        await expect.poll(() => sprintStatus(sprintId), SF_POLL).toBe('Active');
        const started = sfQuery(
            `SELECT OpenSF__StartDate__c FROM OpenSF__Sprint__c WHERE Id = '${sprintId}'`
        );
        expect(started[0].OpenSF__StartDate__c).toBeTruthy();
    });

    test('Start Sprint is hidden while another sprint is active', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-one-active');
        seedSprint({
            boardId: board.boardId,
            status: 'Active',
            goal: 'Running',
            startOffsetDays: 0,
            endOffsetDays: 14,
            cardIds: [board.cards[0].Id]
        });
        const plannedId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Next up'
        });
        const page = await openBacklog(boardPage, board);

        const header = sectionHeader(page, plannedId);
        await expect(header).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(header.locator('.sprint-status-badge')).toHaveText(
            'Planning'
        );
        await expect(
            header.getByRole('button', { name: 'Start Sprint' })
        ).toHaveCount(0);
        await expect(header.getByTitle('Delete Sprint')).toBeVisible();
    });

    test('moving a sprint card to a Done column updates sprint progress', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-progress');
        // Cards in To Do (2 pts) and In Progress (4 pts) -- see createIsolatedBoard
        const todo = board.cards.find((c) => c.Subject === 'To Do Card 1');
        const inProgress = board.cards.find(
            (c) => c.Subject === 'In Progress Card 2'
        );
        if (!todo || !inProgress) throw new Error('Seeded cards missing');
        const doneColumn = board.columns.find((c) => c.header === 'Done');
        if (!doneColumn) throw new Error('Done column missing');
        seedSprint({
            boardId: board.boardId,
            status: 'Active',
            goal: 'Progress',
            startOffsetDays: 0,
            endOffsetDays: 10,
            cardIds: [todo.Id, inProgress.Id]
        });
        const page = await openSprintBoard(boardPage, board);

        const label = page.locator('.sprint-inline__progress-label');
        await expect(label).toHaveText('0 / 6 pts (0%)', {
            timeout: SF_TIMEOUT
        });
        await expect(page.getByText('10d remaining')).toBeVisible();

        await boardPage.card(todo.Id).click({ button: 'right' });
        const menu = contextMenu(page);
        await expect(menu).toBeVisible();
        await menu.getByRole('menuitem', { name: 'Move to Column' }).click();
        await menu.getByRole('menuitem', { name: 'Done', exact: true }).click();

        await expect(
            boardPage
                .columnWrapper(doneColumn.Id)
                .locator(`article[data-card-id="${todo.Id}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(label).toHaveText('2 / 6 pts (33%)', {
            timeout: SF_TIMEOUT
        });
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT OpenSF__CompletedInSprint__c FROM OpenSF__SprintCard__c WHERE OpenSF__Card__c = '${todo.Id}'`
                    )[0]?.OpenSF__CompletedInSprint__c,
                SF_POLL
            )
            .toBe(true);
    });

    test('completing a sprint through the wizard records its velocity', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-complete');
        const doneCard = board.cards.find((c) => c.Subject === 'To Do Card 2');
        const openCard = board.cards.find((c) => c.Subject === 'To Do Card 1');
        if (!doneCard || !openCard) throw new Error('Seeded cards missing');
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Active',
            goal: 'Finish line',
            startOffsetDays: -7,
            endOffsetDays: 7,
            cardIds: [doneCard.Id, openCard.Id]
        });
        const page = await openSprintBoard(boardPage, board);

        // Finish one card (4 pts) so the sprint has completed work
        await boardPage.card(doneCard.Id).click({ button: 'right' });
        const menu = contextMenu(page);
        await menu.getByRole('menuitem', { name: 'Move to Column' }).click();
        await menu.getByRole('menuitem', { name: 'Done', exact: true }).click();
        await expect(page.locator('.sprint-inline__progress-label')).toHaveText(
            '4 / 6 pts (67%)',
            { timeout: SF_TIMEOUT }
        );

        await page
            .locator('.sprint-inline')
            .getByRole('button', { name: 'Complete' })
            .click();
        const wizard = page.locator('section[role="dialog"]', {
            has: page.locator('h2.slds-modal__title', {
                hasText: 'Complete Sprint'
            })
        });
        await expect(wizard).toBeVisible({ timeout: 10_000 });
        const footer = wizard.locator('.slds-modal__footer');

        // Step 1: summary
        await expect(
            wizard.getByRole('heading', { name: 'Sprint Summary' })
        ).toBeVisible();
        await footer.getByRole('button', { name: 'Next' }).click();

        // Step 2: one incomplete card, defaulting to Move to Backlog
        await expect(wizard.getByText(openCard.Name)).toBeVisible();
        await expect(
            wizard.getByRole('combobox', { name: 'Disposition' })
        ).toHaveText(/Move to Backlog/);
        await footer.getByRole('button', { name: 'Next' }).click();

        // Step 3: confirm (Back returns to step 2)
        await expect(
            wizard.getByRole('heading', { name: 'Ready to Complete Sprint?' })
        ).toBeVisible();
        await footer.getByRole('button', { name: 'Back' }).click();
        await expect(
            wizard.getByRole('combobox', { name: 'Disposition' })
        ).toBeVisible();
        await footer.getByRole('button', { name: 'Next' }).click();
        await footer.getByRole('button', { name: 'Complete Sprint' }).click();

        await expect(wizard).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(page.locator('.sprint-inline__empty')).toHaveText(
            'No active sprint',
            { timeout: SF_TIMEOUT }
        );
        await expect(
            page.getByRole('heading', { name: 'No Active Sprint' })
        ).toBeVisible();

        await expect
            .poll(() => sprintStatus(sprintId), SF_POLL)
            .toBe('Completed');
        const sprint = sfQuery(
            `SELECT OpenSF__CompletedStoryPoints__c, OpenSF__Velocity__c FROM OpenSF__Sprint__c WHERE Id = '${sprintId}'`
        )[0];
        expect(sprint.OpenSF__CompletedStoryPoints__c).toBe(4);
        expect(sprint.OpenSF__Velocity__c).toBe(4);
    });

    test('deleting a planned sprint returns its cards to the backlog', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-delete');
        const card = seedCard({
            boardId: board.boardId,
            subject: `Planned card ${Date.now()}`,
            storyPoints: 3
        });
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'To be deleted',
            cardIds: [card.Id]
        });
        const page = await openBacklog(boardPage, board);

        const header = sectionHeader(page, sprintId);
        await expect(header).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(rowInSection(page, sprintId, card.Id)).toBeVisible();

        // Cancel first: nothing changes
        await header.getByTitle('Delete Sprint').click();
        await expect(header.getByText('Delete sprint?')).toBeVisible();
        await header.getByRole('button', { name: 'Cancel' }).click();
        await expect(header.getByTitle('Delete Sprint')).toBeVisible();

        await header.getByTitle('Delete Sprint').click();
        await header.getByRole('button', { name: 'Yes, delete' }).click();

        await expect(header).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(rowInSection(page, 'ungrouped', card.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect.poll(() => sprintStatus(sprintId), SF_POLL).toBeNull();
        expect(
            sfQuery(`SELECT Id FROM OpenSF__Card__c WHERE Id = '${card.Id}'`)
        ).toHaveLength(1);
    });

    test('context menu moves a backlog card into a planned sprint', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-ctx-plan');
        const card = seedCard({
            boardId: board.boardId,
            subject: `Ctx plan ${Date.now()}`,
            storyPoints: 5
        });
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Ctx target'
        });
        const name = sprintName(sprintId);
        const page = await openBacklog(boardPage, board);

        const row = backlogRow(page, card.Id);
        await expect(rowInSection(page, 'ungrouped', card.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await row.click({ button: 'right' });
        const menu = contextMenu(page);
        await menu.getByRole('menuitem', { name: 'Move to Sprint' }).click();
        await menu.getByRole('menuitem', { name, exact: true }).click();

        await expect(rowInSection(page, sprintId, card.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect(
            sectionHeader(page, sprintId).locator('.sprint-header__stats')
        ).toContainText('1 cards');
        await expect
            .poll(() => sprintCardIds(sprintId), SF_POLL)
            .toEqual([card.Id]);

        // ...and Remove from Sprint sends it back
        await row.click({ button: 'right' });
        await menu
            .getByRole('menuitem', { name: 'Remove from Sprint' })
            .click();
        await expect(rowInSection(page, 'ungrouped', card.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect.poll(() => sprintCardIds(sprintId), SF_POLL).toEqual([]);
    });

    test('bulk Move to Sprint plans every selected card', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-bulk-plan');
        const stamp = Date.now();
        const cardA = seedCard({
            boardId: board.boardId,
            subject: `Bulk plan A ${stamp}`
        });
        const cardB = seedCard({
            boardId: board.boardId,
            subject: `Bulk plan B ${stamp}`
        });
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Bulk target'
        });
        const name = sprintName(sprintId);
        const page = await openBacklog(boardPage, board);

        for (const card of [cardA, cardB]) {
            const row = backlogRow(page, card.Id);
            await expect(row).toBeVisible({ timeout: SF_TIMEOUT });
            await selectRow(row);
        }
        const bulkBar = page.locator('.backlog-view__bulk-actions');
        await expect(bulkBar.locator('strong')).toHaveText('2');

        await bulkBar.getByRole('combobox', { name: 'Move to Sprint' }).click();
        await bulkBar.getByRole('option', { name, exact: true }).click();

        for (const card of [cardA, cardB]) {
            await expect(rowInSection(page, sprintId, card.Id)).toBeVisible({
                timeout: SF_TIMEOUT
            });
        }
        await expect
            .poll(() => sprintCardIds(sprintId).sort(), SF_POLL)
            .toEqual([cardA.Id, cardB.Id].sort());
    });

    test('Add to Sprint puts backlog cards on the board', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-add');
        const sprintId = seedSprint({
            boardId: board.boardId,
            status: 'Active',
            goal: 'Add target',
            startOffsetDays: 0,
            endOffsetDays: 14,
            cardIds: [board.cards[3].Id]
        });
        const card = seedCard({
            boardId: board.boardId,
            subject: `Add to sprint ${Date.now()}`,
            storyPoints: 3
        });
        const page = await openBacklog(boardPage, board);

        const row = rowInSection(page, 'ungrouped', card.Id);
        await expect(row).toBeVisible({ timeout: SF_TIMEOUT });
        await selectRow(row);
        await page
            .locator('.backlog-view__bulk-actions')
            .getByRole('button', { name: 'Add to Sprint (1)' })
            .click();

        await expect(rowInSection(page, sprintId, card.Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect
            .poll(() => sprintCardIds(sprintId).includes(card.Id), SF_POLL)
            .toBe(true);
        // Placed in the board's first column
        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT OpenSF__Column__c FROM OpenSF__Card__c WHERE Id = '${card.Id}'`
                    )[0]?.OpenSF__Column__c,
                SF_POLL
            )
            .toBe(board.columns[0].Id);

        await boardPage.switchToBoardTab();
        await expect(
            boardPage
                .columnWrapper(board.columns[0].Id)
                .locator(`article[data-card-id="${card.Id}"]`)
        ).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('planned sprints can be reordered from the header menu', async ({
        boardPage
    }) => {
        const board = newSprintBoard('sprint-order');
        const first = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Order first'
        });
        const second = seedSprint({
            boardId: board.boardId,
            status: 'Planning',
            goal: 'Order second'
        });
        const page = await openBacklog(boardPage, board);

        const planned = page.locator(
            '.sprint-header-row:has(.sprint-status-badge--planning)'
        );
        await expect(planned).toHaveCount(2, { timeout: SF_TIMEOUT });
        const order = async () =>
            planned.evaluateAll((els) =>
                els.map((el) => el.getAttribute('data-sprint-id'))
            );
        const initial = await order();
        expect(initial.sort()).toEqual([first, second].sort());

        // Move the lower sprint up
        const lower = initial[1] as string;
        await sectionHeader(page, lower).click({ button: 'right' });
        await contextMenu(page)
            .getByRole('menuitem', { name: 'Move Up' })
            .click();
        await expect.poll(order).toEqual([initial[1], initial[0]]);
    });
});
