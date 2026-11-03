import { createElement } from 'lwc';
import ToastManager from 'c/toastManager';

function setup() {
    const element = createElement('c-toast-manager', { is: ToastManager });
    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);
    document.body.appendChild(element);
    return { element, handler };
}

function lastDetail(handler) {
    return handler.mock.calls[handler.mock.calls.length - 1][0].detail;
}

describe('c-toast-manager', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('showSuccess dispatches a dismissible success toast', () => {
        const { element, handler } = setup();
        element.showSuccess('Saved');
        expect(lastDetail(handler)).toEqual({
            title: 'Success',
            message: 'Saved',
            variant: 'success',
            mode: 'dismissible'
        });
    });

    it('showInfo and showWarning honour explicit modes', () => {
        const { element, handler } = setup();
        element.showInfo('FYI', 'pester');
        expect(lastDetail(handler)).toEqual({
            title: 'Info',
            message: 'FYI',
            variant: 'info',
            mode: 'pester'
        });

        element.showInfo('FYI again');
        expect(lastDetail(handler).mode).toBe('dismissible');

        element.showWarning('Careful');
        expect(lastDetail(handler)).toEqual({
            title: 'Warning',
            message: 'Careful',
            variant: 'warning',
            mode: 'dismissible'
        });
    });

    it('showError dispatches a sticky error with the extracted message', () => {
        const { element, handler } = setup();
        element.showError('Oops', new Error('boom'));
        expect(lastDetail(handler)).toEqual({
            title: 'Oops',
            message: 'boom',
            variant: 'error',
            mode: 'sticky'
        });
    });

    it('showSubscriptionStatus defaults to info / dismissible', () => {
        const { element, handler } = setup();
        element.showSubscriptionStatus('Live', 'Connected');
        expect(lastDetail(handler)).toEqual({
            title: 'Live',
            message: 'Connected',
            variant: 'info',
            mode: 'dismissible'
        });

        element.showSubscriptionStatus('Live', 'Lost', 'warning');
        expect(lastDetail(handler).variant).toBe('warning');
    });

    it('showToast uses defaults and accepts overrides', () => {
        const { element, handler } = setup();
        element.showToast('T', 'M');
        expect(lastDetail(handler)).toEqual({
            title: 'T',
            message: 'M',
            variant: 'info',
            mode: 'dismissible'
        });

        element.showToast('T', 'M', 'error', 'sticky');
        expect(lastDetail(handler)).toEqual({
            title: 'T',
            message: 'M',
            variant: 'error',
            mode: 'sticky'
        });
        expect(handler).toHaveBeenCalledTimes(2);
    });
});
