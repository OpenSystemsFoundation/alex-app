/**
 * State Helper Functions
 *
 * Pure functions that perform state transformations. These are used
 * by reducers to calculate new state without side effects.
 *
 * @module stateHelpers
 */

/**
 * Calculate new drag state based on target position
 * @param {Object} state - Current state
 * @param {string} targetColumnId - Target column ID
 * @param {number} targetIndex - Target index
 * @returns {Array} New drag state
 */
export const calculateDragState = (state, targetColumnId, targetIndex) => {
    if (!state.columns || state.columns.length === 0) {
        return [];
    }

    const { dragSource } = state;

    if (!dragSource) {
        return state.columns;
    }

    const newState = state.columns.map((col) => {
        if (col.Id === dragSource.columnId || col.Id === targetColumnId) {
            return {
                ...col,
                cards: [...col.cards]
            };
        }
        return col;
    });

    const sourceColumn = newState.find((col) => col.Id === dragSource.columnId);
    if (!sourceColumn || !sourceColumn.cards[dragSource.cardIndex]) {
        return state.columns;
    }

    const draggedCard = sourceColumn.cards[dragSource.cardIndex];

    sourceColumn.cards.splice(dragSource.cardIndex, 1);

    const targetColumn = newState.find((col) => col.Id === targetColumnId);
    if (!targetColumn) {
        return state.columns;
    }

    let adjustedIndex = targetIndex;
    if (
        dragSource.columnId === targetColumnId &&
        dragSource.cardIndex < targetIndex
    ) {
        adjustedIndex = targetIndex - 1;
    }

    targetColumn.cards.splice(adjustedIndex, 0, draggedCard);

    sourceColumn.cardCount = sourceColumn.cards.length;
    targetColumn.cardCount = targetColumn.cards.length;

    return newState;
};

/**
 * Move card within state
 * @param {Array} columns - Current columns
 * @param {string} cardId - Card ID
 * @param {string} targetColumnId - Target column ID
 * @param {number} targetIndex - Target index
 * @returns {Array} New columns state
 */
export const moveCardInState = (
    columns,
    cardId,
    targetColumnId,
    targetIndex
) => {
    const newState = JSON.parse(JSON.stringify(columns));

    let sourceColumn = null;
    let cardIndex = -1;
    let card = null;

    for (const col of newState) {
        cardIndex = col.cards.findIndex((c) => c.Id === cardId);
        if (cardIndex !== -1) {
            sourceColumn = col;
            card = col.cards[cardIndex];
            break;
        }
    }

    if (!card || !sourceColumn) return newState;

    sourceColumn.cards.splice(cardIndex, 1);
    sourceColumn.cardCount = sourceColumn.cards.length;

    const targetColumn = newState.find((col) => col.Id === targetColumnId);
    if (!targetColumn) return newState;

    card.columnId = targetColumnId;

    if (targetIndex !== undefined && targetIndex !== null) {
        targetColumn.cards.splice(targetIndex, 0, card);
    } else {
        targetColumn.cards.push(card);
    }

    targetColumn.cardCount = targetColumn.cards.length;

    return newState;
};

/**
 * Add card to state (maintains lexorank sort order)
 * @param {Array} columns - Current columns
 * @param {Object} card - Card to add
 * @param {string} columnId - Target column ID
 * @returns {Array} New columns state
 */
export const addCardToState = (columns, card, columnId) => {
    const newState = JSON.parse(JSON.stringify(columns));
    const column = newState.find((col) => col.Id === columnId);

    if (column) {
        column.cards.push(card);

        column.cards.sort((a, b) => {
            if (!a.position && !b.position) return 0;
            if (!a.position) return 1;
            if (!b.position) return -1;
            return a.position.localeCompare(b.position);
        });

        column.cardCount = column.cards.length;
    }

    return newState;
};

/**
 * Update card in state (supports partial or full updates)
 * Handles position changes by re-sorting the column
 * @param {Array} columns - Current columns
 * @param {string} cardId - Card ID to update
 * @param {Object} updates - Card updates
 * @returns {Array} New columns state
 */
export const updateCardInState = (columns, cardId, updates) => {
    const newState = JSON.parse(JSON.stringify(columns));

    let sourceColumn = null;
    let cardIndex = -1;
    let existingCard = null;

    for (const column of newState) {
        cardIndex = column.cards.findIndex((c) => c.Id === cardId);
        if (cardIndex !== -1) {
            sourceColumn = column;
            existingCard = column.cards[cardIndex];
            break;
        }
    }

    if (!existingCard) {
        return newState;
    }

    const updatedCard = { ...existingCard, ...updates };

    const columnChanged =
        updates.columnId && updates.columnId !== sourceColumn.Id;

    if (columnChanged) {
        sourceColumn.cards.splice(cardIndex, 1);
        sourceColumn.cardCount = sourceColumn.cards.length;

        const targetColumn = newState.find(
            (col) => col.Id === updates.columnId
        );
        if (targetColumn) {
            targetColumn.cards.push(updatedCard);

            targetColumn.cards.sort((a, b) => {
                if (!a.position && !b.position) return 0;
                if (!a.position) return 1;
                if (!b.position) return -1;
                return a.position.localeCompare(b.position);
            });

            targetColumn.cardCount = targetColumn.cards.length;
        }
    } else if (updates.position) {
        sourceColumn.cards[cardIndex] = updatedCard;

        sourceColumn.cards.sort((a, b) => {
            if (!a.position && !b.position) return 0;
            if (!a.position) return 1;
            if (!b.position) return -1;
            return a.position.localeCompare(b.position);
        });
    } else {
        sourceColumn.cards[cardIndex] = updatedCard;
    }

    return newState;
};

/**
 * Delete card from state
 * @param {Array} columns - Current columns
 * @param {string} cardId - Card ID to delete
 * @returns {Array} New columns state
 */
export const deleteCardFromState = (columns, cardId) => {
    const newState = JSON.parse(JSON.stringify(columns));

    for (const column of newState) {
        const cardIndex = column.cards.findIndex((c) => c.Id === cardId);
        if (cardIndex !== -1) {
            column.cards.splice(cardIndex, 1);
            column.cardCount = column.cards.length;
            break;
        }
    }

    return newState;
};
