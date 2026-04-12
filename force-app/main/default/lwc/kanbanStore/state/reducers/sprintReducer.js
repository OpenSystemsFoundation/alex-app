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

        case types.DELETE_SPRINT: {
            const { sprintId: deletedSprintId } = action.payload;
            // Find cards that were in this sprint so we can move them to bottom
            const deletedSprintCardIds = new Set(
                state.planningSprintCards
                    .filter((sc) => sc.sprintId === deletedSprintId)
                    .map((sc) => sc.cardId)
            );
            let newBacklogCards = state.backlogCards;
            if (deletedSprintCardIds.size > 0) {
                const kept = newBacklogCards.filter(
                    (c) => !deletedSprintCardIds.has(c.Id)
                );
                const moved = newBacklogCards.filter((c) =>
                    deletedSprintCardIds.has(c.Id)
                );
                newBacklogCards = [...kept, ...moved];
            }
            return {
                ...state,
                sprints: state.sprints.filter((s) => s.Id !== deletedSprintId),
                planningSprintCards: state.planningSprintCards.filter(
                    (sc) => sc.sprintId !== deletedSprintId
                ),
                backlogCards: newBacklogCards
            };
        }

        case types.REORDER_SPRINTS:
            return {
                ...state,
                sprints: action.payload || []
            };

        default:
            return state;
    }
};
