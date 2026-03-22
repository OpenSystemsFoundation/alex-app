import { LightningElement, api, track } from 'lwc';
import {
    selectors,
    setSelectedBacklogCards,
    toggleBacklogCardSelection,
    createBacklogCardAsync,
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    reorderBacklogCardAsync,
    moveCardsToSprintAsync,
    moveCardAsync,
    createSprintAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync
} from 'c/kanbanStore';

export default class KanbanBacklogView extends LightningElement {
    /** @type {import('c/kanbanStore').Store} The Redux-style store instance */
    @api store;
    /** @type {boolean} Whether to show debug information */
    @api showDebugInfo = false;

    @track searchTerm = '';
    @track filterPriority = 'all';
    @track filterCardType = 'all';
    @track viewMode = 'all'; // 'all' | 'refinement'
    @track sortBy = 'priority';
    @track showCreateForm = false;
    @track showCreateSprintForm = false;
    @track _storeState = null;
    @track _collapsedSprints = {};

    // Inline create form fields
    @track newCardSubject = '';
    @track newSprintGoal = '';

    // Inline edit state
    @track editingCell = null; // { cardId, field }

    // Drag state (non-tracked: UI updates via direct DOM manipulation during drag)
    draggedCardId = null;
    dragOverIndex = null;
    _dragTargetIndex = null; // Final drop target index (not tracked — no re-render)

    _storeUnsubscribe = null;
    _contextMenuCardId = null;
    _contextMenuSprintId = null;

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

