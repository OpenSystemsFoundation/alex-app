/**
 * Toast Manager for Kanban Board
 * Centralized toast notification handling
 */

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ToastManager {
    constructor(component) {
        this.component = component;
    }
    
    /**
     * Show success toast
     */
    showSuccess(message) {
        this._dispatchToast('Success', message, 'success');
    }
    
    /**
     * Show info toast
     */
    showInfo(message) {
        this._dispatchToast('Info', message, 'info');
    }
    
    /**
     * Show warning toast
     */
    showWarning(message) {
        this._dispatchToast('Warning', message, 'warning');
    }
    
    /**
     * Show error toast
     */
    showError(title, error) {
        const message = this._extractErrorMessage(error);
        this._dispatchToast(title, message, 'error', 'sticky');
    }
    
    /**
     * Extract error message from various error formats
     * @private
     */
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
    
    /**
     * Dispatch toast event
     * @private
     */
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
}
