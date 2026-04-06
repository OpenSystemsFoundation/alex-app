import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/**
 * Shared toast utility functions.
 * Used by both the toastManager LWC component and the board's toast manager class.
 *
 * @example
 * import { showSuccess, showError, dispatchToast } from 'c/toastUtils';
 * showSuccess(component, 'Card saved');
 * showError(component, 'Save failed', error);
 */

/**
 * Extract a human-readable error message from various error shapes.
 * @param {Object|string|null} error
 * @returns {string}
 */
export function extractErrorMessage(error) {
    if (!error) {
        return 'Unknown error';
    }

    if (error.body && error.body.message) {
        return error.body.message;
    }

    if (error.message) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unknown error';
}

/**
 * Dispatch a ShowToastEvent on the given component.
 * @param {LightningElement} component - The component to dispatch from
 * @param {string} title
 * @param {string} message
 * @param {string} variant - 'success' | 'info' | 'warning' | 'error'
 * @param {string} [mode] - 'dismissible' | 'pester' | 'sticky'
 */
export function dispatchToast(component, title, message, variant, mode = null) {
    const toastConfig = { title, message, variant };
    if (mode) {
        toastConfig.mode = mode;
    }
    component.dispatchEvent(new ShowToastEvent(toastConfig));
}

/**
 * Show a success toast.
 * @param {LightningElement} component
 * @param {string} message
 * @param {string} [mode='dismissible']
 */
export function showSuccess(component, message, mode = 'dismissible') {
    dispatchToast(component, 'Success', message, 'success', mode);
}

/**
 * Show an info toast.
 * @param {LightningElement} component
 * @param {string} message
 * @param {string} [mode='dismissible']
 */
export function showInfo(component, message, mode = 'dismissible') {
    dispatchToast(component, 'Info', message, 'info', mode);
}

/**
 * Show a warning toast.
 * @param {LightningElement} component
 * @param {string} message
 * @param {string} [mode='dismissible']
 */
export function showWarning(component, message, mode = 'dismissible') {
    dispatchToast(component, 'Warning', message, 'warning', mode);
}

/**
 * Show an error toast (sticky by default).
 * @param {LightningElement} component
 * @param {string} title
 * @param {Object|string} error
 */
export function showError(component, title, error) {
    const message = extractErrorMessage(error);
    dispatchToast(component, title, message, 'error', 'sticky');
}
