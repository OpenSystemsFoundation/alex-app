import { test as base, expect } from '@playwright/test';
import { BoardPage } from '../pages';
import { getSampleBoardData, type BoardData } from '../helpers/sf-data';

export type { BoardData } from '../helpers/sf-data';

export interface BoardDataFixture extends BoardData {
    baseUrl: string;
}

interface AlexFixtures {
    boardPage: BoardPage;
    boardData: BoardDataFixture;
}

let cachedBoardData: BoardData | null = null;
let baseUrl: string = '';

/**
 * Extended Playwright test with custom fixtures for the Alex app.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('my test', async ({ boardPage, boardData }) => { ... });
 */
export const test = base.extend<AlexFixtures>({
    /**
     * Board page object -- pre-initialized with the Playwright page.
     * Does NOT navigate automatically; call boardPage.open() in your test.
     */
    boardPage: async ({ page }, use) => {
        await use(new BoardPage(page));
    },

    /**
     * Board test data -- queried once from the scratch org and cached.
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

export { expect };
