/**
 * Unit tests for RequestTracker
 */
import RequestTracker from '../../helpers/requestTracker';

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('RequestTracker', () => {
    let tracker;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        tracker = new RequestTracker('client-1');
    });

    afterEach(() => {
        tracker.destroy();
        jest.useRealTimers();
    });

    it('exposes a 30s request timeout and configured windows', () => {
        expect(RequestTracker.REQUEST_TIMEOUT).toBe(30000);
        expect(tracker.clientId).toBe('client-1');
        expect(tracker.RETENTION_WINDOW).toBe(5000);
        expect(tracker.CLEANUP_INTERVAL).toBe(10000);
        expect(tracker.cleanupTimer).toBeTruthy();
    });

    it('generates v4 UUIDs', () => {
        const id = tracker.generateUUID();
        expect(id).toMatch(UUID_V4);
        expect(tracker.generateUUID()).not.toBe(id);
    });

    it('builds scoped keys from client and card ids', () => {
        expect(tracker.getScopedKey('card-9')).toBe('client-1:card-9');
    });

    it('tracks a pending request with additional data', () => {
        const id = tracker.trackRequest('move', 'card-1', { targetIndex: 2 });
        const req = tracker.getRequest(id);

        expect(req).toEqual({
            requestId: id,
            operation: 'move',
            cardId: 'card-1',
            scopedKey: 'client-1:card-1',
            status: 'pending',
            timestamp: Date.now(),
            targetIndex: 2
        });
        expect(tracker.isPending(id)).toBe(true);
        expect(tracker.isOwnRequest(id)).toBe(true);
        expect(tracker.getActiveRequestCount()).toBe(1);
    });

    it('tracks a request without additional data', () => {
        const id = tracker.trackRequest('create', null);
        expect(tracker.getRequest(id).operation).toBe('create');
        expect(tracker.getRequest(id).cardId).toBeNull();
    });

    it('completes a request with and without a result', () => {
        const a = tracker.trackRequest('update', 'c1');
        const b = tracker.trackRequest('update', 'c2');

        tracker.completeRequest(a, { ok: true });
        tracker.completeRequest(b);

        expect(tracker.getRequest(a)).toMatchObject({
            status: 'completed',
            completedAt: Date.now(),
            result: { ok: true }
        });
        expect(tracker.getRequest(b).result).toBeNull();
        expect(tracker.isPending(a)).toBe(false);
        expect(tracker.getActiveRequestCount()).toBe(0);
    });

    it('fails a request with and without an error', () => {
        const a = tracker.trackRequest('update', 'c1');
        const b = tracker.trackRequest('update', 'c2');
        const err = new Error('boom');

        tracker.failRequest(a, err);
        tracker.failRequest(b);

        expect(tracker.getRequest(a)).toMatchObject({
            status: 'failed',
            failedAt: Date.now(),
            error: err
        });
        expect(tracker.getRequest(b).error).toBeNull();
    });

    it('ignores complete/fail for unknown request ids', () => {
        tracker.completeRequest('nope', {});
        tracker.failRequest('nope', new Error('x'));

        expect(tracker.getRequest('nope')).toBeUndefined();
        expect(tracker.pendingRequests.size).toBe(0);
    });

    it('reports isPending/isOwnRequest as falsy for unknown ids', () => {
        expect(tracker.isPending('missing')).toBeFalsy();
        expect(tracker.isOwnRequest('missing')).toBe(false);
    });

    it('finds pending operations for a card only', () => {
        const a = tracker.trackRequest('move', 'c1');
        const b = tracker.trackRequest('update', 'c1');
        tracker.trackRequest('move', 'c2');
        tracker.completeRequest(b);

        expect(tracker.hasPendingOperations('c1')).toBe(true);
        expect(tracker.hasPendingOperations('c3')).toBe(false);
        expect(
            tracker.getPendingOperations('c1').map((r) => r.requestId)
        ).toEqual([a]);
        expect(tracker.getPendingOperations('c3')).toEqual([]);

        tracker.completeRequest(a);
        expect(tracker.hasPendingOperations('c1')).toBe(false);
    });

    it('cleanup removes finished requests past the retention window', () => {
        const done = tracker.trackRequest('move', 'c1');
        const failed = tracker.trackRequest('move', 'c2');
        const recent = tracker.trackRequest('move', 'c3');
        tracker.completeRequest(done);
        tracker.failRequest(failed);

        jest.setSystemTime(Date.now() + 4000);
        tracker.completeRequest(recent);
        jest.setSystemTime(Date.now() + 2000);

        tracker.cleanup();

        expect(tracker.getRequest(done)).toBeUndefined();
        expect(tracker.getRequest(failed)).toBeUndefined();
        expect(tracker.getRequest(recent)).toBeDefined();
    });

    it('cleanup falls back to timestamp when no completion time recorded', () => {
        const id = tracker.trackRequest('move', 'c1');
        const req = tracker.getRequest(id);
        req.status = 'completed'; // no completedAt/failedAt

        jest.setSystemTime(Date.now() + 6000);
        tracker.cleanup();

        expect(tracker.getRequest(id)).toBeUndefined();
    });

    it('cleanup auto-fails pending requests older than the timeout', () => {
        const errSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const stale = tracker.trackRequest('move', 'c1');
        jest.setSystemTime(Date.now() + 20000);
        const fresh = tracker.trackRequest('move', 'c2');
        jest.setSystemTime(Date.now() + 11000);

        tracker.cleanup();

        expect(tracker.getRequest(stale)).toMatchObject({
            status: 'failed',
            error: 'Request timed out',
            failedAt: Date.now()
        });
        expect(tracker.getRequest(fresh).status).toBe('pending');
        expect(errSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Request ${stale} timed out after 30000ms`)
        );
        errSpy.mockRestore();
    });

    it('runs cleanup on the interval timer', () => {
        const spy = jest.spyOn(tracker, 'cleanup');
        jest.advanceTimersByTime(10000);
        expect(spy).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(10000);
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('destroy clears the timer and pending requests', () => {
        tracker.trackRequest('move', 'c1');
        const spy = jest.spyOn(tracker, 'cleanup');

        tracker.destroy();

        expect(tracker.cleanupTimer).toBeNull();
        expect(tracker.pendingRequests.size).toBe(0);
        jest.advanceTimersByTime(30000);
        expect(spy).not.toHaveBeenCalled();
    });

    it('destroy is safe to call twice', () => {
        tracker.destroy();
        tracker.trackRequest('move', 'c1');
        tracker.destroy();
        expect(tracker.cleanupTimer).toBeNull();
        expect(tracker.pendingRequests.size).toBe(0);
    });
});
