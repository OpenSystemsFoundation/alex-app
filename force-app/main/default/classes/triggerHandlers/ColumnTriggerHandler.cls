/**
 * @description Trigger handler for OpenSF__Column__c object.
 */
public class ColumnTriggerHandler {
    /**
     * @description Main handler method for trigger events.
     * @param isBefore Indicates if the trigger is before operation.
     * @param isAfter Indicates if the trigger is after operation.
     * @param isInsert Indicates if the trigger is for insert operation.
     * @param isUpdate Indicates if the trigger is for update operation.
     * @param isDelete Indicates if the trigger is for delete operation.
     * @param isUndelete Indicates if the trigger is for undelete operation.
     * @param newList List of new OpenSF__Column__c records.
     * @param oldList List of old OpenSF__Column__c records.
     * @param newMap Map of new OpenSF__Column__c records.
     * @param oldMap Map of old OpenSF__Column__c records.
     */
    public static void handleTrigger(
        Boolean isBefore,
        Boolean isAfter,
        Boolean isInsert,
        Boolean isUpdate,
        Boolean isDelete,
        Boolean isUndelete,
        List<OpenSF__Column__c> newList,
        List<OpenSF__Column__c> oldList,
        Map<Id, OpenSF__Column__c> newMap,
        Map<Id, OpenSF__Column__c> oldMap
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
     * @param newList List of new OpenSF__Column__c records.
     */
    private static void handleBeforeInsert(List<OpenSF__Column__c> newList) {
        ColumnDomain.handleBeforeInsert(newList);
    }

    /**
     * @description Handler for after insert trigger event.
     * @param newList List of new OpenSF__Column__c records.
     */
    private static void handleAfterInsert(List<OpenSF__Column__c> newList) {
        ColumnDomain.handleAfterInsert(newList);
    }

    /**
     * @description Handler for before update trigger event.
     * @param newList List of new OpenSF__Column__c records.
     * @param oldList List of old OpenSF__Column__c records.
     */
    private static void handleBeforeUpdate(
        List<OpenSF__Column__c> newList,
        List<OpenSF__Column__c> oldList
    ) {
        ColumnDomain.handleBeforeUpdate(newList, oldList);
    }

    /**
     * @description Handler for after update trigger event.
     * @param newList List of new OpenSF__Column__c records.
     * @param oldList List of old OpenSF__Column__c records.
     * @param oldMap Map of old OpenSF__Column__c records.
     */
    private static void handleAfterUpdate(
        List<OpenSF__Column__c> newList,
        List<OpenSF__Column__c> oldList,
        Map<Id, OpenSF__Column__c> oldMap
    ) {
        ColumnDomain.handleAfterUpdate(newList, oldList, oldMap);
    }

    /**
     * @description Handler for before delete trigger event.
     * @param oldList List of old OpenSF__Column__c records.
     */
    private static void handleBeforeDelete(List<OpenSF__Column__c> oldList) {
        ColumnDomain.handleBeforeDelete(oldList);
    }

    /**
     * @description Handler for after delete trigger event.
     * @param oldList List of old OpenSF__Column__c records.
     */
    private static void handleAfterDelete(List<OpenSF__Column__c> oldList) {
        ColumnDomain.handleAfterDelete(oldList);
    }

    /**
     * @description Handler for after undelete trigger event.
     * @param newList List of new OpenSF__Column__c records.
     */
    private static void handleAfterUndelete(List<OpenSF__Column__c> newList) {
        ColumnDomain.handleAfterUndelete(newList);
    }
}
