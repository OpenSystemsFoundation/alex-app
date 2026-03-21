import {
    test as base,
    expect,
    type Page,
    type BrowserContext
} from '@playwright/test';
import { BoardPage } from '../pages';
import { getSampleBoardData, type BoardData } from '../helpers/sf-data';
import type { BoardDataFixture } from './index';

/**
 * Multi-user fixtures for real-time collaboration tests.
 *
 * Provides two independent browser contexts (User A and User B),
 * each with their own authenticated Salesforce session and BoardPage.
 *
 * Required env vars:
 *   USER_A_LOGIN_URL - frontdoor.jsp URL for User A (admin)
 *   USER_B_LOGIN_URL - frontdoor.jsp URL for User B (standard user)
 *
 * Usage:
 *   import { test, expect } from '../fixtures/multi-user';
 *   test('sync test', async ({ userA, userB, boardData }) => {
 *       await userA.board.open(boardData.baseUrl, boardData.boardId);
 *       await userB.board.open(boardData.baseUrl, boardData.boardId);
 *   });
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

let cachedBoardData: BoardData | null = null;
let baseUrl: string = '';

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
        if (!cachedBoardData) {
            cachedBoardData = getSampleBoardData();
            const loginUrl =
                process.env.USER_A_LOGIN_URL || process.env.SCRATCH_ORG_URL;
            if (loginUrl) {
                baseUrl = new URL(loginUrl).origin;
            }
        }
        await use({ ...cachedBoardData, baseUrl });
    }
});

export { expect };
