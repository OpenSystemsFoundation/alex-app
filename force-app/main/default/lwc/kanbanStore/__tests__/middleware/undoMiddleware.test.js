/**
 * Unit tests for undoMiddleware — uses the real undoable-actions registry
 * (captureContext / describe are pure functions).
 */
import { createUndoMiddleware } from '../../middleware/undoMiddleware';
import {
    buildCard,
    buildColumn,
    buildInitialState,
    resetIds
} from 'jest-helpers/testDataFactory';

function createFakeUndoManager({ paused = false } = {}) {
    return {
        isPaused: jest.fn(() => paused),
        push: jest.fn()
    };
}

function createFakeStore(initial, reducer) {
    let state = initial;
    return {
        getState: jest.fn(() => state),
        next: jest.fn((action) => {
            state = reducer ? reducer(state, action) : state;
            return `handled:${action?.type}`;
        })
    };
}

beforeEach(() => resetIds());

describe('undoMiddleware', () => {
    it('passes null/typeless actions straight to next', () => {
        const undoManager = createFakeUndoManager();
        const store = createFakeStore(buildInitialState());
        const mw = createUndoMiddleware(undoManager)(store)(store.next);

        mw(null);
        mw({});

        expect(store.next).toHaveBeenCalledTimes(2);
        expect(undoManager.push).not.toHaveBeenCalled();
        expect(store.getState).not.toHaveBeenCalled();
    });

    it('does not record while the undo manager is paused', () => {
        const undoManager = createFakeUndoManager({ paused: true });
        const card = buildCard({ Id: 'card-a' });
        const store = createFakeStore(
            buildInitialState({
                columns: [buildColumn({ Id: 'col-1', cards: [card] })]
            })
        );
        const mw = createUndoMiddleware(undoManager)(store)(store.next);

        const result = mw({
            type: 'MOVE_CARD',
            payload: {
                cardId: 'card-a',
                targetColumnId: 'col-2',
                targetIndex: 0
            }
        });

        expect(result).toBe('handled:MOVE_CARD');
        expect(undoManager.isPaused).toHaveBeenCalled();
        expect(undoManager.push).not.toHaveBeenCalled();
    });

    it('ignores non-undoable action types', () => {
        const undoManager = createFakeUndoManager();
        const store = createFakeStore(buildInitialState());
        const mw = createUndoMiddleware(undoManager)(store)(store.next);

        const result = mw({ type: 'SET_LOADING', payload: true });

        expect(result).toBe('handled:SET_LOADING');
        expect(undoManager.push).not.toHaveBeenCalled();
        expect(store.getState).not.toHaveBeenCalled();
    });

    it('captures reverse/forward context for an undoable MOVE_CARD', () => {
        const undoManager = createFakeUndoManager();
        const card = buildCard({ Id: 'card-a' });
        const other = buildCard({ Id: 'card-b' });
        const store = createFakeStore(
            buildInitialState({
                columns: [
                    buildColumn({ Id: 'col-1', cards: [other, card] }),
                    buildColumn({ Id: 'col-2', cards: [] })
                ]
            })
        );
        const mw = createUndoMiddleware(undoManager)(store)(store.next);
        const action = {
            type: 'MOVE_CARD',
            payload: {
                cardId: 'card-a',
                targetColumnId: 'col-2',
                targetIndex: 0
            }
        };

        const result = mw(action);

        expect(result).toBe('handled:MOVE_CARD');
        expect(store.next).toHaveBeenCalledWith(action);
        // getState is read before and after next()
        expect(store.getState).toHaveBeenCalledTimes(2);
        expect(undoManager.push).toHaveBeenCalledWith({
            actionType: 'MOVE_CARD',
            description: 'Move card back',
            reverseContext: { cardId: 'card-a', columnId: 'col-1', index: 1 },
            forwardContext: { cardId: 'card-a', columnId: 'col-2', index: 0 }
        });
    });

    it('reads prevState before next() and nextState after it', () => {
        const undoManager = createFakeUndoManager();
        const initial = buildInitialState({
            columns: [
                buildColumn({
                    Id: 'col-1',
                    cards: [buildCard({ Id: 'card-a', subject: 'Old' })]
                })
            ]
        });
        const reducer = (state) => ({
            ...state,
            columns: [
                {
                    ...state.columns[0],
                    cards: [{ ...state.columns[0].cards[0], subject: 'New' }]
                }
            ]
        });
        const store = createFakeStore(initial, reducer);
        const mw = createUndoMiddleware(undoManager)(store)(store.next);

        mw({
            type: 'UPDATE_CARD',
            payload: { cardId: 'card-a', updates: { subject: 'New' } }
        });

        expect(undoManager.push).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: 'UPDATE_CARD',
                description: 'Update card',
                reverseContext: {
                    cardId: 'card-a',
                    updates: { subject: 'Old' }
                },
                forwardContext: {
                    cardId: 'card-a',
                    updates: { subject: 'New' }
                }
            })
        );
    });

    it('does not push when captureContext returns null (card not found)', () => {
        const undoManager = createFakeUndoManager();
        const store = createFakeStore(buildInitialState({ columns: [] }));
        const mw = createUndoMiddleware(undoManager)(store)(store.next);

        const result = mw({
            type: 'MOVE_CARD',
            payload: { cardId: 'missing', targetColumnId: 'c', targetIndex: 0 }
        });

        expect(result).toBe('handled:MOVE_CARD');
        expect(store.next).toHaveBeenCalledTimes(1);
        expect(undoManager.push).not.toHaveBeenCalled();
    });
});
