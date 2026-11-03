import { createElement } from 'lwc';
import ColumnManagement from 'c/columnManagement';
import {
    createColumnAsync,
    updateColumnAsync,
    deleteColumnAsync,
    reorderColumnAsync,
    createColumnsFromTemplateAsync
} from 'c/kanbanStore';
import { buildInitialState } from 'jest-helpers/testDataFactory';

jest.mock('c/kanbanStore', () => {
    const actual = jest.requireActual('c/kanbanStore');
    return {
        ...actual,
        createColumnAsync: jest.fn((...args) => ({
            type: 'MOCK_CREATE_COLUMN',
            args
        })),
        updateColumnAsync: jest.fn((...args) => ({
            type: 'MOCK_UPDATE_COLUMN',
            args
        })),
        deleteColumnAsync: jest.fn((...args) => ({
            type: 'MOCK_DELETE_COLUMN',
            args
        })),
        reorderColumnAsync: jest.fn((...args) => ({
            type: 'MOCK_REORDER_COLUMN',
            args
        })),
        createColumnsFromTemplateAsync: jest.fn((...args) => ({
            type: 'MOCK_CREATE_FROM_TEMPLATE',
            args
        }))
    };
});

async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

function createMockStore(initialState) {
    let state = initialState;
    const listeners = new Set();
    return {
        getState: () => state,
        subscribe: jest.fn((listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }),
        dispatch: jest.fn(() => Promise.resolve()),
        setState(next) {
            state = next;
            listeners.forEach((listener) => listener(state));
        },
        listenerCount: () => listeners.size
    };
}

const COLUMNS = [
    {
        Id: 'col-1',
        columnHeader: 'To Do',
        category: 'To Do',
        status: 'To Do',
        color: '#2E844A',
        wipLimit: 3,
        cardCount: 4
    },
    {
        Id: 'col-2',
        columnHeader: 'Doing',
        category: 'In Progress',
        status: 'In Progress',
        color: null,
        wipLimit: null,
        cardCount: 0
    },
    {
        Id: 'col-3',
        columnHeader: 'Done',
        category: 'Done',
        status: 'Done',
        color: '#9050E9',
        cardCount: undefined
    }
];

function stateWithColumns(columns = COLUMNS, overrides = {}) {
    return buildInitialState({ columns, ...overrides });
}

async function mount(store) {
    const element = createElement('c-column-management', {
        is: ColumnManagement
    });
    element.store = store;
    document.body.appendChild(element);
    await flushPromises();
    return element;
}

function listenForToasts(element) {
    const toasts = jest.fn();
    element.addEventListener('lightning__showtoast', (e) => toasts(e.detail));
    return toasts;
}

const root = (element) => element.shadowRoot;
const columnItem = (element, id) =>
    root(element).querySelector(`div.column-item[data-column-id="${id}"]`);
const field = (element, id, name) =>
    root(element).querySelector(
        `[data-column-id="${id}"][data-field="${name}"]`
    );
const buttonByLabel = (element, label) =>
    [...root(element).querySelectorAll('lightning-button')].find(
        (b) => b.label === label
    );

function blurWithValue(input, value) {
    input.value = value;
    input.dispatchEvent(new CustomEvent('blur'));
}

function comboChange(combo, value) {
    combo.dispatchEvent(new CustomEvent('change', { detail: { value } }));
}

