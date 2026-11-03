/**
 * Unit tests for analyticsThunks — cycle time and cumulative flow loaders.
 */

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

import getCycleTimeAnalyticsApex from '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics';
import getCumulativeFlowDataApex from '@salesforce/apex/KanbanBoardController.getCumulativeFlowData';
import {
    loadCycleTimeAnalyticsAsync,
    loadCumulativeFlowDataAsync
} from '../../thunks/analyticsThunks';

let consoleErrorSpy;

beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
});

describe('loadCycleTimeAnalyticsAsync', () => {
    it('defaults to a 30 day window', async () => {
        const data = { averageDays: 4.2, cards: [] };
        getCycleTimeAnalyticsApex.mockResolvedValue(data);

        const result = await loadCycleTimeAnalyticsAsync('board1')();

        expect(getCycleTimeAnalyticsApex).toHaveBeenCalledWith({
            boardId: 'board1',
            daysBack: 30
        });
        expect(result).toEqual({ success: true, data });
    });

    it('passes a custom window', async () => {
        getCycleTimeAnalyticsApex.mockResolvedValue({});

        await loadCycleTimeAnalyticsAsync('board1', 90)();

        expect(getCycleTimeAnalyticsApex).toHaveBeenCalledWith({
            boardId: 'board1',
            daysBack: 90
        });
    });

    it('logs and rethrows Apex errors', async () => {
        const error = new Error('cycle failed');
        getCycleTimeAnalyticsApex.mockRejectedValue(error);

        await expect(loadCycleTimeAnalyticsAsync('board1')()).rejects.toBe(
            error
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error loading cycle time analytics:',
            error
        );
    });
});

describe('loadCumulativeFlowDataAsync', () => {
    it('defaults to a 30 day window', async () => {
        const data = { dates: ['2026-01-01'], series: [] };
        getCumulativeFlowDataApex.mockResolvedValue(data);

        const result = await loadCumulativeFlowDataAsync('board1')();

        expect(getCumulativeFlowDataApex).toHaveBeenCalledWith({
            boardId: 'board1',
            daysBack: 30
        });
        expect(result).toEqual({ success: true, data });
    });

    it('passes a custom window', async () => {
        getCumulativeFlowDataApex.mockResolvedValue({});

        await loadCumulativeFlowDataAsync('board1', 7)();

        expect(getCumulativeFlowDataApex).toHaveBeenCalledWith({
            boardId: 'board1',
            daysBack: 7
        });
    });

    it('logs and rethrows Apex errors', async () => {
        const error = new Error('cfd failed');
        getCumulativeFlowDataApex.mockRejectedValue(error);

        await expect(loadCumulativeFlowDataAsync('board1')()).rejects.toBe(
            error
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error loading cumulative flow data:',
            error
        );
    });
});
