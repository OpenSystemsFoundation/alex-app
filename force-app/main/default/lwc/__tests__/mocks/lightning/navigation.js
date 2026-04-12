/**
 * Mock for lightning/navigation module
 */
export const NavigationMixin = (Base) =>
    class extends Base {
        navigate() {}
        generateUrl() {
            return Promise.resolve('https://mock-url');
        }
    };

NavigationMixin.Navigate = Symbol('Navigate');
NavigationMixin.GenerateUrl = Symbol('GenerateUrl');
