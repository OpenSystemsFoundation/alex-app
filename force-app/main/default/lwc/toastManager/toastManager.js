import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/**
 * Reusable LWC component for managing toast notifications
 * with various types and error handling.
 */
export default class ToastManager extends LightningElement {
    /**
     * Show success toast notification
     * @param {string} message - The message to display
     * @param {string} mode - Display mode: 'dismissible' (default), 'pester', or 'sticky'
     */
    @api
    showSuccess(message, mode = 'dismissible') {
        this._dispatchToast('Success', message, 'success', mode);
    }

    /**
     * Show info toast notification
     * @param {string} message - The message to display
     * @param {string} mode - Display mode: 'dismissible' (default), 'pester', or 'sticky'
     */
    @api
    showInfo(message, mode = 'dismissible') {
        this._dispatchToast('Info', message, 'info', mode);
    }

    /**
     * Show warning toast notification
     * @param {string} message - The message to display
     * @param {string} mode - Display mode: 'dismissible' (default), 'pester', or 'sticky'
     */
    @api
    showWarning(message, mode = 'dismissible') {
        this._dispatchToast('Warning', message, 'warning', mode);
    }

    /**
     * Show error toast notification
     * @param {string} title - The title of the error
     * @param {Object|string} error - The error object or message
     */
    @api
    showError(title, error) {
        const message = this._extractErrorMessage(error);
        this._dispatchToast(title, message, 'error', 'sticky');
    }

    /**
     * Show custom toast notification for subscription status
     * @param {string} title - The title to display
     * @param {string} message - The message to display
     * @param {string} variant - The toast variant: 'success', 'info', 'warning', or 'error'
     */
    @api
    showSubscriptionStatus(title, message, variant = 'info') {
        this._dispatchToast(title, message, variant, 'dismissible');
    }

    /**
     * Show custom toast notification
     * @param {string} title - The title to display
     * @param {string} message - The message to display
     * @param {string} variant - The toast variant: 'success', 'info', 'warning', or 'error'
     * @param {string} mode - Display mode: 'dismissible', 'pester', or 'sticky'
     */
    @api
    showToast(title, message, variant = 'info', mode = 'dismissible') {
        this._dispatchToast(title, message, variant, mode);
    }

    _extractErrorMessage(error) {
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

    _dispatchToast(title, message, variant, mode = null) {
        const toastConfig = {
            title,
            message,
            variant
        };

        if (mode) {
            toastConfig.mode = mode;
        }

        this.dispatchEvent(new ShowToastEvent(toastConfig));
    }
}
