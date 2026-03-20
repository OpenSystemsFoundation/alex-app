import * as types from '../../core/actionTypes';

export const appStateReducer = (state, action) => {
    switch (action.type) {
        case types.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload
            };

        case types.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                isLoading: false
            };

        case types.CLEAR_ERROR:
            return {
                ...state,
                error: null
            };

        case types.SET_SUBSCRIPTION_STATUS:
            return {
                ...state,
                subscriptionStatus: action.payload
            };

        default:
            return state;
    }
};
