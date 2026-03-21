import * as types from '../../core/actionTypes';

export const syncReducer = (state, action) => {
    switch (action.type) {
        case types.SET_SYNC_STATE:
            return {
                ...state,
                syncState: action.payload
            };

        case types.START_OPERATION:
            return {
                ...state,
                syncState: 'syncing',
                pendingOperations: [
                    ...state.pendingOperations,
                    {
                        id: action.payload.id,
                        type: action.payload.type,
                        cardId: action.payload.cardId,
                        startedAt: Date.now()
                    }
                ]
            };

        case types.COMPLETE_OPERATION:
            return {
                ...state,
                syncState:
                    state.pendingOperations.length <= 1 ? 'idle' : 'syncing',
                pendingOperations: state.pendingOperations.filter(
                    (op) => op.id !== action.payload.id
                ),
                lastSyncTime: Date.now(),
                lastSyncError: null
            };

        case types.FAIL_OPERATION:
            return {
                ...state,
                syncState: 'failed',
                pendingOperations: state.pendingOperations.filter(
                    (op) => op.id !== action.payload.id
                ),
                lastSyncError: {
                    operationId: action.payload.id,
                    error: action.payload.error,
                    timestamp: Date.now()
                }
            };

        default:
            return state;
    }
};
