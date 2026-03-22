import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Card Linking', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('linked cards section is visible in card panel', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // The linked cards component should be inside the panel
        const linkedCardsSection = panel.locator('c-card-linked-cards');
        await expect(linkedCardsSection).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('linked cards section shows empty state initially', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // Should show "Linked Cards" title
        const title = linkedCards.locator(
            'lightning-card .slds-card__header-title'
        );
        await expect(title).toContainText('Linked Cards', {
            timeout: SF_TIMEOUT
        });

        // Should show empty state message
        const emptyState = linkedCards.locator(
            '.slds-text-color_weak'
        );
        await expect(emptyState).toContainText('No linked cards', {
            timeout: SF_TIMEOUT
        });
    });

    test('add link button toggles form visibility', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // Click the add button
        const addBtn = linkedCards.locator('.link-add-btn');
        await expect(addBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await addBtn.click();

        // Form should appear
        const form = linkedCards.locator('.add-link-form');
        await expect(form).toBeVisible({ timeout: SF_TIMEOUT });

        // Click again to close
        await addBtn.click();
        await expect(form).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('can search for cards to link', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // Open add form
        const addBtn = linkedCards.locator('.link-add-btn');
        await addBtn.click();

        // Type in search
        const searchInput = linkedCards.locator('lightning-input[type="search"] input');
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });
        await searchInput.fill('Card');

        // Wait for search results
        const results = linkedCards.locator('.search-results .search-result-item');
        await expect(results.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Should have results (other cards on the same board)
        const count = await results.count();
        expect(count).toBeGreaterThan(0);
    });

    test('can create a card link and it appears in the list', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // Open add form
        const addBtn = linkedCards.locator('.link-add-btn');
        await addBtn.click();

        // Select "Blocks" link type
        const combobox = linkedCards.locator('lightning-combobox');
        await combobox.locator('button').click();
        const blocksOption = boardPage.page.locator(
            'lightning-base-combobox-item[data-value="Blocks"]'
        );
        await blocksOption.click();

        // Search and select a card
        const searchInput = linkedCards.locator('lightning-input[type="search"] input');
        await searchInput.fill('Card');

        const firstResult = linkedCards.locator(
            '.search-results .search-result-item'
        ).first();
        await expect(firstResult).toBeVisible({ timeout: SF_TIMEOUT });
        await firstResult.click();

        // Wait for the link to appear in the list
        const linkItem = linkedCards.locator('.linked-card-item');
        await expect(linkItem.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Verify the link type badge shows
        const badge = linkItem.first().locator('.link-type-badge');
        await expect(badge).toContainText('Blocks', { timeout: SF_TIMEOUT });
    });

    test('can delete a card link', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // First create a link
        const addBtn = linkedCards.locator('.link-add-btn');
        await addBtn.click();

        const searchInput = linkedCards.locator('lightning-input[type="search"] input');
        await searchInput.fill('Card');

        const firstResult = linkedCards.locator(
            '.search-results .search-result-item'
        ).first();
        await expect(firstResult).toBeVisible({ timeout: SF_TIMEOUT });
        await firstResult.click();

        // Wait for link to appear
        const linkItem = linkedCards.locator('.linked-card-item');
        await expect(linkItem.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Click delete twice (confirm pattern)
        const deleteBtn = linkItem.first().locator('.delete-link-btn');
        await deleteBtn.click();
        await deleteBtn.click();

        // Link should be removed
        await expect(linkItem).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('link type combobox shows all options', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const linkedCards = panel.locator('c-card-linked-cards');
        await expect(linkedCards).toBeVisible({ timeout: SF_TIMEOUT });

        // Open add form
        const addBtn = linkedCards.locator('.link-add-btn');
        await addBtn.click();

        // Open combobox
        const combobox = linkedCards.locator('lightning-combobox');
        await combobox.locator('button').click();

        // Check for all options
        const options = boardPage.page.locator(
            'lightning-base-combobox-item'
        );
        await expect(options).toHaveCount(5, { timeout: SF_TIMEOUT });
    });
});
