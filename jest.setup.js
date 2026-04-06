/**
 * Jest setup file - runs before all tests
 * Configure global test environment and utilities
 */

// Extend Jest matchers
expect.extend({
    toHaveBeenCalledWithObjectContaining(received, expected) {
        const calls = received.mock.calls;
        const pass = calls.some((call) => {
            const arg = call[0];
            return Object.keys(expected).every((key) => {
                return arg && arg[key] === expected[key];
            });
        });

        return {
            pass,
            message: () =>
                pass
                    ? `Expected mock not to have been called with object containing ${JSON.stringify(expected)}`
                    : `Expected mock to have been called with object containing ${JSON.stringify(expected)}`
        };
    }
});

// Global test timeout
jest.setTimeout(10000);

// Mock global objects that might not be available in jsdom
global.window = global.window || {};
global.navigator = global.navigator || {};

// Polyfill structuredClone for jsdom test environment
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock IntersectionObserver (used by some LWC components)
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
        return [];
    }
    unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
};

// Suppress specific console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
    // Suppress known LWC warnings in tests
    const message = args[0];
    if (
        typeof message === 'string' &&
        (message.includes('Unknown event type:') ||
            message.includes('Lightning component') ||
            message.includes('wire adapter'))
    ) {
        return;
    }
    originalWarn(...args);
};

console.error = (...args) => {
    // Suppress known errors that are expected in tests
    const message = args[0];
    if (
        typeof message === 'string' &&
        (message.includes('Error handling platform event:') ||
            message.includes('Not implemented'))
    ) {
        return;
    }
    originalError(...args);
};

// Clean up after each test
afterEach(() => {
    // Clear all timers
    jest.clearAllTimers();

    // Clear all mocks
    jest.clearAllMocks();

    // Reset modules
    jest.resetModules();
});

// Global cleanup after all tests
afterAll(() => {
    // Restore console methods
    console.warn = originalWarn;
    console.error = originalError;
});
