/**
 * Unit tests for BoardDataLoader
 */

jest.mock(
    'c/kanbanStore',
    () => ({
        loadBoardData: jest.fn((boardId) =>
            jest.fn(() => Promise.resolve({ success: true, boardId }))
        ),
        loadEpicSummariesAsync: jest.fn(() => jest.fn(() => Promise.resolve())),
        setLoading: jest.fn((val) => ({ type: 'SET_LOADING', payload: val })),
        setError: jest.fn((err) => ({ type: 'SET_ERROR', payload: err })),
        clearError: jest.fn(() => ({ type: 'CLEAR_ERROR' }))
    }),
    { virtual: true }
);

jest.mock(
    '@salesforce/apex/KanbanBoardController.getIncrementalUpdates',
    () => ({
        default: jest.fn()
    }),
    { virtual: true }
);

import BoardDataLoader from '../../../kanbanBoard/managers/boardDataLoader';
import { setLoading, setError, clearError } from 'c/kanbanStore';
import getIncrementalUpdates from '@salesforce/apex/KanbanBoardController.getIncrementalUpdates';

function createMockComponent(overrides = {}) {
    const dispatched = [];
    return {
        _recordId: 'board-1',
        _lastSyncTime: null,
        store: {
            dispatch: jest.fn((action) => {
                if (typeof action === 'function') {
                    return action(
                        (a) => dispatched.push(a),
                        () => ({})
                    );
                }
                dispatched.push(action);
                return Promise.resolve();
            }),
            _dispatched: dispatched
        },
        eventHandler: { setBoardId: jest.fn() },
        toastManager: { showError: jest.fn() },
        subscriptionManager: { subscribe: jest.fn() },
        ...overrides
    };
}

describe('BoardDataLoader', () => {
    let component;
    let loader;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        component = createMockComponent();
        loader = new BoardDataLoader(component);
    });

    afterEach(() => {
        loader.stopPolling();
        jest.useRealTimers();
    });

    describe('loadBoardData', () => {
        it('dispatches loading states and loads data', async () => {
            await loader.loadBoardData();

            expect(component.store.dispatch).toHaveBeenCalledWith(
                setLoading(true)
            );
            expect(component.store.dispatch).toHaveBeenCalledWith(clearError());
            // setLoading(false) in finally
            expect(component.store.dispatch).toHaveBeenCalledWith(
                setLoading(false)
            );
        });

        it('sets boardId on eventHandler after load', async () => {
            await loader.loadBoardData();

            expect(component.eventHandler.setBoardId).toHaveBeenCalledWith(
                'board-1'
            );
        });

        it('sets _lastSyncTime after successful load', async () => {
            await loader.loadBoardData();

            expect(component._lastSyncTime).toBeInstanceOf(Date);
        });

        it('does nothing when _recordId is falsy', async () => {
            component._recordId = null;
            loader = new BoardDataLoader(component);

            await loader.loadBoardData();

            expect(component.store.dispatch).not.toHaveBeenCalled();
        });

        it('dispatches error and shows toast on failure', async () => {
            const error = new Error('load failed');
            component.store.dispatch.mockImplementation((action) => {
                if (typeof action === 'function') {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await loader.loadBoardData();

            expect(component.store.dispatch).toHaveBeenCalledWith(
                setError(error)
            );
            expect(component.toastManager.showError).toHaveBeenCalledWith(
                'Error loading board',
                error
            );
        });
    });

    describe('loadIncrementalUpdates', () => {
        it('falls back to full load when no lastSyncTime', async () => {
            component._lastSyncTime = null;
            const spy = jest.spyOn(loader, 'loadBoardData').mockResolvedValue();

            await loader.loadIncrementalUpdates();

            expect(spy).toHaveBeenCalled();
        });

        it('calls getIncrementalUpdates with correct params', async () => {
            const syncTime = new Date('2026-04-14T10:00:00Z');
            component._lastSyncTime = syncTime;
            getIncrementalUpdates.mockResolvedValue({
                hasChanges: false
            });

            await loader.loadIncrementalUpdates();

            expect(getIncrementalUpdates).toHaveBeenCalledWith({
                boardId: 'board-1',
                lastSyncTime: syncTime
            });
        });

        it('applies incremental card updates to store', async () => {
            component._lastSyncTime = new Date();
            const updates = {
                hasChanges: true,
                cards: [
                    { Id: 'c1', subject: 'Updated' },
                    { Id: 'c2', subject: 'Also Updated' }
                ],
                syncTimestamp: '2026-04-14T11:00:00Z'
            };
            getIncrementalUpdates.mockResolvedValue(updates);

            await loader.loadIncrementalUpdates();

            expect(component.store.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD',
                payload: {
                    cardId: 'c1',
                    updates: { Id: 'c1', subject: 'Updated' }
                }
            });
            expect(component.store.dispatch).toHaveBeenCalledWith({
                type: 'UPDATE_CARD',
                payload: {
                    cardId: 'c2',
                    updates: { Id: 'c2', subject: 'Also Updated' }
                }
            });
            expect(component._lastSyncTime).toBe('2026-04-14T11:00:00Z');
        });

        it('falls back to full load on error', async () => {
            component._lastSyncTime = new Date();
            getIncrementalUpdates.mockRejectedValue(new Error('network'));
            const spy = jest.spyOn(loader, 'loadBoardData').mockResolvedValue();

            await loader.loadIncrementalUpdates();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('polling', () => {
        it('starts and stops polling', () => {
            expect(loader.isPolling()).toBe(false);

            loader.startPolling();

            expect(loader.isPolling()).toBe(true);

            loader.stopPolling();

            expect(loader.isPolling()).toBe(false);
        });

        it('does not start duplicate polling', () => {
            loader.startPolling();
            const firstInterval = loader.pollingInterval;

            loader.startPolling(); // second call should be no-op

            expect(loader.pollingInterval).toBe(firstInterval);
        });

        it('resets failedPolls on stop', () => {
            loader.startPolling();
            loader.consecutiveFailedPolls = 5;

            loader.stopPolling();

            expect(loader.consecutiveFailedPolls).toBe(0);
        });
    });

    describe('shouldAttemptReconnect', () => {
        it('returns false when no successful poll', () => {
            expect(loader.shouldAttemptReconnect()).toBe(false);
        });

        it('returns false when last poll is recent', () => {
            loader.lastSuccessfulPoll = Date.now();

            expect(loader.shouldAttemptReconnect()).toBe(false);
        });

        it('returns true when >5 minutes since last poll', () => {
            loader.lastSuccessfulPoll = Date.now() - 400000; // ~6.7 min

            expect(loader.shouldAttemptReconnect()).toBe(true);
        });
    });

    describe('MAX_FAILED_POLLS', () => {
        it('has a static max of 3', () => {
            expect(BoardDataLoader.MAX_FAILED_POLLS).toBe(3);
        });
    });
});
