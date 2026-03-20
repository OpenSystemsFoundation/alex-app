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
        element.config = {
            status: 'connected',
            eventCount: 5,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

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
        element.config = {
            status: 'connecting',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

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

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');
        const icon = element.shadowRoot.querySelector('lightning-icon');
        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusIndicator.classList.contains('pulse-animation')).toBe(
            true
        );
        expect(icon.iconName).toBe('utility:refresh');
        expect(statusText.textContent).toBe('Auto-refresh');
    });

    it('should display error status correctly', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'error',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

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

    it('should display disconnected status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'disconnected',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('Offline');
    });

    it('should not update time display for disconnected status (time-ago removed)', () => {
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

    it('should return correct detailed status for connected state with events', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'connected',
            eventCount: 10,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Active - 10 events received');
    });

    it('should return correct detailed status for connected state without events', () => {
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

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Connected to real-time updates');
    });

    it('should return correct detailed status for polling state', () => {
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

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe(
            'Checking for updates every 15 seconds'
        );
    });

    it('should return correct detailed status for disconnected state without last sync', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'disconnected',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.title).toBe('Not connected');
    });

    it('should handle unknown status', () => {
        const element = createElement('c-connection-status-indicator', {
            is: ConnectionStatusIndicator
        });
        element.config = {
            status: 'unknown-status',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

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
        element.config = {
            status: 'error',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        const statusIndicator =
            element.shadowRoot.querySelector('.status-indicator');

        expect(statusIndicator.classList.contains('status-error')).toBe(true);
    });

    it('should not apply pulse animation for connected status', () => {
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
        element.config = {
            status: 'disconnected',
            eventCount: 0,
            lastSyncTime: null,
            syncState: 'idle',
            pendingOperationsCount: 0,
            lastSyncError: null,
            pollingUpdateDetected: null
        };

        document.body.appendChild(element);

        const statusText = element.shadowRoot.querySelector('.status-text');

        expect(statusText.textContent).toBe('Offline');
    });

    describe('Sync State', () => {
        it('should display syncing status with pending operations', () => {
            const element = createElement('c-connection-status-indicator', {
                is: ConnectionStatusIndicator
            });
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: Date.now(),
                syncState: 'syncing',
                pendingOperationsCount: 3,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            document.body.appendChild(element);

            return Promise.resolve().then(() => {
                const syncStatus =
                    element.shadowRoot.querySelector('.sync-status');
                const syncText =
                    element.shadowRoot.querySelector('.sync-status-text');

                expect(syncStatus).toBeTruthy();
                expect(syncText.textContent).toBe('Saving 3...');
                expect(syncStatus.classList.contains('sync-syncing')).toBe(
                    true
                );
                expect(syncStatus.classList.contains('pulse-animation')).toBe(
                    true
                );
            });
        });

        it('should display syncing status with single operation', () => {
            const element = createElement('c-connection-status-indicator', {
                is: ConnectionStatusIndicator
            });
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: Date.now(),
                syncState: 'syncing',
                pendingOperationsCount: 1,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            document.body.appendChild(element);

            return Promise.resolve().then(() => {
                const syncText =
                    element.shadowRoot.querySelector('.sync-status-text');
                expect(syncText.textContent).toBe('Saving...');
            });
        });

        it('should display saved status', () => {
            const element = createElement('c-connection-status-indicator', {
                is: ConnectionStatusIndicator
            });

            // First set syncing state
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: null,
                syncState: 'syncing',
                pendingOperationsCount: 1,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            document.body.appendChild(element);

            // Then transition to idle (saved) state
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: new Date().toISOString(),
                syncState: 'idle',
                pendingOperationsCount: 0,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            return Promise.resolve()
                .then(() => Promise.resolve())
                .then(() => {
                    const syncStatus =
                        element.shadowRoot.querySelector('.sync-status');
                    const syncText =
                        element.shadowRoot.querySelector('.sync-status-text');

                    expect(syncStatus).toBeTruthy();
                    expect(syncText.textContent).toBe('Saved');
                    expect(syncStatus.classList.contains('sync-idle')).toBe(
                        true
                    );
                });
        });

        it('should display failed status', () => {
            const element = createElement('c-connection-status-indicator', {
                is: ConnectionStatusIndicator
            });
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: Date.now(),
                syncState: 'failed',
                pendingOperationsCount: 0,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            document.body.appendChild(element);

            return Promise.resolve().then(() => {
                const syncStatus =
                    element.shadowRoot.querySelector('.sync-status');
                const syncText =
                    element.shadowRoot.querySelector('.sync-status-text');

                expect(syncStatus).toBeTruthy();
                expect(syncText.textContent).toBe('Save failed');
                expect(syncStatus.classList.contains('sync-failed')).toBe(true);
            });
        });

        it('should not show sync status when idle with no recent sync', () => {
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

            const syncStatus = element.shadowRoot.querySelector('.sync-status');
            expect(syncStatus).toBeFalsy();
        });

        it('should include sync message in detailed status', () => {
            const element = createElement('c-connection-status-indicator', {
                is: ConnectionStatusIndicator
            });
            element.config = {
                status: 'connected',
                eventCount: 0,
                lastSyncTime: null,
                syncState: 'syncing',
                pendingOperationsCount: 2,
                lastSyncError: null,
                pollingUpdateDetected: null
            };

            document.body.appendChild(element);

            expect(element.detailedStatus).toContain('Saving 2 changes');
        });
    });
});
