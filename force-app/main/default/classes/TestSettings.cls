/**
 * @description Test settings and bypass flags for optimizing test performance
 * Use these flags to skip expensive operations during tests when they're not needed
 *
 * Example usage:
 * @isTest
 * static void testSimpleInsert() {
 *     TestSettings.skipPlatformEvents = true;
 *
 *     Test.startTest();
 *     // Platform events won't be published, test runs faster
 *     TestFactory.createCard(columnId, 'Test Card');
 *     Test.stopTest();
 * }
 */
@isTest
public class TestSettings {
    /**
     * Skip platform event publishing in triggers
     * Default: false (events are published)
     * Set to true for tests that don't need to verify event publishing
     */
    public static Boolean skipPlatformEvents = false;

    /**
     * Skip metric calculations and updates
     * Default: false (metrics are calculated)
     * Set to true for tests focused on basic CRUD operations
     */
    public static Boolean skipMetricUpdates = false;

    /**
     * Skip validation rules (future use)
     * Default: false (validation rules run)
     * Set to true for tests that need invalid data for edge cases
     */
    public static Boolean skipValidationRules = false;

    /**
     * Skip workflow rules and process builder (future use)
     * Default: false (automation runs)
     * Set to true for isolated unit tests
     */
    public static Boolean skipAutomation = false;

    /**
     * Reset all flags to default values
     * Call this in test teardown if needed
     */
    public static void reset() {
        skipPlatformEvents = false;
        skipMetricUpdates = false;
        skipValidationRules = false;
        skipAutomation = false;
    }

    /**
     * Check if any bypass flags are set
     * @return true if any flag is enabled
     */
    public static Boolean hasAnyBypass() {
        return skipPlatformEvents ||
            skipMetricUpdates ||
            skipValidationRules ||
            skipAutomation;
    }

    /**
     * Enable "fast mode" - skips all non-essential operations
     * Use for performance-critical tests or bulk operation tests
     */
    public static void enableFastMode() {
        skipPlatformEvents = true;
        skipMetricUpdates = true;
        skipAutomation = true;
    }

    /**
     * Disable record-triggered flows (email/SF notifications).
     * No-op in OSS version (KanbanConfig__c is a paid feature).
     */
    public static void disableFlowAutomation() {
        // No-op: KanbanConfig__c not available in OSS
    }
}
