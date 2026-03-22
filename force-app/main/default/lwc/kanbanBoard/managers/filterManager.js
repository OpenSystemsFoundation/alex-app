/**
 * @typedef {Object} FilterOption
 * @property {string} label - Display label
 * @property {string} value - Filter value
 */

/**
 * Manages filter/search logic for the Kanban board.
 * Reads and writes reactive state on the host component via this.component.
 */
export default class FilterManager {
    /** @type {number|null} */
    _searchDebounceTimer = null;

    /**
     * @param {import('../kanbanBoard').default} component - The host LWC component
     */
    constructor(component) {
        this.component = component;
    }

    // =========================================================================
    // Static option getters
    // =========================================================================

    /**
     * Priority filter dropdown options
     * @returns {FilterOption[]}
     */
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

    /**
     * Card type filter dropdown options
     * @returns {FilterOption[]}
     */
    get cardTypeFilterOptions() {
        return [
            { label: 'All Types', value: 'All' },
            { label: 'Story', value: 'Story' },
            { label: 'Bug', value: 'Bug' },
            { label: 'Task', value: 'Task' },
            { label: 'Epic', value: 'Epic' }
        ];
    }

    // =========================================================================
    // Computed getters
    // =========================================================================

    /**
     * Whether any filter is currently active (search, priority, card type, or hide-completed)
     * @returns {boolean}
     */
    get hasActiveFilters() {
        return !!(
            this.component._boardSearchTerm.trim() ||
            this.component._boardFilterPriority !== 'All' ||
            this.component._boardFilterCardType !== 'All' ||
            this.component._boardHideCompleted
        );
    }

    /**
     * Whether to show the "Hide Done" toggle (only for non-Sprint boards)
     * @returns {boolean}
     */
    get showHideDoneToggle() {
        return !this.component.isSprintBoard;
    }

    /**
     * CSS class for the hide-completed toggle button
     * @returns {string}
     */
    get hideCompletedClass() {
        return this.component._boardHideCompleted
            ? 'filter-toggle filter-toggle--active'
            : 'filter-toggle';
    }

    /**
     * Count of cards visible after filtering
     * @param {Array} filteredCols - The filtered columns array from getFilteredColumns()
     * @returns {number}
     */
    getFilteredCardCount(filteredCols) {
        return filteredCols.reduce((sum, col) => sum + (col.cardCount || 0), 0);
    }

    /**
     * Summary string showing "X of Y cards" when filters are active
     * @param {Array} filteredCols - The filtered columns array from getFilteredColumns()
     * @param {number} totalCount - Total card count across all unfiltered columns
     * @returns {string} e.g. "5 of 12 cards", or empty string if no filters active
     */
    getFilterSummary(filteredCols, totalCount) {
        if (!this.hasActiveFilters) return '';
        const filtered = this.getFilteredCardCount(filteredCols);
        return `${filtered} of ${totalCount} cards`;
    }

    // =========================================================================
    // Core filtering logic
    // =========================================================================

