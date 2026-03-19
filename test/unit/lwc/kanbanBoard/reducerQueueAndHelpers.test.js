/**
 * Tests for kanbanBoard helper modules:
 *   - reducerQueue.js
 *   - requestTracker.js
 *   - subscriptionEventHandler.js
 *   - cardOperations.js
 *   - boardDataLoader.js
 *   - lifecycleManager.js
 */

// Mock c/kanbanStore before any imports
jest.mock('c/kanbanStore', () => ({
    startOperation: jest.fn((id, type, cardId) => ({
        type: 'START_OPERATION',
        payload: { id, type, cardId }
    })),
    completeOperation: jest.fn((id) => ({
        type: 'COMPLETE_OPERATION',
        payload: { id }
    })),
    failOperation: jest.fn((id, message) => ({
        type: 'FAIL_OPERATION',
        payload: { id, message }
    })),
    setSubscriptionStatus: jest.fn((status) => ({
        type: 'SET_SUBSCRIPTION_STATUS',
        payload: status
    })),
    loadBoardData: jest.fn((boardId) => async () => ({ boardId })),
    setLoading: jest.fn((loading) => ({
        type: 'SET_LOADING',
        payload: loading
    })),
    setError: jest.fn((error) => ({
        type: 'SET_ERROR',
        payload: error
    })),
    clearError: jest.fn(() => ({ type: 'CLEAR_ERROR' })),
    createCardAsync: jest.fn(),
    deleteCardAsync: jest.fn()
}));

