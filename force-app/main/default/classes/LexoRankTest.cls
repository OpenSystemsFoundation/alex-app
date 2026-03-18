@isTest
private class LexoRankTest {
    @isTest
    static void testInitial() {
        String rank = LexoRank.initial();
        System.assertNotEquals(null, rank, 'Initial rank should not be null');
        System.assert(
            rank.contains('|'),
            'Rank should contain bucket separator'
        );
    }

    @isTest
    static void testBetweenBothNull() {
        String rank = LexoRank.between(null, null);
        System.assertNotEquals(null, rank, 'Rank should not be null');
        System.assert(
            rank.contains('|'),
            'Rank should contain bucket separator'
        );
    }

    @isTest
    static void testBetweenPrevNull() {
        String next = '0|hzzzzz:';
        String rank = LexoRank.between(null, next);
        System.assertNotEquals(null, rank, 'Rank should not be null');
        System.assert(rank < next, 'Rank should be before next');
    }

    @isTest
    static void testBetweenNextNull() {
        String prev = '0|hzzzzz:';
        String rank = LexoRank.between(prev, null);
        System.assertNotEquals(null, rank, 'Rank should not be null');
        System.assert(rank > prev, 'Rank should be after prev');
    }

    @isTest
    static void testBetweenTwoRanks() {
        String prev = '0|h00000:';
        String next = '0|hzzzzz:';
        String rank = LexoRank.between(prev, next);

        System.assertNotEquals(null, rank, 'Rank should not be null');
        System.assert(rank > prev, 'Rank should be after prev');
        System.assert(rank < next, 'Rank should be before next');
    }

    @isTest
    static void testMultipleBetweens() {
        String rank1 = LexoRank.initial();
        String rank2 = LexoRank.between(rank1, null);
        String rank3 = LexoRank.between(rank1, rank2);

        System.assert(rank1 < rank3, 'rank1 should be less than rank3');
        System.assert(rank3 < rank2, 'rank3 should be less than rank2');
    }

    @isTest
    static void testOrderingConsistency() {
        List<String> ranks = new List<String>();

        // Create initial rank
        ranks.add(LexoRank.initial());

        // Add 10 ranks after
        for (Integer i = 0; i < 10; i++) {
            String newRank = LexoRank.between(ranks[ranks.size() - 1], null);
            ranks.add(newRank);
        }

        // Verify ordering
        for (Integer i = 0; i < ranks.size() - 1; i++) {
            System.assert(
                ranks[i] < ranks[i + 1],
                'Rank at ' + i + ' should be less than rank at ' + (i + 1)
            );
        }
    }

    @isTest
    static void testDenseInsertion() {
        String rank1 = '0|h00000:';
        String rank2 = '0|h00001:';

        // Insert between very close ranks
        String middle = LexoRank.between(rank1, rank2);

        System.assertNotEquals(null, middle, 'Middle rank should not be null');
        System.assert(rank1 < middle, 'rank1 should be less than middle');
        System.assert(middle < rank2, 'middle should be less than rank2');
    }

    @isTest
    static void testInvalidRankFormat() {
        // Test with invalid format (no bucket separator)
        String invalidRank = 'invalidrank';
        String result = LexoRank.between(invalidRank, null);
        System.assertNotEquals(
            null,
            result,
            'Should return initial rank for invalid format'
        );

        // Test between two invalid ranks
        String result2 = LexoRank.between('invalid1', 'invalid2');
        System.assertNotEquals(null, result2, 'Should return initial rank');
    }

    @isTest
    static void testEmptyStrings() {
        // Test with empty strings (treated as null)
        String result1 = LexoRank.between('', '');
        System.assertNotEquals(null, result1, 'Should handle empty strings');

        String result2 = LexoRank.between('', '0|hzzzzz:');
        System.assertNotEquals(null, result2, 'Should handle empty prev');

        String result3 = LexoRank.between('0|h00000:', '');
        System.assertNotEquals(null, result3, 'Should handle empty next');
    }

    @isTest
    static void testCharacterBoundaries() {
        // Test with ranks at character boundaries
        String rank1 = '0|0zzzzz:';
        String rank2 = LexoRank.between(rank1, null);
        System.assert(rank2 > rank1, 'Should increment beyond z');

        // Test decrement at lower boundary
        String rank3 = '0|h00000:';
        String rank4 = LexoRank.between(null, rank3);
        System.assert(rank4 < rank3, 'Should decrement below 0');
    }

    @isTest
    static void testAdjacentRanks() {
        // Test with adjacent characters that need extension
        String rank1 = '0|m00000:';
        String rank2 = '0|n00000:';
        String middle = LexoRank.between(rank1, rank2);

        System.assertNotEquals(null, middle, 'Should handle adjacent ranks');
        System.assert(rank1 < middle, 'Middle should be greater than rank1');
        System.assert(middle < rank2, 'Middle should be less than rank2');
    }
}
