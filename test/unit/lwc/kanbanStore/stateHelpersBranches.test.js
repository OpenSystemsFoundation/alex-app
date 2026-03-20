/**
 * Branch coverage tests for stateHelpers.js
 * Targets uncovered branches: calculateDragState edge cases, moveCardInState,
 * addCardToState, updateCardInState, deleteCardFromState
 */
import {
    calculateDragState,
    moveCardInState,
    addCardToState,
    updateCardInState,
    deleteCardFromState
} from '../../../../force-app/main/default/lwc/kanbanStore/utils/stateHelpers';

describe('calculateDragState', () => {
    it('returns empty array when columns are empty', () => {
        const state = { columns: [], dragSource: null };
        expect(calculateDragState(state, 'col1', 0)).toEqual([]);
    });

    it('returns empty array when columns is null', () => {
        const state = { columns: null, dragSource: null };
        expect(calculateDragState(state, 'col1', 0)).toEqual([]);
    });

    it('returns columns when dragSource is null', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1' }] }];
        const state = { columns, dragSource: null };
        expect(calculateDragState(state, 'col1', 0)).toBe(columns);
    });

    it('returns columns when source column not found', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1' }] }];
        const state = {
            columns,
            dragSource: { columnId: 'nonexistent', cardIndex: 0 }
        };
        expect(calculateDragState(state, 'col1', 0)).toBe(columns);
    });

    it('returns columns when card at dragSource index does not exist', () => {
        const columns = [{ Id: 'col1', cards: [] }];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 5 }
        };
        expect(calculateDragState(state, 'col1', 0)).toBe(columns);
    });

    it('returns columns when target column not found', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1' }] }];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 0 }
        };
        expect(calculateDragState(state, 'nonexistent', 0)).toBe(columns);
    });

    it('moves card within same column with adjusted index', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [
                    { Id: 'c1' },
                    { Id: 'c2' },
                    { Id: 'c3' }
                ]
            }
        ];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 0 }
        };
        // Moving from index 0 to index 2 (same column, source < target)
        const result = calculateDragState(state, 'col1', 2);
        expect(result[0].cards).toHaveLength(3);
        // c1 should be at adjusted position (2-1=1)
        expect(result[0].cards[1].Id).toBe('c1');
    });

    it('moves card between columns', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }, { Id: 'c2' }] },
            { Id: 'col2', cards: [{ Id: 'c3' }] }
        ];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 0 }
        };
        const result = calculateDragState(state, 'col2', 0);
        expect(result[0].cards).toHaveLength(1);
        expect(result[1].cards).toHaveLength(2);
        expect(result[1].cards[0].Id).toBe('c1');
    });

    it('updates cardCount on source and target columns', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 },
            { Id: 'col2', cards: [], cardCount: 0 }
        ];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 0 }
        };
        const result = calculateDragState(state, 'col2', 0);
        expect(result[0].cardCount).toBe(0);
        expect(result[1].cardCount).toBe(1);
    });

    it('does not modify unrelated columns', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }] },
            { Id: 'col2', cards: [] },
            { Id: 'col3', cards: [{ Id: 'c3' }] }
        ];
        const state = {
            columns,
            dragSource: { columnId: 'col1', cardIndex: 0 }
        };
        const result = calculateDragState(state, 'col2', 0);
        // col3 should be same reference (not cloned)
        expect(result[2]).toBe(columns[2]);
    });
});

describe('moveCardInState', () => {
    it('moves card between columns', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 },
            { Id: 'col2', cards: [], cardCount: 0 }
        ];
        const result = moveCardInState(columns, 'c1', 'col2', 0);
        expect(result[0].cards).toHaveLength(0);
        expect(result[0].cardCount).toBe(0);
        expect(result[1].cards).toHaveLength(1);
        expect(result[1].cardCount).toBe(1);
        expect(result[1].cards[0].columnId).toBe('col2');
    });

    it('returns state unchanged when card not found', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 }
        ];
        const result = moveCardInState(columns, 'nonexistent', 'col1', 0);
        expect(result[0].cards).toHaveLength(1);
    });

    it('returns state when target column not found', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 }
        ];
        const result = moveCardInState(columns, 'c1', 'nonexistent', 0);
        // Card removed from source but target not found
        expect(result[0].cards).toHaveLength(0);
    });

    it('pushes card to end when targetIndex is undefined', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 },
            {
                Id: 'col2',
                cards: [{ Id: 'c2' }],
                cardCount: 1
            }
        ];
        const result = moveCardInState(columns, 'c1', 'col2', undefined);
        expect(result[1].cards).toHaveLength(2);
        expect(result[1].cards[1].Id).toBe('c1');
    });

    it('pushes card to end when targetIndex is null', () => {
        const columns = [
            { Id: 'col1', cards: [{ Id: 'c1' }], cardCount: 1 },
            {
                Id: 'col2',
                cards: [{ Id: 'c2' }],
                cardCount: 1
            }
        ];
        const result = moveCardInState(columns, 'c1', 'col2', null);
        expect(result[1].cards).toHaveLength(2);
        expect(result[1].cards[1].Id).toBe('c1');
    });
});

