import { createElement } from 'lwc';
import KanbanCumulativeFlowDiagram from 'c/kanbanCumulativeFlowDiagram';
import { createStore } from 'c/kanbanStore';
import getCumulativeFlowData from '@salesforce/apex/KanbanBoardController.getCumulativeFlowData';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getCumulativeFlowData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

const BOARD_ID = 'a01000000000001AAA';

// Let pending Apex promises and re-renders settle (setTimeout is lint-restricted in LWC)
async function flushPromises() {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

function createMockContext() {
    return {
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        closePath: jest.fn(),
        fillText: jest.fn(),
        setLineDash: jest.fn()
    };
}

function sampleFlowData() {
    return [
        {
            snapshotDate: '2026-10-01',
            columnCounts: { 'To Do': 5, 'In Progress': 2, Done: 1 }
        },
        {
            snapshotDate: '2026-10-02',
            columnCounts: { 'To Do': 4, 'In Progress': 3, Done: 2 }
        },
        {
            snapshotDate: '2026-10-03',
            columnCounts: { 'To Do': 3, 'In Progress': 3, Done: 4 }
        }
    ];
}

describe('c-kanban-cumulative-flow-diagram', () => {
    let ctx;
    let errorSpy;

    beforeEach(() => {
        ctx = createMockContext();
        jest.spyOn(
            HTMLCanvasElement.prototype,
            'getContext'
        ).mockImplementation(() => ctx);
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
    });

    async function render(props = {}) {
        const element = createElement('c-kanban-cumulative-flow-diagram', {
            is: KanbanCumulativeFlowDiagram
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        await flushPromises();
        return element;
    }

    function legendLabels(element) {
        return [
            ...element.shadowRoot.querySelectorAll('.cfd-legend__label')
        ].map((el) => el.textContent);
    }

    function fillTextLabels() {
        return ctx.fillText.mock.calls.map((call) => call[0]);
    }

    it('does not call Apex when store or boardId is missing', async () => {
        const element = await render({ boardId: BOARD_ID });
        expect(getCumulativeFlowData).not.toHaveBeenCalled();
        expect(legendLabels(element)).toEqual([]);

        // Mouse move without data does nothing
        const canvas = element.shadowRoot.querySelector('.cfd-canvas');
        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 100, clientY: 100 })
        );
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).toBeNull();
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('does not call Apex when boardId is missing', async () => {
        await render({ store: createStore() });
        expect(getCumulativeFlowData).not.toHaveBeenCalled();
    });

    it('loads data with default 30 day range and renders legend', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });

        expect(getCumulativeFlowData).toHaveBeenCalledWith({
            boardId: BOARD_ID,
            daysBack: 30
        });
        expect(legendLabels(element)).toEqual(['To Do', 'In Progress', 'Done']);

        const colors = [
            ...element.shadowRoot.querySelectorAll('.cfd-legend__color')
        ].map((el) => el.style.backgroundColor);
        expect(colors).toEqual([
            'rgb(99, 102, 241)',
            'rgb(59, 130, 246)',
            'rgb(6, 182, 212)'
        ]);
    });

    it('draws a stacked area chart with grid, axis labels and date labels', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });

        const canvas = element.shadowRoot.querySelector('.cfd-canvas');
        // jsdom has no layout, so falls back to 600 wide
        expect(canvas.width).toBe(600);
        expect(canvas.height).toBe(320);
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 600, 320);

        const labels = fillTextLabels();
        // Max total is 10 → Y labels 10,8,6,4,2,0
        expect(labels).toEqual(
            expect.arrayContaining(['10', '8', '6', '4', '2', '0'])
        );
        // X labels show MM-DD
        expect(labels).toEqual(
            expect.arrayContaining(['10-01', '10-02', '10-03'])
        );
        // One filled area per column in stacked mode
        expect(ctx.fill).toHaveBeenCalledTimes(3);
        expect(ctx.closePath).toHaveBeenCalledTimes(3);

        // Top of the stack for the last day: cumulative 10/10 → y = top padding
        // chartW = 600 - 50 - 20 = 530 → last x = 580
        expect(ctx.lineTo).toHaveBeenCalledWith(580, 20);
    });

    it('switches to line mode when stacked is toggled off', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        ctx.fill.mockClear();
        ctx.closePath.mockClear();
        ctx.stroke.mockClear();

        const [stackedInput] = element.shadowRoot.querySelectorAll(
            'input[type="checkbox"]'
        );
        stackedInput.dispatchEvent(new CustomEvent('change'));
        await flushPromises();

        expect(ctx.fill).not.toHaveBeenCalled();
        expect(ctx.closePath).not.toHaveBeenCalled();
        // Line mode: "Done" column on day 3 = 4/10 → y = 20 + 0.6 * 255 = 173
        expect(ctx.lineTo).toHaveBeenCalledWith(580, 173);
        expect(ctx.stroke).toHaveBeenCalled();
    });

    it('hides grid lines and Y labels when grid is toggled off', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        ctx.fillText.mockClear();

        const inputs = element.shadowRoot.querySelectorAll(
            'input[type="checkbox"]'
        );
        inputs[1].dispatchEvent(new CustomEvent('change'));
        await flushPromises();

        const labels = fillTextLabels();
        expect(labels.length).toBeGreaterThan(0);
        expect(labels).not.toContain('10');
        expect([...new Set(labels)]).toEqual(['10-01', '10-02', '10-03']);
    });

    it('reloads data when time range changes', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });

        const select = element.shadowRoot.querySelector('.cfd-select');
        select.value = '7';
        select.dispatchEvent(new CustomEvent('change'));
        await flushPromises();

        expect(getCumulativeFlowData).toHaveBeenLastCalledWith({
            boardId: BOARD_ID,
            daysBack: 7
        });
    });

    it('shows a tooltip with counts and total on hover and draws a crosshair', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        ctx.setLineDash.mockClear();

        const canvas = element.shadowRoot.querySelector('.cfd-canvas');
        // relX = 580 - 50 = 530 = chartW → last day index (2)
        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 580, clientY: 100 })
        );
        expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
        expect(ctx.moveTo).toHaveBeenCalledWith(580, 20);
        await flushPromises();

        const tooltip = element.shadowRoot.querySelector('.cfd-tooltip');
        expect(tooltip).not.toBeNull();
        expect(tooltip.style.left).toBe('592px');
        expect(tooltip.style.top).toBe('90px');
        expect(
            tooltip.querySelector('.cfd-tooltip__date').textContent.trim()
        ).toBe('2026-10-03');
        const values = [...tooltip.querySelectorAll('.cfd-tooltip__value')].map(
            (el) => el.textContent
        );
        expect(values).toEqual(['3', '3', '4']);
        expect(
            tooltip.querySelector('.cfd-tooltip__total').textContent.trim()
        ).toBe('Total: 10');

        // Leaving hides tooltip
        canvas.dispatchEvent(new CustomEvent('mouseleave'));
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).toBeNull();
    });

    it('hides tooltip when hovering outside the chart area', async () => {
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        const canvas = element.shadowRoot.querySelector('.cfd-canvas');

        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 300, clientY: 50 })
        );
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).not.toBeNull();

        // Left of the Y axis
        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 10, clientY: 50 })
        );
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).toBeNull();

        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 300, clientY: 50 })
        );
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).not.toBeNull();

        // Right of the chart area
        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 599, clientY: 50 })
        );
        await flushPromises();
        expect(element.shadowRoot.querySelector('.cfd-tooltip')).toBeNull();
    });

    it('handles data points with missing counts and dates', async () => {
        const data = [
            { snapshotDate: '2026-10-01', columnCounts: { A: 2, B: 0 } },
            { columnCounts: { A: 1 } },
            {}
        ];
        getCumulativeFlowData.mockResolvedValue(data);
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });

        const labels = fillTextLabels();
        expect(labels).toEqual(expect.arrayContaining(['10-01', 'D2', 'D3']));

        // Hover over the last (empty) day: zeros and empty date
        const canvas = element.shadowRoot.querySelector('.cfd-canvas');
        canvas.dispatchEvent(
            new MouseEvent('mousemove', { clientX: 580, clientY: 50 })
        );
        await flushPromises();
        const tooltip = element.shadowRoot.querySelector('.cfd-tooltip');
        expect(
            tooltip.querySelector('.cfd-tooltip__date').textContent.trim()
        ).toBe('');
        const values = [...tooltip.querySelectorAll('.cfd-tooltip__value')].map(
            (el) => el.textContent
        );
        expect(values).toEqual(['0', '0']);
        expect(
            tooltip.querySelector('.cfd-tooltip__total').textContent.trim()
        ).toBe('Total: 0');
    });

    it('uses a max of 1 when all counts are zero and handles a single day', async () => {
        getCumulativeFlowData.mockResolvedValue([
            { snapshotDate: '2026-10-05', columnCounts: { A: 0 } }
        ]);
        await render({ store: createStore(), boardId: BOARD_ID });

        const labels = fillTextLabels();
        // Grid labels are scaled to max 1
        expect(labels).toEqual(expect.arrayContaining(['1', '0', '10-05']));
        // Single day sits at the left edge (no divide-by-zero)
        expect(ctx.fillText).toHaveBeenCalledWith('10-05', 50, 293);
    });

    it('thins X labels for long ranges and cycles colors past the palette', async () => {
        const columns = {};
        for (let c = 0; c < 11; c++) {
            columns[`Col${c}`] = 1;
        }
        const data = [];
        for (let d = 0; d < 25; d++) {
            const day = String(d + 1).padStart(2, '0');
            data.push({
                snapshotDate: `2026-10-${day}`,
                columnCounts: columns
            });
        }
        getCumulativeFlowData.mockResolvedValue(data);
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });

        const dateLabels = fillTextLabels().filter((l) => l.startsWith('10-'));
        // labelInterval = ceil(25/10) = 3 → indices 0,3,...,24 = 9 labels
        expect(dateLabels).toHaveLength(9);
        expect(dateLabels[0]).toBe('10-01');
        expect(dateLabels[dateLabels.length - 1]).toBe('10-25');

        const colors = [
            ...element.shadowRoot.querySelectorAll('.cfd-legend__color')
        ].map((el) => el.style.backgroundColor);
        expect(colors).toHaveLength(11);
        expect(colors[10]).toBe(colors[0]);
    });

    it('uses the wrapper width when available', async () => {
        jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            800
        );
        getCumulativeFlowData.mockResolvedValue(sampleFlowData());
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        expect(element.shadowRoot.querySelector('.cfd-canvas').width).toBe(800);
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 320);
    });

    it('keeps the chart empty when the first point has no column counts', async () => {
        getCumulativeFlowData.mockResolvedValue([
            { snapshotDate: '2026-10-01' },
            { snapshotDate: '2026-10-02', columnCounts: { A: 1 } }
        ]);
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        expect(legendLabels(element)).toEqual([]);
        expect(ctx.fillText).not.toHaveBeenCalled();

        // A forced redraw clears the canvas but draws nothing without columns
        const [stackedInput] = element.shadowRoot.querySelectorAll(
            'input[type="checkbox"]'
        );
        stackedInput.dispatchEvent(new CustomEvent('change'));
        await flushPromises();
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 600, 320);
        expect(ctx.fillText).not.toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('treats a null Apex result as no data', async () => {
        getCumulativeFlowData.mockResolvedValue(null);
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        expect(legendLabels(element)).toEqual([]);
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('logs and recovers when Apex rejects', async () => {
        const error = { body: { message: 'boom' } };
        getCumulativeFlowData.mockRejectedValue(error);
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        expect(errorSpy).toHaveBeenCalledWith('Error loading CFD data:', error);
        expect(legendLabels(element)).toEqual([]);
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });
});
