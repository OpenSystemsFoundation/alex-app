import kanbanReducer, { initialState } from './kanbanReducer';
import {
    deleteCard,
    initializeBoard,
    moveCard,
    previewMoveCard,
    cancelPreviewMove,
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
    static instance = null;
    constructor() {
        if (BoardStore.instance) {
            return BoardStore.instance;
        }
        this.state = initialState;
        this.previousState = initialState;
        this.listeners = [];
        BoardStore.instance = this;
    }

    static getInstance() {
        if (!BoardStore.instance) {
            BoardStore.instance = new BoardStore();
        }
        return BoardStore.instance;
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
        try {
            // Get board state before optimistic update
            const board = this.state.boards[boardId];
            const originalCards = board?.originalCards || board?.cards || [];
            
            // Perform optimistic update immediately without loading state for instant user feedback
            // This provides a responsive UI while the server processes the request in the background
            if (board?.previewState) {
                this.dispatch(moveCard(boardId, dropData));
            } else {
                this.dispatch(moveCard(boardId, dropData));
            }
            
            const updatedBoard = this.state.boards[boardId];
            if (!updatedBoard) {
                throw new Error(`Board with ID ${boardId} not found.`);
            }
            
            // OPTIMIZATION: Only send cards with changed positions/columns to the server
            // This reduces payload size and server processing time significantly
            const cardsToUpdate = this.getCardsWithChangedPositions(
                updatedBoard.cards,
                originalCards,
                dropData
            );
            
            // Background sync - only if there are changes
            if (cardsToUpdate.length > 0) {
                const updatedCards = await boardService.queueUpdateCards(cardsToUpdate);
                // Only update if backend has different data
                if (this.hasBackendChanges(boardId, updatedCards)) {
                    this.dispatch(updateCards(boardId, updatedCards));
                }
            }
        } catch (error) {
            // Only on error, revert the optimistic update
            this.dispatch(setError(error, true));
        }
    }

    getCardsWithChangedPositions(currentCards, originalCards, dropData) {
        return currentCards.filter(card => {
            // Only include cards from affected columns
            if (card.columnId !== dropData.sourceColumnId && 
                card.columnId !== dropData.targetColumnId) {
                return false;
            }
            
            const original = originalCards.find(c => c.cardId === card.cardId);
            if (!original) return true; // New card
            
            // Check if position or column changed
            return original.cardPosition !== card.cardPosition ||
                   original.columnId !== card.columnId ||
                   original.cardStatus !== card.cardStatus;
        });
    }

    hasBackendChanges(boardId, incomingCards) {
        const board = this.state.boards[boardId];
        if (!board) return true;
        
        // Check if any incoming card has different data than current state
        return incomingCards.some(incomingCard => {
            const currentCard = board.cards.find(c => c.cardId === incomingCard.cardId);
            if (!currentCard) return true;
            
            return currentCard.cardPosition !== incomingCard.cardPosition ||
                   currentCard.columnId !== incomingCard.columnId ||
                   currentCard.lastModifiedDate < incomingCard.lastModifiedDate;
        });
    }

    previewMoveCard(boardId, dropData) {
        try {
            this.dispatch(previewMoveCard(boardId, dropData));
        } catch (error) {
            this.dispatch(setError(error));
        }
    }

    cancelPreviewMove(boardId) {
        try {
            this.dispatch(cancelPreviewMove(boardId));
        } catch (error) {
            this.dispatch(setError(error));
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
        try {
            // No loading state for platform event updates (better UX)
            this.dispatch(updateCard(boardId, cardData));
        } catch (error) {
            this.dispatch(setError(error));
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

export default BoardStore.getInstance();
