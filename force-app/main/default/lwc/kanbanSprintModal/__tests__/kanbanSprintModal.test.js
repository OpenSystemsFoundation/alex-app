import { createElement } from 'lwc';
import KanbanSprintModal from 'c/kanbanSprintModal';
import { createSprintAsync, startSprintAsync } from 'c/kanbanStore';

jest.mock('c/kanbanStore', () => {
    const actual = jest.requireActual('c/kanbanStore');
    return {
        ...actual,
        createSprintAsync: jest.fn((boardId, goal, startDate, endDate) => ({
            type: 'MOCK_CREATE_SPRINT',
            boardId,
            goal,
            startDate,
            endDate
        })),
        startSprintAsync: jest.fn((sprintId) => ({
            type: 'MOCK_START_SPRINT',
            sprintId
        }))
    };
});

async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

/** Today in UTC as YYYY-MM-DD (matches the component's ISO-based default). */
function utcToday() {
    return new Date().toISOString().split('T')[0];
}

/** Add days to a YYYY-MM-DD string using pure UTC arithmetic. */
function utcAddDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

function createMockStore() {
    return { dispatch: jest.fn(() => Promise.resolve({ sprint: null })) };
}

function mount(props = {}) {
    const element = createElement('c-kanban-sprint-modal', {
        is: KanbanSprintModal
    });
    Object.assign(element, { isOpen: true, boardId: 'board-1', ...props });
    document.body.appendChild(element);
    return element;
}

const root = (element) => element.shadowRoot;
const title = (element) => root(element).querySelector('h2').textContent.trim();
const footerButton = (element, label) =>
    [...root(element).querySelectorAll('.slds-modal__footer button')].find(
        (b) => b.textContent.trim() === label
    );
const dateInput = (element, label) =>
    [...root(element).querySelectorAll('lightning-input')].find(
        (i) => i.label === label
    );
const durationCombo = (element) =>
    root(element).querySelector('lightning-combobox');

function changeInput(input, value) {
    input.value = value;
    input.dispatchEvent(new CustomEvent('change'));
}

const planningSprint = {
    Id: 'sprint-1',
    status: 'Planning',
    goal: 'Existing goal',
    startDate: '2026-01-05',
    endDate: '2026-01-19'
};

