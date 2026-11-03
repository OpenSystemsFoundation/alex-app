/**
 * Unit tests for devToolsMiddleware — the recorder (history, time-travel,
 * undo/redo, replay) and the middleware that feeds it.
 */
import {
    createDevToolsRecorder,
    createDevToolsMiddleware
} from '../../middleware/devToolsMiddleware';

const rec = (recorder, type, prevState, nextState, payload) =>
    recorder.record({ type, payload }, prevState, nextState);

describe('createDevToolsRecorder', () => {
    let recorder;

    beforeEach(() => {
        recorder = createDevToolsRecorder();
    });

    describe('record / getHistory', () => {
        it('starts empty', () => {
            expect(recorder.getHistory()).toEqual([]);
            expect(recorder.getEntryCount()).toBe(0);
            expect(recorder.getCursor()).toBe(-1);
            expect(recorder.isPaused()).toBe(false);
        });

        it('records actions with incrementing ids, diff and undoable flag', () => {
            const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234);
            rec(recorder, 'SET_BOARD', { a: 1, b: 2 }, { a: 1, b: 3 }, 'p1');
            rec(recorder, 'SET_LOADING', { a: 1 }, { a: 1 }, true);

            const history = recorder.getHistory();
            expect(history).toEqual([
                {
                    id: 1,
                    type: 'SET_BOARD',
                    payload: 'p1',
                    diff: { b: { prev: 2, next: 3 } },
                    timestamp: 1234,
                    undoable: true
                },
                {
                    id: 2,
                    type: 'SET_LOADING',
                    payload: true,
                    diff: {},
                    timestamp: 1234,
                    undoable: false
                }
            ]);
            expect(recorder.getCursor()).toBe(1);
            expect(recorder.getEntryCount()).toBe(2);
            nowSpy.mockRestore();
        });

        it('computes diffs for added/removed keys and treats equal arrays as unchanged', () => {
            const sameArrPrev = [{ id: 1 }];
            const sameArrNext = [{ id: 1 }];
            rec(
                recorder,
                'X',
                { removed: 1, arr: sameArrPrev, changedArr: [1], obj: {} },
                { added: 2, arr: sameArrNext, changedArr: [1, 2], obj: {} }
            );

            const { diff } = recorder.getHistory()[0];
            expect(diff).toEqual({
                removed: { prev: 1, next: undefined },
                added: { prev: undefined, next: 2 },
                changedArr: { prev: [1], next: [1, 2] },
                // distinct object references are reported as changed
                obj: { prev: {}, next: {} }
            });
            expect(diff.arr).toBeUndefined();
        });

        it('only stores type and payload of the action', () => {
            recorder.record({ type: 'T', payload: 1, meta: 'ignored' }, {}, {});
            expect(recorder.getFullEntry(1).action).toEqual({
                type: 'T',
                payload: 1
            });
        });

        it('trims history to the 200 most recent entries', () => {
            for (let i = 0; i < 205; i++) {
                rec(recorder, `A${i}`, {}, {});
            }
            const history = recorder.getHistory();
            expect(history).toHaveLength(200);
            expect(history[0].id).toBe(6);
            expect(history[199].id).toBe(205);
            expect(recorder.getCursor()).toBe(199);
        });

        it('forks the timeline when recording after time-travelling back', () => {
            rec(recorder, 'A', {}, { v: 1 });
            rec(recorder, 'B', {}, { v: 2 });
            rec(recorder, 'C', {}, { v: 3 });
            recorder.jumpTo(1);

            rec(recorder, 'D', {}, { v: 4 });

            expect(recorder.getHistory().map((e) => e.type)).toEqual([
                'A',
                'D'
            ]);
            expect(recorder.getCursor()).toBe(1);
        });

        it('skips recording while paused and resumes afterwards', () => {
            recorder.pause();
            expect(recorder.isPaused()).toBe(true);
            rec(recorder, 'A', {}, {});
            expect(recorder.getEntryCount()).toBe(0);

            recorder.resume();
            expect(recorder.isPaused()).toBe(false);
            rec(recorder, 'B', {}, {});
            expect(recorder.getEntryCount()).toBe(1);
        });
    });

    describe('getFullEntry', () => {
        it('returns full entry including state snapshots, or null', () => {
            rec(recorder, 'A', { v: 0 }, { v: 1 });
            const entry = recorder.getFullEntry(1);
            expect(entry.prevState).toEqual({ v: 0 });
            expect(entry.nextState).toEqual({ v: 1 });
            expect(recorder.getFullEntry(99)).toBeNull();
        });
    });

    describe('time-travel', () => {
        beforeEach(() => {
            rec(recorder, 'A', { v: 0 }, { v: 1 });
            rec(recorder, 'B', { v: 1 }, { v: 2 });
        });

        it('jumpTo returns nextState of the entry and moves cursor', () => {
            expect(recorder.jumpTo(1)).toEqual({ v: 1 });
            expect(recorder.getCursor()).toBe(0);
        });

        it('jumpTo returns null for unknown id without moving cursor', () => {
            expect(recorder.jumpTo(42)).toBeNull();
            expect(recorder.getCursor()).toBe(1);
        });

        it('jumpToIndex returns state for valid index and null otherwise', () => {
            expect(recorder.jumpToIndex(0)).toEqual({ v: 1 });
            expect(recorder.getCursor()).toBe(0);
            expect(recorder.jumpToIndex(-1)).toBeNull();
            expect(recorder.jumpToIndex(2)).toBeNull();
            expect(recorder.getCursor()).toBe(0);
        });
    });

    describe('undo / redo', () => {
        it('reports nothing to undo or redo on empty history', () => {
            expect(recorder.canUndo()).toBe(false);
            expect(recorder.canRedo()).toBe(false);
            expect(recorder.undo()).toBeNull();
            expect(recorder.redo()).toBeNull();
        });

        it('undo skips transient actions and returns prevState', () => {
            rec(recorder, 'SET_BOARD', { v: 0 }, { v: 1 });
            rec(recorder, 'SET_LOADING', { v: 1 }, { v: 1, loading: true });

            expect(recorder.canUndo()).toBe(true);
            expect(recorder.undo()).toEqual({ v: 0 });
            expect(recorder.getCursor()).toBe(-1);
            expect(recorder.canUndo()).toBe(false);
            expect(recorder.undo()).toBeNull();
        });

        it('redo returns nextState of the next undoable action', () => {
            rec(recorder, 'SET_BOARD', { v: 0 }, { v: 1 });
            rec(recorder, 'UPDATE_DRAG_POSITION', { v: 1 }, { v: 1 });
            rec(recorder, 'MOVE_CARD', { v: 1 }, { v: 2 });
            recorder.undo(); // undo MOVE_CARD -> cursor 1
            recorder.undo(); // skip drag, undo SET_BOARD -> cursor -1

            expect(recorder.canRedo()).toBe(true);
            expect(recorder.redo()).toEqual({ v: 1 });
            expect(recorder.getCursor()).toBe(0);
            // skips the transient drag entry
            expect(recorder.redo()).toEqual({ v: 2 });
            expect(recorder.getCursor()).toBe(2);
            expect(recorder.canRedo()).toBe(false);
            expect(recorder.redo()).toBeNull();
        });

        it('canUndo/canRedo are false when only transient actions exist', () => {
            rec(recorder, 'SET_LOADING', {}, {});
            rec(recorder, 'SET_SYNC_STATE', {}, {});
            expect(recorder.canUndo()).toBe(false);
            recorder.jumpToIndex(0);
            expect(recorder.canRedo()).toBe(false);
            expect(recorder.redo()).toBeNull();
        });
    });

    describe('clear', () => {
        it('empties history, resets cursor and id counter', () => {
            rec(recorder, 'A', {}, {});
            rec(recorder, 'B', {}, {});
            recorder.clear();
            expect(recorder.getEntryCount()).toBe(0);
            expect(recorder.getCursor()).toBe(-1);
            rec(recorder, 'C', {}, {});
            expect(recorder.getHistory()[0].id).toBe(1);
        });
    });

    describe('subscribe', () => {
        it('notifies listeners on record/jump/undo/redo/clear until unsubscribed', () => {
            const listener = jest.fn();
            const unsubscribe = recorder.subscribe(listener);

            rec(recorder, 'A', { v: 0 }, { v: 1 });
            recorder.jumpTo(1);
            recorder.jumpToIndex(0);
            recorder.undo();
            recorder.redo();
            recorder.clear();
            expect(listener).toHaveBeenCalledTimes(6);

            unsubscribe();
            rec(recorder, 'B', {}, {});
            expect(listener).toHaveBeenCalledTimes(6);
        });

        it('swallows listener errors so other listeners still run', () => {
            const bad = jest.fn(() => {
                throw new Error('boom');
            });
            const good = jest.fn();
            recorder.subscribe(bad);
            recorder.subscribe(good);

            expect(() => rec(recorder, 'A', {}, {})).not.toThrow();
            expect(bad).toHaveBeenCalled();
            expect(good).toHaveBeenCalled();
        });
    });

    describe('exportHistory / getReplaySequence', () => {
        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(5);
            rec(recorder, 'A', { v: 0 }, { v: 1 }, 'pa');
            rec(recorder, 'SET_LOADING', { v: 1 }, { v: 2 }, 'pb');
            rec(recorder, 'C', { v: 2 }, { v: 3 }, 'pc');
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('exports a serializable history without state snapshots', () => {
            const exported = recorder.exportHistory();
            expect(exported[0]).toEqual({
                id: 1,
                action: { type: 'A', payload: 'pa' },
                diff: { v: { prev: 0, next: 1 } },
                timestamp: 5,
                undoable: true
            });
            expect(exported[1].undoable).toBe(false);
            expect(exported[0].prevState).toBeUndefined();
            expect(() => JSON.stringify(exported)).not.toThrow();
        });

        it('returns full replay sequence by default', () => {
            expect(recorder.getReplaySequence()).toEqual([
                { action: { type: 'A', payload: 'pa' }, state: { v: 1 } },
                {
                    action: { type: 'SET_LOADING', payload: 'pb' },
                    state: { v: 2 }
                },
                { action: { type: 'C', payload: 'pc' }, state: { v: 3 } }
            ]);
        });

        it('starts the replay from a given id', () => {
            const seq = recorder.getReplaySequence(2);
            expect(seq.map((s) => s.action.type)).toEqual(['SET_LOADING', 'C']);
        });

        it('falls back to the start when the id is unknown', () => {
            expect(recorder.getReplaySequence(999)).toHaveLength(3);
        });
    });
});

