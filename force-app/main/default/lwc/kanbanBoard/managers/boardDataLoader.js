import { loadBoardData as loadBoardDataThunk } from 'c/kanbanStore';
import getIncrementalUpdates from '@salesforce/apex/KanbanBoardController.getIncrementalUpdates';

const POLLING_FREQUENCY = 15000; // 15 seconds
const RECONNECT_INTERVAL = 300000; // 5 minutes

/**
 * Handles loading and processing board data from the server
 */
export default class BoardDataLoader {
    pollingInterval = null;
    lastSuccessfulPoll = null;
    consecutiveFailedPolls = 0;
    static MAX_FAILED_POLLS = 3;

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

                // Dispatch a special action to show "Updated" message
                this.component.store.dispatch({
                    type: 'POLLING_UPDATE_DETECTED',
                    payload: { timestamp: updates.syncTimestamp }
                });
            }

            return updates;
        } catch (error) {
            // On error, fall back to full refresh
            console.error('Incremental update failed, falling back:', error);
            return this.loadBoardData();
        }
    }

    /**
     * Start polling for data updates
     */
    startPolling() {
        if (this.pollingInterval) {
            return; // Already polling
        }

        this.pollingInterval = setInterval(async () => {
            try {
                await this.loadIncrementalUpdates();
                this.lastSuccessfulPoll = Date.now();
                this.consecutiveFailedPolls = 0;

                // Try to reconnect to platform events periodically
                if (this.shouldAttemptReconnect()) {
                    this._attemptReconnect();
                }
            } catch (error) {
                this.consecutiveFailedPolls++;

                if (
                    this.consecutiveFailedPolls >=
                    BoardDataLoader.MAX_FAILED_POLLS
                ) {
                    this.stopPolling();
                }
            }
        }, POLLING_FREQUENCY);

        // Execute immediately
        this.loadIncrementalUpdates();
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.consecutiveFailedPolls = 0;
        }
    }

    /**
     * Check if enough time has passed to attempt reconnection
     */
    shouldAttemptReconnect() {
        if (!this.lastSuccessfulPoll) {
            return false;
        }

        const timeSinceLastPoll = Date.now() - this.lastSuccessfulPoll;
        return timeSinceLastPoll > RECONNECT_INTERVAL;
    }

    /**
     * Attempt to reconnect to platform events
     */
    _attemptReconnect() {
        if (this.component.subscriptionManager) {
            this.stopPolling();
            this.component.subscriptionManager.subscribe();
        }
    }

    /**
     * Check if currently polling
     */
    isPolling() {
        return this.pollingInterval !== null;
    }
}
