/**
 * Unit tests for LifecycleManager
 */

import LifecycleManager from '../../managers/lifecycleManager';

function createMockComponent(overrides = {}) {
    return {
        _recordId: 'board-1',
        _lastSyncTime: null,
        _subscriptionStatus: 'disconnected',
        windowFocusListener: null,
        _storeUnsubscribe: null,
        loadBoardData: jest.fn(),
        subscriptionManager: {
            resubscribe: jest.fn()
        },
        toastManager: null,
        navigationUtil: null,
        operationQueue: { clear: jest.fn() },
        requestTracker: { destroy: jest.fn() },
        boardDataLoader: {
            loadIncrementalUpdates: jest.fn(),
            stopPolling: jest.fn()
        },
        template: {
            querySelector: jest.fn(() => null)
        },
        ...overrides
    };
}

describe('LifecycleManager', () => {
    let component;
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
        component = createMockComponent();
        manager = new LifecycleManager(component);
    });

    afterEach(() => {
        // Clean up window listeners
        if (component.windowFocusListener) {
            window.removeEventListener('focus', component.windowFocusListener);
        }
    });

    describe('initialize', () => {
        it('installs window focus listener', () => {
            const spy = jest.spyOn(window, 'addEventListener');

            manager.initialize();

            expect(spy).toHaveBeenCalledWith('focus', expect.any(Function));
            expect(component.windowFocusListener).not.toBeNull();

            spy.mockRestore();
        });

        it('loads board data when recordId is set', () => {
            manager.initialize();

            expect(component.loadBoardData).toHaveBeenCalled();
        });

        it('does not load board data when recordId is null', () => {
            component._recordId = null;
            manager = new LifecycleManager(component);

            manager.initialize();

            expect(component.loadBoardData).not.toHaveBeenCalled();
        });
    });

    describe('initializeChildComponents', () => {
        it('queries for child components from template', () => {
            const mockSub = { subscribe: jest.fn() };
            const mockToast = { showSuccess: jest.fn() };
            const mockNav = { navigate: jest.fn() };

            component.subscriptionManager = null;
            component.toastManager = null;
            component.navigationUtil = null;

            const template = {
                querySelector: jest.fn((selector) => {
                    if (selector === 'c-subscription-manager') return mockSub;
                    if (selector === 'c-toast-manager') return mockToast;
                    if (selector === 'c-navigation-util') return mockNav;
                    return null;
                })
            };

            manager.initializeChildComponents(template);

            expect(component.subscriptionManager).toBe(mockSub);
            expect(component.toastManager).toBe(mockToast);
            expect(component.navigationUtil).toBe(mockNav);
        });

        it('does not override existing child references', () => {
            const existingSub = { existing: true };
            component.subscriptionManager = existingSub;

            const template = {
                querySelector: jest.fn(() => ({ new: true }))
            };

            manager.initializeChildComponents(template);

            expect(component.subscriptionManager).toBe(existingSub);
        });
    });

    describe('cleanup', () => {
        it('removes window focus listener', () => {
            const listener = jest.fn();
            component.windowFocusListener = listener;
            const spy = jest.spyOn(window, 'removeEventListener');

            manager.cleanup();

            expect(spy).toHaveBeenCalledWith('focus', listener);
            expect(component.windowFocusListener).toBeNull();

            spy.mockRestore();
        });

        it('clears operation queue', () => {
            manager.cleanup();

            expect(component.operationQueue.clear).toHaveBeenCalled();
        });

        it('destroys request tracker', () => {
            manager.cleanup();

            expect(component.requestTracker.destroy).toHaveBeenCalled();
        });

        it('unsubscribes from store', () => {
            const unsub = jest.fn();
            component._storeUnsubscribe = unsub;

            manager.cleanup();

            expect(unsub).toHaveBeenCalled();
            expect(component._storeUnsubscribe).toBeNull();
        });

        it('handles missing dependencies gracefully', () => {
            component.windowFocusListener = null;
            component.operationQueue = null;
            component.requestTracker = null;
            component._storeUnsubscribe = null;
            manager = new LifecycleManager(component);

            // Should not throw
            expect(() => manager.cleanup()).not.toThrow();
        });
    });

    describe('handleWindowFocus', () => {
        it('loads incremental updates when data is stale', () => {
            // Set last sync to >30s ago
            component._lastSyncTime = new Date(
                Date.now() - 60000
            ).toISOString();

            manager.handleWindowFocus();

            expect(
                component.boardDataLoader.loadIncrementalUpdates
            ).toHaveBeenCalled();
        });

        it('does not load updates when data is fresh', () => {
            component._lastSyncTime = new Date().toISOString();

            manager.handleWindowFocus();

            expect(
                component.boardDataLoader.loadIncrementalUpdates
            ).not.toHaveBeenCalled();
        });

        it('attempts resubscribe when disconnected', () => {
            component._subscriptionStatus = 'disconnected';

            manager.handleWindowFocus();

            expect(
                component.subscriptionManager.resubscribe
            ).toHaveBeenCalled();
            expect(component.boardDataLoader.stopPolling).toHaveBeenCalled();
        });

        it('does not resubscribe when already connected', () => {
            component._subscriptionStatus = 'connected';

            manager.handleWindowFocus();

            expect(
                component.subscriptionManager.resubscribe
            ).not.toHaveBeenCalled();
        });

        it('does not resubscribe when connecting', () => {
            component._subscriptionStatus = 'connecting';

            manager.handleWindowFocus();

            expect(
                component.subscriptionManager.resubscribe
            ).not.toHaveBeenCalled();
        });
    });
});
