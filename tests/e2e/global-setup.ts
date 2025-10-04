import { chromium, FullConfig } from '@playwright/test';
import { SalesforceLoginPage } from './pages/SalesforceLoginPage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup - runs once before all tests
 * Authenticates to Salesforce and saves session state
 */
async function globalSetup(config: FullConfig) {
    const authFile = path.join(__dirname, '.auth/user.json');

    // Skip if auth file already exists
    if (fs.existsSync(authFile)) {
        console.log('✅ Authentication file already exists, skipping login');
        return;
    }

    console.log('🔐 Authenticating to Salesforce...');

    const { baseURL } = config.projects[0].use;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to Salesforce login
        const loginPage = new SalesforceLoginPage(page);
        await loginPage.goto();

        // Login with credentials
        const username = process.env.SF_USERNAME;
        const password = process.env.SF_PASSWORD;

        if (!username || !password) {
            throw new Error(
                'SF_USERNAME and SF_PASSWORD must be set in environment variables'
            );
        }

        await loginPage.login(username, password);

        // Wait for successful login
        await page.waitForLoadState('networkidle');

        // Save authentication state
        const authDir = path.dirname(authFile);
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        await context.storageState({ path: authFile });
        console.log('✅ Authentication successful and saved');
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

export default globalSetup;
