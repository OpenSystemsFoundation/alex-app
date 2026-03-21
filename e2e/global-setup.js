// @ts-check
const { chromium, firefox, webkit } = require('@playwright/test');
const { execSync } = require('child_process');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'storageState.json');
const TARGET_ORG = process.env.SF_TARGET_ORG || 'e2e-test';
const SF_ENV = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };

/**
 * Global setup:
 * 1. Reset test data via Apex scripts (idempotent)
 * 2. Authenticate once via frontdoor URL and save session cookies
 */
async function globalSetup() {
    const loginUrl = process.env.SCRATCH_ORG_URL;
    if (!loginUrl) return;

    // Reset test data — create a fresh filled board
    console.log('[global-setup] Creating fresh E2E test data...');
    execSync(
        `sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org ${TARGET_ORG}`,
        { encoding: 'utf8', timeout: 60_000, env: SF_ENV, stdio: 'inherit' }
    );

    // Authenticate and save session — use whichever browser is installed
    console.log('[global-setup] Authenticating via frontdoor...');
    let browser;
    for (const browserType of [chromium, firefox, webkit]) {
        try {
            browser = await browserType.launch();
            break;
        } catch {
            // Browser not installed, try next
        }
    }
    if (!browser) throw new Error('No browser installed for global setup');
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000
    });

    await page.waitForTimeout(5000);
    await context.storageState({ path: STORAGE_STATE_PATH });
    await browser.close();
}

module.exports = globalSetup;
module.exports.STORAGE_STATE_PATH = STORAGE_STATE_PATH;
