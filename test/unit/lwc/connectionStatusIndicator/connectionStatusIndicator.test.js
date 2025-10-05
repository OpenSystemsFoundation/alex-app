import { createElement } from 'lwc';
import ConnectionStatusIndicator from 'c/connectionStatusIndicator';

describe('c-connection-status-indicator', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should render with default disconnected status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        expect(statusIndicator).toBeTruthy();
        expect(statusIndicator.classList.contains('status-disconnected')).toBe(
            true
        );
    });

    it('should display connected status correctly', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'connected';
        element.eventCount = 5;

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(icon.iconName).toBe('utility:success');
        expect(statusText.textContent).toBe('Real-time');
        expect(statusIndicator.title).toBe('Active - 5 events received');
    });

    it('should display connecting status with pulse animation', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'connecting';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusIndicator.classList.contains('pulse-animation')).toBe(
            true
        );
        expect(icon.iconName).toBe('utility:sync');
        expect(statusText.textContent).toBe('Connecting...');
    });

    it('should display polling status with pulse animation', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'polling';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusIndicator.classList.contains('pulse-animation')).toBe(
            true
        );
        expect(icon.iconName).toBe('utility:refresh');
        expect(statusText.textContent).toBe('Polling');
    });

    it('should display error status correctly', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'error';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(icon.iconName).toBe('utility:error');
        expect(statusText.textContent).toBe('Error');
        expect(statusIndicator.title).toBe(
            'Connection failed - please refresh'
        );
    });

    it('should display disconnected status with last sync time', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = fiveMinutesAgo.toISOString();

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('5m ago');
    });

    it('should format time ago as "Just now" for recent timestamps', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = thirtySecondsAgo.toISOString();

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('Just now');
    });

    it('should format time ago in hours', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = twoHoursAgo.toISOString();

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('2h ago');
    });

    it('should format time ago in days', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = threeDaysAgo.toISOString();

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('3d ago');
    });

    it('should update time display every minute for disconnected status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = oneMinuteAgo.toISOString();

        document.body.appendChild(element);

        // Advance time by 1 minute
        jest.advanceTimersByTime(60000);

        // The component should still be rendering
        const statusText = element.shadowRoot.querySelector('.status-text');
        expect(statusText).toBeTruthy();
    });

    it('should update time display every minute for polling status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        element.status = 'polling';
        element.lastSyncTime = oneMinuteAgo.toISOString();

        document.body.appendChild(element);

        // Advance time by 1 minute
        jest.advanceTimersByTime(60000);

        // The component should still be rendering
        const statusText = element.shadowRoot.querySelector('.status-text');
        expect(statusText).toBeTruthy();
    });

    it('should clear interval on disconnect', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });

        document.body.appendChild(element);

        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        document.body.removeChild(element);

        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should return correct detailed status for connected state with events', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'connected';
        element.eventCount = 10;

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Active - 10 events received');
    });

    it('should return correct detailed status for connected state without events', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'connected';
        element.eventCount = 0;

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Connected to real-time updates');
    });

    it('should return correct detailed status for polling state', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'polling';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe(
            'Using fallback mode - updates every 5 seconds'
        );
    });

    it('should return correct detailed status for disconnected state with last sync', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        element.status = 'disconnected';
        element.lastSyncTime = tenMinutesAgo.toISOString();

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Last refreshed 10m ago');
    });

    it('should return correct detailed status for disconnected state without last sync', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'disconnected';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Not connected');
    });

    it('should handle unknown status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'unknown-status';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(icon.iconName).toBe('utility:question');
        expect(statusText.textContent).toBe('Unknown');
        expect(statusIndicator.title).toBe('Unknown status');
    });

    it('should apply correct CSS classes based on status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'error';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.classList.contains('status-error')).toBe(true);
    });

    it('should not apply pulse animation for connected status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'connected';

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.classList.contains('pulse-animation')).toBe(
            false
        );
    });

    it('should handle null lastSyncTime gracefully', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.status = 'disconnected';
        element.lastSyncTime = null;

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('Offline');
    });
});
