/**
 * Unit tests for SwimlaneManager
 */
import SwimlaneManager from '../../managers/swimlaneManager';

function buildColumns() {
    return [
        {
            Id: 'todo',
            cards: [
                {
                    Id: 'c1',
                    assigneeId: 'u1',
                    assignee: { name: 'Zed' },
                    priority: 'High',
                    cardType: 'Bug',
                    epicId: 'e1',
                    epic: { subject: 'Payments' }
                },
                { Id: 'c2' }
            ]
        },
        {
            Id: 'done',
            cards: [
                {
                    Id: 'c3',
                    assigneeId: 'u2',
                    assignee: { name: 'Amy' },
                    priority: 'Low',
                    cardType: 'Story',
                    epicId: 'e2',
                    epic: {}
                },
                { Id: 'c4', assigneeId: 'u1' }
            ]
        },
        { Id: 'empty' }
    ];
}

function laneCardIds(lane) {
    return lane.columns.map((col) => col.cards.map((c) => c.Id));
}

describe('SwimlaneManager', () => {
    let component;
    let manager;

    beforeEach(() => {
        component = { _swimlaneMode: 'none' };
        manager = new SwimlaneManager(component);
    });

    it('exposes the mode options', () => {
        expect(manager.modeOptions.map((o) => o.value)).toEqual([
            'none',
            'assignee',
            'priority',
            'cardType',
            'epic'
        ]);
        expect(manager.modeOptions[0].label).toBe('No Swimlanes');
    });

    it('reports active state from the component mode', () => {
        expect(manager.isActive).toBe(false);
        component._swimlaneMode = 'priority';
        expect(manager.isActive).toBe(true);
    });

    it('returns no swimlanes when inactive', () => {
        expect(manager.getSwimlanes(buildColumns())).toEqual([]);
    });

    it('returns no swimlanes for null or empty columns', () => {
        component._swimlaneMode = 'assignee';
        expect(manager.getSwimlanes(null)).toEqual([]);
        expect(manager.getSwimlanes([])).toEqual([]);
    });

    it('groups by assignee with an Unassigned lane, sorted by label', () => {
        component._swimlaneMode = 'assignee';
        const lanes = manager.getSwimlanes(buildColumns());

        expect(lanes.map((l) => [l.key, l.label, l.totalCards])).toEqual([
            ['u2', 'Amy', 1],
            ['__unassigned__', 'Unassigned', 1],
            // c4 has assigneeId u1 but no name; the first card seen sets label
            ['u1', 'Zed', 2]
        ]);
        const zed = lanes[2];
        expect(laneCardIds(zed)).toEqual([['c1'], ['c4'], []]);
        expect(zed.columns[0]).toMatchObject({
            Id: 'todo',
            cardCount: 1,
            laneKey: 'u1-todo'
        });
        expect(zed.columns[2].cardCount).toBe(0);
    });

    it('groups by priority', () => {
        component._swimlaneMode = 'priority';
        const lanes = manager.getSwimlanes(buildColumns());
        expect(lanes.map((l) => l.label)).toEqual([
            'High',
            'Low',
            'No Priority'
        ]);
        expect(lanes.find((l) => l.key === '__none__').totalCards).toBe(2);
    });

    it('groups by card type', () => {
        component._swimlaneMode = 'cardType';
        const lanes = manager.getSwimlanes(buildColumns());
        expect(lanes.map((l) => [l.key, l.label])).toEqual([
            ['Bug', 'Bug'],
            ['__none__', 'No Type'],
            ['Story', 'Story']
        ]);
        expect(laneCardIds(lanes[1])).toEqual([['c2'], ['c4'], []]);
    });

    it('groups by epic, falling back to No Epic labels', () => {
        component._swimlaneMode = 'epic';
        const lanes = manager.getSwimlanes(buildColumns());
        expect(lanes.map((l) => [l.key, l.label, l.totalCards])).toEqual([
            ['__none__', 'No Epic', 2],
            ['e2', 'No Epic', 1],
            ['e1', 'Payments', 1]
        ]);
    });

    it('puts all cards in a single lane for an unknown mode', () => {
        component._swimlaneMode = 'custom';
        const lanes = manager.getSwimlanes(buildColumns());
        expect(lanes).toHaveLength(1);
        expect(lanes[0]).toMatchObject({
            key: '__all__',
            label: 'All',
            totalCards: 4
        });
        expect(laneCardIds(lanes[0])).toEqual([['c1', 'c2'], ['c3', 'c4'], []]);
    });

    it('returns no lanes when columns have no cards', () => {
        component._swimlaneMode = 'assignee';
        expect(
            manager.getSwimlanes([{ Id: 'a' }, { Id: 'b', cards: [] }])
        ).toEqual([]);
    });

    it('memoizes results for the same columns reference and mode', () => {
        component._swimlaneMode = 'priority';
        const cols = buildColumns();
        const first = manager.getSwimlanes(cols);
        expect(manager.getSwimlanes(cols)).toBe(first);

        component._swimlaneMode = 'cardType';
        const second = manager.getSwimlanes(cols);
        expect(second).not.toBe(first);
        expect(second.map((l) => l.label)).toContain('No Type');

        const third = manager.getSwimlanes(buildColumns());
        expect(third).not.toBe(second);
        expect(third).toEqual(second);
    });

    it('sorts lanes alphabetically by label', () => {
        component._swimlaneMode = 'priority';
        const lanes = manager.getSwimlanes([
            { Id: 'a', cards: [{ priority: 'b' }, { priority: 'C' }] },
            { Id: 'b', cards: [{ priority: 'A' }] }
        ]);
        expect(lanes.map((l) => l.label)).toEqual(['A', 'b', 'C']);
    });

    describe('handleModeChange', () => {
        it('reads the value from event.detail', () => {
            manager.handleModeChange({ detail: { value: 'epic' } });
            expect(component._swimlaneMode).toBe('epic');
        });

        it('falls back to event.target.value', () => {
            manager.handleModeChange({ target: { value: 'priority' } });
            expect(component._swimlaneMode).toBe('priority');
        });

        it('defaults to none', () => {
            component._swimlaneMode = 'epic';
            manager.handleModeChange({});
            expect(component._swimlaneMode).toBe('none');
        });
    });
});
