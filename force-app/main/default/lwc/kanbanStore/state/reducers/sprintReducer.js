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

        case types.SET_PLANNING_SPRINT_CARDS:
            return {
                ...state,
                planningSprintCards: action.payload || []
            };

        case types.ADD_PLANNING_SPRINT_CARD:
            return {
                ...state,
                planningSprintCards: [
                    ...state.planningSprintCards,
                    action.payload
                ]
            };

        case types.REMOVE_PLANNING_SPRINT_CARD: {
            const { cardId: removeCardId, sprintId: removeSprintId } =
                action.payload;
            return {
                ...state,
                planningSprintCards: state.planningSprintCards.filter(
                    (sc) =>
                        !(
                            sc.cardId === removeCardId &&
                            sc.sprintId === removeSprintId
                        )
                )
            };
        }

        default:
            return state;
    }
};
