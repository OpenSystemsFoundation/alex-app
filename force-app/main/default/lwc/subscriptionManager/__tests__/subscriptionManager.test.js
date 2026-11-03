import { createElement, api } from 'lwc';
import SubscriptionManager from 'c/subscriptionManager';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

jest.mock('lightning/empApi', () => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    onError: jest.fn(),
    setDebugFlag: jest.fn(),
    isEmpEnabled: jest.fn()
}));

const CHANNEL = '/event/OpenSF__CardUpdateEvent__e';
const HEALTH_INTERVAL = 30000;

// Test-only subclass to reach internal state that the public API cannot.
class SubscriptionManagerProbe extends SubscriptionManager {
    @api
    forceStatus(status) {
        this.subscriptionStatus = status;
    }

    @api
    emitStatusMessage(variant, title, message) {
        this._dispatchStatusMessage(variant, title, message);
    }
}

async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

function createManager({ props = {}, append = true, is } = {}) {
    const element = createElement('c-subscription-manager', {
        is: is || SubscriptionManager
    });
    const events = { statuschange: [], message: [], pollingrequired: [] };
    Object.keys(events).forEach((name) => {
        element.addEventListener(name, (evt) => events[name].push(evt.detail));
    });
    Object.assign(element, props);
    if (append) {
        document.body.appendChild(element);
    }
    return { element, events };
}

function statuses(events) {
    return events.statuschange.map((detail) => detail.status);
}

function lastEventCallback() {
    const calls = subscribe.mock.calls;
    return calls[calls.length - 1][2];
}

