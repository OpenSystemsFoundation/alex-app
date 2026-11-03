import {
    extractErrorMessage,
    dispatchToast,
    showSuccess,
    showInfo,
    showWarning,
    showError
} from 'c/toastUtils';

function fakeComponent() {
    return { dispatchEvent: jest.fn() };
}

function lastToast(component) {
    const calls = component.dispatchEvent.mock.calls;
    return calls[calls.length - 1][0];
}

describe('c/toastUtils', () => {
    describe('extractErrorMessage', () => {
        it('returns "Unknown error" for null/undefined', () => {
            expect(extractErrorMessage(null)).toBe('Unknown error');
            expect(extractErrorMessage(undefined)).toBe('Unknown error');
        });

        it('prefers the Apex body message', () => {
            expect(
                extractErrorMessage({
                    body: { message: 'Apex failed' },
                    message: 'outer'
                })
            ).toBe('Apex failed');
        });

        it('falls back to error.message when body has no message', () => {
            expect(extractErrorMessage({ body: {}, message: 'JS error' })).toBe(
                'JS error'
            );
        });

        it('returns string errors as-is', () => {
            expect(extractErrorMessage('plain string')).toBe('plain string');
        });

        it('returns "Unknown error" for unrecognised shapes', () => {
            expect(extractErrorMessage({ code: 42 })).toBe('Unknown error');
        });
    });

    describe('dispatchToast', () => {
        it('dispatches a ShowToastEvent without mode by default', () => {
            const component = fakeComponent();
            dispatchToast(component, 'Title', 'Msg', 'info');

            const evt = lastToast(component);
            expect(evt.type).toBe('lightning__showtoast');
            expect(evt.detail).toEqual({
                title: 'Title',
                message: 'Msg',
                variant: 'info'
            });
            expect('mode' in evt.detail).toBe(false);
        });

        it('includes mode when provided', () => {
            const component = fakeComponent();
            dispatchToast(component, 'Title', 'Msg', 'warning', 'pester');
            expect(lastToast(component).detail).toEqual({
                title: 'Title',
                message: 'Msg',
                variant: 'warning',
                mode: 'pester'
            });
        });
    });

    describe('convenience helpers', () => {
        it.each([
            [showSuccess, 'Success', 'success'],
            [showInfo, 'Info', 'info'],
            [showWarning, 'Warning', 'warning']
        ])(
            '%p uses title %s / variant %s with dismissible default',
            (fn, title, variant) => {
                const component = fakeComponent();
                fn(component, 'hello');
                expect(lastToast(component).detail).toEqual({
                    title,
                    message: 'hello',
                    variant,
                    mode: 'dismissible'
                });
            }
        );

        it.each([showSuccess, showInfo, showWarning])(
            '%p honours an explicit mode',
            (fn) => {
                const component = fakeComponent();
                fn(component, 'hello', 'sticky');
                expect(lastToast(component).detail.mode).toBe('sticky');
            }
        );

        it('showError is sticky and extracts the message', () => {
            const component = fakeComponent();
            showError(component, 'Save failed', {
                body: { message: 'Insufficient access' }
            });
            expect(lastToast(component).detail).toEqual({
                title: 'Save failed',
                message: 'Insufficient access',
                variant: 'error',
                mode: 'sticky'
            });
        });
    });
});
