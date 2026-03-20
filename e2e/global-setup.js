// @ts-check
const { chromium } = require('@playwright/test');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'storageState.json');

/**
 * Global setup: authenticate once via the frontdoor URL and save
 * the session cookies so all tests can reuse them.
 */
async function globalSetup() {
    const loginUrl = process.env.SCRATCH_ORG_URL;
    if (!loginUrl) return;

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000
    });

    // Wait for Salesforce to settle after frontdoor redirect
    await page.waitForTimeout(5000);

    // Save the authenticated session
    await context.storageState({ path: STORAGE_STATE_PATH });
    await browser.close();
}

module.exports = globalSetup;
module.exports.STORAGE_STATE_PATH = STORAGE_STATE_PATH;
