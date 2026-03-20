import * as types from '../../core/actionTypes';
import { calculateDragState } from '../../utils/stateHelpers';

export const dragReducer = (state, action, lastDragPosition) => {
    switch (action.type) {
        case types.START_DRAG:
            if (!state.columns || state.columns.length === 0) {
                return { state, lastDragPosition };
            }
            return {
                state: {
                    ...state,
                    isDragging: true,
                    dragSource: action.payload.source,
                    dragState: structuredClone(state.columns)
                },
                lastDragPosition
            };

        case types.UPDATE_DRAG_POSITION: {
            const newPosKey = `${action.payload.targetColumnId}-${action.payload.targetIndex}`;
            if (lastDragPosition === newPosKey) {
                return { state, lastDragPosition };
            }

            return {
                state: {
                    ...state,
                    dragState: calculateDragState(
                        state,
                        action.payload.targetColumnId,
                        action.payload.targetIndex
                    )
                },
                lastDragPosition: newPosKey
            };
        }

        case types.COMMIT_DRAG:
            return {
                state: {
                    ...state,
                    columns: structuredClone(state.dragState),
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                },
                lastDragPosition: null
            };

        case types.CANCEL_DRAG:
            return {
                state: {
                    ...state,
                    isDragging: false,
                    dragState: null,
                    dragSource: null
                },
                lastDragPosition: null
            };

        default:
            return { state, lastDragPosition };
    }
};
