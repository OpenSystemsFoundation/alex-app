// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    retries: 1,
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        }
    ],
    reporter: [['html', { open: 'never' }], ['list']]
});
