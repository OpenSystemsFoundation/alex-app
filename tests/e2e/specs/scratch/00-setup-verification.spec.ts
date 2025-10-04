import { test, expect } from '../../fixtures/test-fixtures-scratch';

/**
 * Scratch org setup verification tests
 * Simple smoke tests to verify the environment is ready
 */
test.describe.configure({ mode: 'serial' });
test.describe('Scratch Org Setup Verification', () => {
    test('should have org info from global setup', async ({ orgInfo }) => {
        expect(orgInfo.instanceUrl).toBeDefined();
        expect(orgInfo.boardId).toBeDefined();
        expect(orgInfo.accessToken).toBeDefined();
        expect(orgInfo.orgAlias).toBeDefined();

        console.log(`✅ Org Alias: ${orgInfo.orgAlias}`);
        console.log(`✅ Instance URL: ${orgInfo.instanceUrl}`);
        console.log(`✅ Board ID: ${orgInfo.boardId}`);
    });

    test('should load board with all expected columns', async ({
        authenticatedPage,
        orgInfo
    }) => {
        // Navigate to the board
        await authenticatedPage.page.goto(
            `${orgInfo.instanceUrl}/lightning/r/${orgInfo.boardId}/view`
        );

        // Wait for the board to load by checking for column headers
        // These are the columns created in global setup: To Do, In Progress, Done
        await expect(authenticatedPage.page.getByText('To Do')).toBeVisible({
            timeout: 30000
        });
        await expect(
            authenticatedPage.page.getByText('In Progress')
        ).toBeVisible();
        await expect(authenticatedPage.page.getByText('Done')).toBeVisible();

        console.log(
            '✅ Board loaded successfully with all columns: To Do, In Progress, Done'
        );
    });
});
