import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Kanban Board record page.
 * Encapsulates all board-specific selectors and actions.
 */
export class BoardPage extends BasePage {
    readonly boardWrapper: Locator;
    readonly boardGrid: Locator;
    readonly columns: Locator;
    readonly boardTab: Locator;
    readonly backlogTab: Locator;
    readonly searchInput: Locator;
    readonly refreshBtn: Locator;
    readonly addCardButtons: Locator;
    readonly priorityFilter: Locator;
    readonly typeFilter: Locator;

    constructor(page: Page) {
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
     */
    async open(baseUrl: string, boardId: string): Promise<void> {
        await this.goto(
            `${baseUrl}/lightning/r/OpenSF__Board__c/${boardId}/view`
        );
        await this.waitForComponent('.kanban-board-wrapper');
    }

    /** Get a column wrapper by its Salesforce column ID. */
    columnWrapper(columnId: string): Locator {
        return this.page.locator(
            `.kanban-column__card-wrapper[data-column-id="${columnId}"]`
        );
    }

    /** Get a card article element by its Salesforce record ID. */
    card(cardId: string): Locator {
        return this.page.locator(`article[data-card-id="${cardId}"]`);
    }

    /** Get a card's name link by its Salesforce record ID. */
    cardLink(cardId: string): Locator {
        return this.page.locator(`a[data-card-id="${cardId}"]`);
    }

    /** Get all card articles currently visible on the board. */
    allCards(): Locator {
        return this.page.locator('article.kanban-card');
    }

    /** Get card count in a specific column. */
    async cardCountInColumn(columnId: string): Promise<number> {
        return this.columnWrapper(columnId)
            .locator('article.kanban-card')
            .count();
    }

    /** Wait for at least one card to be visible on the board. */
    async waitForCards(): Promise<void> {
        await this.allCards()
            .first()
            .waitFor({ state: 'visible', timeout: this.timeout });
    }

    /** Drag a card to a target column. */
    async dragCardToColumn(
        cardId: string,
        targetColumnId: string
    ): Promise<void> {
        const source = this.card(cardId);
        const target = this.columnWrapper(targetColumnId);
        await expect(source).toBeVisible({ timeout: this.timeout });
        await expect(target).toBeVisible({ timeout: this.timeout });
        await source.dragTo(target);
    }

    /** Click the add card button for a specific column (by index). */
    async addCard(columnIndex: number = 0): Promise<void> {
        await this.addCardButtons.nth(columnIndex).click();
    }

    /** Type into the search filter. */
    async search(text: string): Promise<void> {
        await this.searchInput.fill(text);
    }

    /** Clear the search filter. */
    async clearSearch(): Promise<void> {
        await this.searchInput.fill('');
    }

    /** Click the refresh button. */
    async refresh(): Promise<void> {
        await this.refreshBtn.click();
    }

    /** Switch to the Board tab. */
    async switchToBoardTab(): Promise<void> {
        await this.boardTab.click();
    }

    /** Switch to the Backlog tab. */
    async switchToBacklogTab(): Promise<void> {
        await this.backlogTab.click();
    }
}
