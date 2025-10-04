import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Kanban Board component
 * Encapsulates all interactions with the Kanban board
 */
export class KanbanBoardPage {
    readonly page: Page;
    readonly boardContainer: Locator;
    readonly refreshButton: Locator;
    readonly loadingSpinner: Locator;
    readonly errorMessage: Locator;
    private accessToken?: string;
    private instanceUrl?: string;

    constructor(page: Page, accessToken?: string, instanceUrl?: string) {
        this.page = page;
        this.boardContainer = page.locator('.kanban-board');
        this.refreshButton = page.locator('lightning-button[label="Refresh"]');
        this.loadingSpinner = page.locator('lightning-spinner');
        this.errorMessage = page.locator('.kanban__error');
        this.accessToken = accessToken;
        this.instanceUrl = instanceUrl;
    }

    /**
     * Navigate to Kanban Board page for a specific record
     */
    async goto(recordId: string) {
        await this.page.goto(`/lightning/r/${recordId}/view`);
        await this.waitForBoardToLoad();
    }

    /**
     * Wait for the board to finish loading
     */
    async waitForBoardToLoad() {
        // Wait for the board to load by checking for any column headers
        // This verifies the board component is rendering
        const columns = this.page.locator('.kanban-column h2');
        await columns.first().waitFor({ state: 'visible', timeout: 30000 });
        // Small additional wait for any remaining rendering
        await this.page.waitForTimeout(500);
    }

    /**
     * Get a column by its name or index
     */
    getColumn(columnIdentifier: string | number): Locator {
        if (typeof columnIdentifier === 'number') {
            return this.boardContainer
                .locator('.kanban-column')
                .nth(columnIdentifier);
        }
        return this.boardContainer.locator('.kanban-column').filter({
            has: this.page.locator(`h2:has-text("${columnIdentifier}")`)
        });
    }

    /**
     * Get all columns
     */
    getAllColumns(): Locator {
        return this.boardContainer.locator('.kanban-column');
    }

    /**
     * Get the number of columns
     */
    async getColumnCount(): Promise<number> {
        return await this.getAllColumns().count();
    }

    /**
     * Get add card button for a specific column
     */
    getAddCardButton(columnIdentifier: string | number): Locator {
        return this.getColumn(columnIdentifier).locator('.add-card-button');
    }

    /**
     * Click add card button in a column
     */
    async clickAddCard(columnIdentifier: string | number) {
        await this.getAddCardButton(columnIdentifier).click();
    }

    /**
     * Get all cards in a specific column
     */
    getCardsInColumn(columnIdentifier: string | number): Locator {
        return this.getColumn(columnIdentifier).locator('.kanban-card');
    }

    /**
     * Get the number of cards in a column
     */
    async getCardCountInColumn(
        columnIdentifier: string | number
    ): Promise<number> {
        return await this.getCardsInColumn(columnIdentifier).count();
    }

    /**
     * Get a specific card by its title
     */
    getCardByTitle(title: string): Locator {
        return this.boardContainer.locator('.kanban-card').filter({
            has: this.page.locator(`.kanban-card__title:has-text("${title}")`)
        });
    }

    /**
     * Get a card by column and index
     */
    getCardInColumn(
        columnIdentifier: string | number,
        cardIndex: number
    ): Locator {
        return this.getCardsInColumn(columnIdentifier).nth(cardIndex);
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
    async clickCard(card: Locator) {
        await card.click();
    }

    /**
     * Drag a card from one position to another
     * @param sourceCard - The card to drag
     * @param targetColumn - The target column identifier
     * @param targetPosition - Optional position in the target column (0-based index)
     */
    async dragCard(
        sourceCard: Locator,
        targetColumn: string | number,
        targetPosition?: number
    ) {
        const targetColumnElement = this.getColumn(targetColumn);
        const targetCardsContainer = targetColumnElement.locator(
            '.kanban-column__card-wrapper'
        );

        // Get the bounding box of the source card
        const sourceBox = await sourceCard.boundingBox();
        if (!sourceBox) {
            throw new Error('Source card not found or not visible');
        }

        // Get the bounding box of the target container
        const targetBox = await targetCardsContainer.boundingBox();
        if (!targetBox) {
            throw new Error('Target column not found or not visible');
        }

        // Calculate drop position
        let targetX = targetBox.x + targetBox.width / 2;
        let targetY = targetBox.y + 50; // Default to top of column

        // If a specific position is provided, calculate the Y coordinate
        if (targetPosition !== undefined) {
            const cardsInTarget =
                await this.getCardsInColumn(targetColumn).count();

            if (targetPosition > 0 && targetPosition <= cardsInTarget) {
                const cardAbove = this.getCardInColumn(
                    targetColumn,
                    targetPosition - 1
                );
                const cardAboveBox = await cardAbove.boundingBox();
                if (cardAboveBox) {
                    targetY = cardAboveBox.y + cardAboveBox.height + 10;
                }
            }
        }

        // Perform drag and drop
        await sourceCard.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, targetY, { steps: 10 });
        await this.page.waitForTimeout(500); // Allow UI to update
        await this.page.mouse.up();

        // Wait for any animations or state updates
        await this.page.waitForTimeout(500);
    }

