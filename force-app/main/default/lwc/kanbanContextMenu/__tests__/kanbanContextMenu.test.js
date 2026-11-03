import { createElement } from 'lwc';
import KanbanContextMenu from 'c/kanbanContextMenu';

// Let pending microtasks and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

const MENU_ITEMS = [
    { label: 'Edit', value: 'edit', icon: 'utility:edit' },
    {
        label: 'Move to',
        value: 'move',
        submenu: [
            { label: 'To Do', value: 'col1' },
            { label: 'Done', value: 'col2' }
        ]
    },
    { label: 'Archived', value: 'archive', disabled: true },
    { label: 'Empty Sub', value: 'emptysub', submenu: [] },
    { label: 'Delete', value: 'delete', dividerBefore: true }
];

function rect(left, top, width = 100, height = 100) {
    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
}

describe('c-kanban-context-menu', () => {
    let rafQueue;

    function flushRaf() {
        const queue = rafQueue;
        rafQueue = [];
        queue.forEach((cb) => cb());
    }

    function createMenu(items = MENU_ITEMS) {
        const element = createElement('c-kanban-context-menu', {
            is: KanbanContextMenu
        });
        element.menuItems = items;
        document.body.appendChild(element);
        return element;
    }

    function getMenu(element) {
        return element.shadowRoot.querySelector('.context-menu');
    }

    function itemLink(element, value) {
        return element.shadowRoot.querySelector(
            `a[data-value="${value}"]:not([data-parent])`
        );
    }

    beforeEach(() => {
        rafQueue = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });
        jest.useFakeTimers({ doNotFake: ['requestAnimationFrame'] });
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('renders nothing until shown', () => {
        const element = createMenu();
        expect(getMenu(element)).toBeNull();
    });

    it('renders items with icons, dividers, disabled and submenu markers when shown', async () => {
        const element = createMenu();
        element.show(50, 60);
        await flushPromises();

        const menu = getMenu(element);
        expect(menu).not.toBeNull();
        expect(menu.style.left).toBe('-9999px');
        expect(menu.style.top).toBe('-9999px');

        const items = element.shadowRoot.querySelectorAll(
            'li.context-menu__item'
        );
        expect(items).toHaveLength(5);
        expect(items[2].className).toContain('context-menu__item--disabled');
        expect(items[0].className).not.toContain(
            'context-menu__item--disabled'
        );
        expect(
            element.shadowRoot.querySelectorAll('li[role="separator"]')
        ).toHaveLength(1);

        const icons = [
            ...element.shadowRoot.querySelectorAll('lightning-icon')
        ];
        expect(icons.map((i) => i.iconName)).toEqual([
            'utility:edit',
            'utility:chevronright'
        ]);
        // Submenu list is not shown until the parent is clicked
        expect(element.shadowRoot.querySelector('.context-submenu')).toBeNull();
    });

    it('repositions the menu to compensate for ancestor transform offsets', async () => {
        const element = createMenu();
        element.show(200, 150);
        await flushPromises();

        const menu = getMenu(element);
        const rectSpy = jest
            .fn()
            .mockReturnValueOnce(rect(-9999 + 10, -9999 + 20))
            .mockReturnValueOnce(rect(190, 130));
        menu.getBoundingClientRect = rectSpy;

        flushRaf(); // first frame: offset compensation
        await flushPromises();
        expect(menu.style.left).toBe('190px');
        expect(menu.style.top).toBe('130px');

        flushRaf(); // second frame: menu fits on screen, no change
        await flushPromises();
        expect(rectSpy).toHaveBeenCalledTimes(2);
        expect(menu.style.left).toBe('190px');
        expect(menu.style.top).toBe('130px');
    });

    it('keeps the menu within the viewport on the second frame', async () => {
        const element = createMenu();
        element.show(window.innerWidth - 20, window.innerHeight - 20);
        await flushPromises();

        const menu = getMenu(element);
        const x = window.innerWidth - 20;
        const y = window.innerHeight - 20;
        menu.getBoundingClientRect = jest
            .fn()
            .mockReturnValueOnce(rect(-9999, -9999))
            .mockReturnValueOnce(rect(x, y, 100, 50));

        flushRaf();
        flushRaf();
        await flushPromises();

        // right overflow = 80, plus 8px margin; bottom overflow = 30 plus 8px
        expect(menu.style.left).toBe(`${x - 88}px`);
        expect(menu.style.top).toBe(`${y - 38}px`);
    });

    it('skips positioning when the menu is not yet rendered in the first frame', async () => {
        const element = createMenu();
        element.show(10, 10);
        // Run the frame before LWC re-renders the menu
        flushRaf();
        expect(rafQueue).toHaveLength(0);
        await flushPromises();
        expect(getMenu(element).style.left).toBe('-9999px');
    });

    it('dispatches select and hides when a regular item is clicked', async () => {
        const element = createMenu();
        const handler = jest.fn();
        element.addEventListener('select', handler);
        element.show(0, 0);
        await flushPromises();

        itemLink(element, 'edit').click();
        await flushPromises();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({ value: 'edit' });
        expect(getMenu(element)).toBeNull();
    });

    it('treats an item with an empty submenu as a regular item', async () => {
        const element = createMenu();
        const handler = jest.fn();
        element.addEventListener('select', handler);
        element.show(0, 0);
        await flushPromises();

        itemLink(element, 'emptysub').click();
        await flushPromises();

        expect(handler.mock.calls[0][0].detail).toEqual({
            value: 'emptysub'
        });
    });

    it('ignores clicks on disabled items', async () => {
        const element = createMenu();
        const handler = jest.fn();
        element.addEventListener('select', handler);
        element.show(0, 0);
        await flushPromises();

        itemLink(element, 'archive').click();
        await flushPromises();

        expect(handler).not.toHaveBeenCalled();
        expect(getMenu(element)).not.toBeNull();
    });

    it('dispatches select for items not present in menuItems', async () => {
        const element = createMenu();
        const handler = jest.fn();
        element.addEventListener('select', handler);
        element.show(0, 0);
        await flushPromises();

        const link = itemLink(element, 'edit');
        // Item list changes underneath a rendered link
        element.menuItems = [{ label: 'Other', value: 'other' }];
        link.click();

        expect(handler.mock.calls[0][0].detail).toEqual({ value: 'edit' });
    });

    it('toggles submenus and dispatches parent and sub values', async () => {
        const element = createMenu();
        const handler = jest.fn();
        element.addEventListener('select', handler);
        element.show(0, 0);
        await flushPromises();

        itemLink(element, 'move').click();
        await flushPromises();
        expect(handler).not.toHaveBeenCalled();
        const subLinks =
            element.shadowRoot.querySelectorAll('.context-submenu a');
        expect([...subLinks].map((a) => a.dataset.value)).toEqual([
            'col1',
            'col2'
        ]);

        // Clicking again collapses the submenu
        itemLink(element, 'move').click();
        await flushPromises();
        expect(element.shadowRoot.querySelector('.context-submenu')).toBeNull();

        itemLink(element, 'move').click();
        await flushPromises();
        element.shadowRoot
            .querySelector('.context-submenu a[data-value="col2"]')
            .click();
        await flushPromises();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({
            value: 'move',
            subValue: 'col2'
        });
        expect(getMenu(element)).toBeNull();
    });

    it('hides on Escape but not on other keys', async () => {
        const element = createMenu();
        element.show(0, 0);
        await flushPromises();

        getMenu(element).dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter' })
        );
        await flushPromises();
        expect(getMenu(element)).not.toBeNull();

        getMenu(element).dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape' })
        );
        await flushPromises();
        expect(getMenu(element)).toBeNull();
    });

    it('closes on outside clicks but stays open for clicks inside the menu', async () => {
        const addSpy = jest.spyOn(window, 'addEventListener');
        const removeSpy = jest.spyOn(window, 'removeEventListener');
        const element = createMenu();
        element.show(0, 0);
        await flushPromises();

        // Listeners are registered only after the deferred timeout
        expect(addSpy).not.toHaveBeenCalledWith('click', expect.any(Function));
        jest.runAllTimers();
        expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(addSpy).toHaveBeenCalledWith(
            'contextmenu',
            expect.any(Function)
        );

        getMenu(element).getBoundingClientRect = () => rect(100, 100);

        // Inside click: ignored
        window.dispatchEvent(
            new MouseEvent('click', { clientX: 150, clientY: 150 })
        );
        await flushPromises();
        expect(getMenu(element)).not.toBeNull();

        // Outside click on each edge
        window.dispatchEvent(
            new MouseEvent('click', { clientX: 150, clientY: 250 })
        );
        await flushPromises();
        expect(getMenu(element)).toBeNull();
        expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith(
            'contextmenu',
            expect.any(Function)
        );
    });

    it.each([
        [50, 150],
        [250, 150],
        [150, 50]
    ])(
        'treats a click at (%i, %i) as outside the menu',
        async (clientX, clientY) => {
            const element = createMenu();
            element.show(0, 0);
            await flushPromises();
            jest.runAllTimers();
            getMenu(element).getBoundingClientRect = () => rect(100, 100);

            window.dispatchEvent(
                new MouseEvent('contextmenu', { clientX, clientY })
            );
            await flushPromises();
            expect(getMenu(element)).toBeNull();
        }
    );

    it('closes when an outside click arrives while the menu is not rendered', async () => {
        const element = createMenu();
        element.show(0, 0);
        jest.runAllTimers();
        // Listener registered before the menu was rendered: menu lookup returns null
        window.dispatchEvent(new MouseEvent('click', { clientX: 1 }));
        await flushPromises();
        expect(getMenu(element)).toBeNull();
    });

    it('builds the inline style from the position', async () => {
        const element = createMenu();
        element.show(0, 0);
        await flushPromises();
        expect(getMenu(element).getAttribute('style')).toContain(
            'left: -9999px; top: -9999px;'
        );
    });

    it('removes window listeners on disconnect', async () => {
        const removeSpy = jest.spyOn(window, 'removeEventListener');
        const element = createMenu();
        element.show(0, 0);
        await flushPromises();
        jest.runAllTimers();

        document.body.removeChild(element);
        expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith(
            'contextmenu',
            expect.any(Function)
        );
    });

    it('does not touch window listeners when hidden without having been shown', () => {
        const removeSpy = jest.spyOn(window, 'removeEventListener');
        const element = createMenu();
        element.hide();
        expect(removeSpy).not.toHaveBeenCalledWith(
            'click',
            expect.any(Function)
        );
    });
});
