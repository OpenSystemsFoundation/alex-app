const FIRST_INDEX = 0;
class KanbanBoardUtils {
    constructor() {
        if (KanbanBoardUtils.instance) {
            return;
        }
        KanbanBoardUtils.instance = this;
    }

    static getInstance() {
        if (!KanbanBoardUtils.instance) {
            KanbanBoardUtils.instance = new KanbanBoardUtils();
        }
        return KanbanBoardUtils.instance;
    }

    // Utility function to format Salesforce Date/Time field value without precision .000
    formatDateWithoutPrecision(dateString) {
        if (!dateString) {
            return undefined;
        }
        const date = new Date(dateString);
        return date.toISOString().split('.')[FIRST_INDEX] + 'Z';
    }

    mapBoardData(result) {
        return {
            board: {
                boardId: result.board?.Id ?? undefined,
                boardName: result.board?.Name ?? 'Unnamed Board',
                lastModifiedDate: this.formatDateWithoutPrecision(
                    result.board?.LastModifiedDate
                )
            },
            cards: result.cards
                ? result.cards.map(this.mapCard.bind(this))
                : [],
            columns: result.columns
                ? result.columns.map(column => ({
                      columnColor: column?.OpenSF__Color__c ?? undefined,
                      boardId: column?.OpenSF__Board__c ?? undefined,
                      columnHeader:
                          column?.OpenSF__ColumnHeader__c ??
                          column?.Name ??
                          'Unnamed Column',
                      columnId: column?.Id ?? undefined,
                      columnName: column?.Name ?? 'Unnamed Column',
                      columnPosition: column?.OpenSF__Position__c ?? undefined,
                      columnStatus: column?.OpenSF__Status__c ?? undefined,
                      columnUrl: `/lightning/r/OpenSF__Column__c/${column?.Id}/view`,
                      lastModifiedDate: this.formatDateWithoutPrecision(
                          column?.LastModifiedDate
                      )
                  }))
                : []
        };
    }

    mapCard(card) {
        return {
            assigneeId: card?.OpenSF__Assignee__c ?? undefined,
            assigneeName: card.OpenSF__Assignee__r?.Name ?? undefined,
            assigneePhoto: card.OpenSF__Assignee__r?.SmallPhotoUrl ?? undefined,
            cardColor: card?.OpenSF__Color__c ?? undefined,
            cardId: card?.Id ?? undefined,
            cardName: card?.Name ?? 'Unnamed Card',
            cardPosition: card?.OpenSF__Position__c ?? undefined,
            cardPriority: card?.OpenSF__Priority__c ?? undefined,
            cardStatus: card?.OpenSF__Status__c ?? undefined,
            cardSubject: card?.OpenSF__Subject__c ?? undefined,
            cardType: card?.OpenSF__CardType__c ?? undefined,
            cardUrl: `/lightning/r/OpenSF__Card__c/${card.Id}/view`,
            columnId: card?.OpenSF__Column__c ?? undefined,
            lastModifiedDate: this.formatDateWithoutPrecision(
                card?.LastModifiedDate
            ),
            storyPoints: card?.OpenSF__StoryPoints__c ?? undefined
        };
    }

    mapCards(cards) {
        return cards.map(this.mapCard.bind(this));
    }

    extractCardData(eventData) {
        return {
            assigneeId: eventData.OpenSF__AssigneeId__c,
            cardColor: eventData.OpenSF__CardColor__c,
            cardId: eventData.OpenSF__CardId__c,
            cardName: eventData.OpenSF__CardName__c,
            cardUrl: `/lightning/r/OpenSF__Card__c/${eventData.OpenSF__CardId__c}/view`,
            cardPosition: eventData.OpenSF__CardPosition__c,
            cardPriority: eventData.OpenSF__CardPriority__c,
            cardStatus: eventData.OpenSF__CardStatus__c,
            cardSubject: eventData.OpenSF__CardSubject__c,
            cardType: eventData.OpenSF__CardType__c,
            columnId: eventData.OpenSF__ColumnId__c,
            lastModifiedDate: eventData.OpenSF__LastModifiedDate__c,
            storyPoints: eventData.OpenSF__StoryPoints__c
        };
    }

    extractColumnData(eventData) {
        return {
            columnColor: eventData.OpenSF__ColumnColor__c,
            columnId: eventData.OpenSF__ColumnId__c,
            columnUrl: `/lightning/r/OpenSF__Column__c/${eventData.OpenSF__ColumnId__c}/view`,
            columnName: eventData.OpenSF__ColumnName__c,
            columnPosition: eventData.OpenSF__ColumnPosition__c,
            columnStatus: eventData.OpenSF__ColumnStatus__c,
            columnHeader: eventData.OpenSF__ColumnHeader__c,
            boardId: eventData.OpenSF__BoardId__c,
            lastModifiedDate: eventData.OpenSF__LastModifiedDate__c
        };
    }
}

export default KanbanBoardUtils.getInstance();
