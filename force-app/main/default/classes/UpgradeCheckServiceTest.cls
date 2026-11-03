/**
 * @description Tests for UpgradeCheckService (Admin page upgrade check).
 * A fresh org has every packaged picklist value, so requirement lists are
 * swapped per test to exercise the missing / replaced cases.
 */
@isTest
private class UpgradeCheckServiceTest {
    @isTest
    static void upToDateOrgHasNoPicklistIssues() {
        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = UpgradeCheckService.checkPicklists();
        Test.stopTest();

        Assert.areEqual(
            0,
            issues.size(),
            'A fresh install has every 2.0 picklist value: ' +
            JSON.serialize(issues)
        );
    }

    @isTest
    static void missingPicklistValueIsReported() {
        UpgradeCheckService.picklistRequirements = new List<UpgradeCheckService.PicklistRequirement>{
            new UpgradeCheckService.PicklistRequirement(
                'Board__c',
                'Type__c',
                'Not A Real Type',
                null,
                '9.9.9',
                'Needed for testing.'
            )
        };

        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = UpgradeCheckService.checkPicklists();
        Test.stopTest();

        Assert.areEqual(1, issues.size(), 'The missing value is reported');
        UpgradeCheckService.UpgradeIssue issue = issues[0];
        Assert.isTrue(
            issue.title.startsWith('Add "Not A Real Type" to '),
            'Title names the value: ' + issue.title
        );
        Assert.areEqual('Needed for testing.', issue.detail, 'Reason is shown');
        Assert.areEqual('9.9.9', issue.sinceVersion, 'Version is shown');
        Assert.areEqual(
            '/lightning/setup/ObjectManager/OpenSF__Board__c/FieldsAndRelationships/view',
            issue.setupUrl,
            'Links to the object fields in Setup'
        );
        Assert.isNotNull(issue.key, 'Issue has a stable key');
    }

    @isTest
    static void replacedValueStillActiveIsReported() {
        // Both values exist in the org, so the "replace" step is due
        UpgradeCheckService.picklistRequirements = new List<UpgradeCheckService.PicklistRequirement>{
            new UpgradeCheckService.PicklistRequirement(
                'Board__c',
                'Type__c',
                'Project',
                'Personal',
                '9.9.9',
                'Needed for testing.'
            )
        };

        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = UpgradeCheckService.checkPicklists();
        Test.stopTest();

        Assert.areEqual(1, issues.size(), 'The replace step is reported');
        Assert.isTrue(
            issues[0].title.startsWith('Replace "Personal" with "Project"'),
            'Title explains the replacement: ' + issues[0].title
        );
    }

    @isTest
    static void unknownFieldIsSkipped() {
        UpgradeCheckService.picklistRequirements = new List<UpgradeCheckService.PicklistRequirement>{
            new UpgradeCheckService.PicklistRequirement(
                'Board__c',
                'NoSuchField__c',
                'X',
                null,
                '9.9.9',
                'Needed for testing.'
            )
        };

        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = UpgradeCheckService.checkPicklists();
        Test.stopTest();

        Assert.areEqual(0, issues.size(), 'Unknown fields are skipped');
    }

    @isTest
    static void inactiveRetiredFlowsAreNotReported() {
        // Packaged flows are shipped inactive; nothing should be flagged
        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = UpgradeCheckService.checkRetiredFlows();
        UpgradeCheckService.retiredFlows = new List<UpgradeCheckService.RetiredFlow>();
        List<UpgradeCheckService.UpgradeIssue> none = UpgradeCheckService.checkRetiredFlows();
        Test.stopTest();

        Assert.areEqual(
            0,
            issues.size(),
            'Inactive retired flows are fine: ' + JSON.serialize(issues)
        );
        Assert.areEqual(0, none.size(), 'No retired flows, no issues');
    }

    @isTest
    static void adminEndpointReturnsIssues() {
        Test.startTest();
        List<UpgradeCheckService.UpgradeIssue> issues = AdminController.getUpgradeIssues();
        Test.stopTest();

        Assert.isNotNull(issues, 'Endpoint always returns a list');
        Assert.areEqual(
            0,
            issues.size(),
            'Fresh install is up to date: ' + JSON.serialize(issues)
        );
    }
}
