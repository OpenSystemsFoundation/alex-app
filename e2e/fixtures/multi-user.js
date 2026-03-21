// @ts-check
const base = require('@playwright/test');
const { BoardPage } = require('../pages');
const { getSampleBoardData } = require('../helpers/sf-data');

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
 *   const { test, expect } = require('../fixtures/multi-user');
 *   test('sync test', async ({ userA, userB, boardData }) => {
 *       await userA.board.open(boardData.baseUrl, boardData.boardId);
 *       await userB.board.open(boardData.baseUrl, boardData.boardId);
 *   });
 */

/** @type {import('../fixtures').BoardData | null} */
let cachedBoardData = null;
let baseUrl = '';

/**
 * Authenticate a Salesforce session via frontdoor URL.
 * Waits for all redirects to settle before returning.
 * @param {import('@playwright/test').Page} page
 * @param {string} loginUrl
 */
async function sfLogin(page, loginUrl) {
    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000
    });

    // Wait for SF redirect chain to settle (frontdoor → setup → lightning)
    // Poll until URL stops changing
    let lastUrl = '';
    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        if (currentUrl === lastUrl) break;
        lastUrl = currentUrl;
    }
}

const test = base.test.extend({
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

const { expect } = base;

module.exports = { test, expect };
