import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceCLI } from './helpers/salesforce-cli';

/**
 * Global setup for Playwright with Salesforce scratch org
 * Creates ONE scratch org shared by all browsers for optimal performance
 * Each test will create its own board for isolation
 *
 * Environment Variables:
 * - PLAYWRIGHT_DEBUG_MODE=true : Reuse existing org, deploy metadata with --ignore-conflicts
 * - SF_ORG_ALIAS=alias : Custom org alias (default: playwright-test)
 *
 * When PLAYWRIGHT_DEBUG_MODE=true:
 * 1. Uses existing scratch org (creates it initially if it doesn't exist)
 * 2. Always deploys latest metadata changes with --ignore-conflicts flag
 */
async function globalSetup(config: FullConfig) {
    console.log('🎭 Playwright Global Setup - Single Org Optimized Mode\n');

    const orgAlias = process.env.SF_ORG_ALIAS || 'playwright-test';
    const reuseOrg = process.env.PLAYWRIGHT_DEBUG_MODE === 'true';
    const sfCli = new SalesforceCLI(orgAlias);

    // Initialize temp apex files for the test suite
    sfCli.initializeTempApexFiles();

    console.log(`📋 Setting up scratch org: ${orgAlias}\n`);

    try {
        let instanceUrl: string;
        let accessToken: string;

        if (reuseOrg) {
            const orgExists = await sfCli.scratchOrgExists();

            if (orgExists) {
                console.log(`✅ Found existing scratch org - reusing it`);

                // Get existing org info
                const orgInfo = await sfCli.getOrgInfo();
                instanceUrl = orgInfo.instanceUrl;
                accessToken = orgInfo.accessToken;

                // Always deploy metadata with conflict ignore when reusing org
                console.log(`📦 Deploying latest metadata changes...`);
                await sfCli.deployMetadata(true);
            } else {
                console.log(
                    `🆕 No existing org found - creating new scratch org`
                );
                // Don't create board in setup - tests will create their own
                const setup = await sfCli.setupWithoutBoard();
                instanceUrl = setup.instanceUrl;
                accessToken = setup.accessToken;
            }
        } else {
            console.log(`🆕 Creating new scratch org and deploying...`);
            // Don't create board in setup - tests will create their own
            const setup = await sfCli.setupWithoutBoard();
            instanceUrl = setup.instanceUrl;
            accessToken = setup.accessToken;
        }

        // Store org info for all tests to use
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
                    orgAlias
                },
                null,
                2
            )
        );

        // Authenticate browser session
        console.log(`🔐 Authenticating browser session...`);

        const browser = await chromium.launch();
        const context = await browser.newContext();

        // Set access token as cookie
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
            await page.goto(`${instanceUrl}/lightning/page/home`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            await page.waitForTimeout(3000);

            const isAuthenticated = await page.evaluate(() => {
                return (
                    document
                        .querySelector('body')
                        ?.classList.contains('slds-scope') ||
                    document.querySelector('[class*="oneOne"]') !== null
                );
            });

            if (!isAuthenticated) {
                console.warn(`⚠️  Warning: Authentication verification failed`);
            }

            // Save authentication state for all tests to use
            const authFile = path.join(__dirname, `.auth/user.json`);
            await context.storageState({ path: authFile });

            console.log(`✅ Setup complete!`);
            console.log(`   Instance: ${instanceUrl}`);
            console.log(`   Org: ${orgAlias}`);
            console.log(
                `\n💡 Note: Each test will create its own board for isolation\n`
            );
        } finally {
            await browser.close();
        }
    } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);
        throw error;
    }
}

export default globalSetup;
