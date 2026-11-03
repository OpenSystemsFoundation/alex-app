/**
 * Unit tests for UndoRedoManager
 */
import UndoRedoManager from '../../managers/undoRedoManager';

const flushPromises = () =>
    new Promise((resolve) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(resolve, 0);
    });

function createHost(overrides = {}) {
    const undoManager = {
        canUndo: jest.fn(() => true),
        canRedo: jest.fn(() => true)
    };
    return {
        showUndoRedoButtons: true,
        _canUndo: null,
        _canRedo: null,
        store: {
            undoManager,
            performUndo: jest.fn(() => Promise.resolve(true)),
            performRedo: jest.fn(() => Promise.resolve(true))
        },
        toastManager: {
            showWarning: jest.fn(),
            showError: jest.fn()
        },
        ...overrides
    };
}

function keyEvent(overrides = {}) {
    return {
        key: 'z',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        target: { tagName: 'DIV' },
        preventDefault: jest.fn(),
        ...overrides
    };
}

describe('UndoRedoManager', () => {
    let host;
    let manager;

    beforeEach(() => {
        host = createHost();
        manager = new UndoRedoManager(host);
    });

    describe.each([
        ['handleUndo', 'performUndo', 'canUndo', 'undo', 'Undo failed'],
        ['handleRedo', 'performRedo', 'canRedo', 'redo', 'Redo failed']
    ])('%s', (method, perform, can, verb, failTitle) => {
        it('does nothing when buttons are hidden', () => {
            host.showUndoRedoButtons = false;
            manager[method]();
            expect(host.store[perform]).not.toHaveBeenCalled();
        });

        it('does nothing without an undo manager', () => {
            host.store.undoManager = null;
            manager[method]();
            expect(host.store[perform]).not.toHaveBeenCalled();
        });

        it(`does nothing when ${can}() is false`, () => {
            host.store.undoManager[can].mockReturnValue(false);
            manager[method]();
            expect(host.store[perform]).not.toHaveBeenCalled();
        });

        it('performs the action and refreshes state on success', async () => {
            manager[method]();
            // State after the action completes
            host.store.undoManager.canUndo.mockReturnValue(false);
            host.store.undoManager.canRedo.mockReturnValue(true);
            await flushPromises();

            expect(host.store[perform]).toHaveBeenCalled();
            expect(host._canUndo).toBe(false);
            expect(host._canRedo).toBe(true);
            expect(host.toastManager.showWarning).not.toHaveBeenCalled();
        });

        it('warns when the action is rejected as stale', async () => {
            host.store[perform].mockResolvedValue(false);
            manager[method]();
            await flushPromises();

            expect(host.toastManager.showWarning).toHaveBeenCalledWith(
                `Cannot ${verb} — card was modified by another user.`
            );
        });

        it('does not warn on stale result without a toast manager', async () => {
            host.toastManager = null;
            host.store[perform].mockResolvedValue(false);
            manager[method]();
            await flushPromises();
            expect(host._canUndo).toBe(true);
        });

        it('shows an error toast when the action throws', async () => {
            const err = new Error('apex');
            host.store[perform].mockRejectedValue(err);
            manager[method]();
            await flushPromises();

            expect(host.toastManager.showError).toHaveBeenCalledWith(
                failTitle,
                err
            );
            expect(host._canUndo).toBe(true);
        });

        it('swallows errors without a toast manager', async () => {
            host.toastManager = undefined;
            host.store[perform].mockRejectedValue(new Error('x'));
            manager[method]();
            await flushPromises();
            expect(host._canRedo).toBe(true);
        });

        it('skips refresh if the undo manager disappears', async () => {
            const um = host.store.undoManager;
            host.store[perform].mockImplementation(() => {
                host.store.undoManager = null;
                return Promise.resolve(true);
            });
            manager[method]();
            await flushPromises();
            expect(um[can]).toHaveBeenCalledTimes(1);
            expect(host._canUndo).toBeNull();
        });
    });

    describe('handleKeyboard', () => {
        beforeEach(() => {
            jest.spyOn(manager, 'handleUndo').mockImplementation(() => {});
            jest.spyOn(manager, 'handleRedo').mockImplementation(() => {});
        });

        it('ignores events when buttons are hidden', () => {
            host.showUndoRedoButtons = false;
            const e = keyEvent();
            manager.handleKeyboard(e);
            expect(e.preventDefault).not.toHaveBeenCalled();
            expect(manager.handleUndo).not.toHaveBeenCalled();
        });

        it('ignores keys without ctrl/meta', () => {
            const e = keyEvent({ ctrlKey: false });
            manager.handleKeyboard(e);
            expect(manager.handleUndo).not.toHaveBeenCalled();
        });

        it.each(['INPUT', 'TEXTAREA'])('ignores keys typed in %s', (tag) => {
            const e = keyEvent({ target: { tagName: tag } });
            manager.handleKeyboard(e);
            expect(e.preventDefault).not.toHaveBeenCalled();
            expect(manager.handleUndo).not.toHaveBeenCalled();
        });

        it('handles a missing target', () => {
            const e = keyEvent({ target: null });
            manager.handleKeyboard(e);
            expect(manager.handleUndo).toHaveBeenCalled();
        });

        it.each(['z', 'Z'])('Ctrl+%s triggers undo', (key) => {
            const e = keyEvent({ key });
            manager.handleKeyboard(e);
            expect(e.preventDefault).toHaveBeenCalled();
            expect(manager.handleUndo).toHaveBeenCalled();
            expect(manager.handleRedo).not.toHaveBeenCalled();
        });

        it('Meta+Shift+Z triggers redo', () => {
            const e = keyEvent({
                metaKey: true,
                ctrlKey: false,
                shiftKey: true
            });
            manager.handleKeyboard(e);
            expect(e.preventDefault).toHaveBeenCalled();
            expect(manager.handleRedo).toHaveBeenCalled();
            expect(manager.handleUndo).not.toHaveBeenCalled();
        });

        it.each(['y', 'Y'])('Ctrl+%s triggers redo', (key) => {
            const e = keyEvent({ key });
            manager.handleKeyboard(e);
            expect(e.preventDefault).toHaveBeenCalled();
            expect(manager.handleRedo).toHaveBeenCalled();
        });

        it('ignores other keys', () => {
            const e = keyEvent({ key: 's' });
            manager.handleKeyboard(e);
            expect(e.preventDefault).not.toHaveBeenCalled();
            expect(manager.handleUndo).not.toHaveBeenCalled();
            expect(manager.handleRedo).not.toHaveBeenCalled();
        });
    });
});
