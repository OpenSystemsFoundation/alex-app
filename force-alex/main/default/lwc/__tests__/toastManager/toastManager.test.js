import { createElement } from 'lwc';
import ToastManager from 'c/toastManager';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

describe('c-toast-manager', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('should show success toast', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showSuccess('Success message');

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.variant).toBe('success');
        expect(event.detail.message).toBe('Success message');
    });

    it('should show error toast with extracted error message', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        const error = {
            body: { message: 'Server error occurred' }
        };

        element.showError('Error Title', error);

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.variant).toBe('error');
        expect(event.detail.title).toBe('Error Title');
        expect(event.detail.message).toBe('Server error occurred');
        expect(event.detail.mode).toBe('sticky');
    });

    it('should show info toast', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showInfo('Information message');

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.variant).toBe('info');
        expect(event.detail.message).toBe('Information message');
    });

    it('should show warning toast', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showWarning('Warning message');

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.variant).toBe('warning');
        expect(event.detail.message).toBe('Warning message');
    });

    it('should extract error message from string', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showError('Error Title', 'Simple error string');

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.message).toBe('Simple error string');
    });

    it('should extract error message from error.message', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        const error = { message: 'Error object message' };
        element.showError('Error Title', error);

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.message).toBe('Error object message');
    });

    it('should show custom toast with custom parameters', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showToast(
            'Custom Title',
            'Custom Message',
            'warning',
            'pester'
        );

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.title).toBe('Custom Title');
        expect(event.detail.message).toBe('Custom Message');
        expect(event.detail.variant).toBe('warning');
        expect(event.detail.mode).toBe('pester');
    });

    it('should show subscription status toast', () => {
        const element = createElement('c-toast-manager', {
            is: ToastManager
        });

        document.body.appendChild(element);

        const eventHandler = jest.fn();
        element.addEventListener(
            ShowToastEvent.eventName || 'lightning__showtoast',
            eventHandler
        );

        element.showSubscriptionStatus(
            'Connected',
            'Real-time updates active',
            'success'
        );

        expect(eventHandler).toHaveBeenCalled();
        const event = eventHandler.mock.calls[0][0];
        expect(event.detail.title).toBe('Connected');
        expect(event.detail.message).toBe('Real-time updates active');
        expect(event.detail.variant).toBe('success');
    });
});
