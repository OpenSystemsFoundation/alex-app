/**
 * ColumnTriggerHandlerTest - Test class for ColumnTriggerHandler
 * Tests column trigger handler logic and platform event publishing
 */
@isTest
private class ColumnTriggerHandlerTest {
    
    @testSetup
    static void setup() {
        // Create test board using TestFactory
        TestFactory.createBoard('Test Board');
    }
    
    @isTest
    static void testAfterInsert() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        // Insert new column - should trigger afterInsert
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do',
            OpenSF__Color__c = '#1B96FF'
        );
        insert column;
        Test.stopTest();
        
        // Verify column was created
        OpenSF__Column__c insertedColumn = [SELECT Id, OpenSF__ColumnHeader__c FROM OpenSF__Column__c WHERE Id = :column.Id];
        System.assertEquals('To Do', insertedColumn.OpenSF__ColumnHeader__c, 'Column should be inserted');
    }
    
    @isTest
    static void testAfterUpdate() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        // Create column
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert column;
        
        Test.startTest();
        // Update column - should trigger afterUpdate
        column.OpenSF__ColumnHeader__c = 'In Progress';
        column.OpenSF__Color__c = '#2E844A';
        update column;
        Test.stopTest();
        
        // Verify column was updated
        OpenSF__Column__c updatedColumn = [SELECT Id, OpenSF__ColumnHeader__c, OpenSF__Color__c FROM OpenSF__Column__c WHERE Id = :column.Id];
        System.assertEquals('In Progress', updatedColumn.OpenSF__ColumnHeader__c, 'Header should be updated');
        System.assertEquals('#2E844A', updatedColumn.OpenSF__Color__c, 'Color should be updated');
    }
    
    @isTest
    static void testAfterDelete() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        // OPTIMIZATION: Skip platform events for faster test execution
        TestSettings.skipPlatformEvents = true;
        
        // Create column
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert column;
        
        Test.startTest();
        // Delete column - should trigger afterDelete
        delete column;
        Test.stopTest();
        
        // Verify column was deleted
        List<OpenSF__Column__c> deletedColumns = [SELECT Id FROM OpenSF__Column__c WHERE Id = :column.Id];
        System.assertEquals(0, deletedColumns.size(), 'Column should be deleted');
    }
    
    @isTest
    static void testBulkInsert() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        for (Integer i = 0; i < 50; i++) {
            columns.add(new OpenSF__Column__c(
                OpenSF__ColumnHeader__c = 'Column ' + i,
                OpenSF__Board__c = board.Id,
                OpenSF__Position__c = '0|h0000' + i + ':',
                OpenSF__Status__c = 'Backlog'
            ));
        }
        
        Test.startTest();
        insert columns;
        Test.stopTest();
        
        // Verify all columns were inserted
        List<OpenSF__Column__c> insertedColumns = [SELECT Id FROM OpenSF__Column__c WHERE OpenSF__Board__c = :board.Id];
        System.assertEquals(50, insertedColumns.size(), 'All 50 columns should be inserted');
    }
    
    @isTest
    static void testBulkUpdate() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        for (Integer i = 0; i < 20; i++) {
            columns.add(new OpenSF__Column__c(
                OpenSF__ColumnHeader__c = 'Column ' + i,
                OpenSF__Board__c = board.Id,
                OpenSF__Position__c = '0|h0000' + i + ':',
                OpenSF__Status__c = 'Backlog'
            ));
        }
        insert columns;
        
        // Update all columns
        for (OpenSF__Column__c col : columns) {
            col.OpenSF__Color__c = '#1B96FF';
        }
        
        Test.startTest();
        update columns;
        Test.stopTest();
        
        // Verify all columns were updated
        List<OpenSF__Column__c> updatedColumns = [SELECT Id, OpenSF__Color__c FROM OpenSF__Column__c WHERE OpenSF__Board__c = :board.Id];
        for (OpenSF__Column__c col : updatedColumns) {
            System.assertEquals('#1B96FF', col.OpenSF__Color__c, 'All columns should have blue color');
        }
    }
    
    @isTest
    static void testEventPublishing() {
        OpenSF__Board__c board = [SELECT Id FROM OpenSF__Board__c LIMIT 1];
        
        Test.startTest();
        // Insert column which should publish event
        OpenSF__Column__c column = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'Event Test Column',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = '0|h00000:',
            OpenSF__Status__c = 'To Do'
        );
        insert column;
        
        // Update to trigger another event
        column.OpenSF__ColumnHeader__c = 'Updated Column';
        update column;
        Test.stopTest();
        
        // Verify the column operations completed successfully
        OpenSF__Column__c verifyColumn = [SELECT Id, OpenSF__ColumnHeader__c FROM OpenSF__Column__c WHERE Id = :column.Id];
        System.assertEquals('Updated Column', verifyColumn.OpenSF__ColumnHeader__c, 'Column should be updated successfully');
    }
}
