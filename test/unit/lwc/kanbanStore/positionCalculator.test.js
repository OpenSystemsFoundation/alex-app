/**
 * @jest-environment jsdom
 */

import {
    calculateCardPosition,
    generatePosition
} from '../../../../force-app/main/default/lwc/kanbanStore/utils/positionCalculator';

describe('positionCalculator', () => {
    describe('calculateCardPosition', () => {
        const mockCards = [
            { Id: 'card1', position: 'a' },
            { Id: 'card2', position: 'b' },
            { Id: 'card3', position: 'c' }
        ];

        it('should calculate position at the beginning', () => {
            const result = calculateCardPosition(mockCards, null, 0);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBe('a');
        });

        it('should calculate position in the middle', () => {
            const result = calculateCardPosition(mockCards, null, 1);

            expect(result.previousPosition).toBe('a');
            expect(result.nextPosition).toBe('b');
        });

        it('should calculate position at the end', () => {
            const result = calculateCardPosition(mockCards, null, 3);

            expect(result.previousPosition).toBe('c');
            expect(result.nextPosition).toBeNull();
        });

        it('should handle empty column', () => {
            const result = calculateCardPosition([], null, 0);

            expect(result.previousPosition).toBeNull();
            expect(result.nextPosition).toBeNull();
        });

        it('should exclude moved card when calculating position', () => {
            const result = calculateCardPosition(mockCards, 'card2', 1);

            // After removing card2, the cards are [card1, card3]
            // Position 1 means after card1, before card3
            expect(result.previousPosition).toBe('a');
            expect(result.nextPosition).toBe('c');
        });

        it('should handle moving card to same position', () => {
            const result = calculateCardPosition(mockCards, 'card2', 1);

            expect(result.previousPosition).toBe('a');
            expect(result.nextPosition).toBe('c');
        });

        it('should handle null target index (append to end)', () => {
            const result = calculateCardPosition(mockCards, null, null);

            expect(result.previousPosition).toBe('c');
            expect(result.nextPosition).toBeNull();
        });
    });

    describe('generatePosition', () => {
        it('should generate position with no before card', () => {
            const result = generatePosition(null, '1000');

            expect(parseFloat(result)).toBeLessThan(1000);
            expect(result).toBe('500');
        });

        it('should generate position with no after card', () => {
            const result = generatePosition('1000', null);

            expect(parseFloat(result)).toBeGreaterThan(1000);
            expect(result).toBe('2000');
        });

        it('should generate position between two cards', () => {
            const result = generatePosition('1000', '2000');

            expect(parseFloat(result)).toBeGreaterThan(1000);
            expect(parseFloat(result)).toBeLessThan(2000);
            expect(result).toBe('1500');
        });

        it('should generate default position with no cards', () => {
            const result = generatePosition(null, null);

            expect(result).toBe('1000');
        });

        it('should handle fractional positions', () => {
            const result = generatePosition('1000.5', '1001.5');

            expect(parseFloat(result)).toBeGreaterThan(1000.5);
            expect(parseFloat(result)).toBeLessThan(1001.5);
            expect(result).toBe('1001');
        });
    });
});
