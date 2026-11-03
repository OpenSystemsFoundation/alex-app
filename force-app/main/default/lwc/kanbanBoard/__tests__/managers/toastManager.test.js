/**
 * Unit tests for kanbanBoard ToastManager wrapper
 */
jest.mock('c/toastUtils', () => ({
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showError: jest.fn(),
    dispatchToast: jest.fn()
}));

import ToastManager from '../../managers/toastManager';
import {
    showSuccess,
    showInfo,
    showWarning,
    showError,
    dispatchToast
} from 'c/toastUtils';

describe('ToastManager', () => {
    const component = { name: 'board' };
    let manager;

    beforeEach(() => {
        manager = new ToastManager(component);
    });

    it('stores the component reference', () => {
        expect(manager.component).toBe(component);
    });

    it('showSuccess defaults to dismissible mode', () => {
        manager.showSuccess('Saved');
        expect(showSuccess).toHaveBeenCalledWith(
            component,
            'Saved',
            'dismissible'
        );
    });

    it('showSuccess passes an explicit mode', () => {
        manager.showSuccess('Saved', 'sticky');
        expect(showSuccess).toHaveBeenCalledWith(component, 'Saved', 'sticky');
    });

    it('showInfo defaults and overrides mode', () => {
        manager.showInfo('FYI');
        manager.showInfo('FYI', 'pester');
        expect(showInfo).toHaveBeenNthCalledWith(
            1,
            component,
            'FYI',
            'dismissible'
        );
        expect(showInfo).toHaveBeenNthCalledWith(2, component, 'FYI', 'pester');
    });

    it('showWarning defaults and overrides mode', () => {
        manager.showWarning('Careful');
        manager.showWarning('Careful', 'sticky');
        expect(showWarning).toHaveBeenNthCalledWith(
            1,
            component,
            'Careful',
            'dismissible'
        );
        expect(showWarning).toHaveBeenNthCalledWith(
            2,
            component,
            'Careful',
            'sticky'
        );
    });

    it('showError forwards title and error', () => {
        const err = new Error('boom');
        manager.showError('Failed', err);
        expect(showError).toHaveBeenCalledWith(component, 'Failed', err);
    });

    it('showSubscriptionStatus defaults to info variant', () => {
        manager.showSubscriptionStatus('Connected', 'Live updates on');
        expect(dispatchToast).toHaveBeenCalledWith(
            component,
            'Connected',
            'Live updates on',
            'info',
            'dismissible'
        );
    });

    it('showSubscriptionStatus passes an explicit variant', () => {
        manager.showSubscriptionStatus('Lost', 'Polling', 'warning');
        expect(dispatchToast).toHaveBeenCalledWith(
            component,
            'Lost',
            'Polling',
            'warning',
            'dismissible'
        );
    });
});
