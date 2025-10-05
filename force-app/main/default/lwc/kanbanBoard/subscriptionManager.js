import { subscribe, unsubscribe, onError } from 'lightning/empApi';

const MAX_RETRY_ATTEMPTS = 3;
const POLLING_FREQUENCY = 5000;
const MAX_FAILED_POLLS = 3;

export default class SubscriptionManager {
    constructor(channelName, messageCallback, errorCallback) {
        this.channelName = channelName;
        this.messageCallback = messageCallback;
        this.errorCallback = errorCallback;

        this.subscription = {};
        this.subscriptionStatus = 'disconnected';
        this.subscriptionRetryCount = 0;
        this.retryTimeout = null;

        this.pollingInterval = null;
        this.lastSuccessfulPoll = null;
        this.consecutiveFailedPolls = 0;
    }

    async subscribe() {
        if (this.subscription && this.subscription.channel) {
            return;
        }

        this.subscriptionStatus = 'connecting';
        this.errorCallback('info', 'Connecting to real-time updates...', '');

        try {
            const response = await subscribe(
                this.channelName,
                -1,
                (response) => {
                    if (this.subscriptionStatus !== 'connected') {
                        this.subscriptionStatus = 'connected';
                        this.subscriptionRetryCount = 0;
                        this.stopPolling();

                        this.errorCallback(
                            'success',
                            'Real-time updates active',
                            'Platform event subscription is live'
                        );
                    }

                    this.messageCallback(response);
                }
            );

            this.subscription = response;
            this.subscriptionStatus = 'connected';
            this.subscriptionRetryCount = 0;
        } catch (error) {
            this.subscriptionStatus = 'error';
            this._handleSubscriptionError(error);
        }
    }

    unsubscribe() {
        if (this.subscription && this.subscription.channel) {
            unsubscribe(this.subscription, () => {
                this.subscriptionStatus = 'disconnected';
                this.subscription = {};
            });
        }

        this.stopPolling();

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
    }

    registerErrorListener() {
        onError((error) => {
            this.subscriptionStatus = 'error';
            this.unsubscribe();
            this._handleSubscriptionError(error);
        });
    }

    startPolling(pollCallback) {
        if (this.pollingInterval) {
            return;
        }

        this.subscriptionStatus = 'polling';
        this.pollCallback = pollCallback;

        this.pollingInterval = setInterval(() => {
            this._poll();
        }, POLLING_FREQUENCY);

        this._poll();
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.consecutiveFailedPolls = 0;
        }
    }

    getStatus() {
        return this.subscriptionStatus;
    }

    getStatusIcon() {
        const statusMap = {
            connected: '✅',
            connecting: '🔄',
            disconnected: '⚫',
            error: '❌',
            polling: '🔄'
        };
        return statusMap[this.subscriptionStatus] || '⚪';
    }

    getStatusText() {
        const textMap = {
            connected: 'Real-time updates active',
            connecting: 'Connecting...',
            disconnected: 'Disconnected',
            error: 'Connection error',
            polling: 'Polling mode (fallback)'
        };
        return textMap[this.subscriptionStatus] || 'Unknown';
    }

    getStatusClass() {
        const classMap = {
            connected: 'status-connected',
            connecting: 'status-connecting',
            disconnected: 'status-disconnected',
            error: 'status-error',
            polling: 'status-polling'
        };
        return classMap[this.subscriptionStatus] || 'status-unknown';
    }

    _handleSubscriptionError(error) {
        this.subscriptionRetryCount++;

        if (this.subscriptionRetryCount < MAX_RETRY_ATTEMPTS) {
            const retryDelay = 2000 * this.subscriptionRetryCount;

            this.errorCallback(
                'info',
                `Connection lost. Retrying (${this.subscriptionRetryCount}/${MAX_RETRY_ATTEMPTS})...`,
                ''
            );

            this.retryTimeout = setTimeout(() => {
                this.subscribe();
            }, retryDelay);
        } else {
            this.errorCallback(
                'info',
                'Real-time updates unavailable',
                'Using polling fallback'
            );
            if (this.pollCallback) {
                this.startPolling(this.pollCallback);
            }
        }
    }

    async _poll() {
        if (!this.pollCallback) {
            return;
        }

        try {
            await this.pollCallback();
            this.lastSuccessfulPoll = Date.now();
            this.consecutiveFailedPolls = 0;
        } catch (error) {
            this.consecutiveFailedPolls++;

            if (this.consecutiveFailedPolls >= MAX_FAILED_POLLS) {
                this.stopPolling();
                this.errorCallback(
                    'error',
                    'Connection lost',
                    'Please refresh the page'
                );
            }
        }
    }
}
