/**
 * Manages mobile column navigation for the Kanban board.
 * Handles swipe gestures and column switching in single-column mobile view.
 */

/** @type {number} Minimum swipe distance in pixels to trigger column change */
const SWIPE_THRESHOLD = 60;

export default class MobileNavigationManager {
    /** @type {import('c/kanbanBoard').default} */
    component;

    /** @type {number|null} Starting X coordinate of a touch gesture */
    _touchStartX = null;

    /**
     * @param {import('c/kanbanBoard').default} component - The kanbanBoard LWC instance
     */
    constructor(component) {
        this.component = component;
    }

    /**
     * Returns the Id of the currently active mobile column, clamped to array bounds.
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     * @returns {string|null} The active column Id, or null if no columns exist
     */
    getActiveColumnId(filteredColumns) {
        if (filteredColumns.length === 0) return null;
        const idx = Math.min(
            this.component._mobileActiveColumnIndex,
            filteredColumns.length - 1
        );
        return filteredColumns[idx]?.Id || null;
    }

    /**
     * Returns a display string like "3 / 7" showing current position in columns.
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     * @returns {string} The counter string, or empty string if no columns
     */
    getColumnCounter(filteredColumns) {
        if (filteredColumns.length === 0) return '';
        const idx = Math.min(
            this.component._mobileActiveColumnIndex,
            filteredColumns.length - 1
        );
        return `${idx + 1} / ${filteredColumns.length}`;
    }

    /**
     * Whether the active column is the first column.
     * @returns {boolean}
     */
    get isFirstColumn() {
        return this.component._mobileActiveColumnIndex <= 0;
    }

    /**
     * Whether the active column is the last column.
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     * @returns {boolean}
     */
    isLastColumn(filteredColumns) {
        return (
            this.component._mobileActiveColumnIndex >=
            filteredColumns.length - 1
        );
    }

    /**
     * Handles column selection change from the mobile dropdown/picker.
     * Finds the selected column Id in filteredColumns and updates the active index.
     * @param {Event} event - The change event from the column selector
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     */
    handleColumnChange(event, filteredColumns) {
        const selectedId = event.target.value;
        const idx = filteredColumns.findIndex((c) => c.Id === selectedId);
        if (idx >= 0) {
            this.component._mobileActiveColumnIndex = idx;
        }
    }

    /**
     * Navigates to the previous column if not already at the first.
     */
    handlePrevColumn() {
        if (this.component._mobileActiveColumnIndex > 0) {
            this.component._mobileActiveColumnIndex--;
        }
    }

    /**
     * Navigates to the next column if not already at the last.
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     */
    handleNextColumn(filteredColumns) {
        if (
            this.component._mobileActiveColumnIndex <
            filteredColumns.length - 1
        ) {
            this.component._mobileActiveColumnIndex++;
        }
    }

    /**
     * Captures the starting X position of a single-finger touch.
     * @param {TouchEvent} event - The touchstart event
     */
    handleTouchStart(event) {
        if (event.touches && event.touches.length === 1) {
            this._touchStartX = event.touches[0].clientX;
        }
    }

    /**
     * Evaluates swipe direction on touch end and navigates columns accordingly.
     * A rightward swipe (> threshold) goes to the previous column;
     * a leftward swipe (< -threshold) goes to the next column.
     * @param {TouchEvent} event - The touchend event
     * @param {Array<{Id: string}>} filteredColumns - The filtered columns list
     */
    handleTouchEnd(event, filteredColumns) {
        if (this._touchStartX === null || !event.changedTouches) return;
        const deltaX = event.changedTouches[0].clientX - this._touchStartX;
        this._touchStartX = null;

        if (deltaX > SWIPE_THRESHOLD) {
            this.handlePrevColumn();
        } else if (deltaX < -SWIPE_THRESHOLD) {
            this.handleNextColumn(filteredColumns);
        }
    }
}
