# Contributing to Alex Kanban Board

Thank you for your interest in contributing to the Alex Kanban Board project! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to maintain a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Submit a pull request

## Development Setup

### Prerequisites

- **Salesforce CLI**: Latest version
- **Node.js**: LTS version (18.x or higher)
- **Git**: Latest version
- **VS Code** (recommended): With Salesforce extensions
- **Salesforce Org**: Developer Edition or Scratch Org

### Initial Setup

```powershell
# Clone your fork
git clone https://github.com/YOUR_USERNAME/alex-app.git
cd alex-app

# Install dependencies
npm install

# Authorize your Salesforce org
sf org login web -a DevOrg

# Set as default org
sf config set target-org DevOrg

# Deploy to your org
npm run deploy

# Create sample data
npm run create:sample
```

### Create a Scratch Org (Alternative)

```powershell
# Create scratch org
sf org create scratch -f config/project-scratch-def.json -a ScratchOrg -d 30

# Set as default
sf config set target-org ScratchOrg

# Deploy
npm run deploy
```

## How to Contribute

### Types of Contributions

- **Bug Fixes**: Fix issues in existing functionality
- **New Features**: Add new capabilities
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code
- **Refactoring**: Improve code quality

### Branch Naming Convention

Use descriptive branch names:

- `feature/add-swimlanes`
- `bugfix/card-position-error`
- `docs/update-readme`
- `test/add-column-tests`
- `refactor/improve-selector`

## Coding Standards

### Apex Code

- Follow [Salesforce Apex Style Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_dev_guide.htm)
- Use `with sharing` for security
- Document public methods with JavaDoc comments
- Keep methods focused and under 50 lines
- Use meaningful variable names

**Example:**

```apex
/**
 * @description Moves a card to a new position
 * @param cardId The ID of the card to move
 * @param targetColumnId The target column ID
 * @param previousCardPosition The position of the previous card
 * @param nextCardPosition The position of the next card
 * @return CardMoveResult containing the new position
 */
public static CardMoveResult moveCard(
    Id cardId,
    Id targetColumnId,
    String previousCardPosition,
    String nextCardPosition
) {
    // Implementation
}
```

### JavaScript/LWC Code

- Follow [Salesforce LWC Style Guide](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.create_components_best_practices)
- Use ES6+ features
- Document complex logic with comments
- Use meaningful variable and function names
- Keep functions focused and under 30 lines

**Example:**

```javascript
/**
 * Handles the drop event when a card is dropped on a column
 * @param {Event} event - The drop event
 */
handleDrop(event) {
    event.preventDefault();
    // Implementation
}
```

### Formatting

We use automated formatting tools:

```powershell
# Format all code
npm run prettier

# Verify formatting
npm run prettier:verify

# Lint JavaScript
npm run lint
```

These checks run automatically via git hooks (Husky) before commits.

## Testing Requirements

### All Contributions Must Include Tests

- **New Features**: Add comprehensive tests
- **Bug Fixes**: Add test demonstrating the bug and verifying the fix
- **Refactoring**: Ensure existing tests still pass

### Running Tests

```powershell
# Run all tests
npm test

# Run with coverage
npm run test:unit:coverage

# Run Apex tests
npm run test:apex

# Run specific LWC test
npm test -- kanbanBoard
```

### Test Coverage Requirements

- **Apex Classes**: Minimum 75% (aim for 90%+)
- **LWC Components**: Minimum 70% (aim for 85%+)
- **New Code**: Must have 90%+ coverage

### Writing Good Tests

```javascript
// Good Test - Descriptive, focused, clear
it('should move card to new column when dropped', () => {
    // Arrange
    const card = createTestCard();
    const targetColumn = createTestColumn();

    // Act
    element.moveCard(card.id, targetColumn.id);

    // Assert
    expect(card.columnId).toBe(targetColumn.id);
});

// Bad Test - Vague, unclear
it('should work', () => {
    const result = doSomething();
    expect(result).toBeTruthy();
});
```

## Pull Request Process

### Before Submitting

1. ✅ Ensure all tests pass: `npm test`
2. ✅ Run formatting: `npm run prettier`
3. ✅ Run linting: `npm run lint`
4. ✅ Update documentation if needed
5. ✅ Add tests for your changes
6. ✅ Update CHANGELOG.md

### Submitting a Pull Request

1. **Push your branch** to your fork
2. **Create a Pull Request** from your branch to `main`
3. **Fill out the PR template** completely
4. **Link related issues** using "Fixes #123" or "Closes #456"
5. **Wait for review** from maintainers

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing

- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] CHANGELOG.md updated
```

### Review Process

- Maintainers will review your PR within 3-5 business days
- Address any feedback or requested changes
- Once approved, a maintainer will merge your PR

## Reporting Bugs

### Before Reporting

- Search existing issues to avoid duplicates
- Test in a clean Salesforce org
- Gather reproduction steps

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of what's wrong

**To Reproduce**

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable

**Environment**

- Salesforce Edition: [e.g., Developer, Enterprise]
- Browser: [e.g., Chrome 96]
- Version: [e.g., 2.0.0]

**Additional Context**
Any other information
```

## Suggesting Enhancements

### Enhancement Request Template

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this needed?

**Proposed Solution**
How would you implement this?

**Alternatives Considered**
Other approaches

**Additional Context**
Mockups, examples, etc.
```

## Development Workflow

### Daily Development

```powershell
# Pull latest changes
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
npm test

# Format and lint
npm run prettier
npm run lint

# Commit (git hooks will run checks)
git add .
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/my-feature

# Create PR on GitHub
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

**Examples:**

```
feat: add swimlane support to kanban board
fix: resolve card positioning bug in drag-and-drop
docs: update README with new installation steps
test: add unit tests for LexoRank algorithm
```

## Questions?

- **Email**: support@opensf.foundation
- **Issues**: [GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Alex Kanban Board!** 🎉
