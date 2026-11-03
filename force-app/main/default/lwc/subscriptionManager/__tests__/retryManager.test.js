import RetryManager from '../retryManager';

describe('RetryManager', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('starts idle', () => {
        const manager = new RetryManager(jest.fn(), jest.fn());
        expect(manager.getRetryCount()).toBe(0);
        expect(manager.isRetrying()).toBe(false);
        expect(RetryManager.MAX_RETRY_ATTEMPTS).toBe(3);
        expect(RetryManager.BASE_RETRY_DELAY).toBe(2000);
    });

    it('schedules retries with linear backoff', () => {
        const onRetry = jest.fn();
        const onMax = jest.fn();
        const manager = new RetryManager(onRetry, onMax);

        expect(manager.scheduleRetry(new Error('one'))).toBe(true);
        expect(manager.getRetryCount()).toBe(1);
        expect(manager.isRetrying()).toBe(true);

        jest.advanceTimersByTime(1999);
        expect(onRetry).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(onRetry).toHaveBeenCalledTimes(1);

        expect(manager.scheduleRetry(new Error('two'))).toBe(true);
        jest.advanceTimersByTime(3999);
        expect(onRetry).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(onRetry).toHaveBeenCalledTimes(2);
        expect(onMax).not.toHaveBeenCalled();
    });

    it('invokes onMaxRetriesExceeded once the limit is reached', () => {
        const onRetry = jest.fn();
        const onMax = jest.fn();
        const manager = new RetryManager(onRetry, onMax);
        const finalError = new Error('three');

        manager.scheduleRetry(new Error('one'));
        manager.scheduleRetry(new Error('two'));
        expect(manager.scheduleRetry(finalError)).toBe(false);

        expect(onMax).toHaveBeenCalledWith(finalError);
        expect(manager.getRetryCount()).toBe(3);
    });

    it('tolerates missing callbacks', () => {
        const manager = new RetryManager(null, null);
        expect(manager.scheduleRetry(new Error('x'))).toBe(true);
        expect(() => jest.runOnlyPendingTimers()).not.toThrow();
        manager.scheduleRetry(new Error('y'));
        expect(manager.scheduleRetry(new Error('z'))).toBe(false);
    });

    it('reset() clears count and any pending retry', () => {
        const onRetry = jest.fn();
        const manager = new RetryManager(onRetry, jest.fn());
        manager.scheduleRetry(new Error('x'));
        expect(manager.isRetrying()).toBe(true);

        manager.reset();

        expect(manager.getRetryCount()).toBe(0);
        expect(manager.isRetrying()).toBe(false);
        jest.advanceTimersByTime(10000);
        expect(onRetry).not.toHaveBeenCalled();
    });

    it('clearTimeout() is a no-op when nothing is pending', () => {
        const manager = new RetryManager(jest.fn(), jest.fn());
        manager.clearTimeout();
        expect(manager.retryTimeout).toBeNull();
        expect(manager.isRetrying()).toBe(false);
    });
});
