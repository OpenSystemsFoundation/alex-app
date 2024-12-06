import boardUtils from 'c/kanbanBoardUtils';
import createCard from '@salesforce/apex/BoardController.createCard';
import fetchBoardData from '@salesforce/apex/BoardController.fetchBoardData';
import updateCards from '@salesforce/apex/BoardController.updateCards';

const QUEUE_LIMIT = 0;

class BoardService {
    static instance = null;
    constructor() {
        if (BoardService.instance) {
            throw new Error(
                'Cannot instantiate directly. Use BoardService.getInstance()'
            );
        }
        this.queue = [];
        this.isProcessing = false;
        this.isLoading = false;
    }

    static getInstance() {
        if (!BoardService.instance) {
            BoardService.instance = new BoardService();
        }
        return BoardService.instance;
    }

    addToQueue(task, isPriority = false) {
        return new Promise((resolve, reject) => {
            const queueItem = { task, resolve, reject };
            if (isPriority) {
                this.queue.unshift(queueItem);
            } else {
                this.queue.push(queueItem);
            }
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === QUEUE_LIMIT) {
            return;
        }

        this.isProcessing = true;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.isProcessing = false;
            await this.processQueue();
        }
    }

    async fetchBoardData({ boardId }) {
        this.isLoading = true;
        try {
            const boardData = boardUtils.mapBoardData(
                await fetchBoardData({ boardId })
            );
            return boardData;
        } catch (error) {
            throw new Error(
                `BoardService: Unable to fetch data for boardId: ${boardId}. Original error: ${error.message}`
            );
        } finally {
            this.isLoading = false;
        }
    }

    queueCreateCard({ columnId, columnStatus }) {
        return this.addToQueue(
            () => this.createCard({ columnId, columnStatus }),
            true
        );
    }

    async createCard({ columnId, columnStatus }) {
        this.isLoading = true;
        try {
            const mappedCard = boardUtils.mapCard(
                await createCard({ columnId, columnStatus })
            );

            return mappedCard;
        } catch (error) {
            throw new Error(
                `BoardService: Unable to add cards to columnId: ${columnId}. Original error: ${error.message}`
            );
        } finally {
            this.isLoading = false;
        }
    }

    queueUpdateCards(cards) {
        return this.addToQueue(() => this.updateCards(cards), true);
    }

    async updateCards(cards) {
        this.isLoading = true;
        try {
            const mappedCards = boardUtils.mapCards(
                await updateCards({
                    cards: cards.map(card => ({
                        Id: card.cardId,
                        OpenSF__Column__c: card.columnId,
                        OpenSF__Position__c: card.cardPosition,
                        OpenSF__Status__c: card.cardStatus
                    }))
                })
            );
            return mappedCards;
        } catch (error) {
            throw new Error(
                `BoardService: Unable to update card position. Original error: ${error.message}`
            );
        } finally {
            this.isLoading = false;
        }
    }
}

export default BoardService.getInstance();
