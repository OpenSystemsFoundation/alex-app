import { LightningElement, api, track } from 'lwc';
import { selectors } from 'c/kanbanStore';
import {
    setSelectedBacklogCards,
    toggleBacklogCardSelection,
    reorderBacklog
} from 'c/kanbanStore';
import {
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync
} from 'c/kanbanStore';
import { addCardsToSprintAsync } from 'c/kanbanStore';

export default class KanbanBacklogView extends LightningElement {
    @api store;

    @track searchTerm = '';
    @track filterPriority = 'all';
    @track filterCardType = 'all';
    @track viewMode = 'all'; // 'all' | 'refinement'
    @track sortBy = 'priority';
    @track showCreateForm = false;
    @track _storeState = null;

    // Inline create form fields
    @track newCardSubject = '';
    @track newCardPriority = '';
    @track newCardType = '';
    @track newCardStoryPoints = null;

    // Inline edit state
    @track editingCell = null; // { cardId, field }

    // Drag state
    @track draggedCardId = null;
    @track dragOverIndex = null;

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

    // ===================================================================
    // Computed Properties
    // ===================================================================

    get backlogCards() {
        if (!this._storeState) return [];
        let cards =
            this.viewMode === 'refinement'
                ? selectors.getUnrefinedBacklogCards(this._storeState)
                : selectors.getBacklogCards(this._storeState);

        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            cards = cards.filter(
                (c) =>
                    (c.subject && c.subject.toLowerCase().includes(term)) ||
                    (c.Name && c.Name.toLowerCase().includes(term)) ||
                    (c.cardType && c.cardType.toLowerCase().includes(term))
            );
        }

        // Priority filter
        if (this.filterPriority !== 'all') {
            cards = cards.filter((c) => c.priority === this.filterPriority);
        }

        // Card type filter
        if (this.filterCardType !== 'all') {
            cards = cards.filter((c) => c.cardType === this.filterCardType);
        }

