/**
 * @jest-environment node
 */
/**
 * devToolsBridge in a non-DOM environment (no `document`), verifying the
 * bridge still installs and destroys cleanly without the DOM event bridge.
 */
import { installDevToolsBridge } from '../../devtools/devToolsBridge';
import { createDevToolsRecorder } from '../../middleware/devToolsMiddleware';

describe('devToolsBridge without a DOM', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.document;
    });

    it('installs on the global window and destroys without document', () => {
        expect(typeof document).toBe('undefined');
        const store = {
            getState: () => ({ ok: true }),
            _applyState: jest.fn()
        };
        const bridge = installDevToolsBridge(store, createDevToolsRecorder());

        expect(window.__KANBAN_DEVTOOLS__).toBe(bridge);
        expect(bridge.getState()).toEqual({ ok: true });

        expect(() => bridge.destroy()).not.toThrow();
        expect(window.__KANBAN_DEVTOOLS__).toBeUndefined();
    });

    it('skips the event bridge when document lacks addEventListener', () => {
        global.document = {};
        const bridge = installDevToolsBridge(
            { getState: () => ({}) },
            createDevToolsRecorder()
        );

        expect(window.__KANBAN_DEVTOOLS__).toBe(bridge);
        expect(() => bridge.destroy()).not.toThrow();
        expect(console.log).toHaveBeenCalledWith(
            '%c Kanban DevTools enabled ',
            expect.any(String)
        );
    });
});
