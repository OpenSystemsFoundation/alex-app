import * as types from '../../core/actionTypes';

export const boardReducer = (state, action) => {
    switch (action.type) {
        case types.SET_BOARD:
            return {
                ...state,
                board: action.payload,
                boardId: action.payload?.Id || null
            };

        case types.SET_BOARD_ID:
            return {
                ...state,
                boardId: action.payload
            };

        default:
            return state;
    }
};
