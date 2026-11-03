const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver'],
    moduleNameMapper: {
        // Shared mocks and helpers live in force-app/test/ (not deployed)
        '^lightning/navigation$':
            '<rootDir>/force-app/test/jest-mocks/lightning/navigation',
        '^jest-helpers/(.*)$': '<rootDir>/force-app/test/jest-helpers/$1',
        // Removed global Apex mock - using inline jest.mock instead
        '^c/(.*)$': '<rootDir>/force-app/main/default/lwc/$1/$1.js' // map LWC imports
    },
    resolver: '@salesforce/sfdx-lwc-jest/src/resolver.js',

    // Coverage configuration
    collectCoverageFrom: [
        'force-app/main/default/lwc/**/*.js',
        '!**/__tests__/**',
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

    // Tests live next to each component: lwc/<component>/__tests__/
    testMatch: ['**/lwc/*/__tests__/**/*.test.js'],

    // Roots for test discovery and coverage collection
    roots: ['<rootDir>/force-app']
};
