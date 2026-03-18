import { LightningElement, api } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import EventHealthMonitor from './eventHealthMonitor';
import RetryManager from './retryManager';

/**
 * Reusable LWC component for managing platform event subscriptions
 * with automatic retry logic and health monitoring.
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

    // Subcomponents
    healthMonitor = new EventHealthMonitor();
    retryManager = new RetryManager(
        () => this.subscribe(),
        (error) => this._onMaxRetriesExceeded(error)
    );

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
                    this.healthMonitor.recordEvent();

                    if (this.subscriptionStatus !== 'connected') {
                        this._setStatus('connected');
                        this.retryManager.reset();
                    }

                    this._dispatchMessage(response);
                }
            );

            this.subscription = response;
            if (this.subscriptionStatus !== 'connected') {
                this._setStatus('connected');
            }
            this.retryManager.reset();

            // Start health monitoring
            this.healthMonitor.start((reason) => this._switchToPolling(reason));
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

        this.healthMonitor.stop();
        this.retryManager.clearTimeout();
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
     * Switch to polling mode (fallback)
     */
    _switchToPolling(reason) {
        this._setStatus('polling');
        this.healthMonitor.stop();

        // Dispatch event to notify parent that polling should start
        this.dispatchEvent(
            new CustomEvent('pollingrequired', {
                detail: { reason }
            })
        );
    }

    /**
     * Handle max retries exceeded
     */
    _onMaxRetriesExceeded(error) {
        // Dispatch event to notify parent that polling should start
        this.dispatchEvent(
            new CustomEvent('pollingrequired', {
                detail: { error, reason: 'subscription_failed' }
            })
        );
    }

    _handleSubscriptionError(error) {
        this.retryManager.scheduleRetry(error);
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
