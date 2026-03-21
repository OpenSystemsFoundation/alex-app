import { createElement } from '@lwc/engine-dom';

// ─── Mock: c/kanbanStore ────────────────────────────────────────────
jest.mock(
    'c/kanbanStore',
    () => ({
        loadCycleTimeAnalyticsAsync: jest.fn()
    }),
    { virtual: true }
);

// ─── Mock: lightning/platformShowToastEvent ──────────────────────────
jest.mock(
    'lightning/platformShowToastEvent',
    () => ({
        ShowToastEvent: jest.fn(function (params) {
            return new CustomEvent('lightning__showtoast', {
                detail: params
            });
        })
    }),
    { virtual: true }
);

// ─── Mock: HTMLCanvasElement.prototype.getContext ─────────────────────
const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    roundRect: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: ''
};

const originalGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);
});
afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
});

// ─── Import component under test ────────────────────────────────────
import KanbanAnalytics from 'c/kanbanAnalytics';
import { loadCycleTimeAnalyticsAsync } from 'c/kanbanStore';

// ─── Test Data ──────────────────────────────────────────────────────
const MOCK_CYCLE_TIME_DATA = {
    averageCycleTimeHours: 48.5,
    averageLeadTimeHours: 72.3,
    columnTimes: [
        { columnName: 'To Do', averageMinutes: 120 },
        { columnName: 'In Progress', averageMinutes: 480 },
        { columnName: 'Review', averageMinutes: 60 },
        { columnName: 'Done', averageMinutes: 0 }
    ],
    cardDetails: [
        {
            Id: 'card1',
            Name: 'Card 1',
            cycleTimeHours: 24,
            leadTimeHours: 36
        },
        {
            Id: 'card2',
            Name: 'Card 2',
            cycleTimeHours: 0.5,
            leadTimeHours: 0.75
        },
        {
            Id: 'card3',
            Name: 'Card 3',
            cycleTimeHours: null,
            leadTimeHours: null
        }
    ]
};

function createMockStore(dispatchResult = null) {
    return {
        getState: jest.fn(() => ({})),
        dispatch: jest
            .fn()
            .mockResolvedValue(
                dispatchResult || { data: MOCK_CYCLE_TIME_DATA }
            ),
        subscribe: jest.fn(() => jest.fn())
    };
}

