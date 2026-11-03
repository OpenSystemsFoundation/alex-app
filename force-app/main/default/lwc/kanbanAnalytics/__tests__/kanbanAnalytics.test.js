import { createElement } from 'lwc';
import KanbanAnalytics from 'c/kanbanAnalytics';
import { createStore } from 'c/kanbanStore';
import getCycleTimeAnalytics from '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics';
import getCumulativeFlowData from '@salesforce/apex/KanbanBoardController.getCumulativeFlowData';

jest.mock(
    '@salesforce/apex/KanbanBoardController.getCycleTimeAnalytics',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
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
        setLineDash: jest.fn(),
        roundRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn()
    };
}

function analytics() {
    return {
        averageCycleTimeHours: 0.5,
        averageLeadTimeHours: 36,
        columnTimes: [
            { columnName: 'To Do', averageMinutes: 30 },
            { columnName: 'In Progress', averageMinutes: 1440 * 2 },
            { columnName: 'Review', averageMinutes: 180 }
        ],
        cardDetails: [
            {
                cardId: 'c1',
                cardName: 'Login page',
                cardType: 'Story',
                cycleTimeHours: 0.25,
                leadTimeHours: 5
            },
            {
                cardId: 'c2',
                cardName: 'Fix crash',
                cardType: 'Bug',
                cycleTimeHours: 48,
                leadTimeHours: null
            }
        ]
    };
}

