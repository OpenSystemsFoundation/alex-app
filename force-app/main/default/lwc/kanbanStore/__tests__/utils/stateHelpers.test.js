/**
 * Unit tests for stateHelpers
 *
 * Covers: calculateDragState, moveCardInState, addCardToState,
 * updateCardInState, deleteCardFromState
 */
import {
    calculateDragState,
    moveCardInState,
    addCardToState,
    updateCardInState,
    deleteCardFromState
} from '../../utils/stateHelpers';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

beforeEach(() => resetIds());

describe('moveCardInState', () => {
    it('moves card between columns', () => {
        const card = buildCard({ Id: 'c1' });
        const col1 = buildColumn({ Id: 'col1', cards: [card] });
        const col2 = buildColumn({ Id: 'col2', cards: [] });

        const result = moveCardInState([col1, col2], 'c1', 'col2', 0);

        expect(result[0].cards).toHaveLength(0);
        expect(result[0].cardCount).toBe(0);
        expect(result[1].cards).toHaveLength(1);
        expect(result[1].cards[0].Id).toBe('c1');
        expect(result[1].cardCount).toBe(1);
    });

    it('moves card within same column', () => {
        const c1 = buildCard({ Id: 'c1' });
        const c2 = buildCard({ Id: 'c2' });
        const col = buildColumn({ Id: 'col1', cards: [c1, c2] });

        const result = moveCardInState([col], 'c1', 'col1', 1);
        expect(result[0].cards[0].Id).toBe('c2');
        expect(result[0].cards[1].Id).toBe('c1');
    });

    it('returns unchanged when card not found', () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const result = moveCardInState([col], 'missing', 'col1', 0);
        expect(result[0].cards).toHaveLength(0);
    });

    it('returns unchanged when target column not found', () => {
        const card = buildCard({ Id: 'c1' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const result = moveCardInState([col], 'c1', 'missing', 0);
        // Card removed from source but target not found, so it's lost
        expect(result[0].cards).toHaveLength(0);
    });
});

describe('addCardToState', () => {
    it('adds card to target column sorted by position (lexicographic)', () => {
        const existing = buildCard({ Id: 'a', position: '2000' });
        const newCard = buildCard({ Id: 'b', position: '1000' });
        const col = buildColumn({ Id: 'col1', cards: [existing] });

        const result = addCardToState([col], newCard, 'col1');
        expect(result[0].cards).toHaveLength(2);
        expect(result[0].cards[0].Id).toBe('b'); // '1000' < '2000' lexicographically
        expect(result[0].cardCount).toBe(2);
    });

    it('skips duplicate card', () => {
        const card = buildCard({ Id: 'c1', position: '1000' });
        const col = buildColumn({ Id: 'col1', cards: [card] });

        const result = addCardToState([col], card, 'col1');
        expect(result[0].cards).toHaveLength(1);
    });
});

describe('updateCardInState', () => {
    it('merges updates into card', () => {
        const card = buildCard({ Id: 'c1', subject: 'Old' });
        const col = buildColumn({ Id: 'col1', cards: [card] });

        const result = updateCardInState([col], 'c1', { subject: 'New' });
        expect(result[0].cards[0].subject).toBe('New');
    });

    it('re-sorts when position changes', () => {
        const c1 = buildCard({ Id: 'c1', position: '1000' });
        const c2 = buildCard({ Id: 'c2', position: '2000' });
        const col = buildColumn({ Id: 'col1', cards: [c1, c2] });

        const result = updateCardInState([col], 'c1', { position: '3000' });
        expect(result[0].cards[0].Id).toBe('c2');
        expect(result[0].cards[1].Id).toBe('c1');
    });

    it('returns unchanged for missing card', () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const result = updateCardInState([col], 'missing', { subject: 'X' });
        expect(result[0].cards).toHaveLength(0);
    });
});

