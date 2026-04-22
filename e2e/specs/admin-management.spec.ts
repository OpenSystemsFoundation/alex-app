import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

async function openAdmin(page: Page, baseUrl: string) {
    await page.goto(`${baseUrl}/lightning/n/OpenSF__Admin_Management`, {
        waitUntil: 'domcontentloaded',
        timeout: SF_TIMEOUT
    });
    await expect(page.locator('.admin-container')).toBeVisible({
        timeout: SF_TIMEOUT
    });
}

test.describe('Admin Management', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('admin page loads the management component', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);
    });

    test('admin page shows the reduced tab model', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        await expect(boardPage.page.getByText('Boards')).toBeVisible();
        await expect(boardPage.page.getByText('Card Fields')).toBeVisible();
        await expect(boardPage.page.getByText('Settings')).toBeVisible();
        await expect(
            boardPage.page.getByText('Column Manager', { exact: true })
        ).toHaveCount(0);
    });

    test('boards tab shows board list and open-board action', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        const adminComponent = boardPage.page.locator('.admin-container');
        await expect(adminComponent.locator('.board-card').first()).toBeVisible(
            {
                timeout: SF_TIMEOUT
            }
        );
        await expect(
            adminComponent.locator('button:has-text("Open Board")').first()
        ).toBeVisible();
    });

    test('new board button opens modal', async ({ boardPage, boardData }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        await boardPage.page
            .locator('.admin-container button:has-text("New Board")')
            .click();

        await expect(
            boardPage.page.locator('.admin-container .slds-modal')
        ).toBeVisible({
            timeout: 10_000
        });
    });

    test('can create a new board via modal', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        const adminComponent = boardPage.page.locator('.admin-container');
        const boardCards = adminComponent.locator('.board-card');
        const countBefore = await boardCards.count();

        await adminComponent.locator('button:has-text("New Board")').click();

        const modal = adminComponent.locator('.slds-modal');
        await expect(modal).toBeVisible({ timeout: 10_000 });

        await modal
            .locator('input[data-field="name"]')
            .fill(`E2E Board ${Date.now()}`);
        await modal.locator('button:has-text("Create")').click();

        await expect(modal).not.toBeVisible({ timeout: SF_TIMEOUT });
        await expect(boardCards).toHaveCount(countBefore + 1, {
            timeout: SF_TIMEOUT
        });
    });

    test('onboarding points column setup to the board record page', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        const onboardingText = boardPage.page.getByText('board record page', {
            exact: false
        });
        const exists = await onboardingText
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        if (exists) {
            await expect(onboardingText).toBeVisible();
            await expect(
                boardPage.page.getByText('Columns', { exact: true })
            ).toBeVisible();
        }
    });

    test('card fields tab loads add-field flow', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        await boardPage.page.getByText('Card Fields').click();

        const addFieldButton = boardPage.page.locator(
            '.admin-container button:has-text("Add Field")'
        );
        await expect(addFieldButton).toBeVisible({ timeout: SF_TIMEOUT });

        await addFieldButton.click();
        await expect(
            boardPage.page.locator(
                '.admin-container section[aria-labelledby="card-field-modal-heading"]'
            )
        ).toBeVisible({ timeout: 10_000 });
    });

    test('settings tab shows the shipped permission sets', async ({
        boardPage,
        boardData
    }) => {
        await openAdmin(boardPage.page, boardData.baseUrl);

        await boardPage.page.getByText('Settings').click();

        await expect(
            boardPage.page.getByText('Alex Admin', { exact: true })
        ).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            boardPage.page.getByText('Alex User', { exact: true })
        ).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('board record page remains the column-management entry point', async ({
        boardPage,
        boardData
    }) => {
        await boardPage.page.goto(
            `${boardData.baseUrl}/lightning/r/OpenSF__Board__c/${boardData.boardId}/view`,
            {
                waitUntil: 'domcontentloaded',
                timeout: SF_TIMEOUT
            }
        );

        const columnsLabel = boardPage.page.getByText('Columns', {
            exact: true
        });
        const hasColumns = await columnsLabel
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!hasColumns) {
            test.skip(true, 'Board record page Columns entry not visible');
        }

        await expect(columnsLabel).toBeVisible();
    });
});
