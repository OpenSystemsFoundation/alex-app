/**
 * Unit tests for dataProcessors
 *
 * Covers: setEpicSummaryMap, setCardTypeIconMap, processColumnsData,
 * enrichCardData, processCardsData
 */
import {
    setEpicSummaryMap,
    setCardTypeIconMap,
    processColumnsData,
    enrichCardData,
    processCardsData
} from '../../utils/dataProcessors';
import { buildCard, resetIds } from 'jest-helpers/testDataFactory';

beforeEach(() => {
    resetIds();
    // Module-level caches persist across tests within this file
    setCardTypeIconMap(null);
    setEpicSummaryMap(null);
});

describe('processColumnsData', () => {
    it('returns [] for null, undefined and empty input', () => {
        expect(processColumnsData(null)).toEqual([]);
        expect(processColumnsData(undefined)).toEqual([]);
        expect(processColumnsData([])).toEqual([]);
    });

    it('adds derived properties for a colored Done column with WIP limit', () => {
        const [col] = processColumnsData([
            { Id: 'col1', color: '#f00', category: 'Done', wipLimit: 3 }
        ]);
        expect(col).toEqual({
            Id: 'col1',
            color: '#f00',
            category: 'Done',
            wipLimit: 3,
            cardCount: 0,
            cards: [],
            columnStyle: 'border-top: 4px solid #f00',
            columnUrl: '/lightning/r/OpenSF__Column__c/col1/view',
            communityColumnUrl: '/column/col1',
            isDone: true,
            isReleased: false,
            isCompleted: true,
            hasWipLimit: true,
            isOverWipLimit: false
        });
    });

    it('handles Released, uncolored and no-WIP columns', () => {
        const [released, plain, zeroWip] = processColumnsData([
            { Id: 'r', category: 'Released' },
            { Id: 'p', category: 'InProgress', wipLimit: null },
            { Id: 'z', category: 'Backlog', wipLimit: 0 }
        ]);
        expect(released.isReleased).toBe(true);
        expect(released.isDone).toBe(false);
        expect(released.isCompleted).toBe(true);
        expect(released.columnStyle).toBe('');
        expect(released.hasWipLimit).toBe(false);

        expect(plain.isCompleted).toBe(false);
        expect(plain.hasWipLimit).toBe(false);
        expect(zeroWip.hasWipLimit).toBe(false);
    });

    it('replaces any existing cards with an empty array', () => {
        const [col] = processColumnsData([
            { Id: 'c', cards: [{ Id: 'x' }], cardCount: 5 }
        ]);
        expect(col.cards).toEqual([]);
        expect(col.cardCount).toBe(0);
    });
});

