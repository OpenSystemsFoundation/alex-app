/**
 * Position Calculator
 *
 * Calculates card positions for lexicographic ordering.
 * Handles position calculation between cards and at column ends.
 *
 * @module positionCalculator
 */

/**
 * Calculate position for a card based on target index
 * @param {Array} cards - Array of cards in the target column
 * @param {string} cardId - ID of card being moved (null for new cards)
 * @param {number} targetIndex - Target index in column
 * @returns {Object} { previousPosition, nextPosition }
 */
export const calculateCardPosition = (cards, cardId, targetIndex) => {
    // Remove the card being moved to get accurate surrounding positions
    const cardsWithoutDragged = cardId
        ? cards.filter((c) => c.Id !== cardId)
        : cards;

    let previousPosition = null;
    let nextPosition = null;

    // If target index is specified
    if (targetIndex !== null && targetIndex !== undefined) {
        // Get previous card position
        if (targetIndex > 0 && cardsWithoutDragged[targetIndex - 1]) {
            previousPosition = cardsWithoutDragged[targetIndex - 1].position;
        }

        // Get next card position
        if (
            targetIndex < cardsWithoutDragged.length &&
            cardsWithoutDragged[targetIndex]
        ) {
            nextPosition = cardsWithoutDragged[targetIndex].position;
        }
    } else {
        // Default to end of column
        if (cardsWithoutDragged.length > 0) {
            previousPosition =
                cardsWithoutDragged[cardsWithoutDragged.length - 1].position;
        }
    }

    return { previousPosition, nextPosition };
};

/**
 * Generate a new position between two existing positions
 * This is a helper for when the server doesn't handle position generation
 * @param {string} before - Position string of card before
 * @param {string} after - Position string of card after
 * @returns {string} New position string
 */
export const generatePosition = (before, after) => {
    // If no before, position is half of after
    if (!before) {
        return after ? String(parseFloat(after) / 2) : '1000';
    }

    // If no after, position is before + 1000
    if (!after) {
        return String(parseFloat(before) + 1000);
    }

    // Position is average of before and after
    const beforeNum = parseFloat(before);
    const afterNum = parseFloat(after);
    return String((beforeNum + afterNum) / 2);
};