describe('deleteCardFromState', () => {
    it('removes card and decrements count', () => {
        const card = buildCard({ Id: 'c1' });
        const col = buildColumn({ Id: 'col1', cards: [card] });

        const result = deleteCardFromState([col], 'c1');
        expect(result[0].cards).toHaveLength(0);
        expect(result[0].cardCount).toBe(0);
    });

    it('does nothing for missing card', () => {
        const col = buildColumn({ Id: 'col1', cards: [buildCard()] });
        const result = deleteCardFromState([col], 'missing');
        expect(result[0].cards).toHaveLength(1);
    });
});

describe('calculateDragState', () => {
    it('moves card visually between columns', () => {
        const card = buildCard({ Id: 'c1' });
        const col1 = buildColumn({ Id: 'col1', cards: [card] });
        const col2 = buildColumn({ Id: 'col2', cards: [] });
        const state = buildInitialState({
            columns: [col1, col2],
            dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });

        const result = calculateDragState(state, 'col2', 0);
        expect(result[0].cards).toHaveLength(0);
        expect(result[1].cards).toHaveLength(1);
        expect(result[1].cards[0].Id).toBe('c1');
    });

    it('returns empty array for empty columns', () => {
        const state = buildInitialState({ columns: [] });
        expect(calculateDragState(state, 'col1', 0)).toEqual([]);
    });

    it('returns columns unchanged if no drag source', () => {
        const col = buildColumn({ Id: 'col1' });
        const state = buildInitialState({
            columns: [col],
            dragSource: null
        });
        expect(calculateDragState(state, 'col1', 0)).toBe(state.columns);
    });

    it('adjusts index for same-column drag', () => {
        const c1 = buildCard({ Id: 'c1' });
        const c2 = buildCard({ Id: 'c2' });
        const c3 = buildCard({ Id: 'c3' });
        const col = buildColumn({ Id: 'col1', cards: [c1, c2, c3] });
        const state = buildInitialState({
            columns: [col],
            dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });

        const result = calculateDragState(state, 'col1', 2);
        // c1 removed from index 0, then inserted at adjusted index (2-1=1)
        expect(result[0].cards.map((c) => c.Id)).toEqual(['c2', 'c1', 'c3']);
    });
});

