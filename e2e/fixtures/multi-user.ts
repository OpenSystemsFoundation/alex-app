import {
    test as base,
    expect,
    type Page,
    type BrowserContext
} from '@playwright/test';
import { BoardPage } from '../pages';
import { createIsolatedBoard } from '../helpers/sf-data';
import type { BoardDataFixture } from './index';

/**
 * Multi-user fixtures for real-time collaboration tests.
 *
 * Each test gets its own isolated board created via SF CLI Apex.
 * This eliminates shared state and serial dependencies between tests.
 *
 * Required env vars:
 *   USER_A_LOGIN_URL - frontdoor.jsp URL for User A (admin)
 *   USER_B_LOGIN_URL - frontdoor.jsp URL for User B (standard user)
 */

export interface UserFixture {
    page: Page;
    board: BoardPage;
    context: BrowserContext;
}

interface MultiUserFixtures {
    userA: UserFixture;
    userB: UserFixture;
    boardData: BoardDataFixture;
}

/**
 * Authenticate a Salesforce session via frontdoor URL.
 * Waits for all redirects to settle before returning.
 */
async function sfLogin(page: Page, loginUrl: string): Promise<void> {
    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000
    });

    // Wait for SF redirect chain to settle (frontdoor -> setup -> lightning)
    // Poll until URL stops changing
    let lastUrl = '';
    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        if (currentUrl === lastUrl) break;
        lastUrl = currentUrl;
    }
}

export const test = base.extend<MultiUserFixtures>({
    userA: async ({ browser }, use) => {
        const loginUrl =
            process.env.USER_A_LOGIN_URL || process.env.SCRATCH_ORG_URL;
        if (!loginUrl) throw new Error('USER_A_LOGIN_URL not set');

        const context = await browser.newContext();
        const page = await context.newPage();
        await sfLogin(page, loginUrl);

        const board = new BoardPage(page);
        await use({ page, board, context });
        await context.close();
    },

    userB: async ({ browser }, use) => {
        const loginUrl = process.env.USER_B_LOGIN_URL;
        if (!loginUrl) throw new Error('USER_B_LOGIN_URL not set');

        const context = await browser.newContext();
        const page = await context.newPage();
        await sfLogin(page, loginUrl);

        const board = new BoardPage(page);
        await use({ page, board, context });
        await context.close();
    },

    boardData: async ({}, use) => {
        // Each test gets a completely fresh board — no shared state
        const data = createIsolatedBoard('multi-user');
        const loginUrl =
            process.env.USER_A_LOGIN_URL || process.env.SCRATCH_ORG_URL;
        const baseUrl = loginUrl ? new URL(loginUrl).origin : '';
        await use({ ...data, baseUrl });
    }
});

export { expect };
