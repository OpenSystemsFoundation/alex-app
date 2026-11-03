import { createElement } from 'lwc';
import KanbanFilterBar from 'c/kanbanFilterBar';

// Let pending microtasks and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

const ASSIGNEES = [
    { label: 'Ada Lovelace', value: 'u1' },
    { label: 'Alan Turing', value: 'u2' },
    { label: 'Grace Hopper', value: 'u3' }
];

const OPTIONS = [
    { label: 'All', value: '' },
    { label: 'High', value: 'High' }
];

function createBar(props = {}) {
    const element = createElement('c-kanban-filter-bar', {
        is: KanbanFilterBar
    });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

function assigneeButton(element) {
    return element.shadowRoot.querySelector(
        '.kanban-filter-bar__multiselect-button'
    );
}

function assigneeLabel(element) {
    return element.shadowRoot
        .querySelector('.kanban-filter-bar__multiselect-label')
        .textContent.trim();
}

function panel(element) {
    return element.shadowRoot.querySelector(
        '.kanban-filter-bar__multiselect-panel'
    );
}

describe('c-kanban-filter-bar', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
    });

    describe('search', () => {
        it('uses default placeholder and normalizes falsy search values', () => {
            const element = createBar({ searchValue: null });
            const input = element.shadowRoot.querySelector(
                '.kanban-filter-bar__search-input'
            );
            expect(input.placeholder).toBe('Search cards...');
            expect(element.searchValue).toBe('');
        });

        it('reflects searchValue and dispatches searchinput on input', () => {
            const element = createBar({
                searchValue: 'foo',
                searchPlaceholder: 'Find...'
            });
            expect(element.searchValue).toBe('foo');
            const input = element.shadowRoot.querySelector(
                '.kanban-filter-bar__search-input'
            );
            expect(input.placeholder).toBe('Find...');
            expect(input.value).toBe('foo');

            const handler = jest.fn();
            element.addEventListener('searchinput', handler);
            input.value = 'bar';
            input.dispatchEvent(new CustomEvent('input'));

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail).toEqual({ value: 'bar' });
            expect(element.searchValue).toBe('bar');
        });
    });

    describe('select filters', () => {
        it('renders no optional controls by default', () => {
            const element = createBar();
            expect(element.shadowRoot.querySelectorAll('select')).toHaveLength(
                0
            );
            expect(assigneeButton(element)).toBeNull();
            expect(
                element.shadowRoot.querySelector('.filter-toggle')
            ).toBeNull();
            expect(
                element.shadowRoot.querySelector('.kanban-filter-bar__info')
            ).toBeNull();
            expect(
                element.shadowRoot.querySelector('.kanban-filter-bar__clear')
            ).toBeNull();
            expect(
                element.shadowRoot.querySelectorAll('lightning-button')
            ).toHaveLength(0);
        });

        it.each([
            ['showViewFilter', 'viewOptions', 'viewchange'],
            ['showPriorityFilter', 'priorityOptions', 'prioritychange'],
            ['showCardTypeFilter', 'cardTypeOptions', 'cardtypechange'],
            ['showEpicFilter', 'epicOptions', 'epicchange'],
            ['showSwimlaneFilter', 'swimlaneOptions', 'swimlanechange']
        ])(
            '%s renders %s and dispatches %s',
            (flag, optionsProp, eventName) => {
                const element = createBar({
                    [flag]: true,
                    [optionsProp]: OPTIONS
                });
                const selects = element.shadowRoot.querySelectorAll('select');
                expect(selects).toHaveLength(1);
                const options = selects[0].querySelectorAll('option');
                expect([...options].map((o) => o.textContent.trim())).toEqual([
                    'All',
                    'High'
                ]);

                const handler = jest.fn();
                element.addEventListener(eventName, handler);
                selects[0].value = 'High';
                selects[0].dispatchEvent(new CustomEvent('change'));

                expect(handler).toHaveBeenCalledTimes(1);
                expect(handler.mock.calls[0][0].detail).toEqual({
                    value: 'High'
                });
            }
        );
    });

    describe('assignee multiselect', () => {
        it('normalizes non-array assigneeValue to an empty array', () => {
            const element = createBar({ assigneeValue: 'u1' });
            expect(element.assigneeValue).toEqual([]);
        });

        it('copies array assigneeValue', () => {
            const value = ['u1'];
            const element = createBar({ assigneeValue: value });
            expect(element.assigneeValue).toEqual(['u1']);
            expect(element.assigneeValue).not.toBe(value);
        });

        it('is disabled and does not open without options', async () => {
            const element = createBar({ showAssigneeFilter: true });
            const button = assigneeButton(element);
            expect(button.disabled).toBe(true);
            expect(assigneeLabel(element)).toBe('All Assignees');
            expect(button.title).toBe('Filter by assignee');

            // Disabled buttons don't fire click; invoke the handler path via event
            button.disabled = false;
            button.click();
            await flushPromises();
            expect(panel(element)).toBeNull();
            expect(button.className).not.toContain('--open');
        });

        it('shows the selected label for a single known assignee', () => {
            const element = createBar({
                showAssigneeFilter: true,
                assigneeOptions: ASSIGNEES,
                assigneeValue: ['u2']
            });
            expect(assigneeLabel(element)).toBe('Alan Turing');
            expect(assigneeButton(element).title).toBe('Alan Turing');
            expect(assigneeButton(element).disabled).toBe(false);
        });

        it('falls back to "1 Assignee" for an unknown single value', () => {
            const element = createBar({
                showAssigneeFilter: true,
                assigneeOptions: ASSIGNEES,
                assigneeValue: ['missing']
            });
            expect(assigneeLabel(element)).toBe('1 Assignee');
            expect(assigneeButton(element).title).toBe('');
        });

        it('shows a count and joined title for multiple assignees', () => {
            const element = createBar({
                showAssigneeFilter: true,
                assigneeOptions: ASSIGNEES,
                assigneeValue: ['u1', 'u3']
            });
            expect(assigneeLabel(element)).toBe('2 Assignees');
            expect(assigneeButton(element).title).toBe(
                'Ada Lovelace, Grace Hopper'
            );
        });

        it('toggles the dropdown, checks selected options and dispatches changes', async () => {
            const element = createBar({
                showAssigneeFilter: true,
                assigneeOptions: ASSIGNEES,
                assigneeValue: ['u1']
            });
            const handler = jest.fn();
            element.addEventListener('assigneechange', handler);

            assigneeButton(element).click();
            await flushPromises();
            expect(assigneeButton(element).className).toContain(
                'kanban-filter-bar__multiselect-button--open'
            );
            const boxes = panel(element).querySelectorAll(
                'input[type="checkbox"]'
            );
            expect([...boxes].map((b) => b.checked)).toEqual([
                true,
                false,
                false
            ]);

            // Check u2
            boxes[1].checked = true;
            boxes[1].dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({
                value: ['u1', 'u2']
            });

            // Uncheck u1
            boxes[0].checked = false;
            boxes[0].dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[1][0].detail).toEqual({
                value: ['u2']
            });
            expect(element.assigneeValue).toEqual(['u2']);

            // Clicking inside the panel does not close it
            panel(element).click();
            await flushPromises();
            expect(panel(element)).not.toBeNull();

            // Toggle closed
            assigneeButton(element).click();
            await flushPromises();
            expect(panel(element)).toBeNull();
        });

        it('closes the dropdown on outside window click', async () => {
            const element = createBar({
                showAssigneeFilter: true,
                assigneeOptions: ASSIGNEES
            });
            assigneeButton(element).click();
            await flushPromises();
            expect(panel(element)).not.toBeNull();

            window.dispatchEvent(new CustomEvent('click'));
            await flushPromises();
            expect(panel(element)).toBeNull();
        });
    });

    describe('toggles, info and actions', () => {
        it('renders the hide-done toggle with inactive/active class and dispatches togglehidedone', async () => {
            const element = createBar({ showHideDoneToggle: true });
            const button = element.shadowRoot.querySelector('.filter-toggle');
            expect(button.className).toBe('filter-toggle');

            element.hideDoneActive = true;
            await flushPromises();
            expect(button.className).toBe(
                'filter-toggle filter-toggle--active'
            );

            const handler = jest.fn();
            element.addEventListener('togglehidedone', handler);
            button.click();
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('renders info text and busy state', () => {
            const element = createBar({
                showInfoText: true,
                infoText: '12 cards',
                showBusyState: true
            });
            const infos = element.shadowRoot.querySelectorAll(
                '.kanban-filter-bar__info'
            );
            expect(infos).toHaveLength(2);
            expect(infos[0].textContent).toBe('12 cards');
            expect(infos[1].textContent.trim()).toBe('Saving...');
            expect(
                element.shadowRoot.querySelector('lightning-spinner')
                    .alternativeText
            ).toBe('Saving...');
        });

        it('dispatches clearfilters, createsprint and createcard', () => {
            const element = createBar({
                showClearFilters: true,
                showNewSprint: true,
                showNewCard: true
            });
            const clear = jest.fn();
            const sprint = jest.fn();
            const card = jest.fn();
            element.addEventListener('clearfilters', clear);
            element.addEventListener('createsprint', sprint);
            element.addEventListener('createcard', card);

            element.shadowRoot
                .querySelector('.kanban-filter-bar__clear')
                .click();
            const buttons = [
                ...element.shadowRoot.querySelectorAll('lightning-button')
            ];
            expect(buttons.map((b) => b.label)).toEqual([
                'New Sprint',
                'New Card'
            ]);
            buttons[0].click();
            buttons[1].click();

            expect(clear).toHaveBeenCalledTimes(1);
            expect(sprint).toHaveBeenCalledTimes(1);
            expect(card).toHaveBeenCalledTimes(1);
        });
    });

    describe('lifecycle', () => {
        it('adds and removes the window click listener', () => {
            const addSpy = jest.spyOn(window, 'addEventListener');
            const removeSpy = jest.spyOn(window, 'removeEventListener');
            const element = createBar();
            const added = addSpy.mock.calls.find(([type]) => type === 'click');
            expect(added).toBeDefined();

            document.body.removeChild(element);
            expect(removeSpy).toHaveBeenCalledWith('click', added[1]);
        });
    });

    it('re-syncs a select when its value is reset after a user change', async () => {
        const element = createBar({
            showPriorityFilter: true,
            priorityOptions: OPTIONS,
            priorityValue: ''
        });
        await Promise.resolve();
        const select = element.shadowRoot.querySelector(
            'select.kanban-filter-bar__select'
        );
        // User picks High, the parent applies it...
        select.value = 'High';
        element.priorityValue = 'High';
        await Promise.resolve();
        // ...then "Clear all filters" resets it
        element.priorityValue = '';
        await Promise.resolve();
        expect(select.value).toBe('');
    });
});
