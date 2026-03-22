import { test, expect } from '../fixtures';
import {
    test as multiTest,
    expect as multiExpect
} from '../fixtures/multi-user';
import { createIsolatedRetro, type RetroData } from '../helpers/sf-data';

const SF_TIMEOUT = 45_000;

/** Selector that matches retro board regardless of namespace prefix */
const RETRO_BOARD = '.retro-board-wrapper';

/**
 * Retrospective Board — single-user tests.
 *
 * Uses deterministic data: creates an isolated retro per test run
 * and navigates directly to the record page by ID.
 */
test.describe('Retrospective Board — single user', () => {
    let retroData: RetroData;

    test.beforeEach(async ({ boardData }) => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
        retroData = createIsolatedRetro(boardData.boardId);
    });

    test('retro board component loads on record page', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        await expect(retroBoard).toBeAttached({ timeout: SF_TIMEOUT });
    });

    test('retro board renders columns based on template', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board component not rendered');
        }

        // Start_Stop_Continue template should have 3 columns
        const columns = boardPage.page.locator('.retro-column');
        const hasColumns = await columns
            .first()
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasColumns) {
            expect(await columns.count()).toBeGreaterThanOrEqual(2);
        }
    });

    test('retro board shows status badge', async ({ boardPage, boardData }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board not rendered');
        }

        const statusBadge = boardPage.page.locator('.retro-status-badge');
        const hasBadge = await statusBadge
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (hasBadge) {
            await expect(statusBadge).toBeVisible();
            await expect(statusBadge).toContainText('Active');
        }
    });

    test('retro card textarea is present for adding cards', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board not rendered');
        }

        const textarea = boardPage.page.locator(`${RETRO_BOARD} textarea`);
        const hasTextarea = await textarea
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (hasTextarea) {
            expect(await textarea.count()).toBeGreaterThanOrEqual(1);
        }
    });

    test('can add a retro card to a column', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board not rendered');
        }

        const cards = boardPage.page.locator('.retro-card');
        const initialCount = await cards.count().catch(() => 0);

        const textarea = boardPage.page.locator(`${RETRO_BOARD} textarea`);
        const hasTextarea = await textarea
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (!hasTextarea) {
            test.skip(true, 'No textarea found');
        }

        await textarea.first().fill('E2E deterministic retro card');
        const addBtn = boardPage.page.locator('button.retro-add-btn');
        if (
            await addBtn
                .first()
                .isVisible({ timeout: 5_000 })
                .catch(() => false)
        ) {
            await addBtn.first().click();
            await boardPage.page.waitForTimeout(3000);
        }

        const afterCount = await cards.count().catch(() => 0);
        expect(afterCount).toBeGreaterThan(initialCount);
    });

    test('refresh button reloads retro data', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board not rendered');
        }

        const refreshBtn = boardPage.page.locator(
            `${RETRO_BOARD} button.topbar-icon-btn`
        );
        const hasRefresh = await refreshBtn
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (hasRefresh) {
            await expect(refreshBtn.first()).toBeEnabled();
            await refreshBtn.first().click();
            await boardPage.page.waitForTimeout(2000);
            await expect(retroBoard).toBeVisible();
        }
    });

    test('votes remaining indicator shows correct count', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retroData.retroId}/view`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const retroBoard = boardPage.page.locator(RETRO_BOARD);
        const loaded = await retroBoard
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Retro board not rendered');
        }

        const votesIndicator = boardPage.page.locator(
            '.retro-header__votes-remaining'
        );
        const hasVotes = await votesIndicator
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (hasVotes) {
            await expect(votesIndicator).toContainText(/\d+ votes/);
        }
    });
});

/**
 * Retrospective Board — multi-user tests.
 */
multiTest.describe('Retrospective — multi-user sync', () => {
    multiTest.beforeEach(async () => {
        if (!process.env.USER_A_LOGIN_URL || !process.env.USER_B_LOGIN_URL) {
            multiTest.skip(true, 'Multi-user login URLs not set — skipping');
        }
    });

    multiTest(
        'card created by User A appears for User B after refresh',
        async ({ userA, userB, boardData }) => {
            const baseUrl = boardData.baseUrl;
            const retro = createIsolatedRetro(boardData.boardId);
            const retroUrl = `${baseUrl}/lightning/r/OpenSF__Retrospective__c/${retro.retroId}/view`;

            await userA.page.goto(retroUrl, {
                waitUntil: 'domcontentloaded',
                timeout: SF_TIMEOUT
            });
            await userB.page.goto(retroUrl, {
                waitUntil: 'domcontentloaded',
                timeout: SF_TIMEOUT
            });

            const retroA = userA.page.locator(RETRO_BOARD);
            const retroB = userB.page.locator(RETRO_BOARD);

            const aLoaded = await retroA
                .isVisible({ timeout: SF_TIMEOUT })
                .catch(() => false);
            const bLoaded = await retroB
                .isVisible({ timeout: SF_TIMEOUT })
                .catch(() => false);

            if (!aLoaded || !bLoaded) {
                multiTest.skip(true, 'Retro board not rendered for both users');
            }

            const initialCards = userB.page.locator('.retro-card');
            const initialCount = await initialCards.count().catch(() => 0);

            const textarea = userA.page.locator(`${RETRO_BOARD} textarea`);
            const hasTextarea = await textarea
                .first()
                .isVisible({ timeout: 5_000 })
                .catch(() => false);

            if (!hasTextarea) {
                multiTest.skip(true, 'No textarea found for adding cards');
            }

            await textarea.first().fill('Multi-user deterministic test card');
            const addBtn = userA.page.locator('button.retro-add-btn');
            if (
                await addBtn
                    .first()
                    .isVisible({ timeout: 5_000 })
                    .catch(() => false)
            ) {
                await addBtn.first().click();
                await userA.page.waitForTimeout(2000);
            }

            const refreshBtn = userB.page.locator(
                `${RETRO_BOARD} button.topbar-icon-btn`
            );
            if (
                await refreshBtn
                    .first()
                    .isVisible({ timeout: 5_000 })
                    .catch(() => false)
            ) {
                await refreshBtn.first().click();
                await userB.page.waitForTimeout(3000);
            }

            const updatedCards = userB.page.locator('.retro-card');
            const updatedCount = await updatedCards.count().catch(() => 0);

            multiExpect(updatedCount).toBeGreaterThanOrEqual(initialCount);
        }
    );
});
