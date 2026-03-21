/**
 * SprintSnapshotScheduler - Schedulable class that creates daily snapshots
 * for all active sprints. Schedule with:
 *   System.schedule('Daily Sprint Snapshot', '0 0 1 * * ?', new SprintSnapshotScheduler());
 */
public with sharing class SprintSnapshotScheduler implements Schedulable {
    public void execute(SchedulableContext ctx) {
        List<OpenSF__Sprint__c> activeSprints = SprintSelector.getAllActiveSprints();

        for (OpenSF__Sprint__c sprint : activeSprints) {
            try {
                SprintService.createDailySnapshot(sprint.Id);
            } catch (Exception e) {
                System.debug(
                    'Error creating snapshot for sprint ' +
                        sprint.Id +
                        ': ' +
                        e.getMessage()
                );
            }
        }
    }
}
