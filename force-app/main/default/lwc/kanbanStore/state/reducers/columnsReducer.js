import * as types from '../../core/actionTypes';

export const columnsReducer = (state, action) => {
    switch (action.type) {
        case types.SET_COLUMNS:
        case types.UPDATE_COLUMNS:
            return {
                ...state,
                columns: structuredClone(action.payload)
            };

        default:
            return state;
    }
};
