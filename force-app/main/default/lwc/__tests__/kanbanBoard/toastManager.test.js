import ToastManager from '../../kanbanBoard/managers/toastManager';
import { extractErrorMessage } from 'c/toastUtils';

// Mock ShowToastEvent
jest.mock('lightning/platformShowToastEvent', () => {
    return {
        ShowToastEvent: jest.fn().mockImplementation((config) => {
            return {
                type: 'lightning__showtoast',
                detail: config
            };
        })
    };
});

// Mock component with dispatch
const createMockComponent = () => ({
    dispatchEvent: jest.fn()
});

describe('ToastManager', () => {
    let manager;
    let mockComponent;

    beforeEach(() => {
        mockComponent = createMockComponent();
        manager = new ToastManager(mockComponent);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with component', () => {
            expect(manager.component).toBe(mockComponent);
        });
    });

    describe('showSuccess', () => {
        it('should dispatch success toast', () => {
            manager.showSuccess('Operation successful');

            expect(mockComponent.dispatchEvent).toHaveBeenCalled();
            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.type).toBe('lightning__showtoast');
        });

        it('should use correct variant for success', () => {
            manager.showSuccess('Success message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.variant).toBe('success');
        });

        it('should use Success as title', () => {
            manager.showSuccess('Operation successful');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.title).toBe('Success');
        });

        it('should include provided message', () => {
            manager.showSuccess('Custom success message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Custom success message');
        });
    });

    describe('showInfo', () => {
        it('should dispatch info toast', () => {
            manager.showInfo('Information message');

            expect(mockComponent.dispatchEvent).toHaveBeenCalled();
            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.type).toBe('lightning__showtoast');
        });

        it('should use correct variant for info', () => {
            manager.showInfo('Info message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.variant).toBe('info');
        });

        it('should use Info as title', () => {
            manager.showInfo('Information');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.title).toBe('Info');
        });
    });

    describe('showWarning', () => {
        it('should dispatch warning toast', () => {
            manager.showWarning('Warning message');

            expect(mockComponent.dispatchEvent).toHaveBeenCalled();
            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.type).toBe('lightning__showtoast');
        });

        it('should use correct variant for warning', () => {
            manager.showWarning('Warning message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.variant).toBe('warning');
        });

        it('should use Warning as title', () => {
            manager.showWarning('Be careful');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.title).toBe('Warning');
        });
    });

    describe('showError', () => {
        it('should dispatch error toast', () => {
            manager.showError('Error Title', new Error('Error message'));

            expect(mockComponent.dispatchEvent).toHaveBeenCalled();
            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.type).toBe('lightning__showtoast');
        });

        it('should use correct variant for error', () => {
            manager.showError('Error', 'Something went wrong');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.variant).toBe('error');
        });

        it('should use sticky mode for errors', () => {
            manager.showError('Error', 'Error message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.mode).toBe('sticky');
        });

        it('should use custom title', () => {
            manager.showError('Custom Error Title', 'Error message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.title).toBe('Custom Error Title');
        });

        it('should extract message from Error object', () => {
            const error = new Error('Something went wrong');
            manager.showError('Error', error);

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Something went wrong');
        });

        it('should extract message from Apex error format', () => {
            const error = {
                body: {
                    message: 'Apex error message'
                }
            };
            manager.showError('Error', error);

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Apex error message');
        });

        it('should handle string errors', () => {
            manager.showError('Error', 'String error message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('String error message');
        });

        it('should handle null error', () => {
            manager.showError('Error', null);

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Unknown error');
        });

        it('should handle undefined error', () => {
            manager.showError('Error', undefined);

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Unknown error');
        });

        it('should handle error without message property', () => {
            manager.showError('Error', { statusCode: 500 });

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.message).toBe('Unknown error');
        });
    });

    describe('Error Message Extraction', () => {
        it('should extract message from body.message', () => {
            const error = {
                body: {
                    message: 'Body error message'
                }
            };
            const message = extractErrorMessage(error);
            expect(message).toBe('Body error message');
        });

        it('should extract message from message property', () => {
            const error = {
                message: 'Direct error message'
            };
            const message = extractErrorMessage(error);
            expect(message).toBe('Direct error message');
        });

        it('should handle string error', () => {
            const message = extractErrorMessage('String error');
            expect(message).toBe('String error');
        });

        it('should return Unknown error for null', () => {
            const message = extractErrorMessage(null);
            expect(message).toBe('Unknown error');
        });

        it('should return Unknown error for undefined', () => {
            const message = extractErrorMessage(undefined);
            expect(message).toBe('Unknown error');
        });

        it('should return Unknown error for object without message', () => {
            const message = extractErrorMessage({ foo: 'bar' });
            expect(message).toBe('Unknown error');
        });
    });

    describe('Toast Dispatch', () => {
        it('should include default mode for standard toasts', () => {
            manager.showSuccess('Success');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.mode).toBe('dismissible');
        });

        it('should include mode when provided', () => {
            manager.showError('Error', 'Error message');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.detail.mode).toBe('sticky');
        });

        it('should always create ShowToastEvent instance', () => {
            manager.showInfo('Info');

            const toastEvent = mockComponent.dispatchEvent.mock.calls[0][0];
            expect(toastEvent.type).toBe('lightning__showtoast');
            expect(toastEvent.detail).toBeDefined();
        });
    });

    describe('Multiple Toast Calls', () => {
        it('should dispatch multiple toasts independently', () => {
            manager.showSuccess('First message');
            manager.showInfo('Second message');
            manager.showWarning('Third message');

            expect(mockComponent.dispatchEvent).toHaveBeenCalledTimes(3);
        });

        it('should maintain correct variant for each toast', () => {
            manager.showSuccess('Success');
            manager.showError('Error', 'Error');

            const firstToast = mockComponent.dispatchEvent.mock.calls[0][0];
            const secondToast = mockComponent.dispatchEvent.mock.calls[1][0];

            expect(firstToast.detail.variant).toBe('success');
            expect(secondToast.detail.variant).toBe('error');
        });
    });
});
