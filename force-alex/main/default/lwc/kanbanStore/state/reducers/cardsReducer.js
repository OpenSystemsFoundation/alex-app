import * as types from '../../core/actionTypes';
import {
    moveCardInState,
    addCardToState,
    updateCardInState,
    deleteCardFromState
} from '../../utils/stateHelpers';

export const cardsReducer = (state, action) => {
    switch (action.type) {
        case types.ADD_CARD:
            return {
                ...state,
                columns: addCardToState(
                    state.columns,
                    action.payload.card,
                    action.payload.columnId
                )
            };

        case types.UPDATE_CARD:
            return {
                ...state,
                columns: updateCardInState(
                    state.columns,
                    action.payload.cardId,
                    action.payload.updates
                )
            };

        case types.DELETE_CARD:
            return {
                ...state,
                columns: deleteCardFromState(
                    state.columns,
                    action.payload.cardId
                )
            };

        case types.MOVE_CARD:
            return {
                ...state,
                columns: moveCardInState(
                    state.columns,
                    action.payload.cardId,
                    action.payload.targetColumnId,
                    action.payload.targetIndex
                )
            };

        default:
            return state;
    }
};