    /**
     * Returns columns enriched with mobile classes, WIP-limit indicators,
     * and cards filtered by search term, priority, card type, hide-completed,
     * and done-card retention policy.
     *
     * Reads the following from the component:
     * - columns (store-derived enriched columns)
     * - _boardSearchTerm, _boardFilterPriority, _boardFilterCardType, _boardHideCompleted
     * - _mobileActiveColumnIndex
     * - isSprintBoard, board?.doneCardRetentionDays
     *
     * @returns {Array} Enriched and filtered columns
     */
    getFilteredColumns() {
        const cols = this.component.columns;
        if (!cols || cols.length === 0) return [];

        const search = this.component._boardSearchTerm.toLowerCase().trim();
        const priority = this.component._boardFilterPriority;
        const cardType = this.component._boardFilterCardType;
        const hideCompleted = this.component._boardHideCompleted;
        const hasFilter =
            search || priority !== 'All' || cardType !== 'All' || hideCompleted;
        const activeIdx = this.component._mobileActiveColumnIndex;

        // Auto-expire done cards for non-Sprint boards based on retention days
        const isSprint = this.component.isSprintBoard;
        const retentionDays = this.component.board?.doneCardRetentionDays;
        const hasRetention =
            !isSprint && retentionDays != null && retentionDays >= 0;
        let retentionCutoff = null;
        if (hasRetention) {
            retentionCutoff = new Date();
            retentionCutoff.setDate(retentionCutoff.getDate() - retentionDays);
        }

        /**
         * Adds mobile visibility class and WIP limit indicators to a column
         * @param {Object} col - Column object
         * @param {number} idx - Column index
         * @returns {Object} Column with mobileColumnClass, isOverWipLimit, wipBadgeClass
         */
        const addMobileClass = (col, idx) => {
            const isActive = idx === activeIdx;
            const isOverWip = col.hasWipLimit && col.cardCount > col.wipLimit;
            const baseClass =
                'kanban-column slds-col slds-grid slds-grid_vertical';
            const wipClass = isOverWip ? ' kanban-column--over-wip' : '';
            return {
                ...col,
                isOverWipLimit: isOverWip,
                wipBadgeClass: `wip-badge${isOverWip ? ' wip-badge--over' : ''}`,
                mobileColumnClass: isActive
                    ? `${baseClass} mobile-column-active${wipClass}`
                    : `${baseClass} mobile-column-hidden${wipClass}`
            };
        };

        if (!hasFilter && !hasRetention) {
            return cols.map((col, idx) => addMobileClass(col, idx));
        }

        return cols.map((col, idx) => {
            // Hide Done and Released columns when toggle is on
            if (hideCompleted && col.isCompleted) {
                return addMobileClass(
                    { ...col, cards: [], cardCount: 0, isHidden: true },
                    idx
                );
            }

            const filtered = (col.cards || []).filter((card) => {
                // Auto-hide expired done cards (retention policy)
                if (
                    hasRetention &&
                    col.isCompleted &&
                    card.doneDate &&
                    new Date(card.doneDate) < retentionCutoff
                ) {
                    return false;
                }

                // Hide cards with Done status
                if (hideCompleted && card.status === 'Done') {
                    return false;
                }

                // Search: match subject, Name, cardType, assignee name
                if (search) {
                    const haystack = [
                        card.subject,
                        card.Name,
                        card.cardType,
                        card.assignee?.name,
                        card.status
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(search)) return false;
                }

                // Priority filter
                if (priority !== 'All' && card.priority !== priority) {
                    return false;
                }

                // Card type filter
                if (cardType !== 'All' && card.cardType !== cardType) {
                    return false;
                }

                return true;
            });

            return addMobileClass(
                { ...col, cards: filtered, cardCount: filtered.length },
                idx
            );
        });
    }

    // =========================================================================
    // Event handlers
    // =========================================================================

    /**
     * Handles search input with 150ms debounce for smooth typing
     * @param {Event} event - Input event from search field
     */
    handleBoardSearch(event) {
        const value = event.target.value;
        if (this._searchDebounceTimer) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            clearTimeout(this._searchDebounceTimer);
        }
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._searchDebounceTimer = setTimeout(() => {
            this.component._boardSearchTerm = value;
        }, 150);
    }

    /**
     * Handles priority filter dropdown change
     * @param {Event} event - Change event from priority combobox
     */
    handlePriorityFilter(event) {
        this.component._boardFilterPriority = event.target.value;
    }

    /**
     * Handles card type filter dropdown change
     * @param {Event} event - Change event from card type combobox
     */
    handleCardTypeFilter(event) {
        this.component._boardFilterCardType = event.target.value;
    }

    /**
     * Toggles the hide-completed filter on/off
     */
    handleToggleHideCompleted() {
        this.component._boardHideCompleted =
            !this.component._boardHideCompleted;
    }

    /**
     * Resets all filter state and clears the search input element
     */
    handleClearFilters() {
        this.component._boardSearchTerm = '';
        this.component._boardFilterPriority = 'All';
        this.component._boardFilterCardType = 'All';
        this.component._boardHideCompleted = false;
        if (this._searchDebounceTimer) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
        // Clear the search input element value
        const searchInput = this.component.template.querySelector(
            '.board-filter-search'
        );
        if (searchInput) {
            searchInput.value = '';
        }
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    /**
     * Clears the debounce timer. Call from the component's disconnectedCallback.
     */
    destroy() {
        if (this._searchDebounceTimer) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
    }
}