    /**
     * Drag a card within the same column to a different position
     */
    async dragCardWithinColumn(
        columnIdentifier: string | number,
        sourceIndex: number,
        targetIndex: number
    ) {
        const sourceCard = this.getCardInColumn(columnIdentifier, sourceIndex);
        await this.dragCard(sourceCard, columnIdentifier, targetIndex);
    }

    /**
     * Drag a card to a different column
     */
    async dragCardToColumn(
        sourceColumnIdentifier: string | number,
        cardIndex: number,
        targetColumnIdentifier: string | number,
        targetPosition?: number
    ) {
        const sourceCard = this.getCardInColumn(
            sourceColumnIdentifier,
            cardIndex
        );
        await this.dragCard(sourceCard, targetColumnIdentifier, targetPosition);
    }

    /**
     * Get card detail modal
     */
    getCardDetailModal(): Locator {
        return this.page.locator('c-kanban-card-detail');
    }

    /**
     * Check if card detail modal is visible
     */
    async isCardDetailVisible(): Promise<boolean> {
        return await this.getCardDetailModal().isVisible();
    }

    /**
     * Get card title input in the detail modal
     */
    getCardTitleInput(): Locator {
        return this.getCardDetailModal().locator(
            'lightning-input[data-id="cardName"]'
        );
    }

    /**
     * Get card description textarea in the detail modal
     */
    getCardDescriptionInput(): Locator {
        return this.getCardDetailModal().locator(
            'lightning-textarea[data-id="cardDescription"]'
        );
    }

    /**
     * Get save button in the card detail modal
     */
    getSaveButton(): Locator {
        return this.getCardDetailModal().locator(
            'lightning-button[label="Save"]'
        );
    }

    /**
     * Get delete button in the card detail modal
     */
    getDeleteButton(): Locator {
        return this.getCardDetailModal().locator(
            'lightning-button[variant="destructive"]'
        );
    }

    /**
     * Get close button in the card detail modal
     */
    getCloseButton(): Locator {
        return this.getCardDetailModal().locator(
            'lightning-button-icon[title="Close"]'
        );
    }

    /**
     * Create a new card via API (faster, for test setup)
     * This method bypasses the UI modal for better test performance
     */
    async createCardViaApi(
        columnIdentifier: string | number,
        title: string,
        description?: string
    ): Promise<string> {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error(
                'Access token and instance URL required for API calls'
            );
        }

        // Get the column ID
        const column = this.getColumn(columnIdentifier);
        const columnId = await column.getAttribute('data-column-id');

        if (!columnId) {
            throw new Error('Could not find column ID');
        }

        // Get the last card in column to determine LexoRank position
        const cardsInColumn = this.getCardsInColumn(columnIdentifier);
        const cardCount = await cardsInColumn.count();

        // Generate a LexoRank position (simplified - place at end)
        const lexoRankPosition =
            cardCount === 0
                ? '0|i00000:'
                : `0|i${String(cardCount).padStart(5, '0')}:`;

        // Create card via Salesforce REST API
        const cardData = {
            Subject__c: title,
            Description__c: description || '',
            Column__c: columnId,
            LexoRankPosition__c: lexoRankPosition
        };

