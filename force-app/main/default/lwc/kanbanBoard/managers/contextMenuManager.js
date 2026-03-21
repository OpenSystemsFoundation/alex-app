import { moveCardToBacklogAsync, moveCardAsync } from 'c/kanbanStore';

/**
 * Manages board-level context menu state and actions for the Kanban board.
 * Handles right-click menu display, menu item construction, and dispatching
 * move/delete operations for cards.
 */
export default class ContextMenuManager {
    /** @type {import('c/kanbanBoard').default} */
    component;

    /** @type {string|null} */
    _cardId = null;

    /** @type {string|null} */
    _columnId = null;

    constructor(component) {
        this.component = component;
    }

    /**
     * Builds the array of context menu items for a card in the given column.
     * @param {string|null} currentColumnId - The column ID of the right-clicked card.
     *   Columns matching this ID are excluded from the "Move to Column" submenu.
     * @returns {Array<{label: string, value: string, icon: string, submenu?: Array, dividerBefore?: boolean}>}
     */
    buildMenuItems(currentColumnId) {
        const items = [];

        // Build "Move to Column" submenu with all columns except the current one
        const cols = this.component.columns || [];
        const columnSubmenu = [];
        for (const col of cols) {
            if (col.Id === currentColumnId) continue;
            columnSubmenu.push({
                label: col.columnHeader || col.name,
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

        items.push(
            {
                label: 'Move to Backlog',
                value: 'moveToBacklog',
                icon: 'utility:back',
                dividerBefore: columnSubmenu.length > 0
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

    /**
     * Returns the default menu items (no column excluded from submenu).
     * @returns {Array<{label: string, value: string, icon: string, submenu?: Array, dividerBefore?: boolean}>}
     */
    get defaultMenuItems() {
        return this.buildMenuItems(null);
    }

    /**
     * Handles the right-click context menu event on a board card.
     * Extracts card/column IDs from the event target, stores them,
     * and shows the context menu at the pointer position.
     * @param {MouseEvent} event - The contextmenu event from the card element.
     *   Expects `event.currentTarget.dataset.cardId` and `event.currentTarget.dataset.columnId`.
     */
    handleContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        const cardId = event.currentTarget.dataset.cardId;
        const columnId = event.currentTarget.dataset.columnId;
        this._cardId = cardId;
        this._columnId = columnId;
        const contextMenu = this.component.template.querySelector(
            'c-kanban-context-menu'
        );
        if (contextMenu) {
            contextMenu.menuItems = this.buildMenuItems(columnId);
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    /**
     * Handles a menu item selection from the context menu.
     * Dispatches the appropriate store action or delegates to card operations.
     * @param {CustomEvent} event - The select event from kanban-context-menu.
     *   `event.detail` contains `{value: string, subValue?: string}`.
     */
    async handleMenuSelect(event) {
        const { value, subValue } = event.detail;
        const cardId = this._cardId;
        if (!cardId || !this.component.store) return;

        switch (value) {
            case 'moveToColumn':
                if (subValue) {
                    await this.component.store.dispatch(
                        moveCardAsync(cardId, subValue, 0)
                    );
                }
                break;
            case 'moveToBacklog':
                await this.component.store.dispatch(
                    moveCardToBacklogAsync(
                        this.component.activeSprint?.Id || null,
                        cardId
                    )
                );
                break;
            case 'delete':
                this.component.cardOperations.handleCardDeleted(cardId);
                break;
            default:
                break;
        }
    }
}
