import { loadBoardData as loadBoardDataThunk } from 'c/kanbanStore';
import getIncrementalUpdates from '@salesforce/apex/KanbanBoardController.getIncrementalUpdates';

/**
 * Handles loading and processing board data from the server
 */
export default class BoardDataLoader {
    constructor(component) {
        this.component = component;
    }

    /**
     * Load board data from server and update the store
     */
    async loadBoardData() {
        if (!this.component._recordId) {
            return;
        }

        this.component.isLoading = true;
        this.component.error = null;

        try {
            // Dispatch thunk to load data (store handles all state updates)
            await this.component.store.dispatch(
                loadBoardDataThunk(this.component._recordId)
            );

            // Update event handler with board ID
            if (this.component.eventHandler) {
                this.component.eventHandler.setBoardId(
                    this.component._recordId
                );
            }

            // Set initial sync time
            this.component._lastSyncTime = new Date();

            // Note: Subscription will auto-connect via shouldAutoSubscribe property
        } catch (error) {
            this.component.error = error;
            if (this.component.toastManager) {
                this.component.toastManager.showError(
                    'Error loading board',
                    error
                );
            }
        } finally {
            this.component.isLoading = false;
        }
    }

    /**
     * Load incremental updates (used for polling fallback)
     */
    async loadIncrementalUpdates() {
        if (!this.component._recordId || !this.component._lastSyncTime) {
            // Fall back to full refresh
            return this.loadBoardData();
        }

        try {
            const updates = await getIncrementalUpdates({
                boardId: this.component._recordId,
                lastSyncTime: this.component._lastSyncTime
            });

            if (updates && updates.hasChanges) {
                // Apply incremental updates to store
                updates.cards.forEach((card) => {
                    this.component.store.dispatch({
                        type: 'card/updated',
                        payload: card
                    });
                });

                // Update sync time
                this.component._lastSyncTime = updates.syncTimestamp;
            }

            return updates;
        } catch (error) {
            // On error, fall back to full refresh
            console.error('Incremental update failed, falling back:', error);
            return this.loadBoardData();
        }
    }
}
