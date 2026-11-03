import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { sfQuery } from '../helpers/sf-data';

const SF_TIMEOUT = 45_000;

const ADMIN_TAB_PATH = 'n/OpenSF__Admin_Management';

/**
 * Open the Admin Management tab. `app` pins the Lightning app context so
 * both shells (standard nav and console) are exercised explicitly.
 */
async function openAdmin(
    page: Page,
    baseUrl: string,
    app: 'OpenSF__Alex' | 'OpenSF__AlexConsole' = 'OpenSF__Alex'
) {
    await page.goto(`${baseUrl}/lightning/app/${app}/${ADMIN_TAB_PATH}`, {
        waitUntil: 'domcontentloaded',
        timeout: SF_TIMEOUT
    });
    const admin = page.locator('.admin-container');
    await expect(admin).toBeVisible({ timeout: SF_TIMEOUT });
    return admin;
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Admin Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    for (const app of ['OpenSF__Alex', 'OpenSF__AlexConsole'] as const) {
        test(`admin page loads the management component (${app})`, async ({
            boardPage,
            boardData
        }) => {
            const admin = await openAdmin(
                boardPage.page,
                boardData.baseUrl,
                app
            );
            await expect(
                admin.getByRole('heading', { name: 'Admin Management' })
            ).toBeVisible();
        });
    }

    test('admin page shows the reduced tab model', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        // lightning-tab renders <a role="tab" data-label="...">
        const tabs = admin.getByRole('tab');
        await expect(tabs).toHaveCount(3);
        await expect(admin.getByRole('tab', { name: 'Boards' })).toBeVisible();
        await expect(
            admin.getByRole('tab', { name: 'Card Fields' })
        ).toBeVisible();
        await expect(
            admin.getByRole('tab', { name: 'Settings' })
        ).toBeVisible();
        // Column management moved to the board record page
        await expect(
            admin.getByRole('tab', { name: 'Column Manager' })
        ).toHaveCount(0);
    });

    test('boards tab shows board list and open-board action', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        await expect(admin.locator('.board-card').first()).toBeVisible({
            timeout: SF_TIMEOUT
        });
        await expect(
            admin
                .locator('.board-card')
                .first()
                .getByRole('button', { name: 'Open Board' })
        ).toBeVisible();
    });

    test('new board button opens the create modal', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        await admin.getByRole('button', { name: 'New Board' }).click();

        const modal = admin.getByRole('dialog', { name: 'New Board' });
        await expect(modal).toBeVisible({ timeout: 10_000 });
        await expect(
            modal.getByRole('button', { name: 'Create', exact: true })
        ).toBeVisible();

        // Board Type offers the four supported types, including Sprint
        await modal.getByRole('combobox', { name: 'Board Type' }).click();
        for (const type of ['Project', 'Personal', 'Team', 'Sprint']) {
            await expect(
                modal.getByRole('option', { name: type, exact: true })
            ).toBeVisible();
        }
        await boardPage.page.keyboard.press('Escape');

        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).toHaveCount(0);
    });

    test('can create a new project board via modal', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        await admin.getByRole('button', { name: 'New Board' }).click();
        const modal = admin.getByRole('dialog', { name: 'New Board' });
        await expect(modal).toBeVisible({ timeout: 10_000 });

        const boardName = `E2E Board ${Date.now()}`;
        // data-field sits on the lightning-input host, not the native input
        await modal.locator('[data-field="name"] input').fill(boardName);
        await modal
            .getByRole('button', { name: 'Create', exact: true })
            .click();

        await expect(modal).toHaveCount(0, { timeout: SF_TIMEOUT });
        const newCard = admin.locator('.board-card', {
            has: boardPage.page.locator('.board-name', {
                hasText: new RegExp(`^${escapeRegExp(boardName)}$`)
            })
        });
        await expect(newCard).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(newCard.locator('.board-meta')).toContainText('Project');

        const rows = sfQuery(
            `SELECT OpenSF__Type__c FROM OpenSF__Board__c WHERE Name = '${boardName}'`
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].OpenSF__Type__c).toBe('Project');
    });

    test('can create a Sprint board that enables sprint features', async ({
        boardPage,
        boardData
    }) => {
        const page = boardPage.page;
        const admin = await openAdmin(page, boardData.baseUrl);

        await admin.getByRole('button', { name: 'New Board' }).click();
        const modal = admin.getByRole('dialog', { name: 'New Board' });
        await expect(modal).toBeVisible({ timeout: 10_000 });

        const boardName = `E2E Sprint Board ${Date.now()}`;
        await modal.locator('[data-field="name"] input').fill(boardName);
        await modal.getByRole('combobox', { name: 'Board Type' }).click();
        await modal
            .getByRole('option', { name: 'Sprint', exact: true })
            .click();
        await expect(
            modal.getByRole('combobox', { name: 'Board Type' })
        ).toHaveText(/Sprint/);
        await modal
            .getByRole('button', { name: 'Create', exact: true })
            .click();

        await expect(modal).toHaveCount(0, { timeout: SF_TIMEOUT });
        const newCard = admin.locator('.board-card', {
            has: page.locator('.board-name', {
                hasText: new RegExp(`^${escapeRegExp(boardName)}$`)
            })
        });
        await expect(newCard).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(newCard.locator('.board-meta')).toContainText('Sprint');

        const rows = sfQuery(
            `SELECT Id, OpenSF__Type__c FROM OpenSF__Board__c WHERE Name = '${boardName}'`
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].OpenSF__Type__c).toBe('Sprint');

        // Opening the board shows sprint UI: header in the topbar and the
        // "No Active Sprint" empty state (a new board has no sprint yet)
        await newCard.getByRole('button', { name: 'Open Board' }).click();
        await expect(page).toHaveURL(new RegExp(rows[0].Id.slice(0, 15)), {
            timeout: SF_TIMEOUT
        });
        await expect(page.locator('.sprint-inline__empty')).toHaveText(
            'No active sprint',
            { timeout: SF_TIMEOUT }
        );
        await expect(
            page.getByRole('heading', { name: 'No Active Sprint' })
        ).toBeVisible();
    });

    test('edit board modal uses the Save label', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        const firstCard = admin.locator('.board-card').first();
        await expect(firstCard).toBeVisible({ timeout: SF_TIMEOUT });
        await firstCard.getByRole('button', { name: 'Board Actions' }).click();
        await firstCard.getByRole('menuitem', { name: 'Edit' }).click();

        const modal = admin.getByRole('dialog', { name: 'Edit Board' });
        await expect(modal).toBeVisible({ timeout: 10_000 });
        await expect(
            modal.getByRole('button', { name: 'Save', exact: true })
        ).toBeVisible();
        await expect(
            modal.getByRole('button', { name: 'Create', exact: true })
        ).toHaveCount(0);

        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).toHaveCount(0);
    });

    test('card fields tab loads add-field flow', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        await admin.getByRole('tab', { name: 'Card Fields' }).click();

        const addFieldButton = admin
            .getByRole('button', { name: 'Add Field' })
            .first();
        await expect(addFieldButton).toBeVisible({ timeout: SF_TIMEOUT });
        await addFieldButton.click();

        const modal = admin.getByRole('dialog', { name: 'New Card Field' });
        await expect(modal).toBeVisible({ timeout: 10_000 });
        await expect(
            modal.getByRole('combobox', { name: /Card Field/ })
        ).toBeVisible();
    });

    test('settings tab shows the shipped permission sets', async ({
        boardPage,
        boardData
    }) => {
        const admin = await openAdmin(boardPage.page, boardData.baseUrl);

        await admin.getByRole('tab', { name: 'Settings' }).click();

        const permSets = admin.locator('.permission-set-item strong');
        await expect(permSets).toHaveText(['Alex Admin', 'Alex User'], {
            timeout: SF_TIMEOUT
        });
    });

    test('board record page remains the column-management entry point', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.open(boardData.baseUrl, boardData.boardId);

        const columnsTab = boardPage.page.locator('[data-tab-id="columns"]');
        await expect(columnsTab).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(columnsTab).toHaveText('Columns');
    });
});
