/**
 * @description Trigger handler for OpenSF__Card__c object.
 */
public class CardTriggerHandler {
    /**
     * @description Main handler method for trigger events.
     * @param isBefore Indicates if the trigger is before operation.
     * @param isAfter Indicates if the trigger is after operation.
     * @param isInsert Indicates if the trigger is for insert operation.
     * @param isUpdate Indicates if the trigger is for update operation.
     * @param isDelete Indicates if the trigger is for delete operation.
     * @param isUndelete Indicates if the trigger is for undelete operation.
     * @param newList List of new OpenSF__Card__c records.
     * @param oldList List of old OpenSF__Card__c records.
     * @param newMap Map of new OpenSF__Card__c records.
     * @param oldMap Map of old OpenSF__Card__c records.
     */
    public static void handleTrigger(
        Boolean isBefore,
        Boolean isAfter,
        Boolean isInsert,
        Boolean isUpdate,
        Boolean isDelete,
        Boolean isUndelete,
        List<OpenSF__Card__c> newList,
        List<OpenSF__Card__c> oldList,
        Map<Id, OpenSF__Card__c> newMap,
        Map<Id, OpenSF__Card__c> oldMap
    ) {
        if (isBefore) {
            if (isInsert) {
                handleBeforeInsert(newList);
            } else if (isUpdate) {
                handleBeforeUpdate(newList, oldList);
            } else if (isDelete) {
                handleBeforeDelete(oldList);
            }
        }

        if (isAfter) {
            if (isInsert) {
                handleAfterInsert(newList);
            } else if (isUpdate) {
                handleAfterUpdate(newList, oldList, oldMap);
            } else if (isDelete) {
                handleAfterDelete(oldList);
            } else if (isUndelete) {
                handleAfterUndelete(newList);
            }
        }
    }

    /**
     * @description Handler for before insert trigger event.
     * @param newList List of new OpenSF__Card__c records.
     */
    private static void handleBeforeInsert(List<OpenSF__Card__c> newList) {
        CardDomain.handleBeforeInsert(newList);
    }

    /**
     * @description Handler for after insert trigger event.
     * @param newList List of new OpenSF__Card__c records.
     */
    private static void handleAfterInsert(List<OpenSF__Card__c> newList) {
        CardDomain.handleAfterInsert(newList);
    }

    /**
     * @description Handler for before update trigger event.
     * @param newList List of new OpenSF__Card__c records.
     * @param oldList List of old OpenSF__Card__c records.
     */
    private static void handleBeforeUpdate(
        List<OpenSF__Card__c> newList,
        List<OpenSF__Card__c> oldList
    ) {
        CardDomain.handleBeforeUpdate(newList, oldList);
    }

    /**
     * @description Handler for after update trigger event.
     * @param newList List of new OpenSF__Card__c records.
     * @param oldList List of old OpenSF__Card__c records.
     * @param oldMap Map of old OpenSF__Card__c records.
     */
    private static void handleAfterUpdate(
        List<OpenSF__Card__c> newList,
        List<OpenSF__Card__c> oldList,
        Map<Id, OpenSF__Card__c> oldMap
    ) {
        CardDomain.handleAfterUpdate(newList, oldList, oldMap);
    }

    /**
     * @description Handler for before delete trigger event.
     * @param oldList List of old OpenSF__Card__c records.
     */
    private static void handleBeforeDelete(List<OpenSF__Card__c> oldList) {
        CardDomain.handleBeforeDelete(oldList);
    }

    /**
     * @description Handler for after delete trigger event.
     * @param oldList List of old OpenSF__Card__c records.
     */
    private static void handleAfterDelete(List<OpenSF__Card__c> oldList) {
        CardDomain.handleAfterDelete(oldList);
    }

    /**
     * @description Handler for after undelete trigger event.
     * @param newList List of new OpenSF__Card__c records.
     */
    private static void handleAfterUndelete(List<OpenSF__Card__c> newList) {
        CardDomain.handleAfterUndelete(newList);
    }
}
