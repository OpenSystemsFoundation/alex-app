import { LightningElement, api, track } from 'lwc';
import { selectors } from 'c/kanbanStore';
import {
    setBacklogVisible,
    toggleBacklogCardSelection,
    setSelectedBacklogCards
} from 'c/kanbanStore';
import { addCardsToSprintAsync } from 'c/kanbanStore';

export default class KanbanBacklogPanel extends LightningElement {
    @api store;
    @api mode = 'sidebar'; // 'sidebar' | 'panel'

    @track searchTerm = '';
    @track sortBy = 'priority'; // 'priority' | 'type' | 'subject' | 'points'
    @track _storeState = null;

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
            this._storeUnsubscribe = null;
        }
    }

    // Computed properties
    get backlogCards() {
        if (!this._storeState) return [];
        const cards = selectors.getBacklogCards(this._storeState);
        let filtered = cards;

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(
                (c) =>
                    (c.subject && c.subject.toLowerCase().includes(term)) ||
                    (c.Name && c.Name.toLowerCase().includes(term)) ||
                    (c.cardType && c.cardType.toLowerCase().includes(term))
            );
        }

        // Apply sort
        return this.sortCards(filtered);
    }

    get cardCount() {
        if (!this._storeState) return 0;
        return selectors.getBacklogCardCount(this._storeState);
    }

    get selectedCards() {
        if (!this._storeState) return [];
        return selectors.getSelectedBacklogCards(this._storeState);
    }

    get selectedCount() {
        return this.selectedCards.length;
    }

    get hasSelectedCards() {
        return this.selectedCount > 0;
    }

    get activeSprint() {
        if (!this._storeState) return null;
        return selectors.getActiveSprint(this._storeState);
    }

    get hasActiveSprint() {
        return !!this.activeSprint;
    }

    get panelClass() {
        const base = 'backlog-panel';
        return this.mode === 'sidebar'
            ? `${base} backlog-panel--sidebar`
            : `${base} backlog-panel--panel`;
    }

    get hasCards() {
        return this.backlogCards.length > 0;
    }

    get addToSprintLabel() {
        return `Add ${this.selectedCount} to Sprint`;
    }

    // Sort options
    get sortOptions() {
        return [
            { label: 'Priority', value: 'priority' },
            { label: 'Type', value: 'type' },
            { label: 'Subject', value: 'subject' },
            { label: 'Story Points', value: 'points' }
        ];
    }

    // Helpers
    sortCards(cards) {
        const sorted = [...cards];
        const priorityOrder = { High: 1, Medium: 2, Low: 3 };

        switch (this.sortBy) {
            case 'priority':
                sorted.sort(
                    (a, b) =>
                        (priorityOrder[a.priority] || 99) -
                        (priorityOrder[b.priority] || 99)
                );
                break;
            case 'type':
                sorted.sort((a, b) =>
                    (a.cardType || '').localeCompare(b.cardType || '')
                );
                break;
            case 'subject':
                sorted.sort((a, b) =>
                    (a.subject || '').localeCompare(b.subject || '')
                );
                break;
            case 'points':
                sorted.sort(
                    (a, b) => (b.storyPoints || 0) - (a.storyPoints || 0)
                );
                break;
            default:
                break;
        }
        return sorted;
    }

    isCardSelected(cardId) {
        return this.selectedCards.includes(cardId);
    }

    // Event handlers
    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleSortChange(event) {
        this.sortBy = event.detail.value;
    }

    handleCardSelect(event) {
        const cardId = event.currentTarget.dataset.cardId;
        if (this.store) {
            this.store.dispatch(toggleBacklogCardSelection(cardId));
        }
    }

    handleSelectAll() {
        if (this.store) {
            const allIds = this.backlogCards.map((c) => c.Id);
            this.store.dispatch(setSelectedBacklogCards(allIds));
        }
    }

    handleDeselectAll() {
        if (this.store) {
            this.store.dispatch(setSelectedBacklogCards([]));
        }
    }

    async handleAddToSprint() {
        if (!this.store || !this.activeSprint || !this.hasSelectedCards) return;

        try {
            await this.store.dispatch(
                addCardsToSprintAsync(this.activeSprint.Id, this.selectedCards)
            );
            this.store.dispatch(setSelectedBacklogCards([]));
            this.dispatchEvent(
                new CustomEvent('cardsadded', {
                    detail: { count: this.selectedCount }
                })
            );
        } catch (error) {
            console.error('Error adding cards to sprint:', error);
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to add cards to sprint' }
                })
            );
        }
    }

    handleCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;
        this.dispatchEvent(
            new CustomEvent('cardclick', { detail: { cardId } })
        );
    }

    handleClose() {
        if (this.store) {
            this.store.dispatch(setBacklogVisible(false));
        }
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleDragStart(event) {
        const cardId = event.currentTarget.dataset.cardId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.dataTransfer.setData('source', 'backlog');
        event.currentTarget.classList.add('dragging');
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
    }
}
