import { createElement } from 'lwc';
import KanbanSprintHeader from 'c/kanbanSprintHeader';
import { applyStoreSubscription } from 'c/storeSubscriptionMixin';
import { buildInitialState, buildSprint } from 'jest-helpers/testDataFactory';

// Wrap the real mixin so tests can reach the component instance and verify
// getters that are not bound in the template (sprintOptions, dateRange, ...).
jest.mock('c/storeSubscriptionMixin', () => {
    const actual = jest.requireActual('c/storeSubscriptionMixin');
    return {
        ...actual,
        applyStoreSubscription: jest.fn((component, store, cb) =>
            actual.applyStoreSubscription(component, store, cb)
        )
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
        dispatch: jest.fn(),
        setState(next) {
            state = next;
            listeners.forEach((listener) => listener(state));
        },
        listenerCount: () => listeners.size
    };
}

/** Local-time date string `days` from today (noon avoids DST/UTC edge cases). */
function localDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00:00`;
}

function stateWithSprint(sprintOverrides = {}, stateOverrides = {}) {
    return buildInitialState({
        activeSprint: buildSprint({
            Id: 'sprint-1',
            Name: 'Sprint 7',
            status: 'Active',
            goal: 'Ship the thing',
            startDate: '2026-11-01',
            endDate: localDateOffset(10),
            totalStoryPoints: 20,
            completedStoryPoints: 5,
            ...sprintOverrides
        }),
        ...stateOverrides
    });
}

function mountHeader(props = {}) {
    const element = createElement('c-kanban-sprint-header', {
        is: KanbanSprintHeader
    });
    Object.assign(element, props);
    document.body.appendChild(element);
    const component =
        applyStoreSubscription.mock.calls[
            applyStoreSubscription.mock.calls.length - 1
        ][0];
    return { element, component };
}

const q = (element, selector) => element.shadowRoot.querySelector(selector);

describe('c-kanban-sprint-header', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('shows the empty state when there is no store', async () => {
        const { element, component } = mountHeader();
        await flushPromises();

        expect(q(element, '.sprint-inline__empty').textContent).toBe(
            'No active sprint'
        );
        expect(q(element, '.sprint-inline__name')).toBeNull();
        expect(component.sprint).toBeNull();
        expect(component.daysRemaining).toBeNull();
        expect(component.daysRemainingLabel).toBe('');
        expect(component.daysRemainingClass).toBe('');
        expect(component.progress).toBe(0);
        expect(component.progressLabel).toBe('');
        expect(component.sprints).toEqual([]);
        expect(component.dateRange).toBe('');
        expect(component.sprintName).toBe('');
        expect(component.sprintGoal).toBe('');
        expect(component.sprintStatus).toBe('');
    });

    it('shows the empty state when the store has no active sprint', async () => {
        const store = createMockStore(buildInitialState());
        const { element } = mountHeader({ store });
        await flushPromises();

        expect(store.subscribe).toHaveBeenCalledTimes(1);
        expect(q(element, '.sprint-inline__empty')).not.toBeNull();
    });

    it('renders active sprint name, goal, progress and remaining days', async () => {
        const store = createMockStore(stateWithSprint());
        const { element, component } = mountHeader({ store });
        await flushPromises();

        const name = q(element, '.sprint-inline__name');
        expect(name.textContent).toBe('Sprint 7');
        expect(name.title).toBe('Sprint 7');
        expect(q(element, '.sprint-inline__goal').textContent).toBe(
            'Ship the thing'
        );
        expect(q(element, '.sprint-inline__progress-label').textContent).toBe(
            '5 / 20 pts (25%)'
        );
        expect(
            q(element, '.sprint-inline__progress-fill').getAttribute('style')
        ).toContain('width: 25%');
        expect(element.shadowRoot.textContent).toContain('10d remaining');
        expect(component.daysRemainingClass).toBe('');
        expect(component.sprintStatus).toBe('Active');
        expect(component.dateRange).toBe(`2026-11-01 - ${localDateOffset(10)}`);

        const complete = q(element, 'lightning-button');
        expect(complete.label).toBe('Complete');
        expect(q(element, 'lightning-button-icon').title).toBe('Reports');
    });

    it('omits the goal and uses zero points when absent', async () => {
        const store = createMockStore(
            stateWithSprint({
                goal: null,
                completedStoryPoints: undefined,
                totalStoryPoints: undefined,
                endDate: null
            })
        );
        const { element, component } = mountHeader({ store });
        await flushPromises();

        expect(q(element, '.sprint-inline__goal')).toBeNull();
        expect(q(element, '.sprint-inline__progress-label').textContent).toBe(
            '0 / 0 pts (0%)'
        );
        expect(component.daysRemainingLabel).toBe('');
        expect(component.dateRange).toBe('2026-11-01 - ');
    });

    it('returns empty name and date range when sprint lacks them', async () => {
        const store = createMockStore(
            stateWithSprint({
                Name: undefined,
                status: undefined,
                startDate: null,
                endDate: null
            })
        );
        const { component } = mountHeader({ store });
        await flushPromises();

        expect(component.sprintName).toBe('');
        expect(component.sprintStatus).toBe('');
        expect(component.dateRange).toBe('');
        expect(component.isActive).toBe(false);
    });

    it.each([
        [0, 'Last day', 'slds-text-color_error'],
        [-3, '3d overdue', 'slds-text-color_error'],
        [2, '2d remaining', 'slds-text-color_warning'],
        [1, '1d remaining', 'slds-text-color_warning']
    ])(
        'labels %i days remaining as "%s" with class %s',
        async (days, label, cssClass) => {
            const store = createMockStore(
                stateWithSprint({ endDate: localDateOffset(days) })
            );
            const { element } = mountHeader({ store });
            await flushPromises();

            const span = [...element.shadowRoot.querySelectorAll('span')].find(
                (s) => s.textContent === label
            );
            expect(span).toBeDefined();
            expect(span.className).toBe(cssClass);
        }
    );

    it('dispatches completesprint with the active sprint id', async () => {
        const store = createMockStore(stateWithSprint());
        const { element } = mountHeader({ store });
        const handler = jest.fn();
        element.addEventListener('completesprint', handler);
        await flushPromises();

        q(element, 'lightning-button').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({
            sprintId: 'sprint-1'
        });
    });

    it('dispatches showreports with the active sprint id', async () => {
        const store = createMockStore(stateWithSprint());
        const { element } = mountHeader({ store });
        const handler = jest.fn();
        element.addEventListener('showreports', handler);
        await flushPromises();

        q(element, 'lightning-button-icon').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({
            sprintId: 'sprint-1'
        });
    });

    it('dispatches createsprint and showreports without sprint id', async () => {
        const { element, component } = mountHeader();
        const created = jest.fn();
        const reports = jest.fn();
        element.addEventListener('createsprint', created);
        element.addEventListener('showreports', reports);

        component.handleCreateSprint();
        component.handleShowReports();

        expect(created).toHaveBeenCalledTimes(1);
        expect(reports.mock.calls[0][0].detail).toEqual({
            sprintId: undefined
        });
    });

    it('hides the Complete button for non-active sprints', async () => {
        const store = createMockStore(stateWithSprint({ status: 'Planning' }));
        const { element } = mountHeader({ store });
        await flushPromises();

        expect(q(element, 'lightning-button')).toBeNull();
        expect(q(element, 'lightning-button-icon')).not.toBeNull();
    });

    it('hides all actions in Experience Cloud mode', async () => {
        const store = createMockStore(stateWithSprint());
        const { element, component } = mountHeader({
            store,
            experienceCloud: true
        });
        await flushPromises();

        expect(component.isActive).toBe(true);
        expect(component.canComplete).toBe(false);
        expect(q(element, 'lightning-button')).toBeNull();
        expect(q(element, 'lightning-button-icon')).toBeNull();
        expect(q(element, '.sprint-inline__name').textContent).toBe('Sprint 7');
    });

    it('builds sprint options from the store sprints', async () => {
        const store = createMockStore(
            stateWithSprint(
                {},
                {
                    sprints: [
                        { Id: 's1', Name: 'Sprint 1', status: 'Completed' },
                        { Id: 's2', Name: 'Sprint 2', status: 'Planning' }
                    ]
                }
            )
        );
        const { component } = mountHeader({ store });
        await flushPromises();

        expect(component.sprintOptions).toEqual([
            { label: 'Sprint 1 (Completed)', value: 's1' },
            { label: 'Sprint 2 (Planning)', value: 's2' }
        ]);
    });

    it('re-renders on store updates and unsubscribes on disconnect', async () => {
        const store = createMockStore(buildInitialState());
        const { element } = mountHeader({ store });
        await flushPromises();
        expect(q(element, '.sprint-inline__empty')).not.toBeNull();

        store.setState(stateWithSprint({ Name: 'Live Sprint' }));
        await flushPromises();
        expect(q(element, '.sprint-inline__name').textContent).toBe(
            'Live Sprint'
        );

        expect(store.listenerCount()).toBe(1);
        document.body.removeChild(element);
        expect(store.listenerCount()).toBe(0);
    });
});
