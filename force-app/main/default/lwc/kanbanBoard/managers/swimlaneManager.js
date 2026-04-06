/**
 * @module SwimlaneManager
 * @description Manages swimlane grouping logic for the Kanban board.
 * Supports grouping cards by assignee, priority, card type, or epic.
 */

/**
 * @typedef {Object} SwimlaneColumn
 * @property {string} Id - Column identifier
 * @property {Array<Object>} cards - Cards filtered to this swimlane
 * @property {number} cardCount - Number of cards in this lane/column intersection
 * @property {string} laneKey - Composite key: `${swimlaneKey}-${columnId}`
 */

/**
 * @typedef {Object} Swimlane
 * @property {string} key - Unique grouping key
 * @property {string} label - Display label for the swimlane row
 * @property {SwimlaneColumn[]} columns - Columns with cards filtered to this swimlane
 * @property {number} totalCards - Total card count across all columns in this swimlane
 */

export default class SwimlaneManager {
    _lastFilteredColumnsRef = null;
    _lastMode = null;
    _cachedSwimlanes = [];

    /** @param {Object} component - The parent LWC component instance */
    constructor(component) {
        this.component = component;
    }

    /**
     * Returns the available swimlane mode options for the UI dropdown.
     * @returns {Array<{label: string, value: string}>}
     */
    get modeOptions() {
        return [
            { label: 'No Swimlanes', value: 'none' },
            { label: 'By Assignee', value: 'assignee' },
            { label: 'By Priority', value: 'priority' },
            { label: 'By Card Type', value: 'cardType' },
            { label: 'By Epic', value: 'epic' }
        ];
    }

    /**
     * Whether swimlane grouping is currently active.
     * @returns {boolean}
     */
    get isActive() {
        return this.component._swimlaneMode !== 'none';
    }

    /**
     * Groups the given columns into swimlane rows based on the current mode.
     *
     * Steps:
     * 1. If swimlanes are not active, returns an empty array.
     * 2. Collects unique grouping values from all cards across all columns.
     * 3. For each unique group value, filters each column's cards.
     * 4. Sorts: swimlanes with cards first, then alphabetically by label.
     *
     * @param {Array<Object>} filteredColumns - Columns (with cards) already filtered by FilterManager
     * @returns {Swimlane[]}
     */
    getSwimlanes(filteredColumns) {
        if (!this.isActive) return [];
        const cols = filteredColumns;
        if (!cols || cols.length === 0) return [];

        // Memoize: skip recalculation if inputs haven't changed
        const mode = this.component._swimlaneMode;
        if (this._lastFilteredColumnsRef === cols && this._lastMode === mode) {
            return this._cachedSwimlanes;
        }
        this._lastFilteredColumnsRef = cols;
        this._lastMode = mode;

        // Collect all unique values for the grouping key
        const groupMap = new Map();

        cols.forEach((col) => {
            (col.cards || []).forEach((card) => {
                let key;
                let label;
                switch (mode) {
                    case 'assignee':
                        key = card.assigneeId || '__unassigned__';
                        label = card.assignee?.name || 'Unassigned';
                        break;
                    case 'priority':
                        key = card.priority || '__none__';
                        label = card.priority || 'No Priority';
                        break;
                    case 'cardType':
                        key = card.cardType || '__none__';
                        label = card.cardType || 'No Type';
                        break;
                    case 'epic':
                        key = card.epicId || '__none__';
                        label = card.epic?.subject || 'No Epic';
                        break;
                    default:
                        key = '__all__';
                        label = 'All';
                }
                if (!groupMap.has(key)) {
                    groupMap.set(key, label);
                }
            });
        });

        // Build swimlane rows
        const swimlanes = [];
        groupMap.forEach((label, key) => {
            const laneCols = cols.map((col) => {
                const laneCards = (col.cards || []).filter((card) => {
                    switch (mode) {
                        case 'assignee':
                            return (
                                (card.assigneeId || '__unassigned__') === key
                            );
                        case 'priority':
                            return (card.priority || '__none__') === key;
                        case 'cardType':
                            return (card.cardType || '__none__') === key;
                        case 'epic':
                            return (card.epicId || '__none__') === key;
                        default:
                            return true;
                    }
                });
                return {
                    ...col,
                    cards: laneCards,
                    cardCount: laneCards.length,
                    laneKey: `${key}-${col.Id}`
                };
            });
            const totalCards = laneCols.reduce(
                (sum, c) => sum + c.cardCount,
                0
            );
            swimlanes.push({
                key,
                label,
                columns: laneCols,
                totalCards
            });
        });

        // Sort: put items with cards first, then alphabetically
        swimlanes.sort((a, b) => {
            if (a.totalCards === 0 && b.totalCards > 0) return 1;
            if (a.totalCards > 0 && b.totalCards === 0) return -1;
            return a.label.localeCompare(b.label);
        });

        this._cachedSwimlanes = swimlanes;
        return swimlanes;
    }

    /**
     * Handles swimlane mode change from the UI dropdown.
     * @param {Event} event - The change event from the combobox
     */
    handleModeChange(event) {
        this.component._swimlaneMode = event.target.value;
    }
}