        const response = await this.page.request.post(
            `${this.instanceUrl}/services/data/v60.0/sobjects/Card__c`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: cardData
            }
        );

        if (!response.ok()) {
            throw new Error(
                `Failed to create card via API: ${await response.text()}`
            );
        }

        const result = await response.json();

        // Wait for the card to appear in the UI
        await this.waitForCardInColumn(columnIdentifier, title, 5000);

        return result.id;
    }

    /**
     * Create a new card using the UI modal
     * Use this method when specifically testing modal functionality
     */
    async createCardViaModal(
        columnIdentifier: string | number,
        title: string,
        description?: string
    ) {
        await this.clickAddCard(columnIdentifier);
        await this.page.waitForTimeout(500); // Wait for modal to open

        // Fill in card details
        await this.getCardTitleInput().fill(title);

        if (description) {
            await this.getCardDescriptionInput().fill(description);
        }

        // Save the card
        await this.getSaveButton().click();

        // Wait for save to complete
        await this.page.waitForTimeout(1000);
    }

    /**
     * Create a new card in a column (uses API by default for performance)
     * @deprecated Use createCardViaApi or createCardViaModal explicitly
     */
    async createCard(
        columnIdentifier: string | number,
        title: string,
        description?: string
    ) {
        // Default to API method for better performance
        if (this.accessToken && this.instanceUrl) {
            await this.createCardViaApi(columnIdentifier, title, description);
        } else {
            // Fallback to modal if API not available
            await this.createCardViaModal(columnIdentifier, title, description);
        }
    }

    /**
     * Update a card's details
     */
    async updateCard(
        card: Locator,
        newTitle?: string,
        newDescription?: string
    ) {
        // Click card to open detail modal
        await this.clickCard(card);
        await this.page.waitForTimeout(500);

        // Update title if provided
        if (newTitle) {
            const titleInput = this.getCardTitleInput();
            await titleInput.click();
            await titleInput.fill(newTitle);
        }

        // Update description if provided
        if (newDescription) {
            const descriptionInput = this.getCardDescriptionInput();
            await descriptionInput.click();
            await descriptionInput.fill(newDescription);
        }

        // Save changes
        await this.getSaveButton().click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Delete a card via API (faster, for test cleanup)
     */
    async deleteCardViaApi(card: Locator) {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error(
                'Access token and instance URL required for API calls'
            );
        }

        // Get the card ID from the data attribute
        const cardId = await card.getAttribute('data-card-id');

        if (!cardId) {
            throw new Error('Could not find card ID');
        }

        const cardTitle = await this.getCardTitle(card);

        // Delete card via Salesforce REST API
        const response = await this.page.request.delete(
            `${this.instanceUrl}/services/data/v60.0/sobjects/Card__c/${cardId}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok()) {
            throw new Error(
                `Failed to delete card via API: ${await response.text()}`
            );
        }

        // Wait for deletion to complete
        await this.waitForCardRemoved(cardTitle, 5000);
    }

    /**
     * Delete a card using the UI modal
     * Use this method when specifically testing delete functionality
     */
    async deleteCardViaModal(card: Locator) {
        // Click card to open detail modal
        await this.clickCard(card);
        await this.page.waitForTimeout(500);

        // Click delete button
        await this.getDeleteButton().click();

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = this.page
            .locator('lightning-button[label="Delete"]')
            .last();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
        }

        // Wait for deletion to complete
        await this.page.waitForTimeout(1000);
    }

    /**
     * Delete a card (uses API by default for performance)
     * @deprecated Use deleteCardViaApi or deleteCardViaModal explicitly
     */
    async deleteCard(card: Locator) {
        // Default to API method for better performance
        if (this.accessToken && this.instanceUrl) {
            await this.deleteCardViaApi(card);
        } else {
            // Fallback to modal if API not available
            await this.deleteCardViaModal(card);
        }
    }

    /**
     * Close the card detail modal
     */
    async closeCardDetail() {
        await this.getCloseButton().click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Refresh the board
     */
    async refresh() {
        await this.refreshButton.click();
        await this.waitForBoardToLoad();
    }

    /**
     * Get column badge count (number of cards displayed in header)
     */
    async getColumnBadgeCount(
        columnIdentifier: string | number
    ): Promise<number> {
        const column = this.getColumn(columnIdentifier);
        const badge = column.locator('lightning-badge');
        const countText = await badge.textContent();
        return parseInt(countText || '0', 10);
    }

    /**
     * Verify column badge count matches actual card count
     */
    async verifyColumnCardCount(
        columnIdentifier: string | number
    ): Promise<boolean> {
        const actualCount = await this.getCardCountInColumn(columnIdentifier);
        const badgeCount = await this.getColumnBadgeCount(columnIdentifier);
        return actualCount === badgeCount;
    }

    /**
     * Get all card titles in a column
     */
    async getCardTitlesInColumn(
        columnIdentifier: string | number
    ): Promise<string[]> {
        const cards = this.getCardsInColumn(columnIdentifier);
        const count = await cards.count();
        const titles: string[] = [];

        for (let i = 0; i < count; i++) {
            const title = await this.getCardTitle(cards.nth(i));
            titles.push(title.trim());
        }

        return titles;
    }

    /**
     * Wait for a card to appear in a column
     */
    async waitForCardInColumn(
        columnIdentifier: string | number,
        cardTitle: string,
        timeout: number = 5000
    ) {
        const column = this.getColumn(columnIdentifier);
        await column.locator(`.kanban-card:has-text("${cardTitle}")`).waitFor({
            state: 'visible',
            timeout
        });
    }

    /**
     * Wait for a card to be removed
     */
    async waitForCardRemoved(cardTitle: string, timeout: number = 5000) {
        await this.getCardByTitle(cardTitle).waitFor({
            state: 'hidden',
            timeout
        });
    }

    /**
     * Delete all cards on the board via API (bulk delete for test cleanup)
     * Uses anonymous Apex for reliable bulk deletion
     */
    async deleteAllCardsViaApi() {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error(
                'Access token and instance URL required for API calls'
            );
        }

        console.log('Deleting all cards via Anonymous Apex...');

        // Anonymous Apex code to delete all cards
        const apexCode = `List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c];
Database.delete(cards, false);`;

        // Execute anonymous Apex via Tooling API
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
            console.warn(`Failed to delete cards via Apex: ${errorText}`);
            throw new Error(`Failed to delete cards via API: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.warn(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
            throw new Error(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
        }

        // Wait for all cards to be removed from UI
        await this.page.waitForTimeout(2000);

        console.log('Successfully deleted all cards via Anonymous Apex');

        // Additional wait time before next test to ensure UI is fully settled
        await this.page.waitForTimeout(1000);
    }

    /**
     * Delete all cards in a specific column via API
     * Uses anonymous Apex for reliable bulk deletion
     */
    async deleteAllCardsInColumnViaApi(columnIdentifier: string | number) {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error(
                'Access token and instance URL required for API calls'
            );
        }

        const cards = this.getCardsInColumn(columnIdentifier);
        const cardCount = await cards.count();

        if (cardCount === 0) {
            console.log('No cards to delete in column');
            return;
        }

        console.log(
            `Deleting ${cardCount} cards from column via Anonymous Apex...`
        );

        // Collect all card IDs in this column
        const cardIds: string[] = [];
        for (let i = 0; i < cardCount; i++) {
            const cardId = await cards.nth(i).getAttribute('data-card-id');
            if (cardId) {
                cardIds.push(cardId);
            }
        }

        // Build list of IDs for Apex query
        const idsForQuery = cardIds.map((id) => `'${id}'`).join(',');

        // Anonymous Apex code to delete specific cards
        const apexCode = `List<OpenSF__Card__c> cards = [SELECT Id FROM OpenSF__Card__c WHERE Id IN (${idsForQuery})];
Database.delete(cards, false);`;

        // Execute anonymous Apex via Tooling API
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
            console.warn(`Failed to delete cards via Apex: ${errorText}`);
            throw new Error(`Failed to delete cards via API: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.warn(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
        }

        // Wait for cards to be removed from UI
        await this.page.waitForTimeout(1500);

        console.log(
            `Successfully deleted ${cardIds.length} cards from column via Anonymous Apex`
        );
    }

    /**
     * Delete all boards via API (for final test cleanup)
     * Uses anonymous Apex for reliable bulk deletion
     */
    async deleteAllBoardsViaApi() {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error(
                'Access token and instance URL required for API calls'
            );
        }

        console.log('Deleting all boards via Anonymous Apex...');

        // Anonymous Apex code to delete all boards (cascade delete handles columns and cards)
        const apexCode = `List<OpenSF__Board__c> boards = [SELECT Id FROM OpenSF__Board__c];
Database.delete(boards, false);`;

        // Execute anonymous Apex via Tooling API
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
            console.warn(`Failed to delete boards via Apex: ${errorText}`);
            throw new Error(`Failed to delete boards via API: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.warn(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
            throw new Error(
                `Apex execution failed: ${result.compileProblem || result.exceptionMessage}`
            );
        }

        console.log('Successfully deleted all boards via Anonymous Apex');
    }
}
