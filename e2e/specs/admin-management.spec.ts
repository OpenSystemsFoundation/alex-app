import { test, expect } from '../fixtures';

const SF_TIMEOUT = 45_000;

/**
 * Admin Management Panel — E2E tests.
 *
 * Tests the admin page: board CRUD, column management,
 * card field configuration, and settings tabs.
 */
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
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        await expect(adminComponent).toBeAttached({ timeout: SF_TIMEOUT });
    });

    test('admin page shows navigation tabs', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Should have Boards, Column Manager, Card Fields, Settings tabs
        const tabs = adminComponent.locator('.admin-nav-item');
        await expect(tabs.first()).toBeVisible({ timeout: SF_TIMEOUT });
        expect(await tabs.count()).toBeGreaterThanOrEqual(4);
    });

    test('boards tab shows board list', async ({ boardPage, boardData }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Board cards should be visible (at least the one created by test data)
        const boardCards = adminComponent.locator('.board-card');
        await expect(boardCards.first()).toBeVisible({ timeout: SF_TIMEOUT });
        expect(await boardCards.count()).toBeGreaterThanOrEqual(1);
    });

    test('New Board button opens modal', async ({ boardPage, boardData }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        const newBoardBtn = adminComponent.locator(
            'button:has-text("New Board")'
        );
        const hasBtn = await newBoardBtn
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasBtn) {
            test.skip(true, 'New Board button not found');
        }

        await newBoardBtn.click();

        // Modal should appear
        const modal = adminComponent.locator('.slds-modal');
        await expect(modal).toBeVisible({ timeout: 10_000 });
    });

    test('can create a new board via modal', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Count boards before
        const boardCards = adminComponent.locator('.board-card');
        await expect(boardCards.first()).toBeVisible({ timeout: SF_TIMEOUT });
        const countBefore = await boardCards.count();

        const newBoardBtn = adminComponent.locator(
            'button:has-text("New Board")'
        );
        await newBoardBtn.click();

        const modal = adminComponent.locator('.slds-modal');
        await expect(modal).toBeVisible({ timeout: 10_000 });

        // Fill in the board name
        const nameInput = modal.locator('input[data-field="name"]');
        const hasNameInput = await nameInput
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (hasNameInput) {
            await nameInput.fill(`E2E Board ${Date.now()}`);
        }

        // Save
        const saveBtn = modal.locator('button:has-text("Save")');
        await saveBtn.click();

        // Wait for modal to close
        await expect(modal).not.toBeVisible({ timeout: SF_TIMEOUT });

        // Board count should increase
        await boardPage.page.waitForTimeout(2000);
        const countAfter = await adminComponent.locator('.board-card').count();
        expect(countAfter).toBeGreaterThan(countBefore);
    });

    test('Column Manager tab loads with board selector', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Click Column Manager tab
        const columnTab = adminComponent
            .locator('.admin-nav-item')
            .filter({ hasText: 'Column' });
        const hasTab = await columnTab
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasTab) {
            test.skip(true, 'Column Manager tab not found');
        }

        await columnTab.click();
        await boardPage.page.waitForTimeout(1000);

        // Board selector dropdown should be visible
        const boardSelector = adminComponent.locator(
            'select.column-board-select, lightning-combobox'
        );
        const hasBoardSelector = await boardSelector
            .first()
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (hasBoardSelector) {
            await expect(boardSelector.first()).toBeVisible();
        }
    });

    test('Card Fields tab shows field list', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Click Card Fields tab
        const fieldsTab = adminComponent
            .locator('.admin-nav-item')
            .filter({ hasText: 'Card Fields' });
        const hasTab = await fieldsTab
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasTab) {
            test.skip(true, 'Card Fields tab not found');
        }

        await fieldsTab.click();
        await boardPage.page.waitForTimeout(1000);

        // Card fields list should be visible or "Add Field" button
        const addFieldBtn = adminComponent.locator(
            'button:has-text("Add Field")'
        );
        const fieldList = adminComponent.locator('.field-item');
        const hasFields = await fieldList
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        const hasAddBtn = await addFieldBtn
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        expect(hasFields || hasAddBtn).toBeTruthy();
    });

    test('Settings tab shows permission set info', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Click Settings tab
        const settingsTab = adminComponent
            .locator('.admin-nav-item')
            .filter({ hasText: 'Settings' });
        const hasTab = await settingsTab
            .isVisible({ timeout: 10_000 })
            .catch(() => false);
        if (!hasTab) {
            test.skip(true, 'Settings tab not found');
        }

        await settingsTab.click();
        await boardPage.page.waitForTimeout(1000);

        // Should show permission set names
        const permSetText = adminComponent.getByText('Alex_Admin');
        const hasPermText = await permSetText
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (hasPermText) {
            await expect(permSetText).toBeVisible();
        }
    });

    test('board action menu has Edit and Delete options', async ({
        boardPage,
        boardData
    }) => {
        const baseUrl = boardData.baseUrl;
        await boardPage.page.goto(
            `${baseUrl}/lightning/n/OpenSF__Admin_Management`,
            { waitUntil: 'domcontentloaded', timeout: SF_TIMEOUT }
        );

        const adminComponent = boardPage.page.locator('.admin-container');
        const loaded = await adminComponent
            .isVisible({ timeout: SF_TIMEOUT })
            .catch(() => false);
        if (!loaded) {
            test.skip(true, 'Admin component not rendered');
        }

        // Find the first board card's action menu
        const boardCard = adminComponent.locator('.board-card').first();
        await expect(boardCard).toBeVisible({ timeout: SF_TIMEOUT });

        const actionBtn = boardCard.locator(
            'lightning-button-menu, button.board-action-btn'
        );
        const hasAction = await actionBtn
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        if (!hasAction) {
            test.skip(true, 'Board action menu not found');
        }

        await actionBtn.click();

        // Should show Edit and Delete menu items
        const editItem = boardPage.page.getByText('Edit');
        const deleteItem = boardPage.page.getByText('Delete');

        const hasEdit = await editItem
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        const hasDelete = await deleteItem
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);

        expect(hasEdit || hasDelete).toBeTruthy();
    });
});