describe('addCardToState', () => {
    it('adds card to specified column', () => {
        const columns = [{ Id: 'col1', cards: [], cardCount: 0 }];
        const card = { Id: 'c1', position: 'a' };
        const result = addCardToState(columns, card, 'col1');
        expect(result[0].cards).toHaveLength(1);
        expect(result[0].cardCount).toBe(1);
    });

    it('skips duplicate card with same Id', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1', position: 'a' }],
                cardCount: 1
            }
        ];
        const card = { Id: 'c1', position: 'b' };
        const result = addCardToState(columns, card, 'col1');
        expect(result[0].cards).toHaveLength(1);
    });

    it('does nothing when column not found', () => {
        const columns = [{ Id: 'col1', cards: [], cardCount: 0 }];
        const card = { Id: 'c1' };
        const result = addCardToState(columns, card, 'nonexistent');
        expect(result[0].cards).toHaveLength(0);
    });

    it('sorts by position - both null', () => {
        const columns = [{ Id: 'col1', cards: [], cardCount: 0 }];
        const card1 = { Id: 'c1' };
        const card2 = { Id: 'c2' };
        let result = addCardToState(columns, card1, 'col1');
        result = addCardToState(result, card2, 'col1');
        expect(result[0].cards).toHaveLength(2);
    });

    it('sorts by position - a has no position', () => {
        const columns = [{ Id: 'col1', cards: [], cardCount: 0 }];
        const card1 = { Id: 'c1' }; // no position
        const card2 = { Id: 'c2', position: 'a' };
        let result = addCardToState(columns, card1, 'col1');
        result = addCardToState(result, card2, 'col1');
        // card2 with position should come first
        expect(result[0].cards[0].Id).toBe('c2');
    });

    it('sorts by position - b has no position', () => {
        const columns = [{ Id: 'col1', cards: [], cardCount: 0 }];
        const card1 = { Id: 'c1', position: 'a' };
        const card2 = { Id: 'c2' }; // no position
        let result = addCardToState(columns, card1, 'col1');
        result = addCardToState(result, card2, 'col1');
        // card1 with position should come first
        expect(result[0].cards[0].Id).toBe('c1');
    });
});

describe('updateCardInState', () => {
    it('updates card properties in place', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1', subject: 'Old' }],
                cardCount: 1
            }
        ];
        const result = updateCardInState(columns, 'c1', {
            subject: 'New'
        });
        expect(result[0].cards[0].subject).toBe('New');
    });

    it('returns unchanged when card not found', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1' }],
                cardCount: 1
            }
        ];
        const result = updateCardInState(columns, 'nonexistent', {
            subject: 'X'
        });
        expect(result[0].cards).toHaveLength(1);
    });

    it('moves card to different column when columnId changes', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1', subject: 'Task' }],
                cardCount: 1
            },
            { Id: 'col2', cards: [], cardCount: 0 }
        ];
        const result = updateCardInState(columns, 'c1', {
            columnId: 'col2'
        });
        expect(result[0].cards).toHaveLength(0);
        expect(result[0].cardCount).toBe(0);
        expect(result[1].cards).toHaveLength(1);
        expect(result[1].cardCount).toBe(1);
    });

    it('handles column change when target column not found', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1' }],
                cardCount: 1
            }
        ];
        const result = updateCardInState(columns, 'c1', {
            columnId: 'nonexistent'
        });
        // Card removed from source, target not found
        expect(result[0].cards).toHaveLength(0);
    });

    it('re-sorts when position changes', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [
                    { Id: 'c1', position: 'a' },
                    { Id: 'c2', position: 'b' },
                    { Id: 'c3', position: 'c' }
                ],
                cardCount: 3
            }
        ];
        const result = updateCardInState(columns, 'c3', {
            position: 'aa'
        });
        // c3 should now be between c1 (a) and c2 (b) since 'aa' < 'b'
        expect(result[0].cards[0].Id).toBe('c1');
        expect(result[0].cards[1].Id).toBe('c3');
        expect(result[0].cards[2].Id).toBe('c2');
    });

    it('sorts correctly when cards have no position during column change', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1' }],
                cardCount: 1
            },
            {
                Id: 'col2',
                cards: [{ Id: 'c2' }],
                cardCount: 1
            }
        ];
        const result = updateCardInState(columns, 'c1', {
            columnId: 'col2'
        });
        expect(result[1].cards).toHaveLength(2);
    });

    it('sorts with mixed position values during column change', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1', position: 'z' }],
                cardCount: 1
            },
            {
                Id: 'col2',
                cards: [
                    { Id: 'c2', position: 'a' },
                    { Id: 'c3' }
                ],
                cardCount: 2
            }
        ];
        const result = updateCardInState(columns, 'c1', {
            columnId: 'col2'
        });
        expect(result[1].cards).toHaveLength(3);
        expect(result[1].cards[0].Id).toBe('c2'); // position 'a'
        expect(result[1].cards[1].Id).toBe('c1'); // position 'z'
        expect(result[1].cards[2].Id).toBe('c3'); // no position, last
    });
});

describe('deleteCardFromState', () => {
    it('deletes card and updates count', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1' }, { Id: 'c2' }],
                cardCount: 2
            }
        ];
        const result = deleteCardFromState(columns, 'c1');
        expect(result[0].cards).toHaveLength(1);
        expect(result[0].cardCount).toBe(1);
    });

    it('handles card not found', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1' }],
                cardCount: 1
            }
        ];
        const result = deleteCardFromState(columns, 'nonexistent');
        expect(result[0].cards).toHaveLength(1);
    });
});
