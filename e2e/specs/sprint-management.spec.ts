import { test, expect } from '../fixtures';
import type { BoardPage } from '../pages';
import {
    createIsolatedBoard,
    sfApexRun,
    sfQuery,
    type BoardData
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

/**
 * Sprint Management -- E2E tests.
 *
 * Tests the sprint lifecycle: creation, sprint header display,
 * progress tracking, sprint completion wizard, and sprint reports.
 *
 * Uses Sprint-type boards (not Project) so the sprint header renders.
 * Each test provisions the sprint state it needs (active sprint present
 * or absent) instead of relying on execution order of sibling tests.
 */

type SprintBoard = BoardData & { baseUrl: string };

let workerSprintBoard: SprintBoard | null = null;

function scratchOrgOrigin(): string {
    const loginUrl = process.env.SCRATCH_ORG_URL || '';
    return loginUrl ? new URL(loginUrl).origin : '';
}

/**
 * Shared per-worker Sprint-type board. Tests using it only ADD data
 * (sprints); tests that need a guaranteed-empty sprint state create
 * their own board instead.
 */
function getSprintBoard(): SprintBoard {
    if (!workerSprintBoard) {
        workerSprintBoard = {
            ...createIsolatedBoard('sprint-e2e', 'Sprint'),
            baseUrl: scratchOrgOrigin()
        };
    }
    return workerSprintBoard;
}

/**
 * Ensure the board has an Active sprint, creating one via Apex if
 * missing. Idempotent, so tests stay order-independent.
 */
function ensureActiveSprint(boardId: string): string {
    const existing = sfQuery(
        `SELECT Id FROM OpenSF__Sprint__c WHERE OpenSF__Board__c = '${boardId}' AND OpenSF__Status__c = 'Active' LIMIT 1`
    );
    if (existing.length > 0) {
        return existing[0].Id as string;
    }
    const output = sfApexRun(`
OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
    OpenSF__Board__c = '${boardId}',
    OpenSF__Goal__c = 'E2E Active Sprint',
    OpenSF__StartDate__c = Date.today(),
    OpenSF__EndDate__c = Date.today().addDays(14),
    OpenSF__Status__c = 'Active'
);
insert sprint;
System.debug('E2E_SPRINT_ID:' + sprint.Id);
`);
    const match = output.match(/E2E_SPRINT_ID:([a-zA-Z0-9]{15,18})/);
    if (!match) {
        throw new Error(
            `Failed to parse sprint ID from Apex output: ${output.substring(0, 500)}`
        );
    }
    return match[1];
}

/**
 * Open a sprint board and wait for the topbar. Sprint-type boards may
 * have no cards on the board tab, so waiting for cards would hang.
 */
async function openSprintBoard(
    boardPage: BoardPage,
    board: SprintBoard
): Promise<void> {
    await boardPage.open(board.baseUrl, board.boardId);
    await boardPage.page
        .locator('.kanban-topbar')
        .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
}

test.describe('Sprint Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set -- skipping');
        }
    });

    test('sprint header renders on sprint-type board', async ({
        boardPage
    }) => {
        const board = getSprintBoard();
        await openSprintBoard(boardPage, board);

        // kanbanSprintHeader renders .sprint-inline in both its
        // has-sprint and empty branches, so this holds for any state
        await expect(boardPage.page.locator('.sprint-inline')).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('sprint header shows "No active sprint" when no sprint exists', async ({
        boardPage
    }) => {
        // Fresh board: guarantees no active sprint regardless of what
        // sibling tests created on the shared worker board
        const board: SprintBoard = {
            ...createIsolatedBoard('sprint-empty', 'Sprint'),
            baseUrl: scratchOrgOrigin()
        };
        await openSprintBoard(boardPage, board);

        const emptyState = boardPage.page.locator(
            '.sprint-inline .sprint-inline__empty'
        );
        await expect(emptyState).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(emptyState).toHaveText('No active sprint');
    });

    test('can create a sprint from backlog view', async ({ boardPage }) => {
        const board = getSprintBoard();
        await openSprintBoard(boardPage, board);
        await boardPage.switchToBacklogTab();

        const newSprintBtn = boardPage.page.locator(
            'button:has-text("New Sprint")'
        );
        await expect(newSprintBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await newSprintBtn.click();

        // Inline form from kanbanBacklogView: .backlog-view__create-form
        // wrapping the .create-sprint-input lightning-input
        const sprintForm = boardPage.page.locator(
            '.backlog-view__create-form:has(.create-sprint-input)'
        );
        await expect(sprintForm).toBeVisible({ timeout: 10_000 });

        const goal = `E2E goal ${Date.now()}`;
        await sprintForm.locator('.create-sprint-input input').fill(goal);
        await sprintForm.locator('button:has-text("Create Sprint")').click();

        // Form closes on success and the new Planning sprint section
        // appears in the backlog with our goal in its header
        await expect(sprintForm).toHaveCount(0, { timeout: SF_TIMEOUT });
        const newSection = boardPage.page.locator(
            `.sprint-header-row:has(.sprint-header__goal:has-text("${goal}"))`
        );
        await expect(newSection).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            newSection.locator('.sprint-status-badge--planning')
        ).toHaveText('Planning');
        await expect(newSection.locator('.sprint-header__stats')).toContainText(
            /\d+ cards/
        );
    });

    test('sprint header shows progress for an active sprint', async ({
        boardPage
    }) => {
        const board = getSprintBoard();
        ensureActiveSprint(board.boardId);
        await openSprintBoard(boardPage, board);

        const sprintHeader = boardPage.page.locator('.sprint-inline');
        await expect(sprintHeader.locator('.sprint-inline__name')).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect(
            sprintHeader.locator('.sprint-inline__progress-bar')
        ).toBeVisible();
        // The fill div is 0% wide with no completed points, so assert
        // presence rather than visibility
        await expect(
            sprintHeader.locator('.sprint-inline__progress-fill')
        ).toHaveCount(1);
        await expect(
            sprintHeader.locator('.sprint-inline__progress-label')
        ).toHaveText(/\d+ \/ \d+ pts \(\d+%\)/);
        // daysRemainingClass is '' unless the sprint is nearly over
        // (kanbanSprintHeader.js), so locate the label by its text
        await expect(sprintHeader.getByText(/\d+d remaining/)).toBeVisible();
    });

    test('sprint complete button opens wizard', async ({ boardPage }) => {
        const board = getSprintBoard();
        ensureActiveSprint(board.boardId);
        await openSprintBoard(boardPage, board);

        const sprintHeader = boardPage.page.locator('.sprint-inline');
        // lightning-button label is "Complete" (kanbanSprintHeader.html)
        const completeBtn = sprintHeader.locator('button:has-text("Complete")');
        await expect(completeBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await completeBtn.click();

        // kanbanSprintComplete renders an SLDS modal
        const wizard = boardPage.page.locator(
            'section[role="dialog"]:has(h2.slds-modal__title:has-text("Complete Sprint"))'
        );
        await expect(wizard).toBeVisible({ timeout: 10_000 });

        // Step 1 shows the sprint summary with its stat tiles
        await expect(
            wizard.locator('h3:has-text("Sprint Summary")')
        ).toBeVisible();
        await expect(wizard.getByText('Points Done')).toBeVisible();
        await expect(wizard.getByText('Total Points')).toBeVisible();
        await expect(wizard.locator('.slds-progress__list li')).toHaveCount(3);

        // Cancel so the shared board's active sprint is not completed
        await wizard
            .locator('.slds-modal__footer button:has-text("Cancel")')
            .click();
        await expect(wizard).not.toBeVisible({ timeout: 10_000 });
    });

    test('sprint reports button opens reports modal', async ({ boardPage }) => {
        const board = getSprintBoard();
        // Header action buttons only render when a sprint is active
        ensureActiveSprint(board.boardId);
        await openSprintBoard(boardPage, board);

        const sprintHeader = boardPage.page.locator('.sprint-inline');
        // lightning-button-icon renders a button with title="Reports"
        const reportsBtn = sprintHeader.locator('button[title="Reports"]');
        await expect(reportsBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await reportsBtn.click();

        const reports = boardPage.page.locator(
            'section[role="dialog"]:has(h2.slds-modal__title:has-text("Sprint Reports"))'
        );
        await expect(reports).toBeVisible({ timeout: 10_000 });

        const tabItems = reports.locator('li.slds-tabs_default__item');
        await expect(tabItems).toHaveCount(3);
        await expect(reports.locator('a[data-tab="burndown"]')).toHaveText(
            'Burndown'
        );
        await expect(reports.locator('a[data-tab="velocity"]')).toHaveText(
            'Velocity'
        );
        await expect(reports.locator('a[data-tab="summary"]')).toHaveText(
            'Summary'
        );

        const burndownItem = reports.locator(
            'li.slds-tabs_default__item:has(a[data-tab="burndown"])'
        );
        const velocityItem = reports.locator(
            'li.slds-tabs_default__item:has(a[data-tab="velocity"])'
        );
        const summaryItem = reports.locator(
            'li.slds-tabs_default__item:has(a[data-tab="summary"])'
        );
        await expect(burndownItem).toHaveClass(/slds-is-active/);

        // Switching tabs moves the active class and swaps the single
        // rendered panel (only one lwc:if branch renders at a time)
        await reports.locator('a[data-tab="velocity"]').click();
        await expect(velocityItem).toHaveClass(/slds-is-active/);
        await expect(burndownItem).not.toHaveClass(/slds-is-active/);
        const panel = reports.locator('.slds-tabs_default__content');
        await expect(panel).toHaveCount(1);
        // Velocity panel shows chart summary or its empty state once the
        // loading spinner resolves
        await expect(panel).toContainText(
            /Average Velocity|No completed sprints/,
            { timeout: SF_TIMEOUT }
        );

        await reports.locator('a[data-tab="summary"]').click();
        await expect(summaryItem).toHaveClass(/slds-is-active/);
        await expect(panel).toContainText(/Sprint History|No sprint history/, {
            timeout: SF_TIMEOUT
        });

        await reports
            .locator('.slds-modal__footer button:has-text("Close")')
            .click();
        await expect(reports).not.toBeVisible({ timeout: 10_000 });
    });
});
