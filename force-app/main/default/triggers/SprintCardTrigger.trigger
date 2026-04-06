trigger SprintCardTrigger on OpenSF__SprintCard__c(
    after insert,
    after update,
    after delete
) {
    SprintCardTriggerHandler handler = new SprintCardTriggerHandler();
    handler.setTriggerContext(
        Trigger.isBefore,
        Trigger.isAfter,
        Trigger.isInsert,
        Trigger.isUpdate,
        Trigger.isDelete,
        Trigger.isUndelete,
        Trigger.new,
        Trigger.old,
        Trigger.newMap,
        Trigger.oldMap
    );
    handler.execute();
}
