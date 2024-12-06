import {
    CREATE_CARD,
    DELETE_CARD,
    ERROR,
    INITIALIZE_BOARD,
    MOVE_CARD,
    SET_LOADING,
    UPDATE_CARD,
    UPDATE_CARDS,
    UPSERT_CARD,
    UPSERT_CARDS,
    DELETE_COLUMN,
    UPDATE_COLUMN,
    UPSERT_COLUMN
} from './actionTypes';

const MINUS_ONE = -1;
const ZERO = 0;
const ONE = 1;

const initialState = {
    boards: {},
    error: null,
    isCardLoading: false,
    isCardUpdating: false
};

const updateBoardState = (state, boardId, updates) => ({
    ...state,
    boards: {
        ...state.boards,
        [boardId]: {
            ...(state.boards[boardId] || {
                boardId: null,
                board: {},
                columns: [],
                cards: [],
                isLoading: false
            }),
            ...updates
        }
    }
});

function kanbanReducer(state = initialState, action) {
    switch (action.type) {
        case INITIALIZE_BOARD: {
            const { boardId, board, columns, cards } = action.payload;
            return updateBoardState(state, boardId, {
                boardId,
                board,
                columns,
                cards,
                isLoading: false
            });
        }

        case SET_LOADING: {
            const { boardId, isLoading } = action.payload;
            return updateBoardState(state, boardId, {
                isLoading
            });
        }

        case ERROR: {
            const { error, revert } = action.payload;
            return revert
                ? { ...state.previousState, error }
                : { ...state, error };
        }

        case CREATE_CARD: {
            const { boardId, card } = action.payload;
            return updateBoardState(state, boardId, {
                cards: [...(state.boards[boardId]?.cards || []), card]
            });
        }

        case UPDATE_CARD: {
            const { boardId, cardId, lastModifiedDate, ...fieldsToUpdate } =
                action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const updatedCards = board.cards.map(card => {
                if (card.cardId !== cardId) return card;
                if (card.lastModifiedDate >= lastModifiedDate) {
                    return card;
                }
                return {
                    ...card,
                    lastModifiedDate,
                    ...fieldsToUpdate
                };
            });

            return updateBoardState(state, boardId, {
                cards: updatedCards
            });
        }

        case UPDATE_CARDS: {
            const { boardId, cards: incomingCards } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const updatedCards = board.cards.map(card => {
                const incomingCard = incomingCards.find(
                    uCard => uCard.cardId === card.cardId
                );
                if (
                    incomingCard &&
                    card.lastModifiedDate < incomingCard.lastModifiedDate
                ) {
                    return { ...card, ...incomingCard };
                }
                return card;
            });

            const newCards = incomingCards.filter(
                incomingCard =>
                    !board.cards.some(
                        card => card.cardId === incomingCard.cardId
                    )
            );

            return updateBoardState(state, boardId, {
                cards: [...updatedCards, ...newCards]
            });
        }

        case DELETE_CARD: {
            const { boardId, cardId } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const filteredCards = board.cards.filter(
                card => card.cardId !== cardId
            );
            return updateBoardState(state, boardId, {
                cards: filteredCards
            });
        }

        case MOVE_CARD: {
            const {
                boardId,
                cardId,
                sourceColumnId,
                targetColumnId,
                targetCardId,
                targetColumnStatus
            } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const { cards } = board;

            const cardToMove = {
                ...cards.find(card => card.cardId === cardId)
            };
            if (!cardToMove) return state;

            cardToMove.columnId = targetColumnId;
            if (targetColumnStatus) {
                cardToMove.cardStatus = targetColumnStatus;
            }

            const updatedSourceListCards = cards.filter(
                card =>
                    card.columnId === sourceColumnId && card.cardId !== cardId
            );

            let destinationListCards = cards.filter(
                card => card.columnId === targetColumnId
            );

            // If moving within the same column, remove the card from the destination list too
            if (sourceColumnId === targetColumnId) {
                destinationListCards = destinationListCards.filter(
                    card => card.cardId !== cardId
                );
            }

            const targetCardIndex = targetCardId
                ? destinationListCards.findIndex(
                      card => card.cardId === targetCardId
                  )
                : MINUS_ONE;

            if (targetCardIndex !== MINUS_ONE) {
                // Determine if targetCard is the top or bottom card
                const isTopCard = targetCardIndex === ZERO;
                const isBottomCard =
                    targetCardIndex === destinationListCards.length - ONE;

                if (sourceColumnId === targetColumnId) {
                    // Moving within the same column
                    if (
                        cardToMove.cardPosition <
                        destinationListCards[targetCardIndex].cardPosition
                    ) {
                        // Moving downwards, place after the targetCard
                        destinationListCards.splice(
                            targetCardIndex + ONE,
                            ZERO,
                            cardToMove
                        );
                    } else {
                        // Moving upwards, place before the targetCard
                        destinationListCards.splice(
                            targetCardIndex,
                            ZERO,
                            cardToMove
                        );
                    }
                } else {
                    // Moving between columns
                    if (isTopCard) {
                        // Insert before the top card
                        destinationListCards.splice(
                            targetCardIndex,
                            ZERO,
                            cardToMove
                        );
                    } else if (isBottomCard) {
                        // Insert after the bottom card
                        destinationListCards.splice(
                            targetCardIndex + ONE,
                            ZERO,
                            cardToMove
                        );
                    } else {
                        // Default behavior: Insert before the target card
                        destinationListCards.splice(
                            targetCardIndex,
                            ZERO,
                            cardToMove
                        );
                    }
                }
            } else {
                // If no targetCardId is provided, add card to the end
                destinationListCards.push(cardToMove);
            }

            const recalculatedTargetList = destinationListCards.map(
                (card, index) => ({
                    ...card,
                    cardPosition: index + ONE
                })
            );

            // Recalculate positions in the source column if it moved
            let recalculatedSourceList;
            if (sourceColumnId === targetColumnId) {
                recalculatedSourceList = [];
            } else {
                recalculatedSourceList = updatedSourceListCards.map(
                    (card, index) => ({
                        ...card,
                        cardPosition: index + ONE
                    })
                );
            }

            // Merge the recalculated columns back into the main cards array
            const finalCards = [
                ...cards.filter(
                    card =>
                        card.columnId !== sourceColumnId &&
                        card.columnId !== targetColumnId
                ),
                ...recalculatedSourceList,
                ...recalculatedTargetList
            ];

            return updateBoardState(state, boardId, {
                cards: finalCards
            });
        }

        case UPSERT_CARD: {
            const { boardId, card: incomingCard } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const existingCard = board.cards.find(
                card => card.cardId === incomingCard.cardId
            );

            if (!existingCard) {
                return updateBoardState(state, boardId, {
                    cards: [...board.cards, incomingCard]
                });
            } else if (
                existingCard.lastModifiedDate < incomingCard.lastModifiedDate
            ) {
                const updatedCards = board.cards.map(card => {
                    if (card.cardId === incomingCard.cardId) {
                        return incomingCard;
                    }
                    return card;
                });
                return updateBoardState(state, boardId, {
                    cards: updatedCards
                });
            }
            return state;
        }

        case UPSERT_CARDS: {
            const { boardId, cards: incomingCards } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const updatedCards = board.cards.map(card => {
                const incomingCard = incomingCards.find(
                    upCard => upCard.cardId === card.cardId
                );
                if (
                    incomingCard &&
                    card.lastModifiedDate < incomingCard.lastModifiedDate
                ) {
                    return { ...card, ...incomingCard };
                }
                return card;
            });

            const newCards = incomingCards.filter(
                incomingCard =>
                    !board.cards.some(
                        card => card.cardId === incomingCard.cardId
                    )
            );

            return updateBoardState(state, boardId, {
                cards: [...updatedCards, ...newCards]
            });
        }

        case UPDATE_COLUMN: {
            const { boardId, columnId, lastModifiedDate, ...fieldsToUpdate } =
                action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const updatedColumns = board.columns.map(column => {
                if (column.columnId !== columnId) return column;
                if (column.lastModifiedDate >= lastModifiedDate) {
                    return column;
                }
                return {
                    ...column,
                    lastModifiedDate,
                    ...fieldsToUpdate
                };
            });

            return updateBoardState(state, boardId, {
                columns: updatedColumns
            });
        }

        case DELETE_COLUMN: {
            const { boardId, columnId } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const filteredColumns = board.columns.filter(
                column => column.columnId !== columnId
            );
            return updateBoardState(state, boardId, {
                columns: filteredColumns
            });
        }

        case UPSERT_COLUMN: {
            const { boardId, column: incomingColumn } = action.payload;
            const board = state.boards[boardId];
            if (!board) return state;

            const existingColumn = board.columns.find(
                column => column.columnId === incomingColumn.columnId
            );

            if (!existingColumn) {
                return updateBoardState(state, boardId, {
                    columns: [...board.columns, incomingColumn]
                });
            } else if (
                existingColumn.lastModifiedDate <
                incomingColumn.lastModifiedDate
            ) {
                const updatedColumns = board.columns.map(column => {
                    if (column.columnId === incomingColumn.columnId) {
                        return incomingColumn;
                    }
                    return column;
                });
                return updateBoardState(state, boardId, {
                    columns: updatedColumns
                });
            }
            return state;
        }

        default:
            return state;
    }
}

export default kanbanReducer;
export { initialState };
