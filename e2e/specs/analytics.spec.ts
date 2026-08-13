import { test, expect } from '../fixtures';
import type { BoardDataFixture } from '../fixtures';
import { sfApexRun } from '../helpers/sf-data';
import type { BoardPage } from '../pages';

const SF_TIMEOUT = 60_000;

/**
 * Analytics & Cumulative Flow Diagram — E2E tests.
 *
 * The Analytics control is a topbar tab button (kanbanBoard.html) that opens
 * the "Board Analytics" modal (kanbanAnalytics.html). The CFD tab hosts
 * kanbanCumulativeFlowDiagram (.cfd-container). Swimlane mode is driven by
 * the last select.kanban-filter-bar__select in the board filter bar.
 */

/** Open the board and the Board Analytics modal via the topbar tab. */
async function openAnalyticsModal(
    boardPage: BoardPage,
    boardData: BoardDataFixture
) {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();

    const analyticsTab = boardPage.page.locator(
        '.kanban-topbar__tabs button.topbar-tab',
        { hasText: 'Analytics' }
    );
    await expect(analyticsTab).toBeVisible({ timeout: SF_TIMEOUT });
    await analyticsTab.click();

    const dialog = boardPage.page
        .locator('section[role="dialog"]')
        .filter({ hasText: 'Board Analytics' });
    await expect(dialog).toBeVisible({ timeout: SF_TIMEOUT });
    return dialog;
}

/**
 * Seed deterministic cycle-time data on this worker's board: insert a card,
 * then move it to another column in a SEPARATE transaction so
 * CardTriggerHandler closes the first CardColumnHistory entry with a non-null
 * DurationMinutes — the rows AnalyticsService.getCycleTimeAnalytics reads.
 * Creates its own card instead of moving shared fixture cards.
 */
function seedCycleTimeCard(boardData: BoardDataFixture): {
    cardId: string;
    cardName: string;
} {
    const fromColumn = boardData.columns[1];
    const toColumn = boardData.columns[2];
    const subject = `Analytics-Seed-${Date.now()}`;

    const output = sfApexRun(`
OpenSF__Card__c card = new OpenSF__Card__c(
    OpenSF__Column__c = '${fromColumn.Id}',
    OpenSF__Board__c = '${boardData.boardId}',
    OpenSF__Subject__c = '${subject}',
    OpenSF__Status__c = '${fromColumn.header}',
    OpenSF__CardType__c = 'Task',
    OpenSF__Priority__c = 'High',
    OpenSF__SequenceNumber__c = 1
);
insert card;
card = [SELECT Id, Name FROM OpenSF__Card__c WHERE Id = :card.Id];
System.debug('E2E_ANALYTICS_CARD:' + card.Id + ':' + card.Name);
`);

    const match = output.match(
        /E2E_ANALYTICS_CARD:([a-zA-Z0-9]{15,18}):([A-Za-z0-9-]+)/
    );
    if (!match) {
        throw new Error(
            `Failed to parse seeded card from Apex output: ${output.substring(0, 500)}`
        );
    }

    sfApexRun(`
update new OpenSF__Card__c(
    Id = '${match[1]}',
    OpenSF__Column__c = '${toColumn.Id}',
    OpenSF__Status__c = '${toColumn.header}'
);
`);

    return { cardId: match[1], cardName: match[2] };
}

