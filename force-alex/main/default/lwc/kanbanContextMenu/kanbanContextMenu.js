import { LightningElement, api, track } from 'lwc';

export default class KanbanContextMenu extends LightningElement {
    @api menuItems = []; // Array of { label, value, icon, dividerBefore, disabled, submenu: [{ label, value }] }
    @track isVisible = false;
    @track posX = 0;
    @track posY = 0;
    @track activeSubmenu = null;

    _clickOutsideHandler = null;

    @api
    show(x, y) {
        this.posX = x;
        this.posY = y;
        this.isVisible = true;
        this.activeSubmenu = null;

        // Ensure menu doesn't go off screen
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            const menu = this.template.querySelector('.context-menu');
            if (menu) {
                const rect = menu.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    this.posX = window.innerWidth - rect.width - 8;
                }
                if (rect.bottom > window.innerHeight) {
                    this.posY = window.innerHeight - rect.height - 8;
                }
            }
        });

        // Close on click outside (defer to avoid immediate close)
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this._clickOutsideHandler = () => this.hide();
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
