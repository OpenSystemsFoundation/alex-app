/**
 * @description Detects post-upgrade steps a managed package upgrade can't do
 * automatically, so the Admin page can tell admins exactly what to fix.
 *
 * Salesforce never adds new values to existing picklist fields during a
 * package upgrade, and it never deactivates a flow version that is already
 * active. Each release that adds picklist values, renames them, or retires a
 * flow adds an entry to the lists below. See docs/UPGRADING.md.
 */
public with sharing class UpgradeCheckService {
    private static final String NS = 'OpenSF__';

    /** A picklist value that must exist (active) in the subscriber org. */
    public class PicklistRequirement {
        public String objectApiName;
        public String fieldApiName;
        public String value;
        /** If set, this value replaced an older one that should be merged into it. */
        public String replaces;
        public String sinceVersion;
        public String reason;

        public PicklistRequirement(
            String objectApiName,
            String fieldApiName,
            String value,
            String replaces,
            String sinceVersion,
            String reason
        ) {
            this.objectApiName = objectApiName;
            this.fieldApiName = fieldApiName;
            this.value = value;
            this.replaces = replaces;
            this.sinceVersion = sinceVersion;
            this.reason = reason;
        }
    }

    /** A packaged flow that is retired and should no longer be active. */
    public class RetiredFlow {
        public String apiName;
        public String sinceVersion;
        public String reason;

        public RetiredFlow(String apiName, String sinceVersion, String reason) {
            this.apiName = apiName;
            this.sinceVersion = sinceVersion;
            this.reason = reason;
        }
    }

    /** One thing the admin needs to do, shown on the Admin page. */
    public class UpgradeIssue {
        @AuraEnabled
        public String key;
        @AuraEnabled
        public String title;
        @AuraEnabled
        public String detail;
        @AuraEnabled
        public String sinceVersion;
        @AuraEnabled
        public String setupUrl;
        @AuraEnabled
        public String actionLabel;
    }

    // ------------------------------------------------------------------
    // Release requirements: add entries here when a release needs them.
    // Object and field names are without the namespace prefix.
    // ------------------------------------------------------------------

    @TestVisible
    private static List<PicklistRequirement> picklistRequirements = new List<PicklistRequirement>{
        new PicklistRequirement(
            'Board__c',
            'Type__c',
            'Sprint',
            null,
            '2.0.0',
            'Sprint boards turn on sprints, the sprint header, burndown and velocity.'
        ),
        new PicklistRequirement(
            'Board__c',
            'Status__c',
            'Active',
            null,
            '2.0.0',
            'New boards created from the Admin page use this status.'
        ),
        new PicklistRequirement(
            'Card__c',
            'CardType__c',
            'Story',
            'User Story',
            '2.0.0',
            'Card type filters and the backlog use "Story".'
        )
    };

    @TestVisible
    private static List<RetiredFlow> retiredFlows = new List<RetiredFlow>{
        new RetiredFlow(
            'Card_Notifications',
            '2.0.0',
            'Sends 1.x card notifications that Alex 2.0 no longer uses.'
        ),
        new RetiredFlow(
            'Card_Email_Notifications',
            '2.0.0',
            'Sends 1.x card emails that Alex 2.0 no longer uses.'
        ),
        new RetiredFlow(
            'Feedback_Reporting',
            '2.0.0',
            'The 1.x feedback form is no longer part of Alex.'
        ),
        new RetiredFlow(
            'Column_Setup',
            '2.0.0',
            'Replaced by the Columns tab on the board page.'
        )
    };

    /**
     * @return every outstanding upgrade step; empty when the org is up to date
     */
    public static List<UpgradeIssue> getIssues() {
        List<UpgradeIssue> issues = new List<UpgradeIssue>();
        issues.addAll(checkPicklists());
        issues.addAll(checkRetiredFlows());
        return issues;
    }

    @TestVisible
    private static List<UpgradeIssue> checkPicklists() {
        List<UpgradeIssue> issues = new List<UpgradeIssue>();
        for (PicklistRequirement req : picklistRequirements) {
            Set<String> active = activePicklistValues(
                NS + req.objectApiName,
                NS + req.fieldApiName
            );
            if (active == null) {
                continue; // field not visible to this user; nothing to report
            }
            String fieldLabel = fieldLabel(
                NS + req.objectApiName,
                NS + req.fieldApiName
            );
            String objectLabel = objectLabel(NS + req.objectApiName);
            String setupUrl =
                '/lightning/setup/ObjectManager/' +
                NS +
                req.objectApiName +
                '/FieldsAndRelationships/view';

            if (!active.contains(req.value)) {
                UpgradeIssue issue = new UpgradeIssue();
                issue.key =
                    'picklist:' +
                    req.objectApiName +
                    '.' +
                    req.fieldApiName +
                    ':' +
                    req.value;
                issue.title =
                    'Add "' +
                    req.value +
                    '" to ' +
                    objectLabel +
                    ' > ' +
                    fieldLabel;
                issue.detail = req.reason;
                issue.sinceVersion = req.sinceVersion;
                issue.setupUrl = setupUrl;
                issue.actionLabel = 'Open ' + objectLabel + ' fields';
                issues.add(issue);
            } else if (req.replaces != null && active.contains(req.replaces)) {
                UpgradeIssue issue = new UpgradeIssue();
                issue.key =
                    'picklist-replace:' +
                    req.objectApiName +
                    '.' +
                    req.fieldApiName +
                    ':' +
                    req.replaces;
                issue.title =
                    'Replace "' +
                    req.replaces +
                    '" with "' +
                    req.value +
                    '" in ' +
                    objectLabel +
                    ' > ' +
                    fieldLabel;
                issue.detail =
                    'Use Replace on the field to move existing records to "' +
                    req.value +
                    '", then deactivate "' +
                    req.replaces +
                    '".';
                issue.sinceVersion = req.sinceVersion;
                issue.setupUrl = setupUrl;
                issue.actionLabel = 'Open ' + objectLabel + ' fields';
                issues.add(issue);
            }
        }
        return issues;
    }

    @TestVisible
    private static List<UpgradeIssue> checkRetiredFlows() {
        List<UpgradeIssue> issues = new List<UpgradeIssue>();
        Map<String, RetiredFlow> byName = new Map<String, RetiredFlow>();
        for (RetiredFlow f : retiredFlows) {
            byName.put(f.apiName, f);
        }
        if (byName.isEmpty()) {
            return issues;
        }
        List<FlowDefinitionView> active;
        try {
            active = [
                SELECT ApiName, Label
                FROM FlowDefinitionView
                WHERE
                    NamespacePrefix = 'OpenSF'
                    AND ApiName IN :byName.keySet()
                    AND IsActive = TRUE
                WITH USER_MODE
            ];
        } catch (Exception e) {
            return issues; // no access to flow definitions; skip this check
        }
        for (FlowDefinitionView fd : active) {
            RetiredFlow f = byName.get(fd.ApiName);
            UpgradeIssue issue = new UpgradeIssue();
            issue.key = 'flow:' + fd.ApiName;
            issue.title = 'Deactivate the flow "' + fd.Label + '"';
            issue.detail = f.reason;
            issue.sinceVersion = f.sinceVersion;
            issue.setupUrl = '/lightning/setup/Flows/home';
            issue.actionLabel = 'Open Flows';
            issues.add(issue);
        }
        return issues;
    }

    /** Active picklist values, or null if the field isn't accessible. */
    private static Set<String> activePicklistValues(
        String objectApiName,
        String fieldApiName
    ) {
        Schema.DescribeFieldResult field = describeField(
            objectApiName,
            fieldApiName
        );
        if (field == null) {
            return null;
        }
        Set<String> values = new Set<String>();
        for (Schema.PicklistEntry entry : field.getPicklistValues()) {
            if (entry.isActive()) {
                values.add(entry.getValue());
            }
        }
        return values;
    }

    private static Schema.DescribeFieldResult describeField(
        String objectApiName,
        String fieldApiName
    ) {
        List<Schema.DescribeSObjectResult> objects = Schema.describeSObjects(
            new List<String>{ objectApiName },
            SObjectDescribeOptions.DEFERRED
        );
        if (objects.isEmpty()) {
            return null;
        }
        Schema.SObjectField field = objects[0]
            .fields.getMap()
            .get(fieldApiName);
        if (field == null) {
            return null;
        }
        Schema.DescribeFieldResult result = field.getDescribe();
        return result.isAccessible() ? result : null;
    }

    private static String fieldLabel(
        String objectApiName,
        String fieldApiName
    ) {
        Schema.DescribeFieldResult field = describeField(
            objectApiName,
            fieldApiName
        );
        return field == null ? fieldApiName : field.getLabel();
    }

    private static String objectLabel(String objectApiName) {
        return Schema.describeSObjects(
                new List<String>{ objectApiName },
                SObjectDescribeOptions.DEFERRED
            )[0]
            .getLabel();
    }
}
