import * as types from '../../core/actionTypes';

export const sprintReducer = (state, action) => {
    switch (action.type) {
        case types.SET_SPRINT:
            return {
                ...state,
                activeSprint: action.payload
            };

        case types.SET_SPRINTS:
            return {
                ...state,
                sprints: action.payload || []
            };

        case types.UPDATE_SPRINT: {
            const updatedSprints = state.sprints.map((s) => {
                return s.Id === action.payload.sprintId
                    ? { ...s, ...action.payload.updates }
                    : s;
            });
            const updatedActiveSprint =
                state.activeSprint?.Id === action.payload.sprintId
                    ? { ...state.activeSprint, ...action.payload.updates }
                    : state.activeSprint;
            return {
                ...state,
                sprints: updatedSprints,
                activeSprint: updatedActiveSprint
            };
        }

        case types.SET_SPRINT_CARDS:
            return {
                ...state,
                sprintCards: action.payload || []
            };

        default:
            return state;
    }
};
