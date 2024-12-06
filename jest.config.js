const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver'],
    moduleNameMapper: {
        '^@salesforce/apex/(.*)$': '<rootDir>/__mocks__/KanbanController.js', // map all Apex calls to the mock
        '^c/(.*)$': '<rootDir>/force-app/main/default/lwc/$1/$1.js' // map LWC imports
    },
    resolver: '@salesforce/sfdx-lwc-jest/src/resolver.js'
};
