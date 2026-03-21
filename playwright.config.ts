import { defineConfig } from '@playwright/test';
import * as path from 'path';

const storageState = path.join(__dirname, 'e2e', '.auth', 'storageState.json');

export default defineConfig({
    testDir: './e2e/specs',
    timeout: 120_000,
    retries: 1,
    globalSetup: './e2e/global-setup.ts',
    snapshotPathTemplate:
        '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
        storageState
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
