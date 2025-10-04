import { test as base } from '@playwright/test';
import { KanbanBoardPage } from '../pages/KanbanBoardPage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extended test fixtures with scratch org context
 */
type TestFixtures = {
    kanbanPage: KanbanBoardPage;
    authenticatedPage: KanbanBoardPage;
    orgInfo: {
        instanceUrl: string;
        accessToken: string;
        boardId: string;
        orgAlias: string;
    };
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
                'Org info not found. Global setup may have failed.'
            );
        }

        const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));
        await use(orgInfo);
    },

    /**
     * Kanban board page fixture
     */
    kanbanPage: async ({ page, orgInfo }, use) => {
        const kanbanPage = new KanbanBoardPage(
            page,
            orgInfo.accessToken,
            orgInfo.instanceUrl
        );
        await use(kanbanPage);
    },

    /**
     * Authenticated page fixture - uses saved authentication state
     */
    authenticatedPage: async ({ browser, orgInfo }, use) => {
        const authFile = path.join(__dirname, '../.auth/user.json');

        if (!fs.existsSync(authFile)) {
            throw new Error(
                'Authentication state not found. Global setup may have failed.'
            );
        }

        // Create context with saved authentication
        const context = await browser.newContext({
            storageState: authFile,
            baseURL: orgInfo.instanceUrl
        });

        const page = await context.newPage();
        const kanbanPage = new KanbanBoardPage(
            page,
            orgInfo.accessToken,
            orgInfo.instanceUrl
        );

        await use(kanbanPage);

        // Cleanup
        await page.close();
        await context.close();
    }
});

/**
 * Export expect from Playwright
 */
export { expect } from '@playwright/test';
