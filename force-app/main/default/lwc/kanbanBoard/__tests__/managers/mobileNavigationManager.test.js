/**
 * Unit tests for MobileNavigationManager
 */
import MobileNavigationManager from '../../managers/mobileNavigationManager';

const COLUMNS = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];

function touchEvent(key, x) {
    return { [key]: [{ clientX: x }] };
}

describe('MobileNavigationManager', () => {
    let component;
    let manager;

    beforeEach(() => {
        component = { _mobileActiveColumnIndex: 0 };
        manager = new MobileNavigationManager(component);
    });

    describe('getActiveColumnId', () => {
        it('returns null for no columns', () => {
            expect(manager.getActiveColumnId([])).toBeNull();
        });

        it('returns the column at the active index', () => {
            component._mobileActiveColumnIndex = 1;
            expect(manager.getActiveColumnId(COLUMNS)).toBe('b');
        });

        it('clamps an out-of-range index to the last column', () => {
            component._mobileActiveColumnIndex = 10;
            expect(manager.getActiveColumnId(COLUMNS)).toBe('c');
        });

        it('returns null when the column has no Id', () => {
            expect(manager.getActiveColumnId([{}])).toBeNull();
        });
    });

    describe('getColumnCounter', () => {
        it('returns empty string for no columns', () => {
            expect(manager.getColumnCounter([])).toBe('');
        });

        it('returns position / total', () => {
            component._mobileActiveColumnIndex = 1;
            expect(manager.getColumnCounter(COLUMNS)).toBe('2 / 3');
        });

        it('clamps the position', () => {
            component._mobileActiveColumnIndex = 7;
            expect(manager.getColumnCounter(COLUMNS)).toBe('3 / 3');
        });
    });

    describe('first/last column', () => {
        it('detects the first column', () => {
            expect(manager.isFirstColumn).toBe(true);
            component._mobileActiveColumnIndex = 1;
            expect(manager.isFirstColumn).toBe(false);
        });

        it('detects the last column', () => {
            expect(manager.isLastColumn(COLUMNS)).toBe(false);
            component._mobileActiveColumnIndex = 2;
            expect(manager.isLastColumn(COLUMNS)).toBe(true);
        });
    });

    describe('handleColumnChange', () => {
        it('selects the matching column index', () => {
            manager.handleColumnChange({ target: { value: 'c' } }, COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(2);
        });

        it('ignores unknown column ids', () => {
            component._mobileActiveColumnIndex = 1;
            manager.handleColumnChange({ target: { value: 'zzz' } }, COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });
    });

    describe('prev/next navigation', () => {
        it('moves to the previous column but not below zero', () => {
            component._mobileActiveColumnIndex = 1;
            manager.handlePrevColumn();
            expect(component._mobileActiveColumnIndex).toBe(0);
            manager.handlePrevColumn();
            expect(component._mobileActiveColumnIndex).toBe(0);
        });

        it('moves to the next column but not past the end', () => {
            component._mobileActiveColumnIndex = 1;
            manager.handleNextColumn(COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(2);
            manager.handleNextColumn(COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(2);
        });
    });

    describe('touch swipe', () => {
        it('records the start position for a single touch', () => {
            manager.handleTouchStart(touchEvent('touches', 200));
            expect(manager._touchStartX).toBe(200);
        });

        it('ignores multi-touch and missing touches on start', () => {
            manager.handleTouchStart({
                touches: [{ clientX: 1 }, { clientX: 2 }]
            });
            expect(manager._touchStartX).toBeNull();
            manager.handleTouchStart({});
            expect(manager._touchStartX).toBeNull();
        });

        it('swipes right to go to the previous column', () => {
            component._mobileActiveColumnIndex = 2;
            manager.handleTouchStart(touchEvent('touches', 100));
            manager.handleTouchEnd(touchEvent('changedTouches', 200), COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);
            expect(manager._touchStartX).toBeNull();
        });

        it('swipes left to go to the next column', () => {
            manager.handleTouchStart(touchEvent('touches', 300));
            manager.handleTouchEnd(touchEvent('changedTouches', 100), COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);
        });

        it('ignores swipes under the threshold', () => {
            component._mobileActiveColumnIndex = 1;
            manager.handleTouchStart(touchEvent('touches', 100));
            manager.handleTouchEnd(touchEvent('changedTouches', 150), COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);
            expect(manager._touchStartX).toBeNull();
        });

        it('ignores touch end without a start or without changedTouches', () => {
            component._mobileActiveColumnIndex = 1;
            manager.handleTouchEnd(touchEvent('changedTouches', 500), COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);

            manager.handleTouchStart(touchEvent('touches', 0));
            manager.handleTouchEnd({}, COLUMNS);
            expect(component._mobileActiveColumnIndex).toBe(1);
            expect(manager._touchStartX).toBe(0);
        });
    });
});
