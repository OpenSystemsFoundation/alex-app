/**
 * Unit tests for textDecorationHelper
 */
import { getColumnsWithDecoratedText } from '../../helpers/textDecorationHelper';

const NAME_CLASS =
    'kanban-card__name kanban-card__name--two-line slds-text-link slds-text-color_brand';
const SUBJECT_CLASS = 'kanban-card__subject kanban-card__subject--two-line';
const EPIC_CLASS = 'epic-label__text epic-label__text--two-line';

describe('getColumnsWithDecoratedText', () => {
    it('returns the input unchanged for null columns', () => {
        const cache = {};
        expect(getColumnsWithDecoratedText(null, 'board', cache)).toBeNull();
        expect(cache.value).toBeUndefined();
    });

    it('returns the input unchanged for empty columns', () => {
        const cols = [];
        const cache = {};
        expect(getColumnsWithDecoratedText(cols, 'board', cache)).toBe(cols);
        expect(cache.columnsRef).toBeUndefined();
    });

    it('decorates board cards with name, subject and epic classes', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [
                    {
                        Id: 'c1',
                        Name: 'CARD-1',
                        subject: 'Do the thing',
                        hasEpic: true,
                        epicLabel: 'Epic A'
                    }
                ]
            }
        ];
        const result = getColumnsWithDecoratedText(columns, 'board', {});

        expect(result).not.toBe(columns);
        expect(result[0].Id).toBe('col1');
        expect(result[0].cards[0]).toEqual({
            Id: 'c1',
            Name: 'CARD-1',
            subject: 'Do the thing',
            hasEpic: true,
            epicLabel: 'Epic A',
            nameClass: NAME_CLASS,
            nameTitle: 'CARD-1',
            subjectClass: SUBJECT_CLASS,
            subjectTitle: 'Do the thing',
            epicLabelClass: EPIC_CLASS,
            epicLabelContainerClass: 'epic-label',
            epicLabelTitle: 'Epic A'
        });
    });

    it('uses null titles when board card fields are missing', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1', hasEpic: true }] }];
        const [col] = getColumnsWithDecoratedText(columns, 'board', {});
        const card = col.cards[0];

        expect(card.nameTitle).toBeNull();
        expect(card.subjectTitle).toBeNull();
        expect(card.subjectClass).toBe(SUBJECT_CLASS);
        expect(card.epicLabelTitle).toBeNull();
    });

    it('omits epic decoration for board cards without an epic', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1', Name: 'N' }] }];
        const [col] = getColumnsWithDecoratedText(columns, 'board', {});

        expect(col.cards[0].nameClass).toBe(NAME_CLASS);
        expect(col.cards[0]).not.toHaveProperty('epicLabelClass');
    });

    it('only adds subject decoration in swimlane context', () => {
        const columns = [
            {
                Id: 'col1',
                cards: [{ Id: 'c1', Name: 'N', subject: 'S', hasEpic: true }]
            }
        ];
        const [col] = getColumnsWithDecoratedText(columns, 'swimlane', {});
        const card = col.cards[0];

        expect(card).not.toHaveProperty('nameClass');
        expect(card).not.toHaveProperty('epicLabelClass');
        expect(card.subjectClass).toBe(SUBJECT_CLASS);
        expect(card.subjectTitle).toBe('S');
    });

    it('handles columns with no cards array and null card entries', () => {
        const columns = [{ Id: 'col1' }, { Id: 'col2', cards: [null] }];
        const result = getColumnsWithDecoratedText(columns, 'board', {});

        expect(result[0].cards).toEqual([]);
        expect(result[1].cards).toEqual([null]);
    });

    it('returns the cached value when columns and context are unchanged', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1' }] }];
        const cache = {};
        const first = getColumnsWithDecoratedText(columns, 'board', cache);

        expect(cache.columnsRef).toBe(columns);
        expect(cache.context).toBe('board');
        expect(cache.value).toBe(first);
        expect(getColumnsWithDecoratedText(columns, 'board', cache)).toBe(
            first
        );
    });

    it('recomputes when context changes', () => {
        const columns = [{ Id: 'col1', cards: [{ Id: 'c1', Name: 'N' }] }];
        const cache = {};
        const board = getColumnsWithDecoratedText(columns, 'board', cache);
        const lane = getColumnsWithDecoratedText(columns, 'swimlane', cache);

        expect(lane).not.toBe(board);
        expect(lane[0].cards[0]).not.toHaveProperty('nameClass');
        expect(cache.context).toBe('swimlane');
    });

    it('recomputes when the columns reference changes', () => {
        const cache = {};
        const first = getColumnsWithDecoratedText(
            [{ Id: 'a', cards: [] }],
            'board',
            cache
        );
        const second = getColumnsWithDecoratedText(
            [{ Id: 'b', cards: [] }],
            'board',
            cache
        );

        expect(second).not.toBe(first);
        expect(second[0].Id).toBe('b');
    });
});
