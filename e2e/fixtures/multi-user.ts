import {
    test as base,
    expect,
    type Page,
    type BrowserContext
} from '@playwright/test';
import { BoardPage } from '../pages';
import { createIsolatedBoard, sfFrontdoorUrl } from '../helpers/sf-data';
import type { BoardDataFixture } from './index';

/**
 * Multi-user fixtures for real-time collaboration tests.
 *
 * Each test gets its own isolated board created via SF CLI Apex.
 * This eliminates shared state and serial dependencies between tests.
 *
 * User B (an Alex User) is required, either as
 *   USER_B_ORG       - sf CLI alias/username of the second user (preferred:
 *                      a fresh login URL is generated for every test), or
 *   USER_B_LOGIN_URL - a frontdoor.jsp URL (one-time `otp=` URLs from
 *                      `sf org open --url-only` work for a single test only)
 * User A defaults to the scratch org admin (SF_TARGET_ORG); override with
 *   USER_A_ORG or USER_A_LOGIN_URL.
 */

/** Login URL for a user: fresh from the CLI alias when available. */
export function loginUrlFor(user: 'A' | 'B'): string | undefined {
    const orgAlias =
        process.env[`USER_${user}_ORG`] ||
        (user === 'A' ? process.env.SF_TARGET_ORG : undefined);
    if (orgAlias) return sfFrontdoorUrl(orgAlias);
    return (
        process.env[`USER_${user}_LOGIN_URL`] ||
        (user === 'A' ? process.env.SCRATCH_ORG_URL : undefined)
    );
}

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
        const loginUrl = loginUrlFor('A');
        if (!loginUrl) throw new Error('No login for User A');

        // Start from an empty session: browser.newContext() would otherwise
        // inherit the admin storageState from playwright.config.ts
        const context = await browser.newContext({
            storageState: { cookies: [], origins: [] }
        });
        const page = await context.newPage();
        await sfLogin(page, loginUrl);

        const board = new BoardPage(page);
        await use({ page, board, context });
        await context.close();
    },

    userB: async ({ browser }, use) => {
        const loginUrl = loginUrlFor('B');
        if (!loginUrl) throw new Error('USER_B_ORG / USER_B_LOGIN_URL not set');

        const context = await browser.newContext({
            storageState: { cookies: [], origins: [] }
        });
        const page = await context.newPage();
        await sfLogin(page, loginUrl);

        const board = new BoardPage(page);
        await use({ page, board, context });
        await context.close();
    },

    boardData: async ({}, use) => {
        // Each test gets a completely fresh board — no shared state
        const data = createIsolatedBoard('multi-user');
        const loginUrl = process.env.SCRATCH_ORG_URL;
        const baseUrl = loginUrl ? new URL(loginUrl).origin : '';
        await use({ ...data, baseUrl });
    }
});

export { expect };
