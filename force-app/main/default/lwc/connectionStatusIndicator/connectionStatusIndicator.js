import { LightningElement, api } from 'lwc';

export default class ConnectionStatusIndicator extends LightningElement {
    @api status = 'disconnected';
    @api eventCount = 0;
    @api lastEventTime = null;
    @api lastSyncTime = null;

    connectedCallback() {
        // Update time display every minute for disconnected and polling states
        this._intervalId = setInterval(() => {
            if (
                (this.status === 'disconnected' || this.status === 'polling') &&
                this.lastSyncTime
            ) {
                // Force re-render by triggering reactivity
                this.lastSyncTime = this.lastSyncTime;
            }
        }, 60000); // Update every minute
    }

    disconnectedCallback() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
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
        return statusMap[this.status] || 'utility:question';
    }

    get statusText() {
        if (
            (this.status === 'disconnected' || this.status === 'polling') &&
            this.lastSyncTime
        ) {
            return this.getTimeAgo(this.lastSyncTime);
        }

        const textMap = {
            connected: 'Real-time',
            connecting: 'Connecting...',
            disconnected: 'Offline',
            error: 'Error',
            polling: 'Polling'
        };
        return textMap[this.status] || 'Unknown';
    }

    get statusClass() {
        let classes = `status-indicator status-${this.status}`;
        if (this.showPulse) {
            classes += ' pulse-animation';
        }
        return classes;
    }

    get detailedStatus() {
        let details = '';
        switch (this.status) {
            case 'connected':
                details =
                    this.eventCount > 0
                        ? `Active - ${this.eventCount} events received`
                        : 'Connected to real-time updates';
                break;
            case 'connecting':
                details = 'Establishing connection...';
                break;
            case 'polling':
                details = 'Using fallback mode - updates every 5 seconds';
                break;
            case 'error':
                details = 'Connection failed - please refresh';
                break;
            case 'disconnected':
                if (this.lastSyncTime) {
                    details = `Last refreshed ${this.getTimeAgo(this.lastSyncTime)}`;
                } else {
                    details = 'Not connected';
                }
                break;
            default:
                details = 'Unknown status';
        }
        return details;
    }

    get showPulse() {
        return this.status === 'connecting' || this.status === 'polling';
    }

    /**
     * Calculate and format time ago string
     */
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown';

        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return `${diffDays}d ago`;
        }
    }
}