describe('enrichCardData', () => {
    it('derives defaults for a minimal card', () => {
        const result = enrichCardData({ Id: 'c1' });
        expect(result).toEqual({
            Id: 'c1',
            priorityClass: '',
            assigneeInitials: '',
            hasAssignee: false,
            formattedDueDate: null,
            isOverdue: false,
            hasStoryPoints: false,
            cardStyle: '',
            recordUrl: '/lightning/r/OpenSF__Card__c/c1/view',
            communityCardUrl: '/card/c1',
            cardTypeIconName: null,
            customFieldEntries: [],
            hasCustomFields: false,
            isEpic: false,
            epicProgress: null,
            hasEpicProgress: false,
            hasEpic: false,
            epicLabel: null,
            epicColor: null
        });
    });

    it('maps priority classes', () => {
        expect(
            enrichCardData({ Id: 'a', priority: 'High' }).priorityClass
        ).toBe('priority-high');
        expect(
            enrichCardData({ Id: 'a', priority: 'Medium' }).priorityClass
        ).toBe('priority-medium');
        expect(enrichCardData({ Id: 'a', priority: 'Low' }).priorityClass).toBe(
            'priority-low'
        );
        expect(
            enrichCardData({ Id: 'a', priority: 'Critical' }).priorityClass
        ).toBe('');
    });

    it('derives assignee initials (max 2, uppercased)', () => {
        const card = enrichCardData({
            Id: 'a',
            assigneeId: 'u1',
            assignee: { name: 'ada king lovelace' }
        });
        expect(card.assigneeInitials).toBe('AK');
        expect(card.hasAssignee).toBe(true);

        const single = enrichCardData({
            Id: 'a',
            assigneeId: 'u1',
            assignee: { name: 'Grace' }
        });
        expect(single.assigneeInitials).toBe('G');
    });

    it('hasAssignee requires both assigneeId and assignee', () => {
        expect(
            enrichCardData({ Id: 'a', assignee: { name: 'X Y' } }).hasAssignee
        ).toBe(false);
        const noObj = enrichCardData({ Id: 'a', assigneeId: 'u1' });
        expect(noObj.hasAssignee).toBe(false);
        expect(noObj.assigneeInitials).toBe('');
    });

    it('formats due date and computes overdue', () => {
        const past = enrichCardData({ Id: 'a', dueDate: '2000-01-15' });
        expect(past.formattedDueDate).toBe(
            new Date('2000-01-15').toLocaleDateString()
        );
        expect(past.isOverdue).toBe(true);

        const future = enrichCardData({ Id: 'a', dueDate: '2999-01-15' });
        expect(future.isOverdue).toBe(false);
        expect(future.formattedDueDate).toBe(
            new Date('2999-01-15').toLocaleDateString()
        );
    });

    it('hasStoryPoints is true for 0 and false for null', () => {
        expect(enrichCardData({ Id: 'a', storyPoints: 0 }).hasStoryPoints).toBe(
            true
        );
        expect(
            enrichCardData({ Id: 'a', storyPoints: null }).hasStoryPoints
        ).toBe(false);
    });

    it('builds card style from color', () => {
        expect(enrichCardData({ Id: 'a', color: 'blue' }).cardStyle).toBe(
            'border-left: 4px solid blue'
        );
    });

    it('uses explicitly passed icon map', () => {
        const card = enrichCardData(
            { Id: 'a', cardType: 'Bug' },
            { Bug: 'utility:bug' }
        );
        expect(card.cardTypeIconName).toBe('utility:bug');
    });

    it('falls back to cached icon map and returns null for unknown types', () => {
        setCardTypeIconMap({ Story: 'utility:story' });
        expect(
            enrichCardData({ Id: 'a', cardType: 'Story' }).cardTypeIconName
        ).toBe('utility:story');
        expect(
            enrichCardData({ Id: 'a', cardType: 'Task' }).cardTypeIconName
        ).toBeNull();
        expect(enrichCardData({ Id: 'a' }).cardTypeIconName).toBeNull();
    });

    it('explicit icon map overrides the cached one', () => {
        setCardTypeIconMap({ Story: 'cached' });
        expect(
            enrichCardData(
                { Id: 'a', cardType: 'Story' },
                { Story: 'explicit' }
            ).cardTypeIconName
        ).toBe('explicit');
    });

    it('returns null icon when no map is available', () => {
        setCardTypeIconMap(undefined);
        expect(
            enrichCardData({ Id: 'a', cardType: 'Story' }).cardTypeIconName
        ).toBeNull();
    });

    it('builds custom field entries skipping empty values', () => {
        const card = enrichCardData({
            Id: 'a',
            customFields: {
                Story_Owner__c: 'Ann',
                Zero__c: 0,
                Flag__c: false,
                Empty__c: '',
                Null__c: null,
                Undef__c: undefined
            }
        });
        expect(card.customFieldEntries).toEqual([
            { key: 'Story_Owner__c', value: 'Ann', label: 'Story Owner' },
            { key: 'Zero__c', value: 0, label: 'Zero' },
            { key: 'Flag__c', value: false, label: 'Flag' }
        ]);
        expect(card.hasCustomFields).toBe(true);
    });

    it('hasCustomFields is false when all custom fields are empty', () => {
        const card = enrichCardData({
            Id: 'a',
            customFields: { A__c: '', B__c: null }
        });
        expect(card.customFieldEntries).toEqual([]);
        expect(card.hasCustomFields).toBe(false);
    });

    it('derives epic info from card.epic', () => {
        const card = enrichCardData({
            Id: 'a',
            epicId: 'e1',
            epic: { subject: 'Big Epic', color: '#0f0' }
        });
        expect(card.hasEpic).toBe(true);
        expect(card.epicLabel).toBe('Big Epic');
        expect(card.epicColor).toBe('#0f0');
    });

    it('epic label/color are null when epic fields are empty', () => {
        const card = enrichCardData({ Id: 'a', epicId: 'e1', epic: {} });
        expect(card.hasEpic).toBe(true);
        expect(card.epicLabel).toBeNull();
        expect(card.epicColor).toBeNull();
    });

    describe('epic progress', () => {
        it('is null for Epic cards when no summaries are set', () => {
            const card = enrichCardData({ Id: 'e1', cardType: 'Epic' });
            expect(card.isEpic).toBe(true);
            expect(card.epicProgress).toBeNull();
            expect(card.hasEpicProgress).toBe(false);
        });

        it('is derived from the summary map for Epic cards', () => {
            setEpicSummaryMap([
                {
                    id: 'e1',
                    totalCards: 4,
                    completedCards: 1,
                    totalPoints: 10,
                    completedPoints: 3,
                    progressPercent: 30
                }
            ]);
            const card = enrichCardData({ Id: 'e1', cardType: 'Epic' });
            expect(card.epicProgress).toEqual({
                totalCards: 4,
                completedCards: 1,
                totalPoints: 10,
                completedPoints: 3,
                progressPercent: 'width: 30%',
                progressPercentValue: 30
            });
            expect(card.hasEpicProgress).toBe(true);
        });

        it('defaults missing summary numbers to 0', () => {
            setEpicSummaryMap([{ id: 'e1' }]);
            const card = enrichCardData({ Id: 'e1', cardType: 'Epic' });
            expect(card.epicProgress).toEqual({
                totalCards: 0,
                completedCards: 0,
                totalPoints: 0,
                completedPoints: 0,
                progressPercent: 'width: 0%',
                progressPercentValue: 0
            });
            expect(card.hasEpicProgress).toBe(false);
        });

        it('is null when the epic has no summary', () => {
            setEpicSummaryMap([{ id: 'other', totalCards: 2 }]);
            expect(
                enrichCardData({ Id: 'e1', cardType: 'Epic' }).epicProgress
            ).toBeNull();
        });

        it('is null for non-Epic cards even with a summary', () => {
            setEpicSummaryMap([{ id: 's1', totalCards: 2 }]);
            const card = enrichCardData({ Id: 's1', cardType: 'Story' });
            expect(card.isEpic).toBe(false);
            expect(card.epicProgress).toBeNull();
        });

        it('setEpicSummaryMap with empty array clears the map', () => {
            setEpicSummaryMap([{ id: 'e1', totalCards: 2 }]);
            setEpicSummaryMap([]);
            expect(
                enrichCardData({ Id: 'e1', cardType: 'Epic' }).epicProgress
            ).toBeNull();
        });
    });
});

