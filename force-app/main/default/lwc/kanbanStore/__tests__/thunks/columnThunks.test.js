/**
 * Unit tests for columnThunks — async action creators for column operations.
 */

jest.mock(
    '@salesforce/apex/ColumnManagementController.createColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ColumnManagementController.updateColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ColumnManagementController.deleteColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ColumnManagementController.reorderColumn',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ColumnManagementController.createDefaultColumns',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

import createColumnApex from '@salesforce/apex/ColumnManagementController.createColumn';
import updateColumnApex from '@salesforce/apex/ColumnManagementController.updateColumn';
import deleteColumnApex from '@salesforce/apex/ColumnManagementController.deleteColumn';
import reorderColumnApex from '@salesforce/apex/ColumnManagementController.reorderColumn';
import createDefaultColumnsApex from '@salesforce/apex/ColumnManagementController.createDefaultColumns';

import {
    createColumnAsync,
    updateColumnAsync,
    deleteColumnAsync,
    reorderColumnAsync,
    createColumnsFromTemplateAsync
} from '../../thunks/columnThunks';
import { SET_COLUMNS } from '../../core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

function createThunkEnv(stateOverrides = {}) {
    const dispatched = [];
    const state = buildInitialState(stateOverrides);
    const dispatch = jest.fn((action) => {
        dispatched.push(action);
        return action;
    });
    const getState = jest.fn(() => state);
    return { dispatch, getState, dispatched, state };
}

beforeEach(() => {
    resetIds();
    jest.clearAllMocks();
});

describe('createColumnAsync', () => {
    it('creates a column after the last one and appends it to state', async () => {
        const col1 = buildColumn({ Id: 'col1', position: '1000' });
        const col2 = buildColumn({ Id: 'col2', position: '2000' });
        const newColumn = {
            Id: 'col3',
            name: 'QA',
            position: '3000',
            category: 'Done',
            color: '#00ff00',
            wipLimit: 3
        };
        createColumnApex.mockResolvedValue(newColumn);
        const { dispatch, getState, dispatched } = createThunkEnv({
            boardId: 'board1',
            columns: [col1, col2]
        });

        const result = await createColumnAsync(
            'QA',
            'Done',
            '#00ff00',
            'Active',
            3
        )(dispatch, getState);

        expect(createColumnApex).toHaveBeenCalledWith({
            boardId: 'board1',
            columnHeader: 'QA',
            category: 'Done',
            color: '#00ff00',
            status: 'Active',
            wipLimit: 3,
            previousPosition: '2000',
            nextPosition: null
        });
        expect(result).toEqual({ success: true, column: newColumn });
        expect(dispatched).toHaveLength(1);
        expect(dispatched[0].type).toBe(SET_COLUMNS);
        const columns = dispatched[0].payload;
        expect(columns.map((c) => c.Id)).toEqual(['col1', 'col2', 'col3']);
        // New column is processed with derived props
        expect(columns[2]).toEqual(
            expect.objectContaining({
                Id: 'col3',
                cards: [],
                cardCount: 0,
                columnStyle: 'border-top: 4px solid #00ff00',
                isDone: true,
                isCompleted: true,
                hasWipLimit: true
            })
        );
        // Existing columns are kept as-is
        expect(columns[0]).toBe(col1);
    });

    it('uses a null previous position for the first column on the board', async () => {
        createColumnApex.mockResolvedValue({ Id: 'col1', position: '1000' });
        const { dispatch, getState, dispatched } = createThunkEnv({
            boardId: 'board1',
            columns: []
        });

        await createColumnAsync(
            'To Do',
            'ToDo',
            null,
            'Active',
            null
        )(dispatch, getState);

        expect(createColumnApex).toHaveBeenCalledWith(
            expect.objectContaining({
                boardId: 'board1',
                previousPosition: null,
                nextPosition: null
            })
        );
        expect(dispatched[0].payload.map((c) => c.Id)).toEqual(['col1']);
    });

    it('sends a null boardId when none is set', async () => {
        createColumnApex.mockResolvedValue({ Id: 'col1' });
        const { dispatch, getState } = createThunkEnv({ boardId: undefined });

        await createColumnAsync(
            'X',
            'ToDo',
            null,
            'Active',
            null
        )(dispatch, getState);

        expect(createColumnApex).toHaveBeenCalledWith(
            expect.objectContaining({ boardId: null })
        );
    });

    it('propagates Apex errors without dispatching', async () => {
        createColumnApex.mockRejectedValue(new Error('create failed'));
        const { dispatch, getState } = createThunkEnv({ boardId: 'board1' });

        await expect(
            createColumnAsync(
                'X',
                'ToDo',
                null,
                'Active',
                null
            )(dispatch, getState)
        ).rejects.toThrow('create failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('updateColumnAsync', () => {
    const makeColumns = () => [
        buildColumn({
            Id: 'col1',
            name: 'To Do',
            category: 'ToDo',
            columnStyle: 'border-top: 4px solid #111111'
        }),
        buildColumn({ Id: 'col2', name: 'Doing' })
    ];

    it('applies plain field updates optimistically and persists them', async () => {
        const columns = makeColumns();
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({ columns });

        const result = await updateColumnAsync('col1', { name: 'Backlog' })(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(updateColumnApex).toHaveBeenCalledWith({
            columnId: 'col1',
            updates: { name: 'Backlog' }
        });
        expect(dispatched).toHaveLength(1);
        const [updated, untouched] = dispatched[0].payload;
        expect(updated).toEqual({ ...columns[0], name: 'Backlog' });
        // No derived props recomputed for unrelated fields
        expect(updated.columnStyle).toBe('border-top: 4px solid #111111');
        expect(updated).not.toHaveProperty('isDone');
        expect(untouched).toBe(columns[1]);
    });

    it('recomputes columnStyle when the color changes', async () => {
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: makeColumns()
        });

        await updateColumnAsync('col1', { color: '#ff0000' })(
            dispatch,
            getState
        );

        expect(dispatched[0].payload[0].columnStyle).toBe(
            'border-top: 4px solid #ff0000'
        );
    });

    it('clears columnStyle when the color is removed', async () => {
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: makeColumns()
        });

        await updateColumnAsync('col1', { color: '' })(dispatch, getState);

        expect(dispatched[0].payload[0].columnStyle).toBe('');
    });

    it.each([
        ['Done', { isDone: true, isReleased: false, isCompleted: true }],
        ['Released', { isDone: false, isReleased: true, isCompleted: true }],
        ['InProgress', { isDone: false, isReleased: false, isCompleted: false }]
    ])('derives completion flags for category %s', async (category, flags) => {
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: makeColumns()
        });

        await updateColumnAsync('col1', { category })(dispatch, getState);

        expect(dispatched[0].payload[0]).toEqual(
            expect.objectContaining({ category, ...flags })
        );
    });

    it.each([
        [5, true],
        [0, false],
        [null, false]
    ])('sets hasWipLimit for wipLimit %p to %p', async (wipLimit, expected) => {
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: makeColumns()
        });

        await updateColumnAsync('col1', { wipLimit })(dispatch, getState);

        expect(dispatched[0].payload[0].hasWipLimit).toBe(expected);
        expect(dispatched[0].payload[0].wipLimit).toBe(wipLimit);
    });

    it('rolls back to the original columns on Apex failure', async () => {
        const columns = makeColumns();
        updateColumnApex.mockRejectedValue(new Error('update failed'));
        const { dispatch, getState, dispatched } = createThunkEnv({ columns });

        await expect(
            updateColumnAsync('col1', { name: 'Nope' })(dispatch, getState)
        ).rejects.toThrow('update failed');

        expect(dispatched).toHaveLength(2);
        expect(dispatched[0].payload[0].name).toBe('Nope');
        expect(dispatched[1]).toEqual({ type: SET_COLUMNS, payload: columns });
    });

    it('updates the drag-state columns while dragging', async () => {
        const dragColumns = makeColumns();
        updateColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [],
            isDragging: true,
            dragState: dragColumns
        });

        await updateColumnAsync('col2', { name: 'Review' })(dispatch, getState);

        expect(dispatched[0].payload.map((c) => c.name)).toEqual([
            'To Do',
            'Review'
        ]);
    });
});