        // Enrich cards with selection state and UI helpers
        return cards.map((card, index) => ({
            ...card,
            __index: index,
            isSelected: this.selectedCards.includes(card.Id),
            refinementIcon: card.needsRefinement
                ? 'utility:check'
                : 'utility:add',
            refinementClass: card.needsRefinement
                ? 'refinement-active'
                : 'refinement-inactive',
            priorityBadgeClass: `slds-badge priority-${(card.priority || 'none').toLowerCase()}`
        }));
    }

    get hasCards() {
        return this.backlogCards.length > 0;
    }

    get showEmptyState() {
        return !this.hasCards && !this.showCreateForm;
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

    get isSprintBoard() {
        if (!this._storeState) return false;
        return selectors.isSprintBoard(this._storeState);
    }

    get boardId() {
        if (!this._storeState) return null;
        return selectors.getBoardId(this._storeState);
    }

    get totalStoryPoints() {
        return this.backlogCards.reduce(
            (sum, c) => sum + (c.storyPoints || 0),
            0
        );
    }

    get isAllSelected() {
        return this.hasCards && this.selectedCount === this.backlogCards.length;
    }

    get viewModeOptions() {
        return [
            { label: 'All', value: 'all' },
            { label: 'Needs Refinement', value: 'refinement' }
        ];
    }

    get priorityFilterOptions() {
        return [
            { label: 'All Priorities', value: 'all' },
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' }
        ];
    }

    get cardTypeFilterOptions() {
        return [
            { label: 'All Types', value: 'all' },
            { label: 'Story', value: 'Story' },
            { label: 'Bug', value: 'Bug' },
            { label: 'Task', value: 'Task' },
            { label: 'Epic', value: 'Epic' }
        ];
    }

    get priorityOptions() {
        return [
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' }
        ];
    }

    get addToSprintLabel() {
        return `Add to Sprint (${this.selectedCount})`;
    }

    // ===================================================================
    // Event Handlers - Toolbar
    // ===================================================================

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleViewModeChange(event) {
        this.viewMode = event.detail.value;
    }

    handlePriorityFilterChange(event) {
        this.filterPriority = event.detail.value;
    }

    handleCardTypeFilterChange(event) {
        this.filterCardType = event.detail.value;
    }

    handleToggleCreateForm() {
        this.showCreateForm = !this.showCreateForm;
        if (this.showCreateForm) {
            // Focus the input after render
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                const input = this.template.querySelector('.create-input');
                if (input) {
                    input.focus();
                }
            }, 0);
        } else {
            this.resetCreateForm();
        }
    }

    // ===================================================================
    // Event Handlers - Create Form
    // ===================================================================

    get isCreateDisabled() {
        return !this.newCardSubject;
    }

    handleNewSubjectChange(event) {
        this.newCardSubject = event.target.value;
    }

    handleCreateKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleCreateCard();
        } else if (event.key === 'Escape') {
            this.showCreateForm = false;
            this.resetCreateForm();
        }
    }

    async handleCreateCard() {
        if (!this.newCardSubject || !this.store || !this.boardId) return;

        try {
            await this.store.dispatch(
                createBacklogCardAsync(this.boardId, {
                    subject: this.newCardSubject
                })
            );
            // Clear input but keep form open for rapid entry
            this.newCardSubject = '';
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to create card' }
                })
            );
        }
    }

    handleCancelCreate() {
        this.showCreateForm = false;
        this.resetCreateForm();
    }

    resetCreateForm() {
        this.newCardSubject = '';
    }

    // ===================================================================
    // Event Handlers - Selection
    // ===================================================================

    handleSelectAll() {
        if (this.store) {
            if (this.isAllSelected) {
                this.store.dispatch(setSelectedBacklogCards([]));
            } else {
                const allIds = this.backlogCards.map((c) => c.Id);
                this.store.dispatch(setSelectedBacklogCards(allIds));
            }
        }
    }

    handleCardSelect(event) {
        const cardId = event.currentTarget.dataset.cardId;
        if (this.store) {
            this.store.dispatch(toggleBacklogCardSelection(cardId));
        }
    }

    handleDeselectAll() {
        if (this.store) {
            this.store.dispatch(setSelectedBacklogCards([]));
        }
    }

    // ===================================================================
    // Event Handlers - Bulk Actions
    // ===================================================================

    async handleBulkAddToSprint() {
        if (!this.store || !this.activeSprint || !this.hasSelectedCards) return;

        try {
            await this.store.dispatch(
                addCardsToSprintAsync(this.activeSprint.Id, this.selectedCards)
            );
            this.store.dispatch(setSelectedBacklogCards([]));
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to add cards to sprint' }
                })
            );
        }
    }

    async handleBulkDelete() {
        if (!this.store || !this.hasSelectedCards) return;

        try {
            await this.store.dispatch(
                deleteBacklogCardsAsync(this.selectedCards)
            );
            this.store.dispatch(setSelectedBacklogCards([]));
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to delete cards' }
                })
            );
        }
    }

    async handleBulkSetPriority(event) {
        const priority = event.detail.value;
        if (!this.store || !this.hasSelectedCards) return;

        try {
            const promises = this.selectedCards.map((cardId) =>
                this.store.dispatch(
                    updateBacklogCardAsync(cardId, { priority })
                )
            );
            await Promise.all(promises);
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to update priority' }
                })
            );
        }
    }

    // ===================================================================
    // Event Handlers - Card Actions
    // ===================================================================

    handleCardClick(event) {
        const cardId = event.currentTarget.dataset.cardId;
        this.dispatchEvent(
            new CustomEvent('cardclick', { detail: { cardId } })
        );
    }

    async handleRefinementToggle(event) {
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        if (!this.store) return;

        const card = this.backlogCards.find((c) => c.Id === cardId);
        if (card) {
            await this.store.dispatch(
                updateBacklogCardAsync(cardId, {
                    needsRefinement: !card.needsRefinement
                })
            );
        }
    }

    // ===================================================================
    // Event Handlers - Context Menu
    // ===================================================================

    handleContextMenu(event) {
        event.preventDefault();
        const cardId = event.currentTarget.dataset.cardId;
        const contextMenu = this.template.querySelector(
            'c-kanban-context-menu'
        );
        if (contextMenu) {
            this._contextMenuCardId = cardId;
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    get contextMenuItems() {
        const items = [
            {
                label: 'Move to Top',
                value: 'moveTop',
                icon: 'utility:arrowup'
            },
            {
                label: 'Move to Bottom',
                value: 'moveBottom',
                icon: 'utility:arrowdown'
            },
            {
                label: 'Set Priority',
                value: 'setPriority',
                icon: 'utility:priority',
                submenu: [
                    { label: 'High', value: 'High' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'Low', value: 'Low' }
                ]
            },
            {
                label: 'Toggle Refinement',
                value: 'toggleRefinement',
                icon: 'utility:checkin',
                dividerBefore: true
            },
            {
                label: 'Delete',
                value: 'delete',
                icon: 'utility:delete',
                dividerBefore: true
            }
        ];

        if (this.hasActiveSprint) {
            items.unshift({
                label: 'Move to Sprint',
                value: 'moveToSprint',
                icon: 'utility:forward'
            });
        }

        return items;
    }

    async handleContextMenuSelect(event) {
        const { value, subValue } = event.detail;
        const cardId = this._contextMenuCardId;
        if (!cardId || !this.store) return;

        switch (value) {
            case 'moveTop':
                this.store.dispatch(reorderBacklog(cardId, 0));
                break;
            case 'moveBottom':
                this.store.dispatch(
                    reorderBacklog(cardId, this.backlogCards.length - 1)
                );
                break;
            case 'setPriority':
                if (subValue) {
                    await this.store.dispatch(
                        updateBacklogCardAsync(cardId, { priority: subValue })
                    );
                }
                break;
            case 'toggleRefinement': {
                const card = this.backlogCards.find((c) => c.Id === cardId);
                if (card) {
                    await this.store.dispatch(
                        updateBacklogCardAsync(cardId, {
                            needsRefinement: !card.needsRefinement
                        })
                    );
                }
                break;
            }
            case 'moveToSprint':
                if (this.activeSprint) {
                    await this.store.dispatch(
                        addCardsToSprintAsync(this.activeSprint.Id, [cardId])
                    );
                }
                break;
            case 'delete':
                await this.store.dispatch(deleteBacklogCardsAsync([cardId]));
                break;
            default:
                break;
        }
    }

    // ===================================================================
    // Event Handlers - Drag Reorder
    // ===================================================================

    handleDragStart(event) {
        const cardId = event.currentTarget.dataset.cardId;
        this.draggedCardId = cardId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);

        // Use rAF so browser captures the element before we style it
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            event.target.classList.add('dragging');
        });
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (!this.draggedCardId || !this.store) return;

        const row = event.currentTarget;
        const targetIndex = Number(row.dataset.index);

        // Only reorder if position actually changed
        if (this.dragOverIndex !== targetIndex) {
            this.dragOverIndex = targetIndex;
            // Live reorder in store
            this.store.dispatch(reorderBacklog(this.draggedCardId, targetIndex));
        }
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        this.draggedCardId = null;
        this.dragOverIndex = null;
    }

    handleDrop(event) {
        event.preventDefault();
        // Reorder already applied live during dragOver - nothing else needed
        this.draggedCardId = null;
        this.dragOverIndex = null;
    }
}