function dragEvent(type, dataTransfer = {}) {
    const event = new CustomEvent(type, { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    return event;
}

describe('c-column-management', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.useRealTimers();
    });

    describe('rendering', () => {
        it('shows a spinner when no store is provided', async () => {
            const element = await mount(undefined);

            expect(root(element).querySelector('lightning-spinner')).not.toBe(
                null
            );
            expect(root(element).querySelector('.columns-list')).toBeNull();
            expect(root(element).querySelector('.empty-state')).toBeNull();
        });

        it('shows a spinner while the store is loading', async () => {
            const store = createMockStore(
                stateWithColumns(COLUMNS, { isLoading: true })
            );
            const element = await mount(store);

            expect(root(element).querySelector('lightning-spinner')).not.toBe(
                null
            );
            expect(root(element).querySelector('.columns-list')).toBeNull();
        });

        it('renders enriched columns from the store', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            expect(root(element).querySelector('lightning-spinner')).toBeNull();
            const links = [...root(element).querySelectorAll('a')];
            expect(links.map((a) => a.textContent)).toEqual([
                'To Do',
                'Doing',
                'Done'
            ]);
            expect(links[0].getAttribute('href')).toBe(
                '/lightning/r/OpenSF__Column__c/col-1/view'
            );
            const badges = [
                ...root(element).querySelectorAll('lightning-badge')
            ].map((b) => b.label);
            expect(badges).toEqual(['4 cards', '0 cards', '0 cards']);

            const bars = [
                ...root(element).querySelectorAll('.column-color-bar')
            ].map((b) => b.getAttribute('style'));
            expect(bars[0]).toContain('#2E844A');
            expect(bars[1]).toContain('#1B96FF');

            expect(field(element, 'col-1', 'columnHeader').value).toBe('To Do');
            expect(field(element, 'col-1', 'wipLimit').value).toBe(3);
            expect(field(element, 'col-2', 'category').value).toBe(
                'In Progress'
            );
            expect(
                field(element, 'col-1', 'color').options.map((o) => o.label)
            ).toContain('Purple');
            expect(columnItem(element, 'col-1').className).toBe('column-item');
        });

        it('shows template choices when there are no columns', async () => {
            const store = createMockStore(stateWithColumns([]));
            const element = await mount(store);

            expect(root(element).querySelector('.columns-list')).toBeNull();
            const names = [
                ...root(element).querySelectorAll('.template-name')
            ].map((n) => n.textContent);
            expect(names).toEqual([
                'Simple Kanban',
                'Scrum Board',
                'Release Pipeline'
            ]);
        });

        it('switches from empty state to the list on store update', async () => {
            const store = createMockStore(stateWithColumns([]));
            const element = await mount(store);
            expect(root(element).querySelector('.empty-state')).not.toBeNull();

            store.setState(stateWithColumns());
            await flushPromises();

            expect(root(element).querySelector('.empty-state')).toBeNull();
            expect(root(element).querySelectorAll('a')).toHaveLength(3);
        });

        it('unsubscribes from the store on disconnect', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            expect(store.listenerCount()).toBe(1);

            document.body.removeChild(element);

            expect(store.listenerCount()).toBe(0);
        });
    });

    describe('adding columns', () => {
        it('creates a default column from the add card', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            root(element).querySelector('.column-item--add').click();
            await flushPromises();

            expect(createColumnAsync).toHaveBeenCalledWith(
                'New Column',
                'To Do',
                '#1B96FF',
                'To Do',
                null
            );
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_CREATE_COLUMN',
                args: ['New Column', 'To Do', '#1B96FF', 'To Do', null]
            });
        });

        it('creates a column via Enter and Space but not other keys', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            const addCard = root(element).querySelector('.column-item--add');

            const tab = new KeyboardEvent('keydown', {
                key: 'Tab',
                cancelable: true
            });
            addCard.dispatchEvent(tab);
            expect(createColumnAsync).not.toHaveBeenCalled();
            expect(tab.defaultPrevented).toBe(false);

            const enter = new KeyboardEvent('keydown', {
                key: 'Enter',
                cancelable: true
            });
            addCard.dispatchEvent(enter);
            await flushPromises();
            expect(enter.defaultPrevented).toBe(true);

            addCard.dispatchEvent(
                new KeyboardEvent('keydown', { key: ' ', cancelable: true })
            );
            await flushPromises();

            expect(createColumnAsync).toHaveBeenCalledTimes(2);
        });

        it('creates a column from the empty-state button', async () => {
            const store = createMockStore(stateWithColumns([]));
            const element = await mount(store);

            buttonByLabel(element, 'Add Column Manually').click();
            await flushPromises();

            expect(createColumnAsync).toHaveBeenCalledTimes(1);
        });

        it('shows an error toast when column creation fails', async () => {
            const store = createMockStore(stateWithColumns());
            store.dispatch.mockRejectedValueOnce({});
            const element = await mount(store);
            const toasts = listenForToasts(element);

            root(element).querySelector('.column-item--add').click();
            await flushPromises();

            expect(toasts).toHaveBeenCalledWith({
                title: 'Error creating column',
                message: 'Unknown error',
                variant: 'error'
            });
        });

        it('creates columns from a template and confirms with a toast', async () => {
            const store = createMockStore(stateWithColumns([]));
            const element = await mount(store);
            const toasts = listenForToasts(element);

            root(element)
                .querySelector('.template-card[data-template="scrum"]')
                .click();
            await flushPromises();

            expect(createColumnsFromTemplateAsync).toHaveBeenCalledWith(
                'scrum'
            );
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_CREATE_FROM_TEMPLATE',
                args: ['scrum']
            });
            expect(toasts).toHaveBeenCalledWith({
                title: 'Success',
                message: 'Template columns created',
                variant: 'success'
            });
        });

        it('selects a template with the keyboard', async () => {
            const store = createMockStore(stateWithColumns([]));
            const element = await mount(store);
            const card = root(element).querySelector(
                '.template-card[data-template="release"]'
            );

            card.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'a', cancelable: true })
            );
            expect(createColumnsFromTemplateAsync).not.toHaveBeenCalled();

            const space = new KeyboardEvent('keydown', {
                key: ' ',
                cancelable: true
            });
            card.dispatchEvent(space);
            await flushPromises();
            expect(space.defaultPrevented).toBe(true);

            card.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
            );
            await flushPromises();

            expect(createColumnsFromTemplateAsync).toHaveBeenCalledTimes(2);
            expect(createColumnsFromTemplateAsync).toHaveBeenCalledWith(
                'release'
            );
        });

        it('shows an error toast when template creation fails', async () => {
            const store = createMockStore(stateWithColumns([]));
            store.dispatch.mockRejectedValueOnce(new Error('Limit reached'));
            const element = await mount(store);
            const toasts = listenForToasts(element);

            root(element)
                .querySelector('.template-card[data-template="kanban"]')
                .click();
            await flushPromises();

            expect(toasts).toHaveBeenCalledWith({
                title: 'Error creating template',
                message: 'Limit reached',
                variant: 'error'
            });
            expect(toasts).toHaveBeenCalledTimes(1);
        });
    });

    describe('inline editing', () => {
        it('saves a changed column name on blur', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            blurWithValue(field(element, 'col-1', 'columnHeader'), 'Backlog');
            await flushPromises();

            expect(updateColumnAsync).toHaveBeenCalledWith('col-1', {
                columnHeader: 'Backlog'
            });
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_UPDATE_COLUMN',
                args: ['col-1', { columnHeader: 'Backlog' }]
            });
        });

        it('does not save an unchanged name', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            blurWithValue(field(element, 'col-1', 'columnHeader'), 'To Do');
            await flushPromises();

            expect(updateColumnAsync).not.toHaveBeenCalled();
        });

        it('saves combobox changes from the event detail', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            comboChange(field(element, 'col-2', 'category'), 'Testing');
            comboChange(field(element, 'col-2', 'status'), 'Review');
            comboChange(field(element, 'col-2', 'color'), '#EA001E');
            await flushPromises();

            expect(updateColumnAsync.mock.calls).toEqual([
                ['col-2', { category: 'Testing' }],
                ['col-2', { status: 'Review' }],
                ['col-2', { color: '#EA001E' }]
            ]);
        });

        it('converts WIP limit input to a number', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            blurWithValue(field(element, 'col-1', 'wipLimit'), '5');
            await flushPromises();

            expect(updateColumnAsync).toHaveBeenCalledWith('col-1', {
                wipLimit: 5
            });
        });

        it('clears a WIP limit to null', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            blurWithValue(field(element, 'col-1', 'wipLimit'), '');
            await flushPromises();

            expect(updateColumnAsync).toHaveBeenCalledWith('col-1', {
                wipLimit: null
            });
        });

        it('skips saving an empty WIP limit when none is set', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            // col-2 has wipLimit null, col-3 has it undefined
            blurWithValue(field(element, 'col-2', 'wipLimit'), '');
            blurWithValue(field(element, 'col-3', 'wipLimit'), null);
            blurWithValue(field(element, 'col-3', 'wipLimit'), '');
            await flushPromises();

            expect(updateColumnAsync).not.toHaveBeenCalled();
        });

        it('ignores edits for unknown columns', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            const input = field(element, 'col-1', 'columnHeader');

            // Column removed by another user before the blur fires
            store.setState(stateWithColumns([COLUMNS[1]]));
            blurWithValue(input, 'Renamed');
            await flushPromises();

            expect(updateColumnAsync).not.toHaveBeenCalled();
        });

        it('shows the Apex error message when a save fails', async () => {
            const store = createMockStore(stateWithColumns());
            store.dispatch.mockRejectedValueOnce({
                body: { message: 'Name too long' }
            });
            const element = await mount(store);
            const toasts = listenForToasts(element);

            blurWithValue(field(element, 'col-1', 'columnHeader'), 'X');
            await flushPromises();

            expect(toasts).toHaveBeenCalledWith({
                title: 'Error saving',
                message: 'Name too long',
                variant: 'error'
            });
        });
    });

    describe('deleting columns', () => {
        async function openDeleteModal(store) {
            const element = await mount(store);
            root(element)
                .querySelector('lightning-button-icon[data-column-id="col-2"]')
                .click();
            await flushPromises();
            return element;
        }

        it('asks for confirmation with the column name', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await openDeleteModal(store);

            expect(
                root(element).querySelector('.slds-modal__content p')
                    .textContent
            ).toBe(
                'Are you sure you want to delete "Doing"? Cards in this column will need to be reassigned.'
            );
            expect(deleteColumnAsync).not.toHaveBeenCalled();
        });

        it('closes the modal without deleting on cancel', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await openDeleteModal(store);

            buttonByLabel(element, 'Cancel').click();
            await flushPromises();

            expect(root(element).querySelector('section')).toBeNull();
            expect(deleteColumnAsync).not.toHaveBeenCalled();
        });

        it('closes the modal from the close icon', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await openDeleteModal(store);

            root(element).querySelector('button.slds-modal__close').click();
            await flushPromises();

            expect(root(element).querySelector('section')).toBeNull();
        });

        it('deletes the column on confirm', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await openDeleteModal(store);
            const toasts = listenForToasts(element);

            buttonByLabel(element, 'Delete').click();
            await flushPromises();

            expect(deleteColumnAsync).toHaveBeenCalledWith('col-2');
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_DELETE_COLUMN',
                args: ['col-2']
            });
            expect(toasts).toHaveBeenCalledWith({
                title: 'Success',
                message: 'Column deleted',
                variant: 'success'
            });
            expect(root(element).querySelector('section')).toBeNull();
        });

        it('keeps the modal open and shows an error when delete fails', async () => {
            const store = createMockStore(stateWithColumns());
            store.dispatch.mockRejectedValueOnce(new Error('Column has cards'));
            const element = await openDeleteModal(store);
            const toasts = listenForToasts(element);

            buttonByLabel(element, 'Delete').click();
            await flushPromises();

            expect(toasts).toHaveBeenCalledWith({
                title: 'Error deleting column',
                message: 'Column has cards',
                variant: 'error'
            });
            expect(root(element).querySelector('section')).not.toBeNull();
            expect(buttonByLabel(element, 'Delete').disabled).toBe(false);
        });
    });

    describe('drag and drop reordering', () => {
        function grabHandle(element, id) {
            columnItem(element, id)
                .querySelector('.drag-handle')
                .dispatchEvent(new CustomEvent('mousedown'));
        }

        async function startDrag(element, id) {
            grabHandle(element, id);
            const dataTransfer = {};
            const start = dragEvent('dragstart', dataTransfer);
            columnItem(element, id).dispatchEvent(start);
            await flushPromises();
            return { start, dataTransfer };
        }

        it('cancels a drag that does not start on the handle', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            const start = dragEvent('dragstart');
            columnItem(element, 'col-1').dispatchEvent(start);
            expect(start.defaultPrevented).toBe(true);

            // Releasing the handle also blocks the drag
            grabHandle(element, 'col-1');
            columnItem(element, 'col-1')
                .querySelector('.drag-handle')
                .dispatchEvent(new CustomEvent('mouseup'));
            const second = dragEvent('dragstart');
            columnItem(element, 'col-1').dispatchEvent(second);
            expect(second.defaultPrevented).toBe(true);

            root(element)
                .querySelector('.columns-list')
                .dispatchEvent(dragEvent('drop'));
            await flushPromises();
            expect(reorderColumnAsync).not.toHaveBeenCalled();
        });

        it('marks the dragged column after the drag starts', async () => {
            jest.useFakeTimers();
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            const { start, dataTransfer } = await startDrag(element, 'col-1');
            expect(start.defaultPrevented).toBe(false);
            expect(dataTransfer.effectAllowed).toBe('move');

            jest.runAllTimers();
            expect(
                columnItem(element, 'col-1').classList.contains('dragging')
            ).toBe(true);

            columnItem(element, 'col-1').dispatchEvent(dragEvent('dragend'));
            expect(
                columnItem(element, 'col-1').classList.contains('dragging')
            ).toBe(false);
        });

        it('tolerates the dragged column disappearing before the timer', async () => {
            jest.useFakeTimers();
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            await startDrag(element, 'col-1');
            store.setState(stateWithColumns([COLUMNS[1], COLUMNS[2]]));
            await flushPromises();

            expect(() => jest.runAllTimers()).not.toThrow();
            expect(columnItem(element, 'col-1')).toBeNull();
            expect(() =>
                columnItem(element, 'col-2').dispatchEvent(dragEvent('dragend'))
            ).not.toThrow();
        });

        it('highlights the drop target and clears it on the source', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            await startDrag(element, 'col-1');

            const enter = dragEvent('dragenter');
            columnItem(element, 'col-3').dispatchEvent(enter);
            await flushPromises();
            expect(enter.defaultPrevented).toBe(true);
            expect(
                columnItem(element, 'col-3').classList.contains('drag-over')
            ).toBe(true);

            columnItem(element, 'col-2').dispatchEvent(dragEvent('dragenter'));
            await flushPromises();
            expect(
                columnItem(element, 'col-3').classList.contains('drag-over')
            ).toBe(false);
            expect(
                columnItem(element, 'col-2').classList.contains('drag-over')
            ).toBe(true);

            columnItem(element, 'col-1').dispatchEvent(dragEvent('dragenter'));
            await flushPromises();
            expect(
                root(element).querySelectorAll('.column-item.drag-over')
            ).toHaveLength(0);

            // No target after returning to the source: drop is a no-op
            root(element)
                .querySelector('.columns-list')
                .dispatchEvent(dragEvent('drop'));
            await flushPromises();
            expect(reorderColumnAsync).not.toHaveBeenCalled();
        });

        it('allows dropping over the list', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);

            const dataTransfer = {};
            const over = dragEvent('dragover', dataTransfer);
            root(element).querySelector('.columns-list').dispatchEvent(over);

            expect(over.defaultPrevented).toBe(true);
            expect(dataTransfer.dropEffect).toBe('move');
        });

        it('reorders columns on drop', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            await startDrag(element, 'col-1');

            columnItem(element, 'col-3').dispatchEvent(dragEvent('dragenter'));
            const drop = dragEvent('drop');
            root(element).querySelector('.columns-list').dispatchEvent(drop);
            await flushPromises();

            expect(drop.defaultPrevented).toBe(true);
            expect(reorderColumnAsync).toHaveBeenCalledTimes(1);
            const [columnId, newIndex, reordered] =
                reorderColumnAsync.mock.calls[0];
            expect(columnId).toBe('col-1');
            expect(newIndex).toBe(2);
            expect(reordered.map((c) => c.Id)).toEqual([
                'col-2',
                'col-3',
                'col-1'
            ]);
            // Raw store columns are passed, not the UI-enriched copies
            expect(reordered[0]).toBe(COLUMNS[1]);
            expect(store.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'MOCK_REORDER_COLUMN' })
            );

            columnItem(element, 'col-1').dispatchEvent(dragEvent('dragend'));
            await flushPromises();
            expect(
                root(element).querySelectorAll('.column-item.drag-over')
            ).toHaveLength(0);
        });

        it('skips the drop if the dragged column was removed', async () => {
            const store = createMockStore(stateWithColumns());
            const element = await mount(store);
            await startDrag(element, 'col-1');
            columnItem(element, 'col-2').dispatchEvent(dragEvent('dragenter'));

            store.setState(stateWithColumns([COLUMNS[1], COLUMNS[2]]));
            await flushPromises();
            root(element)
                .querySelector('.columns-list')
                .dispatchEvent(dragEvent('drop'));
            await flushPromises();

            expect(reorderColumnAsync).not.toHaveBeenCalled();
        });

        it('shows an error toast when reordering fails', async () => {
            const store = createMockStore(stateWithColumns());
            store.dispatch.mockRejectedValueOnce(new Error('Lock failed'));
            const element = await mount(store);
            const toasts = listenForToasts(element);
            await startDrag(element, 'col-2');

            columnItem(element, 'col-1').dispatchEvent(dragEvent('dragenter'));
            root(element)
                .querySelector('.columns-list')
                .dispatchEvent(dragEvent('drop'));
            await flushPromises();

            expect(reorderColumnAsync.mock.calls[0][0]).toBe('col-2');
            expect(reorderColumnAsync.mock.calls[0][1]).toBe(0);
            expect(toasts).toHaveBeenCalledWith({
                title: 'Error reordering column',
                message: 'Lock failed',
                variant: 'error'
            });
        });
    });
});
