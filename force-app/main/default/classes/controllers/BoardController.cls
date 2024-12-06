/**
 * @description This class provides a repository related to Board operations, encapsulating DML logic for managing board-related mutations.
 * @author Open Systems Foundation
 * @date 13-Nov-2024
 */
public with sharing class BoardController {
    /**
     * @description Fetches board data for a given board ID.
     * @param boardId The ID of the board to fetch data for.
     * @return A map containing board data.
     * @throws AuraHandledException if there is an error fetching the board data.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> fetchBoardData(Id boardId) {
        try {
            Map<String, Object> boardData = BoardService.getBoardData(boardId);
            return boardData;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Failed to fetch board data: ' + e.getMessage()
            );
        }
    }

    /**
     * @description Updates the given list of cards.
     * @param cards The list of cards to update.
     * @return A list of updated cards.
     * @throws AuraHandledException if there is an error updating the cards.
     */
    @AuraEnabled
    public static List<OpenSF__Card__c> updateCards(
        List<OpenSF__Card__c> cards
    ) {
        try {
            List<OpenSF__Card__c> updatedCards = BoardService.updateCards(
                cards
            );
            return updatedCards;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Failed to move card: ' + e.getMessage()
            );
        }
    }

    /**
     * @description Creates a new card in the specified column with the given status.
     * @param columnId The ID of the column to create the card in.
     * @param columnStatus The status of the new card.
     * @return The newly created card.
     * @throws AuraHandledException if there is an error creating the card.
     */
    @AuraEnabled
    public static OpenSF__Card__c createCard(Id columnId, String columnStatus) {
        try {
            OpenSF__Card__c newCard = BoardService.createCard(
                columnId,
                columnStatus
            );
            return newCard;
        } catch (Exception e) {
            throw new AuraHandledException(
                'Failed to add new card: ' + e.getMessage()
            );
        }
    }
}
