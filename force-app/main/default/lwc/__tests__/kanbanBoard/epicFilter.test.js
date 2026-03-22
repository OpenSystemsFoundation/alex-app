/**
 * Tests for epic filtering in FilterManager
 */
import FilterManager from '../../kanbanBoard/managers/filterManager';

const makeComponent = (overrides = {}) => ({
    _boardSearchTerm: '',
    _boardFilterPriority: 'All',
    _boardFilterCardType: 'All',
    _boardFilterEpic: 'All',
    _boardHideCompleted: false,
    _mobileActiveColumnIndex: 0,
    isSprintBoard: false,
    board: null,
    columns: [],
    template: { querySelector: jest.fn() },
    ...overrides
});

const makeColumn = (cards = []) => ({
    Id: 'col1',
    cards,
    cardCount: cards.length,
    category: 'To Do',
    isCompleted: false,
    hasWipLimit: false,
    wipLimit: null
});

describe('FilterManager - Epic Filter', () => {
    let component;
    let manager;

    beforeEach(() => {
        component = makeComponent();
        manager = new FilterManager(component);
    });

    afterEach(() => {
        manager.destroy();
    });

    it('hasActiveFilters returns false when epic filter is All', () => {
        expect(manager.hasActiveFilters).toBe(false);
    });

    it('hasActiveFilters returns true when epic filter is set', () => {
        component._boardFilterEpic = 'epic1';
        expect(manager.hasActiveFilters).toBe(true);
    });

    it('hasActiveFilters returns true when epic filter is __none__', () => {
        component._boardFilterEpic = '__none__';
        expect(manager.hasActiveFilters).toBe(true);
    });

    it('filters cards by specific epic', () => {
        const cards = [
            { Id: 'c1', epicId: 'epic1', subject: 'Card 1' },
            { Id: 'c2', epicId: 'epic2', subject: 'Card 2' },
            { Id: 'c3', epicId: null, subject: 'Card 3' }
        ];
        component.columns = [makeColumn(cards)];
        component._boardFilterEpic = 'epic1';

        const result = manager.getFilteredColumns();

        expect(result[0].cards).toHaveLength(1);
        expect(result[0].cards[0].Id).toBe('c1');
    });

    it('filters cards with no epic when __none__ selected', () => {
        const cards = [
            { Id: 'c1', epicId: 'epic1', subject: 'Card 1' },
            { Id: 'c2', epicId: null, subject: 'Card 2' },
            { Id: 'c3', subject: 'Card 3' }
        ];
        component.columns = [makeColumn(cards)];
        component._boardFilterEpic = '__none__';

        const result = manager.getFilteredColumns();

        expect(result[0].cards).toHaveLength(2);
        expect(result[0].cards[0].Id).toBe('c2');
        expect(result[0].cards[1].Id).toBe('c3');
    });

    it('shows all cards when epic filter is All', () => {
        const cards = [
            { Id: 'c1', epicId: 'epic1', subject: 'Card 1' },
            { Id: 'c2', epicId: null, subject: 'Card 2' }
        ];
        component.columns = [makeColumn(cards)];
        component._boardFilterEpic = 'All';

        const result = manager.getFilteredColumns();

        expect(result[0].cards).toHaveLength(2);
    });

    it('combines epic filter with card type filter', () => {
        const cards = [
            {
                Id: 'c1',
                epicId: 'epic1',
                cardType: 'Story',
                subject: 'Story 1'
            },
            {
                Id: 'c2',
                epicId: 'epic1',
                cardType: 'Bug',
                subject: 'Bug 1'
            },
            {
                Id: 'c3',
                epicId: 'epic2',
                cardType: 'Story',
                subject: 'Story 2'
            }
        ];
        component.columns = [makeColumn(cards)];
        component._boardFilterEpic = 'epic1';
        component._boardFilterCardType = 'Story';

        const result = manager.getFilteredColumns();

        expect(result[0].cards).toHaveLength(1);
        expect(result[0].cards[0].Id).toBe('c1');
    });

    it('handleEpicFilter sets epic filter value', () => {
        manager.handleEpicFilter({ target: { value: 'epic1' } });
        expect(component._boardFilterEpic).toBe('epic1');
    });

    it('handleClearFilters resets epic filter', () => {
        component._boardFilterEpic = 'epic1';
        manager.handleClearFilters();
        expect(component._boardFilterEpic).toBe('All');
    });
});
