/**
 * Handles subscription-related events and messaging
 */
export default class SubscriptionEventHandler {
    constructor(component) {
        this.component = component;
    }

    /**
     * Handle platform event
     */
    handlePlatformEvent(event) {
        const needsRefresh = this.component.eventHandler.handlePlatformEvent(
            event,
            this.component.store
        );

        if (needsRefresh) {
            this.component.loadBoardData();
        }
    }

    /**
     * Handle event activity notification
     */
    handleEventActivity(message) {
        // Toast notification removed - silent update
    }

    /**
     * Handle subscription message from subscription manager
     */
    handleSubscriptionMessage(payload) {
        this.handlePlatformEvent(payload);
    }

    /**
     * Handle subscription status message
     */
    handleSubscriptionStatusMessage(variant, title, message) {
        if (!this.component.toastManager) return;

        if (variant === 'success') {
            this.component.toastManager.showSuccess(title, 'dismissible');
        } else {
            this.component.toastManager.showSubscriptionStatus(
                title,
                message,
                variant
            );
        }
    }

    /**
     * Handle polling required event
     * This is the only place we need to call a method on the subscription manager
     * because we need to pass a callback function
     */
    handlePollingRequired() {
        if (this.component.subscriptionManager) {
            this.component.subscriptionManager.startPolling(() =>
                this.component.boardDataLoader.loadIncrementalUpdates()
            );
        }
    }

    /**
     * Handle subscription status change
     */
    handleSubscriptionStatusChange(status) {
        this.component._subscriptionStatus = status;
    }
}
