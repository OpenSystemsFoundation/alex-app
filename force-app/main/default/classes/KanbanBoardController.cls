/**
 * KanbanBoardController - Apex controller for Kanban Board LWC
 * Handles board data retrieval, card movements, and real-time updates
 */
public with sharing class KanbanBoardController {
    
    /**
     * Get board with columns and cards
     */
    @AuraEnabled
    public static BoardData getBoardData(Id boardId) {
        try {
            // Use selector class for queries
            OpenSF__Board__c board = KanbanBoardSelector.getBoardById(boardId);
            List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(boardId);
            List<OpenSF__Card__c> cards = KanbanBoardSelector.getCardsByBoardId(boardId);
            
            // Convert to DTOs for LWC consumption
            BoardData result = new BoardData();
            result.board = new KanbanBoardDTO.BoardDTO(board);
            result.columns = KanbanBoardDTO.convertColumns(columns);
            result.cards = KanbanBoardDTO.convertCards(cards);
            
            return result;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error loading board: ' + e.getMessage());
        }
    }
    
    /**
     * Move card to new position (OPTIMIZED for rapid moves)
     * Only updates position and column, skips full query
     */
    @AuraEnabled
    public static CardMoveResult moveCard(Id cardId, Id targetColumnId, String previousCardPosition, String nextCardPosition) {
        try {
            // Calculate new position using LexoRank
            String newPosition = LexoRank.between(previousCardPosition, nextCardPosition);
            
            // Update ONLY position and column (minimal DML)
            OpenSF__Card__c card = new OpenSF__Card__c(
                Id = cardId,
                OpenSF__Column__c = targetColumnId,
                OpenSF__LexoRankPosition__c = newPosition
            );
            
            update card;
            
            // Skip platform event for move - client handles optimistic updates
            // Platform events only needed for multi-user scenarios (handled elsewhere)
            
            // Return minimal data (no full query needed)
            CardMoveResult result = new CardMoveResult();
            result.success = true;
            result.newPosition = newPosition;
            result.cardId = cardId;
            result.columnId = targetColumnId;
            // Skip full card DTO - client already has all data from optimistic update
            
            return result;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error moving card: ' + e.getMessage());
        }
    }
    
    /**
     * Create new card
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardDTO createCard(Id columnId, String subject, String previousCardPosition, String nextCardPosition) {
        try {
            // Calculate position
            String position = LexoRank.between(previousCardPosition, nextCardPosition);
            
            // Create card
            OpenSF__Card__c card = new OpenSF__Card__c(
                OpenSF__Subject__c = subject,
                OpenSF__Column__c = columnId,
                OpenSF__LexoRankPosition__c = position
            );
            
            insert card;
            
            // Event published by trigger
            
            // Return full card data as DTO
            OpenSF__Card__c createdCard = KanbanBoardSelector.getCardById(card.Id);
            return new KanbanBoardDTO.CardDTO(createdCard);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error creating card: ' + e.getMessage());
        }
    }
    
    /**
     * Update card details
     */
    @AuraEnabled
    public static KanbanBoardDTO.CardDTO updateCard(Id cardId, Map<String, Object> updates) {
        try {
            OpenSF__Card__c card = new OpenSF__Card__c(Id = cardId);
            
            // Apply updates
            if (updates.containsKey('subject')) {
                card.OpenSF__Subject__c = (String)updates.get('subject');
            }
            if (updates.containsKey('description')) {
                card.OpenSF__Description__c = (String)updates.get('description');
            }
            if (updates.containsKey('priority')) {
                card.OpenSF__Priority__c = (String)updates.get('priority');
            }
            if (updates.containsKey('color')) {
                card.OpenSF__Color__c = (String)updates.get('color');
            }
            if (updates.containsKey('dueDate')) {
                card.OpenSF__DueDate__c = Date.valueOf((String)updates.get('dueDate'));
            }
            if (updates.containsKey('storyPoints')) {
                card.OpenSF__StoryPoints__c = (Decimal)updates.get('storyPoints');
            }
            if (updates.containsKey('assigneeId')) {
                card.OpenSF__Assignee__c = (Id)updates.get('assigneeId');
            }
            
            update card;
            
            // Event published by trigger
            
            // Return updated card as DTO
            OpenSF__Card__c updatedCard = KanbanBoardSelector.getCardById(cardId);
            return new KanbanBoardDTO.CardDTO(updatedCard);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error updating card: ' + e.getMessage());
        }
    }
    
    /**
     * Delete card
     */
    @AuraEnabled
    public static void deleteCard(Id cardId) {
        try {
            delete new OpenSF__Card__c(Id = cardId);
            // Event published by trigger
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting card: ' + e.getMessage());
        }
    }
    
    /**
     * Reorder column
     */
    @AuraEnabled
    public static KanbanBoardDTO.ColumnDTO moveColumn(Id columnId, String previousColumnPosition, String nextColumnPosition) {
        try {
            String newPosition = LexoRank.between(previousColumnPosition, nextColumnPosition);
            
            OpenSF__Column__c column = new OpenSF__Column__c(
                Id = columnId,
                OpenSF__LexoRankPosition__c = newPosition
            );
            
            update column;
            
            // Return updated column as DTO
            OpenSF__Column__c updatedColumn = KanbanBoardSelector.getColumnById(columnId);
            return new KanbanBoardDTO.ColumnDTO(updatedColumn);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error moving column: ' + e.getMessage());
        }
    }
    
    /**
     * Platform events are now published by triggers (CardTriggerHandler)
     * This provides better separation of concerns and follows Salesforce best practices
     */
    
    /**
     * Search users for assignment
     */
    @AuraEnabled(cacheable=true)
    public static List<User> searchUsers(String searchTerm) {
        return KanbanBoardSelector.searchUsers(searchTerm);
    }
    
    /**
     * Wrapper classes
     */
    public class BoardData {
        @AuraEnabled public KanbanBoardDTO.BoardDTO board;
        @AuraEnabled public List<KanbanBoardDTO.ColumnDTO> columns;
        @AuraEnabled public List<KanbanBoardDTO.CardDTO> cards;
    }
    
    public class CardMoveResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public KanbanBoardDTO.CardDTO card; // Optional - only for full updates
        @AuraEnabled public String newPosition;
        @AuraEnabled public Id cardId; // For minimal updates
        @AuraEnabled public Id columnId; // For minimal updates
    }
}
