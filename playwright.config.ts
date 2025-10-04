import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright configuration for Salesforce LWC Kanban Board E2E testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Directory where tests are located
    testDir: './tests/e2e',

    // Maximum time one test can run for
    timeout: 60 * 1000,

    // Test execution settings
    fullyParallel: true, // Run tests in parallel for faster execution
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 3,

    // Reporter configuration
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'playwright-results.xml' }],
        ['list']
    ],

    // Shared settings for all projects
    use: {
        // Base URL for your Salesforce org - set via environment variable
        baseURL:
            process.env.SF_INSTANCE_URL ||
            'https://your-org.lightning.force.com',

        // Browser context options
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Emulate timezone
        timezoneId: 'America/New_York',

        // Navigation timeout
        navigationTimeout: 30 * 1000,

        // Action timeout
        actionTimeout: 15 * 1000
    },

    // Configure projects for major browsers
    // Each project gets its own scratch org (via SF_ORG_ALIAS_${PROJECT_NAME})
    // Each project limited to 1 worker to ensure browsers run in parallel, not workers within a browser
    projects: [
        {
            name: 'chromium',
            testMatch: '**/*.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            }
        },

        {
            name: 'firefox',
            testMatch: '**/*.spec.ts',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 }
            }
        },

        {
            name: 'webkit',
            testMatch: '**/*.spec.ts',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1920, height: 1080 }
            }
        }
    ],

    // Global setup/teardown for scratch org
    // Optimized single-org setup with per-test board isolation
    globalSetup: require.resolve('./tests/e2e/global-setup'),
    globalTeardown: require.resolve('./tests/e2e/global-teardown')
});
