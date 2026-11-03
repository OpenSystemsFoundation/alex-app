/**
 * Unit tests for ReducerQueue — sequential processing and operation reduction
 */
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
    }))
}));

import ReducerQueue from '../../helpers/reducerQueue';

const flushPromises = () =>
    new Promise((resolve) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(resolve, 0);
    });

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function createStore() {
    return { dispatch: jest.fn() };
}

describe('ReducerQueue', () => {
    let store;
    let queue;

    beforeEach(() => {
        store = createStore();
        queue = new ReducerQueue(store);
    });

    describe('initial state', () => {
        it('starts empty and idle', () => {
            expect(queue.store).toBe(store);
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isQueueProcessing()).toBe(false);
            expect(queue.getCurrentOperation()).toBeNull();
            expect(queue.hasPendingOperations('c1')).toBeFalsy();
            expect(queue.getPendingOperations('c1')).toEqual([]);
        });

        it('generates unique operation ids', () => {
            const a = queue._generateOperationId();
            const b = queue._generateOperationId();
            expect(a).toMatch(/^op-\d+-[a-z0-9]+$/);
            expect(a).not.toBe(b);
        });
    });

    describe('processing', () => {
        it('executes an operation and dispatches start/complete actions', async () => {
            const onStart = jest.fn();
            const onComplete = jest.fn();
            queue.onOperationStart = onStart;
            queue.onOperationComplete = onComplete;

            const result = await queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: jest.fn(() => Promise.resolve('done'))
            });

            expect(result).toBe('done');
            expect(store.dispatch).toHaveBeenCalledTimes(2);
            const [start] = store.dispatch.mock.calls[0];
            const [complete] = store.dispatch.mock.calls[1];
            expect(start.type).toBe('START_OPERATION');
            expect(start.payload).toMatchObject({ type: 'move', cardId: 'c1' });
            expect(complete).toEqual({
                type: 'COMPLETE_OPERATION',
                payload: { id: start.payload.id }
            });
            expect(onStart).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'completed', type: 'move' })
            );
            expect(onComplete).toHaveBeenCalledWith(
                expect.objectContaining({ result: 'done' }),
                'done'
            );
            expect(queue.cardOperations.has('c1')).toBe(false);
            expect(queue.isQueueProcessing()).toBe(false);
        });

        it('executes operations without a cardId and without callbacks', async () => {
            const result = await queue.enqueue({
                type: 'create',
                execute: () => Promise.resolve(42)
            });
            expect(result).toBe(42);
            expect(queue.cardOperations.size).toBe(0);
        });

        it('rejects and dispatches failOperation when execute throws', async () => {
            const onFailed = jest.fn();
            queue.onOperationFailed = onFailed;
            const error = new Error('server down');

            await expect(
                queue.enqueue({
                    type: 'update',
                    cardId: 'c1',
                    execute: () => Promise.reject(error)
                })
            ).rejects.toBe(error);

            const failAction = store.dispatch.mock.calls[1][0];
            expect(failAction.type).toBe('FAIL_OPERATION');
            expect(failAction.payload.message).toBe('server down');
            expect(onFailed).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'failed', error }),
                error
            );
            expect(queue.cardOperations.has('c1')).toBe(false);
        });

        it('rejects without callbacks or cardId on failure', async () => {
            await expect(
                queue.enqueue({
                    type: 'create',
                    execute: () => Promise.reject(new Error('nope'))
                })
            ).rejects.toThrow('nope');
            expect(queue.isQueueProcessing()).toBe(false);
        });

        it('processes queued operations sequentially', async () => {
            const order = [];
            const first = deferred();
            const p1 = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => {
                    order.push('first-start');
                    return first.promise;
                }
            });
            const p2 = queue.enqueue({
                type: 'move',
                cardId: 'c2',
                execute: () => {
                    order.push('second-start');
                    return Promise.resolve('second');
                }
            });

            expect(queue.isQueueProcessing()).toBe(true);
            expect(queue.getQueueLength()).toBe(1);
            expect(queue.getCurrentOperation().cardId).toBe('c1');
            expect(order).toEqual(['first-start']);

            first.resolve('first');
            await expect(p1).resolves.toBe('first');
            await expect(p2).resolves.toBe('second');
            expect(order).toEqual(['first-start', 'second-start']);
            expect(queue.getQueueLength()).toBe(0);
        });

        it('keeps remaining card ops tracked after one completes', async () => {
            const first = deferred();
            const second = deferred();
            const p1 = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => first.promise
            });
            // create is never reduced, so both are queued for c1
            queue.enqueue({
                type: 'create',
                cardId: 'c1',
                execute: () => second.promise
            });

            first.resolve('ok');
            await p1;
            await flushPromises();

            expect(queue.cardOperations.get('c1')).toHaveLength(1);
            expect(queue.hasPendingOperations('c1')).toBe(true);
        });

        it('tolerates card tracking being cleared while an op runs', async () => {
            const a = deferred();
            const b = deferred();
            const pA = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => a.promise
            });
            const opA = queue.getCurrentOperation();
            queue.clear();

            // Start a second op for the same card; A is not in its list
            const pB = queue.enqueue({
                type: 'update',
                cardId: 'c1',
                execute: () => b.promise
            });
            expect(opA.status).toBe('processing');

            a.resolve('a');
            await expect(pA).resolves.toBe('a');
            expect(queue.cardOperations.get('c1')).toHaveLength(1);

            b.resolve('b');
            await expect(pB).resolves.toBe('b');
            expect(queue.cardOperations.has('c1')).toBe(false);
        });

        it('tolerates missing card tracking on success and failure', async () => {
            const a = deferred();
            const pA = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => a.promise
            });
            queue.cardOperations.clear();
            a.resolve('a');
            await expect(pA).resolves.toBe('a');

            const b = deferred();
            const pB = queue.enqueue({
                type: 'move',
                cardId: 'c2',
                execute: () => b.promise
            });
            queue.cardOperations.clear();
            b.reject(new Error('fail'));
            await expect(pB).rejects.toThrow('fail');
            expect(queue.isQueueProcessing()).toBe(false);
        });

        it('removes a failed op but keeps sibling ops for the card', async () => {
            const a = deferred();
            const pA = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => a.promise
            });
            const opA = queue.getCurrentOperation();
            queue.clear();
            queue.enqueue({
                type: 'update',
                cardId: 'c1',
                execute: () => new Promise(() => {})
            });

            a.reject(new Error('x'));
            await expect(pA).rejects.toThrow('x');
            expect(queue.cardOperations.get('c1')).not.toContain(opA);
            expect(queue.cardOperations.get('c1')).toHaveLength(1);
        });

        it('processNext is a no-op while processing or when empty', async () => {
            await queue.processNext();
            expect(store.dispatch).not.toHaveBeenCalled();

            queue.isProcessing = true;
            queue.queue.push({ id: 'x', execute: jest.fn() });
            await queue.processNext();
            expect(queue.queue[0].execute).not.toHaveBeenCalled();
        });
    });

    describe('operation reduction', () => {
        function blockQueue() {
            // Keeps the queue busy so later ops stay queued
            const blocker = deferred();
            queue.enqueue({
                type: 'move',
                cardId: 'blocker',
                execute: () => blocker.promise
            });
            return blocker;
        }

        it('does not reduce into an operation that is already processing', () => {
            const running = deferred();
            queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => running.promise
            });
            queue.enqueue({
                type: 'move',
                cardId: 'c1',
                targetColumnId: 'col2',
                execute: jest.fn()
            });

            expect(queue.getQueueLength()).toBe(1);
            expect(queue.getPendingOperations('c1')).toHaveLength(3);
        });

        it('skips completed operations when reducing', () => {
            blockQueue();
            queue.cardOperations.set('c1', [
                { status: 'completed', type: 'move' }
            ]);
            queue.enqueue({ type: 'move', cardId: 'c1', execute: jest.fn() });
            expect(queue.getQueueLength()).toBe(1);
            expect(queue.cardOperations.get('c1')).toHaveLength(2);
        });

        it('merges consecutive queued moves for the same card', () => {
            blockQueue();
            queue.enqueue({
                type: 'move',
                cardId: 'c1',
                targetColumnId: 'col1',
                targetIndex: 0,
                execute: jest.fn()
            });
            queue.enqueue({
                type: 'move',
                cardId: 'c1',
                targetColumnId: 'col3',
                targetIndex: 4,
                execute: jest.fn()
            });

            expect(queue.getQueueLength()).toBe(1);
            const merged = queue.queue[0];
            expect(merged.targetColumnId).toBe('col3');
            expect(merged.targetIndex).toBe(4);
            expect(typeof merged.reducedAt).toBe('number');
            expect(typeof merged._originalResolve).toBe('function');
            expect(typeof merged._originalReject).toBe('function');
        });

        it('merges consecutive queued updates for the same card', () => {
            blockQueue();
            queue.enqueue({
                type: 'update',
                cardId: 'c1',
                updates: { subject: 'A', priority: 'Low' },
                execute: jest.fn()
            });
            queue.enqueue({
                type: 'update',
                cardId: 'c1',
                updates: { priority: 'High' },
                execute: jest.fn()
            });

            expect(queue.getQueueLength()).toBe(1);
            expect(queue.queue[0].updates).toEqual({
                subject: 'A',
                priority: 'High'
            });
            expect(typeof queue.queue[0].reducedAt).toBe('number');
        });

        it('forwards the merged move result to newer and original callers', async () => {
            blockQueue();
            queue.enqueue({ type: 'move', cardId: 'c1', execute: jest.fn() });
            const newer = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: jest.fn()
            });
            const merged = queue.queue[0];
            // Stub the captured original to isolate the wrapper's forwarding
            merged._originalResolve = jest.fn();

            merged.resolve('moved');

            await expect(newer).resolves.toBe('moved');
            expect(merged._originalResolve).toHaveBeenCalledWith('moved');
        });

        it('forwards the merged move rejection to newer and original callers', async () => {
            blockQueue();
            queue.enqueue({ type: 'move', cardId: 'c1', execute: jest.fn() });
            const newer = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: jest.fn()
            });
            const merged = queue.queue[0];
            // Stub the captured original to isolate the wrapper's forwarding
            merged._originalReject = jest.fn();
            const error = new Error('bad');

            merged.reject(error);

            await expect(newer).rejects.toBe(error);
            expect(merged._originalReject).toHaveBeenCalledWith(error);
        });

        it('forwards the merged update result and rejection to callers', async () => {
            blockQueue();
            queue.enqueue({ type: 'update', cardId: 'c1', execute: jest.fn() });
            const newer = queue.enqueue({
                type: 'update',
                cardId: 'c1',
                execute: jest.fn()
            });
            const merged = queue.queue[0];
            merged._originalResolve = jest.fn();
            merged.resolve('upd');
            await expect(newer).resolves.toBe('upd');
            expect(merged._originalResolve).toHaveBeenCalledWith('upd');

            queue.enqueue({ type: 'update', cardId: 'c2', execute: jest.fn() });
            const newer2 = queue.enqueue({
                type: 'update',
                cardId: 'c2',
                execute: jest.fn()
            });
            const merged2 = queue.queue[1];
            merged2._originalReject = jest.fn();
            const error = new Error('upd-fail');
            merged2.reject(error);
            await expect(newer2).rejects.toBe(error);
            expect(merged2._originalReject).toHaveBeenCalledWith(error);
        });

        it('does not merge a move into a pending create for a temp card', () => {
            blockQueue();
            queue.enqueue({
                type: 'create',
                cardId: 'temp-123',
                execute: jest.fn()
            });
            queue.enqueue({
                type: 'move',
                cardId: 'temp-123',
                execute: jest.fn()
            });

            expect(queue.getQueueLength()).toBe(2);
            expect(queue.queue.map((op) => op.type)).toEqual([
                'create',
                'move'
            ]);
        });

        it('does not merge a move into a create for a non-temp card', () => {
            blockQueue();
            queue.enqueue({
                type: 'create',
                cardId: 'real-1',
                execute: jest.fn()
            });
            queue.enqueue({
                type: 'move',
                cardId: 'real-1',
                execute: jest.fn()
            });
            expect(queue.getQueueLength()).toBe(2);
        });

        it('does not merge different operation types', () => {
            blockQueue();
            queue.enqueue({ type: 'move', cardId: 'c1', execute: jest.fn() });
            queue.enqueue({ type: 'update', cardId: 'c1', execute: jest.fn() });
            queue.enqueue({ type: 'create', cardId: 'c1', execute: jest.fn() });
            expect(queue.getQueueLength()).toBe(3);
        });

        it('cancels a queued operation when the card is deleted', async () => {
            blockQueue();
            const pending = queue.enqueue({
                type: 'update',
                cardId: 'c1',
                execute: jest.fn()
            });
            const updateOp = queue.queue[0];
            queue.enqueue({ type: 'delete', cardId: 'c1', execute: jest.fn() });

            await expect(pending).rejects.toThrow(
                'Operation cancelled by delete'
            );
            expect(updateOp.status).toBe('cancelled');
            expect(queue.queue.map((op) => op.type)).toEqual(['delete']);
        });

        it('cancels a tracked op that is no longer in the queue', () => {
            blockQueue();
            const orphan = { status: 'queued', type: 'update', reject: null };
            queue.cardOperations.set('c1', [orphan]);
            queue.enqueue({ type: 'delete', cardId: 'c1', execute: jest.fn() });

            expect(orphan.status).toBe('cancelled');
            expect(queue.queue.map((op) => op.type)).toEqual(['delete']);
        });
    });

    describe('pending operation queries', () => {
        it('reports the current operation as pending for its card', () => {
            queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: () => new Promise(() => {})
            });
            const current = queue.getCurrentOperation();
            queue.cardOperations.clear();

            expect(queue.hasPendingOperations('c1')).toBe(true);
            expect(queue.getPendingOperations('c1')).toEqual([current]);
            expect(queue.hasPendingOperations('c2')).toBeFalsy();
        });

        it('reports queued card operations as pending', () => {
            queue.enqueue({
                type: 'move',
                cardId: 'other',
                execute: () => new Promise(() => {})
            });
            queue.enqueue({ type: 'update', cardId: 'c1', execute: jest.fn() });

            expect(queue.hasPendingOperations('c1')).toBe(true);
            expect(queue.getPendingOperations('c1')).toHaveLength(1);
            expect(queue.getPendingOperations('c1')[0].type).toBe('update');
        });

        it('reports false when the card list is empty', () => {
            queue.cardOperations.set('c1', []);
            expect(queue.hasPendingOperations('c1')).toBe(false);
        });
    });

    describe('clear', () => {
        it('rejects queued operations and resets state', async () => {
            queue.enqueue({
                type: 'move',
                cardId: 'c0',
                execute: () => new Promise(() => {})
            });
            const queued = queue.enqueue({
                type: 'move',
                cardId: 'c1',
                execute: jest.fn()
            });
            queue.queue.push({ id: 'no-reject' });

            queue.clear();

            await expect(queued).rejects.toThrow('Queue cleared');
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.cardOperations.size).toBe(0);
            expect(queue.getCurrentOperation()).toBeNull();
            expect(queue.isQueueProcessing()).toBe(false);
        });
    });
});
