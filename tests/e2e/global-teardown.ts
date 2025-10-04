import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceCLI } from './helpers/salesforce-cli';
import { chromium } from '@playwright/test';
import { KanbanBoardPage } from './pages/KanbanBoardPage';

/**
 * Global teardown - runs once after all tests
 * Cleans up the scratch org unless PLAYWRIGHT_DEBUG_MODE or KEEP_SCRATCH_ORG is set
 */
async function globalTeardown(config: FullConfig) {
    console.log('\n🧹 Playwright Global Teardown\n');

    // Read org info
    const orgInfoPath = path.join(__dirname, '.auth/org-info.json');

    if (!fs.existsSync(orgInfoPath)) {
        console.log('⚠️  No org info found, skipping cleanup');
        return;
    }

    try {
        const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));
        const orgAlias = orgInfo.orgAlias || 'playwright-test';
        const sfCli = new SalesforceCLI(orgAlias);

        // Always delete all boards and their data (columns, cards) using Anonymous Apex
        console.log('🗑️  Cleaning up test data (boards, columns, cards)...');

        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();
        const kanbanPage = new KanbanBoardPage(
            page,
            orgInfo.accessToken,
            orgInfo.instanceUrl
        );

        try {
            await kanbanPage.deleteAllBoardsViaApi();
            console.log('✅ Test data cleaned up successfully');
        } catch (error: any) {
            console.warn(
                `⚠️  Warning: Error cleaning up test data: ${error.message}`
            );
        } finally {
            await browser.close();
        }

        // Check if we should keep the org (for debugging or reuse)
        const debugMode = process.env.PLAYWRIGHT_DEBUG_MODE === 'true';
        const keepOrg = process.env.KEEP_SCRATCH_ORG === 'true';

        if (debugMode || keepOrg) {
            console.log(
                `\n🔄 ${debugMode ? 'PLAYWRIGHT_DEBUG_MODE' : 'KEEP_SCRATCH_ORG'} is set, preserving scratch org: ${orgAlias}`
            );
            console.log(`Instance URL: ${orgInfo.instanceUrl}`);
            console.log(
                `All boards were deleted - a new board will be created on next test run`
            );
            console.log('\nTo reuse this org, run tests with:');
            console.log(`  PLAYWRIGHT_DEBUG_MODE=true npx playwright test ...`);
            console.log('\nTo delete the org manually later, run:');
            console.log(
                `  sf org delete scratch --target-org ${orgAlias} --no-prompt`
            );
            return;
        }

        // Delete scratch org
        await sfCli.cleanup();

        // Clean up auth files
        const authDir = path.join(__dirname, '.auth');
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('✅ Auth files cleaned up');
        }

        console.log('\n✅ Teardown complete!\n');
    } catch (error: any) {
        console.error('⚠️  Teardown error:', error.message);
        // Don't throw - we don't want teardown failures to fail the test run
    }
}

export default globalTeardown;
