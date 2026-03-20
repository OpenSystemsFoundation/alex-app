import {
    createDevToolsRecorder,
    createDevToolsMiddleware
} from '../../kanbanStore/middleware/devToolsMiddleware';

describe('createDevToolsRecorder', () => {
    let recorder;

    beforeEach(() => {
        recorder = createDevToolsRecorder();
    });

    describe('record', () => {
        it('records an action with prev/next state and diff', () => {
            const prev = { columns: [], isLoading: false };
            const next = { columns: [], isLoading: true };
            const action = { type: 'SET_LOADING', payload: true };

            recorder.record(action, prev, next);

            const history = recorder.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('SET_LOADING');
            expect(history[0].diff).toHaveProperty('isLoading');
            expect(history[0].diff.isLoading.prev).toBe(false);
            expect(history[0].diff.isLoading.next).toBe(true);
        });

        it('records no diff when state is unchanged', () => {
            const state = { columns: [], isLoading: false };
            recorder.record({ type: 'NOOP', payload: null }, state, state);
            const history = recorder.getHistory();
            expect(Object.keys(history[0].diff)).toHaveLength(0);
        });

        it('marks transient actions as non-undoable', () => {
            const state = { columns: [] };
            recorder.record(
                { type: 'UPDATE_DRAG_POSITION', payload: {} },
                state,
                state
            );
            expect(recorder.getHistory()[0].undoable).toBe(false);
        });

        it('marks non-transient actions as undoable', () => {
            const state = { columns: [] };
            recorder.record({ type: 'MOVE_CARD', payload: {} }, state, state);
            expect(recorder.getHistory()[0].undoable).toBe(true);
        });

        it('does not record when paused', () => {
            recorder.pause();
            recorder.record({ type: 'MOVE_CARD', payload: {} }, {}, {});
            expect(recorder.getHistory()).toHaveLength(0);
            expect(recorder.isPaused()).toBe(true);
        });

        it('resumes recording after pause', () => {
            recorder.pause();
            recorder.resume();
            recorder.record({ type: 'MOVE_CARD', payload: {} }, {}, {});
            expect(recorder.getHistory()).toHaveLength(1);
            expect(recorder.isPaused()).toBe(false);
        });

        it('trims history when MAX_HISTORY is exceeded', () => {
            for (let i = 0; i < 210; i++) {
                recorder.record(
                    { type: `ACTION_${i}`, payload: i },
                    { i: i },
                    { i: i + 1 }
                );
            }
            expect(recorder.getEntryCount()).toBeLessThanOrEqual(200);
        });

        it('forks the timeline when recording after time-travel', () => {
            recorder.record({ type: 'A', payload: 1 }, { v: 0 }, { v: 1 });
            recorder.record({ type: 'B', payload: 2 }, { v: 1 }, { v: 2 });
            recorder.record({ type: 'C', payload: 3 }, { v: 2 }, { v: 3 });

            // Jump back to action A
            const firstId = recorder.getHistory()[0].id;
            recorder.jumpTo(firstId);

            // Record a new action — B and C should be discarded
            recorder.record({ type: 'D', payload: 4 }, { v: 1 }, { v: 4 });

            const history = recorder.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe('A');
            expect(history[1].type).toBe('D');
        });

        it('notifies subscribers on record', () => {
            const listener = jest.fn();
            recorder.subscribe(listener);
            recorder.record({ type: 'X', payload: null }, {}, {});
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('handles subscriber errors gracefully', () => {
            const badListener = jest.fn(() => {
                throw new Error('oops');
            });
            recorder.subscribe(badListener);
            expect(() => {
                recorder.record({ type: 'X', payload: null }, {}, {});
            }).not.toThrow();
        });
    });

    describe('getHistory / getFullEntry', () => {
        it('returns compact history entries', () => {
            recorder.record(
                { type: 'SET_BOARD', payload: { Id: 'b1' } },
                { board: null },
                { board: { Id: 'b1' } }
            );
            const h = recorder.getHistory();
            expect(h[0]).toHaveProperty('id');
            expect(h[0]).toHaveProperty('type');
            expect(h[0]).toHaveProperty('payload');
            expect(h[0]).toHaveProperty('diff');
            expect(h[0]).toHaveProperty('timestamp');
            expect(h[0]).toHaveProperty('undoable');
            // Compact entries should NOT have prevState/nextState
            expect(h[0]).not.toHaveProperty('prevState');
            expect(h[0]).not.toHaveProperty('nextState');
        });

        it('returns full entry with state snapshots', () => {
            recorder.record(
                { type: 'SET_BOARD', payload: { Id: 'b1' } },
                { board: null },
                { board: { Id: 'b1' } }
            );
            const id = recorder.getHistory()[0].id;
            const entry = recorder.getFullEntry(id);
            expect(entry.prevState).toEqual({ board: null });
            expect(entry.nextState).toEqual({ board: { Id: 'b1' } });
        });

        it('returns null for non-existent entry', () => {
            expect(recorder.getFullEntry(999)).toBeNull();
        });
    });

    describe('time-travel', () => {
        beforeEach(() => {
            recorder.record({ type: 'A' }, { v: 0 }, { v: 1 });
            recorder.record({ type: 'B' }, { v: 1 }, { v: 2 });
            recorder.record({ type: 'C' }, { v: 2 }, { v: 3 });
        });

        it('jumpTo returns the nextState at that entry', () => {
            const firstId = recorder.getHistory()[0].id;
            const state = recorder.jumpTo(firstId);
            expect(state).toEqual({ v: 1 });
            expect(recorder.getCursor()).toBe(0);
        });

        it('jumpTo returns null for non-existent id', () => {
            expect(recorder.jumpTo(999)).toBeNull();
        });

        it('jumpToIndex returns state at given index', () => {
            const state = recorder.jumpToIndex(1);
            expect(state).toEqual({ v: 2 });
            expect(recorder.getCursor()).toBe(1);
        });

        it('jumpToIndex returns null for out-of-range index', () => {
            expect(recorder.jumpToIndex(-1)).toBeNull();
            expect(recorder.jumpToIndex(100)).toBeNull();
        });
    });

    describe('undo / redo', () => {
        it('undoes the last undoable action', () => {
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 0 },
                { v: 1 }
            );
            const state = recorder.undo();
            expect(state).toEqual({ v: 0 });
        });

        it('returns null when nothing to undo', () => {
            expect(recorder.undo()).toBeNull();
            expect(recorder.canUndo()).toBe(false);
        });

        it('skips transient actions during undo', () => {
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 0 },
                { v: 1 }
            );
            recorder.record(
                { type: 'SET_LOADING', payload: true },
                { v: 1 },
                { v: 2 }
            );
            recorder.record(
                { type: 'COMPLETE_OPERATION', payload: {} },
                { v: 2 },
                { v: 3 }
            );

            const state = recorder.undo();
            // Should skip SET_LOADING and COMPLETE_OPERATION, undo MOVE_CARD
            expect(state).toEqual({ v: 0 });
        });

        it('redoes after undo', () => {
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 0 },
                { v: 1 }
            );
            recorder.undo();
            expect(recorder.canRedo()).toBe(true);
            const state = recorder.redo();
            expect(state).toEqual({ v: 1 });
        });

        it('returns null when nothing to redo', () => {
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 0 },
                { v: 1 }
            );
            expect(recorder.redo()).toBeNull();
            expect(recorder.canRedo()).toBe(false);
        });

        it('skips transient actions during redo', () => {
            recorder.record(
                { type: 'SET_LOADING', payload: true },
                { v: 0 },
                { v: 1 }
            );
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 1 },
                { v: 2 }
            );
            // Undo MOVE_CARD
            recorder.undo();
            // Redo should skip to MOVE_CARD
            const state = recorder.redo();
            expect(state).toEqual({ v: 2 });
        });

        it('canUndo returns false when only transient actions exist', () => {
            recorder.record(
                { type: 'SET_LOADING', payload: true },
                { v: 0 },
                { v: 1 }
            );
            expect(recorder.canUndo()).toBe(false);
        });

        it('canRedo returns false when only transient actions ahead', () => {
            recorder.record(
                { type: 'MOVE_CARD', payload: {} },
                { v: 0 },
                { v: 1 }
            );
            recorder.record(
                { type: 'SET_LOADING', payload: true },
                { v: 1 },
                { v: 2 }
            );
            // Undo MOVE_CARD — cursor goes to -1
            recorder.undo();
            // Now record a new action to fork the timeline (discards future)
            recorder.record(
                { type: 'SET_LOADING', payload: false },
                { v: 0 },
                { v: 3 }
            );
            // Only transient SET_LOADING exists and cursor is at end
            expect(recorder.canRedo()).toBe(false);
        });
    });

    describe('clear', () => {
        it('clears all history', () => {
            recorder.record({ type: 'A' }, {}, {});
            recorder.record({ type: 'B' }, {}, {});
            recorder.clear();
            expect(recorder.getHistory()).toHaveLength(0);
            expect(recorder.getEntryCount()).toBe(0);
            expect(recorder.getCursor()).toBe(-1);
        });

        it('notifies subscribers on clear', () => {
            const listener = jest.fn();
            recorder.subscribe(listener);
            recorder.clear();
            expect(listener).toHaveBeenCalled();
        });
    });

    describe('subscribe / unsubscribe', () => {
        it('unsubscribe stops notifications', () => {
            const listener = jest.fn();
            const unsub = recorder.subscribe(listener);
            unsub();
            recorder.record({ type: 'A' }, {}, {});
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('exportHistory', () => {
        it('returns serializable entries without full state', () => {
            recorder.record(
                { type: 'A', payload: 1 },
                { big: 'prev' },
                { big: 'next' }
            );
            const exported = recorder.exportHistory();
            expect(exported).toHaveLength(1);
            expect(exported[0]).toHaveProperty('action');
            expect(exported[0]).toHaveProperty('diff');
            expect(exported[0]).not.toHaveProperty('prevState');
            expect(exported[0]).not.toHaveProperty('nextState');
        });
    });

    describe('getReplaySequence', () => {
        it('returns full replay from start', () => {
            recorder.record({ type: 'A' }, {}, { v: 1 });
            recorder.record({ type: 'B' }, { v: 1 }, { v: 2 });
            const seq = recorder.getReplaySequence();
            expect(seq).toHaveLength(2);
            expect(seq[0].action.type).toBe('A');
            expect(seq[1].state).toEqual({ v: 2 });
        });

        it('returns replay from a specific entry id', () => {
            recorder.record({ type: 'A' }, {}, { v: 1 });
            recorder.record({ type: 'B' }, { v: 1 }, { v: 2 });
            const secondId = recorder.getHistory()[1].id;
            const seq = recorder.getReplaySequence(secondId);
            expect(seq).toHaveLength(1);
            expect(seq[0].action.type).toBe('B');
        });

        it('falls back to start if fromId not found', () => {
            recorder.record({ type: 'A' }, {}, { v: 1 });
            const seq = recorder.getReplaySequence(999);
            expect(seq).toHaveLength(1);
        });

        it('handles null fromId', () => {
            recorder.record({ type: 'A' }, {}, { v: 1 });
            const seq = recorder.getReplaySequence(null);
            expect(seq).toHaveLength(1);
        });
    });

    describe('diff computation', () => {
        it('detects changed primitive values', () => {
            recorder.record(
                { type: 'X' },
                { a: 1, b: 'hello' },
                { a: 2, b: 'hello' }
            );
            const diff = recorder.getHistory()[0].diff;
            expect(diff).toHaveProperty('a');
            expect(diff).not.toHaveProperty('b');
        });

        it('detects changed arrays', () => {
            recorder.record({ type: 'X' }, { arr: [1, 2] }, { arr: [1, 2, 3] });
            expect(recorder.getHistory()[0].diff).toHaveProperty('arr');
        });

        it('skips identical arrays', () => {
            const arr = [1, 2, 3];
            recorder.record({ type: 'X' }, { arr }, { arr });
            expect(recorder.getHistory()[0].diff).not.toHaveProperty('arr');
        });

        it('detects arrays with same content but different references', () => {
            recorder.record({ type: 'X' }, { arr: [1, 2] }, { arr: [1, 2] });
            // Same JSON content → no diff
            expect(recorder.getHistory()[0].diff).not.toHaveProperty('arr');
        });

        it('detects new keys in next state', () => {
            recorder.record({ type: 'X' }, { a: 1 }, { a: 1, b: 2 });
            expect(recorder.getHistory()[0].diff).toHaveProperty('b');
        });

        it('detects removed keys in next state', () => {
            recorder.record({ type: 'X' }, { a: 1, b: 2 }, { a: 1 });
            expect(recorder.getHistory()[0].diff).toHaveProperty('b');
        });
    });
});

describe('createDevToolsMiddleware', () => {
    it('records plain action objects', () => {
        const recorder = createDevToolsRecorder();
        const middleware = createDevToolsMiddleware(recorder);

        let currentState = { v: 0 };
        const mockStore = {
            getState: () => Object.freeze({ ...currentState })
        };
        const next = jest.fn((action) => {
            if (action.type === 'INC') {
                currentState = { v: currentState.v + 1 };
            }
        });

        const dispatch = middleware(mockStore)(next);
        dispatch({ type: 'INC', payload: null });

        expect(next).toHaveBeenCalledTimes(1);
        expect(recorder.getHistory()).toHaveLength(1);
        expect(recorder.getHistory()[0].type).toBe('INC');
    });

    it('does not record thunk functions', () => {
        const recorder = createDevToolsRecorder();
        const middleware = createDevToolsMiddleware(recorder);

        const mockStore = { getState: () => ({}) };
        const next = jest.fn();

        const dispatch = middleware(mockStore)(next);
        dispatch(() => {}); // thunk

        expect(next).toHaveBeenCalledTimes(1);
        expect(recorder.getHistory()).toHaveLength(0);
    });

    it('does not record actions without type', () => {
        const recorder = createDevToolsRecorder();
        const middleware = createDevToolsMiddleware(recorder);

        const mockStore = { getState: () => ({}) };
        const next = jest.fn();

        const dispatch = middleware(mockStore)(next);
        dispatch({ payload: 'no-type' });

        expect(next).toHaveBeenCalledTimes(1);
        expect(recorder.getHistory()).toHaveLength(0);
    });

    it('passes through return value from next', () => {
        const recorder = createDevToolsRecorder();
        const middleware = createDevToolsMiddleware(recorder);

        const mockStore = { getState: () => ({}) };
        const next = jest.fn(() => 'result');

        const dispatch = middleware(mockStore)(next);
        const result = dispatch({ type: 'TEST' });

        expect(result).toBe('result');
    });
});
