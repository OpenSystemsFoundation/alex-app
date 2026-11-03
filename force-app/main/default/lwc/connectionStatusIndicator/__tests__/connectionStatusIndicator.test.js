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

        expect(
            element.shadowRoot.querySelector('.status-text').textContent
        ).toBe('Auto-refresh');
        expect(
            element.shadowRoot.querySelectorAll(
                '.status-indicator lightning-icon'
            )
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
            element.shadowRoot.querySelectorAll(
                '.status-indicator lightning-icon'
            )
        ).toHaveLength(1);
    });
});

const BASE_CONFIG = {
    status: 'connected',
    eventCount: 0,
    lastSyncTime: null,
    syncState: 'idle',
    pendingOperationsCount: 0,
    lastSyncError: null,
    pollingUpdateDetected: null
};

function render(config) {
    const element = createElement('c-connection-status-indicator', {
        is: ConnectionStatusIndicator
    });
    if (config) {
        element.config = { ...BASE_CONFIG, ...config };
    }
    document.body.appendChild(element);
    return element;
}

function update(element, config) {
    element.config = { ...BASE_CONFIG, ...config };
    return Promise.resolve();
}

function q(element, selector) {
    return element.shadowRoot.querySelector(selector);
}

describe('c-connection-status-indicator status pill', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('defaults to an offline pill with no sync status', () => {
        const element = render();

        expect(element.config.status).toBe('disconnected');
        expect(q(element, '.status-text').textContent).toBe('Offline');
        expect(q(element, '.status-indicator lightning-icon').iconName).toBe(
            'utility:offline'
        );
        expect(q(element, '.sync-status')).toBeNull();
        expect(element.detailedStatus).toBe('Not connected');
    });

    it.each([
        ['connected', 'utility:success', 'Real-time', false],
        ['connecting', 'utility:sync', 'Connecting...', true],
        ['disconnected', 'utility:offline', 'Offline', false],
        ['error', 'utility:error', 'Error', false],
        ['mystery', 'utility:question', 'Unknown', false]
    ])('renders %s with icon %s and text %s', (status, icon, text, pulse) => {
        const element = render({ status });

        const pill = q(element, '.status-indicator');
        expect(pill.classList.contains(`status-${status}`)).toBe(true);
        expect(pill.classList.contains('pulse-animation')).toBe(pulse);
        expect(q(element, '.status-text').textContent).toBe(text);
        const iconEl = q(element, '.status-indicator lightning-icon');
        expect(iconEl.iconName).toBe(icon);
        expect(iconEl.alternativeText).toBe(text);
    });

    it('pulses while polling', () => {
        const element = render({ status: 'polling' });
        expect(
            q(element, '.status-indicator').classList.contains(
                'pulse-animation'
            )
        ).toBe(true);
    });
});

describe('c-connection-status-indicator detailedStatus', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it.each([
        [{ status: 'connected' }, 'Connected to real-time updates'],
        [{ status: 'connected', eventCount: 5 }, 'Active - 5 events received'],
        [{ status: 'connecting' }, 'Establishing connection...'],
        [{ status: 'polling' }, 'Checking for updates every 15 seconds'],
        [{ status: 'error' }, 'Connection failed - please refresh'],
        [{ status: 'disconnected' }, 'Not connected'],
        [{ status: 'weird' }, 'Unknown status'],
        [
            {
                status: 'connected',
                syncState: 'syncing',
                pendingOperationsCount: 1
            },
            'Connected to real-time updates • Saving 1 change'
        ],
        [
            {
                status: 'polling',
                syncState: 'syncing',
                pendingOperationsCount: 3
            },
            'Checking for updates every 15 seconds • Saving 3 changes'
        ],
        [
            {
                status: 'connected',
                syncState: 'syncing',
                pendingOperationsCount: 0
            },
            'Connected to real-time updates'
        ],
        [
            { status: 'error', syncState: 'failed' },
            'Connection failed - please refresh • Failed to save'
        ],
        [
            { status: 'disconnected', lastSyncTime: 1700000000000 },
            'Not connected • All changes saved'
        ]
    ])('%j -> %s', (config, expected) => {
        const element = render(config);
        expect(element.detailedStatus).toBe(expected);
        expect(q(element, '.status-indicator').title).toBe(expected);
    });
});

