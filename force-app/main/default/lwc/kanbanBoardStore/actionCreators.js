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

const initializeBoard = (boardId, board, columns, cards) => ({
    type: INITIALIZE_BOARD,
    payload: { boardId, board, columns, cards }
});

const setLoading = (boardId, isLoading) => ({
    type: SET_LOADING,
    payload: { boardId, isLoading }
});

const setError = (error, revert = false) => ({
    type: ERROR,
    payload: { error, revert }
});

const createCard = (boardId, newCard) => ({
    type: CREATE_CARD,
    payload: { boardId, card: newCard }
});

const deleteCard = (boardId, cardId) => ({
    type: DELETE_CARD,
    payload: { boardId, cardId }
});

const moveCard = (boardId, dropData) => ({
    type: MOVE_CARD,
    payload: { boardId, ...dropData }
});

const updateCard = (boardId, cardData) => ({
    type: UPDATE_CARD,
    payload: { boardId, ...cardData }
});

const updateCards = (boardId, cards) => ({
    type: UPDATE_CARDS,
    payload: { boardId, cards }
});

const upsertCard = (boardId, cardData) => ({
    type: UPSERT_CARD,
    payload: { boardId, card: cardData }
});

const upsertCards = (boardId, cardsData) => ({
    type: UPSERT_CARDS,
    payload: { boardId, cards: cardsData }
});

const deleteColumn = (boardId, columnId) => ({
    type: DELETE_COLUMN,
    payload: { boardId, columnId }
});

const updateColumn = (boardId, columnData) => ({
    type: UPDATE_COLUMN,
    payload: { boardId, ...columnData }
});

const upsertColumn = (boardId, columnData) => ({
    type: UPSERT_COLUMN,
    payload: { boardId, column: columnData }
});

export {
    initializeBoard,
    setLoading,
    setError,
    createCard,
    deleteCard,
    moveCard,
    updateCard,
    updateCards,
    upsertCard,
    upsertCards,
    deleteColumn,
    updateColumn,
    upsertColumn
};