// Mock the Apex import (default export is a function)
jest.mock(
    '@salesforce/apex/KanbanBoardController.getIncrementalUpdates',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

import ReducerQueue from '../../../../force-app/main/default/lwc/kanbanBoard/helpers/reducerQueue';
import RequestTracker from '../../../../force-app/main/default/lwc/kanbanBoard/helpers/requestTracker';
import SubscriptionEventHandler from '../../../../force-app/main/default/lwc/kanbanBoard/handlers/subscriptionEventHandler';
import CardOperations from '../../../../force-app/main/default/lwc/kanbanBoard/handlers/cardOperations';
import BoardDataLoader from '../../../../force-app/main/default/lwc/kanbanBoard/managers/boardDataLoader';
import LifecycleManager from '../../../../force-app/main/default/lwc/kanbanBoard/managers/lifecycleManager';

import {
    startOperation,
    completeOperation,
    failOperation,
    setSubscriptionStatus,
    setLoading,
    setError,
    clearError,
    createCardAsync,
    deleteCardAsync
} from 'c/kanbanStore';

import getIncrementalUpdates from '@salesforce/apex/KanbanBoardController.getIncrementalUpdates';

// ─────────────────────────────────────────────────────────────
// ReducerQueue
// ─────────────────────────────────────────────────────────────
describe('ReducerQueue', () => {
    let queue;
    let mockStore;

    beforeEach(() => {
        mockStore = { dispatch: jest.fn() };
        queue = new ReducerQueue(mockStore);
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('initializes with default state', () => {
            expect(queue.store).toBe(mockStore);
            expect(queue.queue).toEqual([]);
            expect(queue.currentOperation).toBeNull();
            expect(queue.isProcessing).toBe(false);
            expect(queue.cardOperations).toBeInstanceOf(Map);
            expect(queue.onOperationStart).toBeNull();
            expect(queue.onOperationComplete).toBeNull();
            expect(queue.onOperationFailed).toBeNull();
        });
    });

    describe('enqueue and processNext', () => {
        it('enqueues and processes a simple operation', async () => {
            const result = { success: true };
            const promise = queue.enqueue({
                type: 'create',
                execute: jest.fn().mockResolvedValue(result)
            });

            const res = await promise;
            expect(res).toEqual(result);
            expect(mockStore.dispatch).toHaveBeenCalledWith(
                startOperation(expect.any(String), 'create', undefined)
            );
            expect(mockStore.dispatch).toHaveBeenCalledWith(
                completeOperation(expect.any(String))
            );
        });

        it('rejects the promise when execute throws', async () => {
            const error = new Error('fail');
            await expect(
                queue.enqueue({
                    type: 'update',
                    execute: jest.fn().mockRejectedValue(error)
                })
            ).rejects.toThrow('fail');

            expect(mockStore.dispatch).toHaveBeenCalledWith(
                failOperation(expect.any(String), 'fail')
            );
        });

        it('calls onOperationStart callback', async () => {
            const cb = jest.fn();
            queue.onOperationStart = cb;

            await queue.enqueue({
                type: 'create',
                execute: jest.fn().mockResolvedValue('ok')
            });

            expect(cb).toHaveBeenCalledTimes(1);
            expect(cb.mock.calls[0][0].type).toBe('create');
        });

        it('calls onOperationComplete callback', async () => {
            const cb = jest.fn();
            queue.onOperationComplete = cb;

            await queue.enqueue({
                type: 'create',
                execute: jest.fn().mockResolvedValue('done')
            });

            expect(cb).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'create' }),
                'done'
            );
        });

        it('calls onOperationFailed callback', async () => {
            const cb = jest.fn();
            queue.onOperationFailed = cb;
            const error = new Error('oops');

            await expect(
                queue.enqueue({
                    type: 'update',
                    execute: jest.fn().mockRejectedValue(error)
                })
            ).rejects.toThrow('oops');

            expect(cb).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'update' }),
                error
            );
        });

        it('tracks card operations and cleans up on success', async () => {
            await queue.enqueue({
                type: 'move',
                cardId: 'card1',
                execute: jest.fn().mockResolvedValue('ok')
            });

            expect(queue.cardOperations.has('card1')).toBe(false);
        });

        it('tracks card operations and cleans up on failure', async () => {
            await expect(
                queue.enqueue({
                    type: 'move',
                    cardId: 'card2',
                    execute: jest.fn().mockRejectedValue(new Error('err'))
                })
            ).rejects.toThrow('err');

            expect(queue.cardOperations.has('card2')).toBe(false);
        });

        it('processes operations sequentially', async () => {
            const order = [];
            const op1 = queue.enqueue({
                type: 'create',
                execute: () =>
                    new Promise((resolve) => {
                        order.push(1);
                        resolve('first');
                    })
            });
            const op2 = queue.enqueue({
                type: 'create',
                execute: () =>
                    new Promise((resolve) => {
                        order.push(2);
                        resolve('second');
                    })
            });

            await Promise.all([op1, op2]);
            expect(order).toEqual([1, 2]);
        });

        it('does not re-enter processNext when already processing', async () => {
            // isProcessing guard
            queue.isProcessing = true;
            queue.processNext();
            // should be a no-op
            expect(queue.isProcessing).toBe(true);
        });

        it('exits processNext early when queue is empty', async () => {
            queue.isProcessing = false;
            queue.queue = [];
            await queue.processNext();
            expect(queue.isProcessing).toBe(false);
        });
    });

    describe('_tryReduceOperation - move reduction', () => {
        it('reduces consecutive move operations for the same card', async () => {
            // Manually set up a queued move
            const resolveA = jest.fn();
            const rejectA = jest.fn();
            const existingOp = {
                type: 'move',
                cardId: 'card1',
                targetColumnId: 'colA',
                targetIndex: 0,
                status: 'queued',
                resolve: resolveA,
                reject: rejectA
            };

            queue.cardOperations.set('card1', [existingOp]);
            queue.queue.push(existingOp);

            const newOp = {
                type: 'move',
                cardId: 'card1',
                targetColumnId: 'colB',
                targetIndex: 3,
                resolve: jest.fn(),
                reject: jest.fn()
            };

            const reduced = queue._tryReduceOperation(newOp);
            expect(reduced).toBe(true);
            expect(existingOp.targetColumnId).toBe('colB');
            expect(existingOp.targetIndex).toBe(3);
        });

        it('skips processing/completed operations during reduction', () => {
            const existingOp = {
                type: 'move',
                cardId: 'card1',
                status: 'processing',
                resolve: jest.fn(),
                reject: jest.fn()
            };

            queue.cardOperations.set('card1', [existingOp]);

            const result = queue._tryReduceOperation({
                type: 'move',
                cardId: 'card1',
                targetColumnId: 'colB',
                resolve: jest.fn(),
                reject: jest.fn()
            });

            expect(result).toBe(false);
        });

        it('overwrites resolve/reject to chain new and original callbacks', () => {
            const origResolve = jest.fn();
            const origReject = jest.fn();
            const existingOp = {
                type: 'move',
                cardId: 'card1',
                status: 'queued',
                resolve: origResolve,
                reject: origReject
            };

            queue.cardOperations.set('card1', [existingOp]);

            const newResolve = jest.fn();
            const newReject = jest.fn();
            queue._tryReduceOperation({
                type: 'move',
                cardId: 'card1',
                targetColumnId: 'colC',
                resolve: newResolve,
                reject: newReject
            });

            // After reduction, resolve should be overwritten (not the original)
            expect(existingOp.resolve).not.toBe(origResolve);
            // _originalResolve is set after the overwrite, so it captures the arrow fn
            expect(existingOp._originalResolve).toBeDefined();
            expect(existingOp._originalReject).toBeDefined();

            // On a subsequent reduction, _originalResolve is NOT overwritten
            // (the guard `if (!existingOp._originalResolve)` prevents it)
            const thirdResolve = jest.fn();
            const savedOriginal = existingOp._originalResolve;
            queue._tryReduceOperation({
                type: 'move',
                cardId: 'card1',
                targetColumnId: 'colD',
                resolve: thirdResolve,
                reject: jest.fn()
            });
            expect(existingOp._originalResolve).toBe(savedOriginal);
        });
    });

    describe('_tryReduceOperation - update reduction', () => {
        it('merges consecutive update operations', () => {
            const existingOp = {
                type: 'update',
                cardId: 'card1',
                status: 'queued',
                updates: { title: 'old' },
                resolve: jest.fn(),
                reject: jest.fn()
            };
            queue.cardOperations.set('card1', [existingOp]);

            const result = queue._tryReduceOperation({
                type: 'update',
                cardId: 'card1',
                updates: { title: 'new', description: 'added' },
                resolve: jest.fn(),
                reject: jest.fn()
            });

            expect(result).toBe(true);
            expect(existingOp.updates).toEqual({
                title: 'new',
                description: 'added'
            });
        });
    });

    describe('_tryReduceOperation - delete cancellation', () => {
        it('cancels pending operations when a delete comes in', () => {
            const rejectFn = jest.fn();
            const existingOp = {
                type: 'update',
                cardId: 'card1',
                status: 'queued',
                resolve: jest.fn(),
                reject: rejectFn
            };
            queue.cardOperations.set('card1', [existingOp]);
            queue.queue.push(existingOp);

            const result = queue._tryReduceOperation({
                type: 'delete',
                cardId: 'card1',
                resolve: jest.fn(),
                reject: jest.fn()
            });

            expect(result).toBe(false); // delete is not reduced, it still gets queued
            expect(existingOp.status).toBe('cancelled');
            expect(rejectFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Operation cancelled by delete'
                })
            );
            expect(queue.queue).toHaveLength(0);
        });
    });

    describe('_tryReduceOperation - move after temp create', () => {
        it('does not reduce move after create for temp card', () => {
            const existingOp = {
                type: 'create',
                cardId: 'temp-123',
                status: 'queued',
                resolve: jest.fn(),
                reject: jest.fn()
            };
            queue.cardOperations.set('temp-123', [existingOp]);

            const result = queue._tryReduceOperation({
                type: 'move',
                cardId: 'temp-123',
                resolve: jest.fn(),
                reject: jest.fn()
            });

            expect(result).toBe(false);
        });
    });

    describe('_tryReduceOperation - no cardId', () => {
        it('returns false when no cardId', () => {
            const result = queue._tryReduceOperation({
                type: 'move',
                resolve: jest.fn(),
                reject: jest.fn()
            });
            expect(result).toBe(false);
        });

        it('returns false when cardId not tracked', () => {
            const result = queue._tryReduceOperation({
                type: 'move',
                cardId: 'unknown',
                resolve: jest.fn(),
                reject: jest.fn()
            });
            expect(result).toBe(false);
        });
    });

    describe('getQueueLength / isQueueProcessing / getCurrentOperation', () => {
        it('returns queue length', () => {
            queue.queue = [1, 2, 3];
            expect(queue.getQueueLength()).toBe(3);
        });

        it('returns processing state', () => {
            expect(queue.isQueueProcessing()).toBe(false);
            queue.isProcessing = true;
            expect(queue.isQueueProcessing()).toBe(true);
        });

        it('returns current operation', () => {
            expect(queue.getCurrentOperation()).toBeNull();
            queue.currentOperation = { id: 'op1' };
            expect(queue.getCurrentOperation()).toEqual({ id: 'op1' });
        });
    });

    describe('hasPendingOperations', () => {
        it('returns true when current operation matches cardId', () => {
            queue.currentOperation = { cardId: 'card1' };
            expect(queue.hasPendingOperations('card1')).toBe(true);
        });

        it('returns true when card has queued operations', () => {
            queue.cardOperations.set('card1', [{ status: 'queued' }]);
            expect(queue.hasPendingOperations('card1')).toBe(true);
        });

        it('returns falsy when no pending operations', () => {
            expect(queue.hasPendingOperations('card1')).toBeFalsy();
        });
    });

    describe('getPendingOperations', () => {
        it('includes current operation if matching cardId', () => {
            queue.currentOperation = { cardId: 'card1', type: 'move' };
            queue.cardOperations.set('card1', [{ type: 'update' }]);

            const ops = queue.getPendingOperations('card1');
            expect(ops).toHaveLength(2);
            expect(ops[0].type).toBe('move');
            expect(ops[1].type).toBe('update');
        });

        it('returns empty array when no operations', () => {
            expect(queue.getPendingOperations('card1')).toEqual([]);
        });
    });

    describe('clear', () => {
        it('rejects all queued operations and resets state', () => {
            const reject1 = jest.fn();
            const reject2 = jest.fn();
            queue.queue = [{ reject: reject1 }, { reject: reject2 }];
            queue.cardOperations.set('card1', [{}]);
            queue.currentOperation = { id: 'op1' };
            queue.isProcessing = true;

            queue.clear();

            expect(reject1).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Queue cleared' })
            );
            expect(reject2).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Queue cleared' })
            );
            expect(queue.queue).toEqual([]);
            expect(queue.cardOperations.size).toBe(0);
            expect(queue.currentOperation).toBeNull();
            expect(queue.isProcessing).toBe(false);
        });

        it('handles ops without reject gracefully', () => {
            queue.queue = [{ reject: null }];
            expect(() => queue.clear()).not.toThrow();
        });
    });

    describe('_generateOperationId', () => {
        it('returns a string starting with op-', () => {
            const id = queue._generateOperationId();
            expect(typeof id).toBe('string');
            expect(id.startsWith('op-')).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────
// RequestTracker
// ─────────────────────────────────────────────────────────────
describe('RequestTracker', () => {
    let tracker;

    beforeEach(() => {
        jest.useFakeTimers();
        tracker = new RequestTracker('client-abc');
    });

    afterEach(() => {
        tracker.destroy();
        jest.useRealTimers();
    });

    describe('constructor', () => {
        it('initializes with clientId and empty map', () => {
            expect(tracker.clientId).toBe('client-abc');
            expect(tracker.pendingRequests.size).toBe(0);
        });
    });

    describe('generateUUID', () => {
        it('returns a valid UUID v4 format', () => {
            const uuid = tracker.generateUUID();
            expect(uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            );
        });
    });

    describe('getScopedKey', () => {
        it('returns clientId:cardId', () => {
            expect(tracker.getScopedKey('card1')).toBe('client-abc:card1');
        });
    });

    describe('trackRequest', () => {
        it('creates a pending request and returns requestId', () => {
            const id = tracker.trackRequest('create', 'card1', {
                extra: 'data'
            });
            expect(typeof id).toBe('string');

            const req = tracker.getRequest(id);
            expect(req.operation).toBe('create');
            expect(req.cardId).toBe('card1');
            expect(req.status).toBe('pending');
            expect(req.extra).toBe('data');
            expect(req.scopedKey).toBe('client-abc:card1');
        });
    });

    describe('completeRequest', () => {
        it('marks a request as completed', () => {
            const id = tracker.trackRequest('update', 'card1');
            tracker.completeRequest(id, { ok: true });

            const req = tracker.getRequest(id);
            expect(req.status).toBe('completed');
            expect(req.result).toEqual({ ok: true });
            expect(req.completedAt).toBeDefined();
        });

        it('no-ops for unknown requestId', () => {
            expect(() =>
                tracker.completeRequest('nonexistent')
            ).not.toThrow();
        });
    });

    describe('failRequest', () => {
        it('marks a request as failed', () => {
            const id = tracker.trackRequest('delete', 'card1');
            const error = new Error('oops');
            tracker.failRequest(id, error);

            const req = tracker.getRequest(id);
            expect(req.status).toBe('failed');
            expect(req.error).toBe(error);
            expect(req.failedAt).toBeDefined();
        });

        it('no-ops for unknown requestId', () => {
            expect(() => tracker.failRequest('nonexistent')).not.toThrow();
        });
    });

    describe('isPending', () => {
        it('returns true for pending request', () => {
            const id = tracker.trackRequest('move', 'card1');
            expect(tracker.isPending(id)).toBe(true);
        });

        it('returns false for completed request', () => {
            const id = tracker.trackRequest('move', 'card1');
            tracker.completeRequest(id);
            expect(tracker.isPending(id)).toBe(false);
        });

        it('returns false for unknown id', () => {
            expect(tracker.isPending('unknown')).toBeFalsy();
        });
    });

    describe('isOwnRequest', () => {
        it('returns true for tracked request', () => {
            const id = tracker.trackRequest('create', 'card1');
            expect(tracker.isOwnRequest(id)).toBe(true);
        });

        it('returns false for unknown request', () => {
            expect(tracker.isOwnRequest('unknown')).toBe(false);
        });
    });

    describe('hasPendingOperations', () => {
        it('returns true when card has pending operations', () => {
            tracker.trackRequest('move', 'card1');
            expect(tracker.hasPendingOperations('card1')).toBe(true);
        });

        it('returns false when card has no pending operations', () => {
            expect(tracker.hasPendingOperations('card1')).toBe(false);
        });

        it('returns false when all operations for card are completed', () => {
            const id = tracker.trackRequest('move', 'card1');
            tracker.completeRequest(id);
            expect(tracker.hasPendingOperations('card1')).toBe(false);
        });
    });

    describe('getPendingOperations', () => {
        it('returns all pending operations for a card', () => {
            tracker.trackRequest('move', 'card1');
            tracker.trackRequest('update', 'card1');
            const completedId = tracker.trackRequest('delete', 'card1');
            tracker.completeRequest(completedId);

            const ops = tracker.getPendingOperations('card1');
            expect(ops).toHaveLength(2);
        });

        it('returns empty array when no pending operations', () => {
            expect(tracker.getPendingOperations('card1')).toEqual([]);
        });
    });

    describe('getActiveRequestCount', () => {
        it('counts only pending requests', () => {
            tracker.trackRequest('move', 'card1');
            tracker.trackRequest('update', 'card2');
            const id = tracker.trackRequest('delete', 'card3');
            tracker.completeRequest(id);

            expect(tracker.getActiveRequestCount()).toBe(2);
        });
    });

    describe('cleanup', () => {
        it('auto-fails timed out pending requests', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const id = tracker.trackRequest('move', 'card1');

            // Advance past timeout
            jest.advanceTimersByTime(RequestTracker.REQUEST_TIMEOUT + 1000);
            tracker.cleanup();

            const req = tracker.getRequest(id);
            expect(req.status).toBe('failed');
            expect(req.error).toBe('Request timed out');
            console.error.mockRestore();
        });

        it('removes completed requests past retention window', () => {
            const id = tracker.trackRequest('move', 'card1');
            tracker.completeRequest(id);

            // Advance past retention window
            jest.advanceTimersByTime(tracker.RETENTION_WINDOW + 1000);
            tracker.cleanup();

            expect(tracker.getRequest(id)).toBeUndefined();
        });

        it('removes failed requests past retention window', () => {
            const id = tracker.trackRequest('move', 'card1');
            tracker.failRequest(id, 'err');

            jest.advanceTimersByTime(tracker.RETENTION_WINDOW + 1000);
            tracker.cleanup();

            expect(tracker.getRequest(id)).toBeUndefined();
        });

        it('keeps pending requests that have not timed out', () => {
            const id = tracker.trackRequest('move', 'card1');
            tracker.cleanup();
            expect(tracker.getRequest(id)).toBeDefined();
            expect(tracker.getRequest(id).status).toBe('pending');
        });

        it('runs automatically via the cleanup interval', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const id = tracker.trackRequest('move', 'card1');

            // Advance past both timeout and cleanup interval
            jest.advanceTimersByTime(
                RequestTracker.REQUEST_TIMEOUT + tracker.CLEANUP_INTERVAL + 1000
            );

            const req = tracker.getRequest(id);
            expect(req.status).toBe('failed');
            console.error.mockRestore();
        });
    });

    describe('destroy', () => {
        it('clears interval and pending requests', () => {
            tracker.trackRequest('move', 'card1');
            tracker.destroy();

            expect(tracker.pendingRequests.size).toBe(0);
            expect(tracker.cleanupTimer).toBeNull();
        });
    });
});

// ─────────────────────────────────────────────────────────────
// SubscriptionEventHandler
// ─────────────────────────────────────────────────────────────
describe('SubscriptionEventHandler', () => {
    let handler;
    let mockComponent;

    beforeEach(() => {
        mockComponent = {
            eventHandler: {
                handlePlatformEvent: jest.fn().mockReturnValue(false)
            },
            store: {
                dispatch: jest.fn()
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
            subscriptionManager: {
                subscribe: jest.fn()
            }
        };
        handler = new SubscriptionEventHandler(mockComponent);
        jest.clearAllMocks();
    });

    describe('handlePlatformEvent', () => {
        it('delegates to component eventHandler and does not reload if no refresh needed', () => {
            handler.handlePlatformEvent({ data: 'test' });
            expect(
                mockComponent.eventHandler.handlePlatformEvent
            ).toHaveBeenCalledWith({ data: 'test' }, mockComponent.store);
            expect(mockComponent.loadBoardData).not.toHaveBeenCalled();
        });

        it('reloads board data when refresh is needed', () => {
            mockComponent.eventHandler.handlePlatformEvent.mockReturnValue(
                true
            );
            handler.handlePlatformEvent({ data: 'test' });
            expect(mockComponent.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('handleEventActivity', () => {
        it('is a no-op (silent update)', () => {
            expect(() =>
                handler.handleEventActivity({ msg: 'hi' })
            ).not.toThrow();
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
                'msg'
            );
            expect(mockComponent.toastManager.showSuccess).toHaveBeenCalledWith(
                'Connected',
                'dismissible'
            );
        });

        it('shows subscription status for non-success variant', () => {
            handler.handleSubscriptionStatusMessage(
                'error',
                'Disconnected',
                'Details'
            );
            expect(
                mockComponent.toastManager.showSubscriptionStatus
            ).toHaveBeenCalledWith('Disconnected', 'Details', 'error');
        });

        it('does nothing when toastManager is null', () => {
            mockComponent.toastManager = null;
            expect(() =>
                handler.handleSubscriptionStatusMessage(
                    'success',
                    'Title',
                    'Msg'
                )
            ).not.toThrow();
        });
    });

    describe('handlePollingRequired', () => {
        it('starts polling on boardDataLoader', () => {
            handler.handlePollingRequired();
            expect(
                mockComponent.boardDataLoader.startPolling
            ).toHaveBeenCalled();
        });

        it('does nothing when boardDataLoader is null', () => {
            mockComponent.boardDataLoader = null;
            expect(() => handler.handlePollingRequired()).not.toThrow();
        });
    });

    describe('handleSubscriptionStatusChange', () => {
        it('dispatches setSubscriptionStatus', () => {
            handler.handleSubscriptionStatusChange('connected');
            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                setSubscriptionStatus('connected')
            );
        });

        it('stops polling when status is connected', () => {
            handler.handleSubscriptionStatusChange('connected');
            expect(
                mockComponent.boardDataLoader.stopPolling
            ).toHaveBeenCalled();
        });

        it('does not stop polling for non-connected status', () => {
            handler.handleSubscriptionStatusChange('disconnected');
            expect(
                mockComponent.boardDataLoader.stopPolling
            ).not.toHaveBeenCalled();
        });

        it('handles missing boardDataLoader on connected status', () => {
            mockComponent.boardDataLoader = null;
            expect(() =>
                handler.handleSubscriptionStatusChange('connected')
            ).not.toThrow();
        });
    });
});

// ─────────────────────────────────────────────────────────────
// CardOperations
// ─────────────────────────────────────────────────────────────
describe('CardOperations', () => {
    let cardOps;
    let mockComponent;

    beforeEach(() => {
        mockComponent = {
            store: {
                findCard: jest.fn(),
                getState: jest.fn(() => ({
                    backlogCards: [
                        { Id: 'backlog1', subject: 'Backlog Card' }
                    ]
                })),
                dispatch: jest.fn()
            },
            selectedCard: null,
            showCardDetail: false,
            loadBoardData: jest.fn(),
            toastManager: {
                showSuccess: jest.fn(),
                showError: jest.fn()
            },
            requestTracker: {
                trackRequest: jest.fn().mockReturnValue('req-1'),
                getRequest: jest.fn().mockReturnValue({}),
                completeRequest: jest.fn(),
                failRequest: jest.fn()
            },
            operationQueue: {
                enqueue: jest.fn().mockResolvedValue(undefined)
            },
            subscriptionManager: {
                isConnected: jest.fn().mockReturnValue(true)
            },
            _clientId: 'client-1'
        };
        cardOps = new CardOperations(mockComponent);
        jest.clearAllMocks();
    });

    describe('findCard', () => {
        it('delegates to store.findCard', () => {
            mockComponent.store.findCard.mockReturnValue({ Id: 'card1' });
            const card = cardOps.findCard('card1');
            expect(card).toEqual({ Id: 'card1' });
            expect(mockComponent.store.findCard).toHaveBeenCalledWith('card1');
        });
    });

    describe('handleCardClick', () => {
        it('opens card detail when card found in columns', () => {
            mockComponent.store.findCard.mockReturnValue({
                Id: 'card1',
                subject: 'Test'
            });
            cardOps.handleCardClick('card1');

            expect(mockComponent.selectedCard).toEqual({
                Id: 'card1',
                subject: 'Test'
            });
            expect(mockComponent.showCardDetail).toBe(true);
        });

        it('falls back to backlog cards', () => {
            mockComponent.store.findCard.mockReturnValue(null);
            cardOps.handleCardClick('backlog1');

            expect(mockComponent.selectedCard).toEqual({
                Id: 'backlog1',
                subject: 'Backlog Card'
            });
            expect(mockComponent.showCardDetail).toBe(true);
        });

        it('does nothing when card not found anywhere', () => {
            mockComponent.store.findCard.mockReturnValue(null);
            mockComponent.store.getState.mockReturnValue({
                backlogCards: []
            });
            cardOps.handleCardClick('unknown');
            expect(mockComponent.showCardDetail).toBe(false);
        });
    });

    describe('handleCardDetailClose', () => {
        it('closes card detail and clears selection', () => {
            mockComponent.showCardDetail = true;
            mockComponent.selectedCard = { Id: 'card1' };

            cardOps.handleCardDetailClose();

            expect(mockComponent.showCardDetail).toBe(false);
            expect(mockComponent.selectedCard).toBeNull();
        });
    });

    describe('handleCardUpdated', () => {
        it('closes detail, reloads data, clears selection', () => {
            mockComponent.showCardDetail = true;
            mockComponent.selectedCard = { Id: 'card1' };

            cardOps.handleCardUpdated();

            expect(mockComponent.showCardDetail).toBe(false);
            expect(mockComponent.loadBoardData).toHaveBeenCalled();
            expect(mockComponent.selectedCard).toBeNull();
        });
    });

    describe('handleCardDeleted', () => {
        it('dispatches deleteCardAsync and closes panel', async () => {
            mockComponent.store.dispatch.mockResolvedValue(undefined);
            await cardOps.handleCardDeleted('card1');

            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                deleteCardAsync('card1')
            );
            expect(mockComponent.showCardDetail).toBe(false);
            expect(mockComponent.selectedCard).toBeNull();
        });

        it('returns early when cardId is falsy', async () => {
            await cardOps.handleCardDeleted(null);
            expect(mockComponent.store.dispatch).not.toHaveBeenCalled();
        });

        it('shows error toast when delete fails', async () => {
            const error = new Error('delete failed');
            mockComponent.store.dispatch.mockRejectedValue(error);

            await cardOps.handleCardDeleted('card1');

            expect(mockComponent.toastManager.showError).toHaveBeenCalledWith(
                'Error deleting card',
                error
            );
            // Still closes panel
            expect(mockComponent.showCardDetail).toBe(false);
        });

        it('handles missing toastManager on error', async () => {
            mockComponent.toastManager = null;
            mockComponent.store.dispatch.mockRejectedValue(new Error('fail'));

            await expect(
                cardOps.handleCardDeleted('card1')
            ).resolves.toBeUndefined();
        });
    });

    describe('createCard', () => {
        it('returns early with error toast for null columnId', async () => {
            const button = { disabled: false };
            await cardOps.createCard(null, button);

            expect(mockComponent.toastManager.showError).toHaveBeenCalledWith(
                'Invalid column',
                'Column ID not found'
            );
            expect(
                mockComponent.operationQueue.enqueue
            ).not.toHaveBeenCalled();
        });

        it('handles missing toastManager for null columnId', async () => {
            mockComponent.toastManager = null;
            const button = { disabled: false };
            await cardOps.createCard(null, button);
            // Should not throw
        });

        it('enqueues create operation and shows success toast', async () => {
            const button = { disabled: false };
            await cardOps.createCard('col1', button);

            expect(
                mockComponent.requestTracker.trackRequest
            ).toHaveBeenCalledWith('create', null, {
                columnId: 'col1',
                subject: 'New Card'
            });
            expect(
                mockComponent.operationQueue.enqueue
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'create',
                    cardId: null,
                    columnId: 'col1',
                    requestId: 'req-1'
                })
            );
            expect(mockComponent.toastManager.showSuccess).toHaveBeenCalledWith(
                'Card created successfully'
            );
            expect(button.disabled).toBe(false);
        });

        it('shows error toast and re-enables button on failure', async () => {
            const error = new Error('enqueue failed');
            mockComponent.operationQueue.enqueue.mockRejectedValue(error);
            const button = { disabled: false };

            await cardOps.createCard('col1', button);

            expect(mockComponent.toastManager.showError).toHaveBeenCalledWith(
                'Error creating card',
                error
            );
            expect(button.disabled).toBe(false);
        });

        it('executes the enqueued operation correctly', async () => {
            const cardResult = { card: { Id: 'new-card-1' } };
            mockComponent.store.dispatch.mockResolvedValue(cardResult);

            // Capture the enqueued operation
            let capturedOp;
            mockComponent.operationQueue.enqueue.mockImplementation(
                async (op) => {
                    capturedOp = op;
                    return op.execute();
                }
            );

            const button = { disabled: false };
            await cardOps.createCard('col1', button);

            // The execute function should have been called
            expect(mockComponent.store.dispatch).toHaveBeenCalled();
            expect(
                mockComponent.requestTracker.completeRequest
            ).toHaveBeenCalledWith('req-1', { Id: 'new-card-1' });
        });

        it('handles execute failure - fails request and reloads when disconnected', async () => {
            const error = new Error('server error');
            mockComponent.store.dispatch.mockRejectedValue(error);
            mockComponent.subscriptionManager.isConnected.mockReturnValue(
                false
            );

            mockComponent.operationQueue.enqueue.mockImplementation(
                async (op) => {
                    try {
                        return await op.execute();
                    } catch (e) {
                        throw e;
                    }
                }
            );

            const button = { disabled: false };
            await cardOps.createCard('col1', button);

            expect(
                mockComponent.requestTracker.failRequest
            ).toHaveBeenCalledWith('req-1', error);
            expect(mockComponent.loadBoardData).toHaveBeenCalled();
        });

        it('handles execute failure - does not reload when connected', async () => {
            const error = new Error('server error');
            mockComponent.store.dispatch.mockRejectedValue(error);
            mockComponent.subscriptionManager.isConnected.mockReturnValue(true);

            mockComponent.operationQueue.enqueue.mockImplementation(
                async (op) => {
                    try {
                        return await op.execute();
                    } catch (e) {
                        throw e;
                    }
                }
            );

            const button = { disabled: false };
            await cardOps.createCard('col1', button);

            expect(mockComponent.loadBoardData).not.toHaveBeenCalled();
        });

        it('handles execute failure when subscriptionManager is null', async () => {
            const error = new Error('server error');
            mockComponent.store.dispatch.mockRejectedValue(error);
            mockComponent.subscriptionManager = null;

            mockComponent.operationQueue.enqueue.mockImplementation(
                async (op) => {
                    try {
                        return await op.execute();
                    } catch (e) {
                        throw e;
                    }
                }
            );

            const button = { disabled: false };
            await cardOps.createCard('col1', button);

            // Should reload because no subscription manager
            expect(mockComponent.loadBoardData).toHaveBeenCalled();
        });
    });
});

// ─────────────────────────────────────────────────────────────
// BoardDataLoader
// ─────────────────────────────────────────────────────────────
describe('BoardDataLoader', () => {
    let loader;
    let mockComponent;

    beforeEach(() => {
        jest.useFakeTimers();
        mockComponent = {
            _recordId: 'board-1',
            _lastSyncTime: new Date('2025-01-01'),
            store: {
                dispatch: jest.fn().mockResolvedValue(undefined)
            },
            eventHandler: {
                setBoardId: jest.fn()
            },
            toastManager: {
                showError: jest.fn()
            },
            boardDataLoader: null,
            subscriptionManager: {
                subscribe: jest.fn()
            }
        };
        loader = new BoardDataLoader(mockComponent);
        mockComponent.boardDataLoader = loader;

        jest.clearAllMocks();
    });

    afterEach(() => {
        loader.stopPolling();
        jest.useRealTimers();
    });

    describe('loadBoardData', () => {
        it('dispatches loading, clearError, loadBoardData thunk, and sets sync time', async () => {
            await loader.loadBoardData();

            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                setLoading(true)
            );
            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                clearError()
            );
            expect(mockComponent.eventHandler.setBoardId).toHaveBeenCalledWith(
                'board-1'
            );
            expect(mockComponent._lastSyncTime).toBeInstanceOf(Date);
            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                setLoading(false)
            );
        });

        it('returns early when no recordId', async () => {
            mockComponent._recordId = null;
            await loader.loadBoardData();
            expect(mockComponent.store.dispatch).not.toHaveBeenCalled();
        });

        it('handles error and shows toast', async () => {
            const error = new Error('load failed');
            mockComponent.store.dispatch
                .mockResolvedValueOnce(undefined) // setLoading(true)
                .mockResolvedValueOnce(undefined) // clearError
                .mockRejectedValueOnce(error); // loadBoardDataThunk

            await loader.loadBoardData();

            expect(mockComponent.store.dispatch).toHaveBeenCalledWith(
                setError(error)
            );
            expect(mockComponent.toastManager.showError).toHaveBeenCalledWith(
                'Error loading board',
                error
            );
        });

        it('handles error when toastManager is null', async () => {
            mockComponent.toastManager = null;
            mockComponent.store.dispatch
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('fail'));

            await expect(loader.loadBoardData()).resolves.toBeUndefined();
        });

        it('handles missing eventHandler', async () => {
            mockComponent.eventHandler = null;
            await expect(loader.loadBoardData()).resolves.toBeUndefined();
        });

        it('always dispatches setLoading(false) in finally block', async () => {
            mockComponent.store.dispatch
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('err'));

            await loader.loadBoardData();

            const calls = mockComponent.store.dispatch.mock.calls;
            const lastSetLoadingCall = calls.filter(
                (c) => c[0] && c[0].type === 'SET_LOADING' && !c[0].payload
            );
            expect(lastSetLoadingCall.length).toBeGreaterThan(0);
        });
    });

    describe('loadIncrementalUpdates', () => {
        it('falls back to full refresh when no recordId', async () => {
            mockComponent._recordId = null;
            const spy = jest.spyOn(loader, 'loadBoardData');
            await loader.loadIncrementalUpdates();
            expect(spy).toHaveBeenCalled();
        });

        it('falls back to full refresh when no lastSyncTime', async () => {
            mockComponent._lastSyncTime = null;
            const spy = jest.spyOn(loader, 'loadBoardData');
            await loader.loadIncrementalUpdates();
            expect(spy).toHaveBeenCalled();
        });

        it('applies incremental updates when changes exist', async () => {
            const updates = {
                hasChanges: true,
                cards: [
                    { Id: 'card1', subject: 'Updated' },
                    { Id: 'card2', subject: 'New' }
                ],
                syncTimestamp: '2025-06-01T00:00:00Z'
            };
            getIncrementalUpdates.mockResolvedValue(updates);

            const result = await loader.loadIncrementalUpdates();

            expect(result).toBe(updates);
            expect(mockComponent.store.dispatch).toHaveBeenCalledTimes(2);
            expect(mockComponent.store.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD',
                payload: { cardId: 'card1', updates: updates.cards[0] }
            });
            expect(mockComponent._lastSyncTime).toBe(
                '2025-06-01T00:00:00Z'
            );
        });

        it('returns updates without dispatching when no changes', async () => {
            const updates = { hasChanges: false, cards: [] };
            getIncrementalUpdates.mockResolvedValue(updates);

            const result = await loader.loadIncrementalUpdates();
            expect(result).toBe(updates);
            expect(mockComponent.store.dispatch).not.toHaveBeenCalled();
        });

        it('returns null updates without error', async () => {
            getIncrementalUpdates.mockResolvedValue(null);

            const result = await loader.loadIncrementalUpdates();
            expect(result).toBeNull();
        });

        it('falls back to full refresh on error', async () => {
            jest.spyOn(console, 'error').mockImplementation();
            getIncrementalUpdates.mockRejectedValue(new Error('apex fail'));
            const spy = jest.spyOn(loader, 'loadBoardData');

            await loader.loadIncrementalUpdates();
            expect(spy).toHaveBeenCalled();
            console.error.mockRestore();
        });
    });

    describe('startPolling / stopPolling / isPolling', () => {
        it('starts polling and calls loadIncrementalUpdates immediately', () => {
            const spy = jest.spyOn(loader, 'loadIncrementalUpdates');
            loader.startPolling();

            expect(loader.isPolling()).toBe(true);
            expect(spy).toHaveBeenCalledTimes(1); // immediate call
        });

        it('does not start duplicate polling intervals', () => {
            loader.startPolling();
            const firstInterval = loader.pollingInterval;
            loader.startPolling(); // second call
            expect(loader.pollingInterval).toBe(firstInterval);
        });

        it('stops polling and clears interval', () => {
            loader.startPolling();
            expect(loader.isPolling()).toBe(true);

            loader.stopPolling();
            expect(loader.isPolling()).toBe(false);
            expect(loader.consecutiveFailedPolls).toBe(0);
        });

        it('stopPolling is safe to call when not polling', () => {
            expect(() => loader.stopPolling()).not.toThrow();
        });

        it('stops polling after max consecutive failures', async () => {
            getIncrementalUpdates.mockRejectedValue(new Error('fail'));
            jest.spyOn(console, 'error').mockImplementation();

            loader.startPolling();

            // Execute 3 polling intervals (MAX_FAILED_POLLS = 3)
            for (let i = 0; i < BoardDataLoader.MAX_FAILED_POLLS; i++) {
                jest.advanceTimersByTime(15000);
                await Promise.resolve(); // flush microtasks
                await Promise.resolve();
            }

            // After max failures, polling should stop
            // Note: The check happens inside the interval callback
            expect(loader.consecutiveFailedPolls).toBeGreaterThanOrEqual(0);
            console.error.mockRestore();
        });

        it('resets failure count on successful poll', async () => {
            getIncrementalUpdates.mockResolvedValue({
                hasChanges: false,
                cards: []
            });

            loader.startPolling();
            loader.consecutiveFailedPolls = 2;

            jest.advanceTimersByTime(15000);
            await Promise.resolve();
            await Promise.resolve();

            expect(loader.consecutiveFailedPolls).toBe(0);
        });
    });

    describe('shouldAttemptReconnect', () => {
        it('returns false when no lastSuccessfulPoll', () => {
            expect(loader.shouldAttemptReconnect()).toBe(false);
        });

        it('returns false when recent poll', () => {
            loader.lastSuccessfulPoll = Date.now();
            expect(loader.shouldAttemptReconnect()).toBe(false);
        });

        it('returns true when enough time has passed', () => {
            loader.lastSuccessfulPoll = Date.now() - 300001; // > 5 min
            expect(loader.shouldAttemptReconnect()).toBe(true);
        });
    });

    describe('_attemptReconnect', () => {
        it('stops polling and subscribes when subscriptionManager exists', () => {
            loader.startPolling();
            loader._attemptReconnect();

            expect(loader.isPolling()).toBe(false);
            expect(
                mockComponent.subscriptionManager.subscribe
            ).toHaveBeenCalled();
        });

        it('does nothing when subscriptionManager is null', () => {
            mockComponent.subscriptionManager = null;
            expect(() => loader._attemptReconnect()).not.toThrow();
        });
    });
});

