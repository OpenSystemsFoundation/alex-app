// @ts-check
const { test, expect } = require('../fixtures');

const SF_TIMEOUT = 45_000;

test.describe('Card Detail Panel', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('clicking a card opens the detail panel', async ({
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
    });

    test('panel shows the correct card name and subject', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const card = boardData.cards[0];
        await boardPage.card(card.Id).locator('.kanban-card__body').click();

        const panelHeader = boardPage.page.locator('.card-panel__header h2');
        await expect(panelHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panelHeader).toContainText(card.Name);
    });

    test('close button closes the panel', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const closeBtn = boardPage.page.locator(
            '.card-panel__header lightning-button-icon'
        );
        await closeBtn.click();

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('clicking a different card switches the panel content', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const firstCard = boardData.cards[0];
        const secondCard = boardData.cards[1];

        await boardPage
            .card(firstCard.Id)
            .locator('.kanban-card__body')
            .click();

        const panelHeader = boardPage.page.locator('.card-panel__header h2');
        await expect(panelHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panelHeader).toContainText(firstCard.Name);

        await boardPage
            .card(secondCard.Id)
            .locator('.kanban-card__body')
            .click();

        await expect(panelHeader).toContainText(secondCard.Name, {
            timeout: SF_TIMEOUT
        });
    });

    test('save button is present and clickable', async ({
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

        const saveBtn = boardPage.page
            .locator('.card-panel__footer lightning-button')
            .last();
        await expect(saveBtn).toBeVisible();
        await expect(saveBtn).toBeEnabled();
    });

    test('delete button is present', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const deleteBtn = boardPage.page
            .locator('.card-panel__footer lightning-button')
            .first();
        await expect(deleteBtn).toBeVisible();
        await expect(deleteBtn).toContainText('Delete');
    });

    test('cancel button closes the panel', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const buttons = boardPage.page.locator(
            '.card-panel__footer lightning-button'
        );
        // Cancel is the middle button (index 1)
        const cancelBtn = buttons.nth(1);
        await cancelBtn.click();

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
    });
});
