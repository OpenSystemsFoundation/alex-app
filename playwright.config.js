// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

const storageState = path.join(__dirname, 'e2e', '.auth', 'storageState.json');

module.exports = defineConfig({
    testDir: './e2e',
    testIgnore: ['**/global-setup.js'],
    timeout: 60_000,
    retries: 1,
    globalSetup: './e2e/global-setup.js',
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
