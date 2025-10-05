import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ToastManager {
    constructor(component) {
        this.component = component;
    }

    showSuccess(message, mode = 'dismissible') {
        this._dispatchToast('Success', message, 'success', mode);
    }

    showInfo(message, mode = 'dismissible') {
        this._dispatchToast('Info', message, 'info', mode);
    }

    showWarning(message, mode = 'dismissible') {
        this._dispatchToast('Warning', message, 'warning', mode);
    }

    showError(title, error) {
        const message = this._extractErrorMessage(error);
        this._dispatchToast(title, message, 'error', 'sticky');
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

        this.component.dispatchEvent(new ShowToastEvent(toastConfig));
    }

    showSubscriptionStatus(title, message, variant = 'info') {
        this._dispatchToast(title, message, variant, 'dismissible');
    }
}
