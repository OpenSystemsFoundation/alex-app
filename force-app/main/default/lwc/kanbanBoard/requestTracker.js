export default class RequestTracker {
    constructor() {
        this.pendingRequests = new Map();
        this.RETENTION_WINDOW = 5000;
        this.CLEANUP_INTERVAL = 10000;
        this.startCleanup();
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    }

    trackRequest(operation, cardId, additionalData = {}) {
        const requestId = this.generateUUID();

        this.pendingRequests.set(requestId, {
            requestId,
            operation,
            cardId,
            status: 'pending',
            timestamp: Date.now(),
            ...additionalData
        });

        return requestId;
    }

    completeRequest(requestId, result = null) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            request.status = 'completed';
            request.completedAt = Date.now();
            request.result = result;
        }
    }

    failRequest(requestId, error = null) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            request.status = 'failed';
            request.failedAt = Date.now();
            request.error = error;
        }
    }

    isPending(requestId) {
        const request = this.pendingRequests.get(requestId);
        return request && request.status === 'pending';
    }

    isOwnRequest(requestId) {
        return this.pendingRequests.has(requestId);
    }

    getRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }

    hasPendingOperations(cardId) {
        for (const request of this.pendingRequests.values()) {
            if (request.cardId === cardId && request.status === 'pending') {
                return true;
            }
        }
        return false;
    }

    getPendingOperations(cardId) {
        const operations = [];
        for (const request of this.pendingRequests.values()) {
            if (request.cardId === cardId && request.status === 'pending') {
                operations.push(request);
            }
        }
        return operations;
    }

    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL);
    }

    cleanup() {
        const now = Date.now();
        const toDelete = [];

        for (const [requestId, request] of this.pendingRequests.entries()) {
            if (request.status === 'pending') {
                continue;
            }

            const completedAt =
                request.completedAt || request.failedAt || request.timestamp;
            if (now - completedAt > this.RETENTION_WINDOW) {
                toDelete.push(requestId);
            }
        }

        toDelete.forEach((requestId) => this.pendingRequests.delete(requestId));
    }

    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.pendingRequests.clear();
    }
}
