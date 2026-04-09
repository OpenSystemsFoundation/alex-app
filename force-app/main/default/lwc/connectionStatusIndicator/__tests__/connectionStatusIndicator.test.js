import { createElement } from 'lwc';
import ConnectionStatusIndicator from 'c/connectionStatusIndicator';

describe('c-connection-status-indicator', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the polling pill without an icon', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'polling',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        expect(element.shadowRoot.querySelector('.status-text').textContent).toBe(
            'Auto-refresh'
        );
        expect(
            element.shadowRoot.querySelectorAll('.status-indicator lightning-icon')
        ).toHaveLength(0);
    });

    it('keeps the status icon for non-polling states', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'connected',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        expect(
            element.shadowRoot.querySelectorAll('.status-indicator lightning-icon')
        ).toHaveLength(1);
    });
});
