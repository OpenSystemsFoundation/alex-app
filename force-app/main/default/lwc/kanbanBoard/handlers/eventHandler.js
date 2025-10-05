import { enrichCardData } from 'c/kanbanStore';

const CHANGE_TRACKING_WINDOW = 2000;

export default class EventHandler {
    constructor(
        requestTracker = null,
        activityCallback = null,
        boardId = null
    ) {
        this.recentChanges = new Map();
        this.requestTracker = requestTracker;
        this.activityCallback = activityCallback;
        this.boardId = boardId;
    }

    setRequestTracker(requestTracker) {
        this.requestTracker = requestTracker;
    }

    setActivityCallback(callback) {
        this.activityCallback = callback;
    }

    setBoardId(boardId) {
        this.boardId = boardId;
    }

    handlePlatformEvent(event, store) {
        try {
            const payload = JSON.parse(event.OpenSF__Payload__c);
            const eventType = event.OpenSF__EventType__c;
            const clientRequestId = event.OpenSF__ClientRequestId__c;

            if (!this._isEventForThisBoard(payload, store)) {
                return false;
            }

            if (
                clientRequestId &&
                this.requestTracker?.isOwnRequest(clientRequestId)
            ) {
                const request = this.requestTracker.getRequest(clientRequestId);

                if (this.requestTracker.isPending(clientRequestId)) {
                    if (
                        request &&
                        payload.Id &&
                        request.cardId !== payload.Id
                    ) {
                        request.cardId = payload.Id;
                    }

                    this.requestTracker.completeRequest(
                        clientRequestId,
                        payload
                    );
                }

                this._applyEvent(eventType, payload, store);
                return false;
            }

            if (
                payload.Id &&
                this.requestTracker?.hasPendingOperations(payload.Id)
            ) {
                setTimeout(() => {
                    if (!this.requestTracker.hasPendingOperations(payload.Id)) {
                        this._applyEvent(eventType, payload, store);
                    } else {
                        return true;
                    }
                }, 500);
                return false;
            }

            if (this._isRecentChange(payload.Id)) {
                return false;
            }

            if (
                !clientRequestId ||
                !this.requestTracker?.isOwnRequest(clientRequestId)
            ) {
                this._notifyActivity(eventType, payload);
            }

            this._applyEvent(eventType, payload, store);
        } catch (error) {
            return true;
        }

        return false;
    }

    _isEventForThisBoard(payload, store) {
        const state = store.getState();
        const boardId = state.boardId || this.boardId;

        if (!boardId) {
            return true;
        }

        if (payload.columnId) {
            const columns = state.columns || [];
            const columnExists = columns.some(
                (col) => col.Id === payload.columnId
            );
            return columnExists;
        }

        if (payload.Id) {
            const columns = state.columns || [];
            for (const column of columns) {
                if (
                    column.cards &&
                    column.cards.some((card) => card.Id === payload.Id)
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    _applyEvent(eventType, payload, store) {
        switch (eventType) {
            case 'move':
            case 'update':
                this._updateCard(payload, store);
                break;
            case 'create':
                this._addCard(payload, store);
                break;
            case 'delete':
                this._removeCard(payload.Id, store);
                break;
        }
    }

    trackChange(cardId) {
        this.recentChanges.set(cardId, Date.now());
        setTimeout(
            () => this.recentChanges.delete(cardId),
            CHANGE_TRACKING_WINDOW
        );
    }

    _isRecentChange(cardId) {
        const recentChangeTime = this.recentChanges.get(cardId);
        if (!recentChangeTime) {
            return false;
        }

        return Date.now() - recentChangeTime < CHANGE_TRACKING_WINDOW;
    }

    _notifyActivity(eventType, payload) {
        if (this.activityCallback) {
            const cardName =
                payload.OpenSF__Subject__c || payload.Name || 'Card';
            let message = '';

            switch (eventType) {
                case 'create':
                    message = `Card created: ${cardName}`;
                    break;
                case 'update':
                    message = `Card updated: ${cardName}`;
                    break;
                case 'move':
                    message = `Card moved: ${cardName}`;
                    break;
                case 'delete':
                    message = `Card deleted`;
                    break;
                default:
                    message = `Card changed: ${cardName}`;
            }

            this.activityCallback(message);
        }
    }

    _updateCard(cardDTO, store) {
        const enrichedCard = enrichCardData(cardDTO);

        store.dispatch({
            type: 'UPDATE_CARD',
            payload: {
                cardId: cardDTO.Id,
                card: enrichedCard
            }
        });
    }

    _addCard(cardDTO, store) {
        const enrichedCard = enrichCardData(cardDTO);

        const columns = store.getState().columns;
        const cardExists = columns.some((col) =>
            col.cards.some((c) => c.Id === cardDTO.Id)
        );

        if (cardExists) {
            return;
        }

        store.dispatch({
            type: 'ADD_CARD',
            payload: {
                card: enrichedCard,
                columnId: cardDTO.columnId
            }
        });
    }

    _removeCard(cardId, store) {
        store.dispatch({
            type: 'REMOVE_CARD',
            payload: { cardId }
        });
    }
}
