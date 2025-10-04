import { test, expect } from '../fixtures/test-fixtures';
import { getTestBoardId } from '../helpers/test-data';

/**
 * Smoke tests to verify E2E setup is working correctly
 * Simple checks to ensure environment is ready for testing
 */
test.describe.configure({ mode: 'serial' });
test.describe('E2E Setup Verification', () => {
    test('should have all required environment variables', async () => {
        expect(process.env.SF_INSTANCE_URL).toBeDefined();
        expect(process.env.SF_USERNAME).toBeDefined();
        expect(process.env.SF_PASSWORD).toBeDefined();
        expect(process.env.SF_BOARD_ID).toBeDefined();

        console.log('✅ All required environment variables are set');
    });

    test('should load board with expected columns', async ({
        authenticatedPage
    }) => {
        const boardId = getTestBoardId();

        // Use the goto method which handles the full URL
        await authenticatedPage.goto(boardId);

        // Wait for the board to load by checking for any column headers
        // This verifies the board component is rendering
        const columns = authenticatedPage.page.locator('.kanban-column h2');
        await expect(columns.first()).toBeVisible({ timeout: 30000 });

        const columnCount = await columns.count();
        expect(columnCount).toBeGreaterThan(0);

        console.log(`✅ Board loaded successfully with ${columnCount} columns`);
    });
});
