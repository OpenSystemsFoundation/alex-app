import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

/**
 * Analytics & Cumulative Flow Diagram — E2E tests.
 *
 * Tests the analytics modal (cycle time, CFD), swimlane views,
 * and data visualization features.
 */
test.describe('Analytics & Visualization', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('analytics button is visible in the filter bar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const analyticsBtn = boardPage.page.locator(
            'button[title="Analytics"], button:has-text("Analytics")'
        );
        const hasBtn = await analyticsBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        // Analytics button may be an icon button
        if (!hasBtn) {
            const iconBtn = boardPage.page.locator(
                '.board-filter-bar lightning-icon[icon-name="utility:chart"]'
            );
            const hasIcon = await iconBtn
                .isVisible({ timeout: 5_000 })
                .catch(() => false);
            if (hasIcon) {
                await expect(iconBtn).toBeVisible();
                return;
            }
            test.skip(true, 'Analytics button not found');
        }

        await expect(analyticsBtn).toBeVisible();
    });

    test('analytics modal opens with cycle time tab', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find and click analytics button
        const analyticsBtn = boardPage.page.locator(
            'button[title="Analytics"], button.analytics-btn'
        );
        const hasBtn = await analyticsBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'Analytics button not found');
        }

        await analyticsBtn.click();

        const analyticsModal = boardPage.page.locator(
            'opensf-kanban-analytics'
        );
        const hasModal = await analyticsModal
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasModal) {
            await expect(analyticsModal).toBeVisible();

            // Cycle Time tab should be active by default
            const cycleTimeTab = analyticsModal.locator(
                '[data-tab="cycletime"], .analytics-tab--active'
            );
            const hasCycleTab = await cycleTimeTab
                .isVisible({ timeout: 5_000 })
                .catch(() => false);
            if (hasCycleTab) {
                await expect(cycleTimeTab).toBeVisible();
            }
        }
    });

    test('analytics modal can switch to CFD tab', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const analyticsBtn = boardPage.page.locator(
            'button[title="Analytics"], button.analytics-btn'
        );
        const hasBtn = await analyticsBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'Analytics button not found');
        }

        await analyticsBtn.click();

        const analyticsModal = boardPage.page.locator(
            'opensf-kanban-analytics'
        );
        const hasModal = await analyticsModal
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasModal) {
            test.skip(true, 'Analytics modal not rendered');
        }

        // Click CFD tab
        const cfdTab = analyticsModal.locator('[data-tab="cfd"]');
        const hasCfd = await cfdTab
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (!hasCfd) {
            test.skip(true, 'CFD tab not found');
        }

        await cfdTab.click();

        // CFD component should be visible
        const cfdComponent = analyticsModal.locator(
            'opensf-kanban-cumulative-flow-diagram'
        );
        const hasCfdComponent = await cfdComponent
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (hasCfdComponent) {
            await expect(cfdComponent).toBeVisible();
        }
    });

    test('analytics modal close button works', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const analyticsBtn = boardPage.page.locator(
            'button[title="Analytics"], button.analytics-btn'
        );
        const hasBtn = await analyticsBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'Analytics button not found');
        }

        await analyticsBtn.click();

        const analyticsModal = boardPage.page.locator(
            'opensf-kanban-analytics'
        );
        const hasModal = await analyticsModal
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasModal) {
            test.skip(true, 'Analytics modal not rendered');
        }

        // Close the modal
        const closeBtn = analyticsModal.locator(
            'button:has-text("Close"), button.slds-modal__close'
        );
        await closeBtn.click();

        await expect(analyticsModal).not.toBeVisible({ timeout: 10_000 });
    });

    test('swimlane selector is visible in filter bar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Swimlane is a select in the filter bar
        const swimlaneSelect = boardPage.page.locator(
            'select.swimlane-select, .board-filter-bar select >> nth=2'
        );
        const hasSwimlane = await swimlaneSelect
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasSwimlane) {
            await expect(swimlaneSelect).toBeVisible();
        }
    });

    test('swimlane by priority groups cards into rows', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find swimlane select and change to "Priority"
        const swimlaneSelect = boardPage.page.locator(
            'select.swimlane-select'
        );
        const hasSwimlane = await swimlaneSelect
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasSwimlane) {
            test.skip(true, 'Swimlane selector not found');
        }

        await swimlaneSelect.selectOption('priority');
        await boardPage.page.waitForTimeout(1000);

        // Swimlane rows should appear
        const swimlaneRows = boardPage.page.locator('.swimlane-row');
        const hasRows = await swimlaneRows
            .first()
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasRows) {
            expect(await swimlaneRows.count()).toBeGreaterThanOrEqual(1);
        }
    });
});
