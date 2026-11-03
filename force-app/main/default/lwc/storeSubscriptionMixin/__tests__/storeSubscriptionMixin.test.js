import {
    applyStoreSubscription,
    removeStoreSubscription
} from 'c/storeSubscriptionMixin';

function createStore(initialState) {
    let listener = null;
    const unsubscribe = jest.fn();
    return {
        getState: jest.fn(() => initialState),
        subscribe: jest.fn((fn) => {
            listener = fn;
            return unsubscribe;
        }),
        emit(state) {
            listener(state);
        },
        unsubscribe
    };
}

describe('c/storeSubscriptionMixin', () => {
    it('does nothing when no store is provided', () => {
        const component = {};
        applyStoreSubscription(component, null);
        expect(component).toEqual({});
    });

    it('seeds state and keeps it in sync with store updates', () => {
        const store = createStore({ count: 1 });
        const component = {};

        applyStoreSubscription(component, store);

        expect(store.subscribe).toHaveBeenCalledTimes(1);
        expect(component._storeState).toEqual({ count: 1 });
        expect(component._storeUnsubscribe).toBe(store.unsubscribe);

        store.emit({ count: 2 });
        expect(component._storeState).toEqual({ count: 2 });
    });

    it('invokes the optional onStateChange callback', () => {
        const store = createStore({ a: 1 });
        const component = {};
        const onChange = jest.fn();

        applyStoreSubscription(component, store, onChange);
        store.emit({ a: 2 });

        expect(onChange).toHaveBeenCalledWith({ a: 2 });
        expect(component._storeState).toEqual({ a: 2 });
    });

    it('removeStoreSubscription unsubscribes and clears the handle', () => {
        const store = createStore({});
        const component = {};
        applyStoreSubscription(component, store);

        removeStoreSubscription(component);

        expect(store.unsubscribe).toHaveBeenCalledTimes(1);
        expect(component._storeUnsubscribe).toBeNull();

        // Safe to call again
        removeStoreSubscription(component);
        expect(store.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('removeStoreSubscription is safe on an unsubscribed component', () => {
        const component = {};
        expect(() => removeStoreSubscription(component)).not.toThrow();
        expect(component._storeUnsubscribe).toBeUndefined();
    });
});
