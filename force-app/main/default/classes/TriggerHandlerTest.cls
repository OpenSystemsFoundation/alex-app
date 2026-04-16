/**
 * TriggerHandlerTest - Test class for TriggerHandler base class
 * Tests trigger handler framework functionality
 */
@isTest
private class TriggerHandlerTest {
    // Test handler implementation
    private class TestTriggerHandler extends TriggerHandler {
        public Integer beforeInsertCount = 0;
        public Integer afterInsertCount = 0;
        public Integer beforeUpdateCount = 0;
        public Integer afterUpdateCount = 0;
        public Integer beforeDeleteCount = 0;
        public Integer afterDeleteCount = 0;

        protected override void beforeInsert() {
            beforeInsertCount++;
        }

        protected override void afterInsert() {
            afterInsertCount++;
        }

        protected override void beforeUpdate() {
            beforeUpdateCount++;
        }

        protected override void afterUpdate() {
            afterUpdateCount++;
        }

        protected override void beforeDelete() {
            beforeDeleteCount++;
        }

        protected override void afterDelete() {
            afterDeleteCount++;
        }
    }

    @isTest
    static void testBeforeInsert() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            true,
            false,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            1,
            handler.beforeInsertCount,
            'beforeInsert should be called once'
        );
        System.assertEquals(
            0,
            handler.afterInsertCount,
            'afterInsert should not be called'
        );
    }

    @isTest
    static void testAfterInsert() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            0,
            handler.beforeInsertCount,
            'beforeInsert should not be called'
        );
        System.assertEquals(
            1,
            handler.afterInsertCount,
            'afterInsert should be called once'
        );
    }

    @isTest
    static void testBeforeUpdate() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            true,
            false,
            false,
            true,
            false,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            1,
            handler.beforeUpdateCount,
            'beforeUpdate should be called once'
        );
        System.assertEquals(
            0,
            handler.afterUpdateCount,
            'afterUpdate should not be called'
        );
    }

    @isTest
    static void testAfterUpdate() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            false,
            true,
            false,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            0,
            handler.beforeUpdateCount,
            'beforeUpdate should not be called'
        );
        System.assertEquals(
            1,
            handler.afterUpdateCount,
            'afterUpdate should be called once'
        );
    }

    @isTest
    static void testBeforeDelete() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            true,
            false,
            false,
            false,
            true,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            1,
            handler.beforeDeleteCount,
            'beforeDelete should be called once'
        );
        System.assertEquals(
            0,
            handler.afterDeleteCount,
            'afterDelete should not be called'
        );
    }

    @isTest
    static void testAfterDelete() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            false,
            false,
            true,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            0,
            handler.beforeDeleteCount,
            'beforeDelete should not be called'
        );
        System.assertEquals(
            1,
            handler.afterDeleteCount,
            'afterDelete should be called once'
        );
    }

    @isTest
    static void testBypass() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        // Bypass the handler
        TriggerHandler.bypass('TestTriggerHandler');

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            0,
            handler.afterInsertCount,
            'Handler should be bypassed'
        );
        System.assert(
            handler.isBypassed(),
            'Handler should report as bypassed'
        );

        // Clear bypass
        TriggerHandler.clearBypass('TestTriggerHandler');
    }

    @isTest
    static void testClearBypass() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        // Bypass then clear
        TriggerHandler.bypass('TestTriggerHandler');
        TriggerHandler.clearBypass('TestTriggerHandler');

        Test.startTest();
        handler.execute();
        Test.stopTest();

        System.assertEquals(
            1,
            handler.afterInsertCount,
            'Handler should execute after bypass cleared'
        );
        System.assertEquals(
            false,
            handler.isBypassed(),
            'Handler should not be bypassed'
        );
    }

    @isTest
    static void testIsBypassed() {
        TestTriggerHandler handler = new TestTriggerHandler();

        System.assertEquals(
            false,
            handler.isBypassed(),
            'Should not be bypassed initially'
        );

        TriggerHandler.bypass('TestTriggerHandler');
        System.assertEquals(true, handler.isBypassed(), 'Should be bypassed');

        TriggerHandler.clearBypass('TestTriggerHandler');
        System.assertEquals(
            false,
            handler.isBypassed(),
            'Should not be bypassed after clear'
        );
    }

    @isTest
    static void testClearAllBypasses() {
        TestTriggerHandler handler1 = new TestTriggerHandler();

        TriggerHandler.bypass('TestTriggerHandler');
        TriggerHandler.bypass('AnotherHandler');

        System.assertEquals(true, handler1.isBypassed(), 'Should be bypassed');

        TriggerHandler.clearAllBypasses();

        System.assertEquals(
            false,
            handler1.isBypassed(),
            'All bypasses should be cleared'
        );
    }

    @isTest
    static void testMaxLoopCount() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        // Drive the handler up to the default maxLoopCount (currently
        // 20 — allowing for 2 trigger phases per DML × nested rollup
        // updates). The (N+1)th call must throw.
        Integer maxLoopCount = 20;

        Test.startTest();
        for (Integer i = 0; i < maxLoopCount; i++) {
            handler.execute();
        }

        try {
            handler.execute(); // Should throw on exceeding maxLoopCount
            System.assert(false, 'Should have thrown TriggerHandlerException');
        } catch (Exception e) {
            System.assert(
                e.getMessage().contains('Maximum loop count'),
                'Should throw max loop exception'
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testResetExecutionCount() {
        TestTriggerHandler handler = new TestTriggerHandler();
        handler.setTriggerContext(
            false,
            true,
            true,
            false,
            false,
            false,
            null,
            null,
            null,
            null
        );

        Test.startTest();
        handler.execute(); // First execution
        handler.execute(); // Second execution

        // Reset execution count
        TriggerHandler.resetExecutionCount('TestTriggerHandler');

        // Should be able to execute again - count resets so afterInsertCount increments
        handler.execute();
        System.assertEquals(
            3,
            handler.afterInsertCount,
            'Should have executed 3 times total'
        );
        Test.stopTest();
    }

    @isTest
    static void testTriggerHandlerException() {
        // Test that TriggerHandlerException can be thrown and caught
        try {
            throw new TriggerHandler.TriggerHandlerException('Test exception');
        } catch (TriggerHandler.TriggerHandlerException e) {
            System.assertEquals(
                'Test exception',
                e.getMessage(),
                'Exception message should match'
            );
        }
    }
}
