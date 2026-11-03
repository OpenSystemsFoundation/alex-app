/**
 * Component tests for c-kanban-backlog-view
 *
 * Renders the backlog view against a minimal fake store (real selectors,
 * mocked thunk creators) and drives it through its child components and DOM.
 */
import { createElement } from 'lwc';
import KanbanBacklogView from 'c/kanbanBacklogView';

jest.mock('c/kanbanStore', () => {
    const selectors = jest.requireActual('../../kanbanStore/state/selectors');
    const thunk =
        (type) =>
        (...args) => ({ type, args });
    return {
        selectors,
        setSelectedBacklogCards: jest.fn(thunk('setSelectedBacklogCards')),
        toggleBacklogCardSelection: jest.fn(
            thunk('toggleBacklogCardSelection')
        ),
        createBacklogCardAsync: jest.fn(thunk('createBacklogCard')),
        updateBacklogCardAsync: jest.fn(thunk('updateBacklogCard')),
        deleteBacklogCardsAsync: jest.fn(thunk('deleteBacklogCards')),
        moveCardsToSprintAsync: jest.fn(thunk('moveCardsToSprint')),
        createSprintAsync: jest.fn(thunk('createSprint')),
        deleteSprintAsync: jest.fn(thunk('deleteSprint')),
        reorderSprintAsync: jest.fn(thunk('reorderSprint')),
        addCardsToBacklogSprintAsync: jest.fn(thunk('addCardsToBacklogSprint')),
        bulkMoveBacklogCardsAsync: jest.fn(thunk('bulkMoveBacklogCards')),
        reorderBacklogCardAsync: jest.fn(thunk('reorderBacklogCard')),
        moveCardAsync: jest.fn(thunk('moveCard')),
        removeCardFromBacklogSprintAsync: jest.fn(
            thunk('removeCardFromBacklogSprint')
        ),
        bulkReorderBacklogCardsAtIndexAsync: jest.fn(
            thunk('bulkReorderBacklogCardsAtIndex')
        )
    };
});

// Let pending promises and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

// ─── Fixtures ─────────────────────────────────────────────

function makeState(overrides = {}) {
    return {
        boardId: 'b1',
        board: { type: 'Sprint' },
        backlogCards: [
            {
                Id: 'c1',
                Name: 'C-1',
                subject: 'Login page',
                cardType: 'Story',
                priority: 'High',
                storyPoints: 3,
                needsRefinement: true,
                assigneeId: 'u1',
                assignee: { id: 'u1', name: 'Zed' },
                color: '#ff0000',
                epicId: 'e1',
                position: '0|aaa'
            },
            {
                Id: 'c2',
                Name: 'C-2',
                subject: 'Fix crash',
                cardType: 'Bug',
                priority: 'Low',
                storyPoints: 2,
                assignee: { name: ' amy ' },
                epic: { id: 'e2' }
            },
            { Id: 'c3', Name: 'C-3', subject: null, cardType: 'Task' },
            {
                Id: 'c4',
                Name: 'C-4',
                subject: 'Sprint item',
                cardType: 'Story',
                priority: 'Medium',
                storyPoints: 5,
                assignee: { id: 'u1', name: 'Zed' }
            },
            {
                Id: 'c5',
                assignee: { id: 'u9', name: '   ' }
            }
        ],
        sprints: [
            { Id: 's1', Name: 'Plan A', status: 'Planning', goal: 'Ship' },
            { Id: 's2', sprintNumber: 4, status: 'Planning' },
            { Id: 'sx', Name: 'Old', status: 'Completed' }
        ],
        planningSprintCards: [
            { sprintId: 's1', cardId: 'c4' },
            { sprintId: 's1', cardId: 'ghost' }
        ],
        activeSprint: null,
        sprintCards: [],
        columns: [],
        selectedBacklogCards: [],
        epicSummaries: [],
        backlogSyncing: 0,
        ...overrides
    };
}

function activeSprintState(overrides = {}) {
    return makeState({
        activeSprint: {
            Id: 'a1',
            Name: 'Live Sprint',
            goal: 'Go live',
            totalStoryPoints: 10,
            completedStoryPoints: 4
        },
        sprintCards: [
            { cardId: 'k1', completedInSprint: true },
            { cardId: 'k2' }
        ],
        columns: [
            {
                Id: 'col1',
                columnHeader: 'To Do',
                cards: [
                    { Id: 'k1', Name: 'K-1', priority: 'High' },
                    { Id: 'notInSprint', Name: 'X' }
                ]
            },
            { Id: 'col2', Name: 'Doing', cards: [{ Id: 'k2', Name: 'K-2' }] },
            { Id: 'col3', name: 'done' }
        ],
        ...overrides
    });
}

function createFakeStore(initialState) {
    let state = initialState;
    const listeners = new Set();
    return {
        listeners,
        getState: () => state,
        subscribe: jest.fn((fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }),
        dispatch: jest.fn(() => Promise.resolve()),
        setState(next) {
            state = next;
            listeners.forEach((fn) => fn(state));
        }
    };
}

async function render(state = makeState(), props = {}) {
    const store = state ? createFakeStore(state) : null;
    const element = createElement('c-kanban-backlog-view', {
        is: KanbanBacklogView
    });
    element.store = store;
    Object.assign(element, props);
    document.body.appendChild(element);
    await flushPromises();
    return { element, store };
}

// ─── Query helpers ────────────────────────────────────────

const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];

function filterBar(el) {
    return $(el, 'c-kanban-filter-bar');
}

function contextMenu(el) {
    return $(el, 'c-kanban-context-menu');
}

function rowIds(el) {
    return $$(el, '.backlog-row[data-card-id]').map((r) => r.dataset.cardId);
}

function row(el, cardId) {
    return $(el, `.backlog-row[data-card-id="${cardId}"]`);
}

function header(el, sprintId) {
    return $(el, `.sprint-header-row[data-sprint-id="${sprintId}"]`);
}

function buttonByLabel(el, label) {
    return $$(el, 'lightning-button').find((b) => b.label === label);
}

function actions(store) {
    return store.dispatch.mock.calls.map(([a]) => a);
}

function actionTypes(store) {
    return actions(store).map((a) => a.type);
}

async function fireFilter(el, name, value) {
    filterBar(el).dispatchEvent(new CustomEvent(name, { detail: { value } }));
    await flushPromises();
}

