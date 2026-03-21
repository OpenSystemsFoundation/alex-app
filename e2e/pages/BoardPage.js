// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/**
 * Page object for the Kanban Board record page.
 * Encapsulates all board-specific selectors and actions.
 */
class BoardPage extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);

        // Board structure
        this.boardWrapper = page.locator('.kanban-board-wrapper');
        this.boardGrid = page.locator('.kanban-board');
        this.columns = page.locator('.kanban-column');

        // Tabs
        this.boardTab = page.locator('[data-tab-id="board"]');
        this.backlogTab = page.locator('[data-tab-id="backlog"]');

        // Toolbar
        this.searchInput = page.locator('.board-filter-search');
        this.refreshBtn = page.locator(
            'button.topbar-icon-btn:has(lightning-icon.slds-icon-utility-refresh)'
        );
        this.addCardButtons = page.locator('.add-card-button');

        // Filters
        this.priorityFilter = page.locator(
            'select.board-filter-select >> nth=0'
        );
        this.typeFilter = page.locator('select.board-filter-select >> nth=1');
    }

    /**
     * Navigate to a specific board by ID.
     * @param {string} baseUrl - Origin URL of the scratch org
     * @param {string} boardId - Salesforce record ID
     */
    async open(baseUrl, boardId) {
        await this.goto(
            `${baseUrl}/lightning/r/OpenSF__Board__c/${boardId}/view`
        );
        await this.waitForComponent('.kanban-board-wrapper');
    }

    /**
     * Get a column wrapper by its Salesforce column ID.
     * @param {string} columnId
     */
    columnWrapper(columnId) {
        return this.page.locator(
            `.kanban-column__card-wrapper[data-column-id="${columnId}"]`
        );
    }

    /**
     * Get a card article element by its Salesforce record ID.
     * @param {string} cardId
     */
    card(cardId) {
        return this.page.locator(`article[data-card-id="${cardId}"]`);
    }

    /**
     * Get a card's name link by its Salesforce record ID.
     * @param {string} cardId
     */
    cardLink(cardId) {
        return this.page.locator(`a[data-card-id="${cardId}"]`);
    }

    /**
     * Get all card articles currently visible on the board.
     */
    allCards() {
        return this.page.locator('article.kanban-card');
    }

    /**
     * Get card count in a specific column.
     * @param {string} columnId
     */
    async cardCountInColumn(columnId) {
        return this.columnWrapper(columnId)
            .locator('article.kanban-card')
            .count();
    }

    /**
     * Wait for at least one card to be visible on the board.
     */
    async waitForCards() {
        await this.allCards()
            .first()
            .waitFor({ state: 'visible', timeout: this.timeout });
    }

    /**
     * Drag a card to a target column.
     * @param {string} cardId
     * @param {string} targetColumnId
     */
    async dragCardToColumn(cardId, targetColumnId) {
        const source = this.card(cardId);
        const target = this.columnWrapper(targetColumnId);
        await expect(source).toBeVisible({ timeout: this.timeout });
        await expect(target).toBeVisible({ timeout: this.timeout });
        await source.dragTo(target);
    }

    /**
     * Click the add card button for a specific column (by index).
     * @param {number} columnIndex - 0-based column index
     */
    async addCard(columnIndex = 0) {
        await this.addCardButtons.nth(columnIndex).click();
    }

    /**
     * Type into the search filter.
     * @param {string} text
     */
    async search(text) {
        await this.searchInput.fill(text);
    }

    /** Clear the search filter. */
    async clearSearch() {
        await this.searchInput.fill('');
    }

    /** Click the refresh button. */
    async refresh() {
        await this.refreshBtn.click();
    }

    /** Switch to the Board tab. */
    async switchToBoardTab() {
        await this.boardTab.click();
    }

    /** Switch to the Backlog tab. */
    async switchToBacklogTab() {
        await this.backlogTab.click();
    }
}

module.exports = { BoardPage };
