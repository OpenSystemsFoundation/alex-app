import { test as base } from '@playwright/test';
import { KanbanBoardPage } from '../pages/KanbanBoardPage';
import { SalesforceCLI } from '../helpers/salesforce-cli';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extended test fixtures with board creation per test
 * All boards are cleaned up at the end of the test suite (global teardown)
 */
type TestFixtures = {
    kanbanPage: KanbanBoardPage;
    authenticatedPage: KanbanBoardPage;
    testBoard: {
        boardId: string;
        columnIds: string[];
        cleanup: () => Promise<void>;
    };
    orgInfo: {
        instanceUrl: string;
        accessToken: string;
        orgAlias: string;
    };
    sfCli: SalesforceCLI;
};

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
    /**
     * Org info fixture - loads scratch org information
     */
    orgInfo: async ({}, use) => {
        const orgInfoPath = path.join(__dirname, '../.auth/org-info.json');

        if (!fs.existsSync(orgInfoPath)) {
            throw new Error(
                `Org info not found. Global setup may have failed. Expected: ${orgInfoPath}`
            );
        }

        const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));
        await use(orgInfo);
    },

    /**
     * SalesforceCLI fixture - provides CLI helper
     */
    sfCli: async ({ orgInfo }, use) => {
        const sfCli = new SalesforceCLI(orgInfo.orgAlias);
        await use(sfCli);
    },

    /**
     * Test board fixture - creates a unique board for each test
     * All boards are cleaned up at the end of the test suite (global teardown)
     */
    testBoard: async ({ sfCli }, use, testInfo) => {
        const { boardId, columnIds } = await sfCli.createTestBoard();

        const cleanup = async () => {
            await sfCli.deleteBoard(boardId);
        };

        // Provide board ID, column IDs, and cleanup function to the test
        await use({ boardId, columnIds, cleanup });

        // No automatic cleanup - all boards will be deleted together in global teardown
    },

    /**
     * Kanban board page fixture
     */
    kanbanPage: async ({ page, orgInfo, testBoard }, use) => {
        const kanbanPage = new KanbanBoardPage(
            page,
            orgInfo.accessToken,
            orgInfo.instanceUrl
        );
        await use(kanbanPage);
    },

    /**
     * Authenticated page fixture - ensures user is logged in
     */
    authenticatedPage: async ({ page, context, orgInfo, testBoard }, use) => {
        // Set the base URL for the page from org info
        const instanceUrl = orgInfo.instanceUrl;

        // Set access token as cookie for authentication
        await context.addCookies([
            {
                name: 'sid',
                value: orgInfo.accessToken,
                domain: new URL(instanceUrl).hostname,
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            }
        ]);

        const kanbanPage = new KanbanBoardPage(
            page,
            orgInfo.accessToken,
            instanceUrl
        );

        // Navigate to the board using the full URL
        await page.goto(`${instanceUrl}/lightning/r/${testBoard.boardId}/view`);
        await kanbanPage.waitForBoardToLoad();

        await use(kanbanPage);
    }
});

export { expect } from '@playwright/test';
