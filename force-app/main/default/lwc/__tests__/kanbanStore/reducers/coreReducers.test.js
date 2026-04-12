/**
 * Unit tests for cardsReducer, columnsReducer, boardReducer,
 * appStateReducer, syncReducer, dragReducer
 */
import { cardsReducer } from '../../../kanbanStore/state/reducers/cardsReducer';
import { columnsReducer } from '../../../kanbanStore/state/reducers/columnsReducer';
import { boardReducer } from '../../../kanbanStore/state/reducers/boardReducer';
import { appStateReducer } from '../../../kanbanStore/state/reducers/appStateReducer';
import { syncReducer } from '../../../kanbanStore/state/reducers/syncReducer';
import { dragReducer } from '../../../kanbanStore/state/reducers/dragReducer';
import * as types from '../../../kanbanStore/core/actionTypes';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from '../../helpers/testDataFactory';

beforeEach(() => resetIds());

const run = (reducer, state, type, payload) =>
    reducer(state, { type, payload });

// ═══════════════════════════════════════════════════════════
// boardReducer
// ═══════════════════════════════════════════════════════════

describe('boardReducer', () => {
    it('SET_BOARD sets board and boardId', () => {
        const board = { Id: 'b1', Name: 'My Board', type: 'Sprint' };
        const state = buildInitialState();
        const next = run(boardReducer, state, types.SET_BOARD, board);
        expect(next.board).toEqual(board);
        expect(next.boardId).toBe('b1');
    });

    it('SET_BOARD_ID sets just the id', () => {
        const state = buildInitialState();
        const next = run(boardReducer, state, types.SET_BOARD_ID, 'b2');
        expect(next.boardId).toBe('b2');
    });

    it('returns state for unknown action', () => {
        const state = buildInitialState();
        expect(run(boardReducer, state, 'NOOP', null)).toBe(state);
    });
});

// ═══════════════════════════════════════════════════════════
// columnsReducer
// ═══════════════════════════════════════════════════════════