test.describe('Analytics & Visualization', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('analytics topbar tab opens the Board Analytics modal', async ({
        boardPage,
        boardData
    }) => {
        const dialog = await openAnalyticsModal(boardPage, boardData);

        await expect(dialog.locator('h2.slds-modal__title')).toHaveText(
            'Board Analytics'
        );

        // Both analytics tabs render; Cycle Time is active by default
        await expect(dialog.locator('a[data-tab="cycletime"]')).toHaveText(
            'Cycle Time'
        );
        await expect(dialog.locator('a[data-tab="cfd"]')).toHaveText(
            'Cumulative Flow'
        );
        await expect(
            dialog.locator('li.slds-is-active a[data-tab="cycletime"]')
        ).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('cycle time tab shows metrics for a card that changed columns', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.columns.length).toBeGreaterThanOrEqual(3);
        const { cardName } = seedCycleTimeCard(boardData);

        const dialog = await openAnalyticsModal(boardPage, boardData);

        // Summary stats: Avg Cycle Time + Avg Lead Time
        await expect(
            dialog.locator('.analytics-summary .analytics-stat')
        ).toHaveCount(2, { timeout: SF_TIMEOUT });

        // Time-per-column bar chart canvas
        await expect(dialog.locator('canvas.column-time-canvas')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // Card Details table lists exactly one row for the seeded card
        const seededRow = dialog
            .locator('.analytics-table-wrapper tbody tr')
            .filter({
                has: boardPage.page.getByText(cardName, { exact: true })
            });
        await expect(seededRow).toHaveCount(1, { timeout: SF_TIMEOUT });
    });

    test('analytics modal switches to the CFD tab', async ({
        boardPage,
        boardData
    }) => {
        const dialog = await openAnalyticsModal(boardPage, boardData);

        await dialog.locator('a[data-tab="cfd"]').click();

        await expect(
            dialog.locator('li.slds-is-active a[data-tab="cfd"]')
        ).toBeVisible({ timeout: SF_TIMEOUT });

        const cfd = dialog.locator('.cfd-container');
        await expect(cfd).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(cfd.locator('canvas.cfd-canvas')).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect(cfd.locator('select.cfd-select')).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('CFD time range select keeps the chart rendered', async ({
        boardPage,
        boardData
    }) => {
        const dialog = await openAnalyticsModal(boardPage, boardData);
        await dialog.locator('a[data-tab="cfd"]').click();

        const cfd = dialog.locator('.cfd-container');
        const rangeSelect = cfd.locator('select.cfd-select');
        await expect(rangeSelect).toBeVisible({ timeout: SF_TIMEOUT });

        await rangeSelect.selectOption('7');
        await expect(rangeSelect).toHaveValue('7');
        await expect(cfd.locator('canvas.cfd-canvas')).toBeVisible({
            timeout: SF_TIMEOUT
        });

        await rangeSelect.selectOption('90');
        await expect(rangeSelect).toHaveValue('90');
        await expect(cfd.locator('canvas.cfd-canvas')).toBeVisible({
            timeout: SF_TIMEOUT
        });
    });

    test('close button dismisses the analytics modal', async ({
        boardPage,
        boardData
    }) => {
        const dialog = await openAnalyticsModal(boardPage, boardData);

        await dialog
            .locator('.slds-modal__footer button', { hasText: 'Close' })
            .click();

        // Modal is lwc:if-gated — closing removes it (and its backdrop) from the DOM
        await expect(dialog).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(boardPage.page.locator('.slds-backdrop')).toHaveCount(0, {
            timeout: SF_TIMEOUT
        });
    });

    test('swimlane selector is available in the filter bar', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Swimlane mode is the last select in the board filter bar
        const swimlaneSelect = boardPage.page.locator(
            'select.kanban-filter-bar__select >> nth=-1'
        );
        await expect(swimlaneSelect).toBeVisible({ timeout: SF_TIMEOUT });

        // SwimlaneManager.modeOptions: none, assignee, priority, cardType, epic
        await expect(swimlaneSelect.locator('option')).toHaveCount(5, {
            timeout: SF_TIMEOUT
        });
        await expect(
            swimlaneSelect.locator('option[value="priority"]')
        ).toHaveText('By Priority');
    });

    test('swimlane by priority groups cards into rows', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const swimlaneSelect = boardPage.page.locator(
            'select.kanban-filter-bar__select >> nth=-1'
        );
        await swimlaneSelect.selectOption('priority');

        const swimlaneBoard = boardPage.page.locator(
            '.kanban-board--swimlanes'
        );
        await expect(swimlaneBoard).toBeVisible({ timeout: SF_TIMEOUT });

        // Seeded cards cover High/Medium/Low — each priority gets exactly one lane
        for (const priority of ['High', 'Medium', 'Low']) {
            const lane = swimlaneBoard.locator('.swimlane-row').filter({
                has: boardPage.page.locator('.swimlane-label', {
                    hasText: new RegExp(`^${priority}$`)
                })
            });
            await expect(lane).toHaveCount(1, { timeout: SF_TIMEOUT });
        }

        // Cards render inside swimlane cells
        await expect(
            swimlaneBoard.locator('.swimlane-cell article.kanban-card').first()
        ).toBeVisible({ timeout: SF_TIMEOUT });

        // Switching back to "none" restores the normal board layout
        await swimlaneSelect.selectOption('none');
        await expect(
            boardPage.page.locator('.kanban-board--swimlanes')
        ).toHaveCount(0, { timeout: SF_TIMEOUT });
        await boardPage.waitForCards();
    });
});