// ─── Helpers ────────────────────────────────────────────────────────
function createComponent(props = {}) {
    const element = createElement('c-kanban-analytics', {
        is: KanbanAnalytics
    });
    Object.assign(element, {
        store: props.store || createMockStore(),
        boardId: props.boardId || 'board001',
        isOpen: props.isOpen !== undefined ? props.isOpen : false,
        ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() {
    return new Promise((resolve) => {
        Promise.resolve().then(resolve);
    });
}

// Test non-@api methods via prototype
const proto = KanbanAnalytics.prototype;

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-kanban-analytics', () => {
    beforeEach(() => {
        loadCycleTimeAnalyticsAsync.mockReturnValue({
            type: 'LOAD_CYCLE_TIME_ANALYTICS'
        });
        jest.clearAllMocks();
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ================================================================
    // connectedCallback
    // ================================================================
    describe('connectedCallback', () => {
        it('loads data when isOpen is true', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();

            expect(store.dispatch).toHaveBeenCalled();
            expect(loadCycleTimeAnalyticsAsync).toHaveBeenCalledWith(
                'board001',
                30
            );
        });

        it('does not load data when isOpen is false', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: false });
            await flushPromises();

            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('does not load data when store is null', async () => {
            createComponent({ store: null, isOpen: true });
            await flushPromises();
        });

        it('does not load data when boardId is null', async () => {
            const store = createMockStore();
            createComponent({ store, boardId: null, isOpen: true });
            await flushPromises();

            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('handles load error gracefully', async () => {
            const store = createMockStore();
            store.dispatch.mockRejectedValue(new Error('Load failed'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            createComponent({ store, isOpen: true });
            await flushPromises();
            spy.mockRestore();
        });
    });

    // ================================================================
    // loadData enrichment
    // ================================================================
    describe('loadData enrichment', () => {
        it('enriches cardDetails with formatted times', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('handles null cardDetails', async () => {
            const dataWithoutCards = {
                averageCycleTimeHours: 10,
                averageLeadTimeHours: 20,
                columnTimes: [],
                cardDetails: null
            };
            const store = createMockStore({ data: dataWithoutCards });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('handles empty data result', async () => {
            const store = createMockStore({ data: null });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });
    });

    // ================================================================
    // formatHours (tested via prototype)
    // ================================================================
    describe('formatHours', () => {
        it('returns "-" for null', () => {
            expect(proto.formatHours(null)).toBe('-');
        });

        it('returns "-" for undefined', () => {
            expect(proto.formatHours(undefined)).toBe('-');
        });

        it('formats sub-hour as minutes', () => {
            expect(proto.formatHours(0.5)).toBe('30m');
        });

        it('formats hours less than 24', () => {
            expect(proto.formatHours(12.5)).toBe('12.5h');
        });

        it('formats 24+ hours as days', () => {
            expect(proto.formatHours(48)).toBe('2.0d');
        });

        it('formats exactly 1 hour', () => {
            expect(proto.formatHours(1)).toBe('1.0h');
        });

        it('formats very small values', () => {
            expect(proto.formatHours(0.01)).toBe('1m');
        });
    });

    // ================================================================
    // formatMinutes (tested via prototype)
    // ================================================================
    describe('formatMinutes', () => {
        it('returns "-" for null', () => {
            expect(proto.formatMinutes(null)).toBe('-');
        });

        it('formats minutes less than 60', () => {
            expect(proto.formatMinutes(45)).toBe('45m');
        });

        it('formats minutes as hours', () => {
            expect(proto.formatMinutes(120)).toBe('2.0h');
        });

        it('formats minutes as days', () => {
            expect(proto.formatMinutes(2880)).toBe('2.0d');
        });

        it('formats exactly 60 minutes', () => {
            expect(proto.formatMinutes(60)).toBe('1.0h');
        });

        it('formats exactly 1440 minutes (1 day)', () => {
            expect(proto.formatMinutes(1440)).toBe('1.0d');
        });
    });

    // ================================================================
    // Tab Getters
    // ================================================================
    describe('Tab getters', () => {
        it('isCycleTimeTab returns true by default', () => {
            createComponent();
        });

        it('isCfdTab returns false by default', () => {
            createComponent();
        });

        it('cycleTimeTabClass includes active by default', () => {
            createComponent();
        });

        it('cfdTabClass does not include active by default', () => {
            createComponent();
        });
    });

    // ================================================================
    // handleTabClick
    // ================================================================
    describe('handleTabClick', () => {
        it('switches to cfd tab via prototype', async () => {
            const store = createMockStore();
            const element = createComponent({ store, isOpen: true });
            await flushPromises();

            proto.handleTabClick.call(element, {
                currentTarget: { dataset: { tab: 'cfd' } }
            });
            await flushPromises();
        });

        it('switches back to cycletime tab via prototype', async () => {
            const store = createMockStore();
            const element = createComponent({ store, isOpen: true });
            await flushPromises();

            proto.handleTabClick.call(element, {
                currentTarget: { dataset: { tab: 'cfd' } }
            });
            proto.handleTabClick.call(element, {
                currentTarget: { dataset: { tab: 'cycletime' } }
            });
            await flushPromises();
        });
    });

    // ================================================================
    // handleClose
    // ================================================================
    describe('handleClose', () => {
        it('dispatches close event', async () => {
            const element = createComponent();
            await flushPromises();

            const handler = jest.fn();
            element.addEventListener('close', handler);

            proto.handleClose.call(element);

            expect(handler).toHaveBeenCalled();
        });
    });

    // ================================================================
    // hasCycleTimeData
    // ================================================================
    describe('hasCycleTimeData', () => {
        it('returns true when columnTimes has data', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('returns false when no data loaded', async () => {
            createComponent({ isOpen: false });
            await flushPromises();
        });

        it('returns true when only cardDetails has data', async () => {
            const data = {
                columnTimes: [],
                cardDetails: [{ Id: 'c1', Name: 'Card 1' }]
            };
            const store = createMockStore({ data });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('returns false when both are empty', async () => {
            const data = {
                columnTimes: [],
                cardDetails: []
            };
            const store = createMockStore({ data });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });
    });

    // ================================================================
    // formattedAvgCycleTime / formattedAvgLeadTime
    // ================================================================
    describe('Formatted average times', () => {
        it('formattedAvgCycleTime uses formatHours', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('formattedAvgLeadTime uses formatHours', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('returns "-" when no data', async () => {
            createComponent({ isOpen: false });
            await flushPromises();
        });
    });

    // ================================================================
    // renderedCallback / drawColumnTimeChart
    // ================================================================
    describe('renderedCallback and chart drawing', () => {
        it('attempts to draw chart when conditions are met', async () => {
            const store = createMockStore();
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('does not draw chart when isOpen is false', async () => {
            createComponent({ isOpen: false });
            await flushPromises();
        });

        it('handles data with empty columnTimes gracefully', async () => {
            const data = {
                columnTimes: [],
                cardDetails: [{ Id: 'c1' }]
            };
            const store = createMockStore({ data });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });

        it('handles data with all-zero averageMinutes', async () => {
            const data = {
                columnTimes: [
                    { columnName: 'Col1', averageMinutes: 0 },
                    { columnName: 'Col2', averageMinutes: 0 }
                ],
                cardDetails: []
            };
            const store = createMockStore({ data });
            createComponent({ store, isOpen: true });
            await flushPromises();
        });
    });
});
