import { LightningElement, api } from 'lwc';
import {
    showSuccess,
    showInfo,
    showWarning,
    showError,
    dispatchToast
} from 'c/toastUtils';

/**
 * Reusable LWC component for managing toast notifications.
 * Delegates to shared toastUtils for the actual implementation.
 */
export default class ToastManager extends LightningElement {
    @api
    showSuccess(message, mode = 'dismissible') {
        showSuccess(this, message, mode);
    }

    @api
    showInfo(message, mode = 'dismissible') {
        showInfo(this, message, mode);
    }

    @api
    showWarning(message, mode = 'dismissible') {
        showWarning(this, message, mode);
    }

    @api
    showError(title, error) {
        showError(this, title, error);
    }

    @api
    showSubscriptionStatus(title, message, variant = 'info') {
        dispatchToast(this, title, message, variant, 'dismissible');
    }

    @api
    showToast(title, message, variant = 'info', mode = 'dismissible') {
        dispatchToast(this, title, message, variant, mode);
    }
}
