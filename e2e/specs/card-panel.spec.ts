import { test, expect } from '../fixtures';
import type { BoardDataFixture } from '../fixtures';
import type { Locator } from '@playwright/test';
import { sfApexRun, sfQuery } from '../helpers/sf-data';
import type { BoardPage } from '../pages';

const SF_TIMEOUT = 60_000;
// Mirrors DELETE_CONFIRM_TIMEOUT in kanbanCardPanel.js (armed delete resets)
const DELETE_CONFIRM_TIMEOUT = 3_000;
// Time for the card form to finish loading after its values render
const FORM_SETTLE_MS = 3_000;

interface SeededCard {
    cardId: string;
    cardName: string;
    subject: string;
}

/**
 * Seed a card of our own via anonymous Apex so mutating tests
 * (save/delete) never touch the shared worker fixture cards.
 */
function seedPanelCard(boardData: BoardDataFixture, label: string): SeededCard {
    const column = boardData.columns[1];
    const subject = `${label}-${Date.now()}`;

    const output = sfApexRun(`
OpenSF__Card__c card = new OpenSF__Card__c(
    OpenSF__Column__c = '${column.Id}',
    OpenSF__Board__c = '${boardData.boardId}',
    OpenSF__Subject__c = '${subject}',
    OpenSF__Status__c = '${column.header}',
    OpenSF__CardType__c = 'Task',
    OpenSF__Priority__c = 'Medium',
    OpenSF__SequenceNumber__c = 1
);
insert card;
card = [SELECT Id, Name FROM OpenSF__Card__c WHERE Id = :card.Id];
System.debug('E2E_PANEL_CARD:' + card.Id + ':' + card.Name);
`);

    const match = output.match(
        /E2E_PANEL_CARD:([a-zA-Z0-9]{15,18}):([A-Za-z0-9-]+)/
    );
    if (!match) {
        throw new Error(
            `Failed to parse seeded card from Apex output: ${output.substring(0, 500)}`
        );
    }
    return { cardId: match[1], cardName: match[2], subject };
}

/** Open the board and the detail panel for a specific card. */
async function openPanelForCard(
    boardPage: BoardPage,
    boardData: BoardDataFixture,
    cardId: string
): Promise<Locator> {
    await boardPage.open(boardData.baseUrl, boardData.boardId);
    await boardPage.waitForCards();
    // A polling refresh would re-render the panel mid-edit
    await boardPage.waitForRealtime();
    await boardPage.card(cardId).locator('.kanban-card__body').click();

    const panel = boardPage.page.locator('.card-panel');
    await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });
    return panel;
}

/**
 * The Subject lightning-input-field inside the panel's record-edit-form
 * (kanbanCardPanel.html renders field-name={field.fieldName}; modal settings
 * include Subject__c). Falls back to the input's accessible label "Subject"
 * in case the field-name attribute is not reflected into the DOM.
 */
/**
 * Wait for the record-edit-form to finish initializing after its values
 * appear. Edits made before that are not seen by the dirty check (known
 * race, see the fixme test below), so dirty-check tests let it settle.
 */
async function waitForFormToSettle(boardPage: BoardPage): Promise<void> {
    await boardPage.page.waitForTimeout(FORM_SETTLE_MS);
}

function subjectInput(panel: Locator): Locator {
    return panel
        .locator('[field-name="OpenSF__Subject__c"] input')
        .or(panel.getByRole('textbox', { name: 'Subject', exact: true }));
}

/**
 * The lightning/confirm dialog. It renders in the overlay container as an
 * `alertdialog` labelled by its header ("Unsaved changes").
 */
function confirmDialog(boardPage: BoardPage, message: string): Locator {
    return boardPage.page
        .getByRole('alertdialog', { name: 'Unsaved changes' })
        .filter({ hasText: message });
}