describe('c-connection-status-indicator sync status', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('shows "Saving..." for one pending operation', () => {
        const element = render({
            syncState: 'syncing',
            pendingOperationsCount: 1
        });

        const sync = q(element, '.sync-status');
        expect(sync.classList.contains('sync-syncing')).toBe(true);
        expect(sync.classList.contains('pulse-animation')).toBe(true);
        expect(q(element, '.sync-status-text').textContent).toBe('Saving...');
        expect(q(element, '.sync-status lightning-icon').iconName).toBe(
            'utility:sync'
        );
    });

    it('shows a count for multiple pending operations', () => {
        const element = render({
            syncState: 'syncing',
            pendingOperationsCount: 4
        });
        expect(q(element, '.sync-status-text').textContent).toBe('Saving 4...');
    });

    it('shows an empty label while syncing with no pending count', () => {
        const element = render({
            syncState: 'syncing',
            pendingOperationsCount: 0
        });
        expect(q(element, '.sync-status')).not.toBeNull();
        expect(q(element, '.sync-status-text').textContent).toBe('');
    });

    it('shows "Save failed" immediately and keeps it visible', async () => {
        const element = render();
        await update(element, { syncState: 'failed' });

        expect(q(element, '.sync-status-text').textContent).toBe('Save failed');
        expect(q(element, '.sync-status lightning-icon').iconName).toBe(
            'utility:error'
        );
        expect(jest.getTimerCount()).toBe(0);

        jest.advanceTimersByTime(10000);
        await Promise.resolve();
        expect(q(element, '.sync-status')).not.toBeNull();
    });

    it('shows "Saved" after syncing completes, then fades away', async () => {
        const element = render({
            syncState: 'syncing',
            pendingOperationsCount: 1
        });

        await update(element, {
            syncState: 'idle',
            lastSyncTime: 1700000000000
        });

        const sync = q(element, '.sync-status');
        expect(q(element, '.sync-status-text').textContent).toBe('Saved');
        expect(sync.classList.contains('sync-idle')).toBe(true);
        expect(sync.classList.contains('fade-out')).toBe(true);
        expect(q(element, '.sync-status lightning-icon').iconName).toBe(
            'utility:success'
        );

        jest.advanceTimersByTime(2999);
        await Promise.resolve();
        expect(q(element, '.sync-status')).not.toBeNull();

        jest.advanceTimersByTime(1);
        await Promise.resolve();
        expect(q(element, '.sync-status')).toBeNull();
    });

    it('does not show "Saved" when idle without a prior sync', async () => {
        const element = render();
        await update(element, { lastSyncTime: 1700000000000 });
        expect(q(element, '.sync-status')).toBeNull();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('syncing again cancels a pending fade', async () => {
        const element = render({ syncState: 'syncing' });
        await update(element, {
            syncState: 'idle',
            lastSyncTime: 1700000000000
        });
        expect(jest.getTimerCount()).toBe(1);

        await update(element, {
            syncState: 'syncing',
            pendingOperationsCount: 2
        });
        expect(jest.getTimerCount()).toBe(0);

        jest.advanceTimersByTime(5000);
        await Promise.resolve();
        expect(q(element, '.sync-status-text').textContent).toBe('Saving 2...');
    });

    it('shows "Updated" for a new polling update, then fades', async () => {
        const element = render({ status: 'polling' });
        await update(element, {
            status: 'polling',
            pollingUpdateDetected: 111
        });

        expect(q(element, '.sync-status-text').textContent).toBe('Updated');
        expect(q(element, '.sync-status').title).toBe('Updated');

        jest.advanceTimersByTime(3000);
        await Promise.resolve();
        expect(q(element, '.sync-status')).toBeNull();

        // Same marker again does not re-show the indicator
        await update(element, {
            status: 'polling',
            pollingUpdateDetected: 111
        });
        expect(q(element, '.sync-status')).toBeNull();

        // A new marker does
        await update(element, {
            status: 'polling',
            pollingUpdateDetected: 222
        });
        expect(q(element, '.sync-status-text').textContent).toBe('Updated');
    });

    it('falls back to a question icon for an unknown sync state', async () => {
        const element = render();
        await update(element, {
            syncState: 'paused',
            pollingUpdateDetected: 5
        });

        const sync = q(element, '.sync-status');
        expect(sync.classList.contains('sync-paused')).toBe(true);
        expect(sync.classList.contains('fade-out')).toBe(false);
        expect(q(element, '.sync-status lightning-icon').iconName).toBe(
            'utility:question'
        );
    });

    it('clears the fade timer when removed from the DOM', async () => {
        const element = render({ syncState: 'syncing' });
        await update(element, {
            syncState: 'idle',
            lastSyncTime: 1700000000000
        });
        expect(jest.getTimerCount()).toBe(1);

        document.body.removeChild(element);
        expect(jest.getTimerCount()).toBe(0);
    });
});
