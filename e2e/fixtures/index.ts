import { test as base, expect } from '@playwright/test';
import { BoardPage } from '../pages';
import { createIsolatedBoard, type BoardData } from '../helpers/sf-data';

export type { BoardData } from '../helpers/sf-data';

export interface BoardDataFixture extends BoardData {
    baseUrl: string;
}

interface AlexFixtures {
    boardPage: BoardPage;
    boardData: BoardDataFixture;
}

let workerBoardData: BoardData | null = null;
let baseUrl: string = '';

/**
 * Extended Playwright test with custom fixtures for the Alex app.
 *
 * boardData creates an isolated board per worker via SF CLI Apex.
 * This ensures deterministic test data without cross-test interference.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('my test', async ({ boardPage, boardData }) => { ... });
 */
export const test = base.extend<AlexFixtures>({
    /**
     * Board page object -- pre-initialized with the Playwright page.
     * Does NOT navigate automatically; call boardPage.open() in your test.
     */
    boardPage: async ({ page }, use) => {
        // The undo/redo toolbar controls are dev-gated: kanbanBoard reads
        // localStorage['alex.debug.undoRedo'] in connectedCallback, so the
        // flag must exist before any app code runs on each navigation.
        // Lightning Web Security sandboxes localStorage per namespace and
        // stores the component's keys as `LSKey[<namespace>]<key>`.
        await page.addInitScript(() => {
            try {
                window.localStorage.setItem(
                    'LSKey[OpenSF]alex.debug.undoRedo',
                    'true'
                );
                window.localStorage.setItem('alex.debug.undoRedo', 'true');
            } catch {
                // localStorage unavailable -- undo/redo specs will fail visibly
            }
        });
        await use(new BoardPage(page));
    },

    /**
     * Board test data -- created once per worker via anonymous Apex.
     * Each Playwright worker gets its own isolated board.
     */
    boardData: async ({}, use) => {
        if (!workerBoardData) {
            workerBoardData = createIsolatedBoard('e2e');
            const loginUrl = process.env.SCRATCH_ORG_URL || '';
            if (loginUrl) {
                baseUrl = new URL(loginUrl).origin;
            }
        }
        await use({ ...workerBoardData, baseUrl });
    }
});

export { expect };
