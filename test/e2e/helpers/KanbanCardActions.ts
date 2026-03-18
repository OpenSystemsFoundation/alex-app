import { Page, Locator } from '@playwright/test';
import { KanbanApiHelper } from './KanbanApiHelper';

/**
 * Card Actions Helper for Kanban Board testing
 * Handles card creation, update, and deletion operations
 */
export class KanbanCardActions {
    private page: Page;
    private apiHelper?: KanbanApiHelper;

    constructor(page: Page, apiHelper?: KanbanApiHelper) {
        this.page = page;
        this.apiHelper = apiHelper;
    }

    /**
     * Create a card via API (faster, for test setup)
     */
    async createCardViaApi(
        columnId: string,
        title: string,
        description?: string,
        lexoRankPosition?: string
    ): Promise<string> {
        if (!this.apiHelper) {
            throw new Error(
                'API helper not available. Provide accessToken and instanceUrl.'
            );
        }

        const cardId = await this.apiHelper.createCard(
            columnId,
            title,
            description,
            lexoRankPosition
        );

        // Wait for card to appear in UI
        await this.page.waitForTimeout(1000);

        return cardId;
    }

    /**
     * Create a card using the UI modal
     */
    async createCardViaModal(
        title: string,
        description?: string
    ): Promise<void> {
        // Wait for modal to be visible
        const modal = this.page.locator('c-kanban-card-detail');
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Fill in the title
        const titleInput = modal.locator('lightning-input[data-id="cardName"]');
        await titleInput.fill(title);

        // Fill in description if provided
        if (description) {
            const descInput = modal.locator(
                'lightning-textarea[data-id="cardDescription"]'
            );
            await descInput.fill(description);
        }

        // Click save button
        const saveButton = modal.locator('lightning-button[label="Save"]');
        await saveButton.click();

        // Wait for modal to close and card to be created
        await modal.waitFor({ state: 'hidden', timeout: 5000 });
        await this.page.waitForTimeout(1000);
    }

    /**
     * Update a card's details
     */
    async updateCard(
        card: Locator,
        newTitle?: string,
        newDescription?: string
    ): Promise<void> {
        // Click the card to open detail modal
        await card.click();

        // Wait for modal to be visible
        const modal = this.page.locator('c-kanban-card-detail');
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Update title if provided
        if (newTitle) {
            const titleInput = modal.locator(
                'lightning-input[data-id="cardName"]'
            );
            await titleInput.fill('');
            await titleInput.fill(newTitle);
        }

        // Update description if provided
        if (newDescription) {
            const descInput = modal.locator(
                'lightning-textarea[data-id="cardDescription"]'
            );
            await descInput.fill('');
            await descInput.fill(newDescription);
        }

        // Click save button
        const saveButton = modal.locator('lightning-button[label="Save"]');
        await saveButton.click();

        // Wait for modal to close
        await modal.waitFor({ state: 'hidden', timeout: 5000 });
        await this.page.waitForTimeout(1000);
    }

    /**
     * Delete a card via API (faster, for test cleanup)
     */
    async deleteCardViaApi(card: Locator): Promise<void> {
        if (!this.apiHelper) {
            throw new Error(
                'API helper not available. Provide accessToken and instanceUrl.'
            );
        }

        const cardId = await card.getAttribute('data-card-id');
        if (!cardId) {
            throw new Error('Card ID not found');
        }

        await this.apiHelper.deleteCard(cardId);
    }

    /**
     * Delete a card using the UI modal
     */
    async deleteCardViaModal(card: Locator): Promise<void> {
        // Click the card to open detail modal
        await card.click();

        // Wait for modal to be visible
        const modal = this.page.locator('c-kanban-card-detail');
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Click delete button
        const deleteButton = modal.locator(
            'lightning-button[variant="destructive"]'
        );
        await deleteButton.click();

        // Confirm deletion in the confirmation dialog
        const confirmButton = this.page.locator(
            '.slds-modal__container lightning-button:has-text("Delete")'
        );
        await confirmButton.click();

        // Wait for modal to close and card to be deleted
        await modal.waitFor({ state: 'hidden', timeout: 5000 });
        await this.page.waitForTimeout(1000);
    }

    /**
     * Get card title
     */
    async getCardTitle(card: Locator): Promise<string> {
        const titleElement = card.locator('.kanban-card__title');
        return (await titleElement.textContent()) || '';
    }

    /**
     * Click on a card to open details
     */
    async clickCard(card: Locator): Promise<void> {
        await card.click();
    }

    /**
     * Close the card detail modal
     */
    async closeCardDetail(): Promise<void> {
        const modal = this.page.locator('c-kanban-card-detail');
        const closeButton = modal.locator(
            'lightning-button-icon[title="Close"]'
        );
        await closeButton.click();
        await modal.waitFor({ state: 'hidden', timeout: 5000 });
    }

    /**
     * Check if card detail modal is visible
     */
    async isCardDetailVisible(): Promise<boolean> {
        const modal = this.page.locator('c-kanban-card-detail');
        return await modal.isVisible();
    }

    /**
     * Wait for a card to appear with specific title
     */
    async waitForCardWithTitle(
        title: string,
        timeout: number = 5000
    ): Promise<void> {
        const card = this.page.locator('.kanban-card').filter({
            has: this.page.locator(`.kanban-card__title:has-text("${title}")`)
        });
        await card.waitFor({ state: 'visible', timeout });
    }

    /**
     * Wait for a card to be removed
     */
    async waitForCardRemoved(
        title: string,
        timeout: number = 5000
    ): Promise<void> {
        const card = this.page.locator('.kanban-card').filter({
            has: this.page.locator(`.kanban-card__title:has-text("${title}")`)
        });
        await card.waitFor({ state: 'hidden', timeout });
    }
}
