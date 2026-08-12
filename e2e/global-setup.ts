import { chromium, firefox, webkit } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

export const STORAGE_STATE_PATH = path.join(
    __dirname,
    '.auth',
    'storageState.json'
);

const TARGET_ORG: string = process.env.SF_TARGET_ORG || 'e2e-test';
const SF_ENV: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0'
};

/**
 * Global setup:
 * 1. Reset test data via Apex scripts (idempotent)
 * 2. Authenticate once via frontdoor URL and save session cookies
 */
async function globalSetup(): Promise<void> {
    const loginUrl = process.env.SCRATCH_ORG_URL;
    if (!loginUrl) return;

    // Reset test data — create a fresh filled board
    console.log('[global-setup] Creating fresh E2E test data...');
    execSync(
        `sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org ${TARGET_ORG}`,
        { encoding: 'utf8', timeout: 60_000, env: SF_ENV, stdio: 'pipe' }
    );

    // Authenticate and save session — use whichever browser is installed
    console.log('[global-setup] Authenticating via frontdoor...');
    let browser;
    // Route browser traffic through an outbound proxy when the
    // environment requires one (e.g. sandboxed cloud runners)
    const proxyOptions = process.env.HTTPS_PROXY
        ? { proxy: { server: process.env.HTTPS_PROXY } }
        : {};
    // Optional override for environments with a pre-installed Chromium
    // that doesn't match the Playwright version
    if (process.env.PW_CHROMIUM_PATH) {
        browser = await chromium.launch({
            executablePath: process.env.PW_CHROMIUM_PATH,
            ...proxyOptions
        });
    }
    if (!browser) {
        for (const browserType of [chromium, firefox, webkit]) {
            try {
                browser = await browserType.launch(proxyOptions);
                break;
            } catch {
                // Browser not installed, try next
            }
        }
    }
    if (!browser) throw new Error('No browser installed for global setup');
    const context = await browser.newContext(
        process.env.HTTPS_PROXY ? { ignoreHTTPSErrors: true } : {}
    );
    const page = await context.newPage();

    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000
    });

    await page.waitForTimeout(5000);
    await context.storageState({ path: STORAGE_STATE_PATH });
    await browser.close();
}

export default globalSetup;
