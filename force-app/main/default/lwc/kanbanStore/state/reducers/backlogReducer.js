import * as types from '../../core/actionTypes';

export const backlogReducer = (state, action) => {
    switch (action.type) {
        case types.SET_BACKLOG_CARDS:
            // Skip replacing backlog if a reorder is in-flight — the
            // server data is stale relative to the optimistic local order
            if (state.backlogSyncing > 0) {
                return state;
            }
            return {
                ...state,
                backlogCards: action.payload || []
            };

        case types.SET_BACKLOG_SYNCING: {
            // Use a counter so concurrent reorders don't interfere.
            // true increments, false decrements (min 0).
            const current = state.backlogSyncing || 0;
            const next = action.payload
                ? current + 1
                : Math.max(0, current - 1);
            return {
                ...state,
                backlogSyncing: next
            };
        }

        case types.ADD_BACKLOG_CARD:
            return {
                ...state,
                backlogCards: [action.payload, ...state.backlogCards]
            };

        case types.REMOVE_BACKLOG_CARD:
            return {
                ...state,
                backlogCards: state.backlogCards.filter(
                    (c) => c.Id !== action.payload.cardId
                ),
                selectedBacklogCards: state.selectedBacklogCards.filter(
                    (id) => id !== action.payload.cardId
                )
            };

        case types.MOVE_CARD_TO_SPRINT:
            return {
                ...state,
                backlogCards: state.backlogCards.filter(
                    (c) => c.Id !== action.payload.cardId
                ),
                selectedBacklogCards: state.selectedBacklogCards.filter(
                    (id) => id !== action.payload.cardId
                )
            };

        case types.MOVE_CARD_TO_BACKLOG: {
            // Find card in columns to add to backlog
            let card = null;
            for (const col of state.columns) {
                const found = col.cards?.find(
                    (c) => c.Id === action.payload.cardId
                );
                if (found) {
                    card = found;
                    break;
                }
            }
            if (card && !state.backlogCards.find((c) => c.Id === card.Id)) {
                return {
                    ...state,
                    backlogCards: [...state.backlogCards, card]
                };
            }
            return state;
        }

        case types.UPDATE_BACKLOG_CARD: {
            const { cardId, updates } = action.payload;
            return {
                ...state,
                backlogCards: state.backlogCards.map((c) => {
                    return c.Id === cardId ? { ...c, ...updates } : c;
                })
            };
        }

        case types.REORDER_BACKLOG: {
            const { cardId: reorderCardId, newIndex } = action.payload;
            const cards = [...state.backlogCards];
            const oldIndex = cards.findIndex((c) => c.Id === reorderCardId);
            if (oldIndex === -1) return state;
            const [moved] = cards.splice(oldIndex, 1);
            cards.splice(newIndex, 0, moved);
            return {
                ...state,
                backlogCards: cards
            };
        }

        case types.BULK_REORDER_BACKLOG: {
            const { cardIds, position } = action.payload;
            const idSet = new Set(cardIds);
            const otherCards = state.backlogCards.filter(
                (c) => !idSet.has(c.Id)
            );
            const movedCards = state.backlogCards.filter((c) =>
                idSet.has(c.Id)
            );
            return {
                ...state,
                backlogCards:
                    position === 'top'
                        ? [...movedCards, ...otherCards]
                        : [...otherCards, ...movedCards]
            };
        }

        case types.BULK_REORDER_BACKLOG_AT_INDEX: {
            const { cardIds: bulkCardIds, newIndex: bulkIndex } =
                action.payload;
            const bulkIdSet = new Set(bulkCardIds);
            const remaining = state.backlogCards.filter(
                (c) => !bulkIdSet.has(c.Id)
            );
            // Preserve relative order of moved cards
            const moved = state.backlogCards.filter((c) => bulkIdSet.has(c.Id));
            // Clamp insert position to valid range in the remaining list
            const insertAt = Math.min(bulkIndex, remaining.length);
            const result = [
                ...remaining.slice(0, insertAt),
                ...moved,
                ...remaining.slice(insertAt)
            ];
            return {
                ...state,
                backlogCards: result
            };
        }

        case types.SET_BACKLOG_VISIBLE:
            return {
                ...state,
                backlogVisible: action.payload
            };

        case types.SET_SELECTED_BACKLOG_CARDS:
            return {
                ...state,
                selectedBacklogCards: action.payload || []
            };

        case types.TOGGLE_BACKLOG_CARD_SELECTION: {
            const cardId = action.payload.cardId;
            const isSelected = state.selectedBacklogCards.includes(cardId);
            return {
                ...state,
                selectedBacklogCards: isSelected
                    ? state.selectedBacklogCards.filter((id) => id !== cardId)
                    : [...state.selectedBacklogCards, cardId]
            };
        }

        default:
            return state;
    }
};