        // Sprint sections (at top)
        for (const sprint of this.planningSprints) {
            const sprintCardIds = sprintCardMap.get(sprint.Id) || new Set();
            const sprintCards = allCards.filter((c) => sprintCardIds.has(c.Id));
            sprintCards.forEach((c) => cardsInSprints.add(c.Id));

            const isCollapsed = !!this._collapsedSprints[sprint.Id];
            sections.push({
                key: sprint.Id,
                isSprintSection: true,
                sprintId: sprint.Id,
                sprintLabel:
                    sprint.Name || `Sprint ${sprint.sprintNumber || ''}`,
                goal: sprint.goal || '',
                hasGoal: !!sprint.goal,
                cardCount: sprintCards.length,
                totalPoints: sprintCards.reduce(
                    (s, c) => s + (c.storyPoints || 0),
                    0
                ),
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
                          __sprintId: sprint.Id
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
                      __sprintId: null
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

    get isBacklogSaving() {
        if (!this._storeState) return false;
        return selectors.isBacklogSyncing(this._storeState);
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
        if (cardId) {
            this.dispatchEvent(
                new CustomEvent('cardclick', { detail: { cardId } })
            );
        }
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
        const rawSprintId = event.currentTarget.dataset.sprintId;
        const sprintId =
            rawSprintId && rawSprintId !== 'null' ? rawSprintId : null;
        this._contextMenuCardId = cardId;
        this._contextMenuSprintId = sprintId;

        const contextMenu = this.template.querySelector(
            'c-kanban-context-menu'
        );
        if (contextMenu) {
            contextMenu.menuItems = this._buildContextMenuItems(
                cardId,
                sprintId
            );
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    _buildContextMenuItems(_cardId, cardSprintId) {
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
            }
        ];

        // Build "Move to Sprint" submenu with all available sprints
        const sprintSubmenu = [];
        for (const sprint of this.planningSprints) {
            if (sprint.Id === cardSprintId) continue;
            sprintSubmenu.push({
                label: sprint.Name || `Sprint ${sprint.sprintNumber || ''}`,
                value: sprint.Id
            });
        }
        if (this.activeSprint) {
            sprintSubmenu.push({
                label: `${this.activeSprint.Name || 'Active Sprint'} (Board)`,
                value: `active:${this.activeSprint.Id}`,
                dividerBefore: sprintSubmenu.length > 0
            });
        }
        if (sprintSubmenu.length > 0) {
            items.push({
                label: 'Move to Sprint',
                value: 'moveToSprint',
                icon: 'utility:forward',
                submenu: sprintSubmenu
            });
        }

        // Build "Move to Column" submenu (moves card to active sprint + column)
        if (this.activeSprint) {
            const cols = this._storeState?.columns || [];
            const columnSubmenu = [];
            for (const col of cols) {
                columnSubmenu.push({
                    label: col.columnHeader || col.Name || col.name,
                    value: col.Id
                });
            }
            if (columnSubmenu.length > 0) {
                items.push({
                    label: 'Move to Column',
                    value: 'moveToColumn',
                    icon: 'utility:right',
                    submenu: columnSubmenu
                });
            }
        }

        // Remove from sprint (only if card is in a planning sprint)
        if (cardSprintId) {
            items.push({
                label: 'Remove from Sprint',
                value: 'removeFromSprint',
                icon: 'utility:back'
            });
        }

        items.push(
            {
                label: 'Set Priority',
                value: 'setPriority',
                icon: 'utility:priority',
                dividerBefore: true,
                submenu: [
                    { label: 'High', value: 'High' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'Low', value: 'Low' }
                ]
            },
            {
                label: 'Toggle Refinement',
                value: 'toggleRefinement',
                icon: 'utility:search'
            },
            {
                label: 'Delete',
                value: 'delete',
                icon: 'utility:delete',
                dividerBefore: true
            }
        );

        return items;
    }

    get contextMenuItems() {
        return this._buildContextMenuItems(null, null);
    }

    async handleContextMenuSelect(event) {
        const { value, subValue } = event.detail;
        const cardId = this._contextMenuCardId;
        const sprintId = this._contextMenuSprintId;
        if (!cardId || !this.store) return;

        switch (value) {
            case 'moveTop': {
                const topIdx = this._getMoveTopIndex(sprintId);
                await this.store.dispatch(
                    reorderBacklogCardAsync(cardId, topIdx)
                );
                break;
            }
            case 'moveBottom': {
                const bottomIdx = this._getMoveBottomIndex(sprintId);
                await this.store.dispatch(
                    reorderBacklogCardAsync(cardId, bottomIdx)
                );
                break;
            }
            case 'moveToSprint':
                if (subValue) {
                    await this._handleMoveToSprint(cardId, sprintId, subValue);
                }
                break;
            case 'moveToColumn':
                if (subValue && this.activeSprint) {
                    await this._handleMoveToColumn(cardId, sprintId, subValue);
                }
                break;
            case 'removeFromSprint':
                if (sprintId) {
                    await this.store.dispatch(
                        removeCardFromBacklogSprintAsync(sprintId, cardId)
                    );
                }
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
            case 'delete':
                await this.store.dispatch(deleteBacklogCardsAsync([cardId]));
                break;
            default:
                break;
        }
    }

    async _handleMoveToSprint(cardId, currentSprintId, targetValue) {
        // Remove from current planning sprint if applicable
        if (currentSprintId) {
            await this.store.dispatch(
                removeCardFromBacklogSprintAsync(currentSprintId, cardId)
            );
        }

        if (targetValue.startsWith('active:')) {
            // Move to active sprint (puts card on the board)
            const activeSprintId = targetValue.replace('active:', '');
            await this.store.dispatch(
                moveCardsToSprintAsync(activeSprintId, [cardId])
            );
        } else {
            // Move to a planning sprint (stays in backlog)
            await this.store.dispatch(
                addCardsToBacklogSprintAsync(targetValue, [cardId])
            );
        }
    }

    async _handleMoveToColumn(cardId, currentSprintId, targetColumnId) {
        // Remove from current planning sprint if applicable
        if (currentSprintId) {
            await this.store.dispatch(
                removeCardFromBacklogSprintAsync(currentSprintId, cardId)
            );
        }

        // Move card to the active sprint (this puts it on the board in the first column)
        await this.store.dispatch(
            moveCardsToSprintAsync(this.activeSprint.Id, [cardId])
        );

        // Now move it to the target column
        await this.store.dispatch(moveCardAsync(cardId, targetColumnId, 0));
    }

    _getMoveTopIndex(sprintId) {
        if (!sprintId) return 0;
        const state = this.store.getState();
        const allCards = state.backlogCards || [];
        const sprintCardIds = this._getSprintCardIds(sprintId);
        for (let i = 0; i < allCards.length; i++) {
            if (sprintCardIds.has(allCards[i].Id)) return i;
        }
        return 0;
    }

    _getMoveBottomIndex(sprintId) {
        const state = this.store.getState();
        const allCards = state.backlogCards || [];
        if (!sprintId) return allCards.length - 1;
        const sprintCardIds = this._getSprintCardIds(sprintId);
        let lastIndex = -1;
        for (let i = 0; i < allCards.length; i++) {
            if (sprintCardIds.has(allCards[i].Id)) lastIndex = i;
        }
        return lastIndex >= 0 ? lastIndex : allCards.length - 1;
    }

    // ===================================================================
    // Event Handlers - Drag Reorder
    // ===================================================================

    _dragSourceSprintId = null;

    handleDragStart(event) {
        const cardId = event.currentTarget.dataset.cardId;
        const rawSprintId = event.currentTarget.dataset.sprintId;
        this.draggedCardId = cardId;
        this._dragSourceSprintId =
            rawSprintId && rawSprintId !== 'null' ? rawSprintId : null;
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

        if (!this.draggedCardId) return;

        const row = event.currentTarget;
        const targetIndex = Number(row.dataset.index);

        // Determine if cursor is in top or bottom half of row
        const rect = row.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertAfter = event.clientY > midpoint;
        const effectiveIndex = insertAfter ? targetIndex + 1 : targetIndex;

        if (this.dragOverIndex === effectiveIndex) return;

        // Clear previous indicator
        this._clearDropIndicators();

        // Show drop indicator (CSS only — no state mutation during drag)
        if (insertAfter) {
            row.classList.add('drag-indicator-below');
        } else {
            row.classList.add('drag-indicator-above');
        }
        this._lastHighlightedRow = row;

        this.dragOverIndex = effectiveIndex;
        this._dragTargetIndex = effectiveIndex;
    }

    _lastHighlightedRow = null;

    _clearDropIndicators() {
        if (this._lastHighlightedRow) {
            this._lastHighlightedRow.classList.remove(
                'drag-indicator-above',
                'drag-indicator-below'
            );
            this._lastHighlightedRow = null;
        }
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();
        // If drop didn't fire (e.g. dropped outside), reset drag state
        if (this.draggedCardId) {
            this.draggedCardId = null;
            this.dragOverIndex = null;
            this._dragTargetIndex = null;
            this._dragSourceSprintId = null;
        }
    }

    // --- Section header drop zone handlers ---

    handleSectionHeaderDragOver(event) {
        if (!this.draggedCardId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-indicator-header');
    }

    handleSectionHeaderDragLeave(event) {
        event.currentTarget.classList.remove('drag-indicator-header');
    }

    _clearHeaderDropIndicators() {
        const headers = this.template.querySelectorAll('.sprint-header-row');
        headers.forEach((h) => h.classList.remove('drag-indicator-header'));
    }

    async handleSectionHeaderDrop(event) {
        event.preventDefault();
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();

        const cardId = this.draggedCardId;
        const sourceSprintId = this._dragSourceSprintId;
        this.draggedCardId = null;
        this.dragOverIndex = null;
        this._dragTargetIndex = null;
        this._dragSourceSprintId = null;

        if (!cardId || !this.store) return;

        const rawTargetId = event.currentTarget.dataset.sprintId;
        const targetSprintId =
            rawTargetId && rawTargetId !== 'ungrouped' ? rawTargetId : null;

        // No-op if same section
        if (sourceSprintId === targetSprintId) return;

        try {
            await this._moveCardBetweenSections(
                cardId,
                sourceSprintId,
                targetSprintId
            );
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to move card' }
                })
            );
        }
    }

    // --- Card row drop handler (with cross-section support) ---

    async handleDrop(event) {
        event.preventDefault();
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();

        const cardId = this.draggedCardId;
        const targetIndex = this._dragTargetIndex;
        const sourceSprintId = this._dragSourceSprintId;
        this.draggedCardId = null;
        this.dragOverIndex = null;
        this._dragTargetIndex = null;
        this._dragSourceSprintId = null;

        if (cardId == null || !this.store) return;

        // Detect target section from the drop target row
        const rawTargetSprintId = event.currentTarget.dataset.sprintId;
        const targetSprintId =
            rawTargetSprintId && rawTargetSprintId !== 'null'
                ? rawTargetSprintId
                : null;

        // Cross-section drop: move card between sprint/backlog sections
        if (sourceSprintId !== targetSprintId) {
            try {
                await this._moveCardBetweenSections(
                    cardId,
                    sourceSprintId,
                    targetSprintId
                );
            } catch (error) {
                this.dispatchEvent(
                    new CustomEvent('error', {
                        detail: { message: 'Failed to move card' }
                    })
                );
                return;
            }
            // Fall through to reorder the card to the drop position
        }

        if (targetIndex == null) return;

        // Compute the target index in the unfiltered backlog array.
        // _dragTargetIndex is based on the filtered/displayed list.
        // Convert to the unfiltered array index using the card at that position.
        const state = this.store.getState();
        const allCards = state.backlogCards || [];
        const oldIndex = allCards.findIndex((c) => c.Id === cardId);
        if (oldIndex === -1) return;

        // Find the anchor card from the drop target row
        const anchorCardId = event.currentTarget.dataset.cardId;
        let newIndex;
        if (anchorCardId) {
            newIndex = allCards.findIndex((c) => c.Id === anchorCardId);
            if (newIndex === -1) {
                newIndex = allCards.length - 1;
            } else if (newIndex > oldIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }
        } else if (targetIndex >= this.backlogCards.length) {
            newIndex = allCards.length - 1;
        } else {
            const anchorCard = this.backlogCards[targetIndex];
            newIndex = allCards.findIndex((c) => c.Id === anchorCard.Id);
            if (newIndex > oldIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }
        }

        // Reorder locally + persist to server in one dispatch
        try {
            await this.store.dispatch(
                reorderBacklogCardAsync(cardId, newIndex)
            );
        } catch (error) {
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to save card position' }
                })
            );
        }
    }

    async _moveCardBetweenSections(cardId, sourceSprintId, targetSprintId) {
        // Remove from source sprint if it was in one
        if (sourceSprintId) {
            await this.store.dispatch(
                removeCardFromBacklogSprintAsync(sourceSprintId, cardId)
            );
        }
        // Add to target sprint if dropping into one (not back to ungrouped)
        if (targetSprintId) {
            await this.store.dispatch(
                addCardsToBacklogSprintAsync(targetSprintId, [cardId])
            );
        }
    }
}
