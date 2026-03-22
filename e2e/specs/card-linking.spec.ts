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

        // The linked cards component renders a lightning-card with "Linked Cards" title
        // Playwright pierces shadow DOM by default
        const linkedCardsTitle = panel.locator('text=Linked Cards');
        await expect(linkedCardsTitle).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('linked cards shows empty state initially', async ({
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

        // Should show empty state message
        const emptyState = panel.locator('text=No linked cards');
        await expect(emptyState).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('add link button toggles form', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Wait for the linked cards section
        await expect(panel.locator('text=Linked Cards')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Click the add button (utility:add icon button in the lightning-card actions slot)
        const addBtn = panel.locator('.link-add-btn');
        await expect(addBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await addBtn.click();

        // The add form should appear with a search input
        const searchLabel = panel.locator('text=Search Cards');
        await expect(searchLabel).toBeVisible({ timeout: SF_TIMEOUT });

        // Click add button again to close
        await addBtn.click();
        await expect(searchLabel).not.toBeVisible({ timeout: 5_000 });
    });

    test('can search for cards to link', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        await expect(panel.locator('text=Linked Cards')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Open add form
        const addBtn = panel.locator('.link-add-btn');
        await addBtn.click();

        // Type in search field — find the input inside the search component
        const searchInput = panel.locator(
            '.add-link-form input[type="search"], .add-link-form input'
        );
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });
        await searchInput.fill('Card');

        // Wait for search results to appear
        const results = panel.locator('.search-result-item');
        await expect(results.first()).toBeVisible({ timeout: SF_TIMEOUT });

        const count = await results.count();
        expect(count).toBeGreaterThan(0);
    });

    test('can create and see a card link', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        await expect(panel.locator('text=Linked Cards')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Open add form
        const addBtn = panel.locator('.link-add-btn');
        await addBtn.click();

        // Search and select a card (use default "Relates To" link type)
        const searchInput = panel.locator(
            '.add-link-form input[type="search"], .add-link-form input'
        );
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });
        await searchInput.fill('Card');

        const firstResult = panel.locator('.search-result-item').first();
        await expect(firstResult).toBeVisible({ timeout: SF_TIMEOUT });
        await firstResult.click();

        // Wait for the link to appear in the list
        const linkItem = panel.locator('.linked-card-item');
        await expect(linkItem.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Verify the link type badge shows "Relates To" (the default)
        const badge = linkItem.first().locator('.link-type-badge');
        await expect(badge).toContainText('Relates To', {
            timeout: SF_TIMEOUT
        });
    });

    test('can remove a card link', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        await expect(panel.locator('text=Linked Cards')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // First create a link
        const addBtn = panel.locator('.link-add-btn');
        await addBtn.click();

        const searchInput = panel.locator(
            '.add-link-form input[type="search"], .add-link-form input'
        );
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });
        await searchInput.fill('Card');

        const firstResult = panel.locator('.search-result-item').first();
        await expect(firstResult).toBeVisible({ timeout: SF_TIMEOUT });
        await firstResult.click();

        // Wait for link to appear
        const linkItem = panel.locator('.linked-card-item');
        await expect(linkItem.first()).toBeVisible({ timeout: SF_TIMEOUT });

        // Click delete button twice (confirm pattern)
        const deleteBtn = linkItem.first().locator('.delete-link-btn');
        await deleteBtn.click();
        // Small wait for the confirm state
        await boardPage.page.waitForTimeout(500);
        await deleteBtn.click();

        // Link should be removed — empty state returns
        const emptyState = panel.locator('text=No linked cards');
        await expect(emptyState).toBeVisible({ timeout: SF_TIMEOUT });
    });
});
