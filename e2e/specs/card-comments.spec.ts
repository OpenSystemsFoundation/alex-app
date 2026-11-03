import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures';
import type { BoardDataFixture } from '../fixtures';
import type { BoardPage } from '../pages';
import { seedCard, seedComment, sfApexRun, sfQuery } from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

/**
 * Helper to open a card panel and wait for comments section
 */
async function openCardPanel(
    boardPage: BoardPage,
    boardData: BoardDataFixture,
    cardIndex: number = 0
) {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();

    const cardId = boardData.cards[cardIndex].Id;
    await boardPage.card(cardId).locator('.kanban-card__body').click();

    const panel = boardPage.page.locator('.card-panel');
    await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

    // Wait for comments section to render
    const commentsSection = panel.locator('.comments-section');
    await expect(commentsSection).toBeVisible({ timeout: SF_TIMEOUT });

    return { panel, cardId, commentsSection };
}

/** Open the panel for a specific card id and wait for its comments. */
async function openCardPanelById(
    boardPage: BoardPage,
    boardData: BoardDataFixture,
    cardId: string
) {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();
    await boardPage.card(cardId).locator('.kanban-card__body').click();
    const panel = boardPage.page.locator('.card-panel');
    await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });
    await expect(panel.locator('.comments-section')).toBeVisible({
        timeout: SF_TIMEOUT
    });
    return { panel };
}

/**
 * Create a comment via Apex CLI (bypasses LWC interactions).
 */
function createCommentViaApex(cardId: string, body: string): void {
    sfApexRun(`
OpenSF__CardComment__c c = new OpenSF__CardComment__c(
    OpenSF__Card__c = '${cardId}',
    OpenSF__Body__c = '${body.replace(/'/g, "\\'")}'
);
insert c;
System.debug('E2E_COMMENT_ID:' + c.Id);
`);
}

/**
 * Helper to type into the comment textarea and post via UI.
 */
async function postCommentViaUI(panel: Locator, text: string) {
    const textarea = panel.locator('textarea[data-id="comment-input"]');
    await textarea.waitFor({ state: 'visible', timeout: SF_TIMEOUT });
    await textarea.fill(text);

    const postBtn = panel.locator('[data-id="post-comment-btn"]');
    await postBtn.click();
}

/** Comment bodies stored for a card, newest first. */
function storedCommentBodies(cardId: string): string[] {
    return sfQuery(
        `SELECT OpenSF__Body__c FROM OpenSF__CardComment__c WHERE OpenSF__Card__c = '${cardId}' ORDER BY CreatedDate DESC`
    ).map((r) => r.OpenSF__Body__c as string);
}

const SF_POLL = { timeout: 45_000, intervals: [2_000, 3_000, 5_000] };

