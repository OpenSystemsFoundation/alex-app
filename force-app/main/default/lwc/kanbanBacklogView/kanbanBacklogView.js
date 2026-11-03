import { LightningElement, api, track } from 'lwc';
import {
    selectors,
    setSelectedBacklogCards,
    toggleBacklogCardSelection,
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    moveCardsToSprintAsync,
    createSprintAsync,
    deleteSprintAsync,
    reorderSprintAsync,
    addCardsToBacklogSprintAsync,
    bulkMoveBacklogCardsAsync
} from 'c/kanbanStore';
import {
    applyStoreSubscription,
    removeStoreSubscription
} from 'c/storeSubscriptionMixin';
import BacklogContextMenuHandler from './handlers/contextMenuHandler';
import BacklogDragDropHandler from './handlers/dragDropHandler';

function getAssigneeName(card) {
    return card?.assignee?.name?.trim() || '';
}

function getAssigneeValue(card) {
    const assigneeId = card?.assigneeId || card?.assignee?.id;
    if (assigneeId) {
        return assigneeId;
    }

    const assigneeName = getAssigneeName(card);
    return assigneeName ? `name:${assigneeName}` : '';
}

function buildAssigneeOptions(cards) {
    const optionsByValue = new Map();

    (cards || []).forEach((card) => {
        const label = getAssigneeName(card);
        const value = getAssigneeValue(card);

        if (!label || !value || optionsByValue.has(value)) {
            return;
        }

        optionsByValue.set(value, { label, value });
    });

    return Array.from(optionsByValue.values()).sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
            sensitivity: 'base'
        })
    );
}

export default class KanbanBacklogView extends LightningElement {
    /** @type {import('c/kanbanStore').Store} The Redux-style store instance */
    @api store;
    /** @type {boolean} Whether to show debug information */
    @api showDebugInfo = false;

    @track searchTerm = '';
    @track filterPriority = 'All';
    @track filterCardType = 'All';
    @track filterEpic = 'All';
    @track filterAssignees = [];
    @track viewMode = 'all'; // 'all' | 'refinement'
    @track sortBy = 'priority';
    @track showCreateForm = false;
    @track showCreateSprintForm = false;
    @track _storeState = null;
    @track _collapsedSprints = {};
    @track _deleteSprintConfirmId = null;

    // Inline create form fields
    @track newCardSubject = '';
    @track newSprintGoal = '';

    // Inline edit state
    @track editingCell = null; // { cardId, field }

    // Drag state (non-tracked: UI updates via direct DOM manipulation during drag)
    draggedCardId = null;
    dragOverIndex = null;
    _dragTargetIndex = null; // Final drop target index (not tracked — no re-render)

    _contextMenuCardId = null;
    _contextMenuSprintId = null;

    _contextMenuHandler;
    _contextMenuItems = null;
    _dragDropHandler;

    connectedCallback() {
        this._contextMenuHandler = new BacklogContextMenuHandler(this);
        this._dragDropHandler = new BacklogDragDropHandler(this);
        applyStoreSubscription(this, this.store);
    }

    disconnectedCallback() {
        removeStoreSubscription(this);
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
        if (this.filterPriority !== 'All') {
            cards = cards.filter((c) => c.priority === this.filterPriority);
        }

        // Card type filter
        if (this.filterCardType !== 'All') {
            cards = cards.filter((c) => c.cardType === this.filterCardType);
        }

        // Epic filter
        if (this.filterEpic === '__none__') {
            cards = cards.filter((c) => !c.epicId && !c.epic?.id);
        } else if (this.filterEpic !== 'All') {
            cards = cards.filter(
                (c) =>
                    c.epicId === this.filterEpic ||
                    c.epic?.id === this.filterEpic
            );
        }

        if (this.filterAssignees.length > 0) {
            const assigneeFilter = new Set(this.filterAssignees);
            cards = cards.filter((card) => {
                const assigneeValue = getAssigneeValue(card);
                return assigneeValue && assigneeFilter.has(assigneeValue);
            });
        }

        // Enrich cards with selection state and UI helpers
        const selectedSet = new Set(this.selectedCards);
        return cards.map((card, index) => ({
            ...card,
            __index: index,
            isSelected: selectedSet.has(card.Id),
            recordUrl: `/lightning/r/OpenSF__Card__c/${card.Id}/view`,
            rowStyle: card.color ? `border-left: 3px solid ${card.color}` : '',
            refinementIcon: card.needsRefinement
                ? 'utility:search'
                : 'utility:dash',
            refinementClass: card.needsRefinement
                ? 'refinement-active'
                : 'refinement-inactive',
            priorityBadgeClass: `slds-badge priority-${(card.priority || 'none').toLowerCase()}`
        }));
    }

