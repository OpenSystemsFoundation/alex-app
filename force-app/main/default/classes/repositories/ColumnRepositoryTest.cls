@isTest
public class ColumnRepositoryTest {
    @testSetup
    static void setupTestData() {
        User user = TestDataFactory.createStandardUser();
        System.runAs(user) {
            OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
            insert new OpenSF__Column__c(
                OpenSF__Board__c = board.Id,
                OpenSF__ColumnHeader__c = 'Test Column',
                OpenSF__Position__c = 1
            );
        }
    }

    @isTest
    static void testCreateColumn() {
        // Arrange
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');

        // Act
        Test.startTest();
        OpenSF__Column__c createdColumn = ColumnRepository.createColumn(
            new OpenSF__Column__c(
                OpenSF__Board__c = board.Id,
                OpenSF__ColumnHeader__c = 'New Column',
                OpenSF__Position__c = 1
            )
        );
        Test.stopTest();

        // Assert
        System.assertNotEquals(
            null,
            createdColumn.Id,
            'Column ID should not be null after creation'
        );
        System.assertEquals(
            board.Id,
            createdColumn.OpenSF__Board__c,
            'Column should belong to the correct board'
        );
        System.assertEquals(
            'New Column',
            createdColumn.OpenSF__ColumnHeader__c,
            'Column header should match the input value'
        );
    }

    @isTest
    static void testUpdateColumns() {
        // Arrange
        OpenSF__Board__c board = TestDataFactory.createBoard('Test Board');
        List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
        for (Integer i = 0; i < 3; i++) {
            columns.add(
                new OpenSF__Column__c(
                    OpenSF__Board__c = board.Id,
                    OpenSF__ColumnHeader__c = 'Column ' + i,
                    OpenSF__Position__c = i
                )
            );
        }
        insert columns;

        // Modify column positions
        for (Integer i = 0; i < columns.size(); i++) {
            columns[i].OpenSF__Position__c = i + 10;
        }

        // Act
        Test.startTest();
        ColumnRepository.updateColumns(columns);
        Test.stopTest();

        // Reload columns from the database to verify update
        List<OpenSF__Column__c> updatedColumns = [
            SELECT Id, OpenSF__Position__c
            FROM OpenSF__Column__c
            WHERE Id IN :columns
        ];

        // Assert
        for (Integer i = 0; i < updatedColumns.size(); i++) {
            System.assertEquals(
                i + 10,
                updatedColumns[i].OpenSF__Position__c,
                'Column position should be updated correctly'
            );
        }
    }
}
