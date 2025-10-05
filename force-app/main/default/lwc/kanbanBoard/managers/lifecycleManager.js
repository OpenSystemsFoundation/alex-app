/**
 * Manages component lifecycle operations including initialization and cleanup
 */
export default class LifecycleManager {
    constructor(component) {
        this.component = component;
    }

    /**
     * Initialize the component and its dependencies
     */
    initialize() {
        // Set up window focus listener
        this.component.windowFocusListener = () => this.handleWindowFocus();
        window.addEventListener('focus', this.component.windowFocusListener);

        // Load board data if recordId is set
        if (this.component._recordId) {
            this.component.loadBoardData();
        }
    }

    /**
     * Initialize child component references
     * Note: We only need a reference to subscriptionManager for polling callback
     */
    initializeChildComponents(template) {
        if (!this.component.subscriptionManager) {
            this.component.subscriptionManager = template.querySelector(
                'c-subscription-manager'
            );
        }
        if (!this.component.toastManager) {
            this.component.toastManager =
                template.querySelector('c-toast-manager');
        }
        if (!this.component.navigationUtil) {
            this.component.navigationUtil =
                template.querySelector('c-navigation-util');
        }
    }

    /**
     * Clean up resources when component is destroyed
     * Note: subscriptionManager will auto-cleanup in its own disconnectedCallback
     */
    cleanup() {
        // Remove window focus listener
        if (this.component.windowFocusListener) {
            window.removeEventListener(
                'focus',
                this.component.windowFocusListener
            );
            this.component.windowFocusListener = null;
        }

        // Clear operation queue
        if (this.component.operationQueue) {
            this.component.operationQueue.clear();
        }

        // Destroy request tracker
        if (this.component.requestTracker) {
            this.component.requestTracker.destroy();
        }

        // Unsubscribe from store
        if (this.component._storeUnsubscribe) {
            this.component._storeUnsubscribe();
            this.component._storeUnsubscribe = null;
        }
    }

    /**
     * Handle window focus event
     * Note: Subscription will auto-reconnect via shouldAutoSubscribe property changes
     */
    handleWindowFocus() {
        // Force re-render to trigger subscription check
        if (this.component.board) {
            this.component.isLoading = false; // Trigger reactivity
        }
    }
}
