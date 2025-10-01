/**
 * State management for KanbanBoard component
 * Handles state updates and synchronization with the store
 */

export default class KanbanBoardState {
    /**
     * Handle state changes from the store
     * @param {Object} component - Reference to the LWC component
     * @param {Object} state - New state from store
     */
    static handleStateChange(component, state) {
        const { boards, error } = state;
        if (error || !boards) {
            component.error = error;
            return;
        }

        const boardState = boards[component.boardId];
        if (!boardState) {
            component.error = 'Board data not found.';
            return;
        }

        this.updateBoardState(component, boardState);
        component.isLoading = boardState.isLoading;
    }

    /**
     * Update component state with new board data
     * @param {Object} component - Reference to the LWC component
     * @param {Object} boardState - New board state
     */
    static updateBoardState(component, boardState) {
        const { board, columns, cards, isLoading, previewState } = boardState;
        
        component.board = board;
        component.columns = columns;
        component.cards = cards;
        component.previewState = previewState;
        component.error = null;
        component.isLoading = isLoading;
    }
}
