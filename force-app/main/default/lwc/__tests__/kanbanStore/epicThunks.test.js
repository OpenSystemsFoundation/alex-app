/**
 * Tests for epicThunks
 */

// Mock Apex methods
jest.mock(
    '@salesforce/apex/KanbanBoardController.getEpicSummaries',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getEpicDetail',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

import {
    loadEpicSummariesAsync,
    loadEpicDetailAsync
} from '../../kanbanStore/thunks/epicThunks';
import getEpicSummaries from '@salesforce/apex/KanbanBoardController.getEpicSummaries';
import getEpicDetail from '@salesforce/apex/KanbanBoardController.getEpicDetail';

describe('epicThunks', () => {
    let dispatch;

    beforeEach(() => {
        dispatch = jest.fn();
        jest.clearAllMocks();
    });

    describe('loadEpicSummariesAsync', () => {
        it('dispatches setEpicSummaries on success', async () => {
            const mockSummaries = [
                {
                    id: 'epic1',
                    subject: 'Epic One',
                    totalCards: 5,
                    completedCards: 2,
                    progressPercent: 40
                }
            ];
            getEpicSummaries.mockResolvedValue(mockSummaries);

            const thunk = loadEpicSummariesAsync('board1');
            const result = await thunk(dispatch);

            expect(getEpicSummaries).toHaveBeenCalledWith({
                boardId: 'board1'
            });
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET_EPIC_SUMMARIES',
                payload: mockSummaries
            });
            expect(result).toEqual(mockSummaries);
        });

        it('dispatches empty array when apex returns null', async () => {
            getEpicSummaries.mockResolvedValue(null);

            const thunk = loadEpicSummariesAsync('board1');
            const result = await thunk(dispatch);

            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET_EPIC_SUMMARIES',
                payload: []
            });
            // The thunk returns the raw apex result
            expect(result).toBeNull();
        });

        it('returns empty array and does not throw on error', async () => {
            getEpicSummaries.mockRejectedValue(new Error('Network error'));

            const thunk = loadEpicSummariesAsync('board1');
            const result = await thunk(dispatch);

            expect(result).toEqual([]);
            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    describe('loadEpicDetailAsync', () => {
        it('returns epic detail on success', async () => {
            const mockDetail = {
                id: 'epic1',
                subject: 'Epic One',
                totalCards: 3,
                completedCards: 1,
                childCards: [{ id: 'card1', name: 'C-001' }]
            };
            getEpicDetail.mockResolvedValue(mockDetail);

            const thunk = loadEpicDetailAsync('epic1');
            const result = await thunk(dispatch);

            expect(getEpicDetail).toHaveBeenCalledWith({ epicId: 'epic1' });
            expect(result).toEqual(mockDetail);
        });

        it('propagates errors from apex', async () => {
            getEpicDetail.mockRejectedValue(new Error('Not found'));

            const thunk = loadEpicDetailAsync('epic1');
            await expect(thunk(dispatch)).rejects.toThrow('Not found');
        });
    });
});
