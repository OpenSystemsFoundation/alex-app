import type { Page } from '@playwright/test';

/**
 * Base page object for Salesforce Lightning pages.
 * Handles common patterns: slow loads, shadow DOM, dismissing dialogs.
 */
export class BasePage {
    readonly page: Page;
    protected readonly timeout: number;

    constructor(page: Page) {
        this.page = page;
        this.timeout = 45_000;
    }

    /**
     * Navigate to a Lightning record page.
     * Uses domcontentloaded (SF never reaches networkidle).
     */
    async goto(url: string): Promise<void> {
        await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: this.timeout
        });
    }

    /**
     * Dismiss any blocking Salesforce dialogs (CSS errors, guidance panels).
     */
    async dismissDialogs(): Promise<void> {
        const errorDialog = this.page.locator(
            'div.auraErrorBox button:has-text("Cancel")'
        );
        if (await errorDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            await errorDialog.click();
        }

        const guidance = this.page.locator('button:has-text("Dismiss")');
        if (await guidance.isVisible({ timeout: 1000 }).catch(() => false)) {
            await guidance.click();
        }
    }

    /**
     * Wait for a Lightning component to render inside shadow DOM.
     * Playwright CSS selectors pierce open shadow DOM by default.
     */
    async waitForComponent(selector: string): Promise<void> {
        await this.page.waitForSelector(selector, {
            timeout: this.timeout
        });
    }
}
