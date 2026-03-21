// @ts-check
const base = require('@playwright/test');
const { BoardPage } = require('../pages');
const { getSampleBoardData } = require('../helpers/sf-data');

/**
 * @typedef {Object} BoardData
 * @property {string} boardId
 * @property {Array<{Id: string, header: string}>} columns
 * @property {Array<{Id: string, Name: string, Subject: string, ColumnId: string}>} cards
 */

/** @type {BoardData | null} */
let cachedBoardData = null;

/** @type {string} */
let baseUrl = '';

/**
 * Extended Playwright test with custom fixtures for the Alex app.
 *
 * Usage:
 *   const { test, expect } = require('../fixtures');
 *   test('my test', async ({ boardPage, boardData }) => { ... });
 */
const test = base.test.extend({
    /**
     * Board page object — pre-initialized with the Playwright page.
     * Does NOT navigate automatically; call boardPage.open() in your test.
     */
    boardPage: async ({ page }, use) => {
        await use(new BoardPage(page));
    },

    /**
     * Board test data — queried once from the scratch org and cached.
     * Contains boardId, columns, and cards.
     * Also provides baseUrl for navigation.
     */
    boardData: async ({}, use) => {
        if (!cachedBoardData) {
            cachedBoardData = getSampleBoardData();
            const loginUrl = process.env.SCRATCH_ORG_URL || '';
            if (loginUrl) {
                baseUrl = new URL(loginUrl).origin;
            }
        }
        await use({ ...cachedBoardData, baseUrl });
    }
});

const { expect } = base;

module.exports = { test, expect };