    get planningSprints() {
        if (!this._storeState) return [];
        return selectors.getPlanningSprints(this._storeState);
    }

    get hasPlanningSprints() {
        return this.planningSprints.length > 0;
    }

    _getSprintCardMap() {
        if (!this._storeState) return new Map();
        const psc = selectors.getPlanningSprintCards(this._storeState);
        const map = new Map();
        for (const sc of psc) {
            if (!map.has(sc.sprintId)) {
                map.set(sc.sprintId, new Set());
            }
            map.get(sc.sprintId).add(sc.cardId);
        }
        return map;
    }

    _getSprintCardIds(sprintId) {
        if (!this._storeState) return new Set();
        const psc = selectors.getPlanningSprintCards(this._storeState);
        return new Set(
            psc.filter((sc) => sc.sprintId === sprintId).map((sc) => sc.cardId)
        );
    }

    get backlogSections() {
        const allCards = this.backlogCards;
        const sections = [];
        const sprintCardMap = this._getSprintCardMap();
        const cardsInSprints = new Set();

        // Active sprint section (top — show cards from board columns)
        const active = this.activeSprint;
        if (active) {
            const sprintCards =
                selectors.getSprintCards(this._storeState) || [];
            const isCollapsed = !!this._collapsedSprints[active.Id];

            // Build card list from board columns for display
            const activeCards = [];
            if (!isCollapsed) {
                const columns = this._storeState?.columns || [];
                const activeSprintCardMap = new Map();
                for (const sc of sprintCards) {
                    activeSprintCardMap.set(sc.cardId, sc);
                }
                for (const col of columns) {
                    for (const card of col.cards || []) {
                        const sc = activeSprintCardMap.get(card.Id);
                        if (!sc) continue; // skip cards not in this sprint
                        activeCards.push({
                            ...card,
                            __sectionIndex: activeCards.length,
                            __sprintId: active.Id,
                            columnName:
                                col.columnHeader || col.Name || col.name,
                            statusLabel:
                                col.columnHeader || col.Name || col.name,
                            statusBadgeClass:
                                'status-badge status-badge--active',
                            completedInSprint: sc?.completedInSprint || false,
                            recordUrl: `/lightning/r/OpenSF__Card__c/${card.Id}/view`,
                            priorityBadgeClass: `slds-badge priority-${(card.priority || 'none').toLowerCase()}`
                        });
                    }
                }
            }

            sections.push({
                key: active.Id,
                isSprintSection: true,
                isActiveSprintSection: true,
                isPlanningSprintSection: false,
                sprintId: active.Id,
                sprintLabel:
                    active.Name || `Sprint ${active.sprintNumber || ''}`,
                status: 'Active',
                goal: active.goal || '',
                hasGoal: !!active.goal,
                cardCount: sprintCards.length,
                totalPoints: active.totalStoryPoints || 0,
                completedPoints: active.completedStoryPoints || 0,
                isExpanded: !isCollapsed,
                isCollapsed,
                chevronIcon: isCollapsed
                    ? 'utility:chevronright'
                    : 'utility:chevrondown',
                cards: activeCards
            });
        }

        // Planning sprint sections
        for (const sprint of this.planningSprints) {
            const sprintCardIds = sprintCardMap.get(sprint.Id) || new Set();
            const sprintCards = allCards.filter((c) => sprintCardIds.has(c.Id));
            sprintCards.forEach((c) => cardsInSprints.add(c.Id));

            const isCollapsed = !!this._collapsedSprints[sprint.Id];
            sections.push({
                key: sprint.Id,
                isSprintSection: true,
                isActiveSprintSection: false,
                isPlanningSprintSection: true,
                canStartSprint: !this.hasActiveSprint,
                sprintId: sprint.Id,
                sprintLabel:
                    sprint.Name || `Sprint ${sprint.sprintNumber || ''}`,
                status: 'Planning',
                goal: sprint.goal || '',
                hasGoal: !!sprint.goal,
                cardCount: sprintCards.length,
                totalPoints: sprintCards.reduce(
                    (s, c) => s + (c.storyPoints || 0),
                    0
                ),
                isConfirmingDelete: this._deleteSprintConfirmId === sprint.Id,
                isExpanded: !isCollapsed,
                isCollapsed,
                chevronIcon: isCollapsed
                    ? 'utility:chevronright'
                    : 'utility:chevrondown',
                cards: isCollapsed
                    ? []
                    : sprintCards.map((card, idx) => ({
                          ...card,
                          __sectionIndex: idx,
                          __sprintId: sprint.Id,
                          statusLabel: 'Backlog',
                          statusBadgeClass: 'status-badge'
                      }))
            });
        }

        // Ungrouped section (below sprints)
        const ungroupedCards = allCards.filter(
            (c) => !cardsInSprints.has(c.Id)
        );
        const isBacklogCollapsed = !!this._collapsedSprints.ungrouped;
        sections.push({
            key: 'ungrouped',
            isSprintSection: false,
            isBacklogSection: true,
            isActiveSprintSection: false,
            isPlanningSprintSection: false,
            isExpanded: !isBacklogCollapsed,
            isCollapsed: isBacklogCollapsed,
            chevronIcon: isBacklogCollapsed
                ? 'utility:chevronright'
                : 'utility:chevrondown',
            cardCount: ungroupedCards.length,
            totalPoints: ungroupedCards.reduce(
                (s, c) => s + (c.storyPoints || 0),
                0
            ),
            cards: isBacklogCollapsed
                ? []
                : ungroupedCards.map((card, idx) => ({
                      ...card,
                      __sectionIndex: idx,
                      __sprintId: null,
                      statusLabel: 'Backlog',
                      statusBadgeClass: 'status-badge'
                  }))
        });

        return sections;
    }

