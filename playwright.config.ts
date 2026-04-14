import { defineConfig } from '@playwright/test';
import * as path from 'path';

const storageState = path.join(__dirname, 'e2e', '.auth', 'storageState.json');

export default defineConfig({
    testDir: './e2e/specs',
    timeout: 120_000,
    expect: {
        timeout: 30_000
    },
    retries: 1,
    /* Scratch orgs have limited API throughput — keep concurrency low */
    workers: process.env.CI ? 2 : 3,
    fullyParallel: true,
    globalSetup: './e2e/global-setup.ts',
    snapshotPathTemplate:
        '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
        storageState,
        /* Salesforce Lightning pages take 10-30s to fully render */
        navigationTimeout: 60_000,
        actionTimeout: 15_000
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        },
        {
            name: 'firefox',
            use: { browserName: 'firefox' }
        },
        {
            name: 'webkit',
            use: { browserName: 'webkit' }
        }
    ],
    reporter: [['html', { open: 'never' }], ['list']]
});
