import { createElement } from 'lwc';
import KanbanSprintReports from 'c/kanbanSprintReports';
import { createStore } from 'c/kanbanStore';
import getBurndownData from '@salesforce/apex/KanbanBoardController.getBurndownData';
import getVelocityData from '@salesforce/apex/KanbanBoardController.getVelocityData';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getBurndownData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/KanbanBoardController.getVelocityData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

const SPRINT_ID = 'a02000000000001AAA';
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
        fillText: jest.fn(),
        fillRect: jest.fn(),
        setLineDash: jest.fn()
    };
}

function burndown() {
    return [
        { snapshotDate: '2026-10-01', totalPoints: 20, remainingPoints: 20 },
        { snapshotDate: '2026-10-02', totalPoints: 20, remainingPoints: 10 },
        { snapshotDate: '2026-10-03', totalPoints: 20, remainingPoints: 0 }
    ];
}

function velocity() {
    return [
        {
            Id: 's1',
            Name: 'Sprint 1',
            status: 'Completed',
            completedStoryPoints: 10,
            totalStoryPoints: 12,
            velocity: 10
        },
        {
            Id: 's2',
            Name: 'Sprint 2',
            status: 'Completed',
            completedStoryPoints: 15,
            totalStoryPoints: 15,
            velocity: 15
        },
        {
            Id: 's3',
            Name: 'Sprint 3',
            status: 'Completed',
            completedStoryPoints: 6,
            totalStoryPoints: 10,
            velocity: 6
        }
    ];
}

