# Alex - Kanban Board for Salesforce

<div align="center">
  <img src="assets/images/logo_large.png" alt="Alex Logo" width="200"/>

  **A modern, real-time collaborative Kanban board built with Lightning Web Components**

  [![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE-MIT)
  [![Salesforce API](https://img.shields.io/badge/Salesforce%20API-v66.0-blue.svg)](https://developer.salesforce.com)
  [![Test](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/test.yml/badge.svg)](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/test.yml)
  [![Apex Tests](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/apex-tests.yml/badge.svg)](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/apex-tests.yml)
  [![Security Scan](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/security-scan.yml/badge.svg)](https://github.com/OpenSystemsFoundation/alex-app/actions/workflows/security-scan.yml)
</div>

## 📋 Overview

Alex is a powerful Kanban board application for Salesforce that enables teams to visualize and manage their work with drag-and-drop simplicity. Built with Lightning Web Components (LWC), Alex provides real-time collaboration through platform events, allowing multiple users to work together seamlessly.

### Key Features

- **🎯 Intuitive Drag & Drop** - Move cards between columns effortlessly
- **⚡ Real-time Collaboration** - See changes instantly as team members update cards
- **🎨 Customizable Boards** - Create boards tailored to your workflow
- **📊 Multiple Views** - Organize work across different boards
- **🔒 Salesforce Native** - Built on Salesforce platform with enterprise security
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **🚀 Lightning Fast** - Optimized performance with efficient state management
- **💬 Card Comments** - Comment threads on cards with edit/delete
- **📎 File Attachments** - Upload/manage files on cards with drag-and-drop
- **🔗 Card Linking** - Link cards to each other (blocks, relates to, duplicates)
- **↩️ Undo/Redo** - Production undo/redo with Ctrl+Z/Ctrl+Y
- **🏔️ Epic Management** - Epic cards with progress tracking and child card rollup
- **👥 LeSS Framework** - Team and TeamMember objects for scaled agile
- **🗺️ Roadmap Board** - Horizon and quarterly views for epic planning
- **🤖 Agentforce AI Agent** - Natural language board management (card CRUD, sprint management, analytics, estimation, team assignment)
- **🃏 Planning Poker** - Real-time estimation via platform events
- **🔄 Retrospectives** - Start/Stop/Continue board with anonymous voting
- **🏊 Swimlanes** - Group cards by epic, assignee, priority, or card type

## 🏗️ Architecture

Alex is built using modern Salesforce development practices:

- **Two-package Architecture** - `force-app` (base platform) + `force-agentforce` (AI extension)
- **Lightning Web Components (LWC)** - Modern web standards-based UI framework
- **Platform Events** - Real-time event-driven architecture for collaboration
- **Redux-style State Management** - Predictable state updates with centralized store
- **Apex Backend** - Secure server-side logic and data access
- **Custom Objects** - Board, Column, Card, Epic, Team, and Sprint data models
- **Agent Script** - Agentforce agent definition for natural language interaction
- **22 Apex Invocable Actions** - AI agent capabilities for card CRUD, sprint management, analytics, and more

## 🛠️ Technology Stack

- **Frontend**: Lightning Web Components (LWC)
- **Backend**: Apex
- **AI**: Agentforce, Agent Script language, `sf agent` CLI commands
- **Testing**:
    - Jest (Unit Tests)
    - Playwright (E2E Tests)
    - TypeScript for test development
- **Build Tools**: Salesforce CLI, npm
- **Version Control**: Git

## 📦 Installation

### Prerequisites

- Salesforce CLI (`sf` CLI) installed
- Node.js (v18 or higher) - Install from [nodejs.org](https://nodejs.org/) or use your preferred version manager
- npm (v9 or higher)
- Git
- A Salesforce org (Developer Edition, Sandbox, or Production)

### Quick Install

1. **Clone the repository**

    ```bash
    git clone https://github.com/OpenSystemsFoundation/alex-app.git
    cd alex-app
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Authorize your Salesforce org**

    ```bash
    sf org login web --alias my-org
    ```

4. **Deploy to your org**

    ```bash
    npm run deploy
    ```

5. **Assign permission sets**

    ```bash
    sf org assign permset --name Alex_Admin
    ```

6. **Open your org and navigate to Alex**
    ```bash
    sf org open
    ```
    Then find "Alex Kanban Board" in the App Launcher.

## 🚀 Quick Start

### Creating Your First Board

1. Open the Alex application from the App Launcher
2. Click "New Board" to create your first board
3. Add columns (e.g., "To Do", "In Progress", "Done")
4. Start creating cards and drag them between columns
5. Invite team members and collaborate in real-time!

### Creating Sample Data

To quickly populate your board with sample data:

```bash
npm run create:sample
```

## 🧪 Testing

Alex includes comprehensive test coverage:

### Unit Tests (Jest)

```bash
# Run all unit tests
npm run test:unit

# Watch mode for development
npm run test:unit:watch

# Generate coverage report
npm run test:unit:coverage
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Apex Tests

```bash
npm run test:apex
```

### Run All Tests

```bash
npm run test:all
```

## 📚 Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Quick Start Guide](docs/QUICKSTART.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Agent Instructions](AGENTS.md)

## 🔧 Development

### Project Structure

```
alex-app/
├── force-app/main/default/
│   ├── lwc/              # Lightning Web Components
│   ├── classes/          # Apex classes
│   ├── objects/          # Custom objects (Board, Column, Card, Epic, Team, Sprint)
│   ├── tabs/             # Custom tabs
│   └── permissionsets/   # Permission sets
├── force-agentforce/main/default/
│   ├── classes/              # Invocable Apex actions for AI agent
│   ├── genAiFunctions/       # Agentforce function definitions
│   ├── aiAuthoringBundles/   # Agent Script bundles
│   ├── genAiPlugins/         # Agentforce plugin configs
│   └── bots/                 # Bot definitions
├── e2e/
│   └── specs/            # Playwright E2E test specs
├── test/
│   └── unit/lwc/         # Jest unit tests
├── specs/                # Agent specs
├── docs/
│   └── roadmap/          # Roadmap documentation
├── scripts/              # Utility scripts
└── config/               # Scratch org definitions
```

### Available Scripts

- `npm run deploy` - Deploy to Salesforce org
- `npm run validate` - Validate deployment without committing
- `npm run lint` - Run ESLint
- `npm run prettier` - Format code
- `npm test` - Run unit tests
- `npm run test:all` - Run all tests (unit + E2E + Apex)

### Scratch Org Development

```bash
# Create a scratch org
sf org create scratch --definition-file config/project-scratch-def.json --alias alex-scratch --set-default

# Push source to scratch org
sf project deploy start

# Assign permission set
sf org assign permset --name Alex_Admin

# Open scratch org
sf org open

# Run E2E tests against scratch org
npm run test:e2e:scratch
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Coding standards

## 📄 License

This project is dual-licensed — you may use it under either license at your choice:

- **Apache License 2.0** — See [LICENSE](LICENSE)
- **MIT License** — See [LICENSE-MIT](LICENSE-MIT)

## 🙏 Acknowledgments

- Built by [Open Systems Foundation](https://github.com/OpenSystemsFoundation)
- Development assisted by [Claude](https://claude.ai) (Anthropic) — AI pair programming for architecture, implementation, and testing
- Inspired by modern Kanban methodology
- Powered by Salesforce Platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)

## 🗺️ Roadmap

### Recently Shipped

- [x] Planning Poker — real-time estimation via platform events
- [x] Retrospectives — Start/Stop/Continue board with anonymous voting
- [x] Swimlanes — group cards by epic, assignee, priority, or card type
- [x] Undo/Redo — production undo/redo with Ctrl+Z/Ctrl+Y
- [x] Card Comments — comment threads with edit/delete
- [x] File Attachments — upload/manage files on cards with drag-and-drop
- [x] Card Linking — blocks, relates to, duplicates relationships
- [x] Epic Management — epic cards with progress tracking and child card rollup
- [x] LeSS Framework — Team and TeamMember objects for scaled agile
- [x] Roadmap Board — horizon and quarterly views for epic planning
- [x] Agentforce AI Agent — natural language board management with 22 invocable actions

### Now

- [ ] CI/CD release pipeline (GitHub Actions for beta/GA package creation)
- [ ] WIP limits on columns (core Kanban methodology)
- [ ] Cycle time & lead time analytics (how long cards spend in each column)

### Next

- [ ] Cumulative flow diagram — visualize bottlenecks over time
- [ ] Salesforce record linking — link cards to Cases, Opportunities, or any SObject
- [ ] Auto-create cards from Cases (Flow-driven)
- [ ] Bidirectional status sync between cards and linked records

### Future

- [ ] **Custom App Tabs** — eliminate triple-tab problem with dedicated tab navigation
- [ ] **Customer-facing boards via Experience Cloud** — let your customers see project progress in their community portal
    - [ ] Board/column/card visibility controls (internal vs. customer-facing)
    - [ ] Community-ready LWC component
    - [ ] Internal vs. external comments on cards
    - [ ] Customer notifications on card status changes
- [ ] **Flow-driven automation** — auto-create cards, trigger transitions, and sync statuses via Salesforce Flows
- [ ] Approval gates on column transitions (Salesforce Approvals integration)
- [ ] Salesforce Reports & Dashboards integration
- [ ] Custom fields on cards
- [ ] Mobile companion

---

<div align="center">
  Made with ❤️ by the Open Systems Foundation team
</div>
