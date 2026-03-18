import { LightningElement, api, track } from 'lwc';
import { selectors, completeSprintAsync } from 'c/kanbanStore';

export default class KanbanSprintComplete extends LightningElement {
    @api store;
    @api sprintId;
    @api isOpen = false;

    @track _storeState = null;
    @track step = 1; // 1=summary, 2=dispositions, 3=confirm
    @track dispositions = {}; // cardId -> 'backlog' | sprintId
    @track isProcessing = false;

    _storeUnsubscribe = null;

    connectedCallback() {
        if (this.store) {
            this._storeUnsubscribe = this.store.subscribe((state) => {
                this._storeState = state;
            });
            this._storeState = this.store.getState();
        }
    }

    disconnectedCallback() {
        if (this._storeUnsubscribe) {
            this._storeUnsubscribe();
        }
    }

    get sprint() {
        if (!this._storeState) return null;
        return selectors.getActiveSprint(this._storeState);
    }

    get sprintCards() {
        if (!this._storeState) return [];
        return selectors.getSprintCards(this._storeState);
    }

    get completedCards() {
        return this.sprintCards.filter((sc) => sc.completedInSprint);
    }

    get incompleteCards() {
        return this.sprintCards.filter((sc) => !sc.completedInSprint);
    }

    get completedCount() {
        return this.completedCards.length;
    }

    get incompleteCount() {
        return this.incompleteCards.length;
    }

    get totalCount() {
        return this.sprintCards.length;
    }

    get completedPoints() {
        return this.sprint?.completedStoryPoints || 0;
    }

    get totalPoints() {
        return this.sprint?.totalStoryPoints || 0;
    }

    get isStep1() {
        return this.step === 1;
    }
    get isStep2() {
        return this.step === 2;
    }
    get isStep3() {
        return this.step === 3;
    }

    get dispositionOptions() {
        return [{ label: 'Move to Backlog', value: 'backlog' }];
    }

    get incompleteCardsWithDisposition() {
        return this.incompleteCards.map((sc) => ({
            ...sc,
            disposition: this.dispositions[sc.cardId] || 'backlog'
        }));
    }

    get hasIncompleteCards() {
        return this.incompleteCount > 0;
    }

    // Navigation
    handleNext() {
        if (this.step === 1 && this.hasIncompleteCards) {
            // Initialize dispositions
            const disp = {};
            for (const sc of this.incompleteCards) {
                disp[sc.cardId] = 'backlog';
            }
            this.dispositions = disp;
            this.step = 2;
        } else if (this.step === 1) {
            this.step = 3;
        } else if (this.step === 2) {
            this.step = 3;
        }
    }

    handleBack() {
        if (this.step > 1) {
            this.step--;
        }
    }

    handleDispositionChange(event) {
        const cardId = event.currentTarget.dataset.cardId;
        const value = event.detail.value;
        this.dispositions = { ...this.dispositions, [cardId]: value };
    }

    async handleComplete() {
        if (this.isProcessing || !this.store) return;
        this.isProcessing = true;

        try {
            await this.store.dispatch(
                completeSprintAsync(this.sprintId, this.dispositions)
            );
            this.dispatchEvent(new CustomEvent('sprintcompleted'));
            this.handleClose();
        } catch (error) {
            console.error('Error completing sprint:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    handleClose() {
        this.step = 1;
        this.dispositions = {};
        this.dispatchEvent(new CustomEvent('close'));
    }
}
