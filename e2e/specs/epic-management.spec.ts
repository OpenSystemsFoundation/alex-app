import { test, expect } from '../fixtures';
import {
    createIsolatedBoard,
    sfApexRun,
    type BoardData
} from '../helpers/sf-data';

const SF_TIMEOUT = 60_000;

/**
 * Epic Management -- E2E tests.
 *
 * The shared worker board has no epic data, so these tests use a
 * dedicated per-worker board seeded with one Epic card plus six child
 * cards: three in 'To Do' and three in 'Done' (a Done-category column),
 * giving deterministic epic progress of 3 of 6 completed.
 */

const EPIC_SUBJECT = 'E2E Epic Alpha';

type EpicBoard = BoardData & { baseUrl: string; epicId: string };

let workerEpicBoard: EpicBoard | null = null;

function scratchOrgOrigin(): string {
    const loginUrl = process.env.SCRATCH_ORG_URL || '';
    return loginUrl ? new URL(loginUrl).origin : '';
}

/**
 * Per-worker board with epic data. Tests on it only read state or
 * apply UI filters -- none of them move or mutate the seeded cards.
 */
function getEpicBoard(): EpicBoard {
    if (!workerEpicBoard) {
        const board = createIsolatedBoard('epic-e2e');
        const backlogColumn = board.columns.find((c) => c.header === 'Backlog');
        if (!backlogColumn) {
            throw new Error('Isolated board is missing its Backlog column');
        }
        const output = sfApexRun(`
OpenSF.TriggerHandler.bypass('ColumnTriggerHandler');
OpenSF__Card__c epic = new OpenSF__Card__c(
    OpenSF__Column__c = '${backlogColumn.Id}',
    OpenSF__Board__c = '${board.boardId}',
    OpenSF__Subject__c = '${EPIC_SUBJECT}',
    OpenSF__Status__c = 'Backlog',
    OpenSF__CardType__c = 'Epic',
    OpenSF__Priority__c = 'High',
    OpenSF__StoryPoints__c = 21,
    OpenSF__LexoRankPosition__c = '0|hzzzzz:',
    OpenSF__SequenceNumber__c = 1
);
insert epic;
// Only Id is queried so the update sends just OpenSF__Epic__c
// (never re-send the master-detail column field on update)
List<OpenSF__Card__c> children = [
    SELECT Id
    FROM OpenSF__Card__c
    WHERE OpenSF__Column__r.OpenSF__Board__c = '${board.boardId}'
    AND OpenSF__Column__r.OpenSF__ColumnHeader__c IN ('To Do', 'Done')
];
for (OpenSF__Card__c child : children) {
    child.OpenSF__Epic__c = epic.Id;
}
update children;
OpenSF.TriggerHandler.clearBypass('ColumnTriggerHandler');
System.debug('E2E_EPIC_ID:' + epic.Id);
`);
        const match = output.match(/E2E_EPIC_ID:([a-zA-Z0-9]{15,18})/);
        if (!match) {
            throw new Error(
                `Failed to parse epic ID from Apex output: ${output.substring(0, 500)}`
            );
        }
        workerEpicBoard = {
            ...board,
            baseUrl: scratchOrgOrigin(),
            epicId: match[1]
        };
    }
    return workerEpicBoard;
}

