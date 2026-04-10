/**
 * UndoRedoManager — keyboard handling and undo/redo operations.
 *
 * Encapsulates undo/redo execution, keyboard shortcuts, and toast feedback.
 */
export default class UndoRedoManager {
    _host;

    constructor(host) {
        this._host = host;
    }

    handleUndo() {
        if (!this._host.showUndoRedoButtons) return;
        const um = this._host.store.undoManager;
        if (!um || !um.canUndo()) return;
        this._host.store
            .performUndo()
            .then((success) => {
                this._refreshState();
                if (!success && this._host.toastManager) {
                    this._host.toastManager.showWarning(
                        'Cannot undo — card was modified by another user.'
                    );
                }
            })
            .catch((err) => {
                this._refreshState();
                if (this._host.toastManager) {
                    this._host.toastManager.showError('Undo failed', err);
                }
            });
    }

    handleRedo() {
        if (!this._host.showUndoRedoButtons) return;
        const um = this._host.store.undoManager;
        if (!um || !um.canRedo()) return;
        this._host.store
            .performRedo()
            .then((success) => {
                this._refreshState();
                if (!success && this._host.toastManager) {
                    this._host.toastManager.showWarning(
                        'Cannot redo — card was modified by another user.'
                    );
                }
            })
            .catch((err) => {
                this._refreshState();
                if (this._host.toastManager) {
                    this._host.toastManager.showError('Redo failed', err);
                }
            });
    }

    handleKeyboard(event) {
        if (!this._host.showUndoRedoButtons) return;

        const isMeta = event.metaKey || event.ctrlKey;
        if (!isMeta) return;

        // Ignore when typing in inputs/textareas
        const tag = event.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (event.key === 'z' || event.key === 'Z') {
            if (event.shiftKey) {
                event.preventDefault();
                this.handleRedo();
            } else {
                event.preventDefault();
                this.handleUndo();
            }
        } else if (event.key === 'y' || event.key === 'Y') {
            event.preventDefault();
            this.handleRedo();
        }
    }

    _refreshState() {
        const um = this._host.store.undoManager;
        if (um) {
            this._host._canUndo = um.canUndo();
            this._host._canRedo = um.canRedo();
        }
    }
}
