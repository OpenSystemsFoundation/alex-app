import FilterManager from '../../managers/filterManager';

function createComponent(overrides = {}) {
    return {
        columns: [],
        _boardSearchTerm: '',
        _boardFilterPriority: 'All',
        _boardFilterCardType: 'All',
        _boardFilterEpic: 'All',
        _boardFilterAssignees: [],
        _boardHideCompleted: false,
        _mobileActiveColumnIndex: 0,
        isSprintBoard: false,
        board: null,
        ...overrides
    };
}

describe('FilterManager assignee filters', () => {
    it('builds sorted assignee options from board cards', () => {
        const component = createComponent({
            columns: [
                {
                    cards: [
                        {
                            Id: 'card-1',
                            assigneeId: 'user-b',
                            assignee: { name: 'Zoe Carter' }
                        },
                        {
                            Id: 'card-2',
                            assigneeId: 'user-a',
                            assignee: { name: 'Alex Morgan' }
                        },
                        {
                            Id: 'card-3',
                            assigneeId: 'user-a',
                            assignee: { name: 'Alex Morgan' }
                        }
                    ]
                }
            ]
        });

        const manager = new FilterManager(component);

        expect(manager.assigneeFilterOptions).toEqual([
            { label: 'Alex Morgan', value: 'user-a' },
            { label: 'Zoe Carter', value: 'user-b' }
        ]);
    });

    it('filters cards by selected assignees and marks filters active', () => {
        const component = createComponent({
            columns: [
                {
                    Id: 'column-1',
                    cardCount: 2,
                    hasWipLimit: false,
                    cards: [
                        {
                            Id: 'card-1',
                            subject: 'First card',
                            assigneeId: 'user-a',
                            assignee: { name: 'Alex Morgan' }
                        },
                        {
                            Id: 'card-2',
                            subject: 'Second card',
                            assigneeId: 'user-b',
                            assignee: { name: 'Zoe Carter' }
                        }
                    ]
                }
            ],
            _boardFilterAssignees: ['user-b']
        });

        const manager = new FilterManager(component);
        const filteredColumns = manager.getFilteredColumns();

        expect(manager.hasActiveFilters).toBe(true);
        expect(filteredColumns[0].cards).toHaveLength(1);
        expect(filteredColumns[0].cards[0].Id).toBe('card-2');
        expect(filteredColumns[0].cardCount).toBe(1);
    });
});

describe('FilterManager options', () => {
    it('exposes static priority and card type options', () => {
        const manager = new FilterManager(createComponent());
        expect(manager.priorityFilterOptions.map((o) => o.value)).toEqual([
            'All',
            'Blocking',
            'High',
            'Medium',
            'Low',
            'Trivial'
        ]);
        expect(manager.cardTypeFilterOptions.map((o) => o.value)).toEqual([
            'All',
            'Story',
            'Bug',
            'Task',
            'Epic'
        ]);
    });

    it('derives assignee values from assignee.id or name, skipping blanks', () => {
        const component = createComponent({
            columns: [
                {
                    cards: [
                        { Id: '1', assignee: { id: 'user-x', name: 'Xia' } },
                        { Id: '2', assignee: { name: '  bob  ' } },
                        { Id: '3', assignee: { name: '   ' } },
                        { Id: '4', assigneeId: 'user-y' },
                        { Id: '5' },
                        null
                    ]
                },
                { Id: 'no-cards' }
            ]
        });
        const manager = new FilterManager(component);

        expect(manager.assigneeFilterOptions).toEqual([
            { label: 'bob', value: 'name:bob' },
            { label: 'Xia', value: 'user-x' }
        ]);
    });

    it('returns no assignee options when columns are missing', () => {
        const manager = new FilterManager(createComponent({ columns: null }));
        expect(manager.assigneeFilterOptions).toEqual([]);
    });
});