test.describe('Epic Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('epic cards show progress bar when they have child cards', async ({
        boardPage
    }) => {
        const board = getEpicBoard();
        await boardPage.open(board.baseUrl, board.boardId);
        await boardPage.waitForCards();

        // Board cards render no progress bar -- the epic progress bar
        // lives in the card panel's Epic Progress section
        await boardPage
            .card(board.epicId)
            .locator('.kanban-card__body')
            .click();
        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const progressBar = panel.locator('.epic-detail__progress-bar');
        await expect(progressBar).toHaveCount(1, { timeout: SF_TIMEOUT });
        await expect(progressBar).toBeVisible();

        // 3 of the 6 seeded children sit in the Done-category column
        await expect(panel.locator('.epic-detail__progress')).toContainText(
            '3 of 6 cards completed',
            { timeout: SF_TIMEOUT }
        );
    });

    test('cards belonging to an epic show the epic label badge', async ({
        boardPage
    }) => {
        const board = getEpicBoard();
        await boardPage.open(board.baseUrl, board.boardId);
        await boardPage.waitForCards();

        // Each of the 6 seeded child cards renders an epic label badge
        const epicLabels = boardPage.page.locator('.epic-label');
        await expect(epicLabels).toHaveCount(6, { timeout: SF_TIMEOUT });
        await expect(epicLabels.first()).toContainText(EPIC_SUBJECT);
    });

    test('type filter - select Epic shows only epic-type cards', async ({
        boardPage
    }) => {
        const board = getEpicBoard();
        await boardPage.open(board.baseUrl, board.boardId);
        await boardPage.waitForCards();

        const allCards = boardPage.allCards();
        const allCardsBefore = await allCards.count();
        expect(allCardsBefore).toBeGreaterThan(1);

        await boardPage.typeFilter.selectOption('Epic');

        // The seeded epic is the only Epic-type card on this board
        await expect(allCards).toHaveCount(1, { timeout: SF_TIMEOUT });
        await expect(allCards.first()).toHaveAttribute(
            'data-card-id',
            board.epicId
        );
    });

    test('swimlane by epic groups cards correctly', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        // Find the swimlane dropdown (last select in filter bar)
        const swimlaneSelect = boardPage.page.locator(
            'select.kanban-filter-bar__select >> nth=-1'
        );

        // Select "By Epic" swimlane mode
        await swimlaneSelect.selectOption('epic');

        // Board should switch to swimlane mode
        const swimlaneBoard = boardPage.page.locator(
            '.kanban-board--swimlanes'
        );
        await expect(swimlaneBoard).toBeVisible({ timeout: SF_TIMEOUT });

        // Should show at least one swimlane row (even "No Epic")
        const swimlaneRows = boardPage.page.locator('.swimlane-row');
        await expect(swimlaneRows.first()).toBeVisible({
            timeout: SF_TIMEOUT
        });

        // At least one row should have a label
        const firstLabel = swimlaneRows.first().locator('.swimlane-label');
        await expect(firstLabel).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('card panel shows epic progress section for epic cards', async ({
        boardPage
    }) => {
        const board = getEpicBoard();
        await boardPage.open(board.baseUrl, board.boardId);
        await boardPage.waitForCards();

        await boardPage
            .card(board.epicId)
            .locator('.kanban-card__body')
            .click();
        const cardPanel = boardPage.page.locator('.card-panel');
        await expect(cardPanel).toBeVisible({ timeout: SF_TIMEOUT });

        // Epic-type cards show the Epic Progress section
        const epicSection = cardPanel.locator('.epic-detail-section');
        await expect(epicSection).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(epicSection).toContainText('Epic Progress');
    });

    test('clear filters button resets epic filter', async ({ boardPage }) => {
        const board = getEpicBoard();
        await boardPage.open(board.baseUrl, board.boardId);
        await boardPage.waitForCards();

        const allCards = boardPage.allCards();
        const allCardsBefore = await allCards.count();
        expect(allCardsBefore).toBeGreaterThan(1);

        // Apply a filter that narrows the board to the single epic card
        await boardPage.typeFilter.selectOption('Epic');
        await expect(allCards).toHaveCount(1, { timeout: SF_TIMEOUT });

        // The clear control only renders while a filter is active
        const clearBtn = boardPage.page.locator(
            'button.kanban-filter-bar__clear'
        );
        await expect(clearBtn).toBeVisible({ timeout: SF_TIMEOUT });
        await clearBtn.click();

        await expect(allCards).toHaveCount(allCardsBefore, {
            timeout: SF_TIMEOUT
        });
    });
});
