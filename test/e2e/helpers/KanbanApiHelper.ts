import { Page } from '@playwright/test';

/**
 * API Helper for Kanban Board testing
 * Handles Salesforce API operations for test data management
 */
export class KanbanApiHelper {
    private page: Page;
    private accessToken: string;
    private instanceUrl: string;

    constructor(page: Page, accessToken: string, instanceUrl: string) {
        this.page = page;
        this.accessToken = accessToken;
        this.instanceUrl = instanceUrl;
    }

    /**
     * Delete all cards on the board via API (bulk delete for test cleanup)
     * Uses anonymous Apex for reliable bulk deletion
     */
    async deleteAllCards(): Promise<void> {
        // Anonymous Apex code to delete all cards
        const apexCode = `List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
Database.delete(cards, false);`;

        await this.executeApex(apexCode);

        // Wait for all cards to be removed from UI
        await this.page.waitForTimeout(2000);

        // Additional wait time before next test to ensure UI is fully settled
        await this.page.waitForTimeout(1000);
    }

    /**
     * Delete all boards via API (for final test cleanup)
     * Uses anonymous Apex for reliable bulk deletion
     * WARNING: This deletes ALL boards in the org. Use with caution.
     */
    async deleteAllBoards(): Promise<void> {
        // Anonymous Apex code to delete all boards (cascade delete handles columns and cards)
        const apexCode = `List<OpenSF__Board__c> boards = [SELECT Id FROM OpenSF__Board__c];
Database.delete(boards, false);`;

        await this.executeApex(apexCode);
    }

    /**
     * Execute anonymous Apex code
     */
    private async executeApex(apexCode: string): Promise<void> {
        const response = await this.page.request.get(
            `${this.instanceUrl}/services/data/v60.0/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(apexCode)}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Failed to execute Apex: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
        }
    }

    /**
     * Create a card via Salesforce REST API (for test setup)
     */
    async createCard(
        columnId: string,
        title: string,
        description?: string,
        lexoRankPosition?: string
    ): Promise<string> {
        const cardData = {
            Subject__c: title,
            Description__c: description || '',
            Column__c: columnId,
            LexoRankPosition__c: lexoRankPosition || '0|i00000:'
        };

        const response = await this.page.request.post(
            `${this.instanceUrl}/services/data/v60.0/sobjects/OpenSF__Card__c`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: cardData
            }
        );

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Failed to create card via API: ${errorText}`);
        }

        const result = await response.json();
        return result.id;
    }

    /**
     * Delete a card via Salesforce REST API
     */
    async deleteCard(cardId: string): Promise<void> {
        const response = await this.page.request.delete(
            `${this.instanceUrl}/services/data/v60.0/sobjects/OpenSF__Card__c/${cardId}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Failed to delete card via API: ${errorText}`);
        }

        // Wait for card to be removed from UI
        await this.page.waitForTimeout(1000);
    }
}
