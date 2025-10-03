/**
 * Kanban Board State Store - Redux-style singleton
 * Manages immutable state for optimistic UI updates and drag/drop operations
 */

class KanbanStore {
    constructor() {
        // Each component gets its own store instance
        // No singleton pattern - allows multiple browser windows/tabs
        
        // Initialize state
        this._state = {
            columns: [],
            board: null,
            dragState: null,
            isDragging: false,
            dragSource: null
        };
        
        // Subscribers for state changes
        this._subscribers = new Set();
        
        // Performance optimization
        this._lastDragPosition = null; // Cache last drag position
        this._pendingUpdate = false; // Batch update flag
    }
    
    /**
     * Get current state (immutable)
     */
    getState() {
        return Object.freeze({ ...this._state });
    }
    
    /**
     * Get columns - returns drag preview when dragging, otherwise normal columns
     */
    getColumns() {
        if (this._state.isDragging && this._state.dragState && Array.isArray(this._state.dragState)) {
            return this._state.dragState;
        }
        return this._state.columns || [];
    }
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Called when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }
    
    /**
     * Notify all subscribers of state change
     */
    _notifySubscribers() {
        const state = this.getState();
        this._subscribers.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                // Error in subscriber callback
            }
        });
    }
    
    /**
     * Dispatch action to update state
     * @param {Object} action - Action object with type and payload
     */
    dispatch(action) {
        const prevState = this._state;
        
        switch (action.type) {
            case 'SET_BOARD':
                this._state = {
                    ...this._state,
                    board: action.payload
                };
                break;
                
            case 'SET_COLUMNS':
                this._state = {
                    ...this._state,
                    columns: JSON.parse(JSON.stringify(action.payload))
                };
                break;
                
            case 'UPDATE_COLUMNS':
                this._state = {
                    ...this._state,
                    columns: JSON.parse(JSON.stringify(action.payload))
                };
                break;
                
            case 'START_DRAG':
                if (!this._state.columns || this._state.columns.length === 0) {
                    break;
                }
                this._state = {
                    ...this._state,
                    isDragging: true,
                    dragSource: action.payload.source,
                    dragState: JSON.parse(JSON.stringify(this._state.columns))
                };
                break;
                
            case 'UPDATE_DRAG_POSITION':
                // Check if position actually changed
                const newPosKey = `${action.payload.targetColumnId}-${action.payload.targetIndex}`;
                if (this._lastDragPosition === newPosKey) {
                    // Position hasn't changed, skip update
                    return;
                }
                this._lastDragPosition = newPosKey;
                
                this._state = {
                    ...this._state,
                    dragState: this._calculateDragState(
                        action.payload.targetColumnId,
                        action.payload.targetIndex
                    )
                };
                break;
                
            case 'COMMIT_DRAG':
                // Commit drag state to columns
                this._state = {
                    ...this._state,
                    columns: JSON.parse(JSON.stringify(this._state.dragState)),
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                };
                this._lastDragPosition = null; // Reset cache
                break;
                
            case 'CANCEL_DRAG':
                // Revert to original state
                this._state = {
                    ...this._state,
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                };
                this._lastDragPosition = null; // Reset cache
                break;
                
            case 'MOVE_CARD':
                this._state = {
                    ...this._state,
                    columns: this._moveCardInState(
                        action.payload.cardId,
                        action.payload.targetColumnId,
                        action.payload.targetIndex
                    )
                };
                break;
                
            case 'ADD_CARD':
                this._state = {
                    ...this._state,
                    columns: this._addCardToState(
                        action.payload.card,
                        action.payload.columnId
                    )
                };
                break;
                
            case 'UPDATE_CARD':
                this._state = {
                    ...this._state,
                    columns: this._updateCardInState(
                        action.payload.cardId || action.payload.card?.Id,
                        action.payload.updates || action.payload.card
                    )
                };
                break;
                
            case 'DELETE_CARD':
                this._state = {
                    ...this._state,
                    columns: this._deleteCardFromState(action.payload.cardId)
                };
                break;
                
            default:
                return;
        }
        
        // Notify subscribers
        this._notifySubscribers();
    }
    
    /**
     * Calculate new drag state based on target position (optimized)
     */
    _calculateDragState(targetColumnId, targetIndex) {
        if (!this._state.columns || this._state.columns.length === 0) {
            return [];
        }
        
        const { dragSource } = this._state;
        
        if (!dragSource) {
            return this._state.columns;
        }
        
        // Clone only what we need to modify
        const newState = this._state.columns.map(col => {
            // Only clone columns that will be modified
            if (col.Id === dragSource.columnId || col.Id === targetColumnId) {
                return {
                    ...col,
                    cards: [...col.cards] // Shallow copy of cards array
                };
            }
            // Return unchanged columns as-is
            return col;
        });
        
        // Find source column and card
        const sourceColumn = newState.find(col => col.Id === dragSource.columnId);
        if (!sourceColumn || !sourceColumn.cards[dragSource.cardIndex]) {
            return this._state.columns;
        }
        
        const draggedCard = sourceColumn.cards[dragSource.cardIndex];
        
        // Remove card from source
        sourceColumn.cards.splice(dragSource.cardIndex, 1);
        
        // Find target column
        const targetColumn = newState.find(col => col.Id === targetColumnId);
        if (!targetColumn) {
            return this._state.columns;
        }
        
        // Calculate adjusted index if moving within same column
        let adjustedIndex = targetIndex;
        if (dragSource.columnId === targetColumnId && dragSource.cardIndex < targetIndex) {
            adjustedIndex = targetIndex - 1;
        }
        
        // Insert at target position
        targetColumn.cards.splice(adjustedIndex, 0, draggedCard);
        
        // Update card counts
        sourceColumn.cardCount = sourceColumn.cards.length;
        targetColumn.cardCount = targetColumn.cards.length;
        
        return newState;
    }
    
    /**
     * Move card within state
     */
    _moveCardInState(cardId, targetColumnId, targetIndex) {
        const newState = JSON.parse(JSON.stringify(this._state.columns));
        
        // Find source column and card
        let sourceColumn = null;
        let cardIndex = -1;
        let card = null;
        
        for (const col of newState) {
            cardIndex = col.cards.findIndex(c => c.Id === cardId);
            if (cardIndex !== -1) {
                sourceColumn = col;
                card = col.cards[cardIndex];
                break;
            }
        }
        
        if (!card || !sourceColumn) return newState;
        
        // Remove from source
        sourceColumn.cards.splice(cardIndex, 1);
        sourceColumn.cardCount = sourceColumn.cards.length;
        
        // Add to target
        const targetColumn = newState.find(col => col.Id === targetColumnId);
        if (!targetColumn) return newState;
        
        card.columnId = targetColumnId;
        
        if (targetIndex !== undefined && targetIndex !== null) {
            targetColumn.cards.splice(targetIndex, 0, card);
        } else {
            targetColumn.cards.push(card);
        }
        
        targetColumn.cardCount = targetColumn.cards.length;
        
        return newState;
    }
    
    /**
     * Add card to state
     */
    _addCardToState(card, columnId) {
        const newState = JSON.parse(JSON.stringify(this._state.columns));
        const column = newState.find(col => col.Id === columnId);
        
        if (column) {
            column.cards.push(card);
            column.cardCount = column.cards.length;
        }
        
        return newState;
    }
    
    /**
     * Update card in state
     */
    /**
     * Update card in state (supports partial or full updates)
     */
    _updateCardInState(cardIdOrCard, updates) {
        const newState = JSON.parse(JSON.stringify(this._state.columns));
        
        // Support both formats: (cardId, updates) or (fullCard)
        const cardId = typeof cardIdOrCard === 'string' ? cardIdOrCard : cardIdOrCard?.Id;
        const cardUpdates = updates || cardIdOrCard;
        
        if (!cardId) {
            return newState;
        }
        
        // Find the card and check if column changed
        let sourceColumn = null;
        let cardIndex = -1;
        let existingCard = null;
        
        for (const column of newState) {
            cardIndex = column.cards.findIndex(c => c.Id === cardId);
            if (cardIndex !== -1) {
                sourceColumn = column;
                existingCard = column.cards[cardIndex];
                break;
            }
        }
        
        if (!existingCard) {
            return newState;
        }
        
        // Merge updates
        const updatedCard = { ...existingCard, ...cardUpdates };
        
        // Check if columnId changed (card moved to different column)
        if (cardUpdates.columnId && cardUpdates.columnId !== sourceColumn.Id) {
            
            // Remove from source column
            sourceColumn.cards.splice(cardIndex, 1);
            sourceColumn.cardCount = sourceColumn.cards.length;
            
            // Add to target column
            const targetColumn = newState.find(col => col.Id === cardUpdates.columnId);
            if (targetColumn) {
                targetColumn.cards.push(updatedCard);
                targetColumn.cardCount = targetColumn.cards.length;
            }
        } else {
            // Update in same column
            sourceColumn.cards[cardIndex] = updatedCard;
        }
        
        return newState;
    }
    
    /**
     * Delete card from state
     */
    _deleteCardFromState(cardId) {
        const newState = JSON.parse(JSON.stringify(this._state.columns));
        
        for (const column of newState) {
            const cardIndex = column.cards.findIndex(c => c.Id === cardId);
            if (cardIndex !== -1) {
                column.cards.splice(cardIndex, 1);
                column.cardCount = column.cards.length;
                break;
            }
        }
        
        return newState;
    }
    
    /**
     * Simple state hash for logging
     */
    _hashState(state) {
        return JSON.stringify(state).length;
    }
    
    /**
     * Reset store (useful for testing)
     */
    reset() {
        this._state = {
            columns: [],
            board: null,
            dragState: null,
            isDragging: false,
            dragSource: null
        };
        this._notifySubscribers();
    }
}

// Export factory function that creates a new store instance
// Each component instance will get its own store
export function createStore() {
    return new KanbanStore();
}

// Also export the class for direct instantiation
export { KanbanStore };
