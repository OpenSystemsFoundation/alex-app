/**
 * CardUpdateRequest - Strongly typed wrapper for card field updates.
 * Replaces Map<String, Object> with compile-time type safety.
 * Each field has a boolean flag indicating whether it was provided in the request.
 */
public class CardUpdateRequest {
    // Field values
    public String subject;
    public String description;
    public String priority;
    public String color;
    public String dueDate; // ISO date string
    public Decimal storyPoints;
    public Id assigneeId;
    public String status;
    public String cardType;
    public Id epicId;
    public Id peerReviewerId;
    public Boolean needsRefinement;
    public Id columnId;
    public String lexoRankPosition;

    // Flags indicating which fields were provided
    public Boolean hasSubject = false;
    public Boolean hasDescription = false;
    public Boolean hasPriority = false;
    public Boolean hasColor = false;
    public Boolean hasDueDate = false;
    public Boolean hasStoryPoints = false;
    public Boolean hasAssigneeId = false;
    public Boolean hasStatus = false;
    public Boolean hasCardType = false;
    public Boolean hasEpicId = false;
    public Boolean hasPeerReviewerId = false;
    public Boolean hasNeedsRefinement = false;
    public Boolean hasColumnId = false;
    public Boolean hasLexoRankPosition = false;

    /**
     * Build a CardUpdateRequest from the legacy Map<String, Object> format.
     * This allows backward compatibility with existing @AuraEnabled endpoints.
     */
    public static CardUpdateRequest fromMap(Map<String, Object> updates) {
        CardUpdateRequest req = new CardUpdateRequest();
        if (updates == null) {
            return req;
        }

        if (updates.containsKey('subject')) {
            req.subject = (String) updates.get('subject');
            req.hasSubject = true;
        }
        if (updates.containsKey('description')) {
            req.description = (String) updates.get('description');
            req.hasDescription = true;
        }
        if (updates.containsKey('priority')) {
            req.priority = (String) updates.get('priority');
            req.hasPriority = true;
        }
        if (updates.containsKey('color')) {
            req.color = (String) updates.get('color');
            req.hasColor = true;
        }
        if (updates.containsKey('dueDate')) {
            req.dueDate = (String) updates.get('dueDate');
            req.hasDueDate = true;
        }
        if (updates.containsKey('storyPoints')) {
            Object spVal = updates.get('storyPoints');
            if (spVal instanceof Decimal) {
                req.storyPoints = (Decimal) spVal;
            } else if (spVal instanceof String && String.isNotBlank((String) spVal)) {
                req.storyPoints = Decimal.valueOf((String) spVal);
            } else {
                req.storyPoints = null;
            }
            req.hasStoryPoints = true;
        }
        if (updates.containsKey('assigneeId')) {
            Object aVal = updates.get('assigneeId');
            req.assigneeId = (aVal instanceof String && String.isBlank((String) aVal)) ? null : (Id) aVal;
            req.hasAssigneeId = true;
        }
        if (updates.containsKey('status')) {
            req.status = (String) updates.get('status');
            req.hasStatus = true;
        }
        if (updates.containsKey('cardType')) {
            req.cardType = (String) updates.get('cardType');
            req.hasCardType = true;
        }
        if (updates.containsKey('epicId')) {
            Object eVal = updates.get('epicId');
            req.epicId = (eVal instanceof String && String.isBlank((String) eVal)) ? null : (Id) eVal;
            req.hasEpicId = true;
        }
        if (updates.containsKey('peerReviewerId')) {
            Object prVal = updates.get('peerReviewerId');
            req.peerReviewerId = (prVal instanceof String && String.isBlank((String) prVal)) ? null : (Id) prVal;
            req.hasPeerReviewerId = true;
        }
        if (updates.containsKey('needsRefinement')) {
            req.needsRefinement = (Boolean) updates.get('needsRefinement');
            req.hasNeedsRefinement = true;
        }
        if (updates.containsKey('columnId')) {
            req.columnId = (Id) updates.get('columnId');
            req.hasColumnId = true;
        }
        if (updates.containsKey('lexoRankPosition')) {
            req.lexoRankPosition = (String) updates.get('lexoRankPosition');
            req.hasLexoRankPosition = true;
        }

        return req;
    }

    /**
     * Apply this request's fields to an SObject card record.
     */
    public void applyTo(OpenSF__Card__c card) {
        if (hasSubject) {
            card.OpenSF__Subject__c = subject;
        }
        if (hasDescription) {
            card.OpenSF__Description__c = description;
        }
        if (hasPriority) {
            card.OpenSF__Priority__c = priority;
        }
        if (hasColor) {
            card.OpenSF__Color__c = color;
        }
        if (hasDueDate) {
            card.OpenSF__DueDate__c = String.isNotBlank(dueDate)
                ? Date.valueOf(dueDate)
                : null;
        }
        if (hasStoryPoints) {
            card.OpenSF__StoryPoints__c = storyPoints;
        }
        if (hasAssigneeId) {
            card.OpenSF__Assignee__c = assigneeId;
        }
        if (hasStatus) {
            card.OpenSF__Status__c = status;
        }
        if (hasCardType) {
            card.OpenSF__CardType__c = cardType;
        }
        if (hasEpicId) {
            card.OpenSF__Epic__c = epicId;
        }
        if (hasPeerReviewerId) {
            card.OpenSF__PeerReviewer__c = peerReviewerId;
        }
        if (hasNeedsRefinement && needsRefinement != null) {
            card.OpenSF__NeedsRefinement__c = needsRefinement;
        }
        if (hasColumnId) {
            card.OpenSF__Column__c = columnId;
        }
        if (hasLexoRankPosition) {
            card.OpenSF__LexoRankPosition__c = lexoRankPosition;
        }
    }

    /**
     * Get the list of field keys that were provided (for conflict detection).
     */
    public Set<String> getProvidedFields() {
        Set<String> fields = new Set<String>();
        if (hasSubject)
            fields.add('subject');
        if (hasDescription)
            fields.add('description');
        if (hasPriority)
            fields.add('priority');
        if (hasColor)
            fields.add('color');
        if (hasDueDate)
            fields.add('dueDate');
        if (hasStoryPoints)
            fields.add('storyPoints');
        if (hasAssigneeId)
            fields.add('assigneeId');
        if (hasStatus)
            fields.add('status');
        if (hasCardType)
            fields.add('cardType');
        if (hasEpicId)
            fields.add('epicId');
        if (hasPeerReviewerId)
            fields.add('peerReviewerId');
        if (hasNeedsRefinement)
            fields.add('needsRefinement');
        if (hasColumnId)
            fields.add('columnId');
        if (hasLexoRankPosition)
            fields.add('lexoRankPosition');
        return fields;
    }
}
