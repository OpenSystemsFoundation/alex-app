import BoardService from 'c/kanbanBoardService';

jest.mock('c/kanbanBoardService', () => ({
    createCard: jest.fn(),
    fetchBoardData: jest.fn(),
    updateCardPositions: jest.fn()
}));

describe('BoardService', () => {
    it('should be a singleton', () => {
        const instance1 = BoardService,
            instance2 = BoardService;
        expect(instance1).toBe(instance2);
    });

    it('should have fetchBoardData method', () => {
        expect(typeof BoardService.fetchBoardData).toBe('function');
    });

    it('should have createCard method', () => {
        expect(typeof BoardService.createCard).toBe('function');
    });

    it('should have updateCardPositions method', () => {
        expect(typeof BoardService.updateCardPositions).toBe('function');
    });
});