describe('processCardsData', () => {
    it('returns columns unchanged when cards or columns are missing', () => {
        const cols = [{ Id: 'col1' }];
        expect(processCardsData(null, cols)).toBe(cols);
        expect(processCardsData([], null)).toBeNull();
        const empty = [];
        expect(processCardsData([buildCard()], empty)).toBe(empty);
    });

    it('distributes, enriches, and sorts cards by position', () => {
        const columns = processColumnsData([
            { Id: 'col1', wipLimit: 1 },
            { Id: 'col2' }
        ]);
        const cards = [
            buildCard({ Id: 'b', columnId: 'col1', position: 'b' }),
            buildCard({ Id: 'nopos1', columnId: 'col1', position: null }),
            buildCard({ Id: 'a', columnId: 'col1', position: 'a' }),
            buildCard({ Id: 'nopos2', columnId: 'col1', position: null }),
            buildCard({ Id: 'x', columnId: 'col2', position: 'm' }),
            buildCard({ Id: 'orphan', columnId: 'gone' })
        ];

        const result = processCardsData(cards, columns, { Story: 'icon' });

        expect(result).not.toBe(columns);
        expect(columns[0].cards).toEqual([]);
        expect(result[0].cards.map((c) => c.Id)).toEqual([
            'a',
            'b',
            'nopos1',
            'nopos2'
        ]);
        expect(result[0].cardCount).toBe(4);
        expect(result[0].isOverWipLimit).toBe(true);
        expect(result[0].cards[0].cardTypeIconName).toBe('icon');
        expect(result[0].cards[0].recordUrl).toBe(
            '/lightning/r/OpenSF__Card__c/a/view'
        );

        expect(result[1].cards.map((c) => c.Id)).toEqual(['x']);
        expect(result[1].cardCount).toBe(1);
        expect(result[1].isOverWipLimit).toBe(false);
    });

    it('resets pre-existing cards on the columns', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'stale' }],
                cardCount: 1,
                hasWipLimit: true,
                wipLimit: 5
            }
        ];
        const result = processCardsData(
            [buildCard({ Id: 'fresh', columnId: 'col1' })],
            columns
        );
        expect(result[0].cards.map((c) => c.Id)).toEqual(['fresh']);
        expect(result[0].cardCount).toBe(1);
        expect(result[0].isOverWipLimit).toBe(false);
    });

    it('puts positioned cards before unpositioned ones regardless of input order', () => {
        const columns = [{ Id: 'col1' }];
        const result = processCardsData(
            [
                buildCard({ Id: 'p', columnId: 'col1', position: 'z' }),
                buildCard({ Id: 'n', columnId: 'col1', position: '' })
            ],
            columns
        );
        expect(result[0].cards.map((c) => c.Id)).toEqual(['p', 'n']);
        const reversed = processCardsData(
            [
                buildCard({ Id: 'n', columnId: 'col1', position: '' }),
                buildCard({ Id: 'p', columnId: 'col1', position: 'z' })
            ],
            columns
        );
        expect(reversed[0].cards.map((c) => c.Id)).toEqual(['p', 'n']);
        expect(result[0].isOverWipLimit).toBeUndefined();
    });
});
