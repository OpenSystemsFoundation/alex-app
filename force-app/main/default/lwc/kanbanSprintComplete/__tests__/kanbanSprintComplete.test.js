import { createElement } from 'lwc';
import KanbanSprintComplete from 'c/kanbanSprintComplete';
import { completeSprintAsync } from 'c/kanbanStore';
import { applyStoreSubscription } from 'c/storeSubscriptionMixin';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    buildSprint
} from 'jest-helpers/testDataFactory';

jest.mock('c/kanbanStore', () => {
    const actual = jest.requireActual('c/kanbanStore');
    return {
        ...actual,
        completeSprintAsync: jest.fn((sprintId, dispositions) => ({
            type: 'MOCK_COMPLETE_SPRINT',
            sprintId,
            dispositions
        }))
    };
});

// Wrap the real mixin so tests can reach the component instance
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
        dispatch: jest.fn(() => Promise.resolve()),
        setState(next) {
            state = next;
            listeners.forEach((listener) => listener(state));
        },
        listenerCount: () => listeners.size
    };
}

const columnCard = buildCard({
    Id: 'card-col',
    Name: 'C-0002',
    subject: 'Found via column',
    storyPoints: 8
});

function buildState(sprintCards, sprintOverrides = {}) {
    return buildInitialState({
        columns: [buildColumn({ Id: 'col-1', cards: [columnCard] })],
        activeSprint: buildSprint({
            Id: 'sprint-1',
            status: 'Active',
            totalStoryPoints: 21,
            completedStoryPoints: 13,
            ...sprintOverrides
        }),
        sprintCards
    });
}

const defaultSprintCards = [
    { Id: 'sc-1', cardId: 'card-done', completedInSprint: true },
    {
        Id: 'sc-2',
        cardId: 'card-embedded',
        completedInSprint: false,
        storyPointsAtAdd: 5,
        card: { Id: 'card-embedded', Name: 'C-0001', subject: 'Embedded' }
    },
    { Id: 'sc-3', cardId: 'card-col', completedInSprint: false },
    { Id: 'sc-4', cardId: 'card-missing', completedInSprint: false }
];

function mount(props = {}) {
    const element = createElement('c-kanban-sprint-complete', {
        is: KanbanSprintComplete
    });
    Object.assign(element, { isOpen: true, sprintId: 'sprint-1', ...props });
    document.body.appendChild(element);
    const calls = applyStoreSubscription.mock.calls;
    return { element, component: calls[calls.length - 1][0] };
}

const footerButton = (element, label) =>
    [...element.shadowRoot.querySelectorAll('.slds-modal__footer button')].find(
        (b) => b.textContent.trim() === label
    );

const headings = (element) =>
    [...element.shadowRoot.querySelectorAll('.slds-text-heading_large')].map(
        (el) => el.textContent.trim()
    );

