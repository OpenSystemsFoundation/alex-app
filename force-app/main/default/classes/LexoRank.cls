/**
 * LexoRank implementation for efficient ordering in drag-and-drop interfaces
 * Based on the LexoRank algorithm used by Jira
 */
public class LexoRank {
    private static final String MIN_CHAR = '0';
    private static final String MAX_CHAR = 'z';
    private static final String DEFAULT_START = '0|hzzzzz:';
    private static final Integer DEFAULT_LENGTH = 6;

    /**
     * Generate initial rank
     */
    public static String initial() {
        return DEFAULT_START;
    }

    /**
     * Generate a rank between two positions
     */
    public static String between(String prev, String next) {
        if (String.isBlank(prev) && String.isBlank(next)) {
            return initial();
        }

        if (String.isBlank(prev)) {
            return beforeFirst(next);
        }

        if (String.isBlank(next)) {
            return afterLast(prev);
        }

        return betweenRanks(prev, next);
    }

    /**
     * Generate rank before the first item
     */
    private static String beforeFirst(String rank) {
        // Get bucket and key
        List<String> parts = rank.split('\\|');
        if (parts.size() != 2) {
            return initial();
        }

        String bucket = parts[0];
        String key = parts[1];

        // Generate a key that comes before
        String newKey = decrementKey(key);
        return bucket + '|' + newKey;
    }

    /**
     * Generate rank after the last item
     */
    private static String afterLast(String rank) {
        // Get bucket and key
        List<String> parts = rank.split('\\|');
        if (parts.size() != 2) {
            return initial();
        }

        String bucket = parts[0];
        String key = parts[1];

        // Generate a key that comes after
        String newKey = incrementKey(key);
        return bucket + '|' + newKey;
    }

    /**
     * Generate rank between two existing ranks
     */
    private static String betweenRanks(String prevRank, String nextRank) {
        List<String> prevParts = prevRank.split('\\|');
        List<String> nextParts = nextRank.split('\\|');

        if (prevParts.size() != 2 || nextParts.size() != 2) {
            return initial();
        }

        String bucket = prevParts[0];
        String prevKey = prevParts[1];
        String nextKey = nextParts[1];

        // Generate middle key
        String newKey = midpoint(prevKey, nextKey);
        return bucket + '|' + newKey;
    }

    /**
     * Calculate midpoint between two keys
     */
    private static String midpoint(String prev, String next) {
        // Pad to same length
        Integer maxLen = Math.max(prev.length(), next.length());
        String paddedPrev = padRight(prev, maxLen);
        String paddedNext = padRight(next, maxLen);

        List<Integer> prevChars = getCharCodes(paddedPrev);
        List<Integer> nextChars = getCharCodes(paddedNext);

        List<Integer> result = new List<Integer>();
        Boolean foundDiff = false;

        for (Integer i = 0; i < maxLen; i++) {
            Integer pChar = prevChars[i];
            Integer nChar = nextChars[i];

            if (!foundDiff) {
                if (pChar == nChar) {
                    result.add(pChar);
                } else if (nChar - pChar > 1) {
                    // Can fit a character in between
                    Integer mid = (pChar + nChar) / 2;
                    result.add(mid);
                    foundDiff = true;
                } else {
                    // Adjacent characters, need to extend
                    result.add(pChar);
                    foundDiff = false; // Keep looking
                }
            } else {
                // After finding difference, we can stop
                break;
            }
        }

        // If we never found a valid midpoint, append a character
        if (!foundDiff || result.isEmpty()) {
            result.add(getCharCode('m')); // Add middle character
        }

        return buildString(result) + ':';
    }

    /**
     * Increment a key
     */
    private static String incrementKey(String key) {
        String cleanKey = key.replace(':', '');
        List<Integer> chars = getCharCodes(cleanKey);

        // Increment like a number with base-36
        Boolean carry = true;
        for (Integer i = chars.size() - 1; i >= 0 && carry; i--) {
            Integer charCode = chars[i];
            charCode++;

            if (charCode > getCharCode('z')) {
                chars[i] = getCharCode('0');
                carry = true;
            } else {
                chars[i] = charCode;
                carry = false;
            }
        }

        if (carry) {
            chars.add(0, getCharCode('0'));
        }

        return buildString(chars) + ':';
    }

    /**
     * Decrement a key
     */
    private static String decrementKey(String key) {
        String cleanKey = key.replace(':', '');
        List<Integer> chars = getCharCodes(cleanKey);

        if (chars.isEmpty()) {
            return '0:';
        }

        // Decrement like a number with base-36
        Boolean borrow = true;
        for (Integer i = chars.size() - 1; i >= 0 && borrow; i--) {
            Integer charCode = chars[i];
            charCode--;

            if (charCode < getCharCode('0')) {
                chars[i] = getCharCode('z');
                borrow = true;
            } else {
                chars[i] = charCode;
                borrow = false;
            }
        }

        return buildString(chars) + ':';
    }

    /**
     * Get character codes from string
     */
    private static List<Integer> getCharCodes(String str) {
        List<Integer> codes = new List<Integer>();
        for (Integer i = 0; i < str.length(); i++) {
            codes.add(str.charAt(i));
        }
        return codes;
    }

    /**
     * Get character code
     */
    private static Integer getCharCode(String c) {
        return c.charAt(0);
    }

    /**
     * Build string from character codes
     */
    private static String buildString(List<Integer> codes) {
        String result = '';
        for (Integer code : codes) {
            result += String.fromCharArray(new List<Integer>{ code });
        }
        return result;
    }

    /**
     * Pad string to the right with lowest character
     */
    private static String padRight(String str, Integer length) {
        while (str.length() < length) {
            str += '0';
        }
        return str;
    }
}
