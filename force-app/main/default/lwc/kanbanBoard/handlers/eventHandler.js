const CHANGE_TRACKING_WINDOW = 2000;

export default class EventHandler {
    constructor(
        requestTracker = null,
        activityCallback = null,
        boardId = null,
        clientId = null
    ) {
        this.recentChanges = new Map();
        this.requestTracker = requestTracker;
        this.activityCallback = activityCallback;
        this.boardId = boardId;
        this.clientId = clientId; // Store client ID for filtering
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

    setClientId(clientId) {
        this.clientId = clientId;
    }

    handlePlatformEvent(event, store) {
        try {
            const payload = JSON.parse(event.OpenSF__Payload__c);
            const eventType = event.OpenSF__EventType__c;
            const clientRequestId = event.OpenSF__ClientRequestId__c;
            const sequenceNumber = event.OpenSF__SequenceNumber__c;
            const eventClientId = event.ClientId__c; // Get clientId from event

            if (!this._isEventForThisBoard(payload, store)) {
                return false;
            }

            // Check sequence number - ignore stale events
            if (
                sequenceNumber != null &&
                payload.Id &&
                !this._shouldApplyEvent(payload.Id, sequenceNumber, store)
            ) {
                console.log(
                    `Ignoring stale event for card ${payload.Id}: seq ${sequenceNumber}`
                );
                return false;
            }

            // Check if this event is from THIS window/tab
            const isOwnWindow =
                eventClientId && eventClientId === this.clientId;

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

                // Don't apply create events for our own requests - already added optimistically
                if (eventType !== 'create') {
                    this._applyEvent(eventType, payload, store);
                }
                return false;
            }

            // Only rollback optimistic updates if event is from THIS window
            // Events from other windows should be applied immediately
            if (
                isOwnWindow &&
                payload.Id &&
                this.requestTracker?.hasPendingOperations(payload.Id)
            ) {
                // This window has pending operations - defer applying until they complete
                setTimeout(() => {
                    if (!this.requestTracker.hasPendingOperations(payload.Id)) {
                        this._applyEvent(eventType, payload, store);
                    } else {
                        return true;
                    }
                }, 500);
                return false;
            }

            // Events from other windows are applied immediately even if we have pending operations
            // This allows both windows to see each other's changes in real-time

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

    /**
     * Check if event should be applied based on sequence number
     * Returns true if event is newer than current card state
     * @private
     */
    _shouldApplyEvent(cardId, eventSequence, store) {
        if (eventSequence == null) {
            // No sequence number - apply event (backward compatibility)
            return true;
        }

        const state = store.getState();
        const columns = state.columns || [];

        // Find the card in current state
        for (const column of columns) {
            const card = column.cards?.find((c) => c.Id === cardId);
            if (card) {
                const currentSequence = card.OpenSF__SequenceNumber__c;

                if (currentSequence == null) {
                    // Card has no sequence - apply event
                    return true;
                }

                // Only apply if event sequence is greater than current
                return eventSequence > currentSequence;
            }
        }

        // Card not found in state - apply event (it might be new)
        return true;
    }

    _isEventForThisBoard(payload, store) {
        const state = store.getState();
        const boardId = state.boardId || this.boardId;

        if (!boardId) {
            return true;
        }

        // Check if payload's column belongs to this board
        if (payload.columnId) {
            const columns = state.columns || [];
            const columnExists = columns.some(
                (col) => col.Id === payload.columnId
            );
            return columnExists;
        }

        // Check if payload's boardId matches
        if (payload.boardId) {
            return payload.boardId === boardId;
        }

        // Check if the card already exists in this board's state
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
        // Card will be enriched automatically in the reducer
        store.dispatch({
            type: 'UPDATE_CARD',
            payload: {
                cardId: cardDTO.Id,
                updates: cardDTO
            }
        });
    }

    _addCard(cardDTO, store) {
        // Card will be enriched automatically in the reducer
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
                card: cardDTO,
                columnId: cardDTO.columnId
            }
        });
    }

    _removeCard(cardId, store) {
        store.dispatch({
            type: 'DELETE_CARD',
            payload: { cardId }
        });
    }
}