describe('FilterManager computed state', () => {
    it('reports no active filters by default', () => {
        const manager = new FilterManager(createComponent());
        expect(manager.hasActiveFilters).toBe(false);
        expect(manager.getFilterSummary([], 10)).toBe('');
    });

    it.each([
        ['search term', { _boardSearchTerm: ' bug ' }],
        ['priority', { _boardFilterPriority: 'High' }],
        ['card type', { _boardFilterCardType: 'Bug' }],
        ['epic', { _boardFilterEpic: 'e1' }],
        ['assignees', { _boardFilterAssignees: ['u1'] }],
        ['hide completed', { _boardHideCompleted: true }]
    ])('detects an active %s filter', (_label, overrides) => {
        const manager = new FilterManager(createComponent(overrides));
        expect(manager.hasActiveFilters).toBe(true);
    });

    it('treats a whitespace-only search as inactive', () => {
        const manager = new FilterManager(
            createComponent({ _boardSearchTerm: '   ' })
        );
        expect(manager.hasActiveFilters).toBe(false);
    });

    it('shows the hide-done toggle only for non-sprint boards', () => {
        expect(
            new FilterManager(createComponent({ isSprintBoard: false }))
                .showHideDoneToggle
        ).toBe(true);
        expect(
            new FilterManager(createComponent({ isSprintBoard: true }))
                .showHideDoneToggle
        ).toBe(false);
    });

    it('returns the hide-completed toggle class', () => {
        expect(new FilterManager(createComponent()).hideCompletedClass).toBe(
            'filter-toggle'
        );
        expect(
            new FilterManager(createComponent({ _boardHideCompleted: true }))
                .hideCompletedClass
        ).toBe('filter-toggle filter-toggle--active');
    });

    it('counts filtered cards and builds a summary', () => {
        const manager = new FilterManager(
            createComponent({ _boardFilterPriority: 'High' })
        );
        const cols = [{ cardCount: 2 }, { cardCount: 3 }, {}];
        expect(manager.getFilteredCardCount(cols)).toBe(5);
        expect(manager.getFilterSummary(cols, 12)).toBe('5 of 12 cards');
    });
});