describe('c-kanban-sprint-reports', () => {
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
        const element = createElement('c-kanban-sprint-reports', {
            is: KanbanSprintReports
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        await flushPromises();
        return element;
    }

    function renderOpen(extra = {}) {
        return render({
            store: createStore(),
            sprintId: SPRINT_ID,
            boardId: BOARD_ID,
            isOpen: true,
            ...extra
        });
    }

    async function clickTab(element, tab) {
        element.shadowRoot.querySelector(`a[data-tab="${tab}"]`).click();
        await flushPromises();
    }

    function tabContentText(element) {
        return element.shadowRoot
            .querySelector('.slds-tabs_default__content')
            .textContent.replace(/\s+/g, ' ')
            .trim();
    }

    it('renders nothing and loads nothing when closed', async () => {
        const element = await render({
            store: createStore(),
            sprintId: SPRINT_ID,
            boardId: BOARD_ID
        });
        expect(element.shadowRoot.querySelector('section')).toBeNull();
        expect(getBurndownData).not.toHaveBeenCalled();
        expect(getVelocityData).not.toHaveBeenCalled();
    });

    it('does not load without a store', async () => {
        const element = await render({
            sprintId: SPRINT_ID,
            boardId: BOARD_ID,
            isOpen: true
        });
        expect(getBurndownData).not.toHaveBeenCalled();
        expect(getVelocityData).not.toHaveBeenCalled();
        expect(tabContentText(element)).toContain('No burndown data');
    });

    it('loads burndown and velocity data with correct arguments', async () => {
        getBurndownData.mockResolvedValue(burndown());
        getVelocityData.mockResolvedValue(velocity());
        await renderOpen();

        expect(getBurndownData).toHaveBeenCalledWith({ sprintId: SPRINT_ID });
        expect(getVelocityData).toHaveBeenCalledWith({
            boardId: BOARD_ID,
            count: 10
        });
    });

    it('skips burndown without a sprint and velocity without a board', async () => {
        getVelocityData.mockResolvedValue(velocity());
        await renderOpen({ sprintId: undefined });
        expect(getBurndownData).not.toHaveBeenCalled();
        expect(getVelocityData).toHaveBeenCalledTimes(1);

        document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
        getBurndownData.mockResolvedValue(burndown());
        await renderOpen({ boardId: undefined });
        expect(getBurndownData).toHaveBeenCalledTimes(1);
        expect(getVelocityData).not.toHaveBeenCalled();
    });

    it('shows the spinner while loading', async () => {
        let resolveBurndown;
        getBurndownData.mockReturnValue(
            new Promise((resolve) => {
                resolveBurndown = resolve;
            })
        );
        getVelocityData.mockResolvedValue([]);
        const element = await renderOpen();
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).not.toBeNull();

        resolveBurndown(burndown());
        await flushPromises();
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).toBeNull();
        expect(
            element.shadowRoot.querySelector('.burndown-canvas')
        ).not.toBeNull();
    });

    it('draws the burndown chart with ideal and actual lines', async () => {
        getBurndownData.mockResolvedValue(burndown());
        getVelocityData.mockResolvedValue(velocity());
        const element = await renderOpen();

        const canvas = element.shadowRoot.querySelector('.burndown-canvas');
        expect(canvas.width).toBe(500);
        expect(canvas.height).toBe(300);
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 500, 300);
        // Ideal line is dashed
        expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
        expect(ctx.lineTo).toHaveBeenCalledWith(480, 260);
        // Actual line: chartW = 430, chartH = 240
        expect(ctx.moveTo).toHaveBeenCalledWith(50, 20);
        expect(ctx.lineTo).toHaveBeenCalledWith(265, 140);
        expect(ctx.lineTo).toHaveBeenCalledWith(480, 260);

        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        expect(labels).toEqual(['10-01', '10-02', '10-03']);

        const burndownTab = element.shadowRoot.querySelector(
            'a[data-tab="burndown"]'
        ).parentElement;
        expect(burndownTab.className).toContain('slds-is-active');
    });

    it('labels burndown days without dates and thins labels for long sprints', async () => {
        const data = [];
        for (let i = 0; i < 10; i++) {
            data.push({ totalPoints: 10, remainingPoints: 10 - i });
        }
        data[0].remainingPoints = undefined;
        getBurndownData.mockResolvedValue(data);
        getVelocityData.mockResolvedValue([]);
        await renderOpen();

        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        // ceil(10/7) = 2 → even indices plus the last day
        expect(labels).toEqual(['D1', 'D3', 'D5', 'D7', 'D9', 'D10']);
        // Missing remaining points are treated as 0 → bottom of chart
        expect(ctx.moveTo).toHaveBeenCalledWith(50, 260);
    });

    it('skips drawing burndown when total points are zero', async () => {
        getBurndownData.mockResolvedValue([
            { snapshotDate: '2026-10-01', remainingPoints: 0 },
            { snapshotDate: '2026-10-02', totalPoints: 0 }
        ]);
        getVelocityData.mockResolvedValue([]);
        const element = await renderOpen();

        expect(
            element.shadowRoot.querySelector('.burndown-canvas')
        ).not.toBeNull();
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
        expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('uses the container width when available', async () => {
        jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            700
        );
        getBurndownData.mockResolvedValue(burndown());
        getVelocityData.mockResolvedValue(velocity());
        const element = await renderOpen();
        expect(element.shadowRoot.querySelector('.burndown-canvas').width).toBe(
            700
        );

        await clickTab(element, 'velocity');
        expect(element.shadowRoot.querySelector('.velocity-canvas').width).toBe(
            700
        );
    });

    it('shows the empty burndown message when there is no data', async () => {
        getBurndownData.mockResolvedValue(null);
        getVelocityData.mockResolvedValue(null);
        const element = await renderOpen();
        expect(tabContentText(element)).toContain(
            'No burndown data available yet.'
        );
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('draws the velocity chart with bars, labels and average line', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue(velocity());
        const element = await renderOpen();
        await clickTab(element, 'velocity');

        const velocityTab = element.shadowRoot.querySelector(
            'a[data-tab="velocity"]'
        ).parentElement;
        expect(velocityTab.className).toContain('slds-is-active');
        expect(
            element.shadowRoot.querySelector('a[data-tab="burndown"]')
                .parentElement.className
        ).not.toContain('slds-is-active');

        // (10 + 15 + 6) / 3 = 10.33 → 10
        expect(element.shadowRoot.querySelector('strong').textContent).toBe(
            '10'
        );

        expect(ctx.fillRect).toHaveBeenCalledTimes(3);
        // Tallest bar (15) spans full chart height (240)
        const heights = ctx.fillRect.mock.calls.map((c) => c[3]);
        expect(heights).toEqual([160, 240, 96]);

        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        expect(labels).toEqual(
            expect.arrayContaining([
                'Sprint 1',
                'Sprint 2',
                'Sprint 3',
                '10',
                '15',
                '6',
                'Avg: 10'
            ])
        );
        expect(ctx.setLineDash).toHaveBeenCalledWith([5, 3]);
        // Average line at 20 + 240 - (10/15)*240 = 100
        expect(ctx.moveTo).toHaveBeenCalledWith(50, 100);
    });

    it('handles velocity entries without names or velocity values', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue([
            { Id: 'a', velocity: 8 },
            { Id: 'b', Name: 'Named' }
        ]);
        const element = await renderOpen();
        await clickTab(element, 'velocity');

        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        expect(labels).toEqual(
            expect.arrayContaining(['S1', 'Named', '8', '0', 'Avg: 4'])
        );
        expect(ctx.fillRect.mock.calls[1][3]).toBe(0);
    });

    it('skips drawing velocity bars when all velocities are zero', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue([
            { Id: 'a', Name: 'Zero', velocity: 0 }
        ]);
        const element = await renderOpen();
        await clickTab(element, 'velocity');

        expect(
            element.shadowRoot.querySelector('.velocity-canvas')
        ).not.toBeNull();
        expect(element.shadowRoot.querySelector('strong').textContent).toBe(
            '0'
        );
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('shows the empty velocity message when there is no history', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue([]);
        const element = await renderOpen();
        await clickTab(element, 'velocity');
        expect(tabContentText(element)).toContain('No completed sprints yet.');
        expect(element.shadowRoot.querySelector('.velocity-canvas')).toBeNull();
    });

    it('renders the sprint history table on the summary tab', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue(velocity());
        const element = await renderOpen();
        await clickTab(element, 'summary');

        expect(
            element.shadowRoot.querySelector('a[data-tab="summary"]')
                .parentElement.className
        ).toContain('slds-is-active');
        const rows = [...element.shadowRoot.querySelectorAll('tbody tr')].map(
            (tr) =>
                [...tr.querySelectorAll('td')].map((td) =>
                    td.textContent.trim()
                )
        );
        expect(rows).toEqual([
            ['Sprint 1', 'Completed', '10', '12', '10'],
            ['Sprint 2', 'Completed', '15', '15', '15'],
            ['Sprint 3', 'Completed', '6', '10', '6']
        ]);
        // Summary tab draws no chart
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('shows the empty summary message without history', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue([]);
        const element = await renderOpen();
        await clickTab(element, 'summary');
        expect(tabContentText(element)).toContain(
            'No sprint history available.'
        );
        expect(element.shadowRoot.querySelector('table')).toBeNull();
    });

    it('logs and shows empty state when Apex rejects', async () => {
        const error = { body: { message: 'boom' } };
        getBurndownData.mockRejectedValue(error);
        getVelocityData.mockResolvedValue(velocity());
        const element = await renderOpen();

        expect(errorSpy).toHaveBeenCalledWith(
            'Error loading report data:',
            error
        );
        // Velocity is never requested once burndown fails
        expect(getVelocityData).not.toHaveBeenCalled();
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).toBeNull();
        expect(tabContentText(element)).toContain('No burndown data');
    });

    it('fires a close event from both close buttons', async () => {
        getBurndownData.mockResolvedValue([]);
        getVelocityData.mockResolvedValue([]);
        const element = await renderOpen();
        const handler = jest.fn();
        element.addEventListener('close', handler);

        element.shadowRoot.querySelector('.slds-modal__close').click();
        element.shadowRoot
            .querySelector('.slds-modal__footer .slds-button')
            .click();
        expect(handler).toHaveBeenCalledTimes(2);
    });
});
