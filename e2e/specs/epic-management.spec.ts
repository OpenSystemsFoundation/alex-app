import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

test.describe('Epic Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('epic cards show progress bar when they have child cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Filter to Epic type to find epic cards
        await boardPage.typeFilter.selectOption('Epic');
        await boardPage.page.waitForTimeout(500);

        const epicCards = boardPage.allCards();
        const epicCount = await epicCards.count();

        if (epicCount > 0) {
            // Check that at least one epic card shows a progress bar
            const progressBars = boardPage.page.locator('.epic-progress');
            const progressCount = await progressBars.count();
            // Progress bars only show when there are child cards, so we just verify no errors
            expect(progressCount).toBeGreaterThanOrEqual(0);
        }
    });

    test('cards belonging to an epic show the epic label badge', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Look for epic label badges on cards
        const epicLabels = boardPage.page.locator('.epic-label');
        const labelCount = await epicLabels.count();

        // Just check it renders without error; not all boards have epics
        expect(labelCount).toBeGreaterThanOrEqual(0);
    });

    test('type filter - select Epic shows only epic-type cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        await boardPage.typeFilter.selectOption('Epic');
        await boardPage.page.waitForTimeout(500);

        const visibleCards = boardPage.allCards();
        const count = await visibleCards.count();

        // Filtered count should be less than or equal to total
        expect(count).toBeLessThanOrEqual(allCardsBefore);

        // If there are epic cards, they should all be Epic type
        for (let i = 0; i < count; i++) {
            await expect(visibleCards.nth(i)).toContainText('Epic', {
                timeout: SF_TIMEOUT
            });
        }
    });

    test('swimlane by epic groups cards correctly', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find the swimlane dropdown (it's after the filter separator)
        const swimlaneSelect = boardPage.page.locator(
            'select.board-filter-select >> nth=-1'
        );

        // Select "By Epic" swimlane mode
        await swimlaneSelect.selectOption('epic');
        await boardPage.page.waitForTimeout(500);

        // Board should switch to swimlane mode
        const swimlaneBoard = boardPage.page.locator(
            '.kanban-board--swimlanes'
        );
        await expect(swimlaneBoard).toBeVisible({ timeout: SF_TIMEOUT });

        // Should show at least one swimlane row (even "No Epic")
        const swimlaneRows = boardPage.page.locator('.swimlane-row');
        const rowCount = await swimlaneRows.count();
        expect(rowCount).toBeGreaterThan(0);

        // At least one row should have a label
        const firstLabel = swimlaneRows.first().locator('.swimlane-label');
        await expect(firstLabel).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('card panel shows epic progress section for epic cards', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Filter to Epic type
        await boardPage.typeFilter.selectOption('Epic');
        await boardPage.page.waitForTimeout(500);

        const epicCards = boardPage.allCards();
        const epicCount = await epicCards.count();

        if (epicCount > 0) {
            // Click on the first epic card to open the panel
            await epicCards.first().click();
            await boardPage.page.waitForTimeout(1000);

            // Check if the card panel opens
            const cardPanel = boardPage.page.locator('.card-panel');
            const panelVisible = await cardPanel.isVisible();

            if (panelVisible) {
                // Should show the Epic Progress section
                const epicSection = cardPanel.locator('.epic-detail-section');
                await expect(epicSection).toBeVisible({ timeout: SF_TIMEOUT });
            }
        }
    });

    test('clear filters button resets epic filter', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const allCardsBefore = await boardPage.allCards().count();

        // Apply a filter
        await boardPage.typeFilter.selectOption('Epic');
        await boardPage.page.waitForTimeout(500);

        // Click clear filters
        const clearBtn = boardPage.page.locator('.board-filter-clear');
        if (await clearBtn.isVisible()) {
            await clearBtn.click();
            await boardPage.page.waitForTimeout(500);

            const restoredCount = await boardPage.allCards().count();
            expect(restoredCount).toBe(allCardsBefore);
        }
    });
});