function captureEvents(element, name) {
    const handler = jest.fn();
    element.addEventListener(name, handler);
    return handler;
}

function errorMessages(handler) {
    return handler.mock.calls.map(([e]) => e.detail.message);
}

function rejectFor(store, type) {
    store.dispatch.mockImplementation((a) => {
        if (a.type === type) {
            return Promise.reject(new Error('fail'));
        }
        return Promise.resolve();
    });
}

// ─── Tests ────────────────────────────────────────────────

describe('c-kanban-backlog-view', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.useRealTimers();
    });

    describe('without a store', () => {
        it('renders the empty state and default filter bar props', async () => {
            const { element } = await render(null);

            expect($(element, 'h3').textContent).toContain('No backlog cards');
            expect(rowIds(element)).toEqual([]);
            const bar = filterBar(element);
            expect(bar.infoText).toBe('0 cards | 0 pts');
            expect(bar.showInfoText).toBe(true);
            expect(bar.showBusyState).toBe(false);
            expect(bar.showNewSprint).toBe(false);
            expect(bar.showEpicFilter).toBe(false);
            expect(bar.showAssigneeFilter).toBe(false);
            expect(bar.assigneeOptions).toEqual([]);
            expect(bar.epicOptions).toEqual([
                { label: 'All Epics', value: 'All' }
            ]);
        });

        it('ignores create actions and filter changes when there is no store', async () => {
            const { element } = await render(null);
            const errors = captureEvents(element, 'error');

            buttonByLabel(element, 'Create Card').click();
            await flushPromises();
            const input = $(element, '.create-input');
            input.value = 'Something';
            input.dispatchEvent(new CustomEvent('change'));
            await flushPromises();
            buttonByLabel(element, 'Save').click();

            await fireFilter(element, 'createsprint');
            buttonByLabel(element, 'Create Sprint').click();
            await fireFilter(element, 'searchinput', 'abc');
            await flushPromises();

            expect(errors).not.toHaveBeenCalled();
            expect(filterBar(element).showClearFilters).toBe(true);
            expect($(element, 'h3')).toBeNull();
        });
    });

    describe('store subscription', () => {
        it('subscribes on connect, re-renders on updates and unsubscribes on disconnect', async () => {
            const { element, store } = await render(
                makeState({ backlogCards: [], sprints: [] })
            );
            expect(store.subscribe).toHaveBeenCalledTimes(1);
            expect($(element, 'h3')).not.toBeNull();

            store.setState(makeState());
            await flushPromises();
            expect(rowIds(element)).toEqual(['c4', 'c1', 'c2', 'c3', 'c5']);

            document.body.removeChild(element);
            expect(store.listeners.size).toBe(0);
        });
    });

    describe('sections', () => {
        it('renders planning sprint sections before the ungrouped backlog', async () => {
            const { element } = await render();

            const labels = $$(element, '.sprint-header__label strong').map(
                (s) => s.textContent
            );
            expect(labels).toEqual(['Plan A', 'Sprint 4', 'Backlog']);
            expect($(element, '.sprint-header__goal').textContent).toContain(
                'Ship'
            );
            expect(row(element, 'c4').dataset.sprintId).toBe('s1');
            // Ungrouped rows have no sprint id attribute
            expect(row(element, 'c1').dataset.sprintId).toBeUndefined();
            expect(row(element, 'c1').getAttribute('style')).toContain(
                'border-left: 3px solid'
            );
            const stats = $$(element, '.sprint-header__stats').map((s) =>
                s.textContent.replace(/\s+/g, ' ').trim()
            );
            expect(stats).toEqual([
                '1 cards • 5 pts',
                '0 cards • 0 pts',
                '4 cards • 5 pts'
            ]);
        });

        it('renders badges, refinement state and priority classes for cards', async () => {
            const { element } = await render();
            const c1 = row(element, 'c1');
            const c3 = row(element, 'c3');

            expect(
                c1.querySelector('.backlog-cell--priority span').className
            ).toContain('priority-high');
            expect(c3.querySelector('.backlog-cell--priority span')).toBeNull();
            expect(
                c1.querySelector('.refinement-toggle lightning-icon').iconName
            ).toBe('utility:search');
            expect(
                c3.querySelector('.refinement-toggle lightning-icon').iconName
            ).toBe('utility:dash');
            expect(
                c1.querySelector('.backlog-cell--status span').textContent
            ).toBe('Backlog');
            expect(
                c1.querySelector('.backlog-cell--assignee').textContent.trim()
            ).toBe('Zed');
            expect(c1.querySelector('a').getAttribute('href')).toBe(
                '/lightning/r/OpenSF__Card__c/c1/view'
            );
        });

        it('collapses and expands sections when clicking headers', async () => {
            const { element } = await render();

            header(element, 's1').click();
            await flushPromises();
            expect(rowIds(element)).not.toContain('c4');
            expect(
                header(element, 's1').querySelector('lightning-icon').iconName
            ).toBe('utility:chevronright');

            header(element, 'ungrouped').click();
            await flushPromises();
            expect(rowIds(element)).toEqual([]);

            header(element, 's1').click();
            header(element, 'ungrouped').click();
            await flushPromises();
            expect(rowIds(element)).toEqual(['c4', 'c1', 'c2', 'c3', 'c5']);
        });

        it('shows the active sprint section with cards from board columns', async () => {
            const { element } = await render(activeSprintState());

            const activeHeader = header(element, 'a1');
            expect(activeHeader.textContent).toContain('Live Sprint');
            expect(activeHeader.textContent).toContain('Go live');
            expect(activeHeader.textContent).toContain('Active');
            expect(
                activeHeader.querySelector('.sprint-header__stats').textContent
            ).toMatch(/2\s+cards\s+•\s+10\s+pts/);

            const k1 = row(element, 'k1');
            expect(k1.dataset.sprintId).toBe('a1');
            expect(
                k1.querySelector('.backlog-cell--status span').textContent
            ).toBe('To Do');
            expect(
                row(element, 'k2').querySelector('.backlog-cell--status span')
                    .textContent
            ).toBe('Doing');
            expect(row(element, 'notInSprint')).toBeNull();

            // Planning sprints cannot be started while one is active
            expect($(element, '.sprint-action-btn--start')).toBeNull();
            expect($(element, '.sprint-action-btn--complete')).not.toBeNull();
        });

        it('handles an unnamed active sprint with no goal and collapses it', async () => {
            const { element } = await render(
                activeSprintState({
                    activeSprint: { Id: 'a1' },
                    sprintCards: undefined,
                    columns: undefined
                })
            );
            const activeHeader = header(element, 'a1');
            expect(
                activeHeader.querySelector('strong').textContent.trim()
            ).toBe('Sprint');
            expect(activeHeader.querySelector('.sprint-header__goal')).toBe(
                null
            );

            activeHeader.click();
            await flushPromises();
            expect(
                header(element, 'a1').querySelector('lightning-icon').iconName
            ).toBe('utility:chevronright');
        });

        it('hides active sprint cards when collapsed and names sprint by number', async () => {
            const { element } = await render(
                activeSprintState({
                    activeSprint: { Id: 'a1', sprintNumber: 9 }
                })
            );
            expect(header(element, 'a1').textContent).toContain('Sprint 9');
            expect(row(element, 'k1')).not.toBeNull();

            header(element, 'a1').click();
            await flushPromises();
            expect(row(element, 'k1')).toBeNull();
        });

        it('renders debug positions when showDebugInfo is set', async () => {
            const { element } = await render(makeState(), {
                showDebugInfo: true
            });
            expect(
                row(element, 'c1')
                    .querySelector('.backlog-cell--debug')
                    .textContent.trim()
            ).toBe('0|aaa');
            expect(
                row(element, 'c2').querySelector('.backlog-cell--debug em')
                    .textContent
            ).toBe('null');
        });

        it('shows the table when only planning sprints exist', async () => {
            const { element } = await render(makeState({ backlogCards: [] }));
            expect($(element, 'h3')).toBeNull();
            expect(header(element, 's1')).not.toBeNull();
        });
    });

    describe('filter bar', () => {
        it('passes derived props to the filter bar', async () => {
            const { element } = await render(
                makeState({
                    epicSummaries: [{ id: 'e1', subject: 'Auth' }, { id: 'e2' }]
                })
            );
            const bar = filterBar(element);

            expect(bar.infoText).toBe('5 cards | 10 pts');
            expect(bar.showNewSprint).toBe(true);
            expect(bar.showClearFilters).toBe(false);
            expect(bar.showEpicFilter).toBe(true);
            expect(bar.epicOptions).toEqual([
                { label: 'All Epics', value: 'All' },
                { label: 'Auth', value: 'e1' },
                { label: 'Untitled Epic', value: 'e2' },
                { label: 'No Epic', value: '__none__' }
            ]);
            expect(bar.showAssigneeFilter).toBe(true);
            expect(bar.assigneeOptions).toEqual([
                { label: 'amy', value: 'name:amy' },
                { label: 'Zed', value: 'u1' }
            ]);
            expect(bar.viewOptions.map((o) => o.value)).toEqual([
                'all',
                'refinement'
            ]);
            expect(bar.priorityOptions).toHaveLength(6);
            expect(bar.cardTypeOptions).toHaveLength(5);
        });

        it('reports busy state while backlog is syncing on a non-sprint board', async () => {
            const { element } = await render(
                makeState({ backlogSyncing: 2, board: { type: 'Kanban' } })
            );
            const bar = filterBar(element);
            expect(bar.showBusyState).toBe(true);
            expect(bar.showInfoText).toBe(false);
            expect(bar.showNewSprint).toBe(false);
        });

        it('filters by search term across subject, name and type', async () => {
            const { element } = await render();

            await fireFilter(element, 'searchinput', 'login');
            expect(rowIds(element)).toEqual(['c1']);
            expect(filterBar(element).infoText).toBe('1 of 5 cards | 3 pts');
            expect(filterBar(element).showClearFilters).toBe(true);

            await fireFilter(element, 'searchinput', 'c-2');
            expect(rowIds(element)).toEqual(['c2']);

            await fireFilter(element, 'searchinput', 'TASK');
            expect(rowIds(element)).toEqual(['c3']);
        });

        it('falls back to the event target value, then to empty string', async () => {
            const { element } = await render();
            const bar = filterBar(element);

            bar.value = 'fix';
            bar.dispatchEvent(new CustomEvent('searchinput'));
            await flushPromises();
            expect(rowIds(element)).toEqual(['c2']);

            delete bar.value;
            bar.dispatchEvent(new CustomEvent('searchinput'));
            await flushPromises();
            expect(rowIds(element)).toHaveLength(5);
        });

        it('filters by priority and card type', async () => {
            const { element } = await render();

            await fireFilter(element, 'prioritychange', 'High');
            expect(rowIds(element)).toEqual(['c1']);

            await fireFilter(element, 'prioritychange', 'All');
            await fireFilter(element, 'cardtypechange', 'Story');
            expect(rowIds(element)).toEqual(['c4', 'c1']);
        });

        it('filters by epic id, nested epic id and no epic', async () => {
            const { element } = await render();

            await fireFilter(element, 'epicchange', 'e1');
            expect(rowIds(element)).toEqual(['c1']);

            await fireFilter(element, 'epicchange', 'e2');
            expect(rowIds(element)).toEqual(['c2']);

            await fireFilter(element, 'epicchange', '__none__');
            expect(rowIds(element)).toEqual(['c4', 'c3', 'c5']);
        });

        it('filters by assignee and ignores non-array assignee values', async () => {
            const { element } = await render();

            await fireFilter(element, 'assigneechange', ['u1']);
            expect(rowIds(element)).toEqual(['c4', 'c1']);

            await fireFilter(element, 'assigneechange', ['name:amy']);
            expect(rowIds(element)).toEqual(['c2']);

            await fireFilter(element, 'assigneechange', 'u1');
            expect(rowIds(element)).toHaveLength(5);
            expect(filterBar(element).assigneeValue).toEqual([]);
        });

        it('switches to refinement view and recomputes assignee options', async () => {
            const { element } = await render();

            await fireFilter(element, 'viewchange', 'refinement');
            expect(rowIds(element)).toEqual(['c1']);
            expect(filterBar(element).assigneeOptions).toEqual([
                { label: 'Zed', value: 'u1' }
            ]);
            expect(filterBar(element).showClearFilters).toBe(true);
        });

        it('clears all filters and the current selection', async () => {
            const { element, store } = await render(
                makeState({ selectedBacklogCards: ['c1'] })
            );
            await fireFilter(element, 'prioritychange', 'Low');
            expect(rowIds(element)).toEqual(['c2']);
            expect(actions(store)).toContainEqual({
                type: 'setSelectedBacklogCards',
                args: [[]]
            });

            store.dispatch.mockClear();
            await fireFilter(element, 'clearfilters');
            expect(rowIds(element)).toHaveLength(5);
            expect(filterBar(element).showClearFilters).toBe(false);
            expect(actionTypes(store)).toEqual(['setSelectedBacklogCards']);
        });

        it('does not dispatch a selection reset when nothing is selected', async () => {
            const { element, store } = await render();
            await fireFilter(element, 'cardtypechange', 'Bug');
            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('create card form', () => {
        it('opens the form, focuses the input and creates a card on save', async () => {
            jest.useFakeTimers();
            const { element, store } = await render();

            await fireFilter(element, 'createcard');
            const input = $(element, '.create-input');
            const focusSpy = jest.spyOn(input, 'focus');
            jest.runOnlyPendingTimers();
            expect(focusSpy).toHaveBeenCalled();

            expect(buttonByLabel(element, 'Save').disabled).toBe(true);
            input.value = 'New card';
            input.dispatchEvent(new CustomEvent('change'));
            await flushPromises();
            expect(buttonByLabel(element, 'Save').disabled).toBe(false);

            buttonByLabel(element, 'Save').click();
            await flushPromises();

            expect(actions(store)).toEqual([
                {
                    type: 'createBacklogCard',
                    args: ['b1', { subject: 'New card' }]
                }
            ]);
            // Form stays open with a cleared subject
            expect($(element, '.create-input').value).toBe('');
        });

        it('skips focusing when the form is closed before the timer fires', async () => {
            jest.useFakeTimers();
            const { element } = await render();

            await fireFilter(element, 'createcard');
            await fireFilter(element, 'createcard');
            expect(() => jest.runOnlyPendingTimers()).not.toThrow();
            expect($(element, '.create-input')).toBeNull();
        });

        it('submits on Enter, closes on Escape and ignores other keys', async () => {
            const { element, store } = await render();
            await fireFilter(element, 'createcard');
            const input = $(element, '.create-input');
            input.value = 'Typed';
            input.dispatchEvent(new CustomEvent('change'));

            const enter = new KeyboardEvent('keydown', { key: 'Enter' });
            const preventSpy = jest.spyOn(enter, 'preventDefault');
            input.dispatchEvent(enter);
            await flushPromises();
            expect(preventSpy).toHaveBeenCalled();
            expect(actionTypes(store)).toEqual(['createBacklogCard']);

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
            await flushPromises();
            expect($(element, '.create-input')).not.toBeNull();

            $(element, '.create-input').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' })
            );
            await flushPromises();
            expect($(element, '.create-input')).toBeNull();
        });

        it('dispatches an error event when card creation fails', async () => {
            const { element, store } = await render();
            rejectFor(store, 'createBacklogCard');
            const errors = captureEvents(element, 'error');

            await fireFilter(element, 'createcard');
            const input = $(element, '.create-input');
            input.value = 'Broken';
            input.dispatchEvent(new CustomEvent('change'));
            buttonByLabel(element, 'Save').click();
            await flushPromises();

            expect(errorMessages(errors)).toEqual(['Failed to create card']);
            expect($(element, '.create-input').value).toBe('Broken');
        });

        it('does not create a card without a board id', async () => {
            const { element, store } = await render(
                makeState({ boardId: null })
            );
            await fireFilter(element, 'createcard');
            const input = $(element, '.create-input');
            input.value = 'No board';
            input.dispatchEvent(new CustomEvent('change'));
            buttonByLabel(element, 'Save').click();
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('cancels and resets the form', async () => {
            const { element } = await render();
            await fireFilter(element, 'createcard');
            const input = $(element, '.create-input');
            input.value = 'Temp';
            input.dispatchEvent(new CustomEvent('change'));
            buttonByLabel(element, 'Cancel').click();
            await flushPromises();
            expect($(element, '.create-input')).toBeNull();

            await fireFilter(element, 'createcard');
            expect($(element, '.create-input').value).toBe('');
        });

        it('opens the form from the empty state button', async () => {
            const { element } = await render(
                makeState({ backlogCards: [], sprints: [] })
            );
            buttonByLabel(element, 'Create Card').click();
            await flushPromises();
            expect($(element, '.create-input')).not.toBeNull();
            expect($(element, 'h3')).toBeNull();
        });
    });

    describe('create sprint form', () => {
        async function openSprintForm(element) {
            await fireFilter(element, 'createsprint');
            return $(element, '.create-sprint-input');
        }

        it('focuses the input and creates a sprint with a goal', async () => {
            jest.useFakeTimers();
            const { element, store } = await render();
            const input = await openSprintForm(element);
            const focusSpy = jest.spyOn(input, 'focus');
            jest.runOnlyPendingTimers();
            expect(focusSpy).toHaveBeenCalled();

            input.value = 'Big goal';
            input.dispatchEvent(new CustomEvent('change'));
            buttonByLabel(element, 'Create Sprint').click();
            await flushPromises();

            expect(actions(store)).toEqual([
                { type: 'createSprint', args: ['b1', 'Big goal', null, null] }
            ]);
            expect($(element, '.create-sprint-input')).toBeNull();
        });

        it('skips focusing when toggled closed before the timer fires', async () => {
            jest.useFakeTimers();
            const { element } = await render();
            await openSprintForm(element);
            await fireFilter(element, 'createsprint');
            expect(() => jest.runOnlyPendingTimers()).not.toThrow();
            expect($(element, '.create-sprint-input')).toBeNull();
        });

        it('creates a sprint with a null goal on Enter and closes on Escape', async () => {
            const { element, store } = await render();
            let input = await openSprintForm(element);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'createSprint', args: ['b1', null, null, null] }
            ]);

            input = await openSprintForm(element);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
            await flushPromises();
            expect($(element, '.create-sprint-input')).not.toBeNull();
            input.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' })
            );
            await flushPromises();
            expect($(element, '.create-sprint-input')).toBeNull();
        });

        it('reports failure and keeps the form open', async () => {
            const { element, store } = await render();
            rejectFor(store, 'createSprint');
            const errors = captureEvents(element, 'error');
            await openSprintForm(element);
            buttonByLabel(element, 'Create Sprint').click();
            await flushPromises();
            expect(errorMessages(errors)).toEqual(['Failed to create sprint']);
            expect($(element, '.create-sprint-input')).not.toBeNull();
        });

        it('does nothing without a board id, and cancel closes the form', async () => {
            const { element, store } = await render(
                makeState({ boardId: null })
            );
            await openSprintForm(element);
            buttonByLabel(element, 'Create Sprint').click();
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();

            const cancel = $$(element, 'lightning-button').filter(
                (b) => b.label === 'Cancel'
            );
            cancel[0].click();
            await flushPromises();
            expect($(element, '.create-sprint-input')).toBeNull();
        });
    });

    describe('sprint header actions', () => {
        it('starts a planning sprint when no sprint is active', async () => {
            const { element } = await render();
            const started = captureEvents(element, 'startsprint');

            header(element, 's2')
                .querySelector('.sprint-action-btn--start')
                .click();

            expect(started).toHaveBeenCalledTimes(1);
            expect(started.mock.calls[0][0].detail.sprint).toEqual(
                expect.objectContaining({ Id: 's2' })
            );
        });

        it('completes the active sprint', async () => {
            const { element } = await render(activeSprintState());
            const completed = captureEvents(element, 'completesprint');
            $(element, '.sprint-action-btn--complete').click();
            expect(completed).toHaveBeenCalledTimes(1);
        });

        it('confirms and deletes a planning sprint', async () => {
            const { element, store } = await render();
            header(element, 's1')
                .querySelector('.sprint-action-btn--delete')
                .click();
            await flushPromises();
            expect(
                header(element, 's1').querySelector(
                    '.sprint-delete-confirm-label'
                )
            ).not.toBeNull();
            // Header click handler did not collapse the section
            expect(row(element, 'c4')).not.toBeNull();

            $(element, '.sprint-action-btn--delete-confirm').click();
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'deleteSprint', args: ['s1'] }
            ]);
            expect($(element, '.sprint-delete-confirm-label')).toBeNull();
        });

        it('cancels a pending sprint delete', async () => {
            const { element, store } = await render();
            header(element, 's2')
                .querySelector('.sprint-action-btn--delete')
                .click();
            await flushPromises();
            $(element, '.sprint-action-btn--cancel').click();
            await flushPromises();
            expect($(element, '.sprint-delete-confirm-label')).toBeNull();
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('reports a failed sprint delete', async () => {
            const { element, store } = await render();
            rejectFor(store, 'deleteSprint');
            const errors = captureEvents(element, 'error');
            header(element, 's1')
                .querySelector('.sprint-action-btn--delete')
                .click();
            await flushPromises();
            $(element, '.sprint-action-btn--delete-confirm').click();
            await flushPromises();
            expect(errorMessages(errors)).toEqual(['Failed to delete sprint']);
        });

        it('swallows clicks on the actions area so the section does not collapse', async () => {
            const { element } = await render();
            header(element, 's1')
                .querySelector('.sprint-header__actions')
                .click();
            await flushPromises();
            expect(row(element, 'c4')).not.toBeNull();
        });
    });

    describe('selection', () => {
        function checkbox(element, cardId) {
            return row(element, cardId).querySelector(
                '.backlog-cell--checkbox lightning-input'
            );
        }

        function selectChange(input, nativeEvent) {
            input.dispatchEvent(
                new CustomEvent('change', {
                    detail: nativeEvent ? { nativeEvent } : undefined
                })
            );
        }

        it('toggles a single card via its checkbox', async () => {
            const { element, store } = await render();
            selectChange(checkbox(element, 'c2'));
            expect(actions(store)).toEqual([
                { type: 'toggleBacklogCardSelection', args: ['c2'] }
            ]);
        });

        it('range-selects with shift and merges with existing selection', async () => {
            const { element, store } = await render();
            selectChange(checkbox(element, 'c1'));
            store.setState(makeState({ selectedBacklogCards: ['c5'] }));
            await flushPromises();

            store.dispatch.mockClear();
            selectChange(checkbox(element, 'c3'), { shiftKey: true });
            expect(actions(store)).toEqual([
                {
                    type: 'setSelectedBacklogCards',
                    args: [['c5', 'c1', 'c2', 'c3']]
                }
            ]);
        });

        it('ignores shift range when the anchor is no longer visible', async () => {
            const { element, store } = await render();
            selectChange(checkbox(element, 'c1'));
            await fireFilter(element, 'cardtypechange', 'Bug');
            store.dispatch.mockClear();

            selectChange(checkbox(element, 'c2'), { shiftKey: true });
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('treats shift without a previous anchor as a toggle', async () => {
            const { element, store } = await render();
            selectChange(checkbox(element, 'c2'), { shiftKey: true });
            expect(actionTypes(store)).toEqual(['toggleBacklogCardSelection']);
        });

        it('selects all visible cards, or clears when all are selected', async () => {
            const { element, store } = await render();
            const selectAll = $(
                element,
                '.backlog-row--header lightning-input'
            );

            selectAll.dispatchEvent(new CustomEvent('change'));
            expect(actions(store)).toEqual([
                {
                    type: 'setSelectedBacklogCards',
                    args: [['c1', 'c2', 'c3', 'c4', 'c5']]
                }
            ]);

            store.setState(
                makeState({
                    selectedBacklogCards: ['c1', 'c2', 'c3', 'c4', 'c5']
                })
            );
            await flushPromises();
            expect(
                $(element, '.backlog-row--header lightning-input').checked
            ).toBe(true);
            expect(checkbox(element, 'c1').checked).toBe(true);

            store.dispatch.mockClear();
            $(element, '.backlog-row--header lightning-input').dispatchEvent(
                new CustomEvent('change')
            );
            expect(actions(store)).toEqual([
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('ignores selection interactions after the store is removed', async () => {
            const { element, store } = await render(
                makeState({ selectedBacklogCards: ['c1'] })
            );
            element.store = null;
            await flushPromises();

            selectChange(checkbox(element, 'c2'));
            $(element, '.backlog-row--header lightning-input').dispatchEvent(
                new CustomEvent('change')
            );
            row(element, 'c2').dispatchEvent(
                new MouseEvent('click', { ctrlKey: true })
            );
            buttonByLabel(element, 'Clear').click();
            buttonByLabel(element, 'Delete').click();
            buttonByLabel(element, 'Move to Top').click();
            buttonByLabel(element, 'Move to Bottom').click();
            row(element, 'c1').querySelector('.refinement-toggle').click();
            await fireFilter(element, 'searchinput', 'x');
            await flushPromises();

            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('row clicks', () => {
        it('opens the card and clears an existing selection', async () => {
            const { element, store } = await render(
                makeState({ selectedBacklogCards: ['c3'] })
            );
            const clicks = captureEvents(element, 'cardclick');

            row(element, 'c2').click();

            expect(clicks.mock.calls[0][0].detail).toEqual({ cardId: 'c2' });
            expect(actions(store)).toEqual([
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('opens the card without dispatching when nothing is selected', async () => {
            const { element, store } = await render();
            const clicks = captureEvents(element, 'cardclick');
            row(element, 'c1').click();
            expect(clicks).toHaveBeenCalledTimes(1);
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('ignores clicks on checkbox, drag and refinement cells', async () => {
            const { element } = await render();
            const clicks = captureEvents(element, 'cardclick');
            const r = row(element, 'c1');

            r.querySelector('.backlog-cell--drag lightning-icon').click();
            r.querySelector('.backlog-cell--checkbox').click();
            r.querySelector('.backlog-cell--checkbox lightning-input').click();
            r.querySelector('.backlog-cell--subject').click();

            // Only the subject cell click opens the card
            expect(clicks).toHaveBeenCalledTimes(1);
        });

        it('toggles selection on ctrl/meta click', async () => {
            const { element, store } = await render();
            const clicks = captureEvents(element, 'cardclick');
            row(element, 'c1').dispatchEvent(
                new MouseEvent('click', { ctrlKey: true })
            );
            row(element, 'c2').dispatchEvent(
                new MouseEvent('click', { metaKey: true })
            );
            expect(actions(store)).toEqual([
                { type: 'toggleBacklogCardSelection', args: ['c1'] },
                { type: 'toggleBacklogCardSelection', args: ['c2'] }
            ]);
            expect(clicks).not.toHaveBeenCalled();
        });

        it('range-selects on shift click from the last toggled card', async () => {
            const { element, store } = await render();
            const clicks = captureEvents(element, 'cardclick');
            row(element, 'c3').dispatchEvent(
                new MouseEvent('click', { ctrlKey: true })
            );
            store.dispatch.mockClear();

            row(element, 'c1').dispatchEvent(
                new MouseEvent('click', { shiftKey: true })
            );
            expect(actions(store)).toEqual([
                { type: 'setSelectedBacklogCards', args: [['c1', 'c2', 'c3']] }
            ]);

            // Shift click on a card not in backlogCards (active sprint) does nothing
            store.dispatch.mockClear();
            await fireFilter(element, 'cardtypechange', 'Story');
            store.dispatch.mockClear();
            row(element, 'c1').dispatchEvent(
                new MouseEvent('click', { shiftKey: true })
            );
            expect(store.dispatch).not.toHaveBeenCalled();
            expect(clicks).not.toHaveBeenCalled();
        });

        it('treats shift click without an anchor as a normal open', async () => {
            const { element } = await render();
            const clicks = captureEvents(element, 'cardclick');
            row(element, 'c1').dispatchEvent(
                new MouseEvent('click', { shiftKey: true })
            );
            expect(clicks).toHaveBeenCalledTimes(1);
        });

        it('navigates on name click and lets middle click through', async () => {
            const { element } = await render();
            const nav = captureEvents(element, 'navigatetocard');
            const clicks = captureEvents(element, 'cardclick');
            const link = row(element, 'c2').querySelector('a');

            const click = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(click);
            expect(click.defaultPrevented).toBe(true);
            expect(nav.mock.calls[0][0].detail).toEqual({ cardId: 'c2' });
            expect(clicks).not.toHaveBeenCalled();

            const middle = new MouseEvent('auxclick', {
                bubbles: true,
                button: 1
            });
            const middleStop = jest.spyOn(middle, 'stopPropagation');
            link.dispatchEvent(middle);
            expect(middleStop).toHaveBeenCalled();

            const right = new MouseEvent('auxclick', {
                bubbles: true,
                button: 2
            });
            const rightStop = jest.spyOn(right, 'stopPropagation');
            link.dispatchEvent(right);
            expect(rightStop).not.toHaveBeenCalled();
        });
    });

    describe('refinement toggle', () => {
        it('flips needsRefinement for backlog cards', async () => {
            const { element, store } = await render();
            row(element, 'c1').querySelector('.refinement-toggle').click();
            row(element, 'c2').querySelector('.refinement-toggle').click();
            await flushPromises();
            expect(actions(store)).toEqual([
                {
                    type: 'updateBacklogCard',
                    args: ['c1', { needsRefinement: false }]
                },
                {
                    type: 'updateBacklogCard',
                    args: ['c2', { needsRefinement: true }]
                }
            ]);
        });

        it('ignores cards that are not in the backlog (active sprint rows)', async () => {
            const { element, store } = await render(activeSprintState());
            row(element, 'k1').querySelector('.refinement-toggle').click();
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('bulk actions', () => {
        async function renderSelected(stateFn = makeState) {
            return render(stateFn({ selectedBacklogCards: ['c1', 'c2'] }));
        }

        function combobox(element, label) {
            return $$(element, 'lightning-combobox').find(
                (c) => c.label === label
            );
        }

        it('shows the bulk bar with sprint options and no add-to-sprint without active sprint', async () => {
            const { element } = await renderSelected();
            const bar = $(element, '.backlog-view__bulk-actions');
            expect(bar.querySelector('strong').textContent).toBe('2');
            expect(buttonByLabel(element, 'Add to Sprint (2)')).toBeUndefined();
            expect(combobox(element, 'Move to Sprint').options).toEqual([
                { label: 'Plan A', value: 's1' },
                { label: 'Sprint 4', value: 's2' }
            ]);
        });

        it('hides the sprint dropdown when there are no planning sprints', async () => {
            const { element } = await render(
                makeState({ sprints: [], selectedBacklogCards: ['c1'] })
            );
            expect(combobox(element, 'Move to Sprint')).toBeUndefined();
            expect(combobox(element, 'Set Priority')).not.toBeUndefined();
        });

        it('adds selected cards to the active sprint', async () => {
            const { element, store } = await renderSelected(activeSprintState);
            buttonByLabel(element, 'Add to Sprint (2)').click();
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'moveCardsToSprint', args: ['a1', ['c1', 'c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('reports failure adding to the active sprint', async () => {
            const { element, store } = await renderSelected(activeSprintState);
            rejectFor(store, 'moveCardsToSprint');
            const errors = captureEvents(element, 'error');
            buttonByLabel(element, 'Add to Sprint (2)').click();
            await flushPromises();
            expect(errorMessages(errors)).toEqual([
                'Failed to add cards to sprint'
            ]);
            expect(actionTypes(store)).toEqual(['moveCardsToSprint']);
        });

        it('deletes selected cards and clears selection', async () => {
            const { element, store } = await renderSelected();
            buttonByLabel(element, 'Delete').click();
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'deleteBacklogCards', args: [['c1', 'c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('reports failure deleting cards', async () => {
            const { element, store } = await renderSelected();
            rejectFor(store, 'deleteBacklogCards');
            const errors = captureEvents(element, 'error');
            buttonByLabel(element, 'Delete').click();
            await flushPromises();
            expect(errorMessages(errors)).toEqual(['Failed to delete cards']);
        });

        it('sets priority on every selected card', async () => {
            const { element, store } = await renderSelected();
            combobox(element, 'Set Priority').dispatchEvent(
                new CustomEvent('change', { detail: { value: 'Low' } })
            );
            await flushPromises();
            expect(actions(store)).toEqual([
                {
                    type: 'updateBacklogCard',
                    args: ['c1', { priority: 'Low' }]
                },
                {
                    type: 'updateBacklogCard',
                    args: ['c2', { priority: 'Low' }]
                }
            ]);
            expect(combobox(element, 'Set Priority').options).toHaveLength(3);
        });

        it('reports failure setting priority', async () => {
            const { element, store } = await renderSelected();
            rejectFor(store, 'updateBacklogCard');
            const errors = captureEvents(element, 'error');
            combobox(element, 'Set Priority').dispatchEvent(
                new CustomEvent('change', { detail: { value: 'High' } })
            );
            await flushPromises();
            expect(errorMessages(errors)).toEqual([
                'Failed to update priority'
            ]);
        });

        it('moves selected cards to a planning sprint', async () => {
            const { element, store } = await renderSelected();
            const box = combobox(element, 'Move to Sprint');
            box.dispatchEvent(
                new CustomEvent('change', { detail: { value: '' } })
            );
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();

            box.dispatchEvent(
                new CustomEvent('change', { detail: { value: 's2' } })
            );
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'addCardsToBacklogSprint', args: ['s2', ['c1', 'c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('reports failure moving to a planning sprint', async () => {
            const { element, store } = await renderSelected();
            rejectFor(store, 'addCardsToBacklogSprint');
            const errors = captureEvents(element, 'error');
            combobox(element, 'Move to Sprint').dispatchEvent(
                new CustomEvent('change', { detail: { value: 's1' } })
            );
            await flushPromises();
            expect(errorMessages(errors)).toEqual([
                'Failed to move cards to sprint'
            ]);
        });

        it('moves selected cards to top and bottom', async () => {
            const { element, store } = await renderSelected();
            buttonByLabel(element, 'Move to Top').click();
            buttonByLabel(element, 'Move to Bottom').click();
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'bulkMoveBacklogCards', args: [['c1', 'c2'], 'top'] },
                {
                    type: 'bulkMoveBacklogCards',
                    args: [['c1', 'c2'], 'bottom']
                }
            ]);
        });

        it('reports failures moving to top and bottom', async () => {
            const { element, store } = await renderSelected();
            rejectFor(store, 'bulkMoveBacklogCards');
            const errors = captureEvents(element, 'error');
            buttonByLabel(element, 'Move to Top').click();
            buttonByLabel(element, 'Move to Bottom').click();
            await flushPromises();
            expect(errorMessages(errors)).toEqual([
                'Failed to move cards',
                'Failed to move cards'
            ]);
        });

        it('clears the selection', async () => {
            const { element, store } = await renderSelected();
            buttonByLabel(element, 'Clear').click();
            expect(actions(store)).toEqual([
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('ignores bulk handlers when nothing is selected', async () => {
            const { element, store } = await renderSelected(activeSprintState);
            const addBtn = buttonByLabel(element, 'Add to Sprint (2)');
            const priority = combobox(element, 'Set Priority');
            const sprintBox = combobox(element, 'Move to Sprint');
            const top = buttonByLabel(element, 'Move to Top');
            const bottom = buttonByLabel(element, 'Move to Bottom');
            const del = buttonByLabel(element, 'Delete');

            // Selection is cleared in the store but stale buttons still fire
            store.setState(activeSprintState({ selectedBacklogCards: [] }));
            [addBtn, top, bottom, del].forEach((b) =>
                b.dispatchEvent(new CustomEvent('click'))
            );
            priority.dispatchEvent(
                new CustomEvent('change', { detail: { value: 'High' } })
            );
            sprintBox.dispatchEvent(
                new CustomEvent('change', { detail: { value: 's1' } })
            );
            await flushPromises();

            expect(store.dispatch).not.toHaveBeenCalled();
            expect($(element, '.backlog-view__bulk-actions')).toBeNull();
        });

        it('ignores add-to-sprint when the active sprint ends', async () => {
            const { element, store } = await renderSelected(activeSprintState);
            const addBtn = buttonByLabel(element, 'Add to Sprint (2)');
            store.setState(makeState({ selectedBacklogCards: ['c1', 'c2'] }));
            addBtn.dispatchEvent(new CustomEvent('click'));
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('card context menu', () => {
        it('opens the menu on a card and handles selection via the handler', async () => {
            const { element, store } = await render();
            const menu = contextMenu(element);
            expect(menu.menuItems.map((i) => i.value)).toEqual([
                'moveTop',
                'moveBottom',
                'moveToSprint',
                'setPriority',
                'toggleRefinement',
                'delete'
            ]);

            row(element, 'c4').dispatchEvent(
                new CustomEvent('contextmenu', { cancelable: true })
            );
            await flushPromises();
            expect(menu.menuItems.map((i) => i.value)).toContain(
                'removeFromSprint'
            );
            expect(menu.shadowRoot.querySelector('.context-menu')).not.toBe(
                null
            );

            menu.dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'removeFromSprint' }
                })
            );
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s1', 'c4'] }
            ]);
        });

        it('moves a sprint card to the top of its sprint using sprint membership', async () => {
            const state = makeState({
                planningSprintCards: [
                    { sprintId: 's1', cardId: 'c2' },
                    { sprintId: 's1', cardId: 'c4' }
                ]
            });
            const { element, store } = await render(state);
            row(element, 'c4').dispatchEvent(
                new CustomEvent('contextmenu', { cancelable: true })
            );
            contextMenu(element).dispatchEvent(
                new CustomEvent('select', { detail: { value: 'moveTop' } })
            );
            await flushPromises();
            // c2 is the first s1 card in backlog order (index 1)
            expect(actions(store)).toEqual([
                { type: 'reorderBacklogCard', args: ['c4', 1] }
            ]);
        });
    });

    describe('sprint context menu', () => {
        function rightClick(el) {
            const evt = new CustomEvent('contextmenu', { cancelable: true });
            el.dispatchEvent(evt);
            return evt;
        }

        it('offers only "Move Down" for the first sprint and reorders it', async () => {
            const { element, store } = await render();
            const evt = rightClick(header(element, 's1'));
            await flushPromises();

            expect(evt.defaultPrevented).toBe(true);
            expect(contextMenu(element).menuItems).toEqual([
                {
                    label: 'Move Down',
                    value: 'sprintMoveDown',
                    icon: 'utility:arrowdown'
                }
            ]);

            contextMenu(element).dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'sprintMoveDown' }
                })
            );
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'reorderSprint', args: ['s1', 'down'] }
            ]);
        });

        it('offers "Move Up" for the last sprint and logs reorder failures', async () => {
            const { element, store } = await render();
            rejectFor(store, 'reorderSprint');
            const errorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            rightClick(header(element, 's2'));
            await flushPromises();
            expect(contextMenu(element).menuItems.map((i) => i.value)).toEqual([
                'sprintMoveUp'
            ]);

            contextMenu(element).dispatchEvent(
                new CustomEvent('select', { detail: { value: 'sprintMoveUp' } })
            );
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'reorderSprint', args: ['s2', 'up'] }
            ]);
            expect(errorSpy).toHaveBeenCalledWith(
                'Sprint reorder failed:',
                expect.any(Error)
            );
            errorSpy.mockRestore();
        });

        it('offers both directions for a middle sprint', async () => {
            const { element } = await render(
                makeState({
                    sprints: [
                        { Id: 's1', status: 'Planning' },
                        { Id: 's2', status: 'Planning' },
                        { Id: 's3', status: 'Planning' }
                    ]
                })
            );
            rightClick(header(element, 's2'));
            await flushPromises();
            expect(contextMenu(element).menuItems.map((i) => i.value)).toEqual([
                'sprintMoveUp',
                'sprintMoveDown'
            ]);
        });

        it('ignores the active sprint header and a lone sprint', async () => {
            const { element } = await render(
                activeSprintState({
                    sprints: [{ Id: 's1', status: 'Planning' }]
                })
            );
            const initial = contextMenu(element).menuItems;

            rightClick(header(element, 'a1'));
            await flushPromises();
            expect(contextMenu(element).menuItems).toBe(initial);

            const { element: lone } = await render(
                makeState({ sprints: [{ Id: 's1', status: 'Planning' }] })
            );
            const loneInitial = contextMenu(lone).menuItems;
            rightClick(header(lone, 's1'));
            await flushPromises();
            expect(contextMenu(lone).menuItems).toBe(loneInitial);
        });

        it('does not reorder before a sprint has been targeted', async () => {
            const { element, store } = await render();
            contextMenu(element).dispatchEvent(
                new CustomEvent('select', { detail: { value: 'sprintMoveUp' } })
            );
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('does not reorder when the store has been removed', async () => {
            const { element, store } = await render();
            rightClick(header(element, 's1'));
            element.store = null;
            await flushPromises();
            contextMenu(element).dispatchEvent(
                new CustomEvent('select', {
                    detail: { value: 'sprintMoveDown' }
                })
            );
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('drag and drop wiring', () => {
        function dragEvent(type, init = {}) {
            const evt = new CustomEvent(type, {
                bubbles: true,
                cancelable: true
            });
            evt.dataTransfer = {
                effectAllowed: '',
                dropEffect: '',
                setData: jest.fn()
            };
            evt.clientY = init.clientY || 0;
            return evt;
        }

        it('reorders a card dropped onto another row in the same section', async () => {
            const { element, store } = await render();
            const source = row(element, 'c1');
            const target = row(element, 'c3');

            const start = dragEvent('dragstart');
            source.dispatchEvent(start);
            expect(start.dataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'c1'
            );

            const over = dragEvent('dragover', { clientY: -100 });
            target.dispatchEvent(over);
            expect(over.defaultPrevented).toBe(true);
            expect(target.classList.contains('drag-indicator-above')).toBe(
                true
            );

            target.dispatchEvent(dragEvent('drop'));
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 1] }
            ]);
            expect(target.classList.contains('drag-indicator-above')).toBe(
                false
            );
        });

        it('moves a card into a sprint via its section header', async () => {
            const { element, store } = await render();
            row(element, 'c2').dispatchEvent(dragEvent('dragstart'));

            const h = header(element, 's2');
            const over = dragEvent('dragover');
            h.dispatchEvent(over);
            expect(over.defaultPrevented).toBe(true);
            expect(h.classList.contains('drag-indicator-header')).toBe(true);

            h.dispatchEvent(dragEvent('dragleave'));
            expect(h.classList.contains('drag-indicator-header')).toBe(false);

            h.dispatchEvent(dragEvent('drop'));
            await flushPromises();
            expect(actions(store)).toEqual([
                { type: 'addCardsToBacklogSprint', args: ['s2', ['c2']] }
            ]);
        });

        it('resets drag state on drag end', async () => {
            const { element, store } = await render();
            const source = row(element, 'c1');
            source.dispatchEvent(dragEvent('dragstart'));
            source.dispatchEvent(dragEvent('dragend'));
            row(element, 'c3').dispatchEvent(dragEvent('drop'));
            await flushPromises();
            expect(store.dispatch).not.toHaveBeenCalled();
            expect(source.classList.contains('dragging')).toBe(false);
        });
    });
});
