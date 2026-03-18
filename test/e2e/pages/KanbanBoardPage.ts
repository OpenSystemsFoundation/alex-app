import { Page, Locator } from '@playwright/test';
import { KanbanApiHelper } from '../helpers/KanbanApiHelper';
import { KanbanCardActions } from '../helpers/KanbanCardActions';
import { KanbanDragDropHelper } from '../helpers/KanbanDragDropHelper';

/**
 * Page Object Model for Kanban Board component
 * Encapsulates all interactions with the Kanban board
 *
 * This is the main entry point that delegates to specialized helpers:
 * - KanbanApiHelper: API operations and test data management
 * - KanbanCardActions: Card CRUD operations
 * - KanbanDragDropHelper: Drag and drop operations
 */
export class KanbanBoardPage {
    readonly page: Page;
    readonly boardContainer: Locator;
    readonly refreshButton: Locator;
    readonly loadingSpinner: Locator;
    readonly errorMessage: Locator;

    // Helpers
    readonly api?: KanbanApiHelper;
    readonly cardActions: KanbanCardActions;
    readonly dragDrop: KanbanDragDropHelper;

    constructor(page: Page, accessToken?: string, instanceUrl?: string) {
        this.page = page;
        this.boardContainer = page.locator('.kanban-board');
        this.refreshButton = page.locator('lightning-button[label="Refresh"]');
        this.loadingSpinner = page.locator('lightning-spinner');
        this.errorMessage = page.locator('.kanban__error');

        // Initialize helpers
        if (accessToken && instanceUrl) {
            this.api = new KanbanApiHelper(page, accessToken, instanceUrl);
            this.cardActions = new KanbanCardActions(page, this.api);
        } else {
            this.cardActions = new KanbanCardActions(page);
        }
        this.dragDrop = new KanbanDragDropHelper(page);
    }

    // ===================================================================
    // Navigation & Loading
    // ===================================================================

    /**
     * Navigate to Kanban Board page for a specific record
     */
    async goto(recordId: string, instanceUrl?: string) {
        const url = instanceUrl
            ? `${instanceUrl}/lightning/r/${recordId}/view`
            : `/lightning/r/${recordId}/view`;
        await this.page.goto(url);
        await this.waitForBoardToLoad();
    }

    /**
     * Wait for the board to finish loading
     */
    async waitForBoardToLoad() {
        const columns = this.page.locator('.kanban-column h2');
        await columns.first().waitFor({ state: 'visible', timeout: 30000 });
        await this.page.waitForTimeout(500);
    }

    /**
     * Refresh the board
     */
    async refresh() {
        await this.refreshButton.click();
        await this.waitForBoardToLoad();
    }

    // ===================================================================
    // Column Operations
    // ===================================================================

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
     * Get column badge count (number of cards displayed in header)
     * NOTE: Badge was removed from the component, so this now returns actual card count
     */
    async getColumnBadgeCount(
        columnIdentifier: string | number
    ): Promise<number> {
        return await this.getCardCountInColumn(columnIdentifier);
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

    // ===================================================================
    // Card Getters
    // ===================================================================

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
     * Get all card titles in a column
     */
    async getCardTitlesInColumn(
        columnIdentifier: string | number
    ): Promise<string[]> {
        const cards = this.getCardsInColumn(columnIdentifier);
        const count = await cards.count();
        const titles: string[] = [];

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const title = await this.cardActions.getCardTitle(card);
            titles.push(title);
        }

        return titles;
    }

    // ===================================================================
    // Card Operations (delegated to CardActions helper)
    // ===================================================================

    /**
     * Get card title
     */
    async getCardTitle(card: Locator): Promise<string> {
        return await this.cardActions.getCardTitle(card);
    }

    /**
     * Click on a card to open details
     */
    async clickCard(card: Locator) {
        await this.cardActions.clickCard(card);
    }

