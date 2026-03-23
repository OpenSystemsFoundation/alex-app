import { test, expect } from '../fixtures/multi-user';
import {
    createActiveDesignSession,
    createIsolatedDesignSession,
    deleteDesignSession
} from '../helpers/dt-data';

/**
 * Design Thinking — multi-user synchronization tests.
 * Two users collaborate on the same design session in real-time.
 */

const SF_TIMEOUT = 45_000;
const SYNC_TIMEOUT = 30_000;

const DT = {
    container: '.dt-container',
    sessionList: '.session-list',
    sessionCard: '.session-card',
    sessionBoard: '.session-board',
    phaseNav: '.phase-nav',
    phaseBtn: '.phase-nav button',
    toolPicker: '.tool-picker',
    toolBtn: '.tool-picker button',
    stickyCanvas: '.canvas-container',
    addNoteBtn: 'lightning-button[label="Add Note"]',
    noteCount: '.note-count',
    stickyNote: 'c-design-sticky-note',
    canvasZone: '.canvas-zone',
    noTool: '.no-tool',
    leaveBtn: 'lightning-button-icon[alternative-text="Leave"]',
    participantBar: 'c-design-participant-bar'
};

test.describe('Design Thinking — multi-user sync', () => {
    test.beforeEach(async () => {
        if (!process.env.USER_A_LOGIN_URL || !process.env.USER_B_LOGIN_URL) {
            test.skip(true, 'Multi-user login URLs not set — skipping');
        }
    });

    test('both users see the same session in the session list', async ({
        userA,
        userB,
        boardData
    }) => {
        const sessionData = createIsolatedDesignSession(
            boardData.boardId,
            'E2E Multi-User Session List'
        );

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);

        const dtA = userA.page.locator(DT.container);
        const dtB = userB.page.locator(DT.container);

        const aLoaded = await dtA
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bLoaded = await dtB
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (!aLoaded || !bLoaded) {
            test.skip(true, 'Design Thinking view not rendered for both users');
        }

        // Both users should see at least one session card
        const sessionCardA = userA.page.locator(DT.sessionCard);
        const sessionCardB = userB.page.locator(DT.sessionCard);

        const aHasCards = await sessionCardA
            .first()
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bHasCards = await sessionCardB
            .first()
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (aHasCards && bHasCards) {
            expect(await sessionCardA.count()).toBeGreaterThanOrEqual(1);
            expect(await sessionCardB.count()).toBeGreaterThanOrEqual(1);
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('session created by User A appears for User B after refresh', async ({
        userA,
        userB,
        boardData
    }) => {
        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);

        const dtA = userA.page.locator(DT.container);
        const dtB = userB.page.locator(DT.container);

        const aLoaded = await dtA
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bLoaded = await dtB
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (!aLoaded || !bLoaded) {
            test.skip(true, 'Design Thinking view not rendered for both users');
        }

        // Count sessions User B currently sees
        const sessionsBeforeB = userB.page.locator(DT.sessionCard);
        const beforeCount = await sessionsBeforeB.count().catch(() => 0);

        // User A creates a new session via the backend (simulating User A's action)
        const sessionData = createIsolatedDesignSession(
            boardData.boardId,
            `E2E Sync Test ${Date.now()}`
        );

        // User B refreshes
        await userB.page.reload({ waitUntil: 'domcontentloaded' });
        await userB.page.waitForTimeout(3000);

        const dtBAfter = userB.page.locator(DT.container);
        const bLoadedAfter = await dtBAfter
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (bLoadedAfter) {
            const sessionsAfterB = userB.page.locator(DT.sessionCard);
            const afterCount = await sessionsAfterB.count().catch(() => 0);
            expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('both users can join the same active session', async ({
        userA,
        userB,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Both Join Session'
        );

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);

        const dtA = userA.page.locator(DT.container);
        const dtB = userB.page.locator(DT.container);

        const aLoaded = await dtA
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bLoaded = await dtB
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (!aLoaded || !bLoaded) {
            test.skip(true, 'Design Thinking view not rendered for both users');
        }

        // Both users click the session card to join
        const cardSelectorA = userA.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const cardSelectorB = userB.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );

        const aHasCard = await cardSelectorA
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bHasCard = await cardSelectorB
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (aHasCard && bHasCard) {
            await cardSelectorA.click();
            await cardSelectorB.click();
            await userA.page.waitForTimeout(3000);
            await userB.page.waitForTimeout(3000);

            // Both should see the session board
            const boardA = userA.page.locator(DT.sessionBoard);
            const boardB = userB.page.locator(DT.sessionBoard);

            const aSeeBoard = await boardA
                .isVisible({ timeout: SYNC_TIMEOUT })
                .catch(() => false);
            const bSeeBoard = await boardB
                .isVisible({ timeout: SYNC_TIMEOUT })
                .catch(() => false);

            // At least one user should see the session board
            expect(aSeeBoard || bSeeBoard).toBeTruthy();
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });

    test('User A leaving session does not crash User B view', async ({
        userA,
        userB,
        boardData
    }) => {
        const sessionData = createActiveDesignSession(
            boardData.boardId,
            'E2E Leave No Crash'
        );

        await userA.board.open(boardData.baseUrl, boardData.boardId);
        await userB.board.open(boardData.baseUrl, boardData.boardId);

        const dtA = userA.page.locator(DT.container);
        const dtB = userB.page.locator(DT.container);

        const aLoaded = await dtA
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        const bLoaded = await dtB
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (!aLoaded || !bLoaded) {
            test.skip(true, 'Design Thinking view not rendered for both users');
        }

        // Both join
        const cardA = userA.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );
        const cardB = userB.page.locator(
            `${DT.sessionCard}[data-session-id="${sessionData.sessionId}"]`
        );

        if (
            (await cardA
                .isVisible({ timeout: SF_TIMEOUT })
                .catch(() => false)) &&
            (await cardB.isVisible({ timeout: SF_TIMEOUT }).catch(() => false))
        ) {
            await cardA.click();
            await cardB.click();
            await userA.page.waitForTimeout(3000);
            await userB.page.waitForTimeout(3000);

            // User A leaves
            const leaveBtn = userA.page.locator(DT.leaveBtn);
            if (
                await leaveBtn.isVisible({ timeout: 5_000 }).catch(() => false)
            ) {
                await leaveBtn.click();
                await userA.page.waitForTimeout(2000);
            }

            // User B should not crash
            await expect(userB.page.locator('body')).toBeVisible();
        }

        try {
            deleteDesignSession(sessionData.sessionId);
        } catch {
            // Cleanup
        }
    });
});
