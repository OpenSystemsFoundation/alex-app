/**
 * Subscription Manager for Platform Events
 * Handles real-time updates with retry logic and polling fallback
 */

import { subscribe, unsubscribe, onError } from 'lightning/empApi';

const MAX_RETRY_ATTEMPTS = 3;
const POLLING_FREQUENCY = 5000; // 5 seconds
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

    /**
     * Subscribe to platform events
     */
    async subscribe() {
        if (this.subscription && this.subscription.channel) {
            return;
        }

        this.subscriptionStatus = 'connecting';

        try {
            const response = await subscribe(
                this.channelName,
                -1,
                (response) => {
                    // Mark subscription as healthy
                    if (this.subscriptionStatus !== 'connected') {
                        this.subscriptionStatus = 'connected';
                        this.subscriptionRetryCount = 0;
                        this.stopPolling();
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

    /**
     * Unsubscribe from platform events
     */
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

    /**
     * Register error listener
     */
    registerErrorListener() {
        onError((error) => {
            this.subscriptionStatus = 'error';
            this.unsubscribe();
            this._handleSubscriptionError(error);
        });
    }

    /**
     * Start polling fallback
     */
    startPolling(pollCallback) {
        if (this.pollingInterval) {
            return;
        }

        this.subscriptionStatus = 'polling';
        this.pollCallback = pollCallback;

        this.pollingInterval = setInterval(() => {
            this._poll();
        }, POLLING_FREQUENCY);

        // Immediate poll
        this._poll();
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.consecutiveFailedPolls = 0;
        }
    }

    /**
     * Get subscription status
     */
    getStatus() {
        return this.subscriptionStatus;
    }

    /**
     * Get status icon for UI
     */
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

    /**
     * Get status text for UI
     */
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

    /**
     * Get status CSS class
     */
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

    /**
     * Handle subscription error with retry
     * @private
     */
    _handleSubscriptionError(error) {
        this.subscriptionRetryCount++;

        if (this.subscriptionRetryCount < MAX_RETRY_ATTEMPTS) {
            const retryDelay = 2000 * this.subscriptionRetryCount;

            this.errorCallback(
                'warning',
                `Connection lost. Retrying (${this.subscriptionRetryCount}/${MAX_RETRY_ATTEMPTS})...`
            );

            this.retryTimeout = setTimeout(() => {
                this.subscribe();
            }, retryDelay);
        } else {
            this.errorCallback(
                'error',
                'Real-time updates unavailable',
                'Using polling fallback'
            );
            if (this.pollCallback) {
                this.startPolling(this.pollCallback);
            }
        }
    }

    /**
     * Execute polling
     * @private
     */
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
