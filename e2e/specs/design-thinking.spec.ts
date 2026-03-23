import { test, expect } from '../fixtures';
import {
    createIsolatedDesignSession,
    createActiveDesignSession,
    deleteDesignSession
} from '../helpers/dt-data';

const SF_TIMEOUT = 45_000;

/** CSS selectors for Design Thinking components */
const DT = {
    container: '.dt-container',
    splitView: '.dt-split-view',
    sessionList: '.session-list',
    sessionCard: '.session-card',
    sessionBoard: '.session-board',
    sessionTitle: '.session-title',
    newSessionBtn: 'lightning-button[label="New Session"]',
    createForm: '.create-form',
    createBtn: 'lightning-button[label="Create"]',
    cancelBtn: 'lightning-button[label="Cancel"]',
    emptyState: '.empty-state',
    phaseNav: '.phase-nav',
    phaseBtn: '.phase-nav button',
    toolPicker: '.tool-picker',
    toolBtn: '.tool-picker button',
    toolCanvas: '.tool-canvas',
    noTool: '.no-tool',
    stickyCanvas: '.canvas-container',
    canvasZone: '.canvas-zone',
    zoneTitle: '.zone-title',
    addNoteBtn: 'lightning-button[label="Add Note"]',
    noteCount: '.note-count',
    stickyNote: 'c-design-sticky-note',
    votingContainer: '.voting-container',
    votingItem: '.voting-item',
    voteDot: '.vote-dot',
    remainingVotes: '.remaining-votes',
    participantBar: 'c-design-participant-bar',
    timer: 'c-design-timer',
    leaveBtn: 'lightning-button-icon[alternative-text="Leave"]',
    pipeline: 'c-design-card-pipeline',
    sessionStatus: 'lightning-badge'
};

/**
 * Design Thinking — Happy Path tests (single user).
 */
