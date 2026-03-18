import { createElement } from 'lwc';
import SubscriptionManager from 'c/subscriptionManager';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

// Mock the empApi
jest.mock('lightning/empApi', () => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    onError: jest.fn()
}));

describe('c-subscription-manager', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('should subscribe to platform event channel', async () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        element.channelName = '/event/TestEvent__e';

        const mockSubscription = { channel: '/event/TestEvent__e' };
        subscribe.mockResolvedValue(mockSubscription);

        document.body.appendChild(element);

        await element.subscribe();

        expect(subscribe).toHaveBeenCalledWith(
            '/event/TestEvent__e',
            -1,
            expect.any(Function)
        );
    });

    it('should dispatch message event when platform event is received', async () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        element.channelName = '/event/TestEvent__e';

        const mockPayload = { Id: '123', Name: 'Test' };
        let messageCallback;

        subscribe.mockImplementation((channel, replay, callback) => {
            messageCallback = callback;
            return Promise.resolve({ channel });
        });

        const messageHandler = jest.fn();
        element.addEventListener('message', messageHandler);

        document.body.appendChild(element);

        await element.subscribe();

        // Simulate platform event
        messageCallback({ data: { payload: mockPayload } });

        expect(messageHandler).toHaveBeenCalled();
        expect(messageHandler.mock.calls[0][0].detail.payload).toEqual(
            mockPayload
        );
    });

    it('should unsubscribe when disconnected', async () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        element.channelName = '/event/TestEvent__e';

        const mockSubscription = { channel: '/event/TestEvent__e' };
        subscribe.mockResolvedValue(mockSubscription);

        document.body.appendChild(element);

        // First subscribe to set up the subscription
        await element.subscribe();

        // Then unsubscribe
        element.unsubscribe();

        expect(unsubscribe).toHaveBeenCalledWith(
            mockSubscription,
            expect.any(Function)
        );
    });

    it('should emit status change events', async () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        element.channelName = '/event/TestEvent__e';

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        subscribe.mockResolvedValue({ channel: '/event/TestEvent__e' });

        document.body.appendChild(element);

        await element.subscribe();

        expect(statusHandler).toHaveBeenCalled();
    });

    it('should return correct status icon', () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });

        document.body.appendChild(element);

        expect(element.getStatusIcon()).toBe('utility:offline'); // disconnected
    });

    it('should register error listener on connect', () => {
        const element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });

        document.body.appendChild(element);

        expect(onError).toHaveBeenCalled();
    });
});