describe('c-subscription-manager', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        subscribe.mockResolvedValue({ channel: CHANNEL, id: 'sub-1' });
        unsubscribe.mockImplementation(() => Promise.resolve(true));
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('lifecycle', () => {
        it('registers an error listener and dispatches initial status on connect', () => {
            const { element, events } = createManager();

            expect(onError).toHaveBeenCalledTimes(1);
            expect(statuses(events)).toEqual(['disconnected']);
            expect(element.getStatus()).toBe('disconnected');
            expect(element.isConnected()).toBe(false);
            expect(subscribe).not.toHaveBeenCalled();
        });

        it('exposes the configured properties', () => {
            const { element } = createManager({
                props: { channelName: CHANNEL, boardId: 'b1' }
            });
            expect(element.channelName).toBe(CHANNEL);
            expect(element.boardId).toBe('b1');
            expect(element.autoSubscribe).toBe(false);
        });

        it('unsubscribes when removed from the DOM', async () => {
            const { element } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();

            document.body.removeChild(element);

            expect(unsubscribe).toHaveBeenCalledWith(
                { channel: CHANNEL, id: 'sub-1' },
                expect.any(Function)
            );
            expect(jest.getTimerCount()).toBe(0);
        });
    });

    describe('auto subscribe', () => {
        it('does not subscribe until autoSubscribe, boardId and channelName are all set', async () => {
            const { element } = createManager({
                props: { autoSubscribe: true, boardId: 'b1' }
            });
            await flushPromises();
            expect(subscribe).not.toHaveBeenCalled();

            element.channelName = CHANNEL;
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(1);
            expect(subscribe).toHaveBeenCalledWith(
                CHANNEL,
                -1,
                expect.any(Function)
            );
            expect(element.getStatus()).toBe('connected');
        });

        it('does not auto subscribe again when already connected', async () => {
            const { element } = createManager({
                props: {
                    channelName: CHANNEL,
                    boardId: 'b1',
                    autoSubscribe: true
                }
            });
            await flushPromises();
            expect(subscribe).toHaveBeenCalledTimes(1);

            element.boardId = 'b2';
            await flushPromises();
            expect(subscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('subscribe', () => {
        it('transitions connecting -> connected and starts health monitoring', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });

            await element.subscribe();

            expect(statuses(events)).toEqual([
                'disconnected',
                'connecting',
                'connected'
            ]);
            expect(element.isConnected()).toBe(true);
            // Health-check interval is running
            expect(jest.getTimerCount()).toBe(1);
        });

        it('is a no-op while a subscription is active', async () => {
            const { element } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            await element.subscribe();

            expect(subscribe).toHaveBeenCalledTimes(1);
        });

        it('handles an empty subscribe response', async () => {
            subscribe.mockResolvedValue(undefined);
            const { element } = createManager({
                props: { channelName: CHANNEL }
            });

            await element.subscribe();
            expect(element.getStatus()).toBe('connected');

            // No channel recorded, so a second call subscribes again
            await element.subscribe();
            expect(subscribe).toHaveBeenCalledTimes(2);

            // ...and unsubscribe has nothing to release
            element.unsubscribe();
            expect(unsubscribe).not.toHaveBeenCalled();
        });

        it('does not re-dispatch connected when an event arrives before subscribe resolves', async () => {
            subscribe.mockImplementation((channel, replayId, callback) => {
                callback({ data: { payload: { early: true } } });
                return Promise.resolve({ channel });
            });
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });

            await element.subscribe();

            expect(statuses(events)).toEqual([
                'disconnected',
                'connecting',
                'connected'
            ]);
            expect(events.message).toEqual([{ payload: { early: true } }]);
        });
    });

    describe('incoming events', () => {
        it('re-dispatches platform event payloads as message events', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();

            const callback = lastEventCallback();
            callback({ data: { payload: { OpenSF__CardId__c: 'c1' } } });
            callback({ data: { payload: { OpenSF__CardId__c: 'c2' } } });

            expect(events.message).toEqual([
                { payload: { OpenSF__CardId__c: 'c1' } },
                { payload: { OpenSF__CardId__c: 'c2' } }
            ]);
            // Already connected: no duplicate status events
            expect(statuses(events)).toEqual([
                'disconnected',
                'connecting',
                'connected'
            ]);
        });

        it('keeps the connection healthy while events keep flowing', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            const callback = lastEventCallback();

            for (let i = 0; i < 4; i++) {
                jest.advanceTimersByTime(HEALTH_INTERVAL - 1000);
                callback({ data: { payload: { i } } });
                jest.advanceTimersByTime(1000);
            }

            expect(events.pollingrequired).toEqual([]);
            expect(element.getStatus()).toBe('connected');
        });
    });

    describe('health monitoring fallback', () => {
        it('switches to polling after repeated failed health checks', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();

            jest.advanceTimersByTime(HEALTH_INTERVAL);
            expect(events.pollingrequired).toEqual([]);

            jest.advanceTimersByTime(HEALTH_INTERVAL);

            expect(events.pollingrequired).toEqual([
                { reason: 'health_check_failed' }
            ]);
            expect(element.getStatus()).toBe('polling');
            // Monitoring stopped once in polling mode
            expect(jest.getTimerCount()).toBe(0);
        });

        it('returns to connected when an event arrives during polling', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            jest.advanceTimersByTime(HEALTH_INTERVAL * 2);
            expect(element.getStatus()).toBe('polling');

            lastEventCallback()({ data: { payload: { late: true } } });

            expect(element.getStatus()).toBe('connected');
            expect(statuses(events).slice(-2)).toEqual([
                'polling',
                'connected'
            ]);
            expect(events.message).toEqual([{ payload: { late: true } }]);
        });
    });

    describe('retry on subscribe failure', () => {
        it('retries with backoff and recovers on success', async () => {
            const error = new Error('handshake failed');
            subscribe
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ channel: CHANNEL });
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });

            await element.subscribe();
            expect(element.getStatus()).toBe('error');
            expect(subscribe).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1999);
            expect(subscribe).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(1);
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(2);
            expect(element.getStatus()).toBe('connected');
            expect(statuses(events)).toEqual([
                'disconnected',
                'connecting',
                'error',
                'connecting',
                'connected'
            ]);
            expect(events.pollingrequired).toEqual([]);
        });

        it('requests polling after the maximum number of attempts', async () => {
            const error = new Error('down');
            subscribe.mockRejectedValue(error);
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });

            await element.subscribe();
            jest.advanceTimersByTime(2000);
            await flushPromises();
            jest.advanceTimersByTime(4000);
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(3);
            expect(events.pollingrequired).toEqual([
                { error, reason: 'subscription_failed' }
            ]);
            expect(element.getStatus()).toBe('error');

            // No further retries are scheduled
            jest.advanceTimersByTime(60000);
            await flushPromises();
            expect(subscribe).toHaveBeenCalledTimes(3);
        });
    });

    describe('empApi error listener', () => {
        it('marks error, unsubscribes and schedules a retry', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            const errorHandler = onError.mock.calls[0][0];

            errorHandler({ error: 'streaming error' });

            expect(element.getStatus()).toBe('error');
            expect(statuses(events)).toContain('error');
            expect(unsubscribe).toHaveBeenCalledWith(
                { channel: CHANNEL, id: 'sub-1' },
                expect.any(Function)
            );
            // Health interval cleared; one retry timeout pending
            expect(jest.getTimerCount()).toBe(1);

            // empApi confirms unsubscribe, then the retry reconnects
            unsubscribe.mock.calls[0][1]();
            expect(element.getStatus()).toBe('disconnected');
            jest.advanceTimersByTime(2000);
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(2);
            expect(element.getStatus()).toBe('connected');
        });
    });

    describe('unsubscribe', () => {
        it('releases the subscription and resets status via the empApi callback', async () => {
            const { element, events } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();

            element.unsubscribe();
            expect(unsubscribe).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);

            unsubscribe.mock.calls[0][1]();
            expect(element.getStatus()).toBe('disconnected');
            expect(statuses(events).slice(-1)).toEqual(['disconnected']);

            // Subscription cleared, so a fresh subscribe goes through
            await element.subscribe();
            expect(subscribe).toHaveBeenCalledTimes(2);
        });

        it('only stops timers when there is no active subscription', () => {
            const { element } = createManager();
            element.unsubscribe();
            expect(unsubscribe).not.toHaveBeenCalled();
            expect(element.getStatus()).toBe('disconnected');
        });
    });

    describe('resubscribe', () => {
        it('unsubscribes first and subscribes again in the callback', async () => {
            const { element } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            subscribe.mockResolvedValueOnce({ channel: CHANNEL, id: 'sub-2' });

            element.resubscribe();
            expect(unsubscribe).toHaveBeenCalledTimes(1);
            expect(subscribe).toHaveBeenCalledTimes(1);

            unsubscribe.mock.calls[0][1]();
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(2);
            expect(element.isConnected()).toBe(true);
        });

        it('subscribes immediately when nothing is active', async () => {
            subscribe.mockRejectedValueOnce(new Error('nope'));
            const { element } = createManager({
                props: { channelName: CHANNEL }
            });
            await element.subscribe();
            expect(element.getStatus()).toBe('error');

            element.resubscribe();
            await flushPromises();

            expect(unsubscribe).not.toHaveBeenCalled();
            expect(subscribe).toHaveBeenCalledTimes(2);
            expect(element.getStatus()).toBe('connected');
            // Pending retry from the first failure was cancelled
            jest.advanceTimersByTime(10000);
            await flushPromises();
            expect(subscribe).toHaveBeenCalledTimes(2);
        });
    });

    describe('status presentation', () => {
        it.each([
            [
                'connected',
                'utility:check',
                'success',
                'Real-time updates active',
                'status-connected'
            ],
            [
                'connecting',
                'utility:sync',
                'warning',
                'Connecting...',
                'status-connecting'
            ],
            [
                'disconnected',
                'utility:offline',
                'inverse',
                'Disconnected',
                'status-disconnected'
            ],
            [
                'error',
                'utility:error',
                'error',
                'Connection error',
                'status-error'
            ],
            [
                'polling',
                'utility:refresh',
                'warning',
                'Polling mode (fallback)',
                'status-polling'
            ],
            [
                'bogus',
                'utility:question',
                'inverse',
                'Unknown',
                'status-unknown'
            ]
        ])(
            '%s maps to %s / %s / %s / %s',
            (status, icon, variant, text, cls) => {
                const { element } = createManager({
                    is: SubscriptionManagerProbe
                });
                element.forceStatus(status);

                expect(element.getStatus()).toBe(status);
                expect(element.getStatusIcon()).toBe(icon);
                expect(element.getStatusVariant()).toBe(variant);
                expect(element.getStatusText()).toBe(text);
                expect(element.getStatusClass()).toBe(cls);
            }
        );
    });

    describe('status messages', () => {
        it('dispatches statusmessage events with variant, title and message', () => {
            const { element } = createManager({
                is: SubscriptionManagerProbe
            });
            const handler = jest.fn();
            element.addEventListener('statusmessage', handler);

            element.emitStatusMessage('warning', 'Live', 'Reconnecting');

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail).toEqual({
                variant: 'warning',
                title: 'Live',
                message: 'Reconnecting'
            });
        });
    });
});
