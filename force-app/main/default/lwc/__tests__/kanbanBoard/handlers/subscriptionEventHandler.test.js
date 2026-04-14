/**
 * Unit tests for SubscriptionEventHandler
 */

jest.mock(
    'c/kanbanStore',
    () => ({
        setSubscriptionStatus: jest.fn((status) => ({
            type: 'SET_SUBSCRIPTION_STATUS',
            payload: status
        }))
    }),
    { virtual: true }
);

import SubscriptionEventHandler from '../../../kanbanBoard/handlers/subscriptionEventHandler';
import { setSubscriptionStatus } from 'c/kanbanStore';

function createMockComponent(overrides = {}) {
    return {
        store: { dispatch: jest.fn() },
        eventHandler: {
            handlePlatformEvent: jest.fn(() => false)
        },
        loadBoardData: jest.fn(),
        toastManager: {
            showSuccess: jest.fn(),
            showSubscriptionStatus: jest.fn()
        },
        boardDataLoader: {
            startPolling: jest.fn(),
            stopPolling: jest.fn()
        },
        ...overrides
    };
}

describe('SubscriptionEventHandler', () => {
    let component;
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        component = createMockComponent();
        handler = new SubscriptionEventHandler(component);
    });

    describe('handlePlatformEvent', () => {
        it('delegates to eventHandler and does not refresh when false', () => {
            component.eventHandler.handlePlatformEvent.mockReturnValue(false);

            handler.handlePlatformEvent({ some: 'event' });

            expect(
                component.eventHandler.handlePlatformEvent
            ).toHaveBeenCalledWith({ some: 'event' }, component.store);
            expect(component.loadBoardData).not.toHaveBeenCalled();
        });

        it('triggers board refresh when eventHandler returns true', () => {
            component.eventHandler.handlePlatformEvent.mockReturnValue(true);

            handler.handlePlatformEvent({ some: 'event' });

            expect(component.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('handleSubscriptionMessage', () => {
        it('delegates to handlePlatformEvent', () => {
            const spy = jest.spyOn(handler, 'handlePlatformEvent');

            handler.handleSubscriptionMessage({ payload: 'data' });

            expect(spy).toHaveBeenCalledWith({ payload: 'data' });
        });
    });

    describe('handleSubscriptionStatusMessage', () => {
        it('shows success toast for success variant', () => {
            handler.handleSubscriptionStatusMessage(
                'success',
                'Connected',
                ''
            );

            expect(component.toastManager.showSuccess).toHaveBeenCalledWith(
                'Connected',
                'dismissible'
            );
        });

        it('shows subscription status for other variants', () => {
            handler.handleSubscriptionStatusMessage(
                'warning',
                'Reconnecting',
                'Trying again...'
            );

            expect(
                component.toastManager.showSubscriptionStatus
            ).toHaveBeenCalledWith('Reconnecting', 'Trying again...', 'warning');
        });

        it('does nothing when toastManager is null', () => {
            component.toastManager = null;
            handler = new SubscriptionEventHandler(component);

            // Should not throw
            handler.handleSubscriptionStatusMessage('success', 'OK', '');
        });
    });

    describe('handlePollingRequired', () => {
        it('starts polling via boardDataLoader', () => {
            handler.handlePollingRequired();

            expect(component.boardDataLoader.startPolling).toHaveBeenCalled();
        });

        it('does nothing when boardDataLoader is null', () => {
            component.boardDataLoader = null;
            handler = new SubscriptionEventHandler(component);

            // Should not throw
            handler.handlePollingRequired();
        });
    });

    describe('handleSubscriptionStatusChange', () => {
        it('dispatches subscription status to store', () => {
            handler.handleSubscriptionStatusChange('connected');

            expect(component.store.dispatch).toHaveBeenCalledWith(
                setSubscriptionStatus('connected')
            );
        });

        it('stops polling when reconnected', () => {
            handler.handleSubscriptionStatusChange('connected');

            expect(component.boardDataLoader.stopPolling).toHaveBeenCalled();
        });

        it('does not stop polling for non-connected status', () => {
            handler.handleSubscriptionStatusChange('connecting');

            expect(component.boardDataLoader.stopPolling).not.toHaveBeenCalled();
        });
    });

    describe('handleEventActivity', () => {
        it('is a no-op (silent updates)', () => {
            // Just verify it exists and doesn't throw
            handler.handleEventActivity('some message');
        });
    });
});