describe('stateHelpers branch coverage', () => {
    describe('calculateDragState edge cases', () => {
        it('returns [] when columns is undefined', () => {
            expect(calculateDragState({}, 'col1', 0)).toEqual([]);
        });

        it('returns original columns when source column is missing', () => {
            const col = buildColumn({ Id: 'col1', cards: [buildCard()] });
            const state = buildInitialState({
                columns: [col],
                dragSource: { cardId: 'x', columnId: 'gone', cardIndex: 0 }
            });
            expect(calculateDragState(state, 'col1', 0)).toBe(state.columns);
        });

        it('returns original columns when cardIndex is out of range', () => {
            const col = buildColumn({ Id: 'col1', cards: [buildCard()] });
            const state = buildInitialState({
                columns: [col],
                dragSource: { cardId: 'x', columnId: 'col1', cardIndex: 5 }
            });
            expect(calculateDragState(state, 'col1', 0)).toBe(state.columns);
        });

        it('returns original columns when target column is missing', () => {
            const col = buildColumn({
                Id: 'col1',
                cards: [buildCard({ Id: 'c1' })]
            });
            const state = buildInitialState({
                columns: [col],
                dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
            });
            const result = calculateDragState(state, 'gone', 0);
            expect(result).toBe(state.columns);
            expect(result[0].cards.map((c) => c.Id)).toEqual(['c1']);
        });

        it('does not adjust index when moving up within the same column', () => {
            const cards = ['c1', 'c2', 'c3'].map((Id) => buildCard({ Id }));
            const col = buildColumn({ Id: 'col1', cards });
            const other = buildColumn({ Id: 'col2' });
            const state = buildInitialState({
                columns: [col, other],
                dragSource: { cardId: 'c3', columnId: 'col1', cardIndex: 2 }
            });
            const result = calculateDragState(state, 'col1', 0);
            expect(result[0].cards.map((c) => c.Id)).toEqual([
                'c3',
                'c1',
                'c2'
            ]);
            expect(result[0].cardCount).toBe(3);
            // Untouched columns keep identity
            expect(result[1]).toBe(other);
            // Original state is not mutated
            expect(col.cards.map((c) => c.Id)).toEqual(['c1', 'c2', 'c3']);
        });

        it('updates card counts for cross-column moves', () => {
            const col1 = buildColumn({
                Id: 'col1',
                cards: [buildCard({ Id: 'c1' }), buildCard({ Id: 'c2' })]
            });
            const col2 = buildColumn({
                Id: 'col2',
                cards: [buildCard({ Id: 'c3' })]
            });
            const state = buildInitialState({
                columns: [col1, col2],
                dragSource: { cardId: 'c2', columnId: 'col1', cardIndex: 1 }
            });
            const result = calculateDragState(state, 'col2', 1);
            expect(result[0].cardCount).toBe(1);
            expect(result[1].cardCount).toBe(2);
            expect(result[1].cards.map((c) => c.Id)).toEqual(['c3', 'c2']);
        });
    });

    describe('moveCardInState edge cases', () => {
        it('appends card when targetIndex is undefined or null', () => {
            const col1 = buildColumn({
                Id: 'col1',
                cards: [buildCard({ Id: 'c1' }), buildCard({ Id: 'c2' })]
            });
            const col2 = buildColumn({
                Id: 'col2',
                cards: [buildCard({ Id: 'c3' })]
            });
            const r1 = moveCardInState([col1, col2], 'c1', 'col2', undefined);
            expect(r1[1].cards.map((c) => c.Id)).toEqual(['c3', 'c1']);
            expect(r1[1].cards[1].columnId).toBe('col2');
            expect(r1[1].cardCount).toBe(2);

            const r2 = moveCardInState([col1, col2], 'c2', 'col2', null);
            expect(r2[1].cards.map((c) => c.Id)).toEqual(['c3', 'c2']);
            expect(r2[0].cardCount).toBe(1);
        });

        it('finds cards in later columns', () => {
            const col1 = buildColumn({ Id: 'col1', cards: [] });
            const col2 = buildColumn({
                Id: 'col2',
                cards: [buildCard({ Id: 'c9' })]
            });
            const result = moveCardInState([col1, col2], 'c9', 'col1', 0);
            expect(result[0].cards.map((c) => c.Id)).toEqual(['c9']);
            expect(result[1].cards).toEqual([]);
        });
    });

    describe('addCardToState edge cases', () => {
        it('does nothing when column is not found', () => {
            const col = buildColumn({ Id: 'col1', cards: [] });
            const result = addCardToState([col], buildCard(), 'missing');
            expect(result).toEqual([col]);
            expect(result[0]).not.toBe(col);
        });

        it('enriches the added card', () => {
            const col = buildColumn({ Id: 'col1', cards: [] });
            const result = addCardToState(
                [col],
                buildCard({ Id: 'n1', priority: 'High' }),
                'col1'
            );
            expect(result[0].cards[0].priorityClass).toBe('priority-high');
            expect(result[0].cards[0].recordUrl).toBe(
                '/lightning/r/OpenSF__Card__c/n1/view'
            );
            expect(result[0].cardCount).toBe(1);
        });

        it('adds cards without Id (no duplicate check)', () => {
            const col = buildColumn({ Id: 'col1', cards: [] });
            const result = addCardToState(
                [col],
                { subject: 'temp', position: 'a' },
                'col1'
            );
            expect(result[0].cards).toHaveLength(1);
            expect(result[0].cards[0].subject).toBe('temp');
        });

        it('sorts unpositioned cards after positioned ones', () => {
            const col = buildColumn({
                Id: 'col1',
                cards: [
                    buildCard({ Id: 'n1', position: null }),
                    buildCard({ Id: 'p2', position: 'b' })
                ]
            });
            const r1 = addCardToState(
                [col],
                buildCard({ Id: 'n2', position: null }),
                'col1'
            );
            expect(r1[0].cards.map((c) => c.Id)).toEqual(['p2', 'n1', 'n2']);

            const r2 = addCardToState(
                [col],
                buildCard({ Id: 'p1', position: 'a' }),
                'col1'
            );
            expect(r2[0].cards.map((c) => c.Id)).toEqual(['p1', 'p2', 'n1']);
        });
    });

    describe('updateCardInState edge cases', () => {
        const twoCols = () => [
            buildColumn({
                Id: 'col1',
                cards: [
                    buildCard({ Id: 'c1', position: 'a' }),
                    buildCard({ Id: 'c2', position: 'b' })
                ]
            }),
            buildColumn({
                Id: 'col2',
                cards: [
                    buildCard({ Id: 'c3', position: 'b' }),
                    buildCard({ Id: 'c4', position: null })
                ]
            })
        ];

        it('moves card to a new column and sorts it in', () => {
            const result = updateCardInState(twoCols(), 'c1', {
                columnId: 'col2',
                position: 'a'
            });
            expect(result[0].cards.map((c) => c.Id)).toEqual(['c2']);
            expect(result[0].cardCount).toBe(1);
            expect(result[1].cards.map((c) => c.Id)).toEqual([
                'c1',
                'c3',
                'c4'
            ]);
            expect(result[1].cardCount).toBe(3);
            expect(result[1].cards[0].columnId).toBe('col2');
        });

        it('sorts unpositioned moved card to the end of the target column', () => {
            const result = updateCardInState(twoCols(), 'c2', {
                columnId: 'col2',
                position: null
            });
            expect(result[1].cards.map((c) => c.Id)).toEqual([
                'c3',
                'c4',
                'c2'
            ]);
        });

        it('drops card when target column does not exist', () => {
            const result = updateCardInState(twoCols(), 'c1', {
                columnId: 'nope'
            });
            expect(result[0].cards.map((c) => c.Id)).toEqual(['c2']);
            expect(result[0].cardCount).toBe(1);
            expect(result[1].cards).toHaveLength(2);
        });

        it('treats same columnId as an in-place update', () => {
            const result = updateCardInState(twoCols(), 'c3', {
                columnId: 'col2',
                subject: 'Same col'
            });
            expect(result[1].cards.map((c) => c.Id)).toEqual(['c3', 'c4']);
            expect(result[1].cards[0].subject).toBe('Same col');
        });

        it('re-sorts with unpositioned cards when position changes', () => {
            const result = updateCardInState(twoCols(), 'c3', {
                position: 'z'
            });
            expect(result[1].cards.map((c) => c.Id)).toEqual(['c3', 'c4']);
            expect(result[1].cards[0].position).toBe('z');

            const cols = [
                buildColumn({
                    Id: 'col1',
                    cards: [
                        buildCard({ Id: 'n1', position: null }),
                        buildCard({ Id: 'n2', position: null }),
                        buildCard({ Id: 'p1', position: 'm' })
                    ]
                })
            ];
            const r2 = updateCardInState(cols, 'p1', { position: 'a' });
            expect(r2[0].cards.map((c) => c.Id)).toEqual(['p1', 'n1', 'n2']);
        });

        it('enriches merged card', () => {
            const result = updateCardInState(twoCols(), 'c2', {
                priority: 'Low'
            });
            expect(result[0].cards[1].priorityClass).toBe('priority-low');
        });
    });

    describe('deleteCardFromState edge cases', () => {
        it('removes card from a later column only', () => {
            const col1 = buildColumn({
                Id: 'col1',
                cards: [buildCard({ Id: 'c1' })]
            });
            const col2 = buildColumn({
                Id: 'col2',
                cards: [buildCard({ Id: 'c2' }), buildCard({ Id: 'c3' })]
            });
            const result = deleteCardFromState([col1, col2], 'c3');
            expect(result[0].cards.map((c) => c.Id)).toEqual(['c1']);
            expect(result[1].cards.map((c) => c.Id)).toEqual(['c2']);
            expect(result[1].cardCount).toBe(1);
        });
    });
});
