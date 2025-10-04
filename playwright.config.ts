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
    fullyParallel: false, // Sequential for scratch org tests
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for scratch org to avoid conflicts

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
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            }
        },

        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 }
            }
        },

        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1920, height: 1080 }
            }
        },

        // Mobile viewports for responsive testing
        {
            name: 'mobile-chrome',
            use: {
                ...devices['Pixel 5']
            }
        },

        {
            name: 'mobile-safari',
            use: {
                ...devices['iPhone 12']
            }
        }
    ],

    // Global setup/teardown for scratch org
    globalSetup: require.resolve('./tests/e2e/global-setup-scratch'),
    globalTeardown: require.resolve('./tests/e2e/global-teardown')
});
