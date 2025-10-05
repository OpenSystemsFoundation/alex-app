const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver'],
    moduleNameMapper: {
        // Map navigation mock
        '^lightning/navigation$': '<rootDir>/test/mocks/lightning/navigation',
        // Removed global Apex mock - using inline jest.mock instead
        '^c/(.*)$': '<rootDir>/force-app/main/default/lwc/$1/$1.js' // map LWC imports
    },
    resolver: '@salesforce/sfdx-lwc-jest/src/resolver.js',

    // Coverage configuration
    collectCoverageFrom: [
        'force-app/main/default/lwc/**/*.js',
        '!force-app/main/default/lwc/**/*.test.js'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

    // Test environment
    testEnvironment: 'jsdom',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Improved test output
    verbose: true,

    // Test match patterns
    testMatch: ['**/test/unit/**/*.test.js'],

    // Roots for test discovery
    roots: ['<rootDir>/test/unit']
};
