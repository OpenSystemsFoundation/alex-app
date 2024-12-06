import boardStore from '../kanbanBoardStore';
import {
    initializeBoard,
    setLoading,
    setError,
    moveCard,
    createCard,
    updateCard,
    deleteCard
} from '../actionCreators';

describe('BoardStore', () => {
    beforeEach(() => {
        boardStore.state = {
            boards: {
                board1: {
                    boardId: 'board1',
                    board: {},
                    columns: [],
                    cards: [],
                    isLoading: false
                }
            },
            error: null
        };
    });

    it('should initialize the board', () => {
        const boardId = 'board1';
        const board = { name: 'Test Board' };
        const columns = [{ id: 'col1', name: 'Column 1' }];
        const cards = [
            { cardId: 'card1', columnId: 'col1', cardName: 'Card 1' }
        ];

        boardStore.dispatch(initializeBoard(boardId, board, columns, cards));

        const state = boardStore.getState();
        expect(state.boards.board1.boardId).toBe(boardId);
        expect(state.boards.board1.board).toEqual(board);
        expect(state.boards.board1.columns).toEqual(columns);
        expect(state.boards.board1.cards).toEqual(cards);
        expect(state.boards.board1.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should set loading state', () => {
        boardStore.dispatch(setLoading('board1', true));
        expect(boardStore.getState().boards.board1.isLoading).toBe(true);

        boardStore.dispatch(setLoading('board1', false));
        expect(boardStore.getState().boards.board1.isLoading).toBe(false);
    });

    it('should set error state', () => {
        const error = 'An error occurred';
        boardStore.dispatch(setError(error));
        expect(boardStore.getState().error).toBe(error);
    });

    it('should move a card', () => {
        const initialCards = [
            { cardId: 'card1', columnId: 'col1', cardPosition: 1 },
            { cardId: 'card2', columnId: 'col1', cardPosition: 2 }
        ];
        boardStore.state.boards.board1.cards = initialCards;

        const dropData = {
            cardId: 'card1',
            sourceColumnId: 'col1',
            targetColumnId: 'col2',
            targetPosition: 1
        };

        boardStore.dispatch(moveCard('board1', dropData));

        const state = boardStore.getState();
        const movedCard = state.boards.board1.cards.find(
            card => card.cardId === 'card1'
        );
        expect(movedCard.columnId).toBe('col2');
        expect(movedCard.cardPosition).toBe(1);
    });

    it('should create a new card', () => {
        const newCard = {
            cardId: 'card1',
            cardSubject: 'New Card',
            cardStatus: 'To Do',
            cardType: 'Task',
            cardName: 'Card 1',
            columnId: 'col1',
            cardPosition: 1
        };

        boardStore.dispatch(createCard('board1', newCard));

        const state = boardStore.getState();
        expect(state.boards.board1.cards).toContainEqual(newCard);
    });

    it('should update an existing card', () => {
        const initialCard = {
            cardId: 'card1',
            cardSubject: 'Old Subject',
            cardStatus: 'To Do',
            cardType: 'Task',
            cardName: 'Card 1',
            columnId: 'col1',
            cardPosition: 1
        };
        boardStore.state.boards.board1.cards = [initialCard];

        const updatedCardData = {
            cardId: 'card1',
            cardSubject: 'Updated Subject'
        };

        boardStore.dispatch(updateCard('board1', updatedCardData));

        const state = boardStore.getState();
        expect(
            state.boards.board1.cards.find(card => card.cardId === 'card1')
                .cardSubject
        ).toBe('Updated Subject');
    });

    it('should delete a card', () => {
        const initialCard = {
            cardId: 'card1',
            cardSubject: 'Card to be deleted',
            cardStatus: 'To Do',
            cardType: 'Task',
            cardName: 'Card 1',
            columnId: 'col1',
            cardPosition: 1
        };
        boardStore.state.boards.board1.cards = [initialCard];

        boardStore.dispatch(deleteCard('board1', 'card1'));

        const state = boardStore.getState();
        expect(
            state.boards.board1.cards.find(card => card.cardId === 'card1')
        ).toBeUndefined();
    });
});