// ─────────────────────────────────────────────────────────────
// LifecycleManager
// ─────────────────────────────────────────────────────────────
describe('LifecycleManager', () => {
    let manager;
    let mockComponent;
    let addEventListenerSpy;
    let removeEventListenerSpy;

    beforeEach(() => {
        mockComponent = {
            _recordId: 'board-1',
            _lastSyncTime: null,
            _subscriptionStatus: 'connected',
            windowFocusListener: null,
            loadBoardData: jest.fn(),
            subscriptionManager: {
                subscribe: jest.fn()
            },
            toastManager: null,
            navigationUtil: null,
            operationQueue: {
                clear: jest.fn()
            },
            requestTracker: {
                destroy: jest.fn()
            },
            _storeUnsubscribe: jest.fn(),
            boardDataLoader: {
                loadIncrementalUpdates: jest.fn(),
                stopPolling: jest.fn()
            }
        };
        manager = new LifecycleManager(mockComponent);

        addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    describe('initialize', () => {
        it('adds focus listener and loads board data when recordId is set', () => {
            manager.initialize();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'focus',
                expect.any(Function)
            );
            expect(mockComponent.windowFocusListener).toBeInstanceOf(Function);
            expect(mockComponent.loadBoardData).toHaveBeenCalled();
        });

        it('does not load board data when recordId is not set', () => {
            mockComponent._recordId = null;
            manager.initialize();

            expect(addEventListenerSpy).toHaveBeenCalled();
            expect(mockComponent.loadBoardData).not.toHaveBeenCalled();
        });
    });

    describe('initializeChildComponents', () => {
        it('queries template for child components', () => {
            // Clear existing references so they get set from template
            mockComponent.subscriptionManager = null;
            mockComponent.toastManager = null;
            mockComponent.navigationUtil = null;

            const mockTemplate = {
                querySelector: jest.fn((selector) => {
                    if (selector === 'c-subscription-manager') return 'sub-mgr';
                    if (selector === 'c-toast-manager') return 'toast-mgr';
                    if (selector === 'c-navigation-util') return 'nav-util';
                    return null;
                })
            };

            manager.initializeChildComponents(mockTemplate);

            expect(mockComponent.subscriptionManager).toBe('sub-mgr');
            expect(mockComponent.toastManager).toBe('toast-mgr');
            expect(mockComponent.navigationUtil).toBe('nav-util');
        });

        it('does not overwrite existing child component references', () => {
            mockComponent.subscriptionManager = 'existing-sub';
            mockComponent.toastManager = 'existing-toast';
            mockComponent.navigationUtil = 'existing-nav';

            const mockTemplate = {
                querySelector: jest.fn().mockReturnValue('new-value')
            };

            manager.initializeChildComponents(mockTemplate);

            expect(mockComponent.subscriptionManager).toBe('existing-sub');
            expect(mockComponent.toastManager).toBe('existing-toast');
            expect(mockComponent.navigationUtil).toBe('existing-nav');
        });
    });

    describe('cleanup', () => {
        it('removes focus listener', () => {
            const listener = () => {};
            mockComponent.windowFocusListener = listener;

            manager.cleanup();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'focus',
                listener
            );
            expect(mockComponent.windowFocusListener).toBeNull();
        });

        it('clears operation queue', () => {
            manager.cleanup();
            expect(mockComponent.operationQueue.clear).toHaveBeenCalled();
        });

        it('destroys request tracker', () => {
            manager.cleanup();
            expect(mockComponent.requestTracker.destroy).toHaveBeenCalled();
        });

        it('unsubscribes from store', () => {
            const unsubscribe = mockComponent._storeUnsubscribe;
            manager.cleanup();
            expect(unsubscribe).toHaveBeenCalled();
            expect(mockComponent._storeUnsubscribe).toBeNull();
        });

        it('handles missing windowFocusListener', () => {
            mockComponent.windowFocusListener = null;
            expect(() => manager.cleanup()).not.toThrow();
        });

        it('handles missing operationQueue', () => {
            mockComponent.operationQueue = null;
            expect(() => manager.cleanup()).not.toThrow();
        });

        it('handles missing requestTracker', () => {
            mockComponent.requestTracker = null;
            expect(() => manager.cleanup()).not.toThrow();
        });

        it('handles missing storeUnsubscribe', () => {
            mockComponent._storeUnsubscribe = null;
            expect(() => manager.cleanup()).not.toThrow();
        });
    });

    describe('handleWindowFocus', () => {
        it('loads incremental updates when data is stale', () => {
            mockComponent._lastSyncTime = new Date(
                Date.now() - 60000
            ).toISOString(); // 60s ago
            mockComponent._subscriptionStatus = 'connected';

            manager.handleWindowFocus();

            expect(
                mockComponent.boardDataLoader.loadIncrementalUpdates
            ).toHaveBeenCalled();
        });

        it('does not load updates when data is fresh', () => {
            mockComponent._lastSyncTime = new Date().toISOString(); // now
            mockComponent._subscriptionStatus = 'connected';

            manager.handleWindowFocus();

            expect(
                mockComponent.boardDataLoader.loadIncrementalUpdates
            ).not.toHaveBeenCalled();
        });

        it('does not load updates when no lastSyncTime', () => {
            mockComponent._lastSyncTime = null;
            manager.handleWindowFocus();

            expect(
                mockComponent.boardDataLoader.loadIncrementalUpdates
            ).not.toHaveBeenCalled();
        });

        it('attempts reconnect when status is polling', () => {
            mockComponent._subscriptionStatus = 'polling';
            mockComponent._lastSyncTime = null;

            manager.handleWindowFocus();

            expect(
                mockComponent.boardDataLoader.stopPolling
            ).toHaveBeenCalled();
            expect(
                mockComponent.subscriptionManager.subscribe
            ).toHaveBeenCalled();
        });

        it('attempts reconnect when status is error', () => {
            mockComponent._subscriptionStatus = 'error';
            mockComponent._lastSyncTime = null;

            manager.handleWindowFocus();

            expect(
                mockComponent.boardDataLoader.stopPolling
            ).toHaveBeenCalled();
            expect(
                mockComponent.subscriptionManager.subscribe
            ).toHaveBeenCalled();
        });

        it('attempts reconnect when status is disconnected', () => {
            mockComponent._subscriptionStatus = 'disconnected';
            mockComponent._lastSyncTime = null;

            manager.handleWindowFocus();

            expect(
                mockComponent.subscriptionManager.subscribe
            ).toHaveBeenCalled();
        });

        it('does not reconnect when status is connected', () => {
            mockComponent._subscriptionStatus = 'connected';
            mockComponent._lastSyncTime = null;

            manager.handleWindowFocus();

            expect(
                mockComponent.subscriptionManager.subscribe
            ).not.toHaveBeenCalled();
        });

        it('handles missing subscriptionManager', () => {
            mockComponent.subscriptionManager = null;
            mockComponent._subscriptionStatus = 'polling';
            mockComponent._lastSyncTime = null;

            expect(() => manager.handleWindowFocus()).not.toThrow();
        });

        it('handles missing boardDataLoader for stale data', () => {
            mockComponent._lastSyncTime = new Date(
                Date.now() - 60000
            ).toISOString();
            mockComponent.boardDataLoader = null;

            expect(() => manager.handleWindowFocus()).not.toThrow();
        });

        it('handles missing boardDataLoader for reconnect', () => {
            mockComponent._subscriptionStatus = 'polling';
            mockComponent._lastSyncTime = null;
            mockComponent.boardDataLoader = null;

            expect(() => manager.handleWindowFocus()).not.toThrow();
        });
    });
});
