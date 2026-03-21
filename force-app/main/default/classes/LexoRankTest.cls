@isTest
private class LexoRankTest {
    // Minimum key length: bucket(1) + '|'(1) + key(6) + ':'(1) = 9
    private static final Integer MIN_RANK_LENGTH = 9;
    private static final Integer MIN_KEY_LENGTH = 6;

    /**
     * Assert that a rank has the correct format: bucket|key:
     * where key is at least DEFAULT_LENGTH (6) characters
     * and contains no colons within the key itself.
     */
    private static void assertValidRank(String rank, String context) {
        System.assertNotEquals(
            null,
            rank,
            context + ': rank should not be null'
        );
        System.assert(
            rank.contains('|'),
            context + ': missing bucket separator'
        );
        System.assert(rank.endsWith(':'), context + ': missing trailing colon');
        System.assert(
            rank.length() >= MIN_RANK_LENGTH,
            context +
                ': rank too short (' +
                rank +
                '), expected at least ' +
                MIN_RANK_LENGTH +
                ' chars'
        );

        // Extract key (between | and trailing :)
        String key = rank.substringAfter('|');
        key = key.substring(0, key.length() - 1); // strip trailing colon
        System.assert(
            key.length() >= MIN_KEY_LENGTH,
            context +
                ': key too short (' +
                key +
                '), expected at least ' +
                MIN_KEY_LENGTH +
                ' chars'
        );
        System.assert(
            !key.contains(':'),
            context + ': key contains colon (' + rank + ')'
        );
    }

    @isTest
    static void testInitial() {
        String rank = LexoRank.initial();
        assertValidRank(rank, 'initial');
    }

    @isTest
    static void testBetweenBothNull() {
        String rank = LexoRank.between(null, null);
        assertValidRank(rank, 'both null');
    }

    @isTest
    static void testBetweenPrevNull() {
        String next = '0|hzzzzz:';
        String rank = LexoRank.between(null, next);
        assertValidRank(rank, 'prev null');
        System.assert(rank < next, 'Rank should be before next');
    }

    @isTest
    static void testBetweenNextNull() {
        String prev = '0|hzzzzz:';
        String rank = LexoRank.between(prev, null);
        assertValidRank(rank, 'next null');
        System.assert(rank > prev, 'Rank should be after prev');
    }

    @isTest
    static void testBetweenTwoRanks() {
        String prev = '0|h00000:';
        String next = '0|hzzzzz:';
        String rank = LexoRank.between(prev, next);

        assertValidRank(rank, 'between two ranks');
        System.assert(rank > prev, 'Rank should be after prev');
        System.assert(rank < next, 'Rank should be before next');
    }

    @isTest
    static void testMultipleBetweens() {
        String rank1 = LexoRank.initial();
        String rank2 = LexoRank.between(rank1, null);
        String rank3 = LexoRank.between(rank1, rank2);

        assertValidRank(rank1, 'rank1');
        assertValidRank(rank2, 'rank2');
        assertValidRank(rank3, 'rank3');
        System.assert(rank1 < rank3, 'rank1 should be less than rank3');
        System.assert(rank3 < rank2, 'rank3 should be less than rank2');
    }

    @isTest
    static void testOrderingConsistency() {
        List<String> ranks = new List<String>();
        ranks.add(LexoRank.initial());

        for (Integer i = 0; i < 10; i++) {
            String newRank = LexoRank.between(ranks[ranks.size() - 1], null);
            ranks.add(newRank);
        }

        for (Integer i = 0; i < ranks.size() - 1; i++) {
            assertValidRank(ranks[i], 'ordering rank ' + i);
            System.assert(
                ranks[i] < ranks[i + 1],
                'Rank at ' + i + ' should be less than rank at ' + (i + 1)
            );
        }
        assertValidRank(ranks[ranks.size() - 1], 'ordering last rank');
    }

    @isTest
    static void testDenseInsertion() {
        String rank1 = '0|h00000:';
        String rank2 = '0|h00001:';
        String middle = LexoRank.between(rank1, rank2);

        assertValidRank(middle, 'dense insertion');
        System.assert(rank1 < middle, 'rank1 should be less than middle');
        System.assert(middle < rank2, 'middle should be less than rank2');
    }

    @isTest
    static void testInvalidRankFormat() {
        String result = LexoRank.between('invalidrank', null);
        assertValidRank(result, 'invalid format');

        String result2 = LexoRank.between('invalid1', 'invalid2');
        assertValidRank(result2, 'both invalid');
    }

