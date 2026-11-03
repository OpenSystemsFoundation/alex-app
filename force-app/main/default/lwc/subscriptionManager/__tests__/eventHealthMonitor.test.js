import EventHealthMonitor from '../eventHealthMonitor';

const INTERVAL = EventHealthMonitor.HEALTH_CHECK_INTERVAL;

describe('EventHealthMonitor', () => {
    let monitor;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        monitor = new EventHealthMonitor();
    });

    afterEach(() => {
        monitor.stop();
        jest.useRealTimers();
    });

    it('exposes the expected defaults and initial status', () => {
        expect(EventHealthMonitor.HEALTH_CHECK_INTERVAL).toBe(30000);
        expect(EventHealthMonitor.EVENT_TIMEOUT).toBe(10000);
        expect(EventHealthMonitor.MAX_FAILED_CHECKS).toBe(2);
        expect(monitor.getStatus()).toEqual({
            eventCount: 0,
            lastEventReceived: null,
            healthCheckAttempts: 0,
            isHealthy: true
        });
    });

    it('reports unhealthy after two failed checks with no events', () => {
        const onUnhealthy = jest.fn();
        monitor.start(onUnhealthy);
        expect(monitor.startTime).toBe(Date.now());

        jest.advanceTimersByTime(INTERVAL);
        expect(monitor.healthCheckAttempts).toBe(1);
        expect(onUnhealthy).not.toHaveBeenCalled();
        expect(monitor.getStatus().isHealthy).toBe(true);

        jest.advanceTimersByTime(INTERVAL);
        expect(monitor.healthCheckAttempts).toBe(2);
        expect(onUnhealthy).toHaveBeenCalledWith('health_check_failed');
        expect(monitor.getStatus().isHealthy).toBe(false);
    });

    it('treats a recent event as healthy and resets failed checks', () => {
        const onUnhealthy = jest.fn();
        monitor.start(onUnhealthy);

        jest.advanceTimersByTime(INTERVAL);
        expect(monitor.healthCheckAttempts).toBe(1);

        // Event arrives shortly before the next check
        jest.advanceTimersByTime(INTERVAL - 5000);
        monitor.recordEvent();
        expect(monitor.healthCheckAttempts).toBe(0);
        expect(monitor.eventCount).toBe(1);
        expect(monitor.lastEventReceived).toBe(Date.now());

        jest.advanceTimersByTime(5000);
        expect(monitor.healthCheckAttempts).toBe(0);
        expect(onUnhealthy).not.toHaveBeenCalled();
    });

    it('measures staleness from the last event once one was received', () => {
        monitor.start(jest.fn());
        monitor.recordEvent();
        const recordedAt = monitor.lastEventReceived;

        // Healthy reading resets attempts to 0 via the else branch
        monitor.healthCheckAttempts = 1;
        jest.setSystemTime(recordedAt + 5000);
        monitor._performHealthCheck();
        expect(monitor.healthCheckAttempts).toBe(0);

        // Stale reading counts as a failure
        jest.setSystemTime(recordedAt + 15000);
        monitor._performHealthCheck();
        expect(monitor.healthCheckAttempts).toBe(1);
    });

    it('does not throw when unhealthy without a callback', () => {
        monitor.start(null);
        jest.advanceTimersByTime(INTERVAL * 3);
        expect(monitor.healthCheckAttempts).toBe(3);
        expect(monitor.getStatus().isHealthy).toBe(false);
    });

    it('restarting clears the previous interval', () => {
        const first = jest.fn();
        const second = jest.fn();
        monitor.start(first);
        const firstInterval = monitor.healthCheckInterval;
        monitor.start(second);

        expect(monitor.healthCheckInterval).not.toBe(firstInterval);
        expect(jest.getTimerCount()).toBe(1);

        jest.advanceTimersByTime(INTERVAL * 2);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('stop() clears the interval and attempts; safe when idle', () => {
        monitor.stop();
        expect(monitor.healthCheckInterval).toBeNull();

        monitor.start(jest.fn());
        jest.advanceTimersByTime(INTERVAL);
        expect(monitor.healthCheckAttempts).toBe(1);

        monitor.stop();
        expect(monitor.healthCheckInterval).toBeNull();
        expect(monitor.healthCheckAttempts).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('reset() clears all counters and stops monitoring', () => {
        monitor.start(jest.fn());
        monitor.recordEvent();
        monitor.recordEvent();
        expect(monitor.eventCount).toBe(2);

        monitor.reset();

        expect(monitor.getStatus()).toEqual({
            eventCount: 0,
            lastEventReceived: null,
            healthCheckAttempts: 0,
            isHealthy: true
        });
        expect(monitor.startTime).toBeNull();
        expect(jest.getTimerCount()).toBe(0);
    });
});
