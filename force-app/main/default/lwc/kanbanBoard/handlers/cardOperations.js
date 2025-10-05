import { createCardAsync } from 'c/kanbanStore';
import { deleteCard } from 'c/kanbanStore';

/**
 * Handles card-related operations (create, update, delete)
 */
export default class CardOperations {
    constructor(component) {
        this.component = component;
    }

    /**
     * Find a card by ID using store selector
     */
    findCard(cardId) {
        return this.component.store.findCard(cardId);
    }

    /**
     * Handle card click to open detail view
     */
    handleCardClick(cardId) {
        const card = this.findCard(cardId);

        if (card) {
            this.component.selectedCard = card;
            this.component.showCardDetail = true;
        }
    }

    /**
     * Handle card detail close
     */
    handleCardDetailClose() {
        this.component.showCardDetail = false;
        this.component.selectedCard = null;
    }

    /**
     * Handle card updated
     */
    handleCardUpdated() {
        this.component.showCardDetail = false;
        this.component.loadBoardData();
        this.component.selectedCard = null;
    }

    /**
     * Handle card deleted
     */
    handleCardDeleted(cardId) {
        if (!cardId) {
            return;
        }

        // Dispatch action to remove from store
        this.component.store.dispatch(deleteCard(cardId));

        this.component.showCardDetail = false;
        this.component.selectedCard = null;
    }

    /**
     * Create a new card in the specified column
     */
    async createCard(columnId, button) {
        if (!columnId) {
            if (this.component.toastManager) {
                this.component.toastManager.showError(
                    'Invalid column',
                    'Column ID not found'
                );
            }
            return;
        }

        button.disabled = true;

        try {
            const requestId = this.component.requestTracker.trackRequest(
                'create',
                null,
                {
                    columnId,
                    subject: 'New Card'
                }
            );

            await this.component.operationQueue.enqueue({
                type: 'create',
                cardId: null,
                columnId,
                requestId,
                execute: async () => {
                    try {
                        // Use thunk to create card
                        const result = await this.component.store.dispatch(
                            createCardAsync(
                                columnId,
                                'New Card',
                                requestId,
                                this.component._clientId
                            )
                        );

                        const request =
                            this.component.requestTracker.getRequest(requestId);
                        if (request) {
                            request.cardId = result.card.Id;
                        }
                        this.component.requestTracker.completeRequest(
                            requestId,
                            result.card
                        );

                        return result.card;
                    } catch (error) {
                        this.component.requestTracker.failRequest(
                            requestId,
                            error
                        );

                        if (
                            !this.component.subscriptionManager ||
                            !this.component.subscriptionManager.isConnected()
                        ) {
                            await this.component.loadBoardData();
                        }

                        throw error;
                    }
                }
            });

            if (this.component.toastManager) {
                this.component.toastManager.showSuccess(
                    'Card created successfully'
                );
            }
        } catch (error) {
            if (this.component.toastManager) {
                this.component.toastManager.showError(
                    'Error creating card',
                    error
                );
            }
        } finally {
            button.disabled = false;
        }
    }
}
