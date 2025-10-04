/**
 * Event Handler for Platform Events
 * Processes platform events and updates state
 */

import DataManager from './dataManager';

const CHANGE_TRACKING_WINDOW = 2000; // 2 seconds

export default class EventHandler {
    constructor() {
        this.recentChanges = new Map(); // cardId -> timestamp
    }

    /**
     * Handle platform event
     */
    handlePlatformEvent(event, store) {
        try {
            const payload = JSON.parse(event.OpenSF__Payload__c);
            const eventType = event.OpenSF__EventType__c;

            // Ignore recent changes from this window
            if (this._isRecentChange(payload.Id)) {
                return;
            }

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
                default:
                    console.warn('Unknown event type:', eventType);
            }
        } catch (error) {
            console.error('Error handling platform event:', error);
            // Return true to signal need for full refresh
            return true;
        }

        return false;
    }

    /**
     * Track a change to ignore immediate echoes
     */
    trackChange(cardId) {
        this.recentChanges.set(cardId, Date.now());
        setTimeout(
            () => this.recentChanges.delete(cardId),
            CHANGE_TRACKING_WINDOW
        );
    }

    /**
     * Check if card was recently changed in this window
     * @private
     */
    _isRecentChange(cardId) {
        const recentChangeTime = this.recentChanges.get(cardId);
        if (!recentChangeTime) {
            return false;
        }

        return Date.now() - recentChangeTime < CHANGE_TRACKING_WINDOW;
    }

    /**
     * Update card in state
     * @private
     */
    _updateCard(cardDTO, store) {
        const enrichedCard = DataManager.enrichCard(cardDTO);

        store.dispatch({
            type: 'UPDATE_CARD',
            payload: {
                cardId: cardDTO.Id,
                card: enrichedCard
            }
        });
    }

    /**
     * Add card to state
     * @private
     */
    _addCard(cardDTO, store) {
        const enrichedCard = DataManager.enrichCard(cardDTO);

        // Check if card already exists
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

    /**
     * Remove card from state
     * @private
     */
    _removeCard(cardId, store) {
        store.dispatch({
            type: 'REMOVE_CARD',
            payload: { cardId }
        });
    }
}
