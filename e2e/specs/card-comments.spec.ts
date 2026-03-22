import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Card Comments', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('comments section is visible in card panel', async ({
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

        // Comments section should be present
        const commentsSection = panel.locator('.comments-section');
        await expect(commentsSection).toBeVisible({ timeout: SF_TIMEOUT });

        // Should show "Comments" heading
        const heading = commentsSection.locator('h3');
        await expect(heading).toContainText('Comments');
    });

    test('shows empty state when no comments exist', async ({
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
        const noComments = panel.locator('[data-id="no-comments"]');
        await expect(noComments).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(noComments).toContainText('No comments yet');
    });

    test('comment input and post button are present', async ({
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

        // Comment input textarea should be present
        const commentInput = panel.locator('[data-id="comment-input"]');
        await expect(commentInput).toBeVisible({ timeout: SF_TIMEOUT });

        // Post button should be present
        const postBtn = panel.locator('[data-id="post-comment-btn"]');
        await expect(postBtn).toBeVisible();
    });

    test('can post a comment and see it appear', async ({
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

        // Wait for comments section to load
        const commentsSection = panel.locator('.comments-section');
        await expect(commentsSection).toBeVisible({ timeout: SF_TIMEOUT });

        // Type a comment
        const commentInput = panel.locator(
            '[data-id="comment-input"] textarea'
        );
        await commentInput.waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await commentInput.fill('This is an E2E test comment');

        // Click Post
        const postBtn = panel.locator('[data-id="post-comment-btn"]');
        await postBtn.click();

        // The comment should appear in the list
        const commentBody = panel.locator('.comment-body');
        await expect(commentBody.first()).toContainText(
            'This is an E2E test comment',
            { timeout: SF_TIMEOUT }
        );

        // Empty state should no longer show
        const noComments = panel.locator('[data-id="no-comments"]');
        await expect(noComments).not.toBeVisible();

        // Comment count should show (1)
        const heading = commentsSection.locator('h3');
        await expect(heading).toContainText('(1)');
    });

    test('can post multiple comments in order', async ({
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
        await expect(panel.locator('.comments-section')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Post first comment
        const commentInput = panel.locator(
            '[data-id="comment-input"] textarea'
        );
        await commentInput.waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await commentInput.fill('First comment');
        await panel.locator('[data-id="post-comment-btn"]').click();
        await expect(panel.locator('.comment-body').first()).toContainText(
            'First comment',
            { timeout: SF_TIMEOUT }
        );

        // Post second comment
        await commentInput.fill('Second comment');
        await panel.locator('[data-id="post-comment-btn"]').click();

        // Newest first - second comment should be at top
        const commentBodies = panel.locator('.comment-body');
        await expect(commentBodies).toHaveCount(2, { timeout: SF_TIMEOUT });
        await expect(commentBodies.first()).toContainText('Second comment');
        await expect(commentBodies.nth(1)).toContainText('First comment');
    });

    test('comments persist after closing and reopening panel', async ({
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
        await expect(panel.locator('.comments-section')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Post a comment
        const commentInput = panel.locator(
            '[data-id="comment-input"] textarea'
        );
        await commentInput.waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await commentInput.fill('Persistent comment');
        await panel.locator('[data-id="post-comment-btn"]').click();
        await expect(panel.locator('.comment-body').first()).toContainText(
            'Persistent comment',
            { timeout: SF_TIMEOUT }
        );

        // Close panel
        await boardPage.page
            .locator('.card-panel__header lightning-button-icon')
            .click();
        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });

        // Reopen same card
        await boardPage.card(cardId).locator('.kanban-card__body').click();
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        // Comment should still be there
        await expect(panel.locator('.comment-body').first()).toContainText(
            'Persistent comment',
            { timeout: SF_TIMEOUT }
        );
    });

    test('comment shows author name and relative date', async ({
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
        await expect(panel.locator('.comments-section')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Post a comment
        const commentInput = panel.locator(
            '[data-id="comment-input"] textarea'
        );
        await commentInput.waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await commentInput.fill('Author test comment');
        await panel.locator('[data-id="post-comment-btn"]').click();

        // Author name should be visible
        const author = panel.locator('.comment-author');
        await expect(author.first()).toBeVisible({ timeout: SF_TIMEOUT });
        // Author name should not be empty
        const authorText = await author.first().textContent();
        expect(authorText.trim().length).toBeGreaterThan(0);

        // Date should show "just now" or similar
        const date = panel.locator('.comment-date');
        await expect(date.first()).toBeVisible();
    });

    test('post button is disabled when comment input is empty', async ({
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

        // Post button should be disabled initially
        const postBtn = panel.locator('[data-id="post-comment-btn"] button');
        await expect(postBtn).toBeDisabled({ timeout: SF_TIMEOUT });
    });
});
