/**
 * Column Thunks
 *
 * Async action creators for column operations.
 * Handles server communication for column CRUD and reordering.
 *
 * @module columnThunks
 */

import createColumnApex from '@salesforce/apex/ColumnManagementController.createColumn';
import updateColumnApex from '@salesforce/apex/ColumnManagementController.updateColumn';
import deleteColumnApex from '@salesforce/apex/ColumnManagementController.deleteColumn';
import reorderColumnApex from '@salesforce/apex/ColumnManagementController.reorderColumn';
import createDefaultColumnsApex from '@salesforce/apex/ColumnManagementController.createDefaultColumns';
import { setColumns } from '../state/actions';
import { getColumns, getBoardId } from '../state/selectors';
import { processColumnsData } from '../utils/dataProcessors';

/**
 * Merge fresh ColumnDTO data from Apex with existing cards from the store.
 * Apex column endpoints return ColumnDTOs without nested cards, so we
 * preserve the cards array from the current store state.
 * @param {Array} freshColumns - ColumnDTOs from Apex
 * @param {Array} currentColumns - Current columns from store (with cards)
 * @returns {Array} Merged columns with cards preserved
 */
function mergeColumnsWithCards(freshColumns, currentColumns) {
    const cardsByColumnId = {};
    for (const col of currentColumns) {
        if (col.cards && col.cards.length > 0) {
            cardsByColumnId[col.Id] = col.cards;
        }
    }

    const processed = processColumnsData(freshColumns);
    return processed.map((col) => {
        const existingCards = cardsByColumnId[col.Id] || [];
        return {
            ...col,
            cards: existingCards,
            cardCount: existingCards.length
        };
    });
}

/**
 * Create a new column on the current board
 * @param {string} columnHeader - Column name
 * @param {string} category - Column category
 * @param {string} color - Column color hex
 * @param {string} status - Column status
 * @param {number|null} wipLimit - WIP limit
 * @returns {Function} Thunk function
 */
export const createColumnAsync = (
    columnHeader,
    category,
    color,
    status,
    wipLimit
) => {
    return async (dispatch, getState) => {
        const state = getState();
        const boardId = getBoardId(state);
        const currentColumns = getColumns(state);

        // Calculate position at end
        const lastPosition =
            currentColumns.length > 0
                ? currentColumns[currentColumns.length - 1].position
                : null;

        const newColumn = await createColumnApex({
            boardId,
            columnHeader,
            category,
            color,
            status,
            wipLimit,
            previousPosition: lastPosition,
            nextPosition: null
        });

        // Add new column to state (it has no cards yet)
        const processed = processColumnsData([newColumn]);
        const updatedColumns = [...currentColumns, ...processed];
        dispatch(setColumns(updatedColumns));

        return { success: true, column: newColumn };
    };
};

/**
 * Update a column's properties
 * @param {string} columnId - Column ID to update
 * @param {Object} updates - Field updates to apply
 * @returns {Function} Thunk function
 */
export const updateColumnAsync = (columnId, updates) => {
    return async (dispatch, getState) => {
        const state = getState();
        const currentColumns = getColumns(state);

        // Optimistic update
        const optimisticColumns = currentColumns.map((col) => {
            if (col.Id !== columnId) return col;
            const updated = { ...col, ...updates };
            if (updates.color !== undefined) {
                updated.columnStyle = updates.color
                    ? `border-top: 4px solid ${updates.color}`
                    : '';
            }
            if (updates.category !== undefined) {
                updated.isDone = updates.category === 'Done';
                updated.isReleased = updates.category === 'Released';
                updated.isCompleted =
                    updates.category === 'Done' ||
                    updates.category === 'Released';
            }
            if (updates.wipLimit !== undefined) {
                updated.hasWipLimit =
                    updates.wipLimit != null && updates.wipLimit > 0;
            }
            return updated;
        });
        dispatch(setColumns(optimisticColumns));

        try {
            await updateColumnApex({ columnId, updates });
            return { success: true };
        } catch (error) {
            // Rollback on error
            dispatch(setColumns(currentColumns));
            throw error;
        }
    };
};

/**
 * Delete a column
 * @param {string} columnId - Column ID to delete
 * @returns {Function} Thunk function
 */
export const deleteColumnAsync = (columnId) => {
    return async (dispatch, getState) => {
        const state = getState();
        const currentColumns = getColumns(state);

        // Optimistic: remove from state
        const filteredColumns = currentColumns.filter(
            (col) => col.Id !== columnId
        );
        dispatch(setColumns(filteredColumns));

        try {
            await deleteColumnApex({ columnId });
            return { success: true };
        } catch (error) {
            // Rollback on error
            dispatch(setColumns(currentColumns));
            throw error;
        }
    };
};

/**
 * Reorder a column via drag-and-drop
 * @param {string} columnId - Column being moved
 * @param {number} dropIndex - Target index in the reordered array
 * @param {Array} reorderedColumns - Already-reordered columns array for optimistic UI
 * @returns {Function} Thunk function
 */
export const reorderColumnAsync = (columnId, dropIndex, reorderedColumns) => {
    return async (dispatch, getState) => {
        const state = getState();
        const currentColumns = getColumns(state);

        // Calculate LexoRank positions from neighbors
        const prevPosition =
            dropIndex > 0 ? reorderedColumns[dropIndex - 1].position : null;
        const nextPosition =
            dropIndex < reorderedColumns.length - 1
                ? reorderedColumns[dropIndex + 1].position
                : null;

        // Optimistic update
        dispatch(setColumns(reorderedColumns));

        try {
            const result = await reorderColumnApex({
                columnId,
                previousPosition: prevPosition,
                nextPosition: nextPosition
            });

            // Update the moved column with server-assigned position
            const updatedColumns = reorderedColumns.map((col) => {
                if (col.Id !== columnId) return col;
                return { ...col, position: result.position };
            });
            dispatch(setColumns(updatedColumns));

            return { success: true };
        } catch (error) {
            // Rollback on error
            dispatch(setColumns(currentColumns));
            throw error;
        }
    };
};

/**
 * Create columns from a named template
 * @param {string} templateName - Template name ('kanban', 'scrum', 'release')
 * @returns {Function} Thunk function
 */
export const createColumnsFromTemplateAsync = (templateName) => {
    return async (dispatch, getState) => {
        const state = getState();
        const boardId = getBoardId(state);
        const currentColumns = getColumns(state);

        const freshColumns = await createDefaultColumnsApex({
            boardId,
            templateName
        });

        // Template returns all columns for the board; merge with any existing cards
        const merged = mergeColumnsWithCards(freshColumns, currentColumns);
        dispatch(setColumns(merged));

        return { success: true };
    };
};
