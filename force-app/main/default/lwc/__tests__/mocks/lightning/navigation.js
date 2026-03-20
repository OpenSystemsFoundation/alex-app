/**
 * Navigation mock for testing
 * Based on lwc-recipes example
 */

const Navigate = Symbol('Navigate');
const GenerateUrl = Symbol('GenerateUrl');

// Mock functions to track calls
export const mockNavigate = jest.fn();
export const mockGenerate = jest.fn();

export const NavigationMixin = (Base) => {
    return class extends Base {
        [Navigate](pageReference, replace) {
            mockNavigate({ pageReference, replace });
        }
        [GenerateUrl](pageReference) {
            mockGenerate({ pageReference });
            return new Promise((resolve) => resolve('https://www.example.com'));
        }
    };
};

NavigationMixin.Navigate = Navigate;
NavigationMixin.GenerateUrl = GenerateUrl;

/**
 * Helper to get the last navigation call details
 */
export const getNavigateCalledWith = () => {
    if (mockNavigate.mock.calls.length === 0) {
        return {
            pageReference: undefined,
            replace: undefined
        };
    }
    return mockNavigate.mock.lastCall[0];
};

export const getGenerateUrlCalledWith = () => {
    if (mockGenerate.mock.calls.length === 0) {
        return {
            pageReference: undefined
        };
    }
    return mockGenerate.mock.lastCall[0];
};
