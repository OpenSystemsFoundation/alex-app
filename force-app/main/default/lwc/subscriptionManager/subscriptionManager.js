import { LightningElement, api } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

const MAX_RETRY_ATTEMPTS = 3;
const POLLING_FREQUENCY = 5000; // 5 seconds
const MAX_FAILED_POLLS = 3;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const EVENT_TIMEOUT = 10000; // 10 seconds - if no event received, assume issue

/**
 * Reusable LWC component for managing platform event subscriptions
 * with automatic retry logic and polling fallback.
 */
export default class SubscriptionManager extends LightningElement {
    _channelName;
    _autoSubscribe = false;
    _boardId;

    @api
    get channelName() {
        return this._channelName;
    }
    set channelName(value) {
        this._channelName = value;
        this._checkAutoSubscribe();
    }

    @api
    get autoSubscribe() {
        return this._autoSubscribe;
    }
    set autoSubscribe(value) {
        this._autoSubscribe = value;
        this._checkAutoSubscribe();
    }

    @api
    get boardId() {
        return this._boardId;
    }
    set boardId(value) {
        this._boardId = value;
        this._checkAutoSubscribe();
    }

    subscription = {};
    subscriptionStatus = 'disconnected';
    subscriptionRetryCount = 0;
    retryTimeout = null;

    pollingInterval = null;
    lastSuccessfulPoll = null;
    consecutiveFailedPolls = 0;
    pollCallback = null;

    // Enhanced health tracking
    lastEventReceived = null;
    eventHealthCheckInterval = null;
    healthCheckAttempts = 0;
    eventCount = 0;
    startTime = null;

    /**
     * Subscribe to the platform event channel
     */
    @api
    async subscribe() {
        if (this.subscription && this.subscription.channel) {
            return;
        }

        this._setStatus('connecting');

        try {
            const response = await subscribe(
                this.channelName,
                -1,
                (response) => {
                    this.lastEventReceived = Date.now();
                    this.eventCount++;

                    if (this.subscriptionStatus !== 'connected') {
                        this._setStatus('connected');
                        this.subscriptionRetryCount = 0;
                        this.stopPolling();
                    }

                    this._dispatchMessage(response);
                }
            );

            this.subscription = response;
            if (this.subscriptionStatus !== 'connected') {
                this._setStatus('connected');
            }
            this.subscriptionRetryCount = 0;
            this.startTime = Date.now();

            // Start health monitoring
            this._startEventHealthCheck();
        } catch (error) {
            this._setStatus('error');
            this._handleSubscriptionError(error);
        }
    }

    /**
     * Unsubscribe from the platform event channel
     */
    @api
    unsubscribe() {
        if (this.subscription && this.subscription.channel) {
            unsubscribe(this.subscription, () => {
                this._setStatus('disconnected');
                this.subscription = {};
            });
        }

        this.stopPolling();
        this._stopEventHealthCheck();

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
    }

    /**
     * Register error listener for platform event errors
     */
    @api
    registerErrorListener() {
        onError((error) => {
            this._setStatus('error');
            this.unsubscribe();
            this._handleSubscriptionError(error);
        });
    }

    /**
     * Check if currently connected to platform events
     */
    @api
    isConnected() {
        return this.subscriptionStatus === 'connected';
    }

    /**
     * Start polling mode with provided callback
     */
    @api
    startPolling(pollCallback) {
        if (this.pollingInterval) {
            return;
        }

        this._setStatus('polling');
        this.pollCallback = pollCallback;

        this.pollingInterval = setInterval(() => {
            this._poll();
        }, POLLING_FREQUENCY);

        this._poll();
    }