describe('columnsReducer', () => {
    it('SET_COLUMNS replaces columns via deep clone', () => {
        const cols = [
            buildColumn({ Id: 'c1', cards: [buildCard()] }),
            buildColumn({ Id: 'c2' })
        ];
        const state = buildInitialState();
        const next = run(columnsReducer, state, types.SET_COLUMNS, cols);
        expect(next.columns).toHaveLength(2);
        // Should be a deep clone, not same reference
        expect(next.columns).not.toBe(cols);
        expect(next.columns[0].Id).toBe('c1');
    });

    it('UPDATE_COLUMNS also replaces columns', () => {
        const cols = [buildColumn()];
        const state = buildInitialState({ columns: [] });
        const next = run(columnsReducer, state, types.UPDATE_COLUMNS, cols);
        expect(next.columns).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════
// cardsReducer
// ═══════════════════════════════════════════════════════════

describe('cardsReducer', () => {
    it('ADD_CARD adds card to target column', () => {
        const col = buildColumn({ Id: 'col1', cards: [] });
        const card = buildCard({ Id: 'new', position: '1000' });
        const state = buildInitialState({ columns: [col] });
        const next = run(cardsReducer, state, types.ADD_CARD, {
            card,
            columnId: 'col1'
        });
        expect(next.columns[0].cards).toHaveLength(1);
        expect(next.columns[0].cardCount).toBe(1);
    });

    it('DELETE_CARD removes card from column', () => {
        const card = buildCard({ Id: 'c1' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const state = buildInitialState({ columns: [col] });
        const next = run(cardsReducer, state, types.DELETE_CARD, {
            cardId: 'c1'
        });
        expect(next.columns[0].cards).toHaveLength(0);
        expect(next.columns[0].cardCount).toBe(0);
    });

    it('MOVE_CARD moves card between columns', () => {
        const card = buildCard({ Id: 'c1' });
        const col1 = buildColumn({ Id: 'col1', cards: [card] });
        const col2 = buildColumn({ Id: 'col2', cards: [] });
        const state = buildInitialState({ columns: [col1, col2] });
        const next = run(cardsReducer, state, types.MOVE_CARD, {
            cardId: 'c1',
            targetColumnId: 'col2',
            targetIndex: 0
        });
        expect(next.columns[0].cards).toHaveLength(0);
        expect(next.columns[1].cards).toHaveLength(1);
        expect(next.columns[1].cards[0].Id).toBe('c1');
    });

    it('UPDATE_CARD updates card fields in column', () => {
        const card = buildCard({ Id: 'c1', subject: 'Old' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const state = buildInitialState({ columns: [col] });
        const next = run(cardsReducer, state, types.UPDATE_CARD, {
            cardId: 'c1',
            updates: { subject: 'New' }
        });
        expect(next.columns[0].cards[0].subject).toBe('New');
    });
});

// ═══════════════════════════════════════════════════════════
// appStateReducer
// ═══════════════════════════════════════════════════════════

describe('appStateReducer', () => {
    it('SET_LOADING', () => {
        const state = buildInitialState();
        const next = run(appStateReducer, state, types.SET_LOADING, true);
        expect(next.isLoading).toBe(true);
    });

    it('SET_ERROR clears loading', () => {
        const state = buildInitialState({ isLoading: true });
        const next = run(appStateReducer, state, types.SET_ERROR, 'oops');
        expect(next.error).toBe('oops');
        expect(next.isLoading).toBe(false);
    });

    it('CLEAR_ERROR', () => {
        const state = buildInitialState({ error: 'oops' });
        const next = run(appStateReducer, state, types.CLEAR_ERROR, null);
        expect(next.error).toBeNull();
    });

    it('SET_SUBSCRIPTION_STATUS', () => {
        const state = buildInitialState();
        const next = run(
            appStateReducer,
            state,
            types.SET_SUBSCRIPTION_STATUS,
            'connected'
        );
        expect(next.subscriptionStatus).toBe('connected');
    });

    it('SET_EPIC_SUMMARIES', () => {
        const epics = [{ id: 'e1', subject: 'Epic 1' }];
        const state = buildInitialState();
        const next = run(
            appStateReducer,
            state,
            types.SET_EPIC_SUMMARIES,
            epics
        );
        expect(next.epicSummaries).toEqual(epics);
    });
});

// ═══════════════════════════════════════════════════════════
// syncReducer
// ═══════════════════════════════════════════════════════════

describe('syncReducer', () => {
    it('START_OPERATION adds to pending and sets syncing', () => {
        const state = buildInitialState();
        const next = run(syncReducer, state, types.START_OPERATION, {
            id: 'op1',
            type: 'move',
            cardId: 'c1'
        });
        expect(next.syncState).toBe('syncing');
        expect(next.pendingOperations).toHaveLength(1);
        expect(next.pendingOperations[0].id).toBe('op1');
    });

    it('COMPLETE_OPERATION removes from pending and sets idle when last', () => {
        const state = buildInitialState({
            syncState: 'syncing',
            pendingOperations: [{ id: 'op1', type: 'move', cardId: 'c1' }]
        });
        const next = run(syncReducer, state, types.COMPLETE_OPERATION, {
            id: 'op1'
        });
        expect(next.syncState).toBe('idle');
        expect(next.pendingOperations).toHaveLength(0);
        expect(next.lastSyncTime).toBeTruthy();
    });

    it('COMPLETE_OPERATION keeps syncing when more ops pending', () => {
        const state = buildInitialState({
            syncState: 'syncing',
            pendingOperations: [
                { id: 'op1', type: 'move', cardId: 'c1' },
                { id: 'op2', type: 'move', cardId: 'c2' }
            ]
        });
        const next = run(syncReducer, state, types.COMPLETE_OPERATION, {
            id: 'op1'
        });
        expect(next.syncState).toBe('syncing');
        expect(next.pendingOperations).toHaveLength(1);
    });

    it('FAIL_OPERATION sets failed state with error', () => {
        const state = buildInitialState({
            syncState: 'syncing',
            pendingOperations: [{ id: 'op1' }]
        });
        const next = run(syncReducer, state, types.FAIL_OPERATION, {
            id: 'op1',
            error: new Error('boom')
        });
        expect(next.syncState).toBe('failed');
        expect(next.pendingOperations).toHaveLength(0);
        expect(next.lastSyncError.operationId).toBe('op1');
    });
});

// ═══════════════════════════════════════════════════════════
// dragReducer
// ═══════════════════════════════════════════════════════════

describe('dragReducer', () => {
    const runDrag = (state, type, payload, lastPos = null) =>
        dragReducer(state, { type, payload }, lastPos);

    it('START_DRAG sets drag state', () => {
        const card = buildCard({ Id: 'c1' });
        const col = buildColumn({ Id: 'col1', cards: [card] });
        const state = buildInitialState({ columns: [col] });
        const result = runDrag(state, types.START_DRAG, {
            source: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });
        expect(result.state.isDragging).toBe(true);
        expect(result.state.dragSource.cardId).toBe('c1');
        expect(result.state.dragState).toBeTruthy();
    });

    it('START_DRAG with empty columns returns unchanged', () => {
        const state = buildInitialState({ columns: [] });
        const result = runDrag(state, types.START_DRAG, {
            source: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });
        expect(result.state.isDragging).toBeFalsy();
    });

    it('UPDATE_DRAG_POSITION skips if same position', () => {
        const state = buildInitialState({ isDragging: true });
        const result = runDrag(
            state,
            types.UPDATE_DRAG_POSITION,
            {
                targetColumnId: 'col1',
                targetIndex: 0
            },
            'col1-0'
        );
        // Same position key, should not change state
        expect(result.state).toBe(state);
    });

    it('COMMIT_DRAG applies drag state to columns', () => {
        const dragState = [
            buildColumn({ Id: 'col1', cards: [buildCard({ Id: 'c1' })] })
        ];
        const state = buildInitialState({
            isDragging: true,
            dragState,
            dragSource: { cardId: 'c1', columnId: 'col1', cardIndex: 0 }
        });
        const result = runDrag(state, types.COMMIT_DRAG, undefined);
        expect(result.state.isDragging).toBe(false);
        expect(result.state.dragState).toBeNull();
        expect(result.state.columns).toHaveLength(1);
    });

    it('CANCEL_DRAG clears drag without applying', () => {
        const state = buildInitialState({
            isDragging: true,
            dragState: [buildColumn()],
            dragSource: { cardId: 'c1' }
        });
        const result = runDrag(state, types.CANCEL_DRAG, undefined);
        expect(result.state.isDragging).toBe(false);
        expect(result.state.dragState).toBeNull();
        expect(result.state.dragSource).toBeNull();
    });
});