describe('createDevToolsMiddleware', () => {
    function setup() {
        let state = { count: 0 };
        const store = { getState: jest.fn(() => state) };
        const next = jest.fn((action) => {
            if (action?.type === 'INC') state = { count: state.count + 1 };
            return 'next-result';
        });
        const recorder = { record: jest.fn() };
        const dispatch = createDevToolsMiddleware(recorder)(store)(next);
        return { store, next, recorder, dispatch };
    }

    it('records plain actions with before/after snapshots', () => {
        const { next, recorder, dispatch } = setup();
        const action = { type: 'INC' };

        const result = dispatch(action);

        expect(result).toBe('next-result');
        expect(next).toHaveBeenCalledWith(action);
        expect(recorder.record).toHaveBeenCalledWith(
            action,
            { count: 0 },
            { count: 1 }
        );
    });

    it('passes thunks through without recording', () => {
        const { next, recorder, store, dispatch } = setup();
        const thunk = () => {};

        expect(dispatch(thunk)).toBe('next-result');
        expect(next).toHaveBeenCalledWith(thunk);
        expect(recorder.record).not.toHaveBeenCalled();
        expect(store.getState).not.toHaveBeenCalled();
    });

    it('passes null and typeless actions through without recording', () => {
        const { next, recorder, dispatch } = setup();

        dispatch(null);
        dispatch({ payload: 1 });

        expect(next).toHaveBeenCalledTimes(2);
        expect(recorder.record).not.toHaveBeenCalled();
    });

    it('integrates with a real recorder', () => {
        const recorder = createDevToolsRecorder();
        let state = { n: 0 };
        const store = { getState: () => state };
        const next = () => {
            state = { n: state.n + 1 };
        };
        const dispatch = createDevToolsMiddleware(recorder)(store)(next);

        dispatch({ type: 'BUMP', payload: 'x' });

        const [entry] = recorder.getHistory();
        expect(entry.type).toBe('BUMP');
        expect(entry.diff).toEqual({ n: { prev: 0, next: 1 } });
    });
});
