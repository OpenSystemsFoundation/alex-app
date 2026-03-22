import { createUndoManager } from '../../kanbanStore/undo/undoManager';

describe('UndoManager', () => {
    let um;

    beforeEach(() => {
        um = createUndoManager();
    });

    const makeEntry = (overrides = {}) => ({
        actionType: 'MOVE_CARD',
        description: 'Move card back',
        reverseContext: { cardId: 'card1', columnId: 'col1', index: 0 },
        forwardContext: { cardId: 'card1', columnId: 'col2', index: 1 },
        ...overrides
    });

    describe('push', () => {
        it('adds an entry to the stack', () => {
            um.push(makeEntry());
            expect(um.canUndo()).toBe(true);
        });

        it('does nothing when paused', () => {
            um.pause();
            um.push(makeEntry());
            expect(um.canUndo()).toBe(false);
        });

        it('truncates redo future when new entry is pushed', () => {
            um.push(makeEntry());
            um.push(makeEntry({ description: 'second' }));
            um.popUndo(); // undo second => can redo
            expect(um.canRedo()).toBe(true);

            um.push(makeEntry({ description: 'third' }));
            expect(um.canRedo()).toBe(false);
        });

        it('enforces max limit of 10 entries', () => {
            for (let i = 0; i < 15; i++) {
                um.push(makeEntry({ description: `entry${i}` }));
            }
            // Should still be able to undo up to 10 times
            let undoCount = 0;
            while (um.canUndo()) {
                um.popUndo();
                undoCount++;
            }
            expect(undoCount).toBe(10);
        });
    });

    describe('canUndo / canRedo', () => {
        it('returns false when stack is empty', () => {
            expect(um.canUndo()).toBe(false);
            expect(um.canRedo()).toBe(false);
        });

        it('canUndo returns true after push', () => {
            um.push(makeEntry());
            expect(um.canUndo()).toBe(true);
        });

        it('canRedo returns true after undo', () => {
            um.push(makeEntry());
            um.popUndo();
            expect(um.canRedo()).toBe(true);
        });

        it('canUndo skips stale entries', () => {
            um.push(makeEntry());
            um.markStale('card1');
            expect(um.canUndo()).toBe(false);
        });

        it('canRedo skips stale entries', () => {
            um.push(makeEntry());
            um.popUndo();
            um.markStale('card1');
            expect(um.canRedo()).toBe(false);
        });
    });

    describe('peekUndo / peekRedo', () => {
        it('peekUndo returns null on empty stack', () => {
            expect(um.peekUndo()).toBeNull();
        });

        it('peekRedo returns null on empty stack', () => {
            expect(um.peekRedo()).toBeNull();
        });

        it('peekUndo returns the top entry', () => {
            um.push(makeEntry({ description: 'first' }));
            um.push(makeEntry({ description: 'second' }));
            expect(um.peekUndo().description).toBe('second');
        });

        it('peekRedo returns the next redo entry', () => {
            um.push(makeEntry({ description: 'first' }));
            um.popUndo();
            expect(um.peekRedo().description).toBe('first');
        });

        it('peekUndo skips stale entries', () => {
            um.push(
                makeEntry({
                    description: 'a',
                    reverseContext: { cardId: 'c1' },
                    forwardContext: { cardId: 'c1' }
                })
            );
            um.push(
                makeEntry({
                    description: 'b',
                    reverseContext: { cardId: 'c2' },
                    forwardContext: { cardId: 'c2' }
                })
            );
            um.markStale('c2');
            expect(um.peekUndo().description).toBe('a');
        });

        it('peekRedo skips stale entries', () => {
            um.push(
                makeEntry({
                    description: 'a',
                    reverseContext: { cardId: 'c1' },
                    forwardContext: { cardId: 'c1' }
                })
            );
            um.push(
                makeEntry({
                    description: 'b',
                    reverseContext: { cardId: 'c2' },
                    forwardContext: { cardId: 'c2' }
                })
            );
            um.popUndo();
            um.popUndo();
            um.markStale('c1');
            expect(um.peekRedo().description).toBe('b');
        });
    });

    describe('popUndo / popRedo', () => {
        it('popUndo returns null on empty stack', () => {
            expect(um.popUndo()).toBeNull();
        });

        it('popRedo returns null on empty stack', () => {
            expect(um.popRedo()).toBeNull();
        });

        it('popUndo returns the top entry and moves cursor', () => {
            um.push(makeEntry({ description: 'first' }));
            const entry = um.popUndo();
            expect(entry.description).toBe('first');
            expect(um.canUndo()).toBe(false);
            expect(um.canRedo()).toBe(true);
        });

        it('popRedo returns the next redo entry and moves cursor', () => {
            um.push(makeEntry({ description: 'first' }));
            um.popUndo();
            const entry = um.popRedo();
            expect(entry.description).toBe('first');
            expect(um.canUndo()).toBe(true);
            expect(um.canRedo()).toBe(false);
        });

        it('popUndo skips stale entries', () => {
            um.push(
                makeEntry({
                    description: 'a',
                    reverseContext: { cardId: 'c1' },
                    forwardContext: { cardId: 'c1' }
                })
            );
            um.push(
                makeEntry({
                    description: 'b',
                    reverseContext: { cardId: 'c2' },
                    forwardContext: { cardId: 'c2' }
                })
            );
            um.markStale('c2');
            const entry = um.popUndo();
            expect(entry.description).toBe('a');
        });

        it('popRedo skips stale entries', () => {
            um.push(
                makeEntry({
                    description: 'a',
                    reverseContext: { cardId: 'c1' },
                    forwardContext: { cardId: 'c1' }
                })
            );
            um.push(
                makeEntry({
                    description: 'b',
                    reverseContext: { cardId: 'c2' },
                    forwardContext: { cardId: 'c2' }
                })
            );
            um.popUndo();
            um.popUndo();
            um.markStale('c1');
            const entry = um.popRedo();
            expect(entry.description).toBe('b');
        });
    });

    describe('clear', () => {
        it('empties the stack', () => {
            um.push(makeEntry());
            um.clear();
            expect(um.canUndo()).toBe(false);
            expect(um.canRedo()).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('notifies subscribers on push', () => {
            const fn = jest.fn();
            um.subscribe(fn);
            um.push(makeEntry());
            expect(fn).toHaveBeenCalledWith({ canUndo: true, canRedo: false });
        });

        it('unsubscribe stops notifications', () => {
            const fn = jest.fn();
            const unsub = um.subscribe(fn);
            unsub();
            um.push(makeEntry());
            expect(fn).not.toHaveBeenCalled();
        });

        it('swallows subscriber errors', () => {
            um.subscribe(() => {
                throw new Error('boom');
            });
            expect(() => um.push(makeEntry())).not.toThrow();
        });
    });

    describe('pause / resume / isPaused', () => {
        it('isPaused returns false by default', () => {
            expect(um.isPaused()).toBe(false);
        });

        it('pause sets isPaused true', () => {
            um.pause();
            expect(um.isPaused()).toBe(true);
        });

        it('resume sets isPaused false', () => {
            um.pause();
            um.resume();
            expect(um.isPaused()).toBe(false);
        });
    });

    describe('markStale', () => {
        it('marks entries referencing the card as stale', () => {
            um.push(makeEntry());
            um.markStale('card1');
            expect(um.canUndo()).toBe(false);
        });

        it('does not mark entries for other cards', () => {
            um.push(makeEntry());
            um.markStale('other');
            expect(um.canUndo()).toBe(true);
        });

        it('does nothing when paused', () => {
            um.push(makeEntry());
            um.pause();
            um.markStale('card1');
            um.resume();
            expect(um.canUndo()).toBe(true);
        });

        it('handles entries with missing contexts gracefully', () => {
            um.push(
                makeEntry({
                    reverseContext: null,
                    forwardContext: null
                })
            );
            // Should not throw
            um.markStale('card1');
            // Entry should still be undoable since cardId didn't match
            expect(um.canUndo()).toBe(true);
        });

        it('matches against forwardContext.cardId', () => {
            um.push(
                makeEntry({
                    reverseContext: { cardId: 'a' },
                    forwardContext: { cardId: 'b' }
                })
            );
            um.markStale('b');
            expect(um.canUndo()).toBe(false);
        });

        it('does nothing during grace period', () => {
            um.push(makeEntry());
            um.addGrace('card1');
            um.markStale('card1');
            expect(um.canUndo()).toBe(true);
        });

        it('grace period expires after timeout', () => {
            jest.useFakeTimers();
            um.push(makeEntry());
            um.addGrace('card1');
            jest.advanceTimersByTime(5001);
            um.markStale('card1');
            expect(um.canUndo()).toBe(false);
            jest.useRealTimers();
        });
    });
});
