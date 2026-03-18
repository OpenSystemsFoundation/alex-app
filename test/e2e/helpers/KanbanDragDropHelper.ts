import { Page, Locator } from '@playwright/test';

/**
 * Drag and Drop Helper for Kanban Board testing
 * Handles all drag and drop operations
 */
export class KanbanDragDropHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Drag a card within the same column to a different position
     *
     * This method accounts for the LWC's drag-drop implementation where:
     * - Source card gets .dragging class and is excluded from calculateDropPosition
     * - Drop position is calculated based on 75% threshold down each visible card
     * - When moving DOWN, we need to account for the source card's height in the drop position
     */
    async dragCardWithinColumn(
        sourceCard: Locator,
        targetCard: Locator,
        sourceIndex: number,
        targetIndex: number
    ): Promise<void> {
        if (targetIndex === 0) {
            // Moving to position 0 - drop before the first card
            await this.dropBeforeCard(sourceCard, targetCard);
        } else if (sourceIndex < targetIndex) {
            // Moving DOWN: Need to account for source card's height
            // Drop at 85% of target card + half source card height
            await this.dropAfterCard(sourceCard, targetCard, true);
        } else {
            // Moving UP: Drop after the card before target position
            await this.dropAfterCard(sourceCard, targetCard, false);
        }

        // Wait for state updates and re-render
        await this.page.waitForTimeout(5000);
    }

    /**
     * Drag a card to a different column
     */
    async dragCardToColumn(
        sourceCard: Locator,
        targetColumn: Locator,
        targetPosition?: number
    ): Promise<void> {
        const targetCardsContainer = targetColumn.locator(
            '.kanban-column__card-wrapper'
        );

        const sourceBox = await sourceCard.boundingBox();
        if (!sourceBox) {
            throw new Error('Source card not found');
        }

        const targetBox = await targetCardsContainer.boundingBox();
        if (!targetBox) {
            throw new Error('Target column not found');
        }

        let targetX = targetBox.x + targetBox.width / 2;
        let targetY = targetBox.y + 50; // Default to top of column

        // If a specific position is provided, calculate the Y coordinate
        if (targetPosition !== undefined) {
            const cardsInTarget = targetColumn.locator('.kanban-card');
            const cardCount = await cardsInTarget.count();

            if (targetPosition < cardCount) {
                const targetCard = cardsInTarget.nth(targetPosition);
                const targetCardBox = await targetCard.boundingBox();
                if (targetCardBox) {
                    targetY = targetCardBox.y + 10;
                }
            } else if (cardCount > 0) {
                // Drop after last card
                const lastCard = cardsInTarget.nth(cardCount - 1);
                const lastCardBox = await lastCard.boundingBox();
                if (lastCardBox) {
                    targetY = lastCardBox.y + lastCardBox.height + 10;
                }
            }
        }

        // Perform drag and drop
        await sourceCard.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, targetY, { steps: 10 });
        await this.page.waitForTimeout(500);
        await this.page.mouse.up();

        // Wait for animations or state updates
        await this.page.waitForTimeout(1000);
    }

    /**
     * Drop card before another card (above 75% threshold)
     */
    private async dropBeforeCard(
        sourceCard: Locator,
        targetCard: Locator
    ): Promise<void> {
        const targetBox = await targetCard.boundingBox();
        if (!targetBox) {
            throw new Error('Target card not found');
        }

        // Drop at 20% down the card (well before the 75% threshold)
        const targetX = targetBox.x + targetBox.width / 2;
        const targetY = targetBox.y + targetBox.height * 0.2;

        await sourceCard.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, targetY, { steps: 20 });
        await this.page.waitForTimeout(500);
        await this.page.mouse.up();
    }

    /**
     * Drop card after another card (past 75% threshold)
     * @param accountForSourceHeight - When true, adds source card height to drop position (for moving down)
     */
    private async dropAfterCard(
        sourceCard: Locator,
        targetCard: Locator,
        accountForSourceHeight: boolean
    ): Promise<void> {
        const sourceBox = await sourceCard.boundingBox();
        const targetBox = await targetCard.boundingBox();

        if (!sourceBox || !targetBox) {
            throw new Error('Source or target card not found');
        }

        const targetX = targetBox.x + targetBox.width / 2;
        let targetY: number;

        if (accountForSourceHeight) {
            // Drop at 90% of target card height (simpler approach for Firefox/WebKit compatibility)
            targetY = targetBox.y + targetBox.height * 0.9;
        } else {
            // Drop at 85% down the card (well past the 75% threshold)
            targetY = targetBox.y + targetBox.height * 0.85;
        }

        await sourceCard.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, targetY, { steps: 20 });
        await this.page.waitForTimeout(500);
        await this.page.mouse.up();
    }
}