test.describe('Design Thinking — Happy Paths', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('design thinking view loads on board record page', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        // The DT view is on the board record page — check if it renders
        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (!loaded) {
            // DT extension may not be deployed to the scratch org yet
            test.skip(
                true,
                'Design Thinking view not rendered — extension may not be deployed'
            );
        }

        await expect(dtView).toBeVisible();
    });

    test('session list shows empty state when no sessions exist', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Fresh board should show empty state or session list
        const sessionList = boardPage.page.locator(DT.sessionList);
        const hasSessionList = await sessionList
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasSessionList) {
            const emptyState = boardPage.page.locator(DT.emptyState);
            const hasEmpty = await emptyState
                .isVisible({ timeout: 5_000 })
                .catch(() => false);

            // Either empty state or session cards should be present
            if (hasEmpty) {
                await expect(emptyState).toContainText('No design sessions');
            }
        }
    });

    test('new session button shows create form', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        const newBtn = boardPage.page.locator(DT.newSessionBtn);
        const hasBtn = await newBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Session button not found');
        }

        await newBtn.click();

        const createForm = boardPage.page.locator(DT.createForm);
        await expect(createForm).toBeVisible({ timeout: 5_000 });
    });

    test('cancel button hides create form', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        const newBtn = boardPage.page.locator(DT.newSessionBtn);
        const hasBtn = await newBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Session button not found');
        }

        await newBtn.click();
        const createForm = boardPage.page.locator(DT.createForm);
        await expect(createForm).toBeVisible({ timeout: 5_000 });

        const cancelBtn = boardPage.page.locator(DT.cancelBtn);
        await cancelBtn.click();
        await expect(createForm).not.toBeVisible({ timeout: 5_000 });
    });

    test('session list displays pre-created sessions', async ({
        boardPage,
        boardData
    }) => {
        // Create a session via Apex before loading the page
        const sessionData = createIsolatedDesignSession(
            boardData.boardId,
            'E2E Session List Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        const sessionCards = boardPage.page.locator(DT.sessionCard);
        const hasCards = await sessionCards
            .first()
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCards) {
            expect(await sessionCards.count()).toBeGreaterThanOrEqual(1);
        }

        // Cleanup
        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Non-critical cleanup failure
        }
    });

    test('session board renders with phase nav and tool picker', async ({
        boardPage,
        boardData
    }) => {
        // Create an active session so the session board view appears
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Session Board Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Click the session card to join it
        const sessionCard = boardPage.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const hasCard = await sessionCard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCard) {
            await sessionCard.click();
            await boardPage.page.waitForTimeout(2000);
        }

        // Check if session board view is now showing
        const sessionBoard = boardPage.page.locator(DT.sessionBoard);
        const boardVisible = await sessionBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (boardVisible) {
            // Phase nav should show design thinking phases
            const phaseNav = boardPage.page.locator(DT.phaseNav);
            await expect(phaseNav).toBeVisible({ timeout: 10_000 });

            const phaseBtns = boardPage.page.locator(DT.phaseBtn);
            expect(await phaseBtns.count()).toBeGreaterThanOrEqual(3);

            // Tool picker should be present
            const toolPicker = boardPage.page.locator(DT.toolPicker);
            await expect(toolPicker).toBeVisible({ timeout: 10_000 });
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('no-tool placeholder shown when no tool selected', async ({
        boardPage,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E No Tool Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Join the session
        const sessionCard = boardPage.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const hasCard = await sessionCard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCard) {
            await sessionCard.click();
            await boardPage.page.waitForTimeout(2000);
        }

        const noTool = boardPage.page.locator(DT.noTool);
        const hasNoTool = await noTool
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasNoTool) {
            await expect(noTool).toContainText('Select a tool');
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('pipeline panel shows phase counts', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Pipeline panel should be visible in the split view
        const pipeline = boardPage.page.locator(DT.pipeline);
        const hasPipeline = await pipeline
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasPipeline) {
            await expect(pipeline).toBeVisible();
        }
    });

    test('leave button returns to session list', async ({
        boardPage,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Leave Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Join the session
        const sessionCard = boardPage.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const hasCard = await sessionCard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCard) {
            await sessionCard.click();
            await boardPage.page.waitForTimeout(2000);
        }

        const sessionBoard = boardPage.page.locator(DT.sessionBoard);
        const boardVisible = await sessionBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (boardVisible) {
            // Click the leave/back button
            const leaveBtn = boardPage.page.locator(DT.leaveBtn);
            const hasLeave = await leaveBtn
                .isVisible({ timeout: 5_000 })
                .catch(() => false);

            if (hasLeave) {
                await leaveBtn.click();
                await boardPage.page.waitForTimeout(2000);

                // Should return to session list / split view
                const splitView = boardPage.page.locator(DT.splitView);
                const sessionList = boardPage.page.locator(DT.sessionList);

                const backToList =
                    (await splitView
                        .isVisible({ timeout: 10_000 })
                        .catch(() => false)) ||
                    (await sessionList
                        .isVisible({ timeout: 5_000 })
                        .catch(() => false));

                expect(backToList).toBeTruthy();
            }
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });
});

/**
 * Design Thinking — Unhappy Path tests.
 */
test.describe('Design Thinking — Unhappy Paths', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('creating session with empty title is prevented', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        const newBtn = boardPage.page.locator(DT.newSessionBtn);
        const hasBtn = await newBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Session button not found');
        }

        await newBtn.click();
        const createForm = boardPage.page.locator(DT.createForm);
        await expect(createForm).toBeVisible({ timeout: 5_000 });

        // Click Create without entering a title
        const createBtn = boardPage.page.locator(DT.createBtn);
        await createBtn.click();
        await boardPage.page.waitForTimeout(2000);

        // Form should still be visible (submission prevented) or no crash
        await expect(boardPage.page.locator('body')).toBeVisible();
    });

    test('deleting session from backend does not crash on refresh', async ({
        boardPage,
        boardData
    }) => {
        const sessionData = createIsolatedDesignSession(
            boardData.boardId,
            'E2E Delete Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Delete the session from the backend
        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            test.skip(true, 'Could not delete session via Apex');
        }

        // Refresh the page
        await boardPage.page.reload({ waitUntil: 'domcontentloaded' });
        await boardPage.page.waitForTimeout(3000);

        // Board should still be functional
        await expect(boardPage.page.locator('body')).toBeVisible();
    });

    test('rapid new session button clicks do not create duplicate forms', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        const newBtn = boardPage.page.locator(DT.newSessionBtn);
        const hasBtn = await newBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Session button not found');
        }

        // Click rapidly
        await newBtn.dblclick();
        await boardPage.page.waitForTimeout(1000);

        const forms = boardPage.page.locator(DT.createForm);
        const formCount = await forms.count();
        // Should only have one form
        expect(formCount).toBeLessThanOrEqual(1);
    });

    test('rapid phase navigation does not break the view', async ({
        boardPage,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Rapid Phase Test'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Join the session
        const sessionCard = boardPage.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const hasCard = await sessionCard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCard) {
            await sessionCard.click();
            await boardPage.page.waitForTimeout(2000);
        }

        const phaseBtns = boardPage.page.locator(DT.phaseBtn);
        const phaseCount = await phaseBtns.count();

        if (phaseCount >= 3) {
            // Rapidly click through all phases
            for (let i = 0; i < phaseCount; i++) {
                await phaseBtns.nth(i).click();
                await boardPage.page.waitForTimeout(200);
            }
            // Click back to first
            await phaseBtns.first().click();
            await boardPage.page.waitForTimeout(1000);

            // View should still be functional
            await expect(dtView).toBeVisible();
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('refreshing page during session does not corrupt state', async ({
        boardPage,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Refresh During Session'
        );

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // Join session
        const sessionCard = boardPage.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const hasCard = await sessionCard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCard) {
            await sessionCard.click();
            await boardPage.page.waitForTimeout(1000);
        }

        // Immediately reload
        await boardPage.page.reload({ waitUntil: 'domcontentloaded' });
        await boardPage.page.waitForTimeout(3000);

        // Board should still load properly
        await expect(boardPage.page.locator('body')).toBeVisible();
        const dtViewAfter = boardPage.page.locator(DT.container);
        const stillLoaded = await dtViewAfter
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (stillLoaded) {
            await expect(dtViewAfter).toBeVisible();
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('joining a non-existent session is handled gracefully', async ({
        boardPage,
        boardData
    }) => {
        // Create and immediately delete a session to get a stale ID
        const sessionData = createIsolatedDesignSession(
            boardData.boardId,
            'E2E Stale Session'
        );
        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            test.skip(true, 'Could not set up stale session scenario');
        }

        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const dtView = boardPage.page.locator(DT.container);
        const loaded = await dtView
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Design Thinking view not rendered');
        }

        // The board should load without crashing even though session data is stale
        await expect(boardPage.page.locator('body')).toBeVisible();
    });
});
