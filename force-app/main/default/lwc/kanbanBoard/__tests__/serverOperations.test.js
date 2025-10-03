import ServerOperations from '../serverOperations';
import moveCard from '@salesforce/apex/KanbanBoardController.moveCard';
import createCard from '@salesforce/apex/KanbanBoardController.createCard';

// Mock Apex methods
jest.mock(
    '@salesforce/apex/KanbanBoardController.moveCard',
    () => {
        return {
            default: jest.fn()
        };
    },
    { virtual: true }
);

jest.mock(
    '@salesforce/apex/KanbanBoardController.createCard',
    () => {
        return {
            default: jest.fn()
        };
    },
    { virtual: true }
);

const MOCK_COLUMNS = [
    {
        Id: 'col1',
        Name: 'To Do',
        cards: [
            { Id: 'card1', position: 'a' },
            { Id: 'card2', position: 'b' },
            { Id: 'card3', position: 'c' }
        ]
    },
    {
        Id: 'col2',
        Name: 'In Progress',
        cards: [{ Id: 'card4', position: 'a' }]
    },
    {
        Id: 'col3',
        Name: 'Done',
        cards: []
    }
];

describe('ServerOperations', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('moveCard', () => {
        it('should call Apex moveCard with correct parameters', async () => {
            moveCard.mockResolvedValue({ newPosition: 'd' });

            await ServerOperations.moveCard('card1', 'col1', 1, MOCK_COLUMNS);

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col1',
                previousCardPosition: 'a',
                nextCardPosition: 'b'
            });
        });

        it('should move card to beginning of column', async () => {
            moveCard.mockResolvedValue({ newPosition: 'a0' });

            await ServerOperations.moveCard('card1', 'col1', 0, MOCK_COLUMNS);

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col1',
                previousCardPosition: null,
                nextCardPosition: 'a'
            });
        });

        it('should move card to end of column', async () => {
            moveCard.mockResolvedValue({ newPosition: 'd' });

            await ServerOperations.moveCard('card1', 'col1', 3, MOCK_COLUMNS);

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col1',
                previousCardPosition: 'c',
                nextCardPosition: null
            });
        });

        it('should move card to empty column', async () => {
            moveCard.mockResolvedValue({ newPosition: 'a' });

            await ServerOperations.moveCard('card1', 'col3', 0, MOCK_COLUMNS);

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col3',
                previousCardPosition: null,
                nextCardPosition: null
            });
        });

        it('should handle null target position', async () => {
            moveCard.mockResolvedValue({ newPosition: 'd' });

            await ServerOperations.moveCard(
                'card1',
                'col1',
                null,
                MOCK_COLUMNS
            );

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col1',
                previousCardPosition: 'c',
                nextCardPosition: null
            });
        });

        it('should throw error when target column not found', async () => {
            await expect(
                ServerOperations.moveCard('card1', 'invalid', 0, MOCK_COLUMNS)
            ).rejects.toThrow('Target column not found');
        });

        it('should return result from Apex call', async () => {
            const mockResult = { newPosition: 'd', success: true };
            moveCard.mockResolvedValue(mockResult);

            const result = await ServerOperations.moveCard(
                'card1',
                'col1',
                1,
                MOCK_COLUMNS
            );

            expect(result).toEqual(mockResult);
        });

        it('should handle Apex errors', async () => {
            moveCard.mockRejectedValue(new Error('Server error'));

            await expect(
                ServerOperations.moveCard('card1', 'col1', 0, MOCK_COLUMNS)
            ).rejects.toThrow('Server error');
        });

        it('should handle column with no cards property', async () => {
            moveCard.mockResolvedValue({ newPosition: 'a' });

            const columnsWithoutCards = [{ Id: 'col1', Name: 'To Do' }];

            await ServerOperations.moveCard(
                'card1',
                'col1',
                0,
                columnsWithoutCards
            );

            expect(moveCard).toHaveBeenCalledWith({
                cardId: 'card1',
                targetColumnId: 'col1',
                previousCardPosition: null,
                nextCardPosition: null
            });
        });
    });

    describe('createCard', () => {
        it('should call Apex createCard with correct parameters', async () => {
            const mockCard = { Id: 'card5', subject: 'New Task' };
            createCard.mockResolvedValue(mockCard);

            await ServerOperations.createCard('col1', 'New Task', MOCK_COLUMNS);

            expect(createCard).toHaveBeenCalledWith({
                columnId: 'col1',
                subject: 'New Task',
                previousCardPosition: 'c',
                nextCardPosition: null
            });
        });

        it('should create card in empty column', async () => {
            const mockCard = { Id: 'card5', subject: 'New Task' };
            createCard.mockResolvedValue(mockCard);

            await ServerOperations.createCard('col3', 'New Task', MOCK_COLUMNS);

            expect(createCard).toHaveBeenCalledWith({
                columnId: 'col3',
                subject: 'New Task',
                previousCardPosition: null,
                nextCardPosition: null
            });
        });

        it('should use default subject when not provided', async () => {
            const mockCard = { Id: 'card5', subject: 'New Card' };
            createCard.mockResolvedValue(mockCard);

            await ServerOperations.createCard('col1', null, MOCK_COLUMNS);

            expect(createCard).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'New Card'
                })
            );
        });

        it('should use default subject when empty string', async () => {
            const mockCard = { Id: 'card5', subject: 'New Card' };
            createCard.mockResolvedValue(mockCard);

            await ServerOperations.createCard('col1', '', MOCK_COLUMNS);

            expect(createCard).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'New Card'
                })
            );
        });

        it('should throw error when column not found', async () => {
            await expect(
                ServerOperations.createCard('invalid', 'Task', MOCK_COLUMNS)
            ).rejects.toThrow('Column not found');
        });

        it('should return created card from Apex', async () => {
            const mockCard = { Id: 'card5', subject: 'New Task' };
            createCard.mockResolvedValue(mockCard);

            const result = await ServerOperations.createCard(
                'col1',
                'New Task',
                MOCK_COLUMNS
            );

            expect(result).toEqual(mockCard);
        });

        it('should handle Apex errors', async () => {
            createCard.mockRejectedValue(new Error('Creation failed'));

            await expect(
                ServerOperations.createCard('col1', 'Task', MOCK_COLUMNS)
            ).rejects.toThrow('Creation failed');
        });

        it('should handle column with no cards property', async () => {
            const mockCard = { Id: 'card5', subject: 'New Task' };
            createCard.mockResolvedValue(mockCard);

            const columnsWithoutCards = [{ Id: 'col1', Name: 'To Do' }];

            await ServerOperations.createCard(
                'col1',
                'Task',
                columnsWithoutCards
            );

            expect(createCard).toHaveBeenCalledWith({
                columnId: 'col1',
                subject: 'Task',
                previousCardPosition: null,
                nextCardPosition: null
            });
        });
    });

    describe('calculatePosition', () => {
        const cards = [
            { Id: 'card1', position: 'a' },
            { Id: 'card2', position: 'b' },
            { Id: 'card3', position: 'c' }
        ];

        it('should calculate position for middle insertion', () => {
            const result = ServerOperations.calculatePosition(1, cards);

            expect(result.previousPosition).toBe('a');
            expect(result.nextPosition).toBe('b');
        });

        it('should calculate position for beginning insertion', () => {
            const result = ServerOperations.calculatePosition(0, cards);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBe('a');
        });

        it('should calculate position for end insertion', () => {
            const result = ServerOperations.calculatePosition(3, cards);

            expect(result.previousPosition).toBe('c');
            expect(result.nextPosition).toBeNull();
        });

        it('should calculate position for null target (append)', () => {
            const result = ServerOperations.calculatePosition(null, cards);

            expect(result.previousPosition).toBe('c');
            expect(result.nextPosition).toBeNull();
        });

        it('should handle empty cards array', () => {
            const result = ServerOperations.calculatePosition(0, []);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBeNull();
        });

        it('should handle null cards array', () => {
            const result = ServerOperations.calculatePosition(null, null);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBeNull();
        });

        it('should handle single card', () => {
            const singleCard = [{ Id: 'card1', position: 'a' }];
            const result = ServerOperations.calculatePosition(0, singleCard);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBe('a');
        });

        it('should handle position beyond array length', () => {
            const result = ServerOperations.calculatePosition(10, cards);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined columns array', async () => {
            await expect(
                ServerOperations.moveCard('card1', 'col1', 0, undefined)
            ).rejects.toThrow();
        });

        it('should handle empty columns array', async () => {
            await expect(
                ServerOperations.moveCard('card1', 'col1', 0, [])
            ).rejects.toThrow('Target column not found');
        });

        it('should handle column with undefined cards', async () => {
            moveCard.mockResolvedValue({ newPosition: 'a' });

            const columnsWithUndefinedCards = [
                { Id: 'col1', Name: 'To Do', cards: undefined }
            ];

            await ServerOperations.moveCard(
                'card1',
                'col1',
                0,
                columnsWithUndefinedCards
            );

            expect(moveCard).toHaveBeenCalledWith(
                expect.objectContaining({
                    previousCardPosition: null,
                    nextCardPosition: null
                })
            );
        });
    });
});
