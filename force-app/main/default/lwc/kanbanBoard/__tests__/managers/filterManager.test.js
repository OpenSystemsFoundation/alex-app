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