describe('FilterManager getFilteredColumns', () => {
    const BASE_CLASS = 'kanban-column slds-col slds-grid slds-grid_vertical';

    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString();
    }

    function buildBoard(overrides = {}) {
        return createComponent({
            columns: [
                {
                    Id: 'todo',
                    cardCount: 4,
                    hasWipLimit: true,
                    wipLimit: 3,
                    cards: [
                        {
                            Id: 'c1',
                            subject: 'Login bug',
                            Name: 'CARD-1',
                            cardType: 'Bug',
                            priority: 'High',
                            status: 'Open',
                            epicId: 'e1',
                            assigneeId: 'u1',
                            assignee: { name: 'Alex' }
                        },
                        {
                            Id: 'c2',
                            subject: 'Write docs',
                            cardType: 'Task',
                            priority: 'Low',
                            status: 'Done',
                            assignee: { name: 'Sam' }
                        },
                        {
                            Id: 'c3',
                            subject: 'Payment flow',
                            cardType: 'Story',
                            priority: 'High',
                            epicId: 'e2'
                        },
                        { Id: 'c4' }
                    ]
                },
                {
                    Id: 'done',
                    cardCount: 2,
                    hasWipLimit: true,
                    wipLimit: 5,
                    isCompleted: true,
                    cards: [
                        { Id: 'd1', subject: 'Old', doneDate: daysAgo(30) },
                        { Id: 'd2', subject: 'Recent', doneDate: daysAgo(1) },
                        { Id: 'd3', subject: 'Undated' }
                    ]
                },
                { Id: 'empty', cardCount: 0 }
            ],
            ...overrides
        });
    }

    const ids = (col) => col.cards.map((c) => c.Id);

    it('returns an empty array without columns', () => {
        expect(
            new FilterManager(
                createComponent({ columns: null })
            ).getFilteredColumns()
        ).toEqual([]);
        expect(
            new FilterManager(createComponent()).getFilteredColumns()
        ).toEqual([]);
    });

    it('adds mobile and WIP classes without filtering when idle', () => {
        const component = buildBoard({ _mobileActiveColumnIndex: 1 });
        const cols = new FilterManager(component).getFilteredColumns();

        expect(cols).toHaveLength(3);
        expect(cols[0].cards).toBe(component.columns[0].cards);
        expect(cols[0]).toMatchObject({
            isOverWipLimit: true,
            wipBadgeClass: 'wip-badge wip-badge--over',
            mobileColumnClass: `${BASE_CLASS} mobile-column-hidden kanban-column--over-wip`
        });
        expect(cols[1]).toMatchObject({
            isOverWipLimit: false,
            wipBadgeClass: 'wip-badge',
            mobileColumnClass: `${BASE_CLASS} mobile-column-active`
        });
        expect(cols[2].isOverWipLimit).toBeFalsy();
        expect(cols[2].mobileColumnClass).toBe(
            `${BASE_CLASS} mobile-column-hidden`
        );
    });

    it('marks the active column with the over-WIP class', () => {
        const cols = new FilterManager(buildBoard()).getFilteredColumns();
        expect(cols[0].mobileColumnClass).toBe(
            `${BASE_CLASS} mobile-column-active kanban-column--over-wip`
        );
    });

    it('hides expired done cards using the retention policy', () => {
        const component = buildBoard({ board: { doneCardRetentionDays: 7 } });
        const cols = new FilterManager(component).getFilteredColumns();

        expect(ids(cols[1])).toEqual(['d2', 'd3']);
        expect(cols[1].cardCount).toBe(2);
        // Non-completed columns are untouched by retention
        expect(ids(cols[0])).toEqual(['c1', 'c2', 'c3', 'c4']);
        expect(cols[2].cards).toEqual([]);
    });

    it('applies zero-day retention', () => {
        const component = buildBoard({ board: { doneCardRetentionDays: 0 } });
        const cols = new FilterManager(component).getFilteredColumns();
        expect(ids(cols[1])).toEqual(['d3']);
    });

    it('ignores retention on sprint boards and for negative values', () => {
        const sprint = buildBoard({
            isSprintBoard: true,
            board: { doneCardRetentionDays: 7 }
        });
        expect(ids(new FilterManager(sprint).getFilteredColumns()[1])).toEqual([
            'd1',
            'd2',
            'd3'
        ]);

        const negative = buildBoard({ board: { doneCardRetentionDays: -1 } });
        expect(
            ids(new FilterManager(negative).getFilteredColumns()[1])
        ).toEqual(['d1', 'd2', 'd3']);
    });

    it('hides completed columns and Done cards when toggled', () => {
        const cols = new FilterManager(
            buildBoard({ _boardHideCompleted: true })
        ).getFilteredColumns();

        expect(cols[1]).toMatchObject({
            cards: [],
            cardCount: 0,
            isHidden: true
        });
        expect(ids(cols[0])).toEqual(['c1', 'c3', 'c4']);
        expect(cols[0].cardCount).toBe(3);
        expect(cols[0].isOverWipLimit).toBe(false);
    });

    it.each([
        ['subject', 'login', ['c1']],
        ['Name', 'card-1', ['c1']],
        ['card type', 'story', ['c3']],
        ['assignee name', 'SAM', ['c2']],
        ['status', 'done', ['c2']]
    ])('searches by %s', (_label, term, expected) => {
        const cols = new FilterManager(
            buildBoard({ _boardSearchTerm: `  ${term} ` })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(expected);
        expect(cols[1].cards).toEqual([]);
    });

    it('filters by priority', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterPriority: 'High' })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c1', 'c3']);
    });

    it('filters by card type', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterCardType: 'Task' })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c2']);
    });

    it('filters by a specific epic', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterEpic: 'e2' })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c3']);
    });

    it('filters to cards without an epic', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterEpic: '__none__' })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c2', 'c4']);
        expect(ids(cols[1])).toEqual(['d1', 'd2', 'd3']);
    });

    it('filters by name-based assignee values and drops unassigned cards', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterAssignees: ['name:Sam', 'u1'] })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c1', 'c2']);
        expect(cols[1].cards).toEqual([]);
    });

    it('combines filters', () => {
        const cols = new FilterManager(
            buildBoard({
                _boardFilterPriority: 'High',
                _boardFilterCardType: 'Bug',
                _boardSearchTerm: 'login'
            })
        ).getFilteredColumns();
        expect(ids(cols[0])).toEqual(['c1']);
    });

    it('treats columns without cards as empty when filtering', () => {
        const cols = new FilterManager(
            buildBoard({ _boardFilterPriority: 'High' })
        ).getFilteredColumns();
        expect(cols[2]).toMatchObject({ cards: [], cardCount: 0 });
    });
});