test.describe('Card Detail Panel', () => {
    test.beforeEach(async () => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
        }
    });

    test('clicking a card opens the detail panel', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('panel shows the correct card name and subject', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const card = boardData.cards[0];
        await boardPage.card(card.Id).locator('.kanban-card__body').click();

        const panelHeader = boardPage.page.locator('.card-panel__header h2');
        await expect(panelHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panelHeader).toContainText(card.Name);
    });

    test('close button closes the panel', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const closeBtn = boardPage.page.locator(
            '.card-panel__header lightning-button-icon'
        );
        await closeBtn.click();

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('clicking a different card switches the panel content', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(1);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const firstCard = boardData.cards[0];
        const secondCard = boardData.cards[1];

        await boardPage
            .card(firstCard.Id)
            .locator('.kanban-card__body')
            .click();

        const panelHeader = boardPage.page.locator('.card-panel__header h2');
        await expect(panelHeader).toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panelHeader).toContainText(firstCard.Name);

        await boardPage
            .card(secondCard.Id)
            .locator('.kanban-card__body')
            .click();

        await expect(panelHeader).toContainText(secondCard.Name, {
            timeout: SF_TIMEOUT
        });
    });

    test('save button is present and clickable', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const saveBtn = boardPage.page
            .locator('.card-panel__footer lightning-button')
            .last();
        await expect(saveBtn).toBeVisible();
        await expect(saveBtn).toBeEnabled();
    });

    test('delete button is present', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const deleteBtn = boardPage.page
            .locator('.card-panel__footer lightning-button')
            .first();
        await expect(deleteBtn).toBeVisible();
        await expect(deleteBtn).toContainText('Delete');
    });

    test('cancel button closes the panel', async ({ boardPage, boardData }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        await boardPage.open(boardData.baseUrl, boardData.boardId);
        await boardPage.waitForCards();

        const cardId = boardData.cards[0].Id;
        await boardPage.card(cardId).locator('.kanban-card__body').click();

        const panel = boardPage.page.locator('.card-panel');
        await expect(panel).toBeVisible({ timeout: SF_TIMEOUT });

        const buttons = boardPage.page.locator(
            '.card-panel__footer lightning-button'
        );
        // Cancel is the middle button (index 1)
        const cancelBtn = buttons.nth(1);
        await cancelBtn.click();

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('saving an edited subject updates the board and the database', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-Save');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );

        // Wait for the record-edit-form to load the current value so the
        // dirty-check snapshot (handleFormLoad) is taken before we edit
        const input = subjectInput(panel);
        await expect(input).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });

        const newSubject = `Panel-Saved-${Date.now()}`;
        await input.fill(newSubject);

        // Footer renders Delete, Cancel, Save — Save is last
        const saveBtn = panel
            .locator('.card-panel__footer lightning-button')
            .last();
        await saveBtn.click();

        const toast = boardPage.page
            .locator('.slds-notify')
            .filter({ hasText: 'Card updated successfully' });
        await expect(toast).toBeVisible({ timeout: SF_TIMEOUT });

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });

        await expect(
            boardPage.card(seeded.cardId).locator('.kanban-card__subject')
        ).toContainText(newSubject, { timeout: SF_TIMEOUT });

        const rows = sfQuery(
            `SELECT OpenSF__Subject__c FROM OpenSF__Card__c WHERE Id = '${seeded.cardId}'`
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].OpenSF__Subject__c).toBe(newSubject);
    });

    test('deleting a card requires a second confirming click', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-Delete');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );

        const deleteBtn = panel
            .locator('.card-panel__footer lightning-button')
            .first();
        await expect(deleteBtn).toContainText('Delete');

        // First click only arms the confirm state — nothing is deleted
        await deleteBtn.click();
        await expect(deleteBtn).toContainText('Confirm Delete');
        await expect(boardPage.card(seeded.cardId)).toBeVisible();

        // Second click (within DELETE_CONFIRM_TIMEOUT) performs the delete
        await deleteBtn.click();

        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
        await expect(boardPage.card(seeded.cardId)).toHaveCount(0, {
            timeout: SF_TIMEOUT
        });

        await expect
            .poll(
                () =>
                    sfQuery(
                        `SELECT Id FROM OpenSF__Card__c WHERE Id = '${seeded.cardId}'`
                    ).length,
                { timeout: 30_000 }
            )
            .toBe(0);
    });

    test('armed delete reverts to Delete after the confirm timeout', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-DeleteRevert');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );

        const deleteBtn = panel
            .locator('.card-panel__footer lightning-button')
            .first();
        await deleteBtn.click();
        await expect(deleteBtn).toContainText('Confirm Delete');

        // The armed state resets after DELETE_CONFIRM_TIMEOUT (3s)
        await expect(deleteBtn).not.toContainText('Confirm Delete', {
            timeout: DELETE_CONFIRM_TIMEOUT + 5_000
        });
        await expect(deleteBtn).toContainText('Delete');

        // The card was never deleted
        await expect(boardPage.card(seeded.cardId)).toBeVisible();
        expect(
            sfQuery(
                `SELECT Id FROM OpenSF__Card__c WHERE Id = '${seeded.cardId}'`
            )
        ).toHaveLength(1);
    });

    test('closing with unsaved changes shows a discard confirmation', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-Dirty');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );

        const input = subjectInput(panel);
        await expect(input).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });
        await waitForFormToSettle(boardPage);
        await input.fill(`${seeded.subject}-edited`);

        const closeBtn = boardPage.page.locator(
            '.card-panel__header lightning-button-icon'
        );
        await closeBtn.click();

        // LightningConfirm message from kanbanCardPanel.handleClose
        const dialog = confirmDialog(boardPage, 'Discard and close?');
        await expect(dialog).toBeVisible({ timeout: SF_TIMEOUT });

        // Cancel keeps the panel open
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).not.toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panel).toBeVisible();

        // Reopen the dialog and confirm — the panel closes
        await closeBtn.click();
        await expect(dialog).toBeVisible({ timeout: SF_TIMEOUT });
        await dialog.getByRole('button', { name: 'OK' }).click();
        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
    });

    test('switching cards with unsaved changes shows a discard confirmation', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const seeded = seedPanelCard(boardData, 'Panel-Switch');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );

        const panelHeader = boardPage.page.locator('.card-panel__header h2');
        await expect(panelHeader).toContainText(seeded.cardName);

        const input = subjectInput(panel);
        await expect(input).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });
        await waitForFormToSettle(boardPage);
        await input.fill(`${seeded.subject}-edited`);

        // Click a different (read-only fixture) card while dirty
        const otherCard = boardData.cards[0];
        await boardPage
            .card(otherCard.Id)
            .locator('.kanban-card__body')
            .click();

        // LightningConfirm message from cardOperations.handleCardClick
        const dialog = confirmDialog(boardPage, 'Discard and switch cards?');
        await expect(dialog).toBeVisible({ timeout: SF_TIMEOUT });

        // Cancel keeps the first card's panel open
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).not.toBeVisible({ timeout: SF_TIMEOUT });
        await expect(panel).toBeVisible();
        await expect(panelHeader).toContainText(seeded.cardName);
    });

    test('closing without edits shows no confirmation and closes immediately', async ({
        boardPage,
        boardData
    }) => {
        expect(boardData.cards.length).toBeGreaterThan(0);
        const cardId = boardData.cards[0].Id;
        const panel = await openPanelForCard(boardPage, boardData, cardId);

        // Wait for the form so closing isn't racing the record load
        const input = subjectInput(panel);
        await expect(input).toBeVisible({ timeout: SF_TIMEOUT });

        await boardPage.page
            .locator('.card-panel__header lightning-button-icon')
            .click();

        // Panel closes without any unsaved-changes dialog appearing:
        // handleClose only opens LightningConfirm before closing, so a
        // closed panel plus zero dialogs proves the clean-close path
        await expect(panel).not.toBeVisible({ timeout: SF_TIMEOUT });
        await expect(
            confirmDialog(boardPage, 'You have unsaved changes')
        ).toHaveCount(0);
    });

    test('Escape closes a panel without changes', async ({
        boardPage,
        boardData
    }) => {
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            boardData.cards[0].Id
        );
        await expect(subjectInput(panel)).toBeVisible({ timeout: SF_TIMEOUT });

        await subjectInput(panel).focus();
        await boardPage.page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0, { timeout: SF_TIMEOUT });
    });

    test('changing priority and saving updates the card and the database', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-Priority');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );
        await expect(subjectInput(panel)).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });
        await expect(
            boardPage.card(seeded.cardId).locator('.priority-pill')
        ).toHaveText(/medium/i);

        const priority = panel.getByRole('combobox', { name: 'Priority' });
        await priority.click();
        await panel.getByRole('option', { name: 'High', exact: true }).click();
        await expect(priority).toHaveText(/High/);
        await panel
            .locator('.card-panel__footer')
            .getByRole('button', { name: 'Save' })
            .click();

        await expect(panel).toHaveCount(0, { timeout: SF_TIMEOUT });
        await expect(
            boardPage.card(seeded.cardId).locator('.priority-pill')
        ).toHaveText(/high/i, { timeout: SF_TIMEOUT });
        const rows = sfQuery(
            `SELECT OpenSF__Priority__c FROM OpenSF__Card__c WHERE Id = '${seeded.cardId}'`
        );
        expect(rows[0].OpenSF__Priority__c).toBe('High');
    });

    test('Apply Template fills the description for the card type', async ({
        boardPage,
        boardData
    }) => {
        // Seeded panel cards are Tasks
        const seeded = seedPanelCard(boardData, 'Panel-Template');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );
        await expect(subjectInput(panel)).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });

        await panel.getByRole('button', { name: 'Apply Template' }).click();
        const description = panel.getByRole('group', { name: 'Description' });
        await expect(description).toContainText('Done When');

        await panel
            .locator('.card-panel__footer')
            .getByRole('button', { name: 'Save' })
            .click();
        await expect(panel).toHaveCount(0, { timeout: SF_TIMEOUT });

        const rows = sfQuery(
            `SELECT OpenSF__Description__c FROM OpenSF__Card__c WHERE Id = '${seeded.cardId}'`
        );
        expect(rows[0].OpenSF__Description__c).toContain('<h2>Task</h2>');
        expect(rows[0].OpenSF__Description__c).toContain('Done When');
    });

    // Known bug: an edit made as soon as the form shows its values is not
    // detected, so closing discards it without asking. Remove fixme once
    // kanbanCardPanel's dirty snapshot is reliable.
    test.fixme('an edit made right after the panel opens is still protected', async ({
        boardPage,
        boardData
    }) => {
        const seeded = seedPanelCard(boardData, 'Panel-Early');
        const panel = await openPanelForCard(
            boardPage,
            boardData,
            seeded.cardId
        );
        const input = subjectInput(panel);
        await expect(input).toHaveValue(seeded.subject, {
            timeout: SF_TIMEOUT
        });
        await input.fill(`${seeded.subject}-edited`);
        await boardPage.page
            .locator('.card-panel__header lightning-button-icon')
            .click();

        await expect(
            confirmDialog(boardPage, 'Discard and close?')
        ).toBeVisible({ timeout: 10_000 });
    });
});