describe('deleteColumnAsync', () => {
    it('optimistically removes the column and persists the delete', async () => {
        const col1 = buildColumn({ Id: 'col1' });
        const col2 = buildColumn({ Id: 'col2' });
        deleteColumnApex.mockResolvedValue(undefined);
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [col1, col2]
        });

        const result = await deleteColumnAsync('col1')(dispatch, getState);

        expect(result).toEqual({ success: true });
        expect(deleteColumnApex).toHaveBeenCalledWith({ columnId: 'col1' });
        expect(dispatched).toEqual([{ type: SET_COLUMNS, payload: [col2] }]);
    });

    it('restores the column on Apex failure', async () => {
        const columns = [
            buildColumn({ Id: 'col1' }),
            buildColumn({ Id: 'col2' })
        ];
        deleteColumnApex.mockRejectedValue(new Error('delete failed'));
        const { dispatch, getState, dispatched } = createThunkEnv({ columns });

        await expect(
            deleteColumnAsync('col2')(dispatch, getState)
        ).rejects.toThrow('delete failed');

        expect(dispatched).toEqual([
            { type: SET_COLUMNS, payload: [columns[0]] },
            { type: SET_COLUMNS, payload: columns }
        ]);
    });
});

describe('reorderColumnAsync', () => {
    const colA = buildColumn({ Id: 'A', position: '1000' });
    const colB = buildColumn({ Id: 'B', position: '2000' });
    const colC = buildColumn({ Id: 'C', position: '3000' });

    it('sends both neighbor positions for a middle drop and applies the server position', async () => {
        const reordered = [colA, colC, colB];
        reorderColumnApex.mockResolvedValue({ position: '1500' });
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: [colA, colB, colC]
        });

        const result = await reorderColumnAsync(
            'C',
            1,
            reordered
        )(dispatch, getState);

        expect(result).toEqual({ success: true });
        expect(reorderColumnApex).toHaveBeenCalledWith({
            columnId: 'C',
            previousPosition: '1000',
            nextPosition: '2000'
        });
        expect(dispatched).toHaveLength(2);
        expect(dispatched[0]).toEqual({
            type: SET_COLUMNS,
            payload: reordered
        });
        const final = dispatched[1].payload;
        expect(final.map((c) => c.Id)).toEqual(['A', 'C', 'B']);
        expect(final[1].position).toBe('1500');
        expect(final[0]).toBe(colA);
        expect(final[2]).toBe(colB);
    });

    it('uses a null previous position when dropped first', async () => {
        reorderColumnApex.mockResolvedValue({ position: '0500' });
        const { dispatch, getState } = createThunkEnv({
            columns: [colA, colB, colC]
        });

        await reorderColumnAsync('C', 0, [colC, colA, colB])(
            dispatch,
            getState
        );

        expect(reorderColumnApex).toHaveBeenCalledWith({
            columnId: 'C',
            previousPosition: null,
            nextPosition: '1000'
        });
    });

    it('uses a null next position when dropped last', async () => {
        reorderColumnApex.mockResolvedValue({ position: '4000' });
        const { dispatch, getState } = createThunkEnv({
            columns: [colA, colB, colC]
        });

        await reorderColumnAsync('A', 2, [colB, colC, colA])(
            dispatch,
            getState
        );

        expect(reorderColumnApex).toHaveBeenCalledWith({
            columnId: 'A',
            previousPosition: '3000',
            nextPosition: null
        });
    });

    it('rolls back to the original order on Apex failure', async () => {
        const original = [colA, colB, colC];
        reorderColumnApex.mockRejectedValue(new Error('reorder failed'));
        const { dispatch, getState, dispatched } = createThunkEnv({
            columns: original
        });

        await expect(
            reorderColumnAsync('C', 0, [colC, colA, colB])(dispatch, getState)
        ).rejects.toThrow('reorder failed');

        expect(dispatched).toHaveLength(2);
        expect(dispatched[1]).toEqual({ type: SET_COLUMNS, payload: original });
    });
});

