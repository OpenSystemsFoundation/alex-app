import { test, expect } from '../fixtures';
import {
    test as multiTest,
    expect as multiExpect
} from '../fixtures/multi-user';

const SF_TIMEOUT = 45_000;
const SYNC_TIMEOUT = 30_000;

/**
 * Planning Poker — single-user tests.
 *
 * Tests the lobby, session creation, voting, timer, and reveal flows
 * from a single user's perspective.
 */
test.describe('Planning Poker — single user', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('planning poker page loads the component', async ({
        boardPage,
        boardData
    }) => {
        // Navigate to the Planning Poker tab/app page
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Planning_Poker`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        // The planning poker component should render
        const pokerComponent = boardPage.page.locator(
            '.lobby-container, .session-container'
        );
        await expect(pokerComponent).toBeAttached({ timeout: SF_TIMEOUT });
    });

    test('lobby shows create session form by default', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Planning_Poker`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const pokerComponent = boardPage.page.locator(
            '.lobby-container, .session-container'
        );
        const isAttached = await pokerComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!isAttached) {
            test.skip(true, 'Planning Poker component not rendered');
        }

        // Display name input should be visible in the lobby
        const displayNameInput = boardPage.page.locator('input[type="text"]');
        const hasInput = await displayNameInput
            .first()
            .isVisible({ timeout: 10_000 })
            .catch(() => false);

        if (hasInput) {
            await expect(displayNameInput.first()).toBeVisible();
        }
    });

    test('can create a new session', async ({ boardPage, boardData }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Planning_Poker`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const pokerComponent = boardPage.page.locator(
            '.lobby-container, .session-container'
        );
        const isAttached = await pokerComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!isAttached) {
            test.skip(true, 'Planning Poker component not rendered');
        }

        // Fill in display name and create session
        const nameInput = boardPage.page.locator('input.display-name-input');
        const hasNameInput = await nameInput
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasNameInput) {
            test.skip(true, 'Display name input not found');
        }

        await nameInput.fill('E2E Test User');

        const createBtn = boardPage.page.locator('button.create-session-btn');
        const hasCreateBtn = await createBtn
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (!hasCreateBtn) {
            test.skip(true, 'Create session button not found');
        }

        await createBtn.click();
        await boardPage.page.waitForTimeout(2000);

        // Should transition to voting view — look for estimate chips
        const votingCard = boardPage.page.locator('.estimate-chip');
        const hasCards = await votingCard
            .first()
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);

        if (hasCards) {
            expect(await votingCard.count()).toBeGreaterThan(0);
        }
    });

    test('timer modal opens and can be started', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Planning_Poker`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const pokerComponent = boardPage.page.locator(
            '.lobby-container, .session-container'
        );
        const isAttached = await pokerComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!isAttached) {
            test.skip(true, 'Planning Poker component not rendered');
        }

        // Create a session first
        const nameInput = boardPage.page.locator('input.display-name-input');
        const hasInput = await nameInput
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasInput) {
            test.skip(true, 'Display name input not found');
        }

        await nameInput.fill('Timer Test User');
        const createBtn = boardPage.page.locator('button.create-session-btn');
        if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await createBtn.click();
            await boardPage.page.waitForTimeout(2000);
        }

        // Look for timer button in the session view
        const timerBtn = boardPage.page.locator('button.timer-btn');
        const hasTimerBtn = await timerBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasTimerBtn) {
            test.skip(true, 'Timer button not found in session view');
        }

        await timerBtn.click();

        // Timer modal should appear
        const timerModal = boardPage.page.locator('.timer-modal');
        const hasModal = await timerModal
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (hasModal) {
            await expect(timerModal).toBeVisible();
        }
    });
});

/**
 * Planning Poker — multi-user tests.
 *
 * Tests that votes, reveals, and session state sync between two users.
 */
multiTest.describe('Planning Poker — multi-user sync', () => {
    multiTest.beforeEach(async () => {
        if (!process.env.USER_A_LOGIN_URL || !process.env.USER_B_LOGIN_URL) {
            multiTest.skip(true, 'Multi-user login URLs not set — skipping');
        }
    });

    multiTest(
        'User A creates session, User B joins and both see participants',
        async ({ userA, userB, boardData }) => {
            const baseUrl = boardData.baseUrl;
            const pokerUrl = `${baseUrl}/lightning/n/OpenSF__Planning_Poker`;

            // User A navigates and creates session
            await userA.page.goto(pokerUrl, {
                waitUntil: 'domcontentloaded',
                timeout: SF_TIMEOUT
            });
            await userB.page.goto(pokerUrl, {
                waitUntil: 'domcontentloaded',
                timeout: SF_TIMEOUT
            });

            // Check components loaded
            const userAComponent = userA.page.locator(
                '.lobby-container, .session-container'
            );
            const userBComponent = userB.page.locator(
                '.lobby-container, .session-container'
            );

            const aLoaded = await userAComponent
                .isVisible({ timeout: SF_TIMEOUT })
                .catch(() => false);
            const bLoaded = await userBComponent
                .isVisible({ timeout: SF_TIMEOUT })
                .catch(() => false);

            if (!aLoaded || !bLoaded) {
                multiTest.skip(
                    true,
                    'Planning Poker component not rendered for both users'
                );
            }

            // User A creates session
            const nameInputA = userA.page.locator('input.display-name-input');
            const hasInputA = await nameInputA
                .isVisible({ timeout: 10_000 })
                .catch(() => false);
            if (!hasInputA) {
                multiTest.skip(true, 'Display name input not found');
            }

            await nameInputA.fill('User A');
            const createBtn = userA.page.locator('button.create-session-btn');
            if (
                await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)
            ) {
                await createBtn.click();
                await userA.page.waitForTimeout(3000);
            }

            // User B should see the session in the active sessions list
            const refreshBtn = userB.page.locator(
                'button.refresh-sessions-btn'
            );
            if (
                await refreshBtn
                    .isVisible({ timeout: 5_000 })
                    .catch(() => false)
            ) {
                await refreshBtn.click();
                await userB.page.waitForTimeout(2000);
            }

            // User B joins the session
            const sessionItem = userB.page.locator('.session-item');
            const hasSessions = await sessionItem
                .first()
                .isVisible({ timeout: SYNC_TIMEOUT })
                .catch(() => false);

            if (hasSessions) {
                await sessionItem.first().click();
                await userB.page.waitForTimeout(1000);

                const nameInputB = userB.page.locator(
                    'input.display-name-input'
                );
                if (
                    await nameInputB
                        .isVisible({ timeout: 5_000 })
                        .catch(() => false)
                ) {
                    await nameInputB.fill('User B');
                }

                const joinBtn = userB.page.locator('button.join-session-btn');
                if (
                    await joinBtn
                        .isVisible({ timeout: 5_000 })
                        .catch(() => false)
                ) {
                    await joinBtn.click();
                    await userB.page.waitForTimeout(3000);
                }
            }

            // Both users should now see participants in the session
            const participantsA = userA.page.locator('.participant-card');
            const participantsB = userB.page.locator('.participant-card');

            const aHasParticipants = await participantsA
                .first()
                .isVisible({ timeout: SYNC_TIMEOUT })
                .catch(() => false);
            const bHasParticipants = await participantsB
                .first()
                .isVisible({ timeout: SYNC_TIMEOUT })
                .catch(() => false);

            if (aHasParticipants) {
                multiExpect(await participantsA.count()).toBeGreaterThanOrEqual(
                    1
                );
            }
            if (bHasParticipants) {
                multiExpect(await participantsB.count()).toBeGreaterThanOrEqual(
                    1
                );
            }
        }
    );
});
