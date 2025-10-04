import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceCLI } from './helpers/salesforce-cli';

/**
 * Global setup for Playwright with Salesforce scratch org
 * This runs once before all tests
 *
 * Environment Variables:
 * - PLAYWRIGHT_DEBUG_MODE=true : Skip org creation, reuse existing org, deploy metadata with --ignore-conflicts
 * - SF_ORG_ALIAS=alias : Custom org alias (default: playwright-test)
 * - BOARD_ID=id : Reuse specific board ID when PLAYWRIGHT_DEBUG_MODE=true
 *
 * When PLAYWRIGHT_DEBUG_MODE=true:
 * 1. Uses existing scratch org (creates one initially if it doesn't exist)
 * 2. Always deploys latest metadata changes with --ignore-conflicts flag
 * 3. Reuses BOARD_ID if provided, or creates a new board
 */
async function globalSetup(config: FullConfig) {
    console.log('🎭 Playwright Global Setup\n');

    const orgAlias = process.env.SF_ORG_ALIAS || 'playwright-test';
    const reuseOrg = process.env.PLAYWRIGHT_DEBUG_MODE === 'true';
    const existingBoardId = process.env.BOARD_ID;

    const sfCli = new SalesforceCLI(orgAlias);

    try {
        let instanceUrl: string;
        let accessToken: string;
        let boardId: string;

        if (reuseOrg) {
            console.log(
                '🔄 PLAYWRIGHT_DEBUG_MODE enabled - checking for existing org\n'
            );

            // Check if org exists first
            const orgExists = await sfCli.scratchOrgExists();

            if (orgExists) {
                console.log('✅ Found existing scratch org - reusing it\n');

                // Get existing org info
                const orgInfo = await sfCli.getOrgInfo();
                instanceUrl = orgInfo.instanceUrl;
                accessToken = orgInfo.accessToken;

                // Always deploy metadata with conflict ignore when reusing org
                console.log('📦 Deploying latest metadata changes...');
                await sfCli.deployMetadata(true); // true = ignore conflicts

                // Use existing board or create a new one if not provided
                if (existingBoardId) {
                    console.log(`✅ Using existing board: ${existingBoardId}`);
                    boardId = existingBoardId;
                } else {
                    console.log('Creating new test board in existing org...');
                    boardId = await sfCli.createTestBoard();
                }
            } else {
                console.log(
                    '⚠️  No existing org found - creating new scratch org\n'
                );
                // Create new org on first run
                const setup = await sfCli.setup();
                instanceUrl = setup.instanceUrl;
                accessToken = setup.accessToken;
                boardId = setup.boardId;
                console.log(
                    '\n💡 Tip: Future runs will reuse this org for faster test execution!'
                );
            }
        } else {
            console.log('🆕 Creating new scratch org and deploying...\n');
            // Normal setup: create org, deploy, create board
            const setup = await sfCli.setup();
            instanceUrl = setup.instanceUrl;
            accessToken = setup.accessToken;
            boardId = setup.boardId;
        }

        // Store org info for tests
        const orgInfoPath = path.join(__dirname, '.auth/org-info.json');
        const orgInfoDir = path.dirname(orgInfoPath);

        if (!fs.existsSync(orgInfoDir)) {
            fs.mkdirSync(orgInfoDir, { recursive: true });
        }

        fs.writeFileSync(
            orgInfoPath,
            JSON.stringify(
                {
                    instanceUrl,
                    accessToken,
                    boardId,
                    orgAlias,
                    setupTimestamp: new Date().toISOString()
                },
                null,
                2
            )
        );

        console.log(`\n✅ Org info saved to: ${orgInfoPath}`);

        // Authenticate browser session
        console.log('\n🔐 Authenticating browser session...');

        const browser = await chromium.launch();
        const context = await browser.newContext();

        // Set up authentication by injecting the access token
        await context.addCookies([
            {
                name: 'sid',
                value: accessToken,
                domain: new URL(instanceUrl).hostname,
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            }
        ]);

        const page = await context.newPage();

        try {
            // Navigate to a Lightning page to establish session
            console.log('Navigating to Salesforce Lightning...');
            await page.goto(`${instanceUrl}/lightning/page/home`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait a bit for any redirects to settle
            await page.waitForTimeout(3000);

            // Check if we're authenticated by looking for Lightning elements
            const isAuthenticated = await page.evaluate(() => {
                return (
                    document
                        .querySelector('body')
                        ?.classList.contains('slds-scope') ||
                    document.querySelector('[class*="oneOne"]') !== null
                );
            });

            if (!isAuthenticated) {
                console.warn(
                    '⚠️  Warning: Authentication verification failed, but continuing...'
                );
            }

            // Save authentication state
            const authFile = path.join(__dirname, '.auth/user.json');
            await context.storageState({ path: authFile });

            console.log('✅ Browser authentication complete');
        } finally {
            await browser.close();
        }

        console.log('\n🎉 Global setup complete!\n');
    } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);

        // Cleanup on failure
        try {
            await sfCli.cleanup();
        } catch (cleanupError) {
            console.error('⚠️  Cleanup error:', cleanupError);
        }

        throw error;
    }
}

export default globalSetup;
