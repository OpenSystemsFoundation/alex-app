import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Board Toolbar', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('board tab is active by default', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const boardTab = boardPage.page.locator('[data-tab-id="board"]');
        await expect(boardTab).toHaveClass(/topbar-tab--active/, {
            timeout: SF_TIMEOUT
        });
    });

    test('backlog tab badge is visible', async ({ boardPage, boardData }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const badge = boardPage.page.locator(
            '[data-tab-id="backlog"] .tab-badge'
        );
        await expect(badge).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('undo button exists and is disabled initially', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Undo/Redo buttons only render when hasDevTools is true
        // (template lwc:if={hasDevTools}). Use a shorter timeout to check.
        const undoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Undo"]'
        );
        const hasUndo = await undoBtn
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!hasUndo) {
            test.skip(true, 'DevTools not enabled — undo button not rendered');
            return;
        }

        await expect(undoBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(undoBtn).toBeDisabled();
    });

    test('redo button exists and is disabled initially', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Redo button only renders when hasDevTools is true
        const redoBtn = boardPage.page.locator(
            'button.topbar-icon-btn[title*="Redo"]'
        );
        const hasRedo = await redoBtn
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!hasRedo) {
            test.skip(true, 'DevTools not enabled — redo button not rendered');
            return;
        }

        await expect(redoBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(redoBtn).toBeDisabled();
    });

    test('refresh button is enabled and clickable', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        await expect(boardPage.refreshBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(boardPage.refreshBtn).toBeEnabled();
    });

    test('refresh button reloads board data', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardBefore = boardPage.card(boardData.cards[0].Id);
        await expect(cardBefore).toBeVisible({ timeout: SF_TIMEOUT });

        await boardPage.refresh();

        // Cards should still be visible after refresh completes
        await expect(boardPage.card(boardData.cards[0].Id)).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('connection status indicator is present', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // In LWC, <c-connection-status-indicator> renders as that tag name
        const statusIndicator = boardPage.page.locator(
            'c-connection-status-indicator'
        );
        await expect(statusIndicator).toBeAttached({ timeout: SF_TIMEOUT });
    });

    test('new sprint button is visible when no active sprint', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Sprint header only renders when isSprintBoard is true
        const sprintHeader = boardPage.page.locator(
            'opensf-kanban-sprint-header'
        );
        const hasSprintHeader = await sprintHeader
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (!hasSprintHeader) {
            test.skip(
                true,
                'Board is not a sprint board — sprint header not rendered'
            );
            return;
        }

        await expect(sprintHeader).toBeAttached({ timeout: SF_TIMEOUT });

        // Check for "No active sprint" text inside the sprint header
        const noSprintText = sprintHeader.locator('.sprint-inline__empty');
        const hasNoSprint = await noSprintText
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (hasNoSprint) {
            // The "New Sprint" button is a lightning-button inside the sprint header
            const newSprintBtn = sprintHeader.locator(
                'lightning-button[label="New Sprint"]'
            );
            await expect(newSprintBtn).toBeVisible({ timeout: SF_TIMEOUT });
        }
    });

    test('tab switching updates active state CSS class', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const boardTab = boardPage.page.locator('[data-tab-id="board"]');
        const backlogTab = boardPage.page.locator('[data-tab-id="backlog"]');

        // Board tab starts active
        await expect(boardTab).toHaveClass(/topbar-tab--active/, {
            timeout: SF_TIMEOUT
        });

        // Switch to backlog — backlog tab becomes active, board tab loses active
        await boardPage.switchToBacklogTab();
        await expect(backlogTab).toHaveClass(/topbar-tab--active/, {
            timeout: SF_TIMEOUT
        });
        await expect(boardTab).not.toHaveClass(/topbar-tab--active/);

        // Switch back to board — board tab becomes active again
        await boardPage.switchToBoardTab();
        await expect(boardTab).toHaveClass(/topbar-tab--active/, {
            timeout: SF_TIMEOUT
        });
        await expect(backlogTab).not.toHaveClass(/topbar-tab--active/);
    });
});
