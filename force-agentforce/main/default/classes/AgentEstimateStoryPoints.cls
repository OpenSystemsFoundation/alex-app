/**
 * AgentEstimateStoryPoints - Agentforce invocable action that uses heuristics
 * to estimate story points for a card based on type, priority, and content.
 */
public with sharing class AgentEstimateStoryPoints {
    public class Request {
        @InvocableVariable(
            required=true
            description='The ID of the card to estimate'
        )
        public Id cardId;
    }

    public class Response {
        @InvocableVariable(
            description='Estimated story points (fibonacci-like: 1,2,3,5,8,13,21)'
        )
        public Decimal estimatedPoints;
        @InvocableVariable(description='Confidence level: High, Medium, or Low')
        public String confidence;
        @InvocableVariable(
            description='Explanation of each factor in the estimate'
        )
        public String reasoning;
        @InvocableVariable(
            description='Current story points value if already set'
        )
        public Decimal currentPoints;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    private static final List<Integer> FIBONACCI = new List<Integer>{
        1,
        2,
        3,
        5,
        8,
        13,
        21
    };

    @InvocableMethod(
        label='Estimate Story Points'
        description='Estimates story points for a card using heuristics based on type, priority, and content'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(estimatePoints(req));
        }
        return responses;
    }

    private static Response estimatePoints(Request req) {
        Response res = new Response();
        try {
            List<OpenSF__Card__c> cards = [
                SELECT
                    Id,
                    Name,
                    OpenSF__Subject__c,
                    OpenSF__Description__c,
                    OpenSF__CardType__c,
                    OpenSF__Priority__c,
                    OpenSF__StoryPoints__c
                FROM OpenSF__Card__c
                WHERE Id = :req.cardId
                WITH USER_MODE
                LIMIT 1
            ];
            if (cards.isEmpty()) {
                res.message = 'Card not found with ID: ' + req.cardId;
                return res;
            }

            OpenSF__Card__c card = cards[0];
            res.currentPoints = card.OpenSF__StoryPoints__c;

            String cardType = card.OpenSF__CardType__c != null
                ? card.OpenSF__CardType__c
                : '';
            String priority = card.OpenSF__Priority__c != null
                ? card.OpenSF__Priority__c
                : '';
            String subject = card.OpenSF__Subject__c != null
                ? card.OpenSF__Subject__c
                : '';
            String description = card.OpenSF__Description__c != null
                ? card.OpenSF__Description__c
                : '';
            String combined = (subject + ' ' + description).toLowerCase();
            Integer descLength = description.length();

            List<String> factors = new List<String>();
            Integer rawPoints = 0;
            Integer factorCount = 0;

            // Base points by card type
            Integer basePoints;
            if (cardType == 'Bug') {
                basePoints = 3;
            } else if (cardType == 'Story') {
                basePoints = 5;
            } else if (cardType == 'Task') {
                basePoints = 2;
            } else if (cardType == 'Epic') {
                basePoints = 13;
            } else {
                basePoints = 3;
            }
            rawPoints += basePoints;
            factors.add(
                'Base (' +
                    (String.isNotBlank(cardType) ? cardType : 'default') +
                    '): ' +
                    basePoints +
                    ' points'
            );
            factorCount++;

            // Priority modifier
            Integer priorityMod = 0;
            if (
                priority == 'Critical' ||
                priority == 'Blocking' ||
                priority == 'High'
            ) {
                priorityMod = 2;
            } else if (priority == 'Low') {
                priorityMod = -1;
            }
            if (priorityMod != 0) {
                rawPoints += priorityMod;
                factors.add(
                    'Priority (' +
                        priority +
                        '): ' +
                        (priorityMod > 0 ? '+' : '') +
                        priorityMod
                );
                factorCount++;
            }

            // Description length modifier
            Integer descMod = 0;
            if (descLength > 500) {
                descMod = 2;
            } else if (descLength > 200) {
                descMod = 1;
            } else if (descLength == 0) {
                descMod = -1;
            }
            if (descMod != 0) {
                String descReason = descLength == 0
                    ? 'empty'
                    : descLength + ' chars';
                rawPoints += descMod;
                factors.add(
                    'Description length (' +
                        descReason +
                        '): ' +
                        (descMod > 0 ? '+' : '') +
                        descMod
                );
                factorCount++;
            }

            // Complexity keywords
            if (
                combined.contains('integration') ||
                combined.contains('api') ||
                combined.contains('migration')
            ) {
                rawPoints += 3;
                factors.add(
                    'Complexity keywords (integration/API/migration): +3'
                );
                factorCount++;
            }

            // Simplicity keywords
            if (
                combined.contains('simple') ||
                combined.contains('minor') ||
                combined.contains('typo') ||
                combined.contains('text change')
            ) {
                rawPoints -= 2;
                factors.add(
                    'Simplicity keywords (simple/minor/typo/text change): -2'
                );
                factorCount++;
            }

            // Clamp minimum to 1
            if (rawPoints < 1) {
                rawPoints = 1;
            }

            // Map to nearest fibonacci
            Integer estimated = mapToFibonacci(rawPoints);
            res.estimatedPoints = estimated;

            factors.add(
                'Raw total: ' +
                    rawPoints +
                    ' -> mapped to nearest fibonacci: ' +
                    estimated
            );
            res.reasoning = String.join(factors, '; ');

            // Confidence based on available info
            if (
                factorCount >= 4 &&
                String.isNotBlank(cardType) &&
                String.isNotBlank(priority)
            ) {
                res.confidence = 'High';
            } else if (
                factorCount >= 2 &&
                (String.isNotBlank(cardType) || String.isNotBlank(priority))
            ) {
                res.confidence = 'Medium';
            } else {
                res.confidence = 'Low';
            }

            res.message =
                'Estimated ' +
                estimated +
                ' story points with ' +
                res.confidence +
                ' confidence.';
        } catch (Exception e) {
            res.message = 'Error estimating story points: ' + e.getMessage();
        }
        return res;
    }

    private static Integer mapToFibonacci(Integer raw) {
        Integer closest = FIBONACCI[0];
        Integer minDiff = Math.abs(raw - closest);
        for (Integer fib : FIBONACCI) {
            Integer diff = Math.abs(raw - fib);
            if (diff < minDiff) {
                minDiff = diff;
                closest = fib;
            }
        }
        return closest;
    }
}
