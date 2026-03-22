// ─── Mock: Apex methods ─────────────────────────────────────────────
jest.mock(
    '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getCumulativeFlowData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// ─── Imports ────────────────────────────────────────────────────────
import {
    loadCycleTimeAnalyticsAsync,
    loadCumulativeFlowDataAsync
} from '../../kanbanStore/thunks/analyticsThunks';

import getCycleTimeAnalyticsApex from '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics';
import getCumulativeFlowDataApex from '@salesforce/apex/KanbanBoardController.getCumulativeFlowData';

// ─── Tests ──────────────────────────────────────────────────────────
describe('analyticsThunks', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    // ================================================================
    // loadCycleTimeAnalyticsAsync
    // ================================================================
    describe('loadCycleTimeAnalyticsAsync', () => {
        it('returns success with data on successful call', async () => {
            const mockData = {
                averageCycleTimeHours: 48,
                columnTimes: [
                    { columnName: 'In Progress', averageMinutes: 300 }
                ]
            };
            getCycleTimeAnalyticsApex.mockResolvedValue(mockData);

            const thunk = loadCycleTimeAnalyticsAsync('board001', 30);
            const result = await thunk(jest.fn());

            expect(getCycleTimeAnalyticsApex).toHaveBeenCalledWith({
                boardId: 'board001',
                daysBack: 30
            });
            expect(result).toEqual({ success: true, data: mockData });
        });

        it('uses default daysBack of 30', async () => {
            getCycleTimeAnalyticsApex.mockResolvedValue({});

            const thunk = loadCycleTimeAnalyticsAsync('board001');
            await thunk(jest.fn());

            expect(getCycleTimeAnalyticsApex).toHaveBeenCalledWith({
                boardId: 'board001',
                daysBack: 30
            });
        });

        it('logs error and rethrows on failure', async () => {
            const error = new Error('Apex failed');
            getCycleTimeAnalyticsApex.mockRejectedValue(error);
            const spy = jest.spyOn(console, 'error').mockImplementation();

            const thunk = loadCycleTimeAnalyticsAsync('board001', 7);

            await expect(thunk(jest.fn())).rejects.toThrow('Apex failed');
            expect(spy).toHaveBeenCalledWith(
                'Error loading cycle time analytics:',
                error
            );
            spy.mockRestore();
        });
    });

    // ================================================================
    // loadCumulativeFlowDataAsync
    // ================================================================
    describe('loadCumulativeFlowDataAsync', () => {
        it('returns success with data on successful call', async () => {
            const mockData = [
                {
                    snapshotDate: '2026-03-01',
                    columnCounts: { 'To Do': 5, Done: 2 }
                }
            ];
            getCumulativeFlowDataApex.mockResolvedValue(mockData);

            const thunk = loadCumulativeFlowDataAsync('board002', 14);
            const result = await thunk(jest.fn());

            expect(getCumulativeFlowDataApex).toHaveBeenCalledWith({
                boardId: 'board002',
                daysBack: 14
            });
            expect(result).toEqual({ success: true, data: mockData });
        });

        it('uses default daysBack of 30', async () => {
            getCumulativeFlowDataApex.mockResolvedValue([]);

            const thunk = loadCumulativeFlowDataAsync('board002');
            await thunk(jest.fn());

            expect(getCumulativeFlowDataApex).toHaveBeenCalledWith({
                boardId: 'board002',
                daysBack: 30
            });
        });

        it('logs error and rethrows on failure', async () => {
            const error = new Error('CFD load failed');
            getCumulativeFlowDataApex.mockRejectedValue(error);
            const spy = jest.spyOn(console, 'error').mockImplementation();

            const thunk = loadCumulativeFlowDataAsync('board002', 7);

            await expect(thunk(jest.fn())).rejects.toThrow('CFD load failed');
            expect(spy).toHaveBeenCalledWith(
                'Error loading cumulative flow data:',
                error
            );
            spy.mockRestore();
        });
    });
});
