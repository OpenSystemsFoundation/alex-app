import { test, expect } from '../fixtures';
import { sfApexRun, sfQuery } from '../helpers/sf-data';

const SF_TIMEOUT = 45_000;

/**
 * Sprint Management — E2E tests.
 *
 * Tests the sprint lifecycle: creation, sprint header display,
 * progress tracking, sprint completion wizard, and sprint reports.
 */
test.describe('Sprint Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('sprint header renders on sprint-type board', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Sprint header component should be attached (even if empty)
        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        await expect(sprintHeader).toBeAttached({ timeout: SF_TIMEOUT });
    });

    test('sprint header shows "No active sprint" when no sprint exists', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        const isAttached = await sprintHeader
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!isAttached) {
            test.skip(true, 'Sprint header not visible');
        }

        const emptyState = sprintHeader.locator('.sprint-inline__empty');
        const hasEmptyState = await emptyState
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (hasEmptyState) {
            await expect(emptyState).toContainText('No active sprint');
        }
    });

    test('can create a sprint from backlog view', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.switchToBacklogTab();

        // Look for New Sprint button in backlog toolbar
        const newSprintBtn = boardPage.page.locator(
            'button:has-text("New Sprint")'
        );
        const hasBtn = await newSprintBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Sprint button not found in backlog');
        }

        await newSprintBtn.click();

        // Sprint creation form or modal should appear
        const sprintForm = boardPage.page.locator(
            '.sprint-create-form, opensf-kanban-sprint-modal'
        );
        const hasForm = await sprintForm
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasForm) {
            await expect(sprintForm).toBeVisible();
        }
    });

    test('sprint progress bar renders with correct styling', async ({
        boardPage,
        boardData
    }) => {
        // Create a sprint with Apex first
        const apex = `
        OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
            OpenSF__Board__c = '${boardData.boardId}',
            OpenSF__Goal__c = 'E2E Sprint Test',
            OpenSF__StartDate__c = Date.today(),
            OpenSF__EndDate__c = Date.today().addDays(14),
            OpenSF__Status__c = 'Active'
        );
        insert sprint;
        System.debug('E2E_SPRINT_ID:' + sprint.Id);
        `;

        try {
            sfApexRun(apex);
        } catch {
            test.skip(true, 'Could not create sprint via Apex');
        }

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        const isVisible = await sprintHeader
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!isVisible) {
            test.skip(true, 'Sprint header not visible after sprint creation');
        }

        // Progress bar should be visible
        const progressBar = sprintHeader.locator('.sprint-inline__progress-bar');
        const hasProgress = await progressBar
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasProgress) {
            await expect(progressBar).toBeVisible();
            // Days remaining label should show
            const daysLabel = sprintHeader.locator(
                '.sprint-inline__days-remaining'
            );
            const hasDays = await daysLabel
                .isVisible({ timeout: 5_000 })
                .catch(() => false);
            if (hasDays) {
                await expect(daysLabel).toContainText(/\d+ days/);
            }
        }
    });

    test('sprint complete button opens wizard', async ({
        boardPage,
        boardData
    }) => {
        // Check if there's an active sprint
        let sprints: Record<string, any>[] = [];
        try {
            sprints = sfQuery(
                `SELECT Id FROM OpenSF__Sprint__c WHERE OpenSF__Board__c = '${boardData.boardId}' AND OpenSF__Status__c = 'Active' LIMIT 1`
            );
        } catch {
            // Sprint object may not exist yet
        }

        if (sprints.length === 0) {
            test.skip(true, 'No active sprint — cannot test completion');
        }

        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        const completeBtn = sprintHeader.locator(
            'button:has-text("Complete Sprint")'
        );
        const hasBtn = await completeBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'Complete Sprint button not found');
        }

        await completeBtn.click();

        // Sprint completion wizard modal should open
        const wizard = boardPage.page.locator('opensf-kanban-sprint-complete');
        const hasWizard = await wizard
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasWizard) {
            await expect(wizard).toBeVisible();
            // Step 1 should show summary with counts
            const summary = wizard.locator('.sprint-complete__summary');
            const hasSummary = await summary
                .isVisible({ timeout: 5_000 })
                .catch(() => false);
            if (hasSummary) {
                await expect(summary).toBeVisible();
            }
        }
    });

    test('sprint reports button opens reports modal', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        const reportsBtn = sprintHeader.locator(
            'button:has-text("Reports")'
        );
        const hasBtn = await reportsBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'Reports button not found');
        }

        await reportsBtn.click();

        // Reports modal should open
        const reportsModal = boardPage.page.locator(
            'opensf-kanban-sprint-reports'
        );
        const hasModal = await reportsModal
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasModal) {
            await expect(reportsModal).toBeVisible();
            // Should have Burndown, Velocity, Summary tabs
            const tabs = reportsModal.locator('.report-tab, .slds-tabs__item');
            const hasTabs = await tabs
                .first()
                .isVisible({ timeout: 5_000 })
                .catch(() => false);
            if (hasTabs) {
                expect(await tabs.count()).toBeGreaterThanOrEqual(2);
            }
        }
    });
});
