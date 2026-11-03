/**
 * Unit tests for undoManager
 *
 * Covers: push/limit/redo truncation, undo/redo cursor walking,
 * stale-marking, grace periods, pause/resume, subscriptions.
 */
import { createUndoManager } from '../../undo/undoManager';

const moveEntry = (cardId, extra = {}) => ({
    description: `Move ${cardId}`,
    actionType: 'MOVE_CARD',
    reverseContext: { cardId, columnId: 'colA', index: 0 },
    forwardContext: { cardId, columnId: 'colB', index: 1 },
    ...extra
});

describe('createUndoManager', () => {
    let mgr;

    beforeEach(() => {
        mgr = createUndoManager();
    });

    describe('initial state', () => {
        it('has nothing to undo or redo', () => {
            expect(mgr.canUndo()).toBe(false);
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.peekUndo()).toBeNull();
            expect(mgr.peekRedo()).toBeNull();
            expect(mgr.isPaused()).toBe(false);
        });

        it('popUndo / popRedo return null on an empty stack', () => {
            expect(mgr.popUndo()).toBeNull();
            expect(mgr.popRedo()).toBeNull();
        });
    });

    describe('push', () => {
        it('adds entry with id, timestamp and stale=false', () => {
            jest.spyOn(Date, 'now').mockReturnValue(12345);
            mgr.push(moveEntry('c1'));
            const entry = mgr.peekUndo();
            expect(entry.description).toBe('Move c1');
            expect(entry.actionType).toBe('MOVE_CARD');
            expect(entry.timestamp).toBe(12345);
            expect(entry.stale).toBe(false);
            expect(typeof entry.id).toBe('number');
            expect(mgr.canUndo()).toBe(true);
            expect(mgr.canRedo()).toBe(false);
            Date.now.mockRestore();
        });

        it('assigns increasing ids', () => {
            mgr.push(moveEntry('c1'));
            const first = mgr.peekUndo().id;
            mgr.push(moveEntry('c2'));
            expect(mgr.peekUndo().id).toBe(first + 1);
        });

        it('overrides a caller-supplied stale flag', () => {
            mgr.push(moveEntry('c1', { stale: true }));
            expect(mgr.peekUndo().stale).toBe(false);
        });

        it('keeps at most 10 entries, discarding the oldest', () => {
            for (let i = 1; i <= 12; i++) {
                mgr.push(moveEntry(`c${i}`));
            }
            const popped = [];
            let entry = mgr.popUndo();
            while (entry) {
                popped.push(entry.reverseContext.cardId);
                entry = mgr.popUndo();
            }
            expect(popped).toEqual([
                'c12',
                'c11',
                'c10',
                'c9',
                'c8',
                'c7',
                'c6',
                'c5',
                'c4',
                'c3'
            ]);
        });

        it('truncates redo future on new push', () => {
            mgr.push(moveEntry('c1'));
            mgr.push(moveEntry('c2'));
            mgr.popUndo();
            expect(mgr.canRedo()).toBe(true);
            mgr.push(moveEntry('c3'));
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.popUndo().reverseContext.cardId).toBe('c3');
            expect(mgr.popUndo().reverseContext.cardId).toBe('c1');
            expect(mgr.popUndo()).toBeNull();
        });

        it('is ignored while paused', () => {
            mgr.pause();
            expect(mgr.isPaused()).toBe(true);
            mgr.push(moveEntry('c1'));
            expect(mgr.canUndo()).toBe(false);
            mgr.resume();
            expect(mgr.isPaused()).toBe(false);
            mgr.push(moveEntry('c2'));
            expect(mgr.peekUndo().reverseContext.cardId).toBe('c2');
        });
    });

    describe('undo / redo', () => {
        it('popUndo then popRedo walks the cursor', () => {
            mgr.push(moveEntry('c1'));
            mgr.push(moveEntry('c2'));

            expect(mgr.popUndo().reverseContext.cardId).toBe('c2');
            expect(mgr.peekUndo().reverseContext.cardId).toBe('c1');
            expect(mgr.peekRedo().reverseContext.cardId).toBe('c2');

            expect(mgr.popUndo().reverseContext.cardId).toBe('c1');
            expect(mgr.canUndo()).toBe(false);
            expect(mgr.peekUndo()).toBeNull();

            expect(mgr.popRedo().reverseContext.cardId).toBe('c1');
            expect(mgr.popRedo().reverseContext.cardId).toBe('c2');
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.popRedo()).toBeNull();
            expect(mgr.canUndo()).toBe(true);
        });

        it('clear empties the stack', () => {
            mgr.push(moveEntry('c1'));
            mgr.push(moveEntry('c2'));
            mgr.popUndo();
            mgr.clear();
            expect(mgr.canUndo()).toBe(false);
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.popUndo()).toBeNull();
        });
    });

    describe('markStale', () => {
        it('marks entries matching reverseContext cardId and skips them', () => {
            mgr.push(moveEntry('c1'));
            mgr.push(moveEntry('c2'));
            mgr.markStale('c2');
            expect(mgr.peekUndo().reverseContext.cardId).toBe('c1');
            expect(mgr.popUndo().reverseContext.cardId).toBe('c1');
            expect(mgr.canUndo()).toBe(false);
        });

        it('matches on forwardContext cardId only', () => {
            mgr.push({
                description: 'Create card',
                actionType: 'ADD_CARD',
                reverseContext: { columnId: 'colA' },
                forwardContext: { cardId: 'fwd1' }
            });
            mgr.markStale('fwd1');
            expect(mgr.canUndo()).toBe(false);
            expect(mgr.peekUndo()).toBeNull();
        });

        it('handles entries without contexts', () => {
            mgr.push({ description: 'bare', actionType: 'X' });
            mgr.markStale('c1');
            expect(mgr.canUndo()).toBe(true);
            expect(mgr.peekUndo().description).toBe('bare');
        });

        it('does not notify when nothing changed', () => {
            mgr.push(moveEntry('c1'));
            const fn = jest.fn();
            mgr.subscribe(fn);
            mgr.markStale('other');
            expect(fn).not.toHaveBeenCalled();
            mgr.markStale('c1');
            expect(fn).toHaveBeenCalledWith({ canUndo: false, canRedo: false });
        });

        it('popUndo returns null when all remaining entries are stale', () => {
            mgr.push(moveEntry('c1'));
            mgr.markStale('c1');
            expect(mgr.popUndo()).toBeNull();
        });

        it('skips stale redo entries', () => {
            mgr.push(moveEntry('c1'));
            mgr.push(moveEntry('c2'));
            mgr.popUndo();
            mgr.popUndo();
            mgr.markStale('c1');
            expect(mgr.peekRedo().reverseContext.cardId).toBe('c2');
            expect(mgr.popRedo().reverseContext.cardId).toBe('c2');
            expect(mgr.canRedo()).toBe(false);
        });

        it('popRedo returns null when all redo entries are stale', () => {
            mgr.push(moveEntry('c1'));
            mgr.popUndo();
            mgr.markStale('c1');
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.peekRedo()).toBeNull();
            expect(mgr.popRedo()).toBeNull();
        });

        it('is ignored while paused', () => {
            mgr.push(moveEntry('c1'));
            mgr.pause();
            mgr.markStale('c1');
            mgr.resume();
            expect(mgr.canUndo()).toBe(true);
        });

        it('is ignored for cards in the grace period until it expires', () => {
            jest.useFakeTimers();
            try {
                const local = createUndoManager();
                local.push(moveEntry('c1'));
                local.addGrace('c1');
                local.markStale('c1');
                expect(local.canUndo()).toBe(true);

                jest.advanceTimersByTime(4999);
                local.markStale('c1');
                expect(local.canUndo()).toBe(true);

                jest.advanceTimersByTime(1);
                local.markStale('c1');
                expect(local.canUndo()).toBe(false);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe('subscribe', () => {
        it('notifies subscribers with canUndo/canRedo snapshot', () => {
            const fn = jest.fn();
            mgr.subscribe(fn);
            mgr.push(moveEntry('c1'));
            expect(fn).toHaveBeenLastCalledWith({
                canUndo: true,
                canRedo: false
            });
            mgr.popUndo();
            expect(fn).toHaveBeenLastCalledWith({
                canUndo: false,
                canRedo: true
            });
            mgr.popRedo();
            expect(fn).toHaveBeenLastCalledWith({
                canUndo: true,
                canRedo: false
            });
            mgr.clear();
            expect(fn).toHaveBeenLastCalledWith({
                canUndo: false,
                canRedo: false
            });
            expect(fn).toHaveBeenCalledTimes(4);
        });

        it('notifies even when pops find nothing', () => {
            const fn = jest.fn();
            mgr.subscribe(fn);
            mgr.popUndo();
            mgr.popRedo();
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('unsubscribe stops notifications', () => {
            const fn = jest.fn();
            const unsubscribe = mgr.subscribe(fn);
            expect(unsubscribe()).toBe(true);
            mgr.push(moveEntry('c1'));
            expect(fn).not.toHaveBeenCalled();
        });

        it('swallows subscriber errors and keeps notifying others', () => {
            const bad = jest.fn(() => {
                throw new Error('boom');
            });
            const good = jest.fn();
            mgr.subscribe(bad);
            mgr.subscribe(good);
            expect(() => mgr.push(moveEntry('c1'))).not.toThrow();
            expect(bad).toHaveBeenCalledTimes(1);
            expect(good).toHaveBeenCalledWith({
                canUndo: true,
                canRedo: false
            });
        });
    });

    it('instances are independent', () => {
        const other = createUndoManager();
        mgr.push(moveEntry('c1'));
        expect(mgr.canUndo()).toBe(true);
        expect(other.canUndo()).toBe(false);
    });
});
