import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

/**
 * Helper to open a card panel and wait for comments section
 */
async function openCardPanel(
    boardPage: any,
    boardData: any,
    cardIndex: number = 0
) {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();

    const cardId = boardData.cards[cardIndex].Id;
    await boardPage.card(cardId).locator('.kanban-card__body').click();

    const panel = boardPage.page.locator('.card-panel');
    await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

    // Wait for comments section to render (after Apex call completes)
    const commentsSection = panel.locator('.comments-section');
    await expect(commentsSection).toBeVisible({ timeout: SF_TIMEOUT });

    return { panel, cardId, commentsSection };
}

/**
 * Helper to type into the comment textarea and post.
 * Uses the native textarea inside lightning-textarea and dispatches
 * an input+change event so the LWC binding fires.
 */
async function postComment(panel: any, text: string) {
    // lightning-textarea renders a native textarea inside shadow DOM
    const textarea = panel.locator('[data-id="comment-input"] textarea');
    await textarea.waitFor({ state: 'visible', timeout: SF_TIMEOUT });

    // Clear and type character by character to trigger input events
    await textarea.click();
    await textarea.fill('');
    await textarea.type(text, { delay: 10 });

    // Dispatch change event to ensure LWC onchange fires
    await textarea.dispatchEvent('change');

    // Wait for reactive binding
    await textarea.page().waitForTimeout(500);

    const postBtn = panel.locator('[data-id="post-comment-btn"]');
    await postBtn.click();

    // Wait for the Apex call to complete and comment to render
    await panel.page().waitForTimeout(1000);
}

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
        const { commentsSection } = await openCardPanel(boardPage, boardData);

        // Should show "Comments" heading
        const heading = commentsSection.locator('h3');
        await expect(heading).toContainText('Comments');
    });

    test('shows empty state when no comments exist', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const { panel } = await openCardPanel(boardPage, boardData);

        // Should show empty state message (wait for loading to complete)
        const noComments = panel.locator('[data-id="no-comments"]');
        await expect(noComments).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(noComments).toContainText('No comments yet');
    });

    test('comment input and post button are present', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const { panel } = await openCardPanel(boardPage, boardData);

        // Comment input should be present
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
        const { panel, commentsSection } = await openCardPanel(
            boardPage,
            boardData
        );

        await postComment(panel, 'This is an E2E test comment');

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
        const { panel } = await openCardPanel(boardPage, boardData);

        // Post first comment
        await postComment(panel, 'First comment');
        await expect(panel.locator('.comment-body').first()).toContainText(
            'First comment',
            { timeout: SF_TIMEOUT }
        );

        // Post second comment
        await postComment(panel, 'Second comment');

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
        const { panel, cardId } = await openCardPanel(boardPage, boardData);

        // Post a comment
        await postComment(panel, 'Persistent comment');
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

    test('comment shows author name', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const { panel } = await openCardPanel(boardPage, boardData);

        // Post a comment
        await postComment(panel, 'Author test comment');

        // Author name should be visible
        const author = panel.locator('.comment-author');
        await expect(author.first()).toBeVisible({ timeout: SF_TIMEOUT });
        // Author name should not be empty
        const authorText = await author.first().textContent();
        expect(authorText!.trim().length).toBeGreaterThan(0);

        // Date should be visible
        const date = panel.locator('.comment-date');
        await expect(date.first()).toBeVisible();
    });

    test('posting empty comment does not create a comment', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const { panel } = await openCardPanel(boardPage, boardData);

        // Click Post without typing anything
        const postBtn = panel.locator('[data-id="post-comment-btn"]');
        await expect(postBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await postBtn.click();

        // Should still show empty state
        await panel.page().waitForTimeout(1000);
        const noComments = panel.locator('[data-id="no-comments"]');
        await expect(noComments).toBeVisible();
    });
});
