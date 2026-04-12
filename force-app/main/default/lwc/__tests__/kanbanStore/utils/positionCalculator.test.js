/**
 * Unit tests for positionCalculator utility
 */
import {
    calculateCardPosition,
    generatePosition
} from '../../../kanbanStore/utils/positionCalculator';

describe('calculateCardPosition', () => {
    const card = (id, pos) => ({ Id: id, position: pos });

    it('returns null/null for empty column', () => {
        const result = calculateCardPosition([], null, 0);
        expect(result.previousPosition).toBeNull();
        expect(result.nextPosition).toBeNull();
    });

    it('returns previous and next for middle insert', () => {
        const cards = [card('a', '1000'), card('b', '2000'), card('c', '3000')];
        const result = calculateCardPosition(cards, null, 1);
        expect(result.previousPosition).toBe('1000');
        expect(result.nextPosition).toBe('2000');
    });

    it('returns only next for insert at start', () => {
        const cards = [card('a', '1000'), card('b', '2000')];
        const result = calculateCardPosition(cards, null, 0);
        expect(result.previousPosition).toBeNull();
        expect(result.nextPosition).toBe('1000');
    });

    it('returns only previous for insert at end', () => {
        const cards = [card('a', '1000'), card('b', '2000')];
        const result = calculateCardPosition(cards, null, 2);
        expect(result.previousPosition).toBe('2000');
        expect(result.nextPosition).toBeNull();
    });

    it('excludes the dragged card from position calc', () => {
        const cards = [card('a', '1000'), card('b', '2000'), card('c', '3000')];
        // Moving 'a' to index 1 (after removing 'a', array is [b, c])
        const result = calculateCardPosition(cards, 'a', 1);
        expect(result.previousPosition).toBe('2000');
        expect(result.nextPosition).toBe('3000');
    });

    it('defaults to end of column when index is null', () => {
        const cards = [card('a', '1000'), card('b', '2000')];
        const result = calculateCardPosition(cards, null, null);
        expect(result.previousPosition).toBe('2000');
        expect(result.nextPosition).toBeNull();
    });
});

describe('generatePosition', () => {
    it('returns 1000 for no before or after', () => {
        expect(generatePosition(null, null)).toBe('1000');
    });

    it('returns half of after when no before', () => {
        expect(generatePosition(null, '2000')).toBe('1000');
    });

    it('returns before + 1000 when no after', () => {
        expect(generatePosition('1000', null)).toBe('2000');
    });

    it('returns average for between positions', () => {
        expect(generatePosition('1000', '2000')).toBe('1500');
    });

    it('works with decimal positions', () => {
        expect(generatePosition('1000', '1001')).toBe('1000.5');
    });
});
