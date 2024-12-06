import kanbanReducer, { initialState } from './kanbanReducer';
import {
    deleteCard,
    initializeBoard,
    moveCard,
    setError,
    setLoading,
    updateCard,
    updateCards,
    upsertCard,
    deleteColumn,
    updateColumn,
    upsertColumn
} from './actionCreators.js';
import boardService from 'c/kanbanBoardService';

class BoardStore {
    constructor() {
        this.state = initialState;
        this.previousState = initialState;
        this.listeners = [];
    }

    dispatch(action) {
        this.previousState = this.state;
        this.state = kanbanReducer(this.state, action);
        this.notifyListeners();
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    unsubscribe(listener) {
        this.listeners = this.listeners.filter(lstnr => lstnr !== listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    async initialize(boardId) {
        this.dispatch(setLoading(boardId, true));
        try {
            const result = await boardService.fetchBoardData({ boardId });
            this.dispatch(
                initializeBoard(
                    boardId,
                    result.board,
                    result.columns,
                    result.cards
                )
            );
        } catch (error) {
            this.dispatch(setError(error, true));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    async moveCard(boardId, dropData) {
        this.dispatch(setLoading(boardId, true));
        try {
            this.dispatch(moveCard(boardId, dropData));
            const board = this.state.boards[boardId];
            if (!board) {
                throw new Error(`Board with ID ${boardId} not found.`);
            }
            const updatedCards = await boardService.queueUpdateCards(
                board.cards.filter(
                    card =>
                        card.columnId === dropData.sourceColumnId ||
                        card.columnId === dropData.targetColumnId
                )
            );
            this.dispatch(updateCards(boardId, updatedCards));
        } catch (error) {
            this.dispatch(setError(error, true));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    async createCard(boardId, columnId, columnStatus) {
        this.dispatch(setLoading(boardId, true));
        try {
            const cardData = await boardService.queueCreateCard({
                columnId,
                columnStatus
            });
            this.dispatch(upsertCard(boardId, cardData));
        } catch (error) {
            this.dispatch(setError(error, true));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    addCard(boardId, cardData) {
        try {
            this.dispatch(upsertCard(boardId, cardData));
        } catch (error) {
            this.dispatch(setError(error));
        }
    }

    updateCard(boardId, cardData) {
        this.dispatch(setLoading(boardId, true));
        try {
            this.dispatch(updateCard(boardId, cardData));
        } catch (error) {
            this.dispatch(setError(error));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    async deleteCard(boardId, cardId) {
        this.dispatch(setLoading(boardId, true));
        try {
            this.dispatch(deleteCard(boardId, cardId));
        } catch (error) {
            this.dispatch(setError(error, true));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    addColumn(boardId, columnData) {
        try {
            this.dispatch(upsertColumn(boardId, columnData));
        } catch (error) {
            this.dispatch(setError(error));
        }
    }

    updateColumn(boardId, columnData) {
        this.dispatch(setLoading(boardId, true));
        try {
            this.dispatch(updateColumn(boardId, columnData));
        } catch (error) {
            this.dispatch(setError(error));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }

    async deleteColumn(boardId, columnId) {
        this.dispatch(setLoading(boardId, true));
        try {
            this.dispatch(deleteColumn(boardId, columnId));
        } catch (error) {
            this.dispatch(setError(error, true));
        } finally {
            this.dispatch(setLoading(boardId, false));
        }
    }
}

const boardStore = new BoardStore();
export default boardStore;