describe('c-kanban-sprint-complete', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders nothing when closed', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element } = mount({ store, isOpen: false });
        await flushPromises();

        expect(element.shadowRoot.querySelector('section')).toBeNull();
    });

    it('shows the sprint summary on step 1', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element, component } = mount({ store });
        await flushPromises();

        expect(element.shadowRoot.querySelector('h3').textContent).toContain(
            'Sprint Summary'
        );
        // completed, incomplete, points done, total points
        expect(headings(element)).toEqual(['1', '3', '13', '21']);
        expect(component.totalCount).toBe(4);
        expect(footerButton(element, 'Cancel')).toBeDefined();
        expect(footerButton(element, 'Next')).toBeDefined();
    });

    it('defaults counts and points to zero without store state', async () => {
        const { element, component } = mount();
        await flushPromises();

        expect(headings(element)).toEqual(['0', '0', '0', '0']);
        expect(component.sprint).toBeNull();
        expect(component.sprintCards).toEqual([]);
        expect(component.incompleteCardsWithDisposition).toEqual([]);
    });

    it('lists incomplete cards with their dispositions on step 2', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element, component } = mount({ store });
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();

        expect(element.shadowRoot.querySelector('h3').textContent).toContain(
            'What should happen to'
        );
        const links = [...element.shadowRoot.querySelectorAll('a')];
        expect(links.map((a) => a.textContent)).toEqual([
            'C-0001',
            'C-0002',
            'card-missing'
        ]);
        expect(links[0].getAttribute('href')).toBe(
            '/lightning/r/OpenSF__Card__c/card-embedded/view'
        );
        const subjects = [
            ...element.shadowRoot.querySelectorAll(
                '.slds-text-body_small.slds-truncate'
            )
        ].map((el) => el.textContent.trim());
        expect(subjects).toEqual(['Embedded', 'Found via column']);

        const combos =
            element.shadowRoot.querySelectorAll('lightning-combobox');
        expect(combos).toHaveLength(3);
        combos.forEach((combo) => {
            expect(combo.value).toBe('backlog');
            expect(combo.options).toEqual([
                { label: 'Move to Backlog', value: 'backlog' }
            ]);
        });

        const enriched = component.incompleteCardsWithDisposition;
        expect(
            enriched.map(({ cardId, storyPoints, hasPoints, hasSubject }) => ({
                cardId,
                storyPoints,
                hasPoints,
                hasSubject
            }))
        ).toEqual([
            {
                cardId: 'card-embedded',
                storyPoints: 5,
                hasPoints: true,
                hasSubject: true
            },
            {
                cardId: 'card-col',
                storyPoints: 8,
                hasPoints: true,
                hasSubject: true
            },
            {
                cardId: 'card-missing',
                storyPoints: 0,
                hasPoints: false,
                hasSubject: false
            }
        ]);
    });

    it('updates a disposition and passes it to completeSprintAsync', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element } = mount({ store });
        const completed = jest.fn();
        const closed = jest.fn();
        element.addEventListener('sprintcompleted', completed);
        element.addEventListener('close', closed);
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();

        const combo = element.shadowRoot.querySelector(
            'lightning-combobox[data-card-id="card-col"]'
        );
        combo.dispatchEvent(
            new CustomEvent('change', { detail: { value: 'sprint-2' } })
        );
        await flushPromises();
        expect(combo.value).toBe('sprint-2');

        footerButton(element, 'Next').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain(
            'Ready to Complete Sprint?'
        );
        expect(element.shadowRoot.textContent).toContain(
            '1 cards completed, 3 cards will be moved to backlog.'
        );

        footerButton(element, 'Complete Sprint').click();
        await flushPromises();

        expect(completeSprintAsync).toHaveBeenCalledWith('sprint-1', {
            'card-embedded': 'backlog',
            'card-col': 'sprint-2',
            'card-missing': 'backlog'
        });
        expect(store.dispatch).toHaveBeenCalledWith({
            type: 'MOCK_COMPLETE_SPRINT',
            sprintId: 'sprint-1',
            dispositions: {
                'card-embedded': 'backlog',
                'card-col': 'sprint-2',
                'card-missing': 'backlog'
            }
        });
        expect(completed).toHaveBeenCalledTimes(1);
        expect(closed).toHaveBeenCalledTimes(1);

        // Closing resets the wizard to step 1
        expect(element.shadowRoot.querySelector('h3').textContent).toContain(
            'Sprint Summary'
        );
    });

    it('skips the disposition step when every card is complete', async () => {
        const store = createMockStore(
            buildState([
                { Id: 'sc-1', cardId: 'card-1', completedInSprint: true }
            ])
        );
        const { element } = mount({ store });
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();

        expect(element.shadowRoot.textContent).toContain(
            'Ready to Complete Sprint?'
        );
        expect(element.shadowRoot.querySelector('lightning-combobox')).toBe(
            null
        );

        footerButton(element, 'Complete Sprint').click();
        await flushPromises();
        expect(completeSprintAsync).toHaveBeenCalledWith('sprint-1', {});
    });

    it('navigates back through the steps', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element, component } = mount({ store });
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();
        footerButton(element, 'Next').click();
        await flushPromises();
        expect(component.isStep3).toBe(true);

        footerButton(element, 'Back').click();
        await flushPromises();
        expect(component.isStep2).toBe(true);
        expect(
            element.shadowRoot.querySelectorAll('lightning-combobox')
        ).toHaveLength(3);

        footerButton(element, 'Back').click();
        await flushPromises();
        expect(component.isStep1).toBe(true);
        expect(footerButton(element, 'Back')).toBeUndefined();

        // Back on step 1 and Next on step 3 are no-ops
        component.handleBack();
        expect(component.step).toBe(1);
        component.step = 3;
        component.handleNext();
        expect(component.step).toBe(3);
    });

    it('dispatches close and resets state on cancel', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element, component } = mount({ store });
        const closed = jest.fn();
        element.addEventListener('close', closed);
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();
        expect(Object.keys(component.dispositions)).toHaveLength(3);

        element.shadowRoot.querySelector('button[title="Close"]').click();
        await flushPromises();

        expect(closed).toHaveBeenCalledTimes(1);
        expect(component.step).toBe(1);
        expect(component.dispositions).toEqual({});
    });

    it('stays open and re-enables the button when completion fails', async () => {
        const store = createMockStore(
            buildState([
                { Id: 'sc-1', cardId: 'card-1', completedInSprint: true }
            ])
        );
        store.dispatch.mockRejectedValueOnce(new Error('Apex failure'));
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const { element, component } = mount({ store });
        const completed = jest.fn();
        const closed = jest.fn();
        element.addEventListener('sprintcompleted', completed);
        element.addEventListener('close', closed);
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();
        footerButton(element, 'Complete Sprint').click();
        await flushPromises();

        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(completed).not.toHaveBeenCalled();
        expect(closed).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith(
            'Error completing sprint:',
            expect.any(Error)
        );
        expect(component.isProcessing).toBe(false);
        expect(footerButton(element, 'Complete Sprint').disabled).toBe(false);
        consoleError.mockRestore();
    });

    it('ignores duplicate completion clicks while processing', async () => {
        const store = createMockStore(
            buildState([
                { Id: 'sc-1', cardId: 'card-1', completedInSprint: true }
            ])
        );
        let resolveDispatch;
        store.dispatch.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveDispatch = resolve;
            })
        );
        const { element } = mount({ store });
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();
        const button = footerButton(element, 'Complete Sprint');
        // Second click lands before the re-render disables the button
        button.click();
        button.click();
        await flushPromises();

        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
        resolveDispatch();
        await flushPromises();
    });

    it('does nothing on complete without a store', async () => {
        const { element, component } = mount();
        const completed = jest.fn();
        element.addEventListener('sprintcompleted', completed);
        await flushPromises();

        footerButton(element, 'Next').click();
        await flushPromises();
        await component.handleComplete();

        expect(completeSprintAsync).not.toHaveBeenCalled();
        expect(completed).not.toHaveBeenCalled();
    });

    it('unsubscribes from the store on disconnect', async () => {
        const store = createMockStore(buildState(defaultSprintCards));
        const { element } = mount({ store });
        await flushPromises();
        expect(store.listenerCount()).toBe(1);

        store.setState(buildState([]));
        await flushPromises();
        expect(headings(element)).toEqual(['0', '0', '13', '21']);

        document.body.removeChild(element);
        expect(store.listenerCount()).toBe(0);
    });
});