describe('c-kanban-sprint-modal', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders nothing when closed', async () => {
        const element = mount({ isOpen: false });
        await flushPromises();

        expect(root(element).querySelector('section')).toBeNull();
    });

    describe('create mode', () => {
        it('defaults to today and a two week duration', async () => {
            const element = mount();
            await flushPromises();

            const today = utcToday();
            expect(title(element)).toBe('Create Sprint');
            expect(dateInput(element, 'Start Date').value).toBe(today);
            expect(dateInput(element, 'End Date').value).toBe(
                utcAddDays(today, 14)
            );
            expect(durationCombo(element).value).toBe('14');
            expect(durationCombo(element).options.map((o) => o.value)).toEqual([
                '7',
                '14',
                '21',
                '28',
                'custom'
            ]);
            expect(footerButton(element, 'Create')).toBeDefined();
            expect(footerButton(element, 'Start Sprint')).toBeUndefined();
        });

        it('uses the board default duration', async () => {
            const element = mount({ defaultDurationDays: 21 });
            await flushPromises();

            expect(durationCombo(element).value).toBe('21');
            expect(dateInput(element, 'End Date').value).toBe(
                utcAddDays(utcToday(), 21)
            );
        });

        it('selects custom duration for non-standard board defaults', async () => {
            const element = mount({ defaultDurationDays: 10 });
            await flushPromises();

            expect(durationCombo(element).value).toBe('custom');
            expect(dateInput(element, 'End Date').value).toBe(
                utcAddDays(utcToday(), 10)
            );
        });

        it('falls back to 14 days when the default duration is empty', async () => {
            const element = mount({ defaultDurationDays: 0 });
            await flushPromises();

            expect(durationCombo(element).value).toBe('14');
            expect(dateInput(element, 'End Date').value).toBe(
                utcAddDays(utcToday(), 14)
            );
        });

        it('creates a sprint with the entered values', async () => {
            const store = createMockStore();
            store.dispatch.mockResolvedValueOnce({
                sprint: { Id: 'new-sprint' }
            });
            const element = mount({ store });
            const created = jest.fn();
            const closed = jest.fn();
            element.addEventListener('sprintcreated', created);
            element.addEventListener('close', closed);
            await flushPromises();

            changeInput(
                root(element).querySelector('lightning-textarea'),
                'Deliver MVP'
            );
            changeInput(dateInput(element, 'Start Date'), '2026-03-02');
            await flushPromises();
            expect(dateInput(element, 'End Date').value).toBe('2026-03-16');

            footerButton(element, 'Create').click();
            await flushPromises();

            expect(createSprintAsync).toHaveBeenCalledWith(
                'board-1',
                'Deliver MVP',
                '2026-03-02',
                '2026-03-16'
            );
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_CREATE_SPRINT',
                boardId: 'board-1',
                goal: 'Deliver MVP',
                startDate: '2026-03-02',
                endDate: '2026-03-16'
            });
            expect(created).toHaveBeenCalledTimes(1);
            expect(created.mock.calls[0][0].detail).toEqual({
                sprint: { Id: 'new-sprint' }
            });
            expect(closed).toHaveBeenCalledTimes(1);
        });

        it('shows a saving label and ignores repeat clicks while saving', async () => {
            const store = createMockStore();
            let resolveDispatch;
            store.dispatch.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveDispatch = resolve;
                })
            );
            const element = mount({ store });
            await flushPromises();

            const save = footerButton(element, 'Create');
            save.click();
            save.click();
            await flushPromises();

            expect(store.dispatch).toHaveBeenCalledTimes(1);
            expect(save.textContent.trim()).toBe('Saving...');
            expect(save.disabled).toBe(true);

            resolveDispatch({ sprint: { Id: 'x' } });
            await flushPromises();
            expect(save.textContent.trim()).toBe('Create');
            expect(save.disabled).toBe(false);
        });

        it('keeps the modal open when creation fails', async () => {
            const store = createMockStore();
            store.dispatch.mockRejectedValueOnce(new Error('Apex down'));
            const consoleError = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const element = mount({ store });
            const created = jest.fn();
            const closed = jest.fn();
            element.addEventListener('sprintcreated', created);
            element.addEventListener('close', closed);
            await flushPromises();

            footerButton(element, 'Create').click();
            await flushPromises();

            expect(created).not.toHaveBeenCalled();
            expect(closed).not.toHaveBeenCalled();
            expect(consoleError).toHaveBeenCalledWith(
                'Error creating sprint:',
                expect.any(Error)
            );
            expect(footerButton(element, 'Create').disabled).toBe(false);
            consoleError.mockRestore();
        });

        it('does not save without a store', async () => {
            const element = mount();
            const created = jest.fn();
            element.addEventListener('sprintcreated', created);
            await flushPromises();

            footerButton(element, 'Create').click();
            await flushPromises();

            expect(createSprintAsync).not.toHaveBeenCalled();
            expect(created).not.toHaveBeenCalled();
        });
    });

    describe('date and duration handling', () => {
        it('recalculates the end date when a preset duration is chosen', async () => {
            const element = mount({ sprint: planningSprint });
            await flushPromises();

            durationCombo(element).dispatchEvent(
                new CustomEvent('change', { detail: { value: '28' } })
            );
            await flushPromises();

            expect(durationCombo(element).value).toBe('28');
            expect(dateInput(element, 'End Date').value).toBe('2026-02-02');
        });

        it('leaves the end date alone for custom duration', async () => {
            const element = mount({ sprint: planningSprint });
            await flushPromises();

            durationCombo(element).dispatchEvent(
                new CustomEvent('change', { detail: { value: 'custom' } })
            );
            changeInput(dateInput(element, 'Start Date'), '2026-01-07');
            await flushPromises();

            expect(durationCombo(element).value).toBe('custom');
            expect(dateInput(element, 'Start Date').value).toBe('2026-01-07');
            expect(dateInput(element, 'End Date').value).toBe('2026-01-19');
        });

        it('does not compute an end date when start date is cleared', async () => {
            const element = mount({ sprint: planningSprint });
            await flushPromises();

            changeInput(dateInput(element, 'Start Date'), '');
            durationCombo(element).dispatchEvent(
                new CustomEvent('change', { detail: { value: '7' } })
            );
            await flushPromises();

            expect(dateInput(element, 'End Date').value).toBe('2026-01-19');
            expect(durationCombo(element).value).toBe('7');
        });

        it('syncs the duration from a manually chosen end date', async () => {
            const element = mount({ sprint: planningSprint });
            await flushPromises();

            changeInput(dateInput(element, 'End Date'), '2026-01-12');
            await flushPromises();
            expect(durationCombo(element).value).toBe('7');

            changeInput(dateInput(element, 'End Date'), '2026-01-15');
            await flushPromises();
            expect(durationCombo(element).value).toBe('custom');
        });

        it('skips duration sync when the end date is cleared', async () => {
            const element = mount({ sprint: planningSprint });
            await flushPromises();

            changeInput(dateInput(element, 'End Date'), '');
            await flushPromises();

            expect(durationCombo(element).value).toBe('14');
            expect(footerButton(element, 'Start Sprint').disabled).toBe(true);
        });
    });

    describe('edit mode', () => {
        it('prefills fields from the sprint', async () => {
            const element = mount({
                sprint: { ...planningSprint, endDate: '2026-01-26' }
            });
            await flushPromises();

            expect(title(element)).toBe('Edit Sprint');
            expect(
                root(element).querySelector('lightning-textarea').value
            ).toBe('Existing goal');
            expect(dateInput(element, 'Start Date').value).toBe('2026-01-05');
            expect(dateInput(element, 'End Date').value).toBe('2026-01-26');
            expect(durationCombo(element).value).toBe('21');
            expect(footerButton(element, 'Save')).toBeDefined();
            expect(footerButton(element, 'Start Sprint')).toBeDefined();
        });

        it('defaults dates when the sprint has none', async () => {
            const element = mount({
                sprint: { Id: 'sprint-2', status: 'Planning' },
                defaultDurationDays: 7
            });
            await flushPromises();

            const today = utcToday();
            expect(
                root(element).querySelector('lightning-textarea').value
            ).toBe('');
            expect(dateInput(element, 'Start Date').value).toBe(today);
            expect(dateInput(element, 'End Date').value).toBe(
                utcAddDays(today, 7)
            );
            expect(durationCombo(element).value).toBe('7');
        });

        it('keeps a start date without end date as-is', async () => {
            const element = mount({
                sprint: {
                    Id: 'sprint-3',
                    status: 'Planning',
                    startDate: '2026-02-01'
                }
            });
            await flushPromises();

            expect(dateInput(element, 'Start Date').value).toBe('2026-02-01');
            expect(dateInput(element, 'End Date').value).toBe('');
            expect(footerButton(element, 'Start Sprint').disabled).toBe(true);
        });

        it('hides Start Sprint when another sprint is active', async () => {
            const element = mount({
                sprint: planningSprint,
                hasActiveSprint: true
            });
            await flushPromises();

            expect(footerButton(element, 'Start Sprint')).toBeUndefined();
        });

        it('hides Start Sprint for sprints not in planning', async () => {
            const element = mount({
                sprint: { ...planningSprint, status: 'Active' }
            });
            await flushPromises();

            expect(footerButton(element, 'Start Sprint')).toBeUndefined();
        });

        it('starts the sprint and closes', async () => {
            const store = createMockStore();
            const element = mount({ store, sprint: planningSprint });
            const started = jest.fn();
            const closed = jest.fn();
            element.addEventListener('sprintstarted', started);
            element.addEventListener('close', closed);
            await flushPromises();

            footerButton(element, 'Start Sprint').click();
            await flushPromises();

            expect(startSprintAsync).toHaveBeenCalledWith('sprint-1');
            expect(store.dispatch).toHaveBeenCalledWith({
                type: 'MOCK_START_SPRINT',
                sprintId: 'sprint-1'
            });
            expect(started).toHaveBeenCalledTimes(1);
            expect(closed).toHaveBeenCalledTimes(1);
        });

        it('shows a starting label while the sprint starts', async () => {
            const store = createMockStore();
            let resolveDispatch;
            store.dispatch.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveDispatch = resolve;
                })
            );
            const element = mount({ store, sprint: planningSprint });
            await flushPromises();

            const start = footerButton(element, 'Start Sprint');
            start.click();
            start.click();
            await flushPromises();

            expect(store.dispatch).toHaveBeenCalledTimes(1);
            expect(start.textContent.trim()).toBe('Starting...');
            expect(start.disabled).toBe(true);
            expect(footerButton(element, 'Saving...').disabled).toBe(true);

            resolveDispatch();
            await flushPromises();
            expect(start.textContent.trim()).toBe('Start Sprint');
        });

        it('stays open when starting the sprint fails', async () => {
            const store = createMockStore();
            store.dispatch.mockRejectedValueOnce(new Error('Already active'));
            const consoleError = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const element = mount({ store, sprint: planningSprint });
            const started = jest.fn();
            const closed = jest.fn();
            element.addEventListener('sprintstarted', started);
            element.addEventListener('close', closed);
            await flushPromises();

            footerButton(element, 'Start Sprint').click();
            await flushPromises();

            expect(started).not.toHaveBeenCalled();
            expect(closed).not.toHaveBeenCalled();
            expect(consoleError).toHaveBeenCalledWith(
                'Error starting sprint:',
                expect.any(Error)
            );
            expect(footerButton(element, 'Start Sprint').disabled).toBe(false);
            consoleError.mockRestore();
        });

        it('does not start the sprint without a store', async () => {
            const element = mount({ sprint: planningSprint });
            const started = jest.fn();
            element.addEventListener('sprintstarted', started);
            await flushPromises();

            footerButton(element, 'Start Sprint').click();
            await flushPromises();

            expect(startSprintAsync).not.toHaveBeenCalled();
            expect(started).not.toHaveBeenCalled();
        });
    });

    describe('closing', () => {
        it('dispatches close from the Cancel and X buttons', async () => {
            const element = mount();
            const closed = jest.fn();
            element.addEventListener('close', closed);
            await flushPromises();

            footerButton(element, 'Cancel').click();
            root(element).querySelector('button[title="Close"]').click();

            expect(closed).toHaveBeenCalledTimes(2);
        });

        it('closes on Escape but not other keys', async () => {
            const element = mount();
            const closed = jest.fn();
            element.addEventListener('close', closed);
            await flushPromises();

            const section = root(element).querySelector('section');
            section.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter' })
            );
            expect(closed).not.toHaveBeenCalled();

            section.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' })
            );
            expect(closed).toHaveBeenCalledTimes(1);
        });
    });
});
