/**
 * devToolsBridge under a locked-down window (LockerService SecureWindow):
 * assigning or deleting `window.__KANBAN_DEVTOOLS__` throws. Kept in its own
 * file because the non-configurable property cannot be removed afterwards.
 */
import { installDevToolsBridge } from '../../devtools/devToolsBridge';
import { createDevToolsRecorder } from '../../middleware/devToolsMiddleware';

describe('devToolsBridge with a locked window', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'group').mockImplementation(() => {});
        jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
        jest.spyOn(console, 'table').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('survives rejected window assignment and deletion', () => {
        const setter = jest.fn(() => {
            throw new Error('SecureWindow');
        });
        Object.defineProperty(window, '__KANBAN_DEVTOOLS__', {
            configurable: false,
            get: () => 'locked',
            set: setter
        });
        const store = { getState: jest.fn(() => ({ columns: [] })) };

        let bridge;
        expect(() => {
            bridge = installDevToolsBridge(store, createDevToolsRecorder());
        }).not.toThrow();
        expect(setter).toHaveBeenCalledWith(bridge);
        expect(window.__KANBAN_DEVTOOLS__).toBe('locked');

        // the DOM event bridge still works as the fallback strategy
        document.dispatchEvent(
            new CustomEvent('__kdt_exec__', { detail: 'state' })
        );
        expect(store.getState).toHaveBeenCalled();

        // delete of a non-configurable property throws in strict mode
        expect(() => bridge.destroy()).not.toThrow();
        expect(window.__KANBAN_DEVTOOLS__).toBe('locked');
    });
});
