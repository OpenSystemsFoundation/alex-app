# Changelog

All notable changes to the Alex Kanban Board project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-03

### Changed

- **BREAKING**: Upgraded ESLint from 9.16.0 to 8.57.0 for better Salesforce LWC tooling compatibility
- Updated `@lwc/eslint-plugin-lwc` from 1.8.2 to 2.0.0
- Updated `@salesforce/sfdx-lwc-jest` to 7.3.0
- Improved dependency management and compatibility

### Added

- Comprehensive CHANGELOG.md for version tracking
- Enhanced documentation with troubleshooting sections
- Decision framework for test architecture improvements
- Version history in documentation files

### Fixed

- Resolved npm dependency conflicts between ESLint versions
- Fixed peer dependency issues with LWC eslint plugins
- Improved package.json dependency version specifications

### Documentation

- Updated README.md with current versions and troubleshooting guide
- Enhanced ARCHITECTURE.md with detailed technology stack versions
- Improved TEST_ARCHITECTURE_DI_MOCKING.md with implementation decision framework
- Added project stats and current dependency information

## [1.0.0] - 2025-09-XX

### Added

- Initial release of Alex Kanban Board
- Core Kanban functionality with drag-and-drop
- Real-time collaboration via Platform Events
- Optimistic UI updates with rollback support
- LexoRank positioning algorithm
- Lightning Web Components (kanbanBoard, kanbanCardDetail)
- Apex backend (KanbanBoardController, LexoRank utility)
- Comprehensive test suite (90%+ coverage)
- Complete documentation set

### Features

- HTML5 drag-and-drop with visual feedback
- Multi-user real-time updates (<2 second latency)
- Efficient string-based card positioning
- Responsive SLDS styling
- Card management with user assignment
- Priority and due date tracking
- Story point tracking
- Color-coded columns

### Testing

- Apex unit tests with high coverage
- Jest tests for LWC components
- Manual test scenarios
- Integration tests

### Documentation

- README.md with quick start guide
- ARCHITECTURE.md with system diagrams
- TEST_ARCHITECTURE_DI_MOCKING.md for future improvements
- Inline code documentation

---

## Versioning Guide

### Major Version (X.0.0)

- Breaking changes
- Major feature additions
- Significant architecture changes
- API changes requiring user updates

### Minor Version (0.X.0)

- New features (backward compatible)
- Significant enhancements
- New components or classes
- Performance improvements

### Patch Version (0.0.X)

- Bug fixes
- Documentation updates
- Dependency updates
- Minor improvements

---

## Links

- [Repository](https://github.com/OpenSystemsFoundation/alex-app)
- [Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- [Releases](https://github.com/OpenSystemsFoundation/alex-app/releases)

---

**Maintained by:** Open Systems Foundation  
**Contact:** support@opensf.foundation
