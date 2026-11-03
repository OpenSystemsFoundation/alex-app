/**
 * @description Verifies how sprint operations behave for a standard user
 * (Standard User profile + Alex_User permission set):
 *  - user actions enforce object permissions (USER_MODE DML), so a user with
 *    read-only Sprint access cannot start a sprint;
 *  - app bookkeeping (sprint completion flags and point rollups) still runs
 *    when that user moves a card (SYSTEM_MODE DML).
 */
@isTest
private class SprintPermissionTest {
    @TestSetup
    static void setup() {
        OpenSF__Board__c board = TestFactory.createBoard('Permission Board');

        OpenSF__Column__c todo = TestFactory.createColumn(board.Id, 'To Do');
        OpenSF__Column__c done = TestFactory.createColumn(board.Id, 'Done');
        // Minimal sObjects: never re-send the master-detail Board__c on update
        update new List<OpenSF__Column__c>{
            new OpenSF__Column__c(
                Id = todo.Id,
                OpenSF__Category__c = KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.TODO
                )
            ),
            new OpenSF__Column__c(
                Id = done.Id,
                OpenSF__Category__c = KanbanEnums.columnCategoryValue(
                    KanbanEnums.ColumnCategory.DONE
                )
            )
        };

        OpenSF__Card__c card = TestFactory.createCard(todo.Id, 'Sprint card');
        update new OpenSF__Card__c(Id = card.Id, OpenSF__StoryPoints__c = 5);

        TestFactory.createSprint(board.Id, 'Planning');
        OpenSF__Sprint__c active = TestFactory.createSprint(board.Id, 'Active');
        update new OpenSF__Sprint__c(
            Id = active.Id,
            OpenSF__SprintNumber__c = 2,
            OpenSF__TotalStoryPoints__c = 5
        );

        TestFactory.createSprintCard(active.Id, card.Id);
    }

    /**
     * Inserts a Standard User with only the Alex_User permission set.
     * Runs as the current user to avoid mixed setup/non-setup DML.
     */
    private static User createAlexUser() {
        User alexUser;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Profile standard = [
                SELECT Id
                FROM Profile
                WHERE Name = 'Standard User'
                LIMIT 1
            ];
            String unique = String.valueOf(Crypto.getRandomInteger())
                .replace('-', '');
            alexUser = new User(
                FirstName = 'Alex',
                LastName = 'User',
                Email = 'alex.user@example.com',
                Username = 'alex.user.' + unique + '@example.com',
                Alias = 'alexusr',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                LanguageLocaleKey = 'en_US',
                ProfileId = standard.Id
            );
            insert alexUser;

            PermissionSet alexUserPermSet = [
                SELECT Id
                FROM PermissionSet
                WHERE Name = 'Alex_User' AND NamespacePrefix = 'OpenSF'
                LIMIT 1
            ];
            insert new PermissionSetAssignment(
                AssigneeId = alexUser.Id,
                PermissionSetId = alexUserPermSet.Id
            );
        }
        return alexUser;
    }

    @isTest
    static void standardUserCannotStartSprint() {
        OpenSF__Sprint__c sprint = [
            SELECT Id
            FROM OpenSF__Sprint__c
            WHERE OpenSF__SprintNumber__c = 1
        ];
        User alexUser = createAlexUser();

        Boolean blocked = false;
        System.runAs(alexUser) {
            Test.startTest();
            try {
                SprintService.startSprint(sprint.Id);
            } catch (Exception e) {
                blocked = true;
            }
            Test.stopTest();
        }

        Assert.isTrue(
            blocked,
            'A user with read-only Sprint access must not start a sprint'
        );
        OpenSF__Sprint__c after = [
            SELECT OpenSF__Status__c
            FROM OpenSF__Sprint__c
            WHERE Id = :sprint.Id
        ];
        Assert.areEqual(
            'Planning',
            after.OpenSF__Status__c,
            'Sprint status must be unchanged'
        );
    }

    @isTest
    static void standardUserMovingCardToDoneUpdatesSprintRollups() {
        OpenSF__Card__c card = [
            SELECT Id
            FROM OpenSF__Card__c
            WHERE OpenSF__Subject__c = 'Sprint card'
        ];
        OpenSF__Column__c done = [
            SELECT Id
            FROM OpenSF__Column__c
            WHERE OpenSF__ColumnHeader__c = 'Done'
        ];
        OpenSF__Sprint__c sprint = [
            SELECT Id
            FROM OpenSF__Sprint__c
            WHERE OpenSF__SprintNumber__c = 2
        ];
        User alexUser = createAlexUser();

        KanbanBoardController.CardMoveResult result;
        System.runAs(alexUser) {
            Test.startTest();
            result = KanbanBoardController.moveCard(
                card.Id,
                done.Id,
                null,
                null,
                null,
                null
            );
            Test.stopTest();
        }

        Assert.isTrue(result.success, 'Standard user can move a card');
        OpenSF__SprintCard__c junction = [
            SELECT OpenSF__CompletedInSprint__c, OpenSF__CompletedDate__c
            FROM OpenSF__SprintCard__c
            WHERE OpenSF__Card__c = :card.Id AND OpenSF__Sprint__c = :sprint.Id
        ];
        Assert.isTrue(
            junction.OpenSF__CompletedInSprint__c,
            'Sprint card is marked complete when moved to Done'
        );
        Assert.isNotNull(
            junction.OpenSF__CompletedDate__c,
            'Completion date is recorded'
        );
        OpenSF__Sprint__c after = [
            SELECT OpenSF__CompletedStoryPoints__c
            FROM OpenSF__Sprint__c
            WHERE Id = :sprint.Id
        ];
        Assert.areEqual(
            5,
            after.OpenSF__CompletedStoryPoints__c,
            'Completed points roll up even though the user cannot edit Sprint__c'
        );
    }
}
