export default class ReducerQueue {
    constructor(store) {
        this.store = store;
        this.queue = [];
        this.currentOperation = null;
        this.isProcessing = false;
        this.cardOperations = new Map();
        this.onOperationStart = null;
        this.onOperationComplete = null;
        this.onOperationFailed = null;
    }

    enqueue(operation) {
        return new Promise((resolve, reject) => {
            const queuedOperation = {
                ...operation,
                resolve,
                reject,
                status: 'queued',
                queuedAt: Date.now(),
                id: this._generateOperationId()
            };

            const reduced = this._tryReduceOperation(queuedOperation);

            if (reduced) {
                return;
            }

            this.queue.push(queuedOperation);

            if (operation.cardId) {
                if (!this.cardOperations.has(operation.cardId)) {
                    this.cardOperations.set(operation.cardId, []);
                }
                this.cardOperations.get(operation.cardId).push(queuedOperation);
            }

            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }

    _tryReduceOperation(newOperation) {
        const { cardId, type } = newOperation;

        if (!cardId || !this.cardOperations.has(cardId)) {
            return false;
        }

        const pendingOps = this.cardOperations.get(cardId);

        for (let i = pendingOps.length - 1; i >= 0; i--) {
            const existingOp = pendingOps[i];

            if (
                existingOp.status === 'processing' ||
                existingOp.status === 'completed'
            ) {
                continue;
            }

            if (type === 'move' && existingOp.type === 'move') {
                existingOp.targetColumnId = newOperation.targetColumnId;
                existingOp.targetIndex = newOperation.targetIndex;
                existingOp.reducedAt = Date.now();

                existingOp.resolve = (result) => {
                    newOperation.resolve(result);
                    if (existingOp._originalResolve) {
                        existingOp._originalResolve(result);
                    }
                };

                existingOp.reject = (error) => {
                    newOperation.reject(error);
                    if (existingOp._originalReject) {
                        existingOp._originalReject(error);
                    }
                };

                if (!existingOp._originalResolve) {
                    existingOp._originalResolve = existingOp.resolve;
                    existingOp._originalReject = existingOp.reject;
                }

                return true;
            }

            if (
                type === 'move' &&
                existingOp.type === 'create' &&
                cardId.startsWith('temp-')
            ) {
                return false;
            }

            if (type === 'update' && existingOp.type === 'update') {
                existingOp.updates = {
                    ...existingOp.updates,
                    ...newOperation.updates
                };
                existingOp.reducedAt = Date.now();

                existingOp.resolve = (result) => {
                    newOperation.resolve(result);
                    if (existingOp._originalResolve) {
                        existingOp._originalResolve(result);
                    }
                };

                existingOp.reject = (error) => {
                    newOperation.reject(error);
                    if (existingOp._originalReject) {
                        existingOp._originalReject(error);
                    }
                };

                if (!existingOp._originalResolve) {
                    existingOp._originalResolve = existingOp.resolve;
                    existingOp._originalReject = existingOp.reject;
                }

                return true;
            }

            if (type === 'delete') {
                existingOp.status = 'cancelled';
                if (existingOp.reject) {
                    existingOp.reject(
                        new Error('Operation cancelled by delete')
                    );
                }

                const queueIndex = this.queue.indexOf(existingOp);
                if (queueIndex !== -1) {
                    this.queue.splice(queueIndex, 1);
                }

                return false;
            }
        }

        return false;
    }

    async processNext() {
        if (this.isProcessing) {
            return;
        }

        if (this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        const operation = this.queue.shift();
        this.currentOperation = operation;

        try {
            operation.status = 'processing';
            operation.startedAt = Date.now();

            if (this.onOperationStart) {
                this.onOperationStart(operation);
            }

            const result = await operation.execute();

            operation.status = 'completed';
            operation.completedAt = Date.now();
            operation.result = result;

            if (this.onOperationComplete) {
                this.onOperationComplete(operation, result);
            }

            operation.resolve(result);

            if (operation.cardId) {
                const cardOps = this.cardOperations.get(operation.cardId);
                if (cardOps) {
                    const index = cardOps.indexOf(operation);
                    if (index !== -1) {
                        cardOps.splice(index, 1);
                    }
                    if (cardOps.length === 0) {
                        this.cardOperations.delete(operation.cardId);
                    }
                }
            }
        } catch (error) {
            operation.status = 'failed';
            operation.failedAt = Date.now();
            operation.error = error;

            if (this.onOperationFailed) {
                this.onOperationFailed(operation, error);
            }

            operation.reject(error);

            if (operation.cardId) {
                const cardOps = this.cardOperations.get(operation.cardId);
                if (cardOps) {
                    const index = cardOps.indexOf(operation);
                    if (index !== -1) {
                        cardOps.splice(index, 1);
                    }
                    if (cardOps.length === 0) {
                        this.cardOperations.delete(operation.cardId);
                    }
                }
            }
        } finally {
            this.currentOperation = null;
            this.isProcessing = false;
            this.processNext();
        }
    }

    _generateOperationId() {
        return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getQueueLength() {
        return this.queue.length;
    }

    isQueueProcessing() {
        return this.isProcessing;
    }

    getCurrentOperation() {
        return this.currentOperation;
    }

    hasPendingOperations(cardId) {
        if (this.currentOperation?.cardId === cardId) {
            return true;
        }

        const cardOps = this.cardOperations.get(cardId);
        return cardOps && cardOps.length > 0;
    }

    getPendingOperations(cardId) {
        const operations = [];

        if (this.currentOperation?.cardId === cardId) {
            operations.push(this.currentOperation);
        }

        const cardOps = this.cardOperations.get(cardId);
        if (cardOps) {
            operations.push(...cardOps);
        }

        return operations;
    }

    clear() {
        this.queue.forEach((op) => {
            if (op.reject) {
                op.reject(new Error('Queue cleared'));
            }
        });

        this.queue = [];
        this.cardOperations.clear();
        this.currentOperation = null;
        this.isProcessing = false;
    }
}
