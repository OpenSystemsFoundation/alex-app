// ─── Mock: c/kanbanStore ────────────────────────────────────────────
jest.mock(
    'c/kanbanStore',
    () => ({
        loadCumulativeFlowDataAsync: jest.fn()
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
    closePath: jest.fn(),
    setLineDash: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
    font: '',
    textAlign: ''
};

const originalGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);
});
afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
});

// ─── Import component under test ────────────────────────────────────
import KanbanCumulativeFlowDiagram from 'c/kanbanCumulativeFlowDiagram';
import { loadCumulativeFlowDataAsync } from 'c/kanbanStore';

// ─── Test Data ──────────────────────────────────────────────────────
const MOCK_FLOW_DATA = [
    {
        snapshotDate: '2026-03-01',
        columnCounts: { 'To Do': 5, 'In Progress': 3, Done: 2 }
    },
    {
        snapshotDate: '2026-03-02',
        columnCounts: { 'To Do': 4, 'In Progress': 4, Done: 3 }
    },
    {
        snapshotDate: '2026-03-03',
        columnCounts: { 'To Do': 3, 'In Progress': 3, Done: 5 }
    }
];

const COLUMN_NAMES = ['To Do', 'In Progress', 'Done'];

// ─── Prototype-based testing ────────────────────────────────────────
const proto = KanbanCumulativeFlowDiagram.prototype;

/**
 * Creates a plain mock instance with prototype methods bound as own properties,
 * avoiding LWC VM checks on @track/@api property access.
 */
function createMockInstance(overrides = {}) {
    const instance = {
        store: null,
        boardId: null,
        daysBack: 30,
        showStacked: true,
        showGrid: true,
        flowData: [],
        columnNames: [],
        isLoading: false,
        showTooltip: false,
        tooltipX: 0,
        tooltipY: 0,
        tooltipDate: '',
        tooltipItems: [],
        tooltipTotal: 0,
        _padding: { top: 20, right: 20, bottom: 45, left: 50 },
        _chartW: 500,
        _chartH: 250,
        _canvasWidth: 600,
        _canvasHeight: 320,
        template: { querySelector: jest.fn().mockReturnValue(null) },
        ...overrides
    };

    // Bind prototype methods so this.loadData(), this.drawChart() work
    instance.loadData = proto.loadData.bind(instance);
    instance.drawChart = proto.drawChart.bind(instance);
    instance.handleDaysChange = proto.handleDaysChange.bind(instance);
    instance.handleStackedToggle = proto.handleStackedToggle.bind(instance);
    instance.handleGridToggle = proto.handleGridToggle.bind(instance);
    instance.handleMouseMove = proto.handleMouseMove.bind(instance);
    instance.handleMouseLeave = proto.handleMouseLeave.bind(instance);

    // Bind getters using Object.defineProperty so they use the plain object
    Object.defineProperty(instance, 'legendItems', {
        get: proto.__lookupGetter__('legendItems'),
        configurable: true
    });
    Object.defineProperty(instance, 'tooltipStyle', {
        get: proto.__lookupGetter__('tooltipStyle'),
        configurable: true
    });

    return instance;
}