describe('FilterManager event handlers', () => {
    let component;
    let manager;

    beforeEach(() => {
        jest.useFakeTimers();
        component = createComponent();
        manager = new FilterManager(component);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debounces search input from event.detail', () => {
        manager.handleBoardSearch({ detail: { value: 'bu' } });
        manager.handleBoardSearch({ detail: { value: 'bug' } });
        jest.advanceTimersByTime(149);
        expect(component._boardSearchTerm).toBe('');
        jest.advanceTimersByTime(1);
        expect(component._boardSearchTerm).toBe('bug');
    });

    it('reads search from event.target or defaults to empty', () => {
        component._boardSearchTerm = 'old';
        manager.handleBoardSearch({ target: { value: 'typed' } });
        jest.advanceTimersByTime(150);
        expect(component._boardSearchTerm).toBe('typed');

        manager.handleBoardSearch({});
        jest.advanceTimersByTime(150);
        expect(component._boardSearchTerm).toBe('');
    });

    it.each([
        ['handlePriorityFilter', '_boardFilterPriority', 'High'],
        ['handleCardTypeFilter', '_boardFilterCardType', 'Bug'],
        ['handleEpicFilter', '_boardFilterEpic', 'e1']
    ])('%s reads detail, target, then defaults to All', (method, prop, val) => {
        manager[method]({ detail: { value: val } });
        expect(component[prop]).toBe(val);

        manager[method]({ target: { value: `${val}-t` } });
        expect(component[prop]).toBe(`${val}-t`);

        manager[method]({});
        expect(component[prop]).toBe('All');
    });

    it('copies assignee selections and defaults to empty', () => {
        const values = ['u1', 'u2'];
        manager.handleAssigneeFilter({ detail: { value: values } });
        expect(component._boardFilterAssignees).toEqual(values);
        expect(component._boardFilterAssignees).not.toBe(values);

        manager.handleAssigneeFilter({ detail: { value: 'u1' } });
        expect(component._boardFilterAssignees).toEqual([]);

        manager.handleAssigneeFilter({});
        expect(component._boardFilterAssignees).toEqual([]);
    });

    it('toggles hide completed', () => {
        manager.handleToggleHideCompleted();
        expect(component._boardHideCompleted).toBe(true);
        manager.handleToggleHideCompleted();
        expect(component._boardHideCompleted).toBe(false);
    });

    it('clears all filters and cancels a pending search', () => {
        Object.assign(component, {
            _boardSearchTerm: 'x',
            _boardFilterPriority: 'High',
            _boardFilterCardType: 'Bug',
            _boardFilterEpic: 'e1',
            _boardFilterAssignees: ['u1'],
            _boardHideCompleted: true
        });
        manager.handleBoardSearch({ detail: { value: 'pending' } });

        manager.handleClearFilters();
        jest.advanceTimersByTime(500);

        expect(component).toMatchObject({
            _boardSearchTerm: '',
            _boardFilterPriority: 'All',
            _boardFilterCardType: 'All',
            _boardFilterEpic: 'All',
            _boardFilterAssignees: [],
            _boardHideCompleted: false
        });
        expect(manager._searchDebounceTimer).toBeNull();
        expect(manager.hasActiveFilters).toBe(false);
    });

    it('clears filters when no search is pending', () => {
        component._boardFilterPriority = 'Low';
        manager.handleClearFilters();
        expect(component._boardFilterPriority).toBe('All');
        expect(manager._searchDebounceTimer).toBeNull();
    });

    it('destroy cancels a pending search', () => {
        manager.handleBoardSearch({ detail: { value: 'later' } });
        manager.destroy();
        jest.advanceTimersByTime(500);
        expect(component._boardSearchTerm).toBe('');
        expect(manager._searchDebounceTimer).toBeNull();

        // Safe to call again with no timer
        manager.destroy();
        expect(manager._searchDebounceTimer).toBeNull();
    });
});
