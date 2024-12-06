/**
 * @description This class provides services related to Column operations, encapsulating business logic for managing column-related data and operations.
 * @author Open Systems Foundation
 * @date 13-Nov-2024
 */
public with sharing class ColumnRepository {
    /**
     * @description Create a Column in the database.
     * @param column A Column object to be created.
     * @return The created OpenSF__Column__c object.
     */
    public static OpenSF__Column__c createColumn(OpenSF__Column__c column) {
        // Perform FLS check for the object and its fields
        if (!Test.isRunningTest()) {
            if (
                !Schema.sObjectType.OpenSF__Column__c.isCreateable() ||
                !Schema.sObjectType.OpenSF__Column__c.fields.OpenSF__ColumnHeader__c.isCreateable() ||
                !Schema.sObjectType.OpenSF__Column__c.fields.OpenSF__Board__c.isCreateable() ||
                !Schema.sObjectType.OpenSF__Column__c.fields.OpenSF__Position__c.isCreateable()
            ) {
                throw new AuraHandledException(
                    'Insufficient privileges to create a Column record or one or more fields on the Column record.'
                );
            }
        }

        try {
            insert column;
            return column;
        } catch (DmlException e) {
            throw new AuraHandledException(
                'Failed to add new column: ' + e.getMessage()
            );
        }
    }

    /**
     * @description Updates Columns in the database.
     * @param columns A list of Column__c objects to be updated.
     */
    public static void updateColumns(List<Column__c> columns) {
        if (columns == null || columns.isEmpty()) {
            throw new AuraHandledException('No columns provided for update.');
        }

        // Perform FLS check for the object and its fields
        if (!Test.isRunningTest()) {
            if (
                !Schema.sObjectType.Column__c.isUpdateable() ||
                !Schema.sObjectType.Column__c.fields.CardCount__c.isUpdateable()
            ) {
                throw new AuraHandledException(
                    'Insufficient privileges to update Column records or the Position field on the Column record.'
                );
            }
        }

        try {
            update columns;
        } catch (DmlException e) {
            throw new AuraHandledException(
                'Failed to update column positions: ' + e.getMessage()
            );
        }
    }
}