/** Seed a card of our own, so comment tests never share state. */
function seedOwnCard(boardData: BoardDataFixture, label: string) {
    const card = seedCard({
        boardId: boardData.boardId,
        columnId: boardData.columns[1].Id,
        status: boardData.columns[1].header,
        subject: `${label}-${Date.now()}`
    });
    return { card };
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

        const heading = commentsSection.locator('h3');
        await expect(heading).toContainText('Comments');
    });

    test('shows empty state when no comments exist', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const { panel } = await openCardPanel(boardPage, boardData);

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

        const commentInput = panel.locator('textarea[data-id="comment-input"]');
        await expect(commentInput).toBeVisible({ timeout: SF_TIMEOUT });

        const postBtn = panel.locator('[data-id="post-comment-btn"]');
        await expect(postBtn).toBeVisible();
    });

    test('displays comments created via Apex', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const cardId = boardData.cards[0].Id;

        // Create a comment via Apex before opening the panel
        createCommentViaApex(cardId, 'Apex-created comment');

        const { panel, commentsSection } = await openCardPanel(
            boardPage,
            boardData
        );

        // The comment should appear in the list
        const commentBody = panel.locator('.comment-body');
        await expect(commentBody.first()).toContainText(
            'Apex-created comment',
            { timeout: SF_TIMEOUT }
        );

        // Empty state should not show
        const noComments = panel.locator('[data-id="no-comments"]');
        await expect(noComments).not.toBeVisible();

        // Comment count should show
        const heading = commentsSection.locator('h3');
        await expect(heading).toContainText('(1)');
    });

    test('displays multiple comments in newest-first order', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        const cardId = boardData.cards[1].Id;

        // Create comments via Apex
        createCommentViaApex(cardId, 'First comment');
        // Small delay to ensure different CreatedDate
        createCommentViaApex(cardId, 'Second comment');

        const { panel } = await openCardPanel(boardPage, boardData, 1);

        const commentBodies = panel.locator('.comment-body');
        await expect(commentBodies).toHaveCount(2, { timeout: SF_TIMEOUT });

        // Newest first
        await expect(commentBodies.first()).toContainText('Second comment');
        await expect(commentBodies.nth(1)).toContainText('First comment');
    });

    test('comment shows author name and date', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(2);
        const cardId = boardData.cards[2].Id;

        createCommentViaApex(cardId, 'Author test comment');

        const { panel } = await openCardPanel(boardPage, boardData, 2);

        // Author name should be visible
        const author = panel.locator('.comment-author');
        await expect(author.first()).toBeVisible({ timeout: SF_TIMEOUT });
        const authorText = await author.first().textContent();
        expect(authorText!.trim().length).toBeGreaterThan(0);

        // Date should be visible
        const date = panel.locator('.comment-date');
        await expect(date.first()).toBeVisible();
    });

    test('comments persist after closing and reopening panel', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(3);
        const cardId = boardData.cards[3].Id;

        createCommentViaApex(cardId, 'Persistent comment');

        const { panel } = await openCardPanel(boardPage, boardData, 3);

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

    test('can post a comment via UI', async ({ boardPage, boardData }) => {
        const { card } = seedOwnCard(boardData, 'Cmt-Post');
        const { panel } = await openCardPanelById(
            boardPage,
            boardData,
            card.Id
        );
        await expect(panel.getByText('No comments yet')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        const text = `UI-posted comment ${Date.now()}`;
        await postCommentViaUI(panel, text);

        await expect(panel.locator('.comment-body').first()).toHaveText(text, {
            timeout: SF_TIMEOUT
        });
        await expect(
            panel.locator('textarea[data-id="comment-input"]')
        ).toHaveValue('');
        await expect
            .poll(() => storedCommentBodies(card.Id), SF_POLL)
            .toEqual([text]);
    });

    test('can edit own comment', async ({ boardPage, boardData }) => {
        const { card } = seedOwnCard(boardData, 'Cmt-Edit');
        seedComment(card.Id, 'Before edit');
        const { panel } = await openCardPanelById(
            boardPage,
            boardData,
            card.Id
        );

        const item = panel.locator('.comment-item', { hasText: 'Before edit' });
        await expect(item).toBeVisible({ timeout: SF_TIMEOUT });

        // Cancel leaves the comment unchanged
        await item.getByRole('button', { name: 'Comment actions' }).click();
        await item.getByRole('menuitem', { name: 'Edit' }).click();
        const editor = item.getByRole('textbox', { name: 'Edit comment' });
        await expect(editor).toHaveValue('Before edit');
        await editor.fill('Discarded edit');
        await item.getByRole('button', { name: 'Cancel' }).click();
        await expect(item.locator('.comment-body')).toHaveText('Before edit');

        await item.getByRole('button', { name: 'Comment actions' }).click();
        await item.getByRole('menuitem', { name: 'Edit' }).click();
        await editor.fill('After edit');
        await item.getByRole('button', { name: 'Save' }).click();

        await expect(
            panel.locator('.comment-item .comment-body', {
                hasText: 'After edit'
            })
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect
            .poll(() => storedCommentBodies(card.Id), SF_POLL)
            .toEqual(['After edit']);
    });

    test('can delete own comment', async ({ boardPage, boardData }) => {
        const { card } = seedOwnCard(boardData, 'Cmt-Del');
        seedComment(card.Id, 'Keep me');
        seedComment(card.Id, 'Delete me');
        const { panel } = await openCardPanelById(
            boardPage,
            boardData,
            card.Id
        );

        const item = panel.locator('.comment-item', { hasText: 'Delete me' });
        await expect(item).toBeVisible({ timeout: SF_TIMEOUT });
        await item.getByRole('button', { name: 'Comment actions' }).click();
        await item.getByRole('menuitem', { name: 'Delete' }).click();

        await expect(item).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(panel.locator('.comment-body')).toHaveText(['Keep me']);
        await expect
            .poll(() => storedCommentBodies(card.Id), SF_POLL)
            .toEqual(['Keep me']);
    });
});
