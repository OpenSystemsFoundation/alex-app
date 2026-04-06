/**
 * Store Subscription Mixin
 *
 * Eliminates repeated store subscribe/unsubscribe boilerplate across
 * components that consume the kanban store.
 *
 * Usage:
 *   import { applyStoreSubscription } from 'c/storeSubscriptionMixin';
 *
 *   // In connectedCallback:
 *   applyStoreSubscription(this, this.store);
 *
 *   // In disconnectedCallback:
 *   this._storeUnsubscribe?.();
 *
 *   // State is available as this._storeState
 */

/**
 * Subscribe a component to a store and sync state.
 * Sets `component._storeState` to the current state and subscribes to updates.
 * Stores the unsubscribe function on `component._storeUnsubscribe`.
 *
 * @param {LightningElement} component - The LWC component instance
 * @param {Object} store - The kanban store with subscribe() and getState()
 * @param {Function} [onStateChange] - Optional callback on each state change
 */
export function applyStoreSubscription(component, store, onStateChange) {
    if (!store) return;

    component._storeUnsubscribe = store.subscribe((state) => {
        component._storeState = state;
        if (onStateChange) {
            onStateChange(state);
        }
    });
    component._storeState = store.getState();
}

/**
 * Unsubscribe a component from the store.
 * Safe to call even if not subscribed.
 *
 * @param {LightningElement} component - The LWC component instance
 */
export function removeStoreSubscription(component) {
    if (component._storeUnsubscribe) {
        component._storeUnsubscribe();
        component._storeUnsubscribe = null;
    }
}