    /**
     * Stop polling
     */
    @api
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.consecutiveFailedPolls = 0;
        }
    }

    /**
     * Get current connection status
     */
    @api
    getStatus() {
        return this.subscriptionStatus;
    }

    /**
     * Get status icon for UI display
     */
    @api
    getStatusIcon() {
        const statusMap = {
            connected: 'utility:check',
            connecting: 'utility:sync',
            disconnected: 'utility:offline',
            error: 'utility:error',
            polling: 'utility:refresh'
        };
        return statusMap[this.subscriptionStatus] || 'utility:question';
    }

    /**
     * Get status variant for UI display
     */
    @api
    getStatusVariant() {
        const variantMap = {
            connected: 'success',
            connecting: 'warning',
            disconnected: 'inverse',
            error: 'error',
            polling: 'warning'
        };
        return variantMap[this.subscriptionStatus] || 'inverse';
    }

    /**
     * Get status text for UI display
     */
    @api
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
     * Get status CSS class for UI styling
     */
    @api
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

    connectedCallback() {
        this.registerErrorListener();
        // Dispatch initial status
        this.dispatchEvent(
            new CustomEvent('statuschange', {
                detail: { status: this.subscriptionStatus }
            })
        );
        // Auto-subscribe check will be triggered by property setters
    }

    disconnectedCallback() {
        this.unsubscribe();
    }

    /**
     * Check if conditions are met for auto-subscribe
     */
    _checkAutoSubscribe() {
        if (
            this.autoSubscribe &&
            this.boardId &&
            this.channelName &&
            this.subscriptionStatus === 'disconnected'
        ) {
            this.subscribe();
        }
    }

    /**
     * Start monitoring event health
     * If no events received within timeout, switch to polling
     */
    _startEventHealthCheck() {
        this._stopEventHealthCheck(); // Clear any existing interval

        this.eventHealthCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastEvent = this.lastEventReceived
                ? now - this.lastEventReceived
                : now - this.startTime;

            // If connected but no events for a while, verify health
            if (
                this.subscriptionStatus === 'connected' &&
                timeSinceLastEvent > EVENT_TIMEOUT
            ) {
                this.healthCheckAttempts++;

                if (this.healthCheckAttempts >= 2) {
                    // After 2 failed checks, assume platform events are having issues
                    this._switchToPolling();
                }
            } else {
                this.healthCheckAttempts = 0;
            }
        }, HEALTH_CHECK_INTERVAL);
    }

    /**
     * Stop event health monitoring
     */
    _stopEventHealthCheck() {
        if (this.eventHealthCheckInterval) {
            clearInterval(this.eventHealthCheckInterval);
            this.eventHealthCheckInterval = null;
            this.healthCheckAttempts = 0;
        }
    }

    /**
     * Switch to polling mode (fallback)
     */
    _switchToPolling() {
        this._setStatus('polling');
        this._stopEventHealthCheck();

        // Dispatch event to notify parent that polling should start
        this.dispatchEvent(
            new CustomEvent('pollingrequired', {
                detail: { reason: 'health_check_failed' }
            })
        );
    }

    _handleSubscriptionError(error) {
        this.subscriptionRetryCount++;

        if (this.subscriptionRetryCount < MAX_RETRY_ATTEMPTS) {
            const retryDelay = 2000 * this.subscriptionRetryCount;

            this.retryTimeout = setTimeout(() => {
                this.subscribe();
            }, retryDelay);
        } else {
            // Dispatch event to notify parent that polling should start
            this.dispatchEvent(
                new CustomEvent('pollingrequired', {
                    detail: { error, reason: 'subscription_failed' }
                })
            );
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

            // Try to reconnect to platform events periodically
            if (this.subscriptionStatus === 'polling') {
                const timeSinceLastPoll = Date.now() - this.lastSuccessfulPoll;
                // Every 5 minutes, try to reconnect
                if (timeSinceLastPoll > 300000) {
                    this._tryReconnectToEvents();
                }
            }
        } catch (error) {
            this.consecutiveFailedPolls++;

            if (this.consecutiveFailedPolls >= MAX_FAILED_POLLS) {
                this.stopPolling();
            }
        }
    }

    /**
     * Attempt to reconnect to platform events from polling mode
     */
    async _tryReconnectToEvents() {
        // Reset retry count for fresh attempt
        this.subscriptionRetryCount = 0;
        this.stopPolling();

        await this.subscribe();
    }

    _setStatus(newStatus) {
        if (this.subscriptionStatus !== newStatus) {
            this.subscriptionStatus = newStatus;
            this.dispatchEvent(
                new CustomEvent('statuschange', {
                    detail: { status: newStatus }
                })
            );
        }
    }

    _dispatchMessage(response) {
        this.dispatchEvent(
            new CustomEvent('message', {
                detail: { payload: response.data.payload }
            })
        );
    }

    _dispatchStatusMessage(variant, title, message) {
        this.dispatchEvent(
            new CustomEvent('statusmessage', {
                detail: { variant, title, message }
            })
        );
    }
}
