/**
 * CardFileService - Manages file attachments (ContentDocumentLinks) for Card records.
 * Uses Salesforce's ContentDocument/ContentVersion/ContentDocumentLink standard objects.
 */
public with sharing class CardFileService {
    /**
     * DTO representing a file attached to a card.
     */
    public class CardFileDTO {
        @AuraEnabled
        public Id contentDocumentId;
        @AuraEnabled
        public String title;
        @AuraEnabled
        public String fileExtension;
        @AuraEnabled
        public Long contentSize;
        @AuraEnabled
        public DateTime createdDate;
        @AuraEnabled
        public Id contentVersionId;
        @AuraEnabled
        public String createdByName;
    }

    /**
     * Get all files attached to a card via ContentDocumentLink.
     * @param cardId The Card__c record ID
     * @return List of CardFileDTO with file metadata
     */
    public static List<CardFileDTO> getCardFiles(Id cardId) {
        List<ContentDocumentLink> links = [
            SELECT
                ContentDocumentId,
                ContentDocument.Title,
                ContentDocument.FileExtension,
                ContentDocument.ContentSize,
                ContentDocument.CreatedDate,
                ContentDocument.LatestPublishedVersionId,
                ContentDocument.CreatedBy.Name
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :cardId
            ORDER BY ContentDocument.CreatedDate DESC
        ];

        List<CardFileDTO> files = new List<CardFileDTO>();
        for (ContentDocumentLink link : links) {
            CardFileDTO dto = new CardFileDTO();
            dto.contentDocumentId = link.ContentDocumentId;
            dto.title = link.ContentDocument.Title;
            dto.fileExtension = link.ContentDocument.FileExtension;
            dto.contentSize = link.ContentDocument.ContentSize;
            dto.createdDate = link.ContentDocument.CreatedDate;
            dto.contentVersionId = link.ContentDocument.LatestPublishedVersionId;
            dto.createdByName = link.ContentDocument.CreatedBy.Name;
            files.add(dto);
        }
        return files;
    }

    /**
     * Delete a file attachment from a card.
     * Deletes the ContentDocument itself, which cascades to all links.
     * @param contentDocumentId The ContentDocument ID to delete
     */
    public static void deleteFile(Id contentDocumentId) {
        ContentDocument doc = [
            SELECT Id
            FROM ContentDocument
            WHERE Id = :contentDocumentId
            WITH USER_MODE
            LIMIT 1
        ];
        delete doc;
    }
}