describe('createColumnsFromTemplateAsync', () => {
    it('creates template columns and preserves cards from existing columns', async () => {
        const card1 = buildCard({ Id: 'c1' });
        const card2 = buildCard({ Id: 'c2' });
        const existing = [
            buildColumn({ Id: 'col1', cards: [card1, card2] }),
            buildColumn({ Id: 'colEmpty', cards: [] }),
            { Id: 'colNoCards' }
        ];
        const fresh = [
            { Id: 'col1', name: 'To Do', category: 'ToDo', position: '1000' },
            { Id: 'col2', name: 'Done', category: 'Done', position: '2000' },
            { Id: 'colNoCards', name: 'Other', position: '3000' }
        ];
        createDefaultColumnsApex.mockResolvedValue(fresh);
        const { dispatch, getState, dispatched } = createThunkEnv({
            boardId: 'board1',
            columns: existing
        });

        const result = await createColumnsFromTemplateAsync('scrum')(
            dispatch,
            getState
        );

        expect(result).toEqual({ success: true });
        expect(createDefaultColumnsApex).toHaveBeenCalledWith({
            boardId: 'board1',
            templateName: 'scrum'
        });
        expect(dispatched).toHaveLength(1);
        expect(dispatched[0].type).toBe(SET_COLUMNS);
        const [todo, done, other] = dispatched[0].payload;
        expect(todo).toEqual(
            expect.objectContaining({
                Id: 'col1',
                name: 'To Do',
                cards: [card1, card2],
                cardCount: 2
            })
        );
        expect(done).toEqual(
            expect.objectContaining({
                Id: 'col2',
                cards: [],
                cardCount: 0,
                isDone: true
            })
        );
        expect(other).toEqual(
            expect.objectContaining({
                Id: 'colNoCards',
                cards: [],
                cardCount: 0
            })
        );
    });

    it('dispatches an empty column list when the template returns nothing', async () => {
        createDefaultColumnsApex.mockResolvedValue([]);
        const { dispatch, getState, dispatched } = createThunkEnv({
            boardId: 'board1',
            columns: [buildColumn({ Id: 'col1' })]
        });

        await createColumnsFromTemplateAsync('kanban')(dispatch, getState);

        expect(dispatched).toEqual([{ type: SET_COLUMNS, payload: [] }]);
    });

    it('propagates Apex errors without dispatching', async () => {
        createDefaultColumnsApex.mockRejectedValue(
            new Error('template failed')
        );
        const { dispatch, getState } = createThunkEnv({ boardId: 'board1' });

        await expect(
            createColumnsFromTemplateAsync('release')(dispatch, getState)
        ).rejects.toThrow('template failed');
        expect(dispatch).not.toHaveBeenCalled();
    });
});