    /**
     * Create a card via API (faster, for test setup)
     */
    async createCardViaApi(
        columnIdentifier: string | number,
        title: string,
        description?: string
    ): Promise<string> {
        const column = this.getColumn(columnIdentifier);
        const columnId = await column.getAttribute('data-column-id');

        if (!columnId) {
            throw new Error('Column ID not found');
        }

        // Get the last card in column to determine LexoRank position
        const cardsInColumn = this.getCardsInColumn(columnIdentifier);
        const cardCount = await cardsInColumn.count();

        // Generate a LexoRank position (simplified - place at end)
        const lexoRankPosition =
            cardCount === 0
                ? '0|i00000:'
                : `0|i${String(cardCount).padStart(5, '0')}:`;

        return await this.cardActions.createCardViaApi(
            columnId,
            title,
            description,
            lexoRankPosition
        );
    }

    /**
     * Create a card using the UI modal
     */
    async createCardViaModal(title: string, description?: string) {
        await this.cardActions.createCardViaModal(title, description);
    }

    /**
     * Update a card's details
     */
    async updateCard(
        card: Locator,
        newTitle?: string,
        newDescription?: string
    ) {
        await this.cardActions.updateCard(card, newTitle, newDescription);
    }

    /**
     * Delete a card via API (faster, for test cleanup)
     */
    async deleteCardViaApi(card: Locator) {
        await this.cardActions.deleteCardViaApi(card);
    }

    /**
     * Delete a card using the UI modal
     */
    async deleteCardViaModal(card: Locator) {
        await this.cardActions.deleteCardViaModal(card);
    }

    /**
     * Close the card detail modal
     */
    async closeCardDetail() {
        await this.cardActions.closeCardDetail();
    }

    /**
     * Check if card detail modal is visible
     */
    async isCardDetailVisible(): Promise<boolean> {
        return await this.cardActions.isCardDetailVisible();
    }

    /**
     * Wait for a card to appear in a column
     */
    async waitForCardInColumn(
        columnIdentifier: string | number,
        cardTitle: string,
        timeout: number = 5000
    ) {
        await this.cardActions.waitForCardWithTitle(cardTitle, timeout);
    }

    /**
     * Wait for a card to be removed
     */
    async waitForCardRemoved(cardTitle: string, timeout: number = 5000) {
        await this.cardActions.waitForCardRemoved(cardTitle, timeout);
    }

    // ===================================================================
    // Drag & Drop Operations (delegated to DragDropHelper)
    // ===================================================================

    /**
     * Drag a card within the same column to a different position
     */
    async dragCardWithinColumn(
        columnIdentifier: string | number,
        sourceIndex: number,
        targetIndex: number
    ) {
        const sourceCard = this.getCardInColumn(columnIdentifier, sourceIndex);

        let targetCard: Locator;

        if (targetIndex === 0) {
            // Moving to position 0
            targetCard = this.getCardInColumn(columnIdentifier, 0);
        } else if (sourceIndex < targetIndex) {
            // Moving DOWN: target the card at targetIndex
            targetCard = this.getCardInColumn(columnIdentifier, targetIndex);
        } else {
            // Moving UP: target the card before the target position
            const visualIndex = targetIndex > 0 ? targetIndex - 1 : 0;
            targetCard = this.getCardInColumn(columnIdentifier, visualIndex);
        }

        await this.dragDrop.dragCardWithinColumn(
            sourceCard,
            targetCard,
            sourceIndex,
            targetIndex
        );
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
        const targetColumn = this.getColumn(targetColumnIdentifier);

        await this.dragDrop.dragCardToColumn(
            sourceCard,
            targetColumn,
            targetPosition
        );
    }

    // ===================================================================
    // Modal Operations
    // ===================================================================

    /**
     * Get card detail modal
     */
    getCardDetailModal(): Locator {
        return this.page.locator('c-kanban-card-detail');
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

    // ===================================================================
    // API/Cleanup Operations (delegated to ApiHelper)
    // ===================================================================

    /**
     * Delete all cards via API (for test cleanup)
     */
    async deleteAllCardsViaApi() {
        if (!this.api) {
            throw new Error(
                'API helper not available. Provide accessToken and instanceUrl.'
            );
        }
        await this.api.deleteAllCards();
    }

    /**
     * Delete all boards via API (for test cleanup)
     */
    async deleteAllBoardsViaApi() {
        if (!this.api) {
            throw new Error(
                'API helper not available. Provide accessToken and instanceUrl.'
            );
        }
        await this.api.deleteAllBoards();
    }
}
