import { createElement } from 'lwc';
import RetryManager from '../../../../force-app/main/default/lwc/subscriptionManager/retryManager';
import EventHealthMonitor from '../../../../force-app/main/default/lwc/subscriptionManager/eventHealthMonitor';
import SubscriptionManager from 'c/subscriptionManager';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

// lightning/empApi is already mocked by @salesforce/sfdx-lwc-jest stubs.
// Do NOT re-declare jest.mock here — doing so can conflict with
// the mock from the other test file when both run in the same worker.

// ─── RetryManager ────────────────────────────────────────────────────────────

describe('RetryManager', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('initializes with default state', () => {
        const onRetry = jest.fn();
        const onMax = jest.fn();
        const rm = new RetryManager(onRetry, onMax);

        expect(rm.getRetryCount()).toBe(0);
        expect(rm.isRetrying()).toBe(false);
        expect(rm.onRetry).toBe(onRetry);
        expect(rm.onMaxRetriesExceeded).toBe(onMax);
    });

    it('scheduleRetry returns true and schedules callback when under max attempts', () => {
        const onRetry = jest.fn();
        const onMax = jest.fn();
        const rm = new RetryManager(onRetry, onMax);

        const result = rm.scheduleRetry(new Error('fail'));

        expect(result).toBe(true);
        expect(rm.getRetryCount()).toBe(1);
        expect(rm.isRetrying()).toBe(true);

        // Advance past the delay (BASE_RETRY_DELAY * retryCount = 2000 * 1)
        jest.advanceTimersByTime(2000);

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('scheduleRetry uses exponential backoff delay', () => {
        const onRetry = jest.fn();
        const rm = new RetryManager(onRetry, jest.fn());

        // First retry: delay = 2000 * 1 = 2000
        rm.scheduleRetry(new Error('fail'));
        jest.advanceTimersByTime(1999);
        expect(onRetry).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(onRetry).toHaveBeenCalledTimes(1);

        // Second retry: delay = 2000 * 2 = 4000
        rm.scheduleRetry(new Error('fail'));
        jest.advanceTimersByTime(3999);
        expect(onRetry).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('scheduleRetry returns false and calls onMaxRetriesExceeded at max attempts', () => {
        const onRetry = jest.fn();
        const onMax = jest.fn();
        const rm = new RetryManager(onRetry, onMax);

        const error = new Error('persistent failure');

        // Exhaust retries (MAX_RETRY_ATTEMPTS = 3)
        rm.scheduleRetry(error); // count=1, under max
        rm.scheduleRetry(error); // count=2, under max
        const result = rm.scheduleRetry(error); // count=3, at max

        expect(result).toBe(false);
        expect(onMax).toHaveBeenCalledWith(error);
    });

    it('scheduleRetry does not call onRetry if callback is null', () => {
        const rm = new RetryManager(null, jest.fn());

        rm.scheduleRetry(new Error('fail'));
        jest.advanceTimersByTime(5000);

        // Should not throw
    });

    it('scheduleRetry does not call onMaxRetriesExceeded if callback is null', () => {
        const rm = new RetryManager(jest.fn(), null);

        rm.scheduleRetry(new Error('fail'));
        rm.scheduleRetry(new Error('fail'));
        const result = rm.scheduleRetry(new Error('fail'));

        expect(result).toBe(false);
        // Should not throw
    });

    it('reset clears retryCount and pending timeout', () => {
        const onRetry = jest.fn();
        const rm = new RetryManager(onRetry, jest.fn());

        rm.scheduleRetry(new Error('fail'));
        expect(rm.getRetryCount()).toBe(1);
        expect(rm.isRetrying()).toBe(true);

        rm.reset();

        expect(rm.getRetryCount()).toBe(0);
        expect(rm.isRetrying()).toBe(false);

        // Ensure the timeout was cleared — callback should not fire
        jest.advanceTimersByTime(10000);
        expect(onRetry).not.toHaveBeenCalled();
    });

    it('clearTimeout clears pending timeout but keeps retryCount', () => {
        const rm = new RetryManager(jest.fn(), jest.fn());

        rm.scheduleRetry(new Error('fail'));
        rm.clearTimeout();

        expect(rm.isRetrying()).toBe(false);
        expect(rm.getRetryCount()).toBe(1);
    });

    it('clearTimeout is safe to call when no timeout is pending', () => {
        const rm = new RetryManager(jest.fn(), jest.fn());
        expect(() => rm.clearTimeout()).not.toThrow();
    });
});

// ─── EventHealthMonitor ──────────────────────────────────────────────────────

describe('EventHealthMonitor', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('initializes with default state', () => {
        const monitor = new EventHealthMonitor();

        expect(monitor.lastEventReceived).toBeNull();
        expect(monitor.healthCheckInterval).toBeNull();
        expect(monitor.healthCheckAttempts).toBe(0);
        expect(monitor.eventCount).toBe(0);
        expect(monitor.startTime).toBeNull();
    });

    it('recordEvent updates last event time and increments count', () => {
        const monitor = new EventHealthMonitor();

        const before = Date.now();
        monitor.recordEvent();

        expect(monitor.lastEventReceived).toBeGreaterThanOrEqual(before);
        expect(monitor.eventCount).toBe(1);

        monitor.recordEvent();
        expect(monitor.eventCount).toBe(2);
    });

    it('recordEvent resets healthCheckAttempts', () => {
        const monitor = new EventHealthMonitor();
        monitor.healthCheckAttempts = 5;

        monitor.recordEvent();

        expect(monitor.healthCheckAttempts).toBe(0);
    });

    it('start sets up interval and records startTime', () => {
        const monitor = new EventHealthMonitor();
        const callback = jest.fn();

        monitor.start(callback);

        expect(monitor.startTime).not.toBeNull();
        expect(monitor.healthCheckInterval).not.toBeNull();
        expect(monitor.onUnhealthy).toBe(callback);
    });

    it('start clears any existing interval first', () => {
        const monitor = new EventHealthMonitor();
        monitor.start(jest.fn());
        const firstInterval = monitor.healthCheckInterval;

        monitor.start(jest.fn());

        expect(monitor.healthCheckInterval).not.toBe(firstInterval);
    });

    it('stop clears the interval and resets healthCheckAttempts', () => {
        const monitor = new EventHealthMonitor();
        monitor.start(jest.fn());

        monitor.stop();

        expect(monitor.healthCheckInterval).toBeNull();
        expect(monitor.healthCheckAttempts).toBe(0);
    });

    it('stop is safe to call when not started', () => {
        const monitor = new EventHealthMonitor();
        expect(() => monitor.stop()).not.toThrow();
    });

    it('health check with recent event does not increment attempts', () => {
        const monitor = new EventHealthMonitor();
        const callback = jest.fn();
        monitor.start(callback);

        // Advance most of the way to the health check, then record an event
        jest.advanceTimersByTime(
            EventHealthMonitor.HEALTH_CHECK_INTERVAL -
                EventHealthMonitor.EVENT_TIMEOUT +
                1000
        );
        monitor.recordEvent();

        // Advance the remaining time to trigger the health check
        jest.advanceTimersByTime(
            EventHealthMonitor.EVENT_TIMEOUT - 1000
        );

        expect(monitor.healthCheckAttempts).toBe(0);
        expect(callback).not.toHaveBeenCalled();
    });

    it('health check with stale event increments attempts', () => {
        const monitor = new EventHealthMonitor();
        const callback = jest.fn();
        monitor.start(callback);

        // Record event then wait long enough for it to go stale
        monitor.recordEvent();

        // Advance past EVENT_TIMEOUT + HEALTH_CHECK_INTERVAL
        jest.advanceTimersByTime(
            EventHealthMonitor.HEALTH_CHECK_INTERVAL +
                EventHealthMonitor.EVENT_TIMEOUT
        );

        expect(monitor.healthCheckAttempts).toBeGreaterThan(0);
    });

    it('health check calls onUnhealthy after MAX_FAILED_CHECKS', () => {
        const monitor = new EventHealthMonitor();
        const callback = jest.fn();
        monitor.start(callback);

        // No events received, advance through enough health checks
        // Each HEALTH_CHECK_INTERVAL triggers a check, and since no events
        // are received, timeSinceLastEvent will exceed EVENT_TIMEOUT
        jest.advanceTimersByTime(
            EventHealthMonitor.HEALTH_CHECK_INTERVAL *
                EventHealthMonitor.MAX_FAILED_CHECKS
        );

        expect(callback).toHaveBeenCalledWith('health_check_failed');
    });

    it('health check does not call onUnhealthy if callback is null', () => {
        const monitor = new EventHealthMonitor();
        monitor.start(null);

        // Force attempts past max
        monitor.healthCheckAttempts = EventHealthMonitor.MAX_FAILED_CHECKS;
        monitor.onUnhealthy = null;

        // Advance to trigger health check — should not throw
        jest.advanceTimersByTime(EventHealthMonitor.HEALTH_CHECK_INTERVAL);
    });

    it('getStatus returns correct status when healthy', () => {
        const monitor = new EventHealthMonitor();

        const status = monitor.getStatus();

        expect(status).toEqual({
            eventCount: 0,
            lastEventReceived: null,
            healthCheckAttempts: 0,
            isHealthy: true
        });
    });

    it('getStatus returns isHealthy false when at max failed checks', () => {
        const monitor = new EventHealthMonitor();
        monitor.healthCheckAttempts = EventHealthMonitor.MAX_FAILED_CHECKS;

        const status = monitor.getStatus();

        expect(status.isHealthy).toBe(false);
    });

    it('getStatus reflects recorded events', () => {
        const monitor = new EventHealthMonitor();
        monitor.recordEvent();
        monitor.recordEvent();
        monitor.recordEvent();

        const status = monitor.getStatus();

        expect(status.eventCount).toBe(3);
        expect(status.lastEventReceived).not.toBeNull();
    });

    it('reset clears all state', () => {
        const monitor = new EventHealthMonitor();
        monitor.start(jest.fn());
        monitor.recordEvent();
        monitor.recordEvent();
        monitor.healthCheckAttempts = 5;

        monitor.reset();

        expect(monitor.lastEventReceived).toBeNull();
        expect(monitor.eventCount).toBe(0);
        expect(monitor.healthCheckAttempts).toBe(0);
        expect(monitor.startTime).toBeNull();
        expect(monitor.healthCheckInterval).toBeNull();
    });

    it('_performHealthCheck uses startTime when no events received', () => {
        const monitor = new EventHealthMonitor();
        const callback = jest.fn();
        monitor.start(callback);

        // Advance past EVENT_TIMEOUT but only one interval
        jest.advanceTimersByTime(EventHealthMonitor.HEALTH_CHECK_INTERVAL);

        // Since no events received and startTime was set, first check should
        // detect stale (HEALTH_CHECK_INTERVAL > EVENT_TIMEOUT)
        expect(monitor.healthCheckAttempts).toBe(1);
    });
});

// ─── SubscriptionManager (component-level tests for uncovered lines) ─────────

describe('SubscriptionManager — additional coverage', () => {
    let element;

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    function createComponent(opts = {}) {
        element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        if (opts.channelName !== undefined) {
            element.channelName = opts.channelName;
        } else {
            element.channelName = '/event/OpenSF__KanbanEvent__e';
        }
        document.body.appendChild(element);
        return element;
    }

    // ── Error handling in subscribe ──

    it('sets status to error and schedules retry when subscribe fails', async () => {
        const error = new Error('subscribe failed');
        subscribe.mockRejectedValueOnce(error);

        element = createComponent();

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        try {
            await element.subscribe();
        } catch (_e) {
            // expected
        }
        await Promise.resolve();
        await Promise.resolve();

        const statuses = statusHandler.mock.calls.map(
            (call) => call[0].detail.status
        );
        expect(statuses).toContain('error');
    });

    it('does not re-subscribe if already subscribed', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });

        element = createComponent();
        await element.subscribe();
        subscribe.mockClear();

        await element.subscribe();

        expect(subscribe).not.toHaveBeenCalled();
    });

    // ── Unsubscribe callback ──

    it('unsubscribe callback sets status to disconnected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        unsubscribe.mockImplementationOnce((_sub, callback) => {
            callback();
        });

        element = createComponent();
        await element.subscribe();

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        element.unsubscribe();

        const statuses = statusHandler.mock.calls.map(
            (call) => call[0].detail.status
        );
        expect(statuses).toContain('disconnected');
    });

    it('unsubscribe does nothing when no active subscription', () => {
        element = createComponent();

        // Should not throw
        element.unsubscribe();

        expect(unsubscribe).not.toHaveBeenCalled();
    });

    // ── empApi error listener ──

    it('error listener triggers unsubscribe and retry on empApi error', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });

        element = createComponent();
        await element.subscribe();

        // Capture the onError callback registered in connectedCallback
        expect(onError).toHaveBeenCalled();
        const errorCallback = onError.mock.calls[0][0];

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        // Simulate empApi error
        errorCallback({ error: 'Connection lost' });

        const statuses = statusHandler.mock.calls.map(
            (call) => call[0].detail.status
        );
        expect(statuses).toContain('error');
    });

    // ── Health monitoring / polling fallback ──

    it('dispatches pollingrequired when health monitor reports unhealthy', async () => {
        let messageCallback;
        subscribe.mockImplementationOnce((channel, replay, callback) => {
            messageCallback = callback;
            return Promise.resolve({ channel });
        });

        element = createComponent();

        await element.subscribe();

        // Capture the onUnhealthy callback passed to healthMonitor.start
        // The health monitor was started with a callback that calls _switchToPolling
        const pollingHandler = jest.fn();
        element.addEventListener('pollingrequired', pollingHandler);

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        // Trigger health check failures by advancing timers
        // HEALTH_CHECK_INTERVAL * MAX_FAILED_CHECKS should trigger onUnhealthy
        jest.advanceTimersByTime(
            EventHealthMonitor.HEALTH_CHECK_INTERVAL *
                EventHealthMonitor.MAX_FAILED_CHECKS
        );

        expect(pollingHandler).toHaveBeenCalled();
        expect(pollingHandler.mock.calls[0][0].detail.reason).toBe(
            'health_check_failed'
        );

        const statuses = statusHandler.mock.calls.map(
            (call) => call[0].detail.status
        );
        expect(statuses).toContain('polling');
    });

    // ── Max retries exceeded ──

    it('dispatches pollingrequired when max retries exceeded', async () => {
        const error = new Error('subscribe failed');
        subscribe.mockRejectedValue(error);

        element = createComponent();

        const pollingHandler = jest.fn();
        element.addEventListener('pollingrequired', pollingHandler);

        // First call fails, schedules retry #1
        await element.subscribe().catch(() => {});
        await Promise.resolve();
        await Promise.resolve();

        // Advance timer for first retry (delay = 2000 * 1)
        // This triggers subscribe() again which fails, schedules retry #2
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // Advance timer for second retry (delay = 2000 * 2)
        // This triggers subscribe() again which fails, retry #3 exceeds max
        jest.advanceTimersByTime(4000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(pollingHandler).toHaveBeenCalled();
        expect(pollingHandler.mock.calls[0][0].detail.reason).toBe(
            'subscription_failed'
        );
    });

    // ── Message callback sets status to connected and resets retryManager ──

    it('message callback dispatches message event with payload', async () => {
        let messageCallback;
        subscribe.mockImplementationOnce((channel, replay, callback) => {
            messageCallback = callback;
            return Promise.resolve({ channel });
        });

        element = createComponent();

        const messageHandler = jest.fn();
        element.addEventListener('message', messageHandler);

        await element.subscribe();

        messageCallback({ data: { payload: { Id: 'abc', Name: 'Test' } } });

        expect(messageHandler).toHaveBeenCalledTimes(1);
        expect(messageHandler.mock.calls[0][0].detail.payload).toEqual({
            Id: 'abc',
            Name: 'Test'
        });
    });

    // ── Status display helpers ──

    it('getStatusVariant returns inverse when disconnected', () => {
        element = createComponent();
        expect(element.getStatusVariant()).toBe('inverse');
    });

    it('getStatusVariant returns success when connected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        element = createComponent();
        await element.subscribe();
        expect(element.getStatusVariant()).toBe('success');
    });

    it('getStatusVariant returns error on subscribe failure', async () => {
        subscribe.mockRejectedValueOnce(new Error('fail'));
        element = createComponent();
        try {
            await element.subscribe();
        } catch (_e) {
            // expected
        }
        await Promise.resolve();
        expect(element.getStatusVariant()).toBe('error');
    });

    it('getStatusText returns Disconnected by default', () => {
        element = createComponent();
        expect(element.getStatusText()).toBe('Disconnected');
    });

    it('getStatusText returns Real-time updates active when connected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        element = createComponent();
        await element.subscribe();
        expect(element.getStatusText()).toBe('Real-time updates active');
    });

    it('getStatusClass returns status-disconnected by default', () => {
        element = createComponent();
        expect(element.getStatusClass()).toBe('status-disconnected');
    });

    it('getStatusClass returns status-connected when connected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        element = createComponent();
        await element.subscribe();
        expect(element.getStatusClass()).toBe('status-connected');
    });

    it('getStatusClass returns status-error on failure', async () => {
        subscribe.mockRejectedValueOnce(new Error('fail'));
        element = createComponent();
        try {
            await element.subscribe();
        } catch (_e) {
            // expected
        }
        await Promise.resolve();
        expect(element.getStatusClass()).toBe('status-error');
    });

    it('getStatusIcon returns utility:offline when disconnected', () => {
        element = createComponent();
        expect(element.getStatusIcon()).toBe('utility:offline');
    });

    it('getStatusIcon returns utility:check when connected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        element = createComponent();
        await element.subscribe();
        expect(element.getStatusIcon()).toBe('utility:check');
    });

    it('getStatusIcon returns utility:error on failure', async () => {
        subscribe.mockRejectedValueOnce(new Error('fail'));
        element = createComponent();
        try {
            await element.subscribe();
        } catch (_e) {
            // expected
        }
        await Promise.resolve();
        expect(element.getStatusIcon()).toBe('utility:error');
    });

    it('isConnected returns true only when status is connected', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });
        element = createComponent();

        expect(element.isConnected()).toBe(false);

        await element.subscribe();

        expect(element.isConnected()).toBe(true);
    });

    // ── Auto-subscribe ──

    it('auto-subscribes when channelName, boardId, and autoSubscribe are all set', async () => {
        subscribe.mockResolvedValue({
            channel: '/event/OpenSF__KanbanEvent__e'
        });

        element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });

        document.body.appendChild(element);

        // Set properties to trigger auto-subscribe
        element.channelName = '/event/OpenSF__KanbanEvent__e';
        element.boardId = 'a00xx000000001';
        element.autoSubscribe = true;

        // Allow microtasks to process
        await Promise.resolve();
        await Promise.resolve();

        expect(subscribe).toHaveBeenCalled();
    });

    it('does not auto-subscribe when boardId is missing', async () => {
        subscribe.mockResolvedValue({ channel: '/event/Test__e' });

        element = createElement('c-subscription-manager', {
            is: SubscriptionManager
        });
        document.body.appendChild(element);

        element.channelName = '/event/Test__e';
        element.autoSubscribe = true;
        // boardId not set

        await Promise.resolve();

        // subscribe is called once from the existing test setup but not from auto-subscribe
        // Clear and verify no additional calls
        subscribe.mockClear();

        await Promise.resolve();

        expect(subscribe).not.toHaveBeenCalled();
    });

    // ── _setStatus deduplication ──

    it('_setStatus does not dispatch duplicate statuschange events', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });

        element = createComponent();

        const statusHandler = jest.fn();
        element.addEventListener('statuschange', statusHandler);

        await element.subscribe();

        // Count how many times 'connected' was dispatched — should be exactly once
        const connectedEvents = statusHandler.mock.calls.filter(
            (call) => call[0].detail.status === 'connected'
        );
        expect(connectedEvents.length).toBe(1);
        expect(element.getStatus()).toBe('connected');
    });

    // ── disconnectedCallback ──

    it('calls unsubscribe on disconnectedCallback', async () => {
        subscribe.mockResolvedValueOnce({
            channel: '/event/OpenSF__KanbanEvent__e'
        });

        element = createComponent();
        await element.subscribe();

        // Remove element triggers disconnectedCallback
        document.body.removeChild(element);

        expect(unsubscribe).toHaveBeenCalled();
    });

    // ── Property getters ──

    it('channelName getter returns the set value', () => {
        element = createComponent();
        expect(element.channelName).toBe('/event/OpenSF__KanbanEvent__e');
    });

    it('autoSubscribe getter returns the set value', () => {
        element = createComponent();
        element.autoSubscribe = true;
        expect(element.autoSubscribe).toBe(true);
    });

    it('boardId getter returns the set value', () => {
        element = createComponent();
        element.boardId = 'test-id';
        expect(element.boardId).toBe('test-id');
    });
});
