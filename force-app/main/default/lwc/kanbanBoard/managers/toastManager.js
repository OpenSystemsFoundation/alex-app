import {
    showSuccess as _showSuccess,
    showInfo as _showInfo,
    showWarning as _showWarning,
    showError as _showError,
    dispatchToast
} from 'c/toastUtils';

/**
 * Toast manager utility class for kanbanBoard.
 * Wraps the shared toastUtils functions with a component reference.
 */
export default class ToastManager {
    constructor(component) {
        this.component = component;
    }

    showSuccess(message, mode = 'dismissible') {
        _showSuccess(this.component, message, mode);
    }

    showInfo(message, mode = 'dismissible') {
        _showInfo(this.component, message, mode);
    }

    showWarning(message, mode = 'dismissible') {
        _showWarning(this.component, message, mode);
    }

    showError(title, error) {
        _showError(this.component, title, error);
    }

    showSubscriptionStatus(title, message, variant = 'info') {
        dispatchToast(this.component, title, message, variant, 'dismissible');
    }
}
