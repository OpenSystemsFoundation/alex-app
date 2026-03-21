import MobileNavigationManager from '../../kanbanBoard/managers/mobileNavigationManager';

describe('MobileNavigationManager', () => {
    let component;
    let manager;

    beforeEach(() => {
        component = { _mobileActiveColumnIndex: 0 };
        manager = new MobileNavigationManager(component);
    });

    // ── getActiveColumnId ──────────────────────────────────────────────

    describe('getActiveColumnId', () => {
        it('returns null for an empty array', () => {
            expect(manager.getActiveColumnId([])).toBeNull();
        });

        it('returns the Id at the active index', () => {
            component._mobileActiveColumnIndex = 1;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            expect(manager.getActiveColumnId(columns)).toBe('b');
        });

        it('clamps index to last element when index exceeds length', () => {
            component._mobileActiveColumnIndex = 10;
            const columns = [{ Id: 'x' }, { Id: 'y' }];
            expect(manager.getActiveColumnId(columns)).toBe('y');
        });

        it('returns null when clamped element has a falsy Id', () => {
            component._mobileActiveColumnIndex = 0;
            const columns = [{ Id: '' }];
            expect(manager.getActiveColumnId(columns)).toBeNull();
        });
    });

    // ── getColumnCounter ───────────────────────────────────────────────

    describe('getColumnCounter', () => {
        it('returns empty string for empty array', () => {
            expect(manager.getColumnCounter([])).toBe('');
        });

        it('returns "1 / 3" when index is 0 and there are 3 columns', () => {
            component._mobileActiveColumnIndex = 0;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            expect(manager.getColumnCounter(columns)).toBe('1 / 3');
        });

        it('returns "2 / 3" when index is 1', () => {
            component._mobileActiveColumnIndex = 1;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            expect(manager.getColumnCounter(columns)).toBe('2 / 3');
        });

        it('clamps index when it exceeds length', () => {
            component._mobileActiveColumnIndex = 99;
            const columns = [{ Id: 'a' }, { Id: 'b' }];
            expect(manager.getColumnCounter(columns)).toBe('2 / 2');
        });
    });

    // ── isFirstColumn ──────────────────────────────────────────────────

    describe('isFirstColumn', () => {
        it('returns true when index is 0', () => {
            component._mobileActiveColumnIndex = 0;
            expect(manager.isFirstColumn).toBe(true);
        });

        it('returns true when index is negative', () => {
            component._mobileActiveColumnIndex = -1;
            expect(manager.isFirstColumn).toBe(true);
        });

        it('returns false when index is greater than 0', () => {
            component._mobileActiveColumnIndex = 2;
            expect(manager.isFirstColumn).toBe(false);
        });
    });

    // ── isLastColumn ───────────────────────────────────────────────────

    describe('isLastColumn', () => {
        it('returns true when index equals last index', () => {
            component._mobileActiveColumnIndex = 2;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            expect(manager.isLastColumn(columns)).toBe(true);
        });

        it('returns true when index exceeds last index', () => {
            component._mobileActiveColumnIndex = 5;
            const columns = [{ Id: 'a' }, { Id: 'b' }];
            expect(manager.isLastColumn(columns)).toBe(true);
        });

        it('returns false when index is before last', () => {
            component._mobileActiveColumnIndex = 0;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            expect(manager.isLastColumn(columns)).toBe(false);
        });
    });

    // ── handleColumnChange ─────────────────────────────────────────────

    describe('handleColumnChange', () => {
        it('updates index when column Id is found', () => {
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            const event = { target: { value: 'c' } };
            manager.handleColumnChange(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(2);
        });

        it('does not update index when column Id is not found', () => {
            component._mobileActiveColumnIndex = 1;
            const columns = [{ Id: 'a' }, { Id: 'b' }];
            const event = { target: { value: 'unknown' } };
            manager.handleColumnChange(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });
    });

    // ── handlePrevColumn ───────────────────────────────────────────────

    describe('handlePrevColumn', () => {
        it('decrements index when greater than 0', () => {
            component._mobileActiveColumnIndex = 2;
            manager.handlePrevColumn();
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('stays at 0 when already at 0', () => {
            component._mobileActiveColumnIndex = 0;
            manager.handlePrevColumn();
            expect(component._mobileActiveColumnIndex).toBe(0);
        });
    });

    // ── handleNextColumn ───────────────────────────────────────────────

    describe('handleNextColumn', () => {
        it('increments index when not at last column', () => {
            component._mobileActiveColumnIndex = 0;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            manager.handleNextColumn(columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('stays at last index when already at last column', () => {
            component._mobileActiveColumnIndex = 2;
            const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
            manager.handleNextColumn(columns);
            expect(component._mobileActiveColumnIndex).toBe(2);
        });
    });

    // ── handleTouchStart ───────────────────────────────────────────────

    describe('handleTouchStart', () => {
        it('records clientX for a single touch', () => {
            const event = { touches: [{ clientX: 200 }] };
            manager.handleTouchStart(event);
            expect(manager._touchStartX).toBe(200);
        });

        it('ignores multi-touch events', () => {
            manager._touchStartX = null;
            const event = { touches: [{ clientX: 100 }, { clientX: 200 }] };
            manager.handleTouchStart(event);
            expect(manager._touchStartX).toBeNull();
        });

        it('ignores events without touches property', () => {
            manager._touchStartX = null;
            const event = {};
            manager.handleTouchStart(event);
            expect(manager._touchStartX).toBeNull();
        });
    });

    // ── handleTouchEnd ─────────────────────────────────────────────────

    describe('handleTouchEnd', () => {
        const columns = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];

        it('navigates to previous column on swipe right exceeding threshold', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = 100;
            const event = { changedTouches: [{ clientX: 161 }] }; // delta = 61
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(0);
        });

        it('navigates to next column on swipe left exceeding threshold', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = 200;
            const event = { changedTouches: [{ clientX: 139 }] }; // delta = -61
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(2);
        });

        it('does not change column when swipe is within threshold (positive)', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = 100;
            const event = { changedTouches: [{ clientX: 160 }] }; // delta = 60 (not > 60)
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('does not change column when swipe is within threshold (negative)', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = 100;
            const event = { changedTouches: [{ clientX: 40 }] }; // delta = -60 (not < -60)
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('does nothing when touchStartX is null', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = null;
            const event = { changedTouches: [{ clientX: 300 }] };
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('does nothing when changedTouches is missing', () => {
            component._mobileActiveColumnIndex = 1;
            manager._touchStartX = 100;
            const event = {};
            manager.handleTouchEnd(event, columns);
            expect(component._mobileActiveColumnIndex).toBe(1);
            // touchStartX should remain since early return happens before reset
            expect(manager._touchStartX).toBe(100);
        });

        it('resets touchStartX after processing a valid swipe', () => {
            manager._touchStartX = 100;
            const event = { changedTouches: [{ clientX: 130 }] }; // small delta
            manager.handleTouchEnd(event, columns);
            expect(manager._touchStartX).toBeNull();
        });
    });
});