function createMockStore(dispatchResult = null) {
    return {
        getState: jest.fn(() => ({})),
        dispatch: jest
            .fn()
            .mockResolvedValue(dispatchResult || { data: MOCK_FLOW_DATA }),
        subscribe: jest.fn(() => jest.fn())
    };
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-kanban-cumulative-flow-diagram', () => {
    beforeEach(() => {
        loadCumulativeFlowDataAsync.mockReturnValue({
            type: 'LOAD_CUMULATIVE_FLOW_DATA'
        });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ================================================================
    // loadData
    // ================================================================
    describe('loadData', () => {
        it('returns early when store is null', async () => {
            const instance = createMockInstance({
                store: null,
                boardId: 'board001'
            });
            await instance.loadData();

            expect(instance.isLoading).toBe(false);
            expect(instance.flowData).toEqual([]);
        });

        it('returns early when boardId is null', async () => {
            const store = createMockStore();
            const instance = createMockInstance({ store, boardId: null });
            await instance.loadData();

            expect(instance.isLoading).toBe(false);
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it('dispatches thunk and sets flowData and columnNames', async () => {
            const store = createMockStore();
            const instance = createMockInstance({
                store,
                boardId: 'board001'
            });
            await instance.loadData();

            expect(store.dispatch).toHaveBeenCalled();
            expect(loadCumulativeFlowDataAsync).toHaveBeenCalledWith(
                'board001',
                30
            );
            expect(instance.flowData).toEqual(MOCK_FLOW_DATA);
            expect(instance.columnNames).toEqual(COLUMN_NAMES);
            expect(instance.isLoading).toBe(false);
        });

        it('handles errors gracefully', async () => {
            const store = createMockStore();
            store.dispatch.mockRejectedValue(new Error('Network error'));
            const instance = createMockInstance({
                store,
                boardId: 'board001'
            });
            const spy = jest.spyOn(console, 'error').mockImplementation();

            await instance.loadData();

            expect(spy).toHaveBeenCalledWith(
                'Error loading CFD data:',
                expect.any(Error)
            );
            expect(instance.isLoading).toBe(false);
            spy.mockRestore();
        });
    });

    // ================================================================
    // legendItems getter
    // ================================================================
    describe('legendItems', () => {
        it('returns legend items with correct names and color styles', () => {
            const instance = createMockInstance({
                columnNames: ['To Do', 'In Progress', 'Done']
            });
            const items = instance.legendItems;

            expect(items).toHaveLength(3);
            expect(items[0].name).toBe('To Do');
            expect(items[0].colorStyle).toContain('background-color:');
            expect(items[1].name).toBe('In Progress');
            expect(items[2].name).toBe('Done');
        });
    });

    // ================================================================
    // tooltipStyle getter
    // ================================================================
    describe('tooltipStyle', () => {
        it('returns correct inline style string', () => {
            const instance = createMockInstance({
                tooltipX: 100,
                tooltipY: 50
            });
            const style = instance.tooltipStyle;

            expect(style).toBe('left: 112px; top: 40px;');
        });
    });

    // ================================================================
    // handleDaysChange
    // ================================================================
    describe('handleDaysChange', () => {
        it('updates daysBack and calls loadData', async () => {
            const store = createMockStore();
            const instance = createMockInstance({
                store,
                boardId: 'board001'
            });
            // Replace loadData with a spy
            instance.loadData = jest.fn().mockResolvedValue(undefined);

            instance.handleDaysChange({ target: { value: 14 } });

            expect(instance.daysBack).toBe(14);
            expect(instance.loadData).toHaveBeenCalled();
        });
    });

    // ================================================================
    // handleStackedToggle
    // ================================================================
    describe('handleStackedToggle', () => {
        it('flips showStacked and calls drawChart', () => {
            const instance = createMockInstance({ showStacked: true });
            instance.drawChart = jest.fn();

            instance.handleStackedToggle();

            expect(instance.showStacked).toBe(false);
            expect(instance.drawChart).toHaveBeenCalled();
        });
    });

    // ================================================================
    // handleGridToggle
    // ================================================================
    describe('handleGridToggle', () => {
        it('flips showGrid and calls drawChart', () => {
            const instance = createMockInstance({ showGrid: true });
            instance.drawChart = jest.fn();

            instance.handleGridToggle();

            expect(instance.showGrid).toBe(false);
            expect(instance.drawChart).toHaveBeenCalled();
        });
    });

    // ================================================================
    // handleMouseLeave
    // ================================================================
    describe('handleMouseLeave', () => {
        it('sets showTooltip to false and calls drawChart', () => {
            const instance = createMockInstance({ showTooltip: true });
            instance.drawChart = jest.fn();

            instance.handleMouseLeave();

            expect(instance.showTooltip).toBe(false);
            expect(instance.drawChart).toHaveBeenCalled();
        });
    });

    // ================================================================
    // handleMouseMove
    // ================================================================
    describe('handleMouseMove', () => {
        it('returns early when no canvas', () => {
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA
            });
            instance.template.querySelector.mockReturnValue(null);

            instance.handleMouseMove({
                clientX: 100,
                clientY: 100
            });

            expect(instance.showTooltip).toBe(false);
        });

        it('computes tooltip for valid position', () => {
            const mockCanvas = {
                getBoundingClientRect: jest.fn().mockReturnValue({
                    left: 0,
                    top: 0,
                    width: 600,
                    height: 320
                }),
                getContext: jest.fn(() => mockCtx),
                parentElement: { clientWidth: 600 }
            };
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                _padding: { top: 20, right: 20, bottom: 45, left: 50 },
                _chartW: 530,
                _chartH: 255
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            // Replace drawChart with a spy to prevent full canvas rendering
            instance.drawChart = jest.fn();

            // Mouse at a position within the chart area
            instance.handleMouseMove({
                clientX: 315,
                clientY: 160
            });

            expect(instance.showTooltip).toBe(true);
            expect(instance.tooltipDate).toBeTruthy();
            expect(instance.tooltipItems).toHaveLength(3);
            expect(instance.tooltipTotal).toBeGreaterThan(0);
            expect(instance.drawChart).toHaveBeenCalled();
        });

        it('hides tooltip when mouse is outside chart area', () => {
            const mockCanvas = {
                getBoundingClientRect: jest.fn().mockReturnValue({
                    left: 0,
                    top: 0,
                    width: 600,
                    height: 320
                })
            };
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                _padding: { top: 20, right: 20, bottom: 45, left: 50 },
                _chartW: 530
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            // Mouse to the left of the chart area (before padding)
            instance.handleMouseMove({
                clientX: 10,
                clientY: 160
            });

            expect(instance.showTooltip).toBe(false);
        });
    });

    // ================================================================
    // drawChart
    // ================================================================
    describe('drawChart', () => {
        let mockCanvas;

        beforeEach(() => {
            mockCanvas = {
                getContext: jest.fn(() => mockCtx),
                parentElement: { clientWidth: 600 },
                width: 0,
                height: 0
            };
            Object.keys(mockCtx).forEach((key) => {
                if (typeof mockCtx[key] === 'function') {
                    mockCtx[key].mockClear();
                }
            });
        });

        it('returns when no canvas', () => {
            const instance = createMockInstance();
            instance.template.querySelector.mockReturnValue(null);

            instance.drawChart();

            expect(mockCtx.clearRect).not.toHaveBeenCalled();
        });

        it('renders stacked mode with mock canvas context', () => {
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                showStacked: true,
                showGrid: true
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            instance.drawChart();

            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
            expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 600, 320);
            // Stacked mode draws fill + stroke for each column
            expect(mockCtx.fill).toHaveBeenCalled();
            expect(mockCtx.closePath).toHaveBeenCalled();
            // Grid lines should be drawn
            expect(mockCtx.fillText).toHaveBeenCalled();
        });

        it('renders line mode', () => {
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                showStacked: false,
                showGrid: true
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            instance.drawChart();

            expect(mockCtx.clearRect).toHaveBeenCalled();
            expect(mockCtx.stroke).toHaveBeenCalled();
            expect(mockCtx.beginPath).toHaveBeenCalled();
        });

        it('skips grid when showGrid is false', () => {
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                showStacked: true,
                showGrid: false
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            instance.drawChart();

            expect(mockCtx.clearRect).toHaveBeenCalled();
            // Chart still renders data areas
            expect(mockCtx.stroke).toHaveBeenCalled();
        });

        it('draws crosshair when highlightIndex is provided', () => {
            const instance = createMockInstance({
                flowData: MOCK_FLOW_DATA,
                columnNames: COLUMN_NAMES,
                showStacked: true,
                showGrid: false
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            instance.drawChart(1);

            expect(mockCtx.setLineDash).toHaveBeenCalledWith([4, 4]);
            expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
        });

        it('returns early when flowData is empty', () => {
            const instance = createMockInstance({
                flowData: [],
                columnNames: []
            });
            instance.template.querySelector.mockReturnValue(mockCanvas);

            instance.drawChart();

            // clearRect is called, but no fill/closePath since no data
            expect(mockCtx.clearRect).toHaveBeenCalled();
            expect(mockCtx.closePath).not.toHaveBeenCalled();
        });
    });
});
