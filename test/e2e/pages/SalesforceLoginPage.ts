import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Salesforce Login page
 */
export class SalesforceLoginPage {
    readonly page: Page;
    readonly usernameInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameInput = page.locator('#username');
        this.passwordInput = page.locator('#password');
        this.loginButton = page.locator('#Login');
    }

    /**
     * Navigate to Salesforce login page
     */
    async goto() {
        await this.page.goto('/');
    }

    /**
     * Perform login action
     */
    async login(username: string, password: string) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginButton.click();

        // Wait for navigation to complete
        await this.page.waitForLoadState('networkidle');
    }
}
