# Test Directory

This directory contains all test code for the Alex Kanban Board application, organized according to ISV best practices.

## 📁 Directory Structure

```
test/
├── unit/                          # Unit tests
│   └── lwc/                       # LWC component tests
│       ├── kanbanBoard/           # KanbanBoard component tests
│       ├── kanbanStore/           # State management tests
│       ├── connectionStatusIndicator/
│       ├── navigationUtil/
│       ├── subscriptionManager/
│       ├── toastManager/
│       ├── kanbanCardDetail/
│       └── testUtils.js           # Shared test utilities
│
├── mocks/                         # Jest mocks for testing
│   └── lightning/                 # Lightning platform mocks
│       └── navigation.js          # Navigation service mock
│
├── e2e/                           # End-to-end tests
│   ├── specs/                     # Test specifications
│   ├── pages/                     # Page Object Models
│   ├── fixtures/                  # Test fixtures
│   ├── helpers/                   # Test helper utilities
│   ├── global-setup.ts           # E2E setup scripts
│   └── global-teardown.ts        # E2E cleanup scripts
│
└── data/                          # Test data files
    └── (test data JSON files)
```

## 🎯 Why This Structure?

This structure follows Salesforce ISV best practices:

1. **Clean Package Builds** - Test code is completely separate from `force-app/`, ensuring your managed package only contains production code
2. **AppExchange Ready** - Meets Salesforce partner requirements for package distribution
3. **Easy Maintenance** - All tests in one place, organized by type
4. **Better .forceignore** - Simple patterns to exclude test code from deployments

## 🧪 Running Tests

### Unit Tests (Jest)

```bash
npm run test:unit              # Run all unit tests
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage report
```

### E2E Tests (Playwright)

```bash
npm run test:e2e              # Run all e2e tests
npm run test:e2e:headed       # With browser visible
npm run test:e2e:debug        # Debug mode
npm run test:e2e:ui           # Interactive UI mode
```

### All Tests

```bash
npm run test:all              # Run unit, Apex, and e2e tests
```

## 📝 Test File Organization

### Unit Tests

- Mirror the component structure from `force-app/main/default/lwc/`
- Each component has its own test directory: `test/unit/lwc/{componentName}/`
- Test files follow naming convention: `{componentName}.test.js`

### Mocks

- Organized by platform/service (e.g., `lightning/`, `apex/`)
- Reusable across all unit tests
- Configured in `jest.config.js`

### E2E Tests

- See [test/e2e/README.md](./e2e/README.md) for detailed documentation

## 🔧 Configuration Files

- **jest.config.js** - Jest configuration for unit tests
- **jest.setup.js** - Jest setup and globals
- **playwright.config.ts** - Playwright configuration for e2e tests
- **playwright.config.scratch.ts** - Scratch org specific configuration

## ✅ Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Mock external dependencies** - Use mocks for platform services
4. **Clean up after tests** - E2E tests auto-cleanup boards
5. **Maintain high coverage** - Target 80%+ code coverage

## 📚 Related Documentation

- [E2E Testing Guide](./e2e/README.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Agent Instructions](../AGENTS.md)
