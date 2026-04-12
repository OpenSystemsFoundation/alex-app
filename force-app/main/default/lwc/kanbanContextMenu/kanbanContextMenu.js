import { LightningElement, api, track } from 'lwc';

/**
 * @typedef {Object} MenuItem
 * @property {string} label - Display text
 * @property {string} value - Action identifier
 * @property {string} [icon] - SLDS icon name
 * @property {boolean} [dividerBefore] - Show divider above this item
 * @property {boolean} [disabled] - Whether the item is disabled
 * @property {MenuItem[]} [submenu] - Nested submenu items
 */

export default class KanbanContextMenu extends LightningElement {
    /** @type {MenuItem[]} Menu items to render */
    @api menuItems = [];
    @track isVisible = false;
    @track posX = 0;
    @track posY = 0;
    @track activeSubmenu = null;

    _clickOutsideHandler = null;

    @api
    show(x, y) {
        this._targetX = x;
        this._targetY = y;
        // Render off-screen first to detect position:fixed offset
        // caused by ancestor transforms in Salesforce Lightning DOM
        this.posX = -9999;
        this.posY = -9999;
        this.isVisible = true;
        this.activeSubmenu = null;

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            const menu = this.template.querySelector('.context-menu');
            if (menu) {
                // Detect offset from ancestor transforms breaking position:fixed
                const rect = menu.getBoundingClientRect();
                const offsetX = rect.left + 9999;
                const offsetY = rect.top + 9999;

                this.posX = this._targetX - offsetX;
                this.posY = this._targetY - offsetY;

                // Ensure menu doesn't go off screen (second frame)
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                requestAnimationFrame(() => {
                    const finalRect = menu.getBoundingClientRect();
                    if (finalRect.right > window.innerWidth) {
                        this.posX -= finalRect.right - window.innerWidth + 8;
                    }
                    if (finalRect.bottom > window.innerHeight) {
                        this.posY -=
                            finalRect.bottom - window.innerHeight + 8;
                    }
                });
            }
        });

        // Close on click outside (defer to avoid immediate close)
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this._clickOutsideHandler = (evt) => {
                // In LWC synthetic shadow, stopPropagation inside the
                // shadow tree does not prevent composed events from
                // reaching window. Check if click is inside the menu.
                const menu = this.template.querySelector('.context-menu');
                if (menu) {
                    const rect = menu.getBoundingClientRect();
                    if (
                        evt.clientX >= rect.left &&
                        evt.clientX <= rect.right &&
                        evt.clientY >= rect.top &&
                        evt.clientY <= rect.bottom
                    ) {
                        return; // click is inside menu, ignore
                    }
                }
                this.hide();
            };
            window.addEventListener('click', this._clickOutsideHandler);
            window.addEventListener('contextmenu', this._clickOutsideHandler);
        }, 0);
    }

    @api
    hide() {
        this.isVisible = false;
        this.activeSubmenu = null;
        if (this._clickOutsideHandler) {
            window.removeEventListener('click', this._clickOutsideHandler);
            window.removeEventListener(
                'contextmenu',
                this._clickOutsideHandler
            );
            this._clickOutsideHandler = null;
        }
    }

    get menuStyle() {
        return `left: ${this.posX}px; top: ${this.posY}px;`;
    }

    get processedItems() {
        return this.menuItems.map((item, index) => ({
            ...item,
            key: `item-${index}`,
            hasSubmenu: item.submenu && item.submenu.length > 0,
            isSubmenuActive: this.activeSubmenu === item.value,
            itemClass: `context-menu__item${item.disabled ? ' context-menu__item--disabled' : ''}`
        }));
    }

    handleItemClick(event) {
        event.stopPropagation();
        const value = event.currentTarget.dataset.value;
        const item = this.menuItems.find((i) => i.value === value);

        if (item?.disabled) return;

        if (item?.submenu && item.submenu.length > 0) {
            this.activeSubmenu = this.activeSubmenu === value ? null : value;
            return;
        }

        this.dispatchEvent(new CustomEvent('select', { detail: { value } }));
        this.hide();
    }

    handleSubmenuClick(event) {
        event.stopPropagation();
        const value = event.currentTarget.dataset.value;
        const parentValue = event.currentTarget.dataset.parent;

        this.dispatchEvent(
            new CustomEvent('select', {
                detail: { value: parentValue, subValue: value }
            })
        );
        this.hide();
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.hide();
        }
    }

    disconnectedCallback() {
        this.hide();
    }
}
