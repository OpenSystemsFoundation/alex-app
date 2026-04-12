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
} from '../../../kanbanStore/utils/stateHelpers';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from '../../helpers/testDataFactory';

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
    it('adds card to target column sorted by position', () => {
        const existing = buildCard({ Id: 'a', position: '1000' });
        const newCard = buildCard({ Id: 'b', position: '500' });
        const col = buildColumn({ Id: 'col1', cards: [existing] });

        const result = addCardToState([col], newCard, 'col1');
        expect(result[0].cards).toHaveLength(2);
        expect(result[0].cards[0].Id).toBe('b'); // position 500 comes first
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
        expect(result[0].cards.map((c) => c.Id)).toEqual([
            'c2',
            'c1',
            'c3'
        ]);
    });
});
