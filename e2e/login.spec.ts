import { test, expect, chromium } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('Clear existing cards using Anonymous Apex and proceed with board operations', async () => {
    const baseUrl = process.env.SALESFORCE_URL;
    const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;

    if (!baseUrl || !accessToken) {
        throw new Error(
            'SALESFORCE_URL or SALESFORCE_ACCESS_TOKEN is not defined in the .env file'
        );
    }

    // Construct the frontdoor URL
    const frontdoorUrl = `${baseUrl}/secur/frontdoor.jsp?sid=${accessToken}`;
    const apexScript = `
        // Query all cards related to the board
        List<OpenSF__Card__c> cardsToDelete = [SELECT Id FROM OpenSF__Card__c WHERE OpenSF__Board__c = 'YOUR_BOARD_ID'];

        // Delete the cards
        delete cardsToDelete;

        // Debug message for confirmation
        System.debug('Deleted cards: ' + cardsToDelete.size());
    `;

    // Launch browser and navigate to the URL
    const browser = await chromium.launch({ headless: false }); // Set headless: false for debugging
    const context = await browser.newContext();
    const page = await context.newPage();
    const boardListView = `${baseUrl}/lightning/o/OpenSF__Board__c/list?filterName=OpenSF__All`;

    try {
        console.log('Navigating to Salesforce frontdoor URL...');
        await page.goto(frontdoorUrl);

        // Open Developer Console
        console.log('Opening Developer Console...');
        await page.click('button[title="Setup"]'); // Open Setup
        await page.getByRole('menuitem', { name: 'Developer Console' }).click();

        // Switch to Developer Console window
        const devConsole = await context.waitForEvent('page');
        await devConsole.waitForLoadState();

        // Open Execute Anonymous window
        console.log('Opening Execute Anonymous window...');
        await devConsole.keyboard.press('Control+E'); // Adjust for Mac if needed: Command+E

        // Paste the Apex script
        console.log('Pasting Apex script...');
        const apexEditor = devConsole.locator('.monaco-editor textarea'); // Adjust selector based on actual UI
        await apexEditor.fill(apexScript);

        // Execute the script
        console.log('Executing Apex script...');
        await devConsole.locator('button[title="Execute"]').click(); // Adjust selector based on actual UI

        // Confirm execution success
        console.log('Waiting for script execution confirmation...');
        await devConsole.waitForSelector('text=Execution Complete', {
            timeout: 10000
        });

        console.log('Apex script executed successfully. Cards cleared.');

        // Close Developer Console
        await devConsole.close();

        // Navigate back to the board and perform operations
        console.log('Navigating back to Salesforce...');
        const lightningUrl = `${baseUrl}/lightning`;
        await page.goto(lightningUrl);

        await page.goto(boardListView);
        await page.getByRole('link', { name: 'Playwright Test Board' }).click();
        await expect(page.getByRole('link', { name: 'Backlog' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'To Do' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Doing' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Done' })).toBeVisible();
        console.log('Successfully navigated to the Board List View.');

        await page
            .getByRole('button', { name: 'Add New Card' })
            .first()
            .click();
        await page
            .getByRole('button', { name: 'Add New Card Add New Card' })
            .nth(1)
            .click();
        await page
            .getByRole('button', { name: 'Add New Card Add New Card' })
            .nth(2)
            .click();
        await page
            .getByRole('button', { name: 'Add New Card Add New Card' })
            .nth(3)
            .click();
        console.log('Successfully added new cards to the Board.');
    } catch (error) {
        if (error instanceof Error) {
            console.error(
                'Failed during navigation or validation:',
                error.message
            );
        } else {
            console.error('Failed during navigation or validation:', error);
        }
        throw error;
    } finally {
        // Close the browser
        await browser.close();
        console.log('Browser closed.');
    }
});