    @isTest
    static void testEmptyStrings() {
        String result1 = LexoRank.between('', '');
        assertValidRank(result1, 'both empty');

        String result2 = LexoRank.between('', '0|hzzzzz:');
        assertValidRank(result2, 'empty prev');

        String result3 = LexoRank.between('0|h00000:', '');
        assertValidRank(result3, 'empty next');
    }

    @isTest
    static void testCharacterBoundaries() {
        String rank1 = '0|0zzzzz:';
        String rank2 = LexoRank.between(rank1, null);
        assertValidRank(rank2, 'increment beyond z');
        System.assert(rank2 > rank1, 'Should increment beyond z');

        String rank3 = '0|h00000:';
        String rank4 = LexoRank.between(null, rank3);
        assertValidRank(rank4, 'decrement below 0');
        System.assert(rank4 < rank3, 'Should decrement below 0');
    }

    @isTest
    static void testAdjacentRanks() {
        String rank1 = '0|m00000:';
        String rank2 = '0|n00000:';
        String middle = LexoRank.between(rank1, rank2);

        assertValidRank(middle, 'adjacent ranks');
        System.assert(rank1 < middle, 'Middle should be greater than rank1');
        System.assert(middle < rank2, 'Middle should be less than rank2');
    }

    @isTest
    static void testMidpointMaintainsKeyLength() {
        String prev = '0|hd0000:';
        String next = '0|hf0000:';
        String middle = LexoRank.between(prev, next);

        assertValidRank(middle, 'midpoint key length');
        System.assert(prev < middle, 'Should be after prev');
        System.assert(middle < next, 'Should be before next');
    }

    @isTest
    static void testRepeatedDragDropInsertions() {
        // Simulate drag-and-drop: repeatedly insert between adjacent ranks
        String rank1 = '0|h00000:';
        String rank2 = '0|hzzzzz:';

        List<String> ranks = new List<String>{ rank1, rank2 };
        for (Integer i = 0; i < 20; i++) {
            Integer insertIdx = ranks.size() / 2;
            String prev = ranks[insertIdx - 1];
            String next = ranks[insertIdx];
            String newRank = LexoRank.between(prev, next);

            assertValidRank(newRank, 'drag-drop insertion ' + i);
            System.assert(
                newRank > prev,
                'Insertion ' + i + ': should be after prev'
            );
            System.assert(
                newRank < next,
                'Insertion ' + i + ': should be before next'
            );

            ranks.add(insertIdx, newRank);
        }

        // Verify full ordering
        for (Integer i = 0; i < ranks.size() - 1; i++) {
            System.assert(
                ranks[i] < ranks[i + 1],
                'Final ordering: rank ' +
                    i +
                    ' (' +
                    ranks[i] +
                    ') should be less than rank ' +
                    (i + 1) +
                    ' (' +
                    ranks[i + 1] +
                    ')'
            );
        }
    }

    @isTest
    static void testConsecutiveInsertionsAtSameSpot() {
        // Simulate always inserting at position 1 (after first card)
        String first = '0|h00000:';
        String second = '0|h00001:';

        String prev = first;
        String next = second;
        for (Integer i = 0; i < 15; i++) {
            String middle = LexoRank.between(prev, next);
            assertValidRank(middle, 'consecutive insertion ' + i);
            System.assert(middle > prev, 'Should be after prev at step ' + i);
            System.assert(middle < next, 'Should be before next at step ' + i);
            next = middle;
        }
    }

    @isTest
    static void testShortKeyInputsGetNormalized() {
        String shortPrev = '0|he:';
        String shortNext = '0|hf:';
        String result = LexoRank.between(shortPrev, shortNext);

        assertValidRank(result, 'short key normalization');
        System.assert(result > shortPrev, 'Should be after short prev');
        System.assert(result < shortNext, 'Should be before short next');
    }

    @isTest
    static void testBeforeShortKey() {
        String shortRank = '0|he:';
        String result = LexoRank.between(null, shortRank);

        assertValidRank(result, 'before short key');
        System.assert(result < shortRank, 'Should be before short rank');
    }

    @isTest
    static void testAfterShortKey() {
        String shortRank = '0|he:';
        String result = LexoRank.between(shortRank, null);

        assertValidRank(result, 'after short key');
        System.assert(result > shortRank, 'Should be after short rank');
    }

    @isTest
    static void testNoColonInKey() {
        String prev = '0|hg0000:';
        String next = '0|hh0000:';
        String result = LexoRank.between(prev, next);

        String key = result.substringAfter('|');
        key = key.substring(0, key.length() - 1);
        System.assert(
            !key.contains(':'),
            'Key portion should not contain colon: ' + result
        );
    }
}
