import { LightningElement, api } from 'lwc';

export default class ConnectionStatusIndicator extends LightningElement {
    // Single config object for all status properties
    _config = {
        status: 'disconnected',
        eventCount: 0,
        lastSyncTime: null,
        syncState: 'idle', // 'idle' | 'syncing' | 'failed'
        pendingOperationsCount: 0,
        lastSyncError: null,
        pollingUpdateDetected: null
    };

    // Internal state
    _savedFadeTimeout = null;
    _showSavedIndicator = false;

    @api
    get config() {
        return this._config;
    }

    set config(value) {
        const previousState = this._config.syncState;
        const previousPollingUpdate = this._config.pollingUpdateDetected;
        this._config = { ...value };

        // If polling detected an update
        if (
            this._config.pollingUpdateDetected &&
            this._config.pollingUpdateDetected !== previousPollingUpdate
        ) {
            this._showSavedIndicator = true;
            this._scheduleFadeAway();
        }
        // If sync just completed (transitioned to idle with lastSyncTime)
        else if (
            previousState === 'syncing' &&
            this._config.syncState === 'idle' &&
            this._config.lastSyncTime
        ) {
            this._showSavedIndicator = true;
            this._scheduleFadeAway();
        }
        // If syncing again, clear fade timeout and show indicator
        else if (this._config.syncState === 'syncing') {
            this._clearFadeTimeout();
            this._showSavedIndicator = true;
        }
        // If failed, show indicator immediately
        else if (this._config.syncState === 'failed') {
            this._clearFadeTimeout();
            this._showSavedIndicator = true;
        }
    }

    disconnectedCallback() {
        this._clearFadeTimeout();
    }

    _scheduleFadeAway() {
        this._clearFadeTimeout();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._savedFadeTimeout = setTimeout(() => {
            this._showSavedIndicator = false;
        }, 3000); // Fade away after 3 seconds
    }

    _clearFadeTimeout() {
        if (this._savedFadeTimeout) {
            clearTimeout(this._savedFadeTimeout);
            this._savedFadeTimeout = null;
        }
    }

    get statusIcon() {
        const statusMap = {
            connected: 'utility:success',
            connecting: 'utility:sync',
            disconnected: 'utility:offline',
            error: 'utility:error',
            polling: 'utility:refresh'
        };
        return statusMap[this.config.status] || 'utility:question';
    }

    get statusText() {
        const textMap = {
            connected: 'Real-time',
            connecting: 'Connecting...',
            disconnected: 'Offline',
            error: 'Error',
            polling: 'Auto-refresh'
        };
        return textMap[this.config.status] || 'Unknown';
    }

    get statusClass() {
        let classes = `status-indicator status-${this.config.status}`;
        if (this.showPulse) {
            classes += ' pulse-animation';
        }
        return classes;
    }

    get showStatusIcon() {
        return this.config.status !== 'polling';
    }

    @api
    get detailedStatus() {
        // Build sync state message
        let syncMessage = '';
        if (
            this.config.syncState === 'syncing' &&
            this.config.pendingOperationsCount > 0
        ) {
            syncMessage =
                this.config.pendingOperationsCount === 1
                    ? ' • Saving 1 change'
                    : ` • Saving ${this.config.pendingOperationsCount} changes`;
        } else if (this.config.syncState === 'failed') {
            syncMessage = ' • Failed to save';
        } else if (
            this.config.syncState === 'idle' &&
            this.config.lastSyncTime
        ) {
            syncMessage = ' • All changes saved';
        }

        let details = '';
        switch (this.config.status) {
            case 'connected':
                details =
                    this.config.eventCount > 0
                        ? `Active - ${this.config.eventCount} events received${syncMessage}`
                        : `Connected to real-time updates${syncMessage}`;
                break;
            case 'connecting':
                details = `Establishing connection...${syncMessage}`;
                break;
            case 'polling':
                details = `Checking for updates every 15 seconds${syncMessage}`;
                break;
            case 'error':
                details = `Connection failed - please refresh${syncMessage}`;
                break;
            case 'disconnected':
                details = `Not connected${syncMessage}`;
                break;
            default:
                details = `Unknown status${syncMessage}`;
        }
        return details;
    }

    get syncStatusIcon() {
        const iconMap = {
            idle: 'utility:success',
            syncing: 'utility:sync',
            failed: 'utility:error'
        };
        return iconMap[this.config.syncState] || 'utility:question';
    }

    get syncStatusText() {
        // Show 'Updated' for polling updates (only while visible before fade)
        if (this.config.pollingUpdateDetected && this._showSavedIndicator) {
            return 'Updated';
        }

        if (
            this.config.syncState === 'syncing' &&
            this.config.pendingOperationsCount > 0
        ) {
            return this.config.pendingOperationsCount === 1
                ? 'Saving...'
                : `Saving ${this.config.pendingOperationsCount}...`;
        } else if (this.config.syncState === 'failed') {
            return 'Save failed';
        } else if (
            this.config.syncState === 'idle' &&
            this.config.lastSyncTime
        ) {
            return 'Saved';
        }
        return '';
    }

    get showSyncStatus() {
        // Show sync status if syncing, failed, recently saved, or polling update detected
        return (
            this._showSavedIndicator &&
            (this.config.syncState === 'syncing' ||
                this.config.syncState === 'failed' ||
                this.config.pollingUpdateDetected ||
                (this.config.syncState === 'idle' && this.config.lastSyncTime))
        );
    }

    get syncStatusClass() {
        let classes = `sync-status sync-${this.config.syncState}`;
        if (this.config.syncState === 'syncing') {
            classes += ' pulse-animation';
        }
        // Add fade-out class when idle and about to disappear
        if (this.config.syncState === 'idle' && this._savedFadeTimeout) {
            classes += ' fade-out';
        }
        return classes;
    }

    get showPulse() {
        return (
            this.config.status === 'connecting' ||
            this.config.status === 'polling'
        );
    }
}