    get hasCards() {
        return this.backlogCards.length > 0;
    }

    get hasContent() {
        return this.hasCards || this.hasPlanningSprints;
    }

    get showEmptyState() {
        return !this.hasContent && !this.showCreateForm;
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
            { label: 'All Priorities', value: 'All' },
            { label: 'Blocking', value: 'Blocking' },
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' },
            { label: 'Trivial', value: 'Trivial' }
        ];
    }

    get cardTypeFilterOptions() {
        return [
            { label: 'All Types', value: 'All' },
            { label: 'Story', value: 'Story' },
            { label: 'Bug', value: 'Bug' },
            { label: 'Task', value: 'Task' },
            { label: 'Epic', value: 'Epic' }
        ];
    }

    get epicFilterOptions() {
        const summaries = this._storeState?.epicSummaries || [];
        if (summaries.length === 0) {
            return [{ label: 'All Epics', value: 'All' }];
        }
        return [
            { label: 'All Epics', value: 'All' },
            ...summaries.map((e) => ({
                label: e.subject || 'Untitled Epic',
                value: e.id
            })),
            { label: 'No Epic', value: '__none__' }
        ];
    }

    get hasEpics() {
        const summaries = this._storeState?.epicSummaries;
        return summaries != null && summaries.length > 0;
    }

    get assigneeFilterOptions() {
        if (!this._storeState) {
            return [];
        }

        const cards =
            this.viewMode === 'refinement'
                ? selectors.getUnrefinedBacklogCards(this._storeState)
                : selectors.getBacklogCards(this._storeState);

        return buildAssigneeOptions(cards);
    }

    get hasAssigneeOptions() {
        return this.assigneeFilterOptions.length > 0;
    }

    get priorityOptions() {
        return [
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' }
        ];
    }

    get isBacklogSaving() {
        if (!this._storeState) return false;
        return selectors.isBacklogSyncing(this._storeState);
    }

    get addToSprintLabel() {
        return `Add to Sprint (${this.selectedCount})`;
    }

    get backlogInfoText() {
        if (this.hasActiveFilters) {
            return `${this.backlogCards.length} of ${this.cardCount} cards | ${this.totalStoryPoints} pts`;
        }
        return `${this.cardCount} cards | ${this.totalStoryPoints} pts`;
    }

    get hasBacklogInfoText() {
        return !this.isBacklogSaving;
    }

    get hasActiveFilters() {
        return !!(
            this.searchTerm.trim() ||
            this.viewMode !== 'all' ||
            this.filterPriority !== 'All' ||
            this.filterCardType !== 'All' ||
            this.filterEpic !== 'All' ||
            this.filterAssignees.length > 0
        );
    }

    // ===================================================================
    // Event Handlers - Toolbar
    // ===================================================================

    handleSearchChange(event) {
        this.searchTerm = this.extractEventValue(event);
        this._clearSelectionOnFilterChange();
    }

    handleViewModeChange(event) {
        this.viewMode = this.extractEventValue(event);
        this._clearSelectionOnFilterChange();
    }

    handlePriorityFilterChange(event) {
        this.filterPriority = this.extractEventValue(event);
        this._clearSelectionOnFilterChange();
    }

    handleCardTypeFilterChange(event) {
        this.filterCardType = this.extractEventValue(event);
        this._clearSelectionOnFilterChange();
    }

    handleEpicFilterChange(event) {
        this.filterEpic = this.extractEventValue(event);
        this._clearSelectionOnFilterChange();
    }

    handleAssigneeFilterChange(event) {
        const values = event.detail?.value;
        this.filterAssignees = Array.isArray(values) ? [...values] : [];
        this._clearSelectionOnFilterChange();
    }

    handleClearFilters() {
        this.searchTerm = '';
        this.viewMode = 'all';
        this.filterPriority = 'All';
        this.filterCardType = 'All';
        this.filterEpic = 'All';
        this.filterAssignees = [];
        this._clearSelectionOnFilterChange();
    }

    extractEventValue(event) {
        return event.detail?.value ?? event.target?.value ?? '';
    }

    _clearSelectionOnFilterChange() {
        if (this.hasSelectedCards && this.store) {
            this.store.dispatch(setSelectedBacklogCards([]));
        }
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
    // Event Handlers - Create Card Form
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
    // Event Handlers - Create Sprint Form
    // ===================================================================

    handleToggleCreateSprintForm() {
        this.showCreateSprintForm = !this.showCreateSprintForm;
        if (this.showCreateSprintForm) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                const input = this.template.querySelector(
                    '.create-sprint-input'
                );
                if (input) {
                    input.focus();
                }
            }, 0);
        } else {
            this.newSprintGoal = '';
        }
    }

    handleNewSprintGoalChange(event) {
        this.newSprintGoal = event.target.value;
    }

    handleCreateSprintKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleCreateSprint();
        } else if (event.key === 'Escape') {
            this.showCreateSprintForm = false;
            this.newSprintGoal = '';
        }
    }

    async handleCreateSprint() {
        if (!this.store || !this.boardId) return;

        try {
            await this.store.dispatch(
                createSprintAsync(
                    this.boardId,
                    this.newSprintGoal || null,
                    null,
                    null
                )
            );
            this.newSprintGoal = '';
            this.showCreateSprintForm = false;
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to create sprint' }
                })
            );
        }
    }

    handleCancelCreateSprint() {
        this.showCreateSprintForm = false;
        this.newSprintGoal = '';
    }

    // ===================================================================
    // Event Handlers - Sprint Actions (from section headers)
    // ===================================================================

    handleStartSprint(event) {
        event.stopPropagation();
        const sprintId = event.currentTarget.dataset.sprintId;
        const sprint = this.planningSprints.find((s) => s.Id === sprintId);
        // bubbles:true is sufficient — the parent kanbanBoard LWC is
        // in the same shadow tree. composed:true is avoided to prevent
        // events leaking outside the component (AppExchange rule
        // AvoidLwcBubblesComposedTrue).
        this.dispatchEvent(
            new CustomEvent('startsprint', {
                bubbles: true,
                detail: { sprint }
            })
        );
    }

    async handleDeleteSprint(event) {
        event.stopPropagation();
        const sprintId = event.currentTarget.dataset.sprintId;
        this._deleteSprintConfirmId = sprintId;
    }

    async handleConfirmDeleteSprint(event) {
        event.stopPropagation();
        const sprintId = this._deleteSprintConfirmId;
        this._deleteSprintConfirmId = null;
        if (!sprintId) return;
        try {
            await this.store.dispatch(deleteSprintAsync(sprintId));
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to delete sprint' }
                })
            );
        }
    }

    handleCancelDeleteSprint(event) {
        event.stopPropagation();
        this._deleteSprintConfirmId = null;
    }

    handleCompleteActiveSprint(event) {
        event.stopPropagation();
        this.dispatchEvent(
            new CustomEvent('completesprint', {
                bubbles: true
            })
        );
    }

    handleSprintActionClick(event) {
        // Prevent button clicks in action area from toggling sprint collapse
        event.stopPropagation();
    }

    // ===================================================================
    // Event Handlers - Sprint Sections
    // ===================================================================

    handleSprintHeaderClick(event) {
        const sprintId = event.currentTarget.dataset.sprintId;
        if (sprintId) {
            this._collapsedSprints = {
                ...this._collapsedSprints,
                [sprintId]: !this._collapsedSprints[sprintId]
            };
        }
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
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        if (!this.store || !cardId) return;

        const nativeEvent = event.detail?.nativeEvent || event;
        const shiftKey = nativeEvent.shiftKey;

        if (shiftKey && this._lastSelectedCardId) {
            // Shift+click: range select
            const allCards = this.backlogCards;
            const lastIdx = allCards.findIndex(
                (c) => c.Id === this._lastSelectedCardId
            );
            const curIdx = allCards.findIndex((c) => c.Id === cardId);
            if (lastIdx >= 0 && curIdx >= 0) {
                const start = Math.min(lastIdx, curIdx);
                const end = Math.max(lastIdx, curIdx);
                const rangeIds = allCards
                    .slice(start, end + 1)
                    .map((c) => c.Id);
                // Merge with existing selection
                const existing = new Set(this.selectedCards);
                for (const id of rangeIds) {
                    existing.add(id);
                }
                this.store.dispatch(setSelectedBacklogCards([...existing]));
            }
        } else {
            // Normal click: toggle individual
            this.store.dispatch(toggleBacklogCardSelection(cardId));
            this._lastSelectedCardId = cardId;
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
                moveCardsToSprintAsync(this.activeSprint.Id, this.selectedCards)
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

    get bulkSprintOptions() {
        return this.planningSprints.map((s) => ({
            label: s.Name || `Sprint ${s.sprintNumber || ''}`,
            value: s.Id
        }));
    }

    get hasBulkSprintOptions() {
        return this.planningSprints.length > 0;
    }

    async handleBulkMoveToSprint(event) {
        const sprintId = event.detail.value;
        if (!this.store || !this.hasSelectedCards || !sprintId) return;

        try {
            await this.store.dispatch(
                addCardsToBacklogSprintAsync(sprintId, this.selectedCards)
            );
            this.store.dispatch(setSelectedBacklogCards([]));
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to move cards to sprint' }
                })
            );
        }
    }

    async handleBulkMoveTop() {
        if (!this.store || !this.hasSelectedCards) return;
        try {
            await this.store.dispatch(
                bulkMoveBacklogCardsAsync(this.selectedCards, 'top')
            );
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to move cards' }
                })
            );
        }
    }

    async handleBulkMoveBottom() {
        if (!this.store || !this.hasSelectedCards) return;
        try {
            await this.store.dispatch(
                bulkMoveBacklogCardsAsync(this.selectedCards, 'bottom')
            );
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to move cards' }
                })
            );
        }
    }

    // ===================================================================
    // Event Handlers - Card Actions
    // ===================================================================

    handleCardClick(event) {
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        this.dispatchEvent(
            new CustomEvent('cardclick', { detail: { cardId } })
        );
    }

    handleCardNameClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        this.dispatchEvent(
            new CustomEvent('navigatetocard', { detail: { cardId } })
        );
    }

    handleCardNameMiddleClick(event) {
        // Middle click (button === 1) — let the browser open href in new tab
        if (event.button === 1) {
            event.stopPropagation();
            // Don't prevent default — browser will open the href in new tab
        }
    }

    handleRowClick(event) {
        // Don't open panel if clicking on checkbox, drag handle, refinement toggle, or link
        const target = event.target;
        const tag = target.tagName?.toLowerCase();
        if (
            tag === 'input' ||
            tag === 'a' ||
            tag === 'button' ||
            target.closest('lightning-input') ||
            target.closest('.backlog-cell--drag') ||
            target.closest('.backlog-cell--checkbox') ||
            target.closest('.refinement-toggle')
        ) {
            return;
        }

        const cardId = event.currentTarget.dataset.cardId;
        if (!cardId) return;

        // Ctrl+click or Meta+click: toggle selection
        if (event.ctrlKey || event.metaKey) {
            if (this.store) {
                this.store.dispatch(toggleBacklogCardSelection(cardId));
                this._lastSelectedCardId = cardId;
            }
            return;
        }

        // Shift+click: range select
        if (event.shiftKey && this._lastSelectedCardId && this.store) {
            const allCards = this.backlogCards;
            const lastIdx = allCards.findIndex(
                (c) => c.Id === this._lastSelectedCardId
            );
            const curIdx = allCards.findIndex((c) => c.Id === cardId);
            if (lastIdx >= 0 && curIdx >= 0) {
                const start = Math.min(lastIdx, curIdx);
                const end = Math.max(lastIdx, curIdx);
                const rangeIds = allCards
                    .slice(start, end + 1)
                    .map((c) => c.Id);
                const existing = new Set(this.selectedCards);
                for (const id of rangeIds) {
                    existing.add(id);
                }
                this.store.dispatch(setSelectedBacklogCards([...existing]));
            }
            return;
        }

        // Clear selection when opening a card via normal click
        if (this.hasSelectedCards && this.store) {
            this.store.dispatch(setSelectedBacklogCards([]));
        }

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
    // Event Handlers - Context Menu (delegated to BacklogContextMenuHandler)
    // ===================================================================

    handleContextMenu(event) {
        this._contextMenuHandler.handleContextMenu(event);
    }

    get contextMenuItems() {
        // Items of the menu that was opened last (card row or sprint
        // header); the menu-items binding must not overwrite them on render
        return (
            this._contextMenuItems ||
            this._contextMenuHandler.buildMenuItems(null, null)
        );
    }

    handleContextMenuSelect(event) {
        const { value } = event.detail;
        if (value === 'sprintMoveUp') {
            this._handleSprintReorder('up');
            return;
        }
        if (value === 'sprintMoveDown') {
            this._handleSprintReorder('down');
            return;
        }
        this._contextMenuHandler.handleSelect(event);
    }

    // ===================================================================
    // Event Handlers - Sprint Context Menu (right-click on sprint headers)
    // ===================================================================

    handleSprintContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        const sprintId = event.currentTarget.dataset.sprintId;
        if (!sprintId) return;

        // Ignore right-clicks on active sprint headers
        const active = this.activeSprint;
        if (active && active.Id === sprintId) return;

        this._contextMenuSprintTarget = sprintId;

        const sections = this.backlogSections.filter((s) => s.isSprintSection);
        const idx = sections.findIndex((s) => s.sprintId === sprintId);
        const isFirst = idx === 0;
        const isLast = idx === sections.length - 1;

        const items = [];
        if (!isFirst) {
            items.push({
                label: 'Move Up',
                value: 'sprintMoveUp',
                icon: 'utility:arrowup'
            });
        }
        if (!isLast) {
            items.push({
                label: 'Move Down',
                value: 'sprintMoveDown',
                icon: 'utility:arrowdown'
            });
        }

        if (items.length === 0) return;

        this._contextMenuItems = items;
        const contextMenu = this.template.querySelector(
            'c-kanban-context-menu'
        );
        if (contextMenu) {
            contextMenu.menuItems = items;
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    async _handleSprintReorder(direction) {
        const sprintId = this._contextMenuSprintTarget;
        if (!sprintId || !this.store) return;
        try {
            await this.store.dispatch(reorderSprintAsync(sprintId, direction));
        } catch (err) {
            console.error('Sprint reorder failed:', err);
        }
    }

    // ===================================================================
    // Event Handlers - Drag Reorder (delegated to BacklogDragDropHandler)
    // ===================================================================

    handleDragStart(event) {
        this._dragDropHandler.handleDragStart(event);
    }

    handleDragOver(event) {
        this._dragDropHandler.handleDragOver(event);
    }

    handleDragEnd(event) {
        this._dragDropHandler.handleDragEnd(event);
    }

    handleSectionHeaderDragOver(event) {
        this._dragDropHandler.handleSectionHeaderDragOver(event);
    }

    handleSectionHeaderDragLeave(event) {
        this._dragDropHandler.handleSectionHeaderDragLeave(event);
    }

    handleSectionHeaderDrop(event) {
        this._dragDropHandler.handleSectionHeaderDrop(event);
    }

    handleDrop(event) {
        this._dragDropHandler.handleDrop(event);
    }
}
