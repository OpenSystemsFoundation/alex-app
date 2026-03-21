// @ts-check

/**
 * Base page object for Salesforce Lightning pages.
 * Handles common patterns: slow loads, shadow DOM, dismissing dialogs.
 */
class BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.timeout = 45_000;
    }

    /**
     * Navigate to a Lightning record page.
     * Uses domcontentloaded (SF never reaches networkidle).
     * @param {string} url
     */
    async goto(url) {
        await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: this.timeout
        });
    }

    /**
     * Dismiss any blocking Salesforce dialogs (CSS errors, guidance panels).
     */
    async dismissDialogs() {
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
     * @param {string} selector
     */
    async waitForComponent(selector) {
        await this.page.waitForSelector(selector, {
            timeout: this.timeout
        });
    }
}

module.exports = { BasePage };
