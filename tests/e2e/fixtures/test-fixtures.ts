import { test as base, expect } from '@playwright/test';
import { SalesforceLoginPage } from '../pages/SalesforceLoginPage';
import { KanbanBoardPage } from '../pages/KanbanBoardPage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extended test fixtures with authenticated context and page objects
 */
type TestFixtures = {
    loginPage: SalesforceLoginPage;
    kanbanPage: KanbanBoardPage;
    authenticatedPage: KanbanBoardPage;
};

/**
 * Storage state file for authenticated sessions
 */
const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
    /**
     * Login page fixture
     */
    loginPage: async ({ page }, use) => {
        const loginPage = new SalesforceLoginPage(page);
        await use(loginPage);
    },

    /**
     * Kanban board page fixture
     */
    kanbanPage: async ({ page }, use) => {
        const kanbanPage = new KanbanBoardPage(page);
        await use(kanbanPage);
    },

    /**
     * Authenticated page fixture - automatically logs in before each test
     */
    authenticatedPage: async ({ browser }, use) => {
        // Check if we have a saved auth state
        let context;

        if (fs.existsSync(authFile)) {
            // Use saved authentication state
            context = await browser.newContext({ storageState: authFile });
        } else {
            // Create new context and authenticate
            context = await browser.newContext();
            const page = await context.newPage();

            // Login
            const loginPage = new SalesforceLoginPage(page);
            await loginPage.goto();

            const username = process.env.SF_USERNAME || '';
            const password = process.env.SF_PASSWORD || '';

            if (!username || !password) {
                throw new Error(
                    'SF_USERNAME and SF_PASSWORD must be set in environment variables'
                );
            }

            await loginPage.login(username, password);

            // Save authentication state
            const authDir = path.dirname(authFile);
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true });
            }
            await context.storageState({ path: authFile });

            await page.close();
        }

        // Create a new page with authenticated context
        const page = await context.newPage();
        const kanbanPage = new KanbanBoardPage(page);

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