describe('c-kanban-analytics', () => {
    let ctx;
    let errorSpy;

    beforeEach(() => {
        ctx = createMockContext();
        jest.spyOn(
            HTMLCanvasElement.prototype,
            'getContext'
        ).mockImplementation(() => ctx);
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        getCumulativeFlowData.mockResolvedValue([]);
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
    });

    async function render(props = {}) {
        const element = createElement('c-kanban-analytics', {
            is: KanbanAnalytics
        });
        Object.assign(element, props);
        document.body.appendChild(element);
        await flushPromises();
        return element;
    }

    function renderOpen(extra = {}) {
        return render({
            store: createStore(),
            boardId: BOARD_ID,
            isOpen: true,
            ...extra
        });
    }

    function statValues(element) {
        return [
            ...element.shadowRoot.querySelectorAll('.analytics-stat__value')
        ].map((el) => el.textContent);
    }

    function tableRows(element) {
        return [...element.shadowRoot.querySelectorAll('tbody tr')].map((tr) =>
            [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())
        );
    }

    function contentText(element) {
        return element.shadowRoot
            .querySelector('.slds-tabs_default__content')
            .textContent.replace(/\s+/g, ' ')
            .trim();
    }

    it('renders nothing and loads nothing when closed', async () => {
        const element = await render({
            store: createStore(),
            boardId: BOARD_ID
        });
        expect(element.shadowRoot.querySelector('section')).toBeNull();
        expect(getCycleTimeAnalytics).not.toHaveBeenCalled();
    });

    it('does not load without a store or board', async () => {
        let element = await render({ boardId: BOARD_ID, isOpen: true });
        expect(getCycleTimeAnalytics).not.toHaveBeenCalled();
        expect(contentText(element)).toContain('No cycle time data');

        document.body.removeChild(element);
        element = await render({ store: createStore(), isOpen: true });
        expect(getCycleTimeAnalytics).not.toHaveBeenCalled();
    });

    it('shows a spinner while loading', async () => {
        let resolveApex;
        getCycleTimeAnalytics.mockReturnValue(
            new Promise((resolve) => {
                resolveApex = resolve;
            })
        );
        const element = await renderOpen();
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).not.toBeNull();

        resolveApex(analytics());
        await flushPromises();
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).toBeNull();
        expect(statValues(element)).toEqual(['30m', '1.5d']);
    });

    it('loads analytics for 30 days and renders formatted stats and card table', async () => {
        getCycleTimeAnalytics.mockResolvedValue(analytics());
        const element = await renderOpen();

        expect(getCycleTimeAnalytics).toHaveBeenCalledWith({
            boardId: BOARD_ID,
            daysBack: 30
        });
        expect(statValues(element)).toEqual(['30m', '1.5d']);
        expect(tableRows(element)).toEqual([
            ['Login page', 'Story', '15m', '5.0h'],
            ['Fix crash', 'Bug', '2.0d', '-']
        ]);
        const cycleTab = element.shadowRoot.querySelector(
            'a[data-tab="cycletime"]'
        ).parentElement;
        expect(cycleTab.className).toContain('slds-is-active');
    });

    it('draws a bar chart of average time per column', async () => {
        getCycleTimeAnalytics.mockResolvedValue(analytics());
        const element = await renderOpen();

        const canvas = element.shadowRoot.querySelector('.column-time-canvas');
        expect(canvas.width).toBe(500);
        expect(canvas.height).toBe(240);
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 500, 240);
        expect(ctx.roundRect).toHaveBeenCalledTimes(3);

        // chartH = 240 - 20 - 50 = 170; tallest bar (2 days) fills it
        const heights = ctx.roundRect.mock.calls.map((c) => c[3]);
        expect(heights[1]).toBe(170);
        expect(heights[0]).toBeCloseTo((30 / 2880) * 170);

        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        // Grid labels: 2880, 2160, 1440, 720, 0 minutes
        expect(labels).toEqual(
            expect.arrayContaining(['2.0d', '1.5d', '1.0d', '12.0h', '0m'])
        );
        // Bar values and column names
        expect(labels).toEqual(
            expect.arrayContaining([
                '30m',
                '3.0h',
                'To Do',
                'In Progress',
                'Review'
            ])
        );
        expect(ctx.rotate).toHaveBeenCalledWith(-Math.PI / 6);
        expect(ctx.save).toHaveBeenCalledTimes(3);
        expect(ctx.restore).toHaveBeenCalledTimes(3);
    });

    it('handles columns without a name or average', async () => {
        jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            800
        );
        getCycleTimeAnalytics.mockResolvedValue({
            averageCycleTimeHours: 3,
            averageLeadTimeHours: null,
            columnTimes: [{ averageMinutes: 90 }, { columnName: 'Empty' }],
            cardDetails: []
        });
        const element = await renderOpen();

        expect(statValues(element)).toEqual(['3.0h', '-']);
        expect(
            element.shadowRoot.querySelector('.column-time-canvas').width
        ).toBe(800);
        const labels = ctx.fillText.mock.calls.map((c) => c[0]);
        // Missing name → '', missing average → '-'
        expect(labels).toEqual(expect.arrayContaining(['', '-', 'Empty']));
        expect(ctx.roundRect.mock.calls[1][3]).toBe(0);
        expect(tableRows(element)).toEqual([]);
    });

    it('skips drawing bars when all column averages are zero', async () => {
        getCycleTimeAnalytics.mockResolvedValue({
            columnTimes: [{ columnName: 'A', averageMinutes: 0 }]
        });
        const element = await renderOpen();

        expect(
            element.shadowRoot.querySelector('.column-time-canvas')
        ).not.toBeNull();
        expect(statValues(element)).toEqual(['-', '-']);
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.roundRect).not.toHaveBeenCalled();
        expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('renders the table but no bars when only card details exist', async () => {
        getCycleTimeAnalytics.mockResolvedValue({
            averageCycleTimeHours: 23.5,
            averageLeadTimeHours: 24,
            columnTimes: [],
            cardDetails: [
                {
                    cardId: 'c1',
                    cardName: 'Only card',
                    cardType: 'Task',
                    cycleTimeHours: undefined,
                    leadTimeHours: 0
                }
            ]
        });
        const element = await renderOpen();

        expect(statValues(element)).toEqual(['23.5h', '1.0d']);
        expect(tableRows(element)).toEqual([['Only card', 'Task', '-', '0m']]);
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.roundRect).not.toHaveBeenCalled();
    });

    it('shows the empty message when analytics have no rows', async () => {
        getCycleTimeAnalytics.mockResolvedValue({
            columnTimes: [],
            cardDetails: []
        });
        const element = await renderOpen();
        expect(contentText(element)).toContain(
            'No cycle time data available yet.'
        );
        expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('shows the empty message when Apex returns null', async () => {
        getCycleTimeAnalytics.mockResolvedValue(null);
        const element = await renderOpen();
        expect(contentText(element)).toContain('No cycle time data');
        expect(element.shadowRoot.querySelector('table')).toBeNull();
    });

    it('shows the empty message when analytics lack both collections', async () => {
        getCycleTimeAnalytics.mockResolvedValue({
            averageCycleTimeHours: 2
        });
        const element = await renderOpen();
        expect(contentText(element)).toContain('No cycle time data');
    });

    it('logs and shows the empty state when Apex rejects', async () => {
        const error = { body: { message: 'boom' } };
        getCycleTimeAnalytics.mockRejectedValue(error);
        const element = await renderOpen();

        expect(errorSpy).toHaveBeenCalledWith(
            'Error loading analytics:',
            error
        );
        expect(
            element.shadowRoot.querySelector('lightning-spinner')
        ).toBeNull();
        expect(contentText(element)).toContain('No cycle time data');
    });

    it('switches to the cumulative flow tab and passes store and board id', async () => {
        getCycleTimeAnalytics.mockResolvedValue(analytics());
        const store = createStore();
        const element = await renderOpen({ store });

        element.shadowRoot.querySelector('a[data-tab="cfd"]').click();
        await flushPromises();

        const cfd = element.shadowRoot.querySelector(
            'c-kanban-cumulative-flow-diagram'
        );
        expect(cfd).not.toBeNull();
        expect(cfd.store).toBe(store);
        expect(cfd.boardId).toBe(BOARD_ID);
        expect(getCumulativeFlowData).toHaveBeenCalledWith({
            boardId: BOARD_ID,
            daysBack: 30
        });
        expect(
            element.shadowRoot.querySelector('.column-time-canvas')
        ).toBeNull();
        expect(
            element.shadowRoot.querySelector('a[data-tab="cfd"]').parentElement
                .className
        ).toContain('slds-is-active');
        expect(
            element.shadowRoot.querySelector('a[data-tab="cycletime"]')
                .parentElement.className
        ).not.toContain('slds-is-active');
    });

    it('fires a close event from both close buttons', async () => {
        getCycleTimeAnalytics.mockResolvedValue(null);
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
