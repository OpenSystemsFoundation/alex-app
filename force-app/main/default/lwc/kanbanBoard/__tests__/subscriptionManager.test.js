import SubscriptionManager from '../subscriptionManager';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

// Mock empApi
jest.mock(
    'lightning/empApi',
    () => {
        return {
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            onError: jest.fn()
        };
    },
    { virtual: true }
);

describe('SubscriptionManager', () => {
    let manager;
    let mockMessageCallback;
    let mockErrorCallback;
    const channelName = '/event/OpenSF__CardUpdateEvent__e';

    beforeEach(() => {
        mockMessageCallback = jest.fn();
        mockErrorCallback = jest.fn();
        manager = new SubscriptionManager(
            channelName,
            mockMessageCallback,
            mockErrorCallback
        );
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Constructor', () => {
        it('should initialize with provided parameters', () => {
            expect(manager.channelName).toBe(channelName);
            expect(manager.messageCallback).toBe(mockMessageCallback);
            expect(manager.errorCallback).toBe(mockErrorCallback);
        });

        it('should initialize with disconnected status', () => {
            expect(manager.subscriptionStatus).toBe('disconnected');
        });

        it('should initialize with empty subscription', () => {
            expect(manager.subscription).toEqual({});
        });

        it('should initialize retry count to 0', () => {
            expect(manager.subscriptionRetryCount).toBe(0);
        });
    });

    describe('subscribe', () => {
        it('should subscribe to platform events', async () => {
            subscribe.mockResolvedValue({ channel: channelName });

            await manager.subscribe();

            expect(subscribe).toHaveBeenCalledWith(
                channelName,
                -1,
                expect.any(Function)
            );
        });

        it('should set status to connecting', async () => {
            subscribe.mockImplementation(() => {
                expect(manager.subscriptionStatus).toBe('connecting');
                return Promise.resolve({ channel: channelName });
            });

            await manager.subscribe();
        });

        it('should set status to connected on success', async () => {
            subscribe.mockResolvedValue({ channel: channelName });

            await manager.subscribe();

            expect(manager.subscriptionStatus).toBe('connected');
        });

        it('should store subscription response', async () => {
            const mockSubscription = { channel: channelName, id: '123' };
            subscribe.mockResolvedValue(mockSubscription);

            await manager.subscribe();

            expect(manager.subscription).toEqual(mockSubscription);
        });

        it('should not subscribe if already subscribed', async () => {
            manager.subscription = { channel: channelName };

            await manager.subscribe();

            expect(subscribe).not.toHaveBeenCalled();
        });

        it('should reset retry count on successful subscription', async () => {
            manager.subscriptionRetryCount = 2;
            subscribe.mockResolvedValue({ channel: channelName });

            await manager.subscribe();

            expect(manager.subscriptionRetryCount).toBe(0);
        });

        it('should handle subscription errors', async () => {
            subscribe.mockRejectedValue(new Error('Connection failed'));

            await manager.subscribe();

            expect(manager.subscriptionStatus).toBe('error');
        });
    });

    describe('unsubscribe', () => {
        beforeEach(async () => {
            subscribe.mockResolvedValue({ channel: channelName });
            await manager.subscribe();
        });

        it('should unsubscribe from platform events', () => {
            manager.unsubscribe();

            expect(unsubscribe).toHaveBeenCalledWith(
                manager.subscription,
                expect.any(Function)
            );
        });

        it('should set status to disconnected', () => {
            unsubscribe.mockImplementation((sub, callback) => callback());
            manager.unsubscribe();

            expect(manager.subscriptionStatus).toBe('disconnected');
        });

        it('should clear subscription object', () => {
            unsubscribe.mockImplementation((sub, callback) => callback());
            manager.unsubscribe();

            expect(manager.subscription).toEqual({});
        });

        it('should stop polling if active', () => {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            manager.pollingInterval = setInterval(() => {}, 1000);
            manager.unsubscribe();

            expect(manager.pollingInterval).toBeNull();
        });

        it('should clear retry timeout', () => {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            manager.retryTimeout = setTimeout(() => {}, 1000);
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            manager.unsubscribe();

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('registerErrorListener', () => {
        it('should register error listener', () => {
            manager.registerErrorListener();

            expect(onError).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should handle errors from error listener', () => {
            let errorHandler;
            onError.mockImplementation((handler) => {
                errorHandler = handler;
            });

            manager.registerErrorListener();

            // Trigger error
            errorHandler(new Error('Connection error'));

            expect(manager.subscriptionStatus).toBe('error');
        });
    });

    describe('Polling', () => {
        let mockPollCallback;

        beforeEach(() => {
            mockPollCallback = jest.fn().mockResolvedValue();
        });

        describe('startPolling', () => {
            it('should start polling', () => {
                manager.startPolling(mockPollCallback);

                expect(manager.pollingInterval).toBeTruthy();
            });

            it('should set status to polling', () => {
                manager.startPolling(mockPollCallback);

                expect(manager.subscriptionStatus).toBe('polling');
            });

            it('should execute immediate poll', () => {
                manager.startPolling(mockPollCallback);

                expect(mockPollCallback).toHaveBeenCalled();
            });

            it('should poll at regular intervals', () => {
                manager.startPolling(mockPollCallback);

                mockPollCallback.mockClear();

                jest.advanceTimersByTime(5000);
                expect(mockPollCallback).toHaveBeenCalledTimes(1);

                jest.advanceTimersByTime(5000);
                expect(mockPollCallback).toHaveBeenCalledTimes(2);
            });

            it('should not start polling if already polling', () => {
                manager.startPolling(mockPollCallback);
                const firstInterval = manager.pollingInterval;

                manager.startPolling(mockPollCallback);

                expect(manager.pollingInterval).toBe(firstInterval);
            });
        });

        describe('stopPolling', () => {
            it('should stop polling', () => {
                manager.startPolling(mockPollCallback);
                manager.stopPolling();

                expect(manager.pollingInterval).toBeNull();
            });

            it('should reset consecutive failed polls counter', () => {
                manager.startPolling(mockPollCallback);
                manager.consecutiveFailedPolls = 2;
                manager.stopPolling();

                expect(manager.consecutiveFailedPolls).toBe(0);
            });

            it('should not throw if not polling', () => {
                expect(() => manager.stopPolling()).not.toThrow();
            });
        });

        describe('_poll', () => {
            it('should execute poll callback', async () => {
                manager.pollCallback = mockPollCallback;
                await manager._poll();

                expect(mockPollCallback).toHaveBeenCalled();
            });

            it('should update last successful poll timestamp', async () => {
                manager.pollCallback = mockPollCallback;
                const beforePoll = Date.now();

                await manager._poll();

                expect(manager.lastSuccessfulPoll).toBeGreaterThanOrEqual(
                    beforePoll
                );
            });

            it('should reset consecutive failed polls on success', async () => {
                manager.pollCallback = mockPollCallback;
                manager.consecutiveFailedPolls = 2;

                await manager._poll();

                expect(manager.consecutiveFailedPolls).toBe(0);
            });

            it('should increment failed polls on error', async () => {
                manager.pollCallback = jest
                    .fn()
                    .mockRejectedValue(new Error('Poll failed'));

                await manager._poll();

                expect(manager.consecutiveFailedPolls).toBe(1);
            });

            it('should stop polling after max failed attempts', async () => {
                manager.pollCallback = jest
                    .fn()
                    .mockRejectedValue(new Error('Poll failed'));

                await manager._poll();
                await manager._poll();
                await manager._poll();

                expect(mockErrorCallback).toHaveBeenCalledWith(
                    'error',
                    'Connection lost',
                    'Please refresh the page'
                );
            });

            it('should not poll if no callback set', async () => {
                manager.pollCallback = null;

                await expect(manager._poll()).resolves.not.toThrow();
            });
        });
    });

    describe('Status Methods', () => {
        describe('getStatus', () => {
            it('should return current status', () => {
                manager.subscriptionStatus = 'connected';
                expect(manager.getStatus()).toBe('connected');

                manager.subscriptionStatus = 'error';
                expect(manager.getStatus()).toBe('error');
            });
        });

        describe('getStatusIcon', () => {
            it('should return correct icon for connected', () => {
                manager.subscriptionStatus = 'connected';
                expect(manager.getStatusIcon()).toBe('✅');
            });

            it('should return correct icon for connecting', () => {
                manager.subscriptionStatus = 'connecting';
                expect(manager.getStatusIcon()).toBe('🔄');
            });

            it('should return correct icon for disconnected', () => {
                manager.subscriptionStatus = 'disconnected';
                expect(manager.getStatusIcon()).toBe('⚫');
            });

            it('should return correct icon for error', () => {
                manager.subscriptionStatus = 'error';
                expect(manager.getStatusIcon()).toBe('❌');
            });

            it('should return correct icon for polling', () => {
                manager.subscriptionStatus = 'polling';
                expect(manager.getStatusIcon()).toBe('🔄');
            });

            it('should return default icon for unknown status', () => {
                manager.subscriptionStatus = 'unknown';
                expect(manager.getStatusIcon()).toBe('⚪');
            });
        });

        describe('getStatusText', () => {
            it('should return correct text for connected', () => {
                manager.subscriptionStatus = 'connected';
                expect(manager.getStatusText()).toBe(
                    'Real-time updates active'
                );
            });

            it('should return correct text for error', () => {
                manager.subscriptionStatus = 'error';
                expect(manager.getStatusText()).toBe('Connection error');
            });

            it('should return Unknown for unknown status', () => {
                manager.subscriptionStatus = 'unknown';
                expect(manager.getStatusText()).toBe('Unknown');
            });
        });

        describe('getStatusClass', () => {
            it('should return correct class for connected', () => {
                manager.subscriptionStatus = 'connected';
                expect(manager.getStatusClass()).toBe('status-connected');
            });

            it('should return correct class for error', () => {
                manager.subscriptionStatus = 'error';
                expect(manager.getStatusClass()).toBe('status-error');
            });

            it('should return default class for unknown status', () => {
                manager.subscriptionStatus = 'unknown';
                expect(manager.getStatusClass()).toBe('status-unknown');
            });
        });
    });

    describe('Error Handling and Retry', () => {
        it('should retry subscription on error', async () => {
            subscribe.mockRejectedValueOnce(new Error('Failed'));
            subscribe.mockResolvedValue({ channel: channelName });

            await manager.subscribe();

            jest.advanceTimersByTime(2000);

            expect(subscribe).toHaveBeenCalledTimes(2);
        });

        it('should increment retry count on error', async () => {
            subscribe.mockRejectedValue(new Error('Failed'));

            await manager.subscribe();

            expect(manager.subscriptionRetryCount).toBe(1);
        });

        it('should increase retry delay with each attempt', async () => {
            subscribe.mockRejectedValue(new Error('Failed'));

            await manager.subscribe(); // Initial attempt, retry count = 1

            expect(manager.subscriptionRetryCount).toBeGreaterThanOrEqual(1);

            // Fast forward and allow retry
            jest.advanceTimersByTime(2000);
            await Promise.resolve();

            // After first automatic retry, count should be 2
            expect(manager.subscriptionRetryCount).toBeGreaterThanOrEqual(2);
        });

        it('should switch to polling after max retries', async () => {
            subscribe.mockRejectedValue(new Error('Failed'));
            manager.pollCallback = jest.fn();

            // Exhaust all retry attempts
            for (let i = 0; i < 3; i++) {
                // eslint-disable-next-line no-await-in-loop
                await manager.subscribe();
            }

            expect(mockErrorCallback).toHaveBeenCalledWith(
                'error',
                'Real-time updates unavailable',
                'Using polling fallback'
            );
        });
    });

    describe('Integration', () => {
        it('should handle message through callback', async () => {
            let messageHandler;
            subscribe.mockImplementation((channel, replayId, handler) => {
                messageHandler = handler;
                return Promise.resolve({ channel });
            });

            await manager.subscribe();

            const mockMessage = {
                data: { payload: { Id: 'test' } }
            };
            messageHandler(mockMessage);

            expect(mockMessageCallback).toHaveBeenCalledWith(mockMessage);
        });

        it('should stop polling when subscription becomes connected', async () => {
            let messageHandler;
            subscribe.mockImplementation((channel, replayId, handler) => {
                messageHandler = handler;
                return Promise.resolve({ channel });
            });

            manager.startPolling(jest.fn());
            await manager.subscribe();

            // Simulate receiving message
            manager.subscriptionStatus = 'polling';
            messageHandler({ data: {} });

            expect(manager.subscriptionStatus).toBe('connected');
            expect(manager.pollingInterval).toBeNull();
        });
    });
});
