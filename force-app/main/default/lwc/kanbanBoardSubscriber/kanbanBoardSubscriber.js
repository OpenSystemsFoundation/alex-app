import { api, LightningElement } from 'lwc';
import { onError, subscribe, unsubscribe } from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import kanbanStore from 'c/kanbanBoardStore';
import kanbanUtils from 'c/kanbanBoardUtils';

const REPLAY_ID = -1;

export default class KanbanBoardSubscriber extends LightningElement {
    @api boardId;
    channels = [
        '/event/OpenSF__CardUpdateEvent__e',
        '/event/OpenSF__ColumnUpdateEvent__e'
    ];
    subscriptions = [];
    eventData = {};
    isConnected = false;
    retryCount = 0;
    maxRetries = 5;

    connectedCallback() {
        this.registerErrorListener();
        this.initializeSubscriptions();
    }

    disconnectedCallback() {
        this.handleUnsubscribe();
    }

    initializeSubscriptions() {
        if (this.retryCount < this.maxRetries) {
            this.channels.forEach((channel) => {
                const messageCallback = (response) => {
                    this.handleEvent(response.data.payload, channel);
                };
                this.subscribeToChannel(channel, messageCallback);
            });
        } else {
            this.showToast(
                'Failed to reconnect after multiple attempts.',
                'Subscription Error',
                'error'
            );
        }
    }

    subscribeToChannel(channel, messageCallback) {
        subscribe(channel, REPLAY_ID, messageCallback)
            .then((response) => {
                this.subscriptions.push(response);
                this.isConnected = true;
                this.retryCount = 0;
            })
            .catch((error) => {
                this.isConnected = false;
                this.retryCount++;
                this.showToast(
                    `Failed to subscribe to realtime updates. Retry attempt ${this.retryCount}`,
                    'Subscription Info',
                    'info'
                );
                if (this.retryCount < this.maxRetries) {
                    this.initializeSubscriptions();
                }
            });
    }

    handleUnsubscribe() {
        this.subscriptions.forEach((subscription) => {
            if (subscription && subscription.subscription) {
                unsubscribe(subscription)
                    .then(() => {
                        this.showToast(
                            `Disconnected from realtime updates`,
                            'Unsubscribed',
                            'info'
                        );
                    })
                    .catch((error) => {
                        this.logError(
                            error,
                            `Failed to unsubscribe from realtime updates`
                        );
                    });
            }
        });
        this.subscriptions = [];
        this.isConnected = false;
    }

    handleEvent(eventData, channel) {
        try {
            switch (channel) {
                case '/event/OpenSF__CardUpdateEvent__e':
                    this.handleCardEvent(eventData);
                    break;
                case '/event/OpenSF__ColumnUpdateEvent__e':
                    this.handleColumnEvent(eventData);
                    break;
                default:
                    throw new Error('Unknown event channel');
            }
        } catch (error) {
            this.logError(error, 'Error handling event');
        }
    }

    handleCardEvent(eventData) {
        const cardData = kanbanUtils.extractCardData(eventData);

        if (!this.boardId) {
            throw new Error('boardId is missing in event data');
        }

        try {
            switch (eventData.OpenSF__EventType__c) {
                case 'CardCreate':
                    kanbanStore.addCard(this.boardId, cardData);
                    break;
                case 'CardUpdate':
                    kanbanStore.updateCard(this.boardId, cardData);
                    break;
                case 'CardDelete':
                    kanbanStore.deleteCard(this.boardId, cardData.cardId);
                    break;
                default:
                    throw new Error('Unknown card event type');
            }
        } catch (error) {
            this.logError(
                error,
                `Error processing card event: ${eventData.OpenSF__EventType__c}`
            );
        }
    }

    handleColumnEvent(eventData) {
        const columnData = kanbanUtils.extractColumnData(eventData);

        if (!this.boardId) {
            throw new Error('boardId is missing in event data');
        }

        try {
            switch (eventData.OpenSF__EventType__c) {
                case 'ColumnCreate':
                    kanbanStore.addColumn(columnData.boardId, columnData);
                    break;
                case 'ColumnUpdate':
                    kanbanStore.updateColumn(columnData.boardId, columnData);
                    break;
                case 'ColumnDelete':
                    kanbanStore.deleteColumn(
                        columnData.boardId,
                        columnData.columnId
                    );
                    break;
                default:
                    throw new Error('Unknown column event type');
            }
        } catch (error) {
            this.logError(
                error,
                `Error processing column event: ${eventData.OpenSF__EventType__c}`
            );
        }
    }

    registerErrorListener() {
        onError((error) => {
            this.isConnected = false;
            this.showToast(
                'Disconnected from realtime updates. Retrying..',
                'Info',
                'info'
            );
            this.retryConnection();
        });
    }

    retryConnection() {
        if (!this.isConnected && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.initializeSubscriptions();
        }
    }

    showToast(message, title, variant) {
        const event = new ShowToastEvent({
            message,
            title,
            variant
        });
        this.dispatchEvent(event);
    }

    logError(error, customMessage = '') {
        const errorMessage =
            customMessage ||
            (error && error.message) ||
            'An unexpected error occurred';
        console.error(`Error: ${errorMessage}`, error);
        this.showToast(errorMessage, 'Error', 'error');
    }
}
